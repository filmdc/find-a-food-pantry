import { Pantry } from "@shared/schema";

export class ExportService {
  static generateCSV(pantries: Pantry[]): string {
    if (pantries.length === 0) {
      return 'name,address,city,state,zipCode,phone,email,website,hours,description,services,accessType,latitude,longitude,isActive,createdAt,updatedAt\n';
    }

    // CSV headers
    const headers = [
      'id',
      'name', 
      'address', 
      'city', 
      'state', 
      'zipCode', 
      'phone', 
      'email', 
      'website', 
      'hours', 
      'description', 
      'services',
      'accessType', 
      'latitude', 
      'longitude', 
      'isActive',
      'createdAt',
      'updatedAt'
    ];

    // Helper function to escape CSV values
    const escapeCSVValue = (value: any): string => {
      if (value === null || value === undefined) {
        return '';
      }
      
      let stringValue = String(value);
      
      // Handle arrays (like services)
      if (Array.isArray(value)) {
        stringValue = value.join('; ');
      }
      
      // Handle dates
      if (value instanceof Date) {
        stringValue = value.toISOString();
      }
      
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (stringValue.includes('"')) {
        stringValue = stringValue.replace(/"/g, '""');
      }
      
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
        stringValue = `"${stringValue}"`;
      }
      
      return stringValue;
    };

    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    for (const pantry of pantries) {
      const row = headers.map(header => {
        return escapeCSVValue(pantry[header as keyof Pantry]);
      });
      csvContent += row.join(',') + '\n';
    }

    return csvContent;
  }

  static generateBackupCSV(pantries: Pantry[]): string {
    // Generate a more comprehensive backup format that preserves all data
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const csvContent = this.generateCSV(pantries);
    
    // Add metadata header as comment
    const metadataHeader = `# Food Pantry Data Backup\n# Generated: ${new Date().toISOString()}\n# Total Records: ${pantries.length}\n# Format: Standard CSV with all fields\n\n`;
    
    return metadataHeader + csvContent;
  }

  static getExportFilename(type: 'backup' | 'export' = 'export'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const prefix = type === 'backup' ? 'pantry-backup' : 'pantry-export';
    return `${prefix}-${timestamp}.csv`;
  }

  static generateSyncReport(imported: number, updated: number, errors: string[]): string {
    const timestamp = new Date().toISOString();
    let report = `# SharePoint Sync Report\n`;
    report += `# Generated: ${timestamp}\n`;
    report += `# Imported: ${imported} records\n`;
    report += `# Updated: ${updated} records\n`;
    report += `# Errors: ${errors.length}\n\n`;
    
    if (errors.length > 0) {
      report += `## Errors:\n`;
      errors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`;
      });
      report += '\n';
    }
    
    report += `## Summary:\n`;
    report += `Total records processed: ${imported + updated}\n`;
    report += `Success rate: ${((imported + updated) / (imported + updated + errors.length) * 100).toFixed(1)}%\n`;
    
    return report;
  }
}