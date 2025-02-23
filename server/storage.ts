import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  businessSetups,
  type User,
  type InsertUser,
  type BusinessSetup,
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProgress(userId: number, progress: number): Promise<void>;
  getBusinessSetup(userId: number): Promise<BusinessSetup | undefined>;
  createBusinessSetup(setup: Omit<BusinessSetup, "id">): Promise<BusinessSetup>;
  updateBusinessSetup(id: number, setup: Partial<BusinessSetup>): Promise<void>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserProgress(userId: number, progress: number): Promise<void> {
    await db
      .update(users)
      .set({ progress })
      .where(eq(users.id, userId));
  }

  async getBusinessSetup(userId: number): Promise<BusinessSetup | undefined> {
    const [setup] = await db
      .select()
      .from(businessSetups)
      .where(eq(businessSetups.userId, userId));
    return setup;
  }

  async createBusinessSetup(setup: Omit<BusinessSetup, "id">): Promise<BusinessSetup> {
    const [businessSetup] = await db
      .insert(businessSetups)
      .values(setup)
      .returning();
    return businessSetup;
  }

  async updateBusinessSetup(id: number, update: Partial<BusinessSetup>): Promise<void> {
    await db
      .update(businessSetups)
      .set(update)
      .where(eq(businessSetups.id, id));
  }
}

export const storage = new DatabaseStorage();