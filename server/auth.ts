import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { authRateLimiter } from "./middleware/rate-limiter";
import { validateRegister, validateLogin } from "./middleware/validators";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
  
  // Define global WebSocket message functions
  var broadcastWebSocketMessage: (message: any) => void;
  var sendUserWebSocketMessage: (userId: number, message: any) => void;
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

import { Request, Response, NextFunction } from "express";

// Middleware to check if user is admin
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = req.user as Express.User;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  
  next();
}

export function setupAuth(app: Express) {
  // Set a default session secret if not provided, but log a warning
  if (!process.env.SESSION_SECRET) {
    console.warn('WARNING: SESSION_SECRET environment variable not set. Using a random default for this session only.');
    // This is safe as it generates a new secret on each server restart
    process.env.SESSION_SECRET = randomBytes(32).toString('hex');
  }
  
  const isProd = app.get('env') === 'production';
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    name: 'uae_business_assist_sid', // Custom session name instead of default 'connect.sid'
    cookie: {
      httpOnly: true, // Prevents client-side JS from reading the cookie
      secure: isProd, // Requires HTTPS in production
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax' // Provides CSRF protection
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", authRateLimiter, validateRegister, async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Only include allowed fields to prevent mass assignment vulnerabilities
      const safeUserData = {
        username: req.body.username,
        password: await hashPassword(req.body.password),
        company_name: req.body.company_name,
        // Force role to 'user' on registration regardless of what was provided
        // Admin roles should be assigned through a separate secure process
        role: 'user'
      };

      const user = await storage.createUser(safeUserData);

      req.login(user, (err) => {
        if (err) return next(err);
        
        // Remove sensitive data before sending response
        const { password, ...safeResponseData } = user;
        res.status(201).json(safeResponseData);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", authRateLimiter, validateLogin, passport.authenticate("local"), (req, res) => {
    // Sanitize the user object before sending to client
    if (req.user) {
      const { password, ...safeUserData } = req.user;
      res.status(200).json(safeUserData);
    } else {
      res.status(401).json({ message: 'Authentication failed' });
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Sanitize the user object before sending to client
    if (req.user) {
      const { password, ...safeUserData } = req.user;
      res.json(safeUserData);
    } else {
      res.sendStatus(401);
    }
  });
  
  // Test endpoint to send a notification to a user via WebSocket
  app.post("/api/test-notification", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { type, title, message } = req.body;
      
      // Create notification object
      const notification = {
        id: `notification-${Date.now()}`,
        type: type || 'info',
        title: title || 'Test Notification',
        message: message || 'This is a test notification',
        timestamp: Date.now()
      };
      
      // Send to specific user if global function exists
      if (global.sendUserWebSocketMessage) {
        global.sendUserWebSocketMessage(req.user.id, {
          type: 'notification',
          notification
        });
        
        // Log the sent notification
        console.log(`Sent test notification to user ${req.user.id}`);
        res.status(200).json({ success: true, notification });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'WebSocket messaging function not available' 
        });
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
