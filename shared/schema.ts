import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"), // 'user', 'admin', 'super_admin'
  status: varchar("status").default("pending"), // 'pending', 'approved', 'rejected'
  approvedBy: varchar("approved_by"), // ID of admin who approved
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Food pantries table
export const pantries = pgTable("pantries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  zipCode: varchar("zip_code").notNull(),
  phone: varchar("phone"),
  email: varchar("email"),
  website: varchar("website"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  hours: text("hours"),
  description: text("description"),
  services: text("services").array(),
  accessType: varchar("access_type"), // 'walk-in', 'appointment', 'mobile'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin settings table for white-labeling
export const adminSettings = pgTable("admin_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationName: text("organization_name").notNull(),
  primaryColor: varchar("primary_color").default("#0F766E"),
  secondaryColor: varchar("secondary_color").default("#EA580C"),
  logoUrl: varchar("logo_url"),
  faviconUrl: varchar("favicon_url"),
  defaultLatitude: decimal("default_latitude", { precision: 10, scale: 7 }).default("40.6259"),
  defaultLongitude: decimal("default_longitude", { precision: 10, scale: 7 }).default("-75.3697"),
  defaultZoom: varchar("default_zoom").default("12"),
  mapStyle: varchar("map_style").default("standard"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Announcements table
export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").default("info"), // 'info', 'warning', 'error', 'success'
  isActive: boolean("is_active").default(true),
  priority: varchar("priority").default("medium"), // 'low', 'medium', 'high'
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data sync settings
export const dataSyncSettings = pgTable("data_sync_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceType: varchar("source_type").notNull(), // 'sharepoint', 'google_sheets', 'csv'
  sourceUrl: text("source_url"),
  apiKey: varchar("api_key"),
  
  // SharePoint-specific fields
  tenantId: varchar("tenant_id"), // Azure AD tenant ID
  clientId: varchar("client_id"), // Azure AD app client ID
  clientSecret: varchar("client_secret"), // Azure AD app client secret
  siteId: varchar("site_id"), // SharePoint site ID
  listId: varchar("list_id"), // SharePoint list ID
  listName: varchar("list_name"), // Human-readable list name
  
  // Column mapping for SharePoint lists
  columnMapping: jsonb("column_mapping"), // Maps SharePoint columns to pantry fields
  
  lastSync: timestamp("last_sync"),
  syncStatus: varchar("sync_status").default("pending"), // 'pending', 'syncing', 'success', 'error'
  lastError: text("last_error"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schema exports
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type Pantry = typeof pantries.$inferSelect;
export type InsertPantry = typeof pantries.$inferInsert;

export type AdminSettings = typeof adminSettings.$inferSelect;
export type InsertAdminSettings = typeof adminSettings.$inferInsert;

export type DataSyncSettings = typeof dataSyncSettings.$inferSelect;
export type InsertDataSyncSettings = typeof dataSyncSettings.$inferInsert;

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = typeof announcements.$inferInsert;

// Zod schemas
export const insertPantrySchema = createInsertSchema(pantries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminSettingsSchema = createInsertSchema(adminSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDataSyncSettingsSchema = createInsertSchema(dataSyncSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAnnouncementType = z.infer<typeof insertAnnouncementSchema>;
