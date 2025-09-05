import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Users, Clock } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <MapPin className="text-primary text-2xl" />
              <div>
                <h1 className="text-xl font-semibold text-foreground">Find a Pantry</h1>
                <p className="text-sm text-muted-foreground">Second Harvest Food Bank of the Lehigh Valley</p>
              </div>
            </div>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-login"
            >
              Admin Login
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary/80 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-primary-foreground mb-6">
            Find Food Assistance Near You
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-3xl mx-auto">
            Locate food pantries, soup kitchens, and other food assistance programs in the Lehigh Valley area. 
            Our directory helps connect community members with the resources they need.
          </p>
          <Button 
            size="lg" 
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-lg px-8 py-3"
            onClick={() => {
              const mapSection = document.getElementById('pantry-finder');
              mapSection?.scrollIntoView({ behavior: 'smooth' });
            }}
            data-testid="button-find-pantries"
          >
            <Search className="mr-2 h-5 w-5" />
            Find Food Pantries
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">How We Help</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive directory makes it easy to find food assistance when and where you need it.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Location-Based Search</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Find pantries near your location with our interactive map and distance-based search.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Real-Time Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Get up-to-date hours, contact information, and availability for each food pantry.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Community Focused</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Supporting the Lehigh Valley community with comprehensive food assistance resources.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Simple Pantry Finder Section */}
      <section id="pantry-finder" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold text-foreground mb-8">Ready to Find Food Assistance?</h3>
          <p className="text-lg text-muted-foreground mb-8">
            Access our full directory with interactive map and detailed pantry information.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/'}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-access-directory"
          >
            Access Pantry Directory
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-muted-foreground">
            © 2024 Second Harvest Food Bank of the Lehigh Valley. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
