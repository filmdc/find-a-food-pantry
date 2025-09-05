import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, isSuperAdmin } from "./replitAuth";
import { insertPantrySchema, insertAdminSettingsSchema, insertDataSyncSettingsSchema, insertAnnouncementSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "stream";
import { SharePointService } from "./services/sharepointService";
import { ExportService } from "./services/exportService";

// Function to clean HTML tags and WordPress block comments from text
function cleanHtmlAndWordPress(text: string): string {
  if (!text || typeof text !== 'string') return text;
  
  return text
    // Remove WordPress block comments (<!-- wp:... --> and <!-- /wp:... -->)
    .replace(/<!--\s*\/?wp:[^>]*-->/g, '')
    // Remove HTML tags while preserving content
    .replace(/<[^>]*>/g, '')
    // Replace common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  // Initialize first super admin if needed
  await storage.ensureFirstSuperAdmin();
  
  // Configure multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed'));
      }
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User management routes (Admin only)
  app.get('/api/admin/users', isSuperAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/admin/users/:id/role', isSuperAdmin, async (req: any, res) => {
    try {
      const { role } = req.body;
      const adminId = req.user.claims.sub;
      
      if (!['user', 'admin', 'super_admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.updateUserRole(req.params.id, role, adminId);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.put('/api/admin/users/:id/status', isSuperAdmin, async (req: any, res) => {
    try {
      const { status } = req.body;
      const adminId = req.user.claims.sub;
      
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const user = await storage.updateUserStatus(req.params.id, status, adminId);
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Request admin access endpoint (for users to request admin privileges)
  app.post('/api/auth/request-admin', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.updateUserRole(userId, 'admin');
      res.json(user);
    } catch (error) {
      console.error("Error requesting admin access:", error);
      res.status(500).json({ message: "Failed to request admin access" });
    }
  });

  // Public pantry routes
  app.get('/api/pantries', async (req, res) => {
    try {
      const pantries = await storage.getPantries();
      res.json(pantries);
    } catch (error) {
      console.error("Error fetching pantries:", error);
      res.status(500).json({ message: "Failed to fetch pantries" });
    }
  });

  app.get('/api/pantries/search', async (req, res) => {
    try {
      const { q, lat, lng, radius } = req.query;
      const query = q as string || '';
      const latitude = lat ? parseFloat(lat as string) : undefined;
      const longitude = lng ? parseFloat(lng as string) : undefined;
      const searchRadius = radius ? parseFloat(radius as string) : undefined;

      const pantries = await storage.searchPantries(query, latitude, longitude, searchRadius);
      res.json(pantries);
    } catch (error) {
      console.error("Error searching pantries:", error);
      res.status(500).json({ message: "Failed to search pantries" });
    }
  });

  // Geocoding endpoint to convert addresses to coordinates
  app.get('/api/geocode', async (req, res) => {
    try {
      const { q } = req.query;
      const query = q as string;
      
      if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
      }

      // Call OpenStreetMap Nominatim API with proper headers
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=us&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'PantryFinder/1.0 (Contact: admin@pantryfinder.com)',
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        console.error(`Geocoding API returned ${response.status}: ${response.statusText}`);
        return res.json([]); // Return empty array instead of error
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Geocoding API returned non-JSON response');
        return res.json([]); // Return empty array for non-JSON responses
      }
      
      const results = await response.json();
      res.json(results || []);
    } catch (error) {
      console.error("Geocoding error:", error);
      // Return empty array instead of error to allow fallback to text search
      res.json([]);
    }
  });

  app.get('/api/pantries/:id', async (req, res) => {
    try {
      const pantry = await storage.getPantry(req.params.id);
      if (!pantry) {
        return res.status(404).json({ message: "Pantry not found" });
      }
      res.json(pantry);
    } catch (error) {
      console.error("Error fetching pantry:", error);
      res.status(500).json({ message: "Failed to fetch pantry" });
    }
  });

  // Admin-only pantry routes
  app.post('/api/pantries', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertPantrySchema.parse(req.body);
      const pantry = await storage.createPantry(validatedData);
      res.status(201).json(pantry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid pantry data", errors: error.errors });
      }
      console.error("Error creating pantry:", error);
      res.status(500).json({ message: "Failed to create pantry" });
    }
  });

  app.put('/api/pantries/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertPantrySchema.partial().parse(req.body);
      const pantry = await storage.updatePantry(req.params.id, validatedData);
      res.json(pantry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid pantry data", errors: error.errors });
      }
      console.error("Error updating pantry:", error);
      res.status(500).json({ message: "Failed to update pantry" });
    }
  });

  app.delete('/api/pantries/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deletePantry(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting pantry:", error);
      res.status(500).json({ message: "Failed to delete pantry" });
    }
  });

  // Admin settings routes
  app.get('/api/admin/settings', async (req, res) => {
    try {
      const settings = await storage.getAdminSettings();
      if (!settings) {
        // Return default settings if none exist
        const defaultSettings = {
          organizationName: "Second Harvest Food Bank of the Lehigh Valley",
          primaryColor: "#0F766E",
          secondaryColor: "#EA580C",
          faviconUrl: undefined,
          defaultLatitude: "40.6259",
          defaultLongitude: "-75.3697",
          defaultZoom: "12",
          mapStyle: "standard",
        };
        return res.json(defaultSettings);
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching admin settings:", error);
      res.status(500).json({ message: "Failed to fetch admin settings" });
    }
  });

  app.put('/api/admin/settings', isAdmin, async (req, res) => {
    try {
      const validatedData = insertAdminSettingsSchema.parse(req.body);
      const settings = await storage.updateAdminSettings(validatedData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid settings data", errors: error.errors });
      }
      console.error("Error updating admin settings:", error);
      res.status(500).json({ message: "Failed to update admin settings" });
    }
  });

  // Data sync settings routes
  app.get('/api/admin/data-sync', isAdmin, async (req, res) => {
    try {
      const settings = await storage.getDataSyncSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching data sync settings:", error);
      res.status(500).json({ message: "Failed to fetch data sync settings" });
    }
  });

  app.post('/api/admin/data-sync', isAdmin, async (req, res) => {
    try {
      const validatedData = insertDataSyncSettingsSchema.parse(req.body);
      const settings = await storage.createDataSyncSettings(validatedData);
      res.status(201).json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data sync settings", errors: error.errors });
      }
      console.error("Error creating data sync settings:", error);
      res.status(500).json({ message: "Failed to create data sync settings" });
    }
  });

  // Announcement routes
  // Public route to get active announcements
  app.get('/api/announcements', async (req, res) => {
    try {
      const announcements = await storage.getActiveAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  // Admin routes for announcement management
  app.get('/api/admin/announcements', isAdmin, async (req, res) => {
    try {
      const announcements = await storage.getAllAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching all announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  app.post('/api/admin/announcements', isAdmin, async (req, res) => {
    try {
      const validatedData = insertAnnouncementSchema.parse(req.body);
      const announcement = await storage.createAnnouncement(validatedData);
      res.status(201).json(announcement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid announcement data", errors: error.errors });
      }
      console.error("Error creating announcement:", error);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  app.put('/api/admin/announcements/:id', isAdmin, async (req, res) => {
    try {
      const validatedData = insertAnnouncementSchema.partial().parse(req.body);
      const announcement = await storage.updateAnnouncement(req.params.id, validatedData);
      res.json(announcement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid announcement data", errors: error.errors });
      }
      console.error("Error updating announcement:", error);
      res.status(500).json({ message: "Failed to update announcement" });
    }
  });

  app.delete('/api/admin/announcements/:id', isAdmin, async (req, res) => {
    try {
      await storage.deleteAnnouncement(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ message: "Failed to delete announcement" });
    }
  });

  // Individual pantry CRUD endpoints
  app.put('/api/pantries/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertPantrySchema.parse(req.body);
      const updatedPantry = await storage.updatePantry(id, validatedData);
      
      res.json(updatedPantry);
    } catch (error) {
      console.error("Error updating pantry:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update pantry" });
    }
  });

  app.delete('/api/pantries/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePantry(id);
      
      res.json({ message: "Pantry deleted successfully" });
    } catch (error) {
      console.error("Error deleting pantry:", error);
      res.status(500).json({ message: "Failed to delete pantry" });
    }
  });

  // Bulk operations
  app.delete('/api/pantries', isAuthenticated, async (req, res) => {
    try {
      const count = await storage.deleteAllPantries();
      res.json({ message: `Successfully deleted ${count} pantries`, count });
    } catch (error) {
      console.error("Error deleting all pantries:", error);
      res.status(500).json({ message: "Failed to delete pantries" });
    }
  });

  // CSV upload endpoint
  app.post('/api/admin/upload-csv', isAuthenticated, upload.single('csvFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file provided" });
      }

      const results: any[] = [];
      const stream = Readable.from(req.file.buffer.toString());
      
      // Parse CSV data with proper quote handling for multi-line fields
      await new Promise((resolve, reject) => {
        stream
          .pipe(csv({
            escape: '"',
            quote: '"'
          }))
          .on('data', (data) => {
            // Only add rows that have meaningful data
            if (data.name && data.name.trim() && !data.name.includes('wpsl_id')) {
              results.push(data);
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });

      if (results.length === 0) {
        return res.status(400).json({ message: "CSV file is empty or invalid" });
      }

      // Map CSV columns to pantry fields
      const pantries = results.map((row) => {
        // Support the specific WPSL export format and common variations
        const getName = () => {
          const name = row.name || row.Name || row.pantry_name || row['Pantry Name'] || '';
          return name ? cleanHtmlAndWordPress(name) : '';
        };
        const getAddress = () => {
          const address = row.address || row.Address || row.street_address || row['Street Address'] || '';
          return address ? cleanHtmlAndWordPress(address) : '';
        };
        const getCity = () => {
          const city = row.city || row.City || '';
          return city ? cleanHtmlAndWordPress(city) : '';
        };
        const getState = () => {
          const state = row.state || row.State || row.st || row.ST || '';
          return state ? cleanHtmlAndWordPress(state) : '';
        };
        const getZip = () => row.zip || row.zipcode || row.zip_code || row['Zip Code'] || row.postal_code || '';
        const getPhone = () => row.phone || row.Phone || row.telephone || row['Phone Number'] || null;
        const getEmail = () => row.email || row.Email || row['Email Address'] || null;
        const getHours = () => {
          const hours = row.hours || row.Hours || row.operating_hours || row['Operating Hours'] || null;
          return hours ? cleanHtmlAndWordPress(hours) : null;
        };
        const getAccessType = () => {
          const access = row.access_type || row['Access Type'] || row.access || '';
          if (access && access.toLowerCase().includes('walk')) return 'walk-in';
          if (access && access.toLowerCase().includes('appointment')) return 'appointment';
          if (access && access.toLowerCase().includes('mobile')) return 'mobile';
          return null;
        };
        const getDescription = () => {
          const desc = row.description || row.Description || row.notes || row.Notes || null;
          return desc ? cleanHtmlAndWordPress(desc) : null;
        };

        // Skip rows that don't have essential data or are header-like
        const name = getName();
        const address = getAddress();
        const city = getCity();
        const state = getState();
        
        // Check if this is likely a header row, empty row, or invalid data
        if (!name || 
            name.toLowerCase().includes('wpsl_id') || 
            name.toLowerCase().includes('food pantry') ||
            name.trim().length < 3 ||
            /^[0-9]+$/.test(name.trim())) { // Skip rows that are just numbers
          return null;
        }

        return {
          name: name,
          address: address,
          city: city,
          state: state,
          zipCode: getZip(),
          phone: getPhone(),
          email: getEmail(),
          hours: getHours(),
          accessType: getAccessType(),
          description: getDescription(),
          latitude: row.lat || row.latitude || null,
          longitude: row.lng || row.longitude || row.lon || null,
          services: row.services ? [row.services] : []
        };
      }).filter(pantry => pantry !== null); // Remove null entries

      // Validate and create pantries
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let index = 0; index < pantries.length; index++) {
        const pantryData = pantries[index];
        try {
          // More lenient validation - require at least name and one location field
          if (!pantryData.name || (!pantryData.address && !pantryData.city)) {
            errors.push(`Row ${index + 2}: Missing required fields (need at least name and address or city)`);
            errorCount++;
            continue;
          }

          // Fill in missing state with PA if not provided (since this is Lehigh Valley)
          if (!pantryData.state) {
            pantryData.state = 'PA';
          }

          // Set default city if missing but address exists
          if (!pantryData.city && pantryData.address) {
            pantryData.city = 'Unknown';
          }

          const validatedData = insertPantrySchema.parse(pantryData);
          await storage.createPantry(validatedData);
          successCount++;
        } catch (error) {
          errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Invalid data'}`);
          errorCount++;
        }
      }

      res.json({ 
        message: `CSV processed successfully. ${successCount} pantries imported, ${errorCount} errors.`,
        successCount,
        errorCount,
        errors: errors.slice(0, 10) // Only return first 10 errors
      });
    } catch (error) {
      console.error("Error uploading CSV:", error);
      res.status(500).json({ message: "Failed to process CSV file" });
    }
  });

  // Export routes
  app.get('/api/admin/export/csv', isAuthenticated, async (req, res) => {
    try {
      const pantries = await storage.getPantries();
      const csvContent = ExportService.generateBackupCSV(pantries);
      const filename = ExportService.getExportFilename('backup');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // SharePoint integration routes
  app.post('/api/admin/sharepoint/test-connection', isAuthenticated, async (req, res) => {
    try {
      const settings = req.body;
      const isConnected = await SharePointService.testConnection(settings);
      res.json({ connected: isConnected });
    } catch (error) {
      console.error("Error testing SharePoint connection:", error);
      res.status(500).json({ message: "Connection test failed", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/api/admin/sharepoint/sites', isAuthenticated, async (req, res) => {
    try {
      const settings = req.body;
      const sites = await SharePointService.getSites(settings);
      res.json(sites);
    } catch (error) {
      console.error("Error fetching SharePoint sites:", error);
      res.status(500).json({ message: "Failed to fetch sites", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/api/admin/sharepoint/lists', isAuthenticated, async (req, res) => {
    try {
      const settings = req.body;
      const lists = await SharePointService.getLists(settings);
      res.json(lists);
    } catch (error) {
      console.error("Error fetching SharePoint lists:", error);
      res.status(500).json({ message: "Failed to fetch lists", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/api/admin/sharepoint/columns', isAuthenticated, async (req, res) => {
    try {
      const settings = req.body;
      const columns = await SharePointService.getListColumns(settings);
      res.json(columns);
    } catch (error) {
      console.error("Error fetching SharePoint columns:", error);
      res.status(500).json({ message: "Failed to fetch columns", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/api/admin/sharepoint/sync', isAuthenticated, async (req, res) => {
    try {
      const { settingsId } = req.body;
      
      if (!settingsId) {
        return res.status(400).json({ message: "Settings ID is required" });
      }

      // Get the data sync settings
      const allSettings = await storage.getDataSyncSettings();
      const settings = allSettings.find(s => s.id === settingsId);
      
      if (!settings) {
        return res.status(404).json({ message: "Data sync settings not found" });
      }

      // Update sync status to 'syncing'
      await storage.updateDataSyncSettings(settingsId, { syncStatus: 'syncing', lastError: null });

      try {
        // Validate column mapping
        const validation = await SharePointService.validateMapping(settings);
        if (!validation.valid) {
          await storage.updateDataSyncSettings(settingsId, { 
            syncStatus: 'error', 
            lastError: `Invalid column mapping: ${validation.errors.join(', ')}` 
          });
          return res.status(400).json({ message: "Invalid column mapping", errors: validation.errors });
        }

        // Sync data from SharePoint
        const pantries = await SharePointService.syncListData(settings);
        
        let imported = 0;
        let updated = 0;
        const errors: string[] = [];

        // Process each pantry
        for (const pantryData of pantries) {
          try {
            const validatedData = insertPantrySchema.parse(pantryData);
            await storage.createPantry(validatedData);
            imported++;
          } catch (error) {
            errors.push(`Failed to import pantry ${pantryData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Update sync status
        await storage.updateDataSyncSettings(settingsId, { 
          syncStatus: 'success', 
          lastSync: new Date(),
          lastError: errors.length > 0 ? `${errors.length} errors occurred` : null
        });

        const report = ExportService.generateSyncReport(imported, updated, errors);

        res.json({ 
          message: `Sync completed. ${imported} pantries imported.`,
          imported,
          updated,
          errors: errors.slice(0, 10), // Return first 10 errors
          report
        });

      } catch (syncError) {
        // Update sync status to error
        const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown sync error';
        await storage.updateDataSyncSettings(settingsId, { 
          syncStatus: 'error', 
          lastError: errorMessage 
        });
        throw syncError;
      }

    } catch (error) {
      console.error("Error syncing SharePoint data:", error);
      res.status(500).json({ message: "Sync failed", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
