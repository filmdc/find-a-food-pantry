import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { Icon, LatLngBounds, LatLngTuple } from "leaflet";
import { type Pantry } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Configure default markers - Fix for react-leaflet default icons
const DefaultIcon = new Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// User location marker icon
const UserLocationIcon = new Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [1, -42],
  shadowSize: [48, 48],
  className: 'user-location-marker'
});

// Component to handle map click events
function MapEventHandler({ onMapReset }: { onMapReset?: () => void }) {
  useMapEvents({
    click: () => {
      if (onMapReset) {
        onMapReset();
      }
    }
  });
  return null;
}

// Component to handle map center changes
interface MapControllerProps {
  center: [number, number];
  pantries: Pantry[];
  selectedPantry?: Pantry | null;
}

function MapController({ center, pantries, selectedPantry }: MapControllerProps) {
  const map = useMap();
  const [lastCenter, setLastCenter] = useState<[number, number]>(center);
  
  useEffect(() => {
    // Only update if center actually changed
    const hasChanged = center[0] !== lastCenter[0] || center[1] !== lastCenter[1];
    
    if (hasChanged) {
      setLastCenter(center);
      
      const currentZoom = map.getZoom();
      
      // If already zoomed in (close view), just instantly switch to new location
      if (currentZoom >= 14) {
        map.setView(center, 16, { animate: false });
      } else {
        // If zoomed out, first set position, then animate zoom for more reliable animation
        map.setView(center, currentZoom, { animate: false });
        setTimeout(() => {
          map.flyTo(center, 17, {
            animate: true,
            duration: 2
          });
        }, 50);
      }
    }
  }, [map, center, lastCenter]);

  useEffect(() => {
    // Only fit all pantries in view on initial load, not when switching between pantries
    const isInitialLoad = pantries.length > 0 && lastCenter[0] === 40.6259 && lastCenter[1] === -75.3697;
    
    if (isInitialLoad && !selectedPantry) {
      const validPantries = pantries.filter(p => p.latitude && p.longitude);
      if (validPantries.length > 0) {
        const bounds = new LatLngBounds(
          validPantries.map(p => [parseFloat(p.latitude!), parseFloat(p.longitude!)] as LatLngTuple)
        );
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [map, pantries, selectedPantry, lastCenter]);

  return null;
}

interface InteractiveMapProps {
  pantries: Pantry[];
  center: [number, number];
  selectedPantry?: Pantry | null;
  onPantrySelect: (pantry: Pantry) => void;
  onLocationUpdate?: (lat: number, lng: number) => void;
  onMapReset?: () => void;
  className?: string;
}

export default function InteractiveMap({ 
  pantries, 
  center, 
  selectedPantry,
  onPantrySelect,
  onLocationUpdate,
  onMapReset,
  className = "h-full w-full"
}: InteractiveMapProps) {
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const resetMapView = () => {
    // Reset map to show all pantries and clear selection
    if (onMapReset) {
      onMapReset();
    }
    // The MapController will handle fitting bounds when selection is cleared
  };

  // Filter pantries that have valid coordinates
  const validPantries = pantries.filter(pantry => 
    pantry.latitude && 
    pantry.longitude && 
    !isNaN(parseFloat(pantry.latitude)) && 
    !isNaN(parseFloat(pantry.longitude))
  );

  const formatHours = (hours: string | null) => {
    if (!hours) return "Hours not available";
    return hours;
  };

  const formatServices = (services: string[] | null) => {
    if (!services || services.length === 0) return "Services not specified";
    return services.join(", ");
  };

  // Get user's current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation: [number, number] = [latitude, longitude];
        setUserLocation(newLocation);
        setIsGettingLocation(false);
        
        // Update parent component with new location
        if (onLocationUpdate) {
          onLocationUpdate(latitude, longitude);
        }
      },
      (error) => {
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access denied. Please enable location services.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information unavailable.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out.");
            break;
          default:
            setLocationError("An unknown error occurred.");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  return (
    <div className={className} data-testid="interactive-map">
      {/* Map Control Buttons */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Button
          onClick={getCurrentLocation}
          disabled={isGettingLocation}
          size="sm"
          className="bg-white hover:bg-gray-50 text-gray-800 border shadow-md"
          data-testid="button-get-location"
        >
          {isGettingLocation ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          {isGettingLocation ? "Getting location..." : "Find me"}
        </Button>
        
        <Button
          onClick={resetMapView}
          size="sm"
          variant="outline"
          className="bg-white hover:bg-gray-50 text-gray-800 border shadow-md"
          data-testid="button-reset-view"
        >
          <MapPin className="h-4 w-4" />
          Reset View
        </Button>
        
        {locationError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-xs max-w-48">
            {locationError}
          </div>
        )}
      </div>

      <MapContainer
        ref={mapRef}
        center={center}
        zoom={10}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController center={center} pantries={validPantries} selectedPantry={selectedPantry} />
        <MapEventHandler onMapReset={onMapReset} />
        
        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={UserLocationIcon}
          >
            <Popup>
              <div className="text-center">
                <div className="flex items-center gap-2 justify-center mb-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <strong>Your Location</strong>
                </div>
                <p className="text-sm text-gray-600">
                  You are here
                </p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {validPantries.map((pantry) => (
          <Marker
            key={pantry.id}
            position={[parseFloat(pantry.latitude!), parseFloat(pantry.longitude!)]}
            icon={DefaultIcon}
            eventHandlers={{
              click: () => {
                onPantrySelect(pantry);
              }
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}