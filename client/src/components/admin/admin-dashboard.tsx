import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Save, Upload, Download, RefreshCw, Plus, FileText, CheckCircle, AlertCircle, Edit, Trash2, Megaphone } from "lucide-react";
import { AdminSettings, InsertAdminSettings, DataSyncSettings, InsertDataSyncSettings, User, Announcement, InsertAnnouncementType } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("branding");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadResults, setUploadResults] = useState<any>(null);
  
  // SharePoint configuration state
  const [showSharePointDialog, setShowSharePointDialog] = useState(false);
  const [sharePointForm, setSharePointForm] = useState({
    tenantId: '',
    clientId: '',
    clientSecret: '',
    siteId: '',
    listId: '',
    listName: ''
  });
  const [sharepointSites, setSharepointSites] = useState<any[]>([]);
  const [sharepointLists, setSharepointLists] = useState<any[]>([]);
  const [sharepointColumns, setSharepointColumns] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncResults, setSyncResults] = useState<{imported: number, errors: string[]} | null>(null);

  // Fetch admin settings
  const { data: settings, isLoading } = useQuery<AdminSettings>({
    queryKey: ['/api/admin/settings'],
  });

  // Fetch data sync settings
  const { data: dataSyncSettings, isLoading: isLoadingDataSync } = useQuery<DataSyncSettings[]>({
    queryKey: ['/api/admin/data-sync'],
  });

  // Fetch users (super admin only)
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    retry: false,
  });

  // Fetch announcements
  const { data: announcements = [], isLoading: isLoadingAnnouncements } = useQuery<Announcement[]>({
    queryKey: ['/api/admin/announcements'],
  });

  // Announcement form state
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    type: 'info' as const,
    priority: 'medium' as const,
    startDate: '',
    endDate: '',
    isActive: true,
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: InsertAdminSettings) => {
      return await apiRequest('PUT', '/api/admin/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({
        title: "Settings Updated",
        description: "Admin settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = (formData: FormData) => {
    const data: InsertAdminSettings = {
      organizationName: formData.get('organizationName') as string,
      primaryColor: formData.get('primaryColor') as string,
      secondaryColor: formData.get('secondaryColor') as string,
      logoUrl: formData.get('logoUrl') as string || undefined,
      faviconUrl: formData.get('faviconUrl') as string || undefined,
      defaultLatitude: formData.get('defaultLatitude') as string,
      defaultLongitude: formData.get('defaultLongitude') as string,
      defaultZoom: formData.get('defaultZoom') as string,
      mapStyle: formData.get('mapStyle') as string,
    };
    
    updateSettingsMutation.mutate(data);
  };

  // CSV Upload mutation
  const csvUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csvFile', file);
      
      const response = await fetch('/api/admin/upload-csv', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setUploadStatus('success');
      setUploadResults(data);
      queryClient.invalidateQueries({ queryKey: ['/api/pantries'] });
      toast({
        title: "CSV Upload Successful",
        description: `${data.successCount} pantries imported successfully.`,
      });
    },
    onError: (error: Error) => {
      setUploadStatus('error');
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a CSV file.",
        variant: "destructive",
      });
      return;
    }
    
    setUploadStatus('uploading');
    setUploadResults(null);
    csvUploadMutation.mutate(file);
  };

  // User management mutations
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
      return await apiRequest('PUT', `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User Role Updated",
        description: "The user's role has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update user role. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string, status: string }) => {
      return await apiRequest('PUT', `/api/admin/users/${userId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User Status Updated",
        description: "The user's status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update user status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Export functionality
  const handleExportData = async () => {
    try {
      const response = await fetch('/api/admin/export/csv', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `pantry-backup-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "Your data has been exported successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // SharePoint functions
  const testSharePointConnection = async () => {
    setConnectionStatus('testing');
    try {
      const response = await apiRequest('POST', '/api/admin/sharepoint/test-connection', sharePointForm);
      const data = await response.json();
      if (data.connected) {
        setConnectionStatus('connected');
        toast({
          title: "Connection Successful",
          description: "SharePoint connection established successfully.",
        });
      } else {
        setConnectionStatus('error');
        toast({
          title: "Connection Failed",
          description: "Failed to connect to SharePoint. Please check your credentials.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "Connection Error",
        description: "Failed to test SharePoint connection.",
        variant: "destructive",
      });
    }
  };

  const fetchSharePointSites = async () => {
    try {
      // Clear all previously loaded data
      setSharepointSites([]);
      setSharepointLists([]);
      setSharepointColumns([]);
      setColumnMapping({});
      setSharePointForm(prev => ({
        ...prev,
        siteId: '',
        listId: '',
        listName: ''
      }));

      const response = await apiRequest('POST', '/api/admin/sharepoint/sites', sharePointForm);
      const sites = await response.json();
      setSharepointSites(sites);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch SharePoint sites.",
        variant: "destructive",
      });
    }
  };

  const fetchSharePointLists = async (siteId: string) => {
    try {
      const response = await apiRequest('POST', '/api/admin/sharepoint/lists', {
        ...sharePointForm,
        siteId
      });
      const lists = await response.json();
      setSharepointLists(lists);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch SharePoint lists.",
        variant: "destructive",
      });
    }
  };

  const fetchSharePointColumns = async (siteId: string, listId: string) => {
    try {
      const response = await apiRequest('POST', '/api/admin/sharepoint/columns', {
        ...sharePointForm,
        siteId,
        listId
      });
      const columns = await response.json();
      setSharepointColumns(columns);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch SharePoint columns.",
        variant: "destructive",
      });
    }
  };

  const saveSharePointSettings = async () => {
    try {
      // Filter out "none" values from column mapping
      const filteredColumnMapping = Object.fromEntries(
        Object.entries(columnMapping).filter(([_, value]) => value && value !== 'none')
      );
      
      const settingsData: InsertDataSyncSettings = {
        sourceType: 'sharepoint',
        tenantId: sharePointForm.tenantId,
        clientId: sharePointForm.clientId,
        clientSecret: sharePointForm.clientSecret,
        siteId: sharePointForm.siteId,
        listId: sharePointForm.listId,
        listName: sharePointForm.listName,
        columnMapping: filteredColumnMapping
      };

      await apiRequest('POST', '/api/admin/data-sync', settingsData);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/data-sync'] });
      setShowSharePointDialog(false);
      
      toast({
        title: "SharePoint Configuration Saved",
        description: "SharePoint integration has been configured successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save SharePoint configuration.",
        variant: "destructive",
      });
    }
  };

  const handleSharePointSync = async () => {
    const syncSettings = dataSyncSettings?.find(s => s.sourceType === 'sharepoint');
    if (!syncSettings) {
      toast({
        title: "Error",
        description: "No SharePoint configuration found.",
        variant: "destructive",
      });
      return;
    }

    setSyncStatus('syncing');
    setSyncResults(null);
    
    try {
      const response = await apiRequest('POST', '/api/admin/sharepoint/sync', {
        settingsId: syncSettings.id
      });
      
      const results = await response.json();
      setSyncStatus('success');
      setSyncResults(results);
      
      // Refresh pantries data
      queryClient.invalidateQueries({ queryKey: ['/api/pantries'] });
      
      toast({
        title: "Sync Completed",
        description: `Successfully imported ${results.imported} pantries.`,
      });
      
      if (results.errors && results.errors.length > 0) {
        toast({
          title: "Sync Warnings",
          description: `${results.errors.length} items had issues. Check the sync results for details.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      setSyncStatus('error');
      toast({
        title: "Sync Failed",
        description: "Failed to sync data from SharePoint. Please check your configuration.",
        variant: "destructive",
      });
    }
  };

  // Announcement mutations
  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: InsertAnnouncementType) => {
      return await apiRequest('POST', '/api/admin/announcements', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      setShowAnnouncementDialog(false);
      setAnnouncementForm({
        title: '',
        message: '',
        type: 'info' as const,
        priority: 'medium' as const,
        startDate: '',
        endDate: '',
        isActive: true,
      });
      toast({
        title: "Announcement Created",
        description: "Announcement has been created successfully.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create announcement. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertAnnouncementType> }) => {
      return await apiRequest('PUT', `/api/admin/announcements/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      setShowAnnouncementDialog(false);
      setEditingAnnouncement(null);
      setAnnouncementForm({
        title: '',
        message: '',
        type: 'info' as const,
        priority: 'medium' as const,
        startDate: '',
        endDate: '',
        isActive: true,
      });
      toast({
        title: "Announcement Updated",
        description: "Announcement has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update announcement. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/announcements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      toast({
        title: "Announcement Deleted",
        description: "Announcement has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete announcement. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Announcement form handlers
  const handleOpenAnnouncementDialog = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setAnnouncementForm({
        title: announcement.title,
        message: announcement.message,
        type: (announcement.type || 'info') as 'info' | 'warning' | 'error' | 'success',
        priority: (announcement.priority || 'medium') as 'low' | 'medium' | 'high',
        startDate: announcement.startDate ? new Date(announcement.startDate).toISOString().slice(0, 16) : '',
        endDate: announcement.endDate ? new Date(announcement.endDate).toISOString().slice(0, 16) : '',
        isActive: announcement.isActive ?? true,
      });
    } else {
      setEditingAnnouncement(null);
      setAnnouncementForm({
        title: '',
        message: '',
        type: 'info' as const,
        priority: 'medium' as const,
        startDate: '',
        endDate: '',
        isActive: true,
      });
    }
    setShowAnnouncementDialog(true);
  };

  const handleSaveAnnouncement = () => {
    const data: InsertAnnouncementType = {
      ...announcementForm,
      startDate: announcementForm.startDate ? new Date(announcementForm.startDate) : new Date(),
      endDate: announcementForm.endDate ? new Date(announcementForm.endDate) : null,
    };

    if (editingAnnouncement) {
      updateAnnouncementMutation.mutate({ id: editingAnnouncement.id, data });
    } else {
      createAnnouncementMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-admin-title">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage your food pantry directory settings and data sources.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="branding" data-testid="tab-branding">Branding</TabsTrigger>
          <TabsTrigger value="geographic" data-testid="tab-geographic">Geographic</TabsTrigger>
          <TabsTrigger value="data-sources" data-testid="tab-data-sources">Data Sources</TabsTrigger>
          <TabsTrigger value="pantries" data-testid="tab-pantries">Pantries</TabsTrigger>
          <TabsTrigger value="announcements" data-testid="tab-announcements">Announcements</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>White Labeling & Branding</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleSaveSettings(formData);
                }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="organizationName">Organization Name</Label>
                  <Input
                    id="organizationName"
                    name="organizationName"
                    defaultValue={settings?.organizationName || "Second Harvest Food Bank of the Lehigh Valley"}
                    data-testid="input-org-name"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-8 h-8 rounded border border-border"
                        style={{ backgroundColor: settings?.primaryColor || '#0F766E' }}
                      ></div>
                      <Input
                        id="primaryColor"
                        name="primaryColor"
                        type="color"
                        defaultValue={settings?.primaryColor || '#0F766E'}
                        className="w-20"
                        data-testid="input-primary-color"
                      />
                      <Input
                        name="primaryColor"
                        defaultValue={settings?.primaryColor || '#0F766E'}
                        className="flex-1"
                        data-testid="input-primary-color-hex"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-8 h-8 rounded border border-border"
                        style={{ backgroundColor: settings?.secondaryColor || '#EA580C' }}
                      ></div>
                      <Input
                        id="secondaryColor"
                        name="secondaryColor"
                        type="color"
                        defaultValue={settings?.secondaryColor || '#EA580C'}
                        className="w-20"
                        data-testid="input-secondary-color"
                      />
                      <Input
                        name="secondaryColor"
                        defaultValue={settings?.secondaryColor || '#EA580C'}
                        className="flex-1"
                        data-testid="input-secondary-color-hex"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    name="logoUrl"
                    type="url"
                    placeholder="https://example.com/logo.png"
                    defaultValue={settings?.logoUrl || ''}
                    data-testid="input-logo-url"
                  />
                </div>
                
                <div>
                  <Label htmlFor="faviconUrl">Favicon URL</Label>
                  <Input
                    id="faviconUrl"
                    name="faviconUrl"
                    type="url"
                    placeholder="https://example.com/favicon.ico"
                    defaultValue={settings?.faviconUrl || ''}
                    data-testid="input-favicon-url"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload a .ico, .png, or .svg file to customize your app's favicon
                  </p>
                </div>

                {/* Hidden fields for geographic settings */}
                <input type="hidden" name="defaultLatitude" value={settings?.defaultLatitude || '40.6259'} />
                <input type="hidden" name="defaultLongitude" value={settings?.defaultLongitude || '-75.3697'} />
                <input type="hidden" name="defaultZoom" value={settings?.defaultZoom || '12'} />
                <input type="hidden" name="mapStyle" value={settings?.mapStyle || 'standard'} />
                
                <Button 
                  type="submit" 
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-save-branding"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geographic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleSaveSettings(formData);
                }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="defaultCenter">Default Center Location</Label>
                  <Input
                    id="defaultCenter"
                    placeholder="Enter address or coordinates"
                    defaultValue="Bethlehem, PA"
                    data-testid="input-default-center"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="defaultLatitude">Latitude</Label>
                    <Input
                      id="defaultLatitude"
                      name="defaultLatitude"
                      type="number"
                      step="any"
                      defaultValue={settings?.defaultLatitude || '40.6259'}
                      data-testid="input-latitude"
                    />
                  </div>
                  <div>
                    <Label htmlFor="defaultLongitude">Longitude</Label>
                    <Input
                      id="defaultLongitude"
                      name="defaultLongitude"
                      type="number"
                      step="any"
                      defaultValue={settings?.defaultLongitude || '-75.3697'}
                      data-testid="input-longitude"
                    />
                  </div>
                  <div>
                    <Label htmlFor="defaultZoom">Default Zoom Level</Label>
                    <Select name="defaultZoom" defaultValue={settings?.defaultZoom || '12'}>
                      <SelectTrigger id="defaultZoom" data-testid="select-zoom">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="8">Regional Level (8)</SelectItem>
                        <SelectItem value="10">County Level (10)</SelectItem>
                        <SelectItem value="12">City Level (12)</SelectItem>
                        <SelectItem value="14">Neighborhood Level (14)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="mapStyle">Map Style</Label>
                  <Select name="mapStyle" defaultValue={settings?.mapStyle || 'standard'}>
                    <SelectTrigger id="mapStyle" data-testid="select-map-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="satellite">Satellite</SelectItem>
                      <SelectItem value="terrain">Terrain</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Hidden fields for branding settings */}
                <input type="hidden" name="organizationName" value={settings?.organizationName || 'Second Harvest Food Bank of the Lehigh Valley'} />
                <input type="hidden" name="primaryColor" value={settings?.primaryColor || '#0F766E'} />
                <input type="hidden" name="secondaryColor" value={settings?.secondaryColor || '#EA580C'} />
                <input type="hidden" name="logoUrl" value={settings?.logoUrl || ''} />
                
                <Button 
                  type="submit" 
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-save-geographic"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-sources" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="h-5 w-5 mr-2" />
                  SharePoint Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect to SharePoint lists for automatic data synchronization.
                </p>
                {dataSyncSettings?.find(s => s.sourceType === 'sharepoint') ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-sm font-medium text-green-800">SharePoint Connected</span>
                      </div>
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        {dataSyncSettings.find(s => s.sourceType === 'sharepoint')?.syncStatus || 'connected'}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1" 
                        variant="outline" 
                        onClick={() => setShowSharePointDialog(true)}
                        data-testid="button-configure-sharepoint"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                      <Button 
                        className="flex-1" 
                        variant="outline"
                        onClick={handleSharePointSync}
                        disabled={syncStatus === 'syncing'}
                        data-testid="button-sync-sharepoint"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                        {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
                      </Button>
                    </div>
                    
                    {/* Sync Results Display */}
                    {syncResults && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium text-blue-800 mb-2">Last Sync Results</h4>
                        <div className="text-sm text-blue-700">
                          <p>✅ Imported: {syncResults.imported} pantries</p>
                          {syncResults.errors && syncResults.errors.length > 0 && (
                            <div className="mt-2">
                              <p className="text-red-700">⚠️ Errors ({syncResults.errors.length}):</p>
                              <ul className="mt-1 ml-4 list-disc">
                                {syncResults.errors.slice(0, 3).map((error, index) => (
                                  <li key={index} className="text-red-600 text-xs">{error}</li>
                                ))}
                                {syncResults.errors.length > 3 && (
                                  <li className="text-red-600 text-xs">...and {syncResults.errors.length - 3} more</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Dialog open={showSharePointDialog} onOpenChange={setShowSharePointDialog}>
                    <DialogTrigger asChild>
                      <Button className="w-full" variant="outline" data-testid="button-connect-sharepoint">
                        <i className="fab fa-microsoft mr-2"></i>
                        Connect SharePoint
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Configure SharePoint Integration</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="tenantId">Tenant ID</Label>
                            <Input
                              id="tenantId"
                              value={sharePointForm.tenantId}
                              onChange={(e) => setSharePointForm({...sharePointForm, tenantId: e.target.value})}
                              placeholder="your-tenant-id"
                            />
                          </div>
                          <div>
                            <Label htmlFor="clientId">Client ID</Label>
                            <Input
                              id="clientId"
                              value={sharePointForm.clientId}
                              onChange={(e) => setSharePointForm({...sharePointForm, clientId: e.target.value})}
                              placeholder="your-client-id"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="clientSecret">Client Secret</Label>
                          <Input
                            id="clientSecret"
                            type="password"
                            value={sharePointForm.clientSecret}
                            onChange={(e) => setSharePointForm({...sharePointForm, clientSecret: e.target.value})}
                            placeholder="your-client-secret"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={testSharePointConnection}
                            disabled={connectionStatus === 'testing' || !sharePointForm.tenantId || !sharePointForm.clientId || !sharePointForm.clientSecret}
                            variant="outline"
                          >
                            {connectionStatus === 'testing' ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Test Connection
                          </Button>
                          {connectionStatus === 'connected' && (
                            <Button onClick={fetchSharePointSites} variant="outline">
                              Load Sites
                            </Button>
                          )}
                        </div>
                        
                        {sharepointSites.length > 0 && (
                          <div>
                            <Label htmlFor="siteSelect">Select SharePoint Site</Label>
                            <Select 
                              value={sharePointForm.siteId} 
                              onValueChange={(value) => {
                                setSharePointForm({...sharePointForm, siteId: value});
                                fetchSharePointLists(value);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a site" />
                              </SelectTrigger>
                              <SelectContent>
                                {sharepointSites.map((site) => (
                                  <SelectItem key={site.id} value={site.id}>
                                    {site.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        {sharepointLists.length > 0 && (
                          <div>
                            <Label htmlFor="listSelect">Select SharePoint List</Label>
                            <Select 
                              value={sharePointForm.listId} 
                              onValueChange={(value) => {
                                const selectedList = sharepointLists.find(l => l.id === value);
                                setSharePointForm({
                                  ...sharePointForm, 
                                  listId: value,
                                  listName: selectedList?.displayName || ''
                                });
                                fetchSharePointColumns(sharePointForm.siteId, value);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a list" />
                              </SelectTrigger>
                              <SelectContent>
                                {sharepointLists.map((list) => (
                                  <SelectItem key={list.id} value={list.id}>
                                    {list.displayName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        {sharepointColumns.length > 0 && (
                          <div>
                            <Label>Column Mapping</Label>
                            <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-3">
                              {['name', 'address', 'city', 'state', 'zipCode', 'phone', 'email', 'website', 'hours', 'description', 'latitude', 'longitude'].map((field) => (
                                <div key={field} className="flex items-center justify-between">
                                  <span className="text-sm font-medium">{field} {['name', 'address', 'city', 'state', 'zipCode'].includes(field) && <span className="text-red-500">*</span>}</span>
                                  <Select
                                    value={columnMapping[field] || ''}
                                    onValueChange={(value) => setColumnMapping({...columnMapping, [field]: value})}
                                  >
                                    <SelectTrigger className="w-40">
                                      <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      {sharepointColumns.map((col) => (
                                        <SelectItem key={col.name} value={col.name}>
                                          {col.displayName || col.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowSharePointDialog(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={saveSharePointSettings}
                            disabled={!sharePointForm.listId || !columnMapping.name}
                          >
                            Save Configuration
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="h-5 w-5 mr-2" />
                  Google Sheets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Sync data from Google Sheets with automatic updates.
                </p>
                <Button className="w-full" variant="outline" data-testid="button-connect-sheets">
                  <i className="fab fa-google mr-2"></i>
                  Connect Sheets
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="h-5 w-5 mr-2" />
                  CSV Upload
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload pantry data from CSV files. Supported columns: name, address, city, state, zip, phone, email, hours, access_type, description, latitude, longitude.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-csv-file"
                />
                <Button 
                  className="w-full" 
                  variant="outline" 
                  onClick={triggerFileUpload}
                  disabled={uploadStatus === 'uploading'}
                  data-testid="button-upload-csv"
                >
                  {uploadStatus === 'uploading' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload CSV'}
                </Button>
                
                {uploadStatus === 'success' && uploadResults && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-green-800">Upload Successful</span>
                    </div>
                    <p className="text-sm text-green-700">
                      {uploadResults.successCount} pantries imported
                      {uploadResults.errorCount > 0 && `, ${uploadResults.errorCount} errors`}
                    </p>
                    {uploadResults.errors && uploadResults.errors.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-sm text-green-700 cursor-pointer">View Errors</summary>
                        <ul className="mt-1 text-xs text-green-600">
                          {uploadResults.errors.map((error: string, index: number) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
                
                {uploadStatus === 'error' && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                      <span className="text-sm font-medium text-red-800">Upload Failed</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="h-5 w-5 mr-2" />
                Data Export & Backup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Export your current pantry data as a CSV backup before syncing with SharePoint.
              </p>
              <Button 
                className="w-full" 
                variant="outline" 
                onClick={handleExportData}
                data-testid="button-export-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Current Data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sync Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Last Synchronization</p>
                  <p className="text-sm text-muted-foreground">No recent sync available</p>
                </div>
                <Button variant="outline" size="sm" data-testid="button-sync-now">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pantries" className="space-y-6">
          <PantryManagement />
        </TabsContent>

        <TabsContent value="announcements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Megaphone className="h-5 w-5" />
                  <span>Announcement Management</span>
                </div>
                <Button
                  onClick={() => handleOpenAnnouncementDialog()}
                  data-testid="button-create-announcement"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Announcement
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAnnouncements ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : announcements.length === 0 ? (
                <div className="text-center py-8">
                  <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No announcements created yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create your first announcement to display important messages to all users.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="border rounded-lg p-4 space-y-3"
                      data-testid={`announcement-${announcement.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-lg">{announcement.title}</h3>
                            <Badge
                              variant={announcement.isActive ? 'default' : 'secondary'}
                            >
                              {announcement.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge
                              variant={
                                announcement.priority === 'high'
                                  ? 'destructive'
                                  : announcement.priority === 'medium'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {announcement.priority}
                            </Badge>
                            <Badge
                              variant={
                                announcement.type === 'error'
                                  ? 'destructive'
                                  : announcement.type === 'warning'
                                  ? 'outline'
                                  : announcement.type === 'success'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {announcement.type}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-3">{announcement.message}</p>
                          <div className="text-sm text-muted-foreground">
                            <p>
                              Start: {new Date(announcement.startDate).toLocaleString()}
                            </p>
                            {announcement.endDate && (
                              <p>
                                End: {new Date(announcement.endDate).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenAnnouncementDialog(announcement)}
                            data-testid={`button-edit-announcement-${announcement.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAnnouncementMutation.mutate(announcement.id)}
                            data-testid={`button-delete-announcement-${announcement.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Announcement Dialog */}
          <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="announcement-title">Title</Label>
                  <Input
                    id="announcement-title"
                    value={announcementForm.title}
                    onChange={(e) =>
                      setAnnouncementForm({ ...announcementForm, title: e.target.value })
                    }
                    placeholder="Enter announcement title"
                    data-testid="input-announcement-title"
                  />
                </div>
                <div>
                  <Label htmlFor="announcement-message">Message</Label>
                  <Textarea
                    id="announcement-message"
                    value={announcementForm.message}
                    onChange={(e) =>
                      setAnnouncementForm({ ...announcementForm, message: e.target.value })
                    }
                    placeholder="Enter announcement message"
                    rows={4}
                    data-testid="textarea-announcement-message"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="announcement-type">Type</Label>
                    <Select
                      value={announcementForm.type}
                      onValueChange={(value: 'info' | 'warning' | 'error' | 'success') =>
                        setAnnouncementForm({ ...announcementForm, type: value })
                      }
                    >
                      <SelectTrigger data-testid="select-announcement-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="announcement-priority">Priority</Label>
                    <Select
                      value={announcementForm.priority}
                      onValueChange={(value: 'low' | 'medium' | 'high') =>
                        setAnnouncementForm({ ...announcementForm, priority: value })
                      }
                    >
                      <SelectTrigger data-testid="select-announcement-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="announcement-active"
                      checked={announcementForm.isActive}
                      onChange={(e) =>
                        setAnnouncementForm({ ...announcementForm, isActive: e.target.checked })
                      }
                      data-testid="checkbox-announcement-active"
                    />
                    <Label htmlFor="announcement-active">Active</Label>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="announcement-start">Start Date & Time</Label>
                    <Input
                      id="announcement-start"
                      type="datetime-local"
                      value={announcementForm.startDate}
                      onChange={(e) =>
                        setAnnouncementForm({ ...announcementForm, startDate: e.target.value })
                      }
                      data-testid="input-announcement-start"
                    />
                  </div>
                  <div>
                    <Label htmlFor="announcement-end">End Date & Time (Optional)</Label>
                    <Input
                      id="announcement-end"
                      type="datetime-local"
                      value={announcementForm.endDate}
                      onChange={(e) =>
                        setAnnouncementForm({ ...announcementForm, endDate: e.target.value })
                      }
                      data-testid="input-announcement-end"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowAnnouncementDialog(false)}
                    data-testid="button-cancel-announcement"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveAnnouncement}
                    disabled={createAnnouncementMutation.isPending || updateAnnouncementMutation.isPending}
                    data-testid="button-save-announcement"
                  >
                    {createAnnouncementMutation.isPending || updateAnnouncementMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {editingAnnouncement ? 'Update' : 'Create'} Announcement
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No users found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">
                              {user.firstName || user.lastName 
                                ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                                : user.email || 'Unnamed User'
                              }
                            </h3>
                            <Badge variant={user.status === 'approved' ? 'default' : user.status === 'pending' ? 'secondary' : 'destructive'}>
                              {user.status}
                            </Badge>
                            <Badge variant={user.role === 'super_admin' ? 'default' : user.role === 'admin' ? 'secondary' : 'outline'}>
                              {user.role}
                            </Badge>
                          </div>
                          {user.email && (
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          )}
                          {user.createdAt && (
                            <p className="text-xs text-muted-foreground">
                              Joined: {new Date(user.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Select
                            onValueChange={(status) => updateUserStatusMutation.mutate({ userId: user.id, status })}
                            defaultValue={user.status || 'pending'}
                            data-testid={`select-status-${user.id}`}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            onValueChange={(role) => updateUserRoleMutation.mutate({ userId: user.id, role })}
                            defaultValue={user.role || 'user'}
                            data-testid={`select-role-${user.id}`}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Pantry Management Component
function PantryManagement() {
  const { toast } = useToast();
  const [editingPantry, setEditingPantry] = useState<string | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  // Fetch pantries
  const { data: pantries, isLoading } = useQuery<any[]>({
    queryKey: ['/api/pantries'],
    retry: false,
  });

  // Delete pantry mutation
  const deletePantryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/pantries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pantries'] });
      toast({
        title: "Pantry Deleted",
        description: "The pantry has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete all pantries mutation
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/pantries');
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/pantries'] });
      setShowDeleteAll(false);
      toast({
        title: "All Pantries Deleted",
        description: `Successfully removed ${data.count} pantries.`,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Bulk Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Pantries...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pantry Management</CardTitle>
          <div className="space-x-2">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteAll(true)}
              disabled={!pantries || !Array.isArray(pantries) || pantries.length === 0}
              data-testid="button-delete-all-pantries"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All ({Array.isArray(pantries) ? pantries.length : 0})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!pantries || !Array.isArray(pantries) || pantries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No pantries found. Upload a CSV file to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Array.isArray(pantries) && pantries.map((pantry: any) => (
                <div key={pantry.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`pantry-item-${pantry.id}`}>
                  <div className="flex-1">
                    <h3 className="font-semibold" data-testid={`text-pantry-name-${pantry.id}`}>{pantry.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {pantry.address}, {pantry.city}, {pantry.state} {pantry.zipCode}
                    </p>
                    {pantry.phone && (
                      <p className="text-sm text-muted-foreground">{pantry.phone}</p>
                    )}
                    {pantry.hours && (
                      <p className="text-sm text-muted-foreground">Hours: {pantry.hours}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingPantry(pantry.id)}
                      data-testid={`button-edit-${pantry.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deletePantryMutation.mutate(pantry.id)}
                      disabled={deletePantryMutation.isPending}
                      data-testid={`button-delete-${pantry.id}`}
                    >
                      {deletePantryMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete All Confirmation Dialog */}
      {showDeleteAll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete All Pantries</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete all {Array.isArray(pantries) ? pantries.length : 0} pantries? This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <Button
                variant="destructive"
                onClick={() => deleteAllMutation.mutate()}
                disabled={deleteAllMutation.isPending}
                data-testid="button-confirm-delete-all"
              >
                {deleteAllMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete All
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteAll(false)}
                disabled={deleteAllMutation.isPending}
                data-testid="button-cancel-delete-all"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Pantry Modal placeholder */}
      {editingPantry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl mx-4 w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Pantry</h3>
            <p className="text-muted-foreground mb-4">
              Edit functionality coming soon! For now, you can delete and re-import pantries.
            </p>
            <Button onClick={() => setEditingPantry(null)} data-testid="button-close-edit">
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
