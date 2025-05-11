import { eq, and, desc, sql, count } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  businessSetup,
  documents,
  userDocuments,
  documentTemplates,
  templateSubmissions,
  conversations,
  messages,
  issuesLog,
  documentTypes,
  saifZoneForms,
  userInteractions,
  apiGateways,
  apiRoutes,
  adminDashboards,
  adminDashboardWidgets,
  conversationInterfaces,
  type User,
  type InsertUser,
  type BusinessSetup,
  type Document,
  type InsertDocument,
  type UserDocument,
  type InsertUserDocument,
  type DocumentTemplate,
  type InsertDocumentTemplate,
  type TemplateSubmission,
  type InsertTemplateSubmission,
  type DocumentType,
  type InsertDocumentType,
  type SaifZoneForm,
  type InsertSaifZoneForm,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type IssuesLog,
  type InsertIssuesLog,
  type UserInteraction,
  type InsertUserInteraction,
  type ApiGateway,
  type InsertApiGateway,
  type ApiRoute,
  type InsertApiRoute,
  type AdminDashboard, 
  type InsertAdminDashboard,
  type AdminDashboardWidget,
  type InsertAdminDashboardWidget,
  type ConversationInterface,
  type InsertConversationInterface
} from "../shared/schema";

// For backward compatibility with existing code
type ConversationMessage = Message;
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<void>;
  updateUserProgress(userId: number, progress: number): Promise<void>;
  updateUserLastLogin(userId: number): Promise<void>;
  getBusinessSetup(userId: number): Promise<BusinessSetup | undefined>;
  getBusinessSetupById(id: number): Promise<BusinessSetup | undefined>;
  createBusinessSetup(setup: Omit<BusinessSetup, "id">): Promise<BusinessSetup>;
  updateBusinessSetup(id: number, setup: Partial<BusinessSetup>): Promise<void>;
  
  // Document management methods
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByFreeZone(freeZoneId: number): Promise<Document[]>;
  getDocumentsByCategory(category: string): Promise<Document[]>;
  getDocumentsByFilename(filename: string): Promise<Document[]>;
  getAllDocuments(): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<Document>): Promise<void>;
  deleteDocument(id: number): Promise<void>;
  
  // User Document management methods
  getUserDocument(id: number): Promise<UserDocument | undefined>;
  getUserDocumentsByUser(userId: number): Promise<UserDocument[]>;
  getUserDocumentsByType(userId: number, documentType: string): Promise<UserDocument[]>;
  getUserDocumentsByCategory(userId: number, category: string): Promise<UserDocument[]>;
  createUserDocument(document: InsertUserDocument): Promise<UserDocument>;
  updateUserDocument(id: number, document: Partial<UserDocument>): Promise<void>;
  deleteUserDocument(id: number): Promise<void>;
  
  // Document Template management methods
  getDocumentTemplate(id: number): Promise<DocumentTemplate | undefined>;
  getDocumentTemplatesByFreeZone(freeZoneId: number): Promise<DocumentTemplate[]>;
  getDocumentTemplatesByCategory(category: string): Promise<DocumentTemplate[]>;
  getAllDocumentTemplates(): Promise<DocumentTemplate[]>;
  createDocumentTemplate(template: InsertDocumentTemplate): Promise<DocumentTemplate>;
  updateDocumentTemplate(id: number, template: Partial<DocumentTemplate>): Promise<void>;
  deleteDocumentTemplate(id: number): Promise<void>;
  
  // Template Submission management methods
  getTemplateSubmission(id: number): Promise<TemplateSubmission | undefined>;
  getTemplateSubmissionsByUser(userId: number): Promise<TemplateSubmission[]>;
  getTemplateSubmissionsByTemplate(templateId: number): Promise<TemplateSubmission[]>;
  getTemplateSubmissionsByStatus(userId: number, status: string): Promise<TemplateSubmission[]>;
  createTemplateSubmission(submission: InsertTemplateSubmission): Promise<TemplateSubmission>;
  updateTemplateSubmission(id: number, submission: Partial<TemplateSubmission>): Promise<void>;
  deleteTemplateSubmission(id: number): Promise<void>;
  
  // Document Type management methods
  getDocumentType(id: number): Promise<DocumentType | undefined>;
  getDocumentTypeByName(name: string): Promise<DocumentType | undefined>;
  getAllDocumentTypes(): Promise<DocumentType[]>;
  getDocumentTypesByCategory(category: string): Promise<DocumentType[]>;
  createDocumentType(type: InsertDocumentType): Promise<DocumentType>;
  updateDocumentType(id: number, type: Partial<DocumentType>): Promise<void>;
  deleteDocumentType(id: number): Promise<void>;
  
  // Conversation management methods
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsByUser(userId: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, conversation: Partial<Conversation>): Promise<void>;
  
  // Message management methods
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  getConversationMessages(conversationId: number): Promise<Message[]>;
  addMessage(message: InsertMessage): Promise<Message>;
  
  // Issues Log management methods
  getIssue(id: number): Promise<IssuesLog | undefined>;
  getIssuesByUser(userId: number): Promise<IssuesLog[]>;
  getRecentIssues(limit?: number): Promise<IssuesLog[]>;
  getUnresolvedIssues(): Promise<IssuesLog[]>;
  createIssue(issue: InsertIssuesLog): Promise<IssuesLog>;
  updateIssue(id: number, issue: Partial<IssuesLog>): Promise<void>;
  resolveIssue(id: number): Promise<void>;
  
  // User Interaction methods
  createUserInteraction(interaction: InsertUserInteraction): Promise<UserInteraction>;
  getUserInteraction(id: number): Promise<UserInteraction | undefined>;
  getUserInteractionsByUser(userId: number, limit?: number): Promise<UserInteraction[]>;
  getUserInteractionsByType(type: string, limit?: number): Promise<UserInteraction[]>;
  getUserInteractionStats(startDate?: Date, endDate?: Date): Promise<any>;
  deleteUserInteraction(id: number): Promise<void>;
  
  // API Gateway methods
  createApiGateway(gateway: InsertApiGateway): Promise<ApiGateway>;
  getApiGateway(id: number): Promise<ApiGateway | undefined>;
  getApiGatewayByName(name: string): Promise<ApiGateway | undefined>;
  getAllApiGateways(): Promise<ApiGateway[]>;
  updateApiGateway(id: number, gateway: Partial<ApiGateway>): Promise<void>;
  deleteApiGateway(id: number): Promise<void>;
  
  // API Route methods
  createApiRoute(route: InsertApiRoute): Promise<ApiRoute>;
  getApiRoute(id: number): Promise<ApiRoute | undefined>;
  getApiRoutesByGateway(gatewayId: number): Promise<ApiRoute[]>;
  getApiRoutesByPath(path: string): Promise<ApiRoute[]>;
  getAllApiRoutes(): Promise<ApiRoute[]>;
  updateApiRoute(id: number, route: Partial<ApiRoute>): Promise<void>;
  deleteApiRoute(id: number): Promise<void>;
  
  // Admin Dashboard methods
  createAdminDashboard(dashboard: InsertAdminDashboard): Promise<AdminDashboard>;
  getAdminDashboard(id: number): Promise<AdminDashboard | undefined>;
  getAdminDashboardByPath(path: string): Promise<AdminDashboard | undefined>;
  getAllAdminDashboards(): Promise<AdminDashboard[]>;
  getAdminDashboardsByRole(role: string): Promise<AdminDashboard[]>;
  updateAdminDashboard(id: number, dashboard: Partial<AdminDashboard>): Promise<void>;
  deleteAdminDashboard(id: number): Promise<void>;
  
  // Admin Dashboard Widget methods
  createAdminDashboardWidget(widget: InsertAdminDashboardWidget): Promise<AdminDashboardWidget>;
  getAdminDashboardWidget(id: number): Promise<AdminDashboardWidget | undefined>;
  getAdminDashboardWidgetsByDashboard(dashboardId: number): Promise<AdminDashboardWidget[]>;
  updateAdminDashboardWidget(id: number, widget: Partial<AdminDashboardWidget>): Promise<void>;
  deleteAdminDashboardWidget(id: number): Promise<void>;
  
  // Conversation Interface methods
  createConversationInterface(interface: InsertConversationInterface): Promise<ConversationInterface>;
  getConversationInterface(id: number): Promise<ConversationInterface | undefined>;
  getConversationInterfaceByName(name: string): Promise<ConversationInterface | undefined>;
  getAllConversationInterfaces(): Promise<ConversationInterface[]>;
  getActiveConversationInterfaces(): Promise<ConversationInterface[]>;
  updateConversationInterface(id: number, interface: Partial<ConversationInterface>): Promise<void>;
  deleteConversationInterface(id: number): Promise<void>;
  
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<void> {
    await db
      .update(users)
      .set({
        ...userData,
        updated_at: new Date()
      })
      .where(eq(users.id, id));
  }

  async updateUserProgress(userId: number, progress: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        progress,
        updated_at: new Date()
      })
      .where(eq(users.id, userId));
  }
  
  async updateUserLastLogin(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        last_login: new Date(),
        updated_at: new Date()
      })
      .where(eq(users.id, userId));
  }

  async getBusinessSetup(userId: number): Promise<BusinessSetup | undefined> {
    const [setup] = await db
      .select()
      .from(businessSetup)
      .where(eq(businessSetup.userId, userId));
    return setup;
  }
  
  async getBusinessSetupById(id: number): Promise<BusinessSetup | undefined> {
    const [setup] = await db
      .select()
      .from(businessSetup)
      .where(eq(businessSetup.id, id));
    return setup;
  }

  async createBusinessSetup(setup: Omit<BusinessSetup, "id">): Promise<BusinessSetup> {
    const [createdSetup] = await db
      .insert(businessSetup)
      .values(setup)
      .returning();
    return createdSetup;
  }

  async updateBusinessSetup(id: number, update: Partial<BusinessSetup>): Promise<void> {
    await db
      .update(businessSetup)
      .set(update)
      .where(eq(businessSetup.id, id));
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
  
  async getAllDocuments(): Promise<Document[]> {
    return await db.select().from(documents);
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

  // User Document management methods implementation
  async getUserDocument(id: number): Promise<UserDocument | undefined> {
    const [document] = await db.select().from(userDocuments).where(eq(userDocuments.id, id));
    return document;
  }

  async getUserDocumentsByUser(userId: number): Promise<UserDocument[]> {
    return await db
      .select()
      .from(userDocuments)
      .where(eq(userDocuments.userId, userId))
      .orderBy(desc(userDocuments.uploadedAt));
  }

  async getUserDocumentsByType(userId: number, documentType: string): Promise<UserDocument[]> {
    return await db
      .select()
      .from(userDocuments)
      .where(and(
        eq(userDocuments.userId, userId),
        eq(userDocuments.documentType, documentType)
      ))
      .orderBy(desc(userDocuments.uploadedAt));
  }

  async getUserDocumentsByCategory(userId: number, category: string): Promise<UserDocument[]> {
    return await db
      .select()
      .from(userDocuments)
      .where(and(
        eq(userDocuments.userId, userId),
        eq(userDocuments.documentCategory, category)
      ))
      .orderBy(desc(userDocuments.uploadedAt));
  }

  async createUserDocument(document: InsertUserDocument): Promise<UserDocument> {
    const [createdDocument] = await db
      .insert(userDocuments)
      .values(document)
      .returning();
    return createdDocument;
  }

  async updateUserDocument(id: number, document: Partial<UserDocument>): Promise<void> {
    await db
      .update(userDocuments)
      .set({
        ...document,
        updatedAt: new Date()
      })
      .where(eq(userDocuments.id, id));
  }

  async deleteUserDocument(id: number): Promise<void> {
    await db
      .delete(userDocuments)
      .where(eq(userDocuments.id, id));
  }

  // Document Template management methods implementation
  async getDocumentTemplate(id: number): Promise<DocumentTemplate | undefined> {
    const [template] = await db.select().from(documentTemplates).where(eq(documentTemplates.id, id));
    return template;
  }

  async getDocumentTemplatesByFreeZone(freeZoneId: number): Promise<DocumentTemplate[]> {
    return await db
      .select()
      .from(documentTemplates)
      .where(eq(documentTemplates.freeZoneId, freeZoneId))
      .orderBy(documentTemplates.name);
  }

  async getDocumentTemplatesByCategory(category: string): Promise<DocumentTemplate[]> {
    return await db
      .select()
      .from(documentTemplates)
      .where(eq(documentTemplates.category, category))
      .orderBy(documentTemplates.name);
  }

  async getAllDocumentTemplates(): Promise<DocumentTemplate[]> {
    return await db
      .select()
      .from(documentTemplates)
      .orderBy(documentTemplates.name);
  }

  async createDocumentTemplate(template: InsertDocumentTemplate): Promise<DocumentTemplate> {
    const [createdTemplate] = await db
      .insert(documentTemplates)
      .values(template)
      .returning();
    return createdTemplate;
  }

  async updateDocumentTemplate(id: number, template: Partial<DocumentTemplate>): Promise<void> {
    await db
      .update(documentTemplates)
      .set({
        ...template,
        updatedAt: new Date()
      })
      .where(eq(documentTemplates.id, id));
  }

  async deleteDocumentTemplate(id: number): Promise<void> {
    await db
      .delete(documentTemplates)
      .where(eq(documentTemplates.id, id));
  }

  // Template Submission management methods implementation
  async getTemplateSubmission(id: number): Promise<TemplateSubmission | undefined> {
    const [submission] = await db.select().from(templateSubmissions).where(eq(templateSubmissions.id, id));
    return submission;
  }

  async getTemplateSubmissionsByUser(userId: number): Promise<TemplateSubmission[]> {
    return await db
      .select()
      .from(templateSubmissions)
      .where(eq(templateSubmissions.userId, userId))
      .orderBy(desc(templateSubmissions.updatedAt));
  }

  async getTemplateSubmissionsByTemplate(templateId: number): Promise<TemplateSubmission[]> {
    return await db
      .select()
      .from(templateSubmissions)
      .where(eq(templateSubmissions.templateId, templateId))
      .orderBy(desc(templateSubmissions.updatedAt));
  }

  async getTemplateSubmissionsByStatus(userId: number, status: string): Promise<TemplateSubmission[]> {
    return await db
      .select()
      .from(templateSubmissions)
      .where(and(
        eq(templateSubmissions.userId, userId),
        eq(templateSubmissions.status, status)
      ))
      .orderBy(desc(templateSubmissions.updatedAt));
  }

  async createTemplateSubmission(submission: InsertTemplateSubmission): Promise<TemplateSubmission> {
    const [createdSubmission] = await db
      .insert(templateSubmissions)
      .values(submission)
      .returning();
    return createdSubmission;
  }

  async updateTemplateSubmission(id: number, submission: Partial<TemplateSubmission>): Promise<void> {
    await db
      .update(templateSubmissions)
      .set({
        ...submission,
        updatedAt: new Date()
      })
      .where(eq(templateSubmissions.id, id));
  }

  async deleteTemplateSubmission(id: number): Promise<void> {
    await db
      .delete(templateSubmissions)
      .where(eq(templateSubmissions.id, id));
  }

  // Document Type management methods implementation
  async getDocumentType(id: number): Promise<DocumentType | undefined> {
    const [type] = await db.select().from(documentTypes).where(eq(documentTypes.id, id));
    return type;
  }

  async getDocumentTypeByName(name: string): Promise<DocumentType | undefined> {
    const [type] = await db.select().from(documentTypes).where(eq(documentTypes.name, name));
    return type;
  }

  async getAllDocumentTypes(): Promise<DocumentType[]> {
    return await db
      .select()
      .from(documentTypes)
      .orderBy(documentTypes.name);
  }

  async getDocumentTypesByCategory(category: string): Promise<DocumentType[]> {
    return await db
      .select()
      .from(documentTypes)
      .where(eq(documentTypes.category, category))
      .orderBy(documentTypes.name);
  }

  async createDocumentType(type: InsertDocumentType): Promise<DocumentType> {
    const [createdType] = await db
      .insert(documentTypes)
      .values(type)
      .returning();
    return createdType;
  }

  async updateDocumentType(id: number, type: Partial<DocumentType>): Promise<void> {
    await db
      .update(documentTypes)
      .set(type)
      .where(eq(documentTypes.id, id));
  }

  async deleteDocumentType(id: number): Promise<void> {
    await db
      .delete(documentTypes)
      .where(eq(documentTypes.id, id));
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
  
  // API Gateway methods implementation
  async createApiGateway(gateway: InsertApiGateway): Promise<ApiGateway> {
    const [createdGateway] = await db
      .insert(apiGateways)
      .values(gateway)
      .returning();
    return createdGateway;
  }
  
  async getApiGateway(id: number): Promise<ApiGateway | undefined> {
    const [gateway] = await db.select().from(apiGateways).where(eq(apiGateways.id, id));
    return gateway;
  }
  
  async getApiGatewayByName(name: string): Promise<ApiGateway | undefined> {
    const [gateway] = await db.select().from(apiGateways).where(eq(apiGateways.name, name));
    return gateway;
  }
  
  async getAllApiGateways(): Promise<ApiGateway[]> {
    return await db.select().from(apiGateways).orderBy(apiGateways.name);
  }
  
  async updateApiGateway(id: number, gateway: Partial<ApiGateway>): Promise<void> {
    await db
      .update(apiGateways)
      .set({
        ...gateway,
        updatedAt: new Date(),
      })
      .where(eq(apiGateways.id, id));
  }
  
  async deleteApiGateway(id: number): Promise<void> {
    await db.delete(apiGateways).where(eq(apiGateways.id, id));
  }
  
  // API Route methods implementation
  async createApiRoute(route: InsertApiRoute): Promise<ApiRoute> {
    const [createdRoute] = await db
      .insert(apiRoutes)
      .values(route)
      .returning();
    return createdRoute;
  }
  
  async getApiRoute(id: number): Promise<ApiRoute | undefined> {
    const [route] = await db.select().from(apiRoutes).where(eq(apiRoutes.id, id));
    return route;
  }
  
  async getApiRoutesByGateway(gatewayId: number): Promise<ApiRoute[]> {
    return await db
      .select()
      .from(apiRoutes)
      .where(eq(apiRoutes.gatewayId, gatewayId))
      .orderBy(apiRoutes.path);
  }
  
  async getApiRoutesByPath(path: string): Promise<ApiRoute[]> {
    return await db
      .select()
      .from(apiRoutes)
      .where(eq(apiRoutes.path, path));
  }
  
  async getAllApiRoutes(): Promise<ApiRoute[]> {
    return await db.select().from(apiRoutes);
  }
  
  async updateApiRoute(id: number, route: Partial<ApiRoute>): Promise<void> {
    await db
      .update(apiRoutes)
      .set({
        ...route,
        updatedAt: new Date(),
      })
      .where(eq(apiRoutes.id, id));
  }
  
  async deleteApiRoute(id: number): Promise<void> {
    await db.delete(apiRoutes).where(eq(apiRoutes.id, id));
  }
  
  async deleteSaifZoneForm(id: number): Promise<void> {
    await db.delete(saifZoneForms).where(eq(saifZoneForms.id, id));
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

  async getConversationMessages(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }
  
  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    // Call the existing implementation for consistency
    return await this.getConversationMessages(conversationId);
  }

  async addMessage(message: InsertMessage): Promise<Message> {
    const [createdMessage] = await db
      .insert(messages)
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
    // Make sure we're using fields that exist in the database
    const issueData = {
      type: issue.type,
      severity: issue.severity || 'info',
      message: issue.message,
      userId: issue.userId,
      metadata: issue.metadata || {},
      resolved: issue.resolved || false,
      url: issue.url,
      user_agent: issue.user_agent,
      component: issue.component,
      action: issue.action,
      stack_trace: issue.stack_trace
    };
    
    try {
      const [createdIssue] = await db
        .insert(issuesLog)
        .values(issueData)
        .returning();
      return createdIssue;
    } catch (error) {
      console.error('Error creating issue:', error);
      // Return a partial object so the application can continue
      return {
        id: -1,
        type: issue.type,
        message: issue.message || 'Error logging failed',
        ...issueData
      } as IssuesLog;
    }
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

  // Admin Dashboard methods implementation
  async createAdminDashboard(dashboard: InsertAdminDashboard): Promise<AdminDashboard> {
    const [createdDashboard] = await db
      .insert(adminDashboards)
      .values(dashboard)
      .returning();
    return createdDashboard;
  }
  
  async getAdminDashboard(id: number): Promise<AdminDashboard | undefined> {
    const [dashboard] = await db.select().from(adminDashboards).where(eq(adminDashboards.id, id));
    return dashboard;
  }
  
  async getAdminDashboardByPath(path: string): Promise<AdminDashboard | undefined> {
    const [dashboard] = await db.select().from(adminDashboards).where(eq(adminDashboards.path, path));
    return dashboard;
  }
  
  async getAllAdminDashboards(): Promise<AdminDashboard[]> {
    return await db
      .select()
      .from(adminDashboards)
      .where(eq(adminDashboards.isActive, true))
      .orderBy(adminDashboards.order);
  }
  
  async getAdminDashboardsByRole(role: string): Promise<AdminDashboard[]> {
    return await db
      .select()
      .from(adminDashboards)
      .orderBy(adminDashboards.order);
    // Note: We need to filter by role in the application layer as requiredRoles is a JSONB field
  }
  
  async updateAdminDashboard(id: number, dashboard: Partial<AdminDashboard>): Promise<void> {
    await db
      .update(adminDashboards)
      .set({
        ...dashboard,
        updatedAt: new Date(),
      })
      .where(eq(adminDashboards.id, id));
  }
  
  async deleteAdminDashboard(id: number): Promise<void> {
    await db.delete(adminDashboards).where(eq(adminDashboards.id, id));
  }
  
  // Admin Dashboard Widget methods implementation
  async createAdminDashboardWidget(widget: InsertAdminDashboardWidget): Promise<AdminDashboardWidget> {
    const [createdWidget] = await db
      .insert(adminDashboardWidgets)
      .values(widget)
      .returning();
    return createdWidget;
  }
  
  async getAdminDashboardWidget(id: number): Promise<AdminDashboardWidget | undefined> {
    const [widget] = await db.select().from(adminDashboardWidgets).where(eq(adminDashboardWidgets.id, id));
    return widget;
  }
  
  async getAdminDashboardWidgetsByDashboard(dashboardId: number): Promise<AdminDashboardWidget[]> {
    return await db
      .select()
      .from(adminDashboardWidgets)
      .where(eq(adminDashboardWidgets.dashboardId, dashboardId))
      .orderBy(adminDashboardWidgets.order);
  }
  
  async updateAdminDashboardWidget(id: number, widget: Partial<AdminDashboardWidget>): Promise<void> {
    await db
      .update(adminDashboardWidgets)
      .set({
        ...widget,
        updatedAt: new Date(),
      })
      .where(eq(adminDashboardWidgets.id, id));
  }
  
  async deleteAdminDashboardWidget(id: number): Promise<void> {
    await db.delete(adminDashboardWidgets).where(eq(adminDashboardWidgets.id, id));
  }
  
  // Conversation Interface methods implementation
  async createConversationInterface(interfaceData: InsertConversationInterface): Promise<ConversationInterface> {
    const [createdInterface] = await db
      .insert(conversationInterfaces)
      .values(interfaceData)
      .returning();
    return createdInterface;
  }
  
  async getConversationInterface(id: number): Promise<ConversationInterface | undefined> {
    const [conversationInterface] = await db.select().from(conversationInterfaces).where(eq(conversationInterfaces.id, id));
    return conversationInterface;
  }
  
  async getConversationInterfaceByName(name: string): Promise<ConversationInterface | undefined> {
    const [conversationInterface] = await db.select().from(conversationInterfaces).where(eq(conversationInterfaces.name, name));
    return conversationInterface;
  }
  
  async getAllConversationInterfaces(): Promise<ConversationInterface[]> {
    return await db.select().from(conversationInterfaces);
  }
  
  async getActiveConversationInterfaces(): Promise<ConversationInterface[]> {
    return await db
      .select()
      .from(conversationInterfaces)
      .where(eq(conversationInterfaces.isActive, true))
      .orderBy(conversationInterfaces.order);
  }
  
  async updateConversationInterface(id: number, data: Partial<ConversationInterface>): Promise<void> {
    await db
      .update(conversationInterfaces)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(conversationInterfaces.id, id));
  }
  
  async deleteConversationInterface(id: number): Promise<void> {
    await db.delete(conversationInterfaces).where(eq(conversationInterfaces.id, id));
  }
}

export const storage = new DatabaseStorage();