import {
  users,
  pantries,
  adminSettings,
  dataSyncSettings,
  announcements,
  type User,
  type UpsertUser,
  type Pantry,
  type InsertPantry,
  type AdminSettings,
  type InsertAdminSettings,
  type DataSyncSettings,
  type InsertDataSyncSettings,
  type Announcement,
  type InsertAnnouncement,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ilike, sql, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string, approvedBy?: string): Promise<User>;
  updateUserStatus(id: string, status: string, approvedBy?: string): Promise<User>;
  
  // Pantry operations
  getPantries(): Promise<Pantry[]>;
  getPantry(id: string): Promise<Pantry | undefined>;
  createPantry(pantry: InsertPantry): Promise<Pantry>;
  updatePantry(id: string, pantry: Partial<InsertPantry>): Promise<Pantry>;
  deletePantry(id: string): Promise<void>;
  deleteAllPantries(): Promise<number>;
  searchPantries(query: string, latitude?: number, longitude?: number, radius?: number): Promise<Pantry[]>;
  
  // Admin settings operations
  getAdminSettings(): Promise<AdminSettings | undefined>;
  updateAdminSettings(settings: InsertAdminSettings): Promise<AdminSettings>;
  
  // Data sync operations
  getDataSyncSettings(): Promise<DataSyncSettings[]>;
  createDataSyncSettings(settings: InsertDataSyncSettings): Promise<DataSyncSettings>;
  updateDataSyncSettings(id: string, settings: Partial<InsertDataSyncSettings>): Promise<DataSyncSettings>;
  deleteDataSyncSettings(id: string): Promise<void>;
  
  // Announcement operations
  getActiveAnnouncements(): Promise<Announcement[]>;
  getAllAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserRole(id: string, role: string, approvedBy?: string): Promise<User> {
    const updateData: any = { 
      role, 
      updatedAt: new Date() 
    };
    
    if (approvedBy) {
      updateData.approvedBy = approvedBy;
      updateData.approvedAt = new Date();
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserStatus(id: string, status: string, approvedBy?: string): Promise<User> {
    const updateData: any = { 
      status, 
      updatedAt: new Date() 
    };
    
    if (approvedBy && status === 'approved') {
      updateData.approvedBy = approvedBy;
      updateData.approvedAt = new Date();
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Pantry operations
  async getPantries(): Promise<Pantry[]> {
    return await db.select().from(pantries).where(eq(pantries.isActive, true));
  }

  async getPantry(id: string): Promise<Pantry | undefined> {
    const [pantry] = await db.select().from(pantries).where(eq(pantries.id, id));
    return pantry;
  }

  async createPantry(pantryData: InsertPantry): Promise<Pantry> {
    const [pantry] = await db.insert(pantries).values(pantryData).returning();
    return pantry;
  }

  async updatePantry(id: string, pantryData: Partial<InsertPantry>): Promise<Pantry> {
    const [pantry] = await db
      .update(pantries)
      .set({ ...pantryData, updatedAt: new Date() })
      .where(eq(pantries.id, id))
      .returning();
    return pantry;
  }

  async deletePantry(id: string): Promise<void> {
    await db.update(pantries).set({ isActive: false }).where(eq(pantries.id, id));
  }

  async deleteAllPantries(): Promise<number> {
    const result = await db.update(pantries).set({ isActive: false });
    return result.rowCount || 0;
  }

  async searchPantries(query: string, latitude?: number, longitude?: number, radius?: number): Promise<Pantry[]> {
    // Build conditions array
    const conditions = [eq(pantries.isActive, true)];
    
    // Add text search conditions if query is provided
    if (query && query.trim()) {
      const searchTerm = `%${query.trim()}%`;
      conditions.push(
        sql`(
          ${pantries.name} ILIKE ${searchTerm} OR
          ${pantries.address} ILIKE ${searchTerm} OR
          ${pantries.city} ILIKE ${searchTerm} OR
          ${pantries.state} ILIKE ${searchTerm} OR
          ${pantries.zipCode} ILIKE ${searchTerm}
        )`
      );
    }

    // If location-based search is requested, add distance filtering
    if (latitude && longitude && radius) {
      // Convert miles to kilometers (radius is in miles)
      const radiusInKm = radius * 1.60934;
      
      // Use Haversine formula for distance calculation (in kilometers)
      const distanceFormula = sql`
        6371 * acos(
          cos(radians(${latitude})) * 
          cos(radians(${pantries.latitude}::decimal)) * 
          cos(radians(${pantries.longitude}::decimal) - radians(${longitude})) + 
          sin(radians(${latitude})) * 
          sin(radians(${pantries.latitude}::decimal))
        )
      `;
      
      conditions.push(
        sql`${pantries.latitude} IS NOT NULL`,
        sql`${pantries.longitude} IS NOT NULL`,
        sql`${distanceFormula} <= ${radiusInKm}`
      );
    }

    return await db.select().from(pantries).where(and(...conditions));
  }

  // Admin settings operations
  async getAdminSettings(): Promise<AdminSettings | undefined> {
    const [settings] = await db.select().from(adminSettings).limit(1);
    return settings;
  }

  async updateAdminSettings(settingsData: InsertAdminSettings): Promise<AdminSettings> {
    // Try to update existing settings first
    const existing = await this.getAdminSettings();
    
    if (existing) {
      const [settings] = await db
        .update(adminSettings)
        .set({ ...settingsData, updatedAt: new Date() })
        .where(eq(adminSettings.id, existing.id))
        .returning();
      return settings;
    } else {
      // Create new settings if none exist
      const [settings] = await db.insert(adminSettings).values(settingsData).returning();
      return settings;
    }
  }

  // Data sync operations
  async getDataSyncSettings(): Promise<DataSyncSettings[]> {
    return await db.select().from(dataSyncSettings).where(eq(dataSyncSettings.isActive, true));
  }

  async createDataSyncSettings(settingsData: InsertDataSyncSettings): Promise<DataSyncSettings> {
    const [settings] = await db.insert(dataSyncSettings).values(settingsData).returning();
    return settings;
  }

  async updateDataSyncSettings(id: string, settingsData: Partial<InsertDataSyncSettings>): Promise<DataSyncSettings> {
    const [settings] = await db
      .update(dataSyncSettings)
      .set({ ...settingsData, updatedAt: new Date() })
      .where(eq(dataSyncSettings.id, id))
      .returning();
    return settings;
  }

  async deleteDataSyncSettings(id: string): Promise<void> {
    await db.update(dataSyncSettings).set({ isActive: false }).where(eq(dataSyncSettings.id, id));
  }

  // Announcement operations
  async getActiveAnnouncements(): Promise<Announcement[]> {
    const now = new Date();
    return await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.isActive, true),
          lte(announcements.startDate, now),
          sql`(${announcements.endDate} IS NULL OR ${announcements.endDate} >= ${now})`
        )
      )
      .orderBy(sql`CASE 
        WHEN ${announcements.priority} = 'high' THEN 1 
        WHEN ${announcements.priority} = 'medium' THEN 2 
        WHEN ${announcements.priority} = 'low' THEN 3 
        ELSE 4 END`, announcements.createdAt);
  }

  async getAllAnnouncements(): Promise<Announcement[]> {
    return await db
      .select()
      .from(announcements)
      .orderBy(sql`CASE 
        WHEN ${announcements.priority} = 'high' THEN 1 
        WHEN ${announcements.priority} = 'medium' THEN 2 
        WHEN ${announcements.priority} = 'low' THEN 3 
        ELSE 4 END`, announcements.createdAt);
  }

  async createAnnouncement(announcementData: InsertAnnouncement): Promise<Announcement> {
    const [announcement] = await db
      .insert(announcements)
      .values(announcementData)
      .returning();
    return announcement;
  }

  async updateAnnouncement(id: string, announcementData: Partial<InsertAnnouncement>): Promise<Announcement> {
    const [announcement] = await db
      .update(announcements)
      .set({ ...announcementData, updatedAt: new Date() })
      .where(eq(announcements.id, id))
      .returning();
    return announcement;
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await db.delete(announcements).where(eq(announcements.id, id));
  }

  // Initialization function to set up first super admin
  async ensureFirstSuperAdmin(): Promise<void> {
    try {
      // Check if any super admin exists
      const [superAdmin] = await db
        .select()
        .from(users)
        .where(eq(users.role, 'super_admin'))
        .limit(1);
      
      if (superAdmin) {
        console.log('Super admin already exists, skipping initialization');
        return;
      }

      // Get the first user (oldest by creation date)
      const [firstUser] = await db
        .select()
        .from(users)
        .orderBy(users.createdAt)
        .limit(1);

      if (!firstUser) {
        console.log('No users found, super admin will be set up when first user signs up');
        return;
      }

      // Promote first user to super admin
      await db
        .update(users)
        .set({
          role: 'super_admin',
          status: 'approved',
          approvedBy: firstUser.id, // Self-approved
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, firstUser.id));

      console.log(`Promoted first user (${firstUser.email}) to super admin`);
    } catch (error) {
      console.error('Error setting up first super admin:', error);
      // Don't throw - this shouldn't break app startup
    }
  }
}

export const storage = new DatabaseStorage();
