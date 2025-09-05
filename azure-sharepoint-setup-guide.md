# SharePoint Integration Setup Guide for M365 Administrators

This guide provides step-by-step instructions for Microsoft 365 administrators to configure Azure Active Directory and SharePoint permissions for the Food Pantry Finder application.

## Overview

The Food Pantry Finder application needs to connect to your SharePoint lists to automatically synchronize pantry data. This requires creating an Azure AD application registration with appropriate permissions to access SharePoint sites and lists.

## Prerequisites

- Global Administrator or Application Administrator role in Azure AD
- SharePoint Administrator privileges
- Access to the Microsoft 365 Admin Center and Azure Portal

## Step 1: Create Azure AD Application Registration

1. **Sign in to Azure Portal**
   - Go to [portal.azure.com](https://portal.azure.com)
   - Sign in with your M365 administrator account

2. **Navigate to Azure Active Directory**
   - In the left navigation, click "Azure Active Directory"
   - Select "App registrations" from the left menu

3. **Create New Application Registration**
   - Click "New registration"
   - Fill out the application details:
     - **Name**: `Food Pantry Finder - SharePoint Integration`
     - **Supported account types**: Select "Accounts in this organizational directory only"
     - **Redirect URI**: Leave blank for now
   - Click "Register"

4. **Note Important Values**
   After registration, copy these values (you'll need them for the application setup):
   - **Application (client) ID**: Found on the Overview page
   - **Directory (tenant) ID**: Found on the Overview page

## Step 2: Configure API Permissions

1. **Add Microsoft Graph Permissions**
   - In your app registration, click "API permissions" in the left menu
   - Click "Add a permission"
   - Select "Microsoft Graph"
   - Choose "Application permissions"
   - Add the following permissions:
     - `Sites.Read.All` - Read items in all site collections
     - `Sites.ReadWrite.All` - Read and write items in all site collections
     - `Directory.Read.All` - Read directory data

2. **Grant Admin Consent**
   - After adding permissions, click "Grant admin consent for [Your Organization]"
   - Click "Yes" to confirm
   - Verify all permissions show "Granted for [Your Organization]"

## Step 3: Create Client Secret

1. **Generate Client Secret**
   - Click "Certificates & secrets" in the left menu
   - Under "Client secrets", click "New client secret"
   - Add a description: `Food Pantry Finder Integration`
   - Choose expiration (recommend 24 months)
   - Click "Add"

2. **Copy Secret Value**
   - **IMPORTANT**: Copy the secret value immediately - it won't be shown again
   - Store this securely - you'll need it for application configuration

## Step 4: SharePoint Site Configuration

1. **Prepare Your SharePoint List**
   - Ensure your pantry data is in a SharePoint list
   - The list should contain columns for:
     - Name (required)
     - Address (required)  
     - City (required)
     - State (required)
     - ZIP Code (required)
     - Phone (optional)
     - Email (optional)
     - Website (optional)
     - Hours (optional)
     - Description (optional)
     - Latitude (optional)
     - Longitude (optional)

2. **Note SharePoint Information**
   - **Site URL**: The full URL of your SharePoint site
   - **List Name**: The name of your pantry data list

## Step 5: Application Configuration Values

Provide the following information to your Food Pantry Finder application administrator:

```
Tenant ID: [Directory ID from Step 1]
Client ID: [Application ID from Step 1]
Client Secret: [Secret value from Step 3]
SharePoint Site URL: [Your SharePoint site URL]
List Name: [Your pantry data list name]
```

## Security Considerations

1. **Principle of Least Privilege**
   - The application requests only the minimum permissions needed
   - Regularly review and audit application access

2. **Secret Management**
   - Client secrets should be stored securely in the application
   - Rotate secrets regularly (before expiration)
   - Monitor secret usage in Azure AD logs

3. **Access Monitoring**
   - Review Azure AD sign-in logs regularly
   - Monitor for any unusual access patterns
   - Set up alerts for application access if needed

## Troubleshooting

### Common Issues

1. **"Insufficient privileges" Error**
   - Verify all required permissions are granted
   - Ensure admin consent has been provided
   - Check that the user account has proper SharePoint permissions

2. **"Invalid client" Error**
   - Verify the Client ID is correct
   - Ensure the application is not disabled
   - Check that the tenant ID matches your organization

3. **"Access denied" to SharePoint**
   - Verify Sites.Read.All permission is granted
   - Check SharePoint site permissions
   - Ensure the application can access the specific site and list

### Testing Connection

The application includes a "Test Connection" feature that will verify:
- Azure AD authentication is working
- Required permissions are available
- SharePoint site and list are accessible

## Support

For technical support with this integration:
1. Check the application's connection testing feature
2. Review Azure AD audit logs for authentication issues
3. Verify SharePoint permissions and list structure
4. Contact your application support team with specific error messages

## Security Review Checklist

Before deploying to production:
- [ ] All required permissions are granted with minimal scope
- [ ] Admin consent has been provided
- [ ] Client secret is stored securely
- [ ] Access monitoring is configured
- [ ] SharePoint data contains only necessary information
- [ ] Data classification and sensitivity labels are applied appropriately
- [ ] Backup and disaster recovery procedures are in place

---

*This guide was created for the Food Pantry Finder SharePoint integration. Last updated: 2025*