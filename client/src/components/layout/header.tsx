import { useState } from "react";
import { MapPin, List, Settings, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

interface HeaderProps {
  onToggleView?: () => void;
  currentView?: 'map' | 'list';
}

export default function Header({ onToggleView, currentView = 'map' }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  
  // Fetch admin settings for logo and organization name
  const { data: adminSettings } = useQuery({
    queryKey: ['/api/admin/settings'],
  });

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-4 hover:opacity-80 transition-opacity">
            {adminSettings?.logoUrl ? (
              <img 
                src={adminSettings.logoUrl} 
                alt="Organization Logo"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <MapPin className={`text-primary text-2xl ${adminSettings?.logoUrl ? 'hidden' : ''}`} />
            <div>
              <h1 className="text-xl font-semibold text-foreground" data-testid="text-app-title">
                Find a Pantry
              </h1>
              <p className="text-sm text-muted-foreground" data-testid="text-org-name">
                {adminSettings?.organizationName || "Second Harvest Food Bank of the Lehigh Valley"}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {onToggleView && (
              <Button
                variant="ghost"
                onClick={onToggleView}
                className="flex items-center space-x-2"
                data-testid="button-toggle-view"
              >
                <List className="h-4 w-4" />
                <span>{currentView === 'map' ? 'List View' : 'Map View'}</span>
              </Button>
            )}
            
            {isAuthenticated ? (
              <>
                <Button asChild variant="ghost" data-testid="button-admin-dashboard">
                  <Link href="/admin" className="flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>Admin</span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="flex items-center space-x-2"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </>
            ) : (
              <Button
                onClick={() => window.location.href = '/api/login'}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-login"
              >
                <Settings className="h-4 w-4 mr-2" />
                Admin Login
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4">
            <div className="space-y-2">
              {onToggleView && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    onToggleView();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start"
                  data-testid="button-mobile-toggle-view"
                >
                  <List className="h-4 w-4 mr-2" />
                  {currentView === 'map' ? 'List View' : 'Map View'}
                </Button>
              )}
              
              {isAuthenticated ? (
                <>
                  <Button asChild variant="ghost" className="w-full justify-start" data-testid="button-mobile-admin">
                    <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Admin Dashboard
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full justify-start"
                    data-testid="button-mobile-logout"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    window.location.href = '/api/login';
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90"
                  data-testid="button-mobile-login"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin Login
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
