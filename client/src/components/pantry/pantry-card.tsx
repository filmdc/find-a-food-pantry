import { Phone, Navigation, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pantry } from "@shared/schema";

interface PantryCardProps {
  pantry: Pantry;
  onClick: () => void;
  onShowOnMap?: () => void;
  distance?: number;
  isSelected?: boolean;
}

export default function PantryCard({ pantry, onClick, onShowOnMap, distance, isSelected }: PantryCardProps) {
  const getAccessTypeBadge = (accessType: string | null) => {
    switch (accessType) {
      case 'walk-in':
        return <Badge variant="default" className="bg-primary/10 text-primary">Walk-in</Badge>;
      case 'appointment':
        return <Badge variant="secondary" className="bg-secondary/10 text-secondary">By Appointment</Badge>;
      case 'mobile':
        return <Badge variant="outline" className="border-accent text-accent-foreground">Mobile</Badge>;
      default:
        return <Badge variant="outline">Contact for Info</Badge>;
    }
  };

  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    const address = `${pantry.address}, ${pantry.city}, ${pantry.state} ${pantry.zipCode}`;
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pantry.phone) {
      window.location.href = `tel:${pantry.phone}`;
    }
  };

  const handleShowOnMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShowOnMap) {
      onShowOnMap();
    }
  };

  return (
    <Card 
      className={`p-4 hover:shadow-md transition-shadow cursor-pointer hover:bg-accent/5 ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
      onClick={onClick}
      data-testid={`card-pantry-${pantry.id}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-foreground line-clamp-2 flex-1 mr-2" data-testid={`text-pantry-name-${pantry.id}`}>
          {pantry.name}
        </h3>
        {distance !== undefined && (
          <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full whitespace-nowrap">
            {distance.toFixed(1)} mi
          </span>
        )}
      </div>
      
      <p className="text-sm text-muted-foreground mb-2" data-testid={`text-pantry-address-${pantry.id}`}>
        {pantry.address}<br />
        {pantry.city}, {pantry.state} {pantry.zipCode}
      </p>
      
      {pantry.phone && (
        <div className="flex items-center text-sm text-muted-foreground mb-2">
          <Phone className="h-4 w-4 mr-2" />
          <span data-testid={`text-pantry-phone-${pantry.id}`}>{pantry.phone}</span>
        </div>
      )}
      
      {pantry.hours && (
        <p className="text-sm text-muted-foreground mb-3" data-testid={`text-pantry-hours-${pantry.id}`}>
          {pantry.hours}
        </p>
      )}
      
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          {getAccessTypeBadge(pantry.accessType)}
        </div>
        <div className="flex gap-1 flex-wrap">
          {onShowOnMap && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShowOnMap}
              className="text-primary hover:text-primary/80 text-xs px-2 py-1 h-auto"
              data-testid={`button-show-on-map-${pantry.id}`}
            >
              <MapPin className="h-3 w-3 mr-1" />
              Show on Map
            </Button>
          )}
          {pantry.phone && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCall}
              className="text-primary hover:text-primary/80 text-xs px-2 py-1 h-auto"
              data-testid={`button-call-${pantry.id}`}
            >
              <Phone className="h-3 w-3 mr-1" />
              Call
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDirections}
            className="text-primary hover:text-primary/80 text-xs px-2 py-1 h-auto"
            data-testid={`button-directions-${pantry.id}`}
          >
            <Navigation className="h-3 w-3 mr-1" />
            Directions
          </Button>
        </div>
      </div>
    </Card>
  );
}
