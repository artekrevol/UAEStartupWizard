import { eq, and, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  businessSetups,
  documents,
  saifZoneForms,
  conversations,
  conversationMessages,
  setupFlowSteps,
  issuesLog,
  type User,
  type InsertUser,
  type BusinessSetup,
  type Document,
  type InsertDocument,
  type SaifZoneForm,
  type InsertSaifZoneForm,
  type Conversation,
  type InsertConversation,
  type ConversationMessage,
  type InsertMessage,
  type SetupFlowStep,
  type InsertSetupFlowStep,
  type IssuesLog,
  type InsertIssuesLog,
} from "../shared/schema";
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
  
  // Document management methods
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByFreeZone(freeZoneId: number): Promise<Document[]>;
  getDocumentsByCategory(category: string): Promise<Document[]>;
  getDocumentsByFilename(filename: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<Document>): Promise<void>;
  deleteDocument(id: number): Promise<void>;
  
  // SAIF Zone Forms management methods
  getSaifZoneForm(id: number): Promise<SaifZoneForm | undefined>;
  getSaifZoneFormsByType(formType: string): Promise<SaifZoneForm[]>;
  getAllSaifZoneForms(): Promise<SaifZoneForm[]>;
  createSaifZoneForm(form: InsertSaifZoneForm): Promise<SaifZoneForm>;
  updateSaifZoneForm(id: number, form: Partial<SaifZoneForm>): Promise<void>;
  deleteSaifZoneForm(id: number): Promise<void>;
  
  // Conversation management methods
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsByUser(userId: number): Promise<Conversation[]>;
  getActiveConversation(userId: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, conversation: Partial<Conversation>): Promise<void>;
  getConversationMessages(conversationId: number): Promise<ConversationMessage[]>;
  addMessage(message: InsertMessage): Promise<ConversationMessage>;
  
  // Setup Flow Steps management methods
  getSetupFlowStep(id: number): Promise<SetupFlowStep | undefined>;
  getSetupFlowStepByNumber(stepNumber: number, category: string): Promise<SetupFlowStep | undefined>;
  getAllSetupFlowSteps(category: string): Promise<SetupFlowStep[]>;
  createSetupFlowStep(step: InsertSetupFlowStep): Promise<SetupFlowStep>;
  updateSetupFlowStep(id: number, step: Partial<SetupFlowStep>): Promise<void>;
  
  // Issues Log management methods
  getIssue(id: number): Promise<IssuesLog | undefined>;
  getIssuesByUser(userId: number): Promise<IssuesLog[]>;
  getRecentIssues(limit?: number): Promise<IssuesLog[]>;
  getUnresolvedIssues(): Promise<IssuesLog[]>;
  createIssue(issue: InsertIssuesLog): Promise<IssuesLog>;
  updateIssue(id: number, issue: Partial<IssuesLog>): Promise<void>;
  resolveIssue(id: number): Promise<void>;
  
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

  // Document management methods implementation
  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async getDocumentsByFreeZone(freeZoneId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.freeZoneId, freeZoneId));
  }

  async getDocumentsByCategory(category: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.category, category));
  }

  async getDocumentsByFilename(filename: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.filename, filename));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [createdDocument] = await db
      .insert(documents)
      .values(document)
      .returning();
    return createdDocument;
  }

  async updateDocument(id: number, document: Partial<Document>): Promise<void> {
    await db
      .update(documents)
      .set(document)
      .where(eq(documents.id, id));
  }

  async deleteDocument(id: number): Promise<void> {
    await db
      .delete(documents)
      .where(eq(documents.id, id));
  }

  // SAIF Zone Forms management methods implementation
  async getSaifZoneForm(id: number): Promise<SaifZoneForm | undefined> {
    const [form] = await db.select().from(saifZoneForms).where(eq(saifZoneForms.id, id));
    return form;
  }

  async getSaifZoneFormsByType(formType: string): Promise<SaifZoneForm[]> {
    return await db.select().from(saifZoneForms).where(eq(saifZoneForms.formType, formType));
  }

  async getAllSaifZoneForms(): Promise<SaifZoneForm[]> {
    return await db.select().from(saifZoneForms);
  }

  async createSaifZoneForm(form: InsertSaifZoneForm): Promise<SaifZoneForm> {
    const [createdForm] = await db
      .insert(saifZoneForms)
      .values(form)
      .returning();
    return createdForm;
  }

  async updateSaifZoneForm(id: number, form: Partial<SaifZoneForm>): Promise<void> {
    await db
      .update(saifZoneForms)
      .set(form)
      .where(eq(saifZoneForms.id, id));
  }

  async deleteSaifZoneForm(id: number): Promise<void> {
    await db
      .delete(saifZoneForms)
      .where(eq(saifZoneForms.id, id));
  }

  // Conversation management methods implementation
  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async getConversationsByUser(userId: number): Promise<Conversation[]> {
    return await db.select().from(conversations).where(eq(conversations.userId, userId));
  }

  async getActiveConversation(userId: number): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.userId, userId),
        eq(conversations.isActive, true)
      ));
    return conversation;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [createdConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return createdConversation;
  }

  async updateConversation(id: number, update: Partial<Conversation>): Promise<void> {
    await db
      .update(conversations)
      .set(update)
      .where(eq(conversations.id, id));
  }

  async getConversationMessages(conversationId: number): Promise<ConversationMessage[]> {
    return await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, conversationId))
      .orderBy(conversationMessages.timestamp);
  }

  async addMessage(message: InsertMessage): Promise<ConversationMessage> {
    const [createdMessage] = await db
      .insert(conversationMessages)
      .values(message)
      .returning();
    return createdMessage;
  }

  // Setup Flow Steps management methods implementation
  async getSetupFlowStep(id: number): Promise<SetupFlowStep | undefined> {
    const [step] = await db.select().from(setupFlowSteps).where(eq(setupFlowSteps.id, id));
    return step;
  }

  async getSetupFlowStepByNumber(stepNumber: number, category: string): Promise<SetupFlowStep | undefined> {
    const [step] = await db
      .select()
      .from(setupFlowSteps)
      .where(and(
        eq(setupFlowSteps.stepNumber, stepNumber),
        eq(setupFlowSteps.category, category),
        eq(setupFlowSteps.isActive, true)
      ));
    return step;
  }

  async getAllSetupFlowSteps(category: string): Promise<SetupFlowStep[]> {
    return await db
      .select()
      .from(setupFlowSteps)
      .where(and(
        eq(setupFlowSteps.category, category),
        eq(setupFlowSteps.isActive, true)
      ))
      .orderBy(setupFlowSteps.stepNumber);
  }

  async createSetupFlowStep(step: InsertSetupFlowStep): Promise<SetupFlowStep> {
    const [createdStep] = await db
      .insert(setupFlowSteps)
      .values(step)
      .returning();
    return createdStep;
  }

  async updateSetupFlowStep(id: number, update: Partial<SetupFlowStep>): Promise<void> {
    await db
      .update(setupFlowSteps)
      .set(update)
      .where(eq(setupFlowSteps.id, id));
  }

  // Issues Log management methods implementation
  async getIssue(id: number): Promise<IssuesLog | undefined> {
    const [issue] = await db.select().from(issuesLog).where(eq(issuesLog.id, id));
    return issue;
  }

  async getIssuesByUser(userId: number): Promise<IssuesLog[]> {
    return await db
      .select()
      .from(issuesLog)
      .where(eq(issuesLog.userId, userId))
      .orderBy(desc(issuesLog.createdAt));
  }

  async getRecentIssues(limit: number = 100): Promise<IssuesLog[]> {
    return await db
      .select()
      .from(issuesLog)
      .orderBy(desc(issuesLog.createdAt))
      .limit(limit);
  }

  async getUnresolvedIssues(): Promise<IssuesLog[]> {
    return await db
      .select()
      .from(issuesLog)
      .where(eq(issuesLog.resolved, false))
      .orderBy(desc(issuesLog.createdAt));
  }

  async createIssue(issue: InsertIssuesLog): Promise<IssuesLog> {
    const [createdIssue] = await db
      .insert(issuesLog)
      .values(issue)
      .returning();
    return createdIssue;
  }

  async updateIssue(id: number, update: Partial<IssuesLog>): Promise<void> {
    await db
      .update(issuesLog)
      .set(update)
      .where(eq(issuesLog.id, id));
  }

  async resolveIssue(id: number): Promise<void> {
    await db
      .update(issuesLog)
      .set({ 
        resolved: true,
        resolvedAt: new Date()
      })
      .where(eq(issuesLog.id, id));
  }
}

export const storage = new DatabaseStorage();