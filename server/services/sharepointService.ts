import { DataSyncSettings, InsertPantry } from "@shared/schema";

interface SharePointAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface SharePointSite {
  id: string;
  name: string;
  webUrl: string;
}

interface SharePointList {
  id: string;
  name: string;
  displayName: string;
  description?: string;
}

interface SharePointListItem {
  id: string;
  fields: Record<string, any>;
}

export class SharePointService {
  private static async getAccessToken(settings: DataSyncSettings): Promise<string> {
    const { tenantId, clientId, clientSecret } = settings;
    
    if (!tenantId || !clientId || !clientSecret) {
      throw new Error('Missing SharePoint authentication credentials');
    }

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Authentication failed: ${response.status} ${errorText}`);
    }

    const tokenData: SharePointAuthToken = await response.json();
    return tokenData.access_token;
  }

  static async testConnection(settings: DataSyncSettings): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken(settings);
      
      // Test by making a simple Graph API call
      const response = await fetch('https://graph.microsoft.com/v1.0/sites', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('SharePoint connection test failed:', error);
      return false;
    }
  }

  static async getSites(settings: DataSyncSettings): Promise<SharePointSite[]> {
    console.log('===== STARTING getSites FUNCTION =====');
    console.log('Settings received:', JSON.stringify(settings, null, 2));
    const accessToken = await this.getAccessToken(settings);
    console.log('Got access token, proceeding with site search...');
    
    // Try to search specifically for Second Harvest first
    const searchResponse = await fetch('https://graph.microsoft.com/v1.0/sites?search=SecondHarvest', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    let specificSites = [];
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      specificSites = searchData.value || [];
      console.log('Found sites matching "SecondHarvest":', specificSites.map((s: any) => ({
        name: s.name,
        displayName: s.displayName,
        webUrl: s.webUrl
      })));
    }

    // Try to get the specific SecondHarvestFoodBank site directly
    const directSiteResponse = await fetch('https://graph.microsoft.com/v1.0/sites/caclv.sharepoint.com:/sites/SecondHarvestFoodBank', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    let directSite = null;
    if (directSiteResponse.ok) {
      directSite = await directSiteResponse.json();
      console.log('Found SecondHarvestFoodBank site directly:', {
        name: directSite.name,
        displayName: directSite.displayName,
        id: directSite.id,
        webUrl: directSite.webUrl
      });
    } else {
      console.log('Could not access SecondHarvestFoodBank site directly:', directSiteResponse.status, directSiteResponse.statusText);
    }

    // Get all sites
    const response = await fetch('https://graph.microsoft.com/v1.0/sites?search=*', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sites: ${response.statusText}`);
    }

    const data = await response.json();
    let sites = data.value || [];
    
    // Add the direct site to the beginning of the list if we found it
    if (directSite) {
      sites = [directSite, ...sites.filter(s => s.id !== directSite.id)];
    } else {
      console.log('DirectSite was null, adding manual site');
      // Manually add SecondHarvestFoodBank site even if we can't access it via API
      const manualSite = {
        id: 'manual-secondharvestfoodbank',
        name: 'SecondHarvestFoodBank',
        displayName: 'Second Harvest Food Bank',
        webUrl: 'https://caclv.sharepoint.com/sites/SecondHarvestFoodBank',
        createdDateTime: new Date().toISOString()
      };
      sites = [manualSite, ...sites];
      console.log('Added SecondHarvestFoodBank site manually to the list');
      console.log('Manual site details:', manualSite);
    }
    
    console.log(`Total sites found: ${sites.length}`);
    console.log('Sample of site names:', sites.slice(0, 10).map((s: any) => s.name || s.displayName));
    console.log('First site in list:', sites[0] ? { name: sites[0].name, displayName: sites[0].displayName } : 'No sites');
    
    // Helper function to check if a name looks like a cryptic ID
    const looksLikeCrypticId = (name: string) => {
      return /^[a-zA-Z0-9_-]{15,}$/.test(name) ||
             /^[a-zA-Z0-9]{10,}/.test(name) ||
             /^[a-z0-9]{3,5}[A-Z0-9]{2,}/.test(name) ||
             /\.[a-zA-Z0-9]{10,}/.test(name) ||
             /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(name) ||
             /^CSP_/.test(name);
    };

    // Helper function to fetch detailed site info
    const fetchSiteDetails = async (siteId: string, siteName: string) => {
      try {
        const siteResponse = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (siteResponse.ok) {
          const details = await siteResponse.json();
          console.log(`Site ${siteName} (${siteId}) resolved to:`, {
            displayName: details.displayName,
            name: details.name,
            title: details.title,
            webUrl: details.webUrl
          });
          return details;
        } else {
          console.log(`Failed to fetch details for site ${siteName} (${siteId}):`, siteResponse.status);
        }
      } catch (error) {
        console.log(`Error fetching details for site ${siteName} (${siteId}):`, error);
      }
      return null;
    };
    
    // Process sites to get better names
    const processedSites = await Promise.all(
      sites.map(async (site: any) => {
        let displayName = site.displayName || site.name || site.title || '';
        const originalName = site.name || '';
        
        // If the name looks like a cryptic ID, try to get the real site details
        if (looksLikeCrypticId(originalName)) {
          console.log(`Attempting to resolve cryptic site name: ${originalName}`);
          const siteDetails = await fetchSiteDetails(site.id, originalName);
          if (siteDetails) {
            displayName = siteDetails.displayName || siteDetails.name || siteDetails.title || '';
            console.log(`Resolved ${originalName} to: ${displayName}`);
          } else {
            console.log(`Could not resolve ${originalName}`);
          }
        }
        
        // If we still don't have a good name, try to extract from webUrl
        if (!displayName || displayName.length < 3) {
          const urlParts = site.webUrl?.split('/');
          if (urlParts && urlParts.length > 0) {
            const lastPart = urlParts[urlParts.length - 1];
            if (lastPart && lastPart.length > 3 && !lastPart.includes('.')) {
              displayName = lastPart.replace(/-/g, ' ').replace(/_/g, ' ');
              displayName = displayName.split(' ').map((word: string) => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' ');
            }
          }
        }
        
        return {
          ...site,
          name: displayName,
          originalName: originalName
        };
      })
    );
    
    // Filter out system sites and invalid entries
    const filteredSites = processedSites
      .filter((site: any) => {
        const name = site.name?.toLowerCase() || '';
        const webUrl = site.webUrl?.toLowerCase() || '';
        
        // Filter out common system sites
        const systemSiteKeywords = [
          'search center',
          'mysite',
          'personal',
          'profiles',
          'compliancepolicycenter',
          'contenttypehub',
          'apps',
          'appcatalog',
          'portals',
          'sites/appcatalog',
          'sites/contentcenter',
          'sites/compliancepolicycenter',
          '/personal/',
          'onedrive',
          'my site',
          'user information list',
          'style library',
          'master page gallery',
          'site collection images',
          'site assets',
          'form templates',
          'site pages',
          'workflow history',
          'workflow tasks',
          'developer site',
          'project web app',
          'business intelligence',
          'powerbi',
          'reporting',
          'admin',
          'system',
          'hidden',
          'cache',
          '_catalogs',
          'search'
        ];
        
        const hasSystemKeywords = systemSiteKeywords.some(keyword => 
          name.includes(keyword) || webUrl.includes(keyword)
        );
        
        // For debugging: show all sites temporarily, just filter out obvious system keywords
        return !hasSystemKeywords && 
               name.length > 0 && 
               name.length < 200; // Increased limit and removed cryptic ID filter for debugging
      })
      .sort((a: any, b: any) => {
        const nameA = a.name?.toLowerCase() || '';
        const nameB = b.name?.toLowerCase() || '';
        return nameA.localeCompare(nameB);
      });
    
    return filteredSites;
  }

  static async getLists(settings: DataSyncSettings): Promise<SharePointList[]> {
    const { siteId } = settings;
    
    if (!siteId) {
      throw new Error('Site ID is required to fetch lists');
    }

    const accessToken = await this.getAccessToken(settings);
    
    const response = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch lists: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value || [];
  }

  static async getListColumns(settings: DataSyncSettings): Promise<any[]> {
    const { siteId, listId } = settings;
    
    if (!siteId || !listId) {
      throw new Error('Site ID and List ID are required to fetch columns');
    }

    const accessToken = await this.getAccessToken(settings);
    
    const response = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/columns`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch list columns: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value || [];
  }

  static async syncListData(settings: DataSyncSettings): Promise<InsertPantry[]> {
    const { siteId, listId, columnMapping } = settings;
    
    if (!siteId || !listId) {
      throw new Error('Site ID and List ID are required for data sync');
    }

    const accessToken = await this.getAccessToken(settings);
    
    // Fetch all list items with their field values
    const response = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?expand=fields`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch list data: ${response.statusText}`);
    }

    const data = await response.json();
    const items: SharePointListItem[] = data.value || [];

    // Transform SharePoint list items to pantry data
    const pantries: InsertPantry[] = items.map(item => {
      const fields = item.fields;
      const mapping = columnMapping as Record<string, string> || {};

      // Helper function to get mapped field value
      const getFieldValue = (pantryField: string): any => {
        const sharepointField = mapping[pantryField];
        if (!sharepointField) return null;
        
        const value = fields[sharepointField];
        if (value === null || value === undefined || value === '') return null;
        
        // Handle different field types
        if (typeof value === 'string') {
          return value.trim();
        }
        
        return value;
      };

      // Helper to safely convert to string
      const toStringOrEmpty = (value: any): string => {
        if (value === null || value === undefined || value === '') return '';
        return String(value);
      };

      const toStringOrNull = (value: any): string | null => {
        if (value === null || value === undefined || value === '') return null;
        // Handle objects that might contain URL information
        if (typeof value === 'object' && value !== null) {
          // Common SharePoint URL field patterns
          if (value.Url) return String(value.Url);
          if (value.url) return String(value.url);
          if (value.URL) return String(value.URL);
          if (value.Description) return String(value.Description);
          if (value.description) return String(value.description);
          // If it's an object but doesn't have expected properties, convert to JSON string
          return JSON.stringify(value);
        }
        return String(value);
      };

      // Map SharePoint fields to pantry schema
      const pantry: InsertPantry = {
        name: getFieldValue('name') || 'Unknown Pantry',
        address: getFieldValue('address') || '',
        city: getFieldValue('city') || '',
        state: getFieldValue('state') || '',
        zipCode: toStringOrEmpty(getFieldValue('zipCode')),
        phone: toStringOrNull(getFieldValue('phone')),
        email: getFieldValue('email'),
        website: toStringOrNull(getFieldValue('website')),
        hours: getFieldValue('hours'),
        description: getFieldValue('description'),
        services: getFieldValue('services') ? [getFieldValue('services')] : [],
        accessType: getFieldValue('accessType'),
        latitude: toStringOrNull(getFieldValue('latitude')),
        longitude: toStringOrNull(getFieldValue('longitude')),
        isActive: true
      };

      // Debug logging for the first few pantries
      if (items.indexOf(item) < 3) {
        console.log(`Pantry ${pantry.name} - zipCode type:`, typeof pantry.zipCode, 'value:', pantry.zipCode);
      }

      return pantry;
    });

    return pantries.filter(pantry => pantry.name && pantry.name !== 'Unknown Pantry');
  }

  static async validateMapping(settings: DataSyncSettings): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      const columns = await this.getListColumns(settings);
      const mapping = settings.columnMapping as Record<string, string> || {};
      
      const requiredFields = ['name', 'address', 'city', 'state', 'zipCode'];
      const availableColumns = columns.map(col => col.name);
      
      for (const field of requiredFields) {
        const mappedColumn = mapping[field];
        if (!mappedColumn) {
          errors.push(`Required field '${field}' is not mapped`);
        } else if (!availableColumns.includes(mappedColumn)) {
          errors.push(`Mapped column '${mappedColumn}' for field '${field}' does not exist in the SharePoint list`);
        }
      }
    } catch (error) {
      errors.push(`Failed to validate mapping: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return { valid: errors.length === 0, errors };
  }
}