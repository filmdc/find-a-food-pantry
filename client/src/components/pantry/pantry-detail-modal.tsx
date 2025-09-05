import { X, Phone, Mail, Navigation, Share, Check, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pantry } from "@shared/schema";

interface PantryDetailModalProps {
  pantry: Pantry;
  onClose: () => void;
}

export default function PantryDetailModal({ pantry, onClose }: PantryDetailModalProps) {
  const handleDirections = () => {
    const address = `${pantry.address}, ${pantry.city}, ${pantry.state} ${pantry.zipCode}`;
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
  };

  const handleCall = () => {
    if (pantry.phone) {
      window.location.href = `tel:${pantry.phone}`;
    }
  };

  const handleEmail = () => {
    if (pantry.email) {
      window.location.href = `mailto:${pantry.email}`;
    }
  };

  const handleShare = async () => {
    const address = `${pantry.address}, ${pantry.city}, ${pantry.state} ${pantry.zipCode}`;
    const shareData = {
      title: pantry.name,
      text: `${pantry.name} - Food pantry located at ${address}. ${pantry.phone ? `Phone: ${pantry.phone}.` : ''} Find more food pantries at ${window.location.origin}`,
      url: window.location.origin,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // Fallback to copying to clipboard
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    const address = `${pantry.address}, ${pantry.city}, ${pantry.state} ${pantry.zipCode}`;
    const text = `${pantry.name} - Food pantry located at ${address}. ${pantry.phone ? `Phone: ${pantry.phone}.` : ''} Find more food pantries at ${window.location.origin}`;
    navigator.clipboard.writeText(text);
  };

  const getAccessTypeInfo = () => {
    switch (pantry.accessType) {
      case 'walk-in':
        return {
          badge: <Badge className="bg-primary/10 text-primary">Walk-in Welcome</Badge>,
          description: "No appointment necessary - walk-in during operating hours."
        };
      case 'appointment':
        return {
          badge: <Badge className="bg-secondary/10 text-secondary">By Appointment Only</Badge>,
          description: "Please call ahead to schedule your visit."
        };
      case 'mobile':
        return {
          badge: <Badge variant="outline" className="border-accent text-accent-foreground">Mobile Pantry</Badge>,
          description: "Mobile food distribution - check schedule for locations and times."
        };
      default:
        return {
          badge: <Badge variant="outline">Contact for Information</Badge>,
          description: "Please contact the pantry for access information."
        };
    }
  };

  const accessInfo = getAccessTypeInfo();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]" onClick={onClose}>
      <div 
        className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="modal-pantry-detail"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 mr-4">
              <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="text-pantry-modal-name">
                {pantry.name}
              </h2>
              <div className="flex items-start text-muted-foreground">
                <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <p data-testid="text-pantry-modal-address">
                  {pantry.address}<br />
                  {pantry.city}, {pantry.state} {pantry.zipCode}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-close-modal"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-foreground mb-3">Contact Information</h3>
              <div className="space-y-3">
                {pantry.phone && (
                  <div className="flex items-center">
                    <Phone className="text-muted-foreground h-4 w-4 mr-3" />
                    <span className="text-foreground" data-testid="text-pantry-modal-phone">
                      {pantry.phone}
                    </span>
                  </div>
                )}
                {pantry.email && (
                  <div className="flex items-center">
                    <Mail className="text-muted-foreground h-4 w-4 mr-3" />
                    <span className="text-foreground" data-testid="text-pantry-modal-email">
                      {pantry.email}
                    </span>
                  </div>
                )}
              </div>
              
              <h3 className="font-semibold text-foreground mb-3 mt-6">Hours & Availability</h3>
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Clock className="text-secondary h-4 w-4 mr-2" />
                  {accessInfo.badge}
                </div>
                <p className="text-sm text-muted-foreground">
                  {accessInfo.description}
                </p>
                {pantry.hours && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-sm font-medium text-foreground">Hours:</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-pantry-modal-hours">
                      {pantry.hours}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              {pantry.services && pantry.services.length > 0 && (
                <>
                  <h3 className="font-semibold text-foreground mb-3">Services</h3>
                  <ul className="space-y-2 text-sm mb-6">
                    {pantry.services.map((service, index) => (
                      <li key={index} className="flex items-center">
                        <Check className="text-primary h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{service}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              
              {pantry.description && (
                <>
                  <h3 className="font-semibold text-foreground mb-3">Additional Information</h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-pantry-modal-description">
                    {pantry.description}
                  </p>
                </>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-border">
            <Button 
              onClick={handleDirections}
              variant="outline"
              data-testid="button-get-directions"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Get Directions
            </Button>
            {pantry.phone && (
              <Button 
                onClick={handleCall}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                data-testid="button-call-now"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Now
              </Button>
            )}
            {pantry.email && (
              <Button 
                variant="outline"
                onClick={handleEmail}
                data-testid="button-send-email"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            )}
            <Button 
              variant="outline"
              onClick={handleShare}
              data-testid="button-share"
            >
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
