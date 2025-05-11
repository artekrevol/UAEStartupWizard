import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { storage } from "./storage";
import { User } from "@shared/schema";
import { generateAccessToken, generateRefreshToken } from "./middleware/jwtMiddleware";
import { sendVerificationEmail, sendPasswordResetEmail, verifyToken } from "./services/emailService";
import { sql, eq } from "drizzle-orm";
import { users } from "@shared/schema";

// Extends Express.User to include our User type
declare global {
  namespace Express {
    interface User extends User {}
  }
}

// Convert callback-based scrypt to Promise-based
const scryptAsync = promisify(scrypt);

/**
 * Hash a password for secure storage
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Compare a supplied password with a stored hash
 */
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Set up authentication for the Express app
 */
export function setupAuth(app: Express) {
  // Make sure we have a JWT secret
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable must be set");
  }

  // Session configuration
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  // Set up middleware
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }
  
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy for username/password authentication
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email", // We're using email for authentication
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          // Check if password is correct
          const isValidPassword = await comparePasswords(password, user.password);
          
          if (!isValidPassword) {
            return done(null, false, { message: "Invalid email or password" });
          }

          // Check if email is verified (if required)
          if (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !user.email_verified) {
            return done(null, false, { 
              message: "Email not verified. Please check your email for verification instructions.",
              code: "EMAIL_NOT_VERIFIED"
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Session serialization
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      // Check if the email already exists
      const existingUser = await storage.getUserByEmail(req.body.email);
      
      if (existingUser) {
        return res.status(400).json({ 
          message: "Email already registered",
          field: "email"
        });
      }
      
      // Check if the username already exists
      const existingUsername = await storage.getUserByUsername(req.body.username);
      
      if (existingUsername) {
        return res.status(400).json({ 
          message: "Username already taken", 
          field: "username"
        });
      }
      
      // Hash password before storing
      const hashedPassword = await hashPassword(req.body.password);
      
      // Create the user
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        terms_accepted: true,
        terms_accepted_at: new Date(),
        email_verified: false // User will need to verify email
      });
      
      // Remove sensitive information
      const { password, ...userWithoutPassword } = user;
      
      // Send verification email
      const emailSent = await sendVerificationEmail(user);
      
      if (!emailSent) {
        console.error(`Failed to send verification email to ${user.email}`);
      }
      
      // Generate tokens
      const accessToken = generateAccessToken(user.id, user.role);
      const refreshToken = generateRefreshToken(user.id, req.body.remember_me || false);
      
      // Store refresh token
      await storage.setRefreshToken(user.id, refreshToken);
      
      // Update user last login
      await storage.updateUserLastLogin(user.id);
      
      // Respond with user data and tokens
      res.status(201).json({
        user: userWithoutPassword,
        accessToken,
        refreshToken,
        message: "Registration successful! Please check your email to verify your account."
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Error during registration" });
    }
  });

  // Login endpoint
  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", { session: false }, async (err, user, info) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      
      // Generate tokens
      const accessToken = generateAccessToken(user.id, user.role);
      const refreshToken = generateRefreshToken(user.id, req.body.remember_me || false);
      
      // Store refresh token and remember me preference
      await storage.setRefreshToken(user.id, refreshToken);
      await storage.setRememberMe(user.id, req.body.remember_me || false);
      
      // Update user last login
      await storage.updateUserLastLogin(user.id);
      
      // Remove sensitive information
      const { password, ...userWithoutPassword } = user;
      
      // Login successful
      return res.json({
        user: userWithoutPassword,
        accessToken,
        refreshToken
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", async (req: Request, res: Response) => {
    try {
      // Get user ID from JWT
      const userId = req.userId;
      
      if (userId) {
        // Clear refresh token in database
        await storage.clearRefreshToken(userId);
      }
      
      // Destroy session
      req.logout((err) => {
        if (err) {
          return res.status(500).json({ message: "Error during logout" });
        }
        
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Error during logout" });
    }
  });

  // Get current user endpoint
  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated() && !req.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // If we have a userId from JWT, use that to get the user
    if (req.userId && !req.user) {
      storage.getUser(req.userId)
        .then(user => {
          if (!user) {
            return res.status(401).json({ message: "User not found" });
          }
          
          const { password, ...userWithoutPassword } = user;
          res.json(userWithoutPassword);
        })
        .catch(error => {
          console.error("Error fetching user:", error);
          res.status(500).json({ message: "Error fetching user data" });
        });
      return;
    }
    
    // Otherwise use the user from session
    const { password, ...userWithoutPassword } = req.user as User;
    res.json(userWithoutPassword);
  });

  // Email verification endpoint
  app.post("/api/verify-email", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Verification token is required" });
      }
      
      // Verify token
      let decodedToken;
      try {
        decodedToken = verifyToken(token);
        if (decodedToken.type !== 'email_verification') {
          return res.status(400).json({ message: "Invalid token type" });
        }
      } catch (error) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }
      
      // Get user
      const user = await storage.getUserByVerificationToken(token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }
      
      // Verify email
      await storage.verifyEmail(user.id);
      
      // Generate new tokens
      const accessToken = generateAccessToken(user.id, user.role);
      const refreshToken = generateRefreshToken(user.id, user.remember_me || false);
      
      // Store refresh token
      await storage.setRefreshToken(user.id, refreshToken);
      
      // Remove sensitive information
      const { password, ...userWithoutPassword } = user;
      
      // Return success
      res.json({
        user: userWithoutPassword,
        accessToken,
        refreshToken,
        message: "Email verified successfully"
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Error during email verification" });
    }
  });

  // Request password reset endpoint
  app.post("/api/password-reset-request", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // Always return success even if user not found (for security)
      if (!user) {
        return res.json({ message: "If your email is registered, you will receive password reset instructions." });
      }
      
      // Send password reset email
      const emailSent = await sendPasswordResetEmail(user);
      
      if (!emailSent) {
        console.error(`Failed to send password reset email to ${user.email}`);
      }
      
      res.json({ message: "If your email is registered, you will receive password reset instructions." });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Error during password reset request" });
    }
  });

  // Reset password endpoint
  app.post("/api/password-reset", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      
      // Verify token
      let decodedToken;
      try {
        decodedToken = verifyToken(token);
        if (decodedToken.type !== 'password_reset') {
          return res.status(400).json({ message: "Invalid token type" });
        }
      } catch (error) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      // Get user by reset token
      const user = await storage.getUserByResetToken(token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(password);
      
      // Update password
      await storage.resetPassword(user.id, hashedPassword);
      
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Error during password reset" });
    }
  });

  // Token refresh endpoint
  app.post("/api/token-refresh", async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token is required" });
      }
      
      let decodedToken;
      try {
        decodedToken = verifyToken(refreshToken);
        if (decodedToken.type !== 'refresh') {
          return res.status(401).json({ message: "Invalid token type" });
        }
      } catch (error) {
        return res.status(401).json({ message: "Invalid or expired refresh token" });
      }
      
      // Get user to confirm existence and get current role
      const user = await storage.getUser(decodedToken.userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Verify the refresh token matches what's stored
      if (user.refresh_token !== refreshToken) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }
      
      // Generate new access token
      const accessToken = generateAccessToken(user.id, user.role);
      
      res.json({ accessToken });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(500).json({ message: "Error during token refresh" });
    }
  });
}