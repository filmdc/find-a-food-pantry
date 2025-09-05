import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/layout/header";
import SearchSidebar from "@/components/search/search-sidebar";
import PantryDetailModal from "@/components/pantry/pantry-detail-modal";
import InteractiveMap from "@/components/map/interactive-map";
import { Pantry } from "@shared/schema";

export default function Home() {
  const [selectedPantry, setSelectedPantry] = useState<Pantry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.6259, -75.3697]); // Bethlehem, PA
  const [selectedPantryId, setSelectedPantryId] = useState<string | null>(null);
  const [selectedDistance, setSelectedDistance] = useState("10");
  const [selectedFilter, setSelectedFilter] = useState("all");

  const { data: pantries = [], isLoading } = useQuery<Pantry[]>({
    queryKey: ['/api/pantries'],
  });

  const { data: searchResults = [], isLoading: isSearching } = useQuery<Pantry[]>({
    queryKey: ['/api/pantries/search', searchQuery, mapCenter[0], mapCenter[1], selectedDistance],
    queryFn: () => {
      const params = new URLSearchParams({
        q: searchQuery,
        lat: mapCenter[0].toString(),
        lng: mapCenter[1].toString(),
        radius: selectedDistance
      });
      return fetch(`/api/pantries/search?${params}`).then(res => res.json());
    },
    enabled: searchQuery.length > 0,
  });

  const displayPantries = searchQuery ? searchResults : pantries;

  const handlePantrySelect = (pantry: Pantry) => {
    setSelectedPantry(pantry);
    // Don't automatically center the map when opening modal from sidebar
    // Let users manually navigate the map if they want to see the location
  };

  const handleMapPantrySelect = (pantry: Pantry) => {
    setSelectedPantry(pantry);
    // When clicking from map, center on the pantry location
    if (pantry.latitude && pantry.longitude) {
      setMapCenter([parseFloat(pantry.latitude), parseFloat(pantry.longitude)]);
    }
  };

  const handleSearch = (query: string, lat?: number, lng?: number) => {
    setSearchQuery(query);
    if (lat && lng) {
      setMapCenter([lat, lng]);
    }
  };

  const handleLocationUpdate = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
  };

  const handleShowOnMap = (pantry: Pantry) => {
    if (pantry.latitude && pantry.longitude) {
      const lat = parseFloat(pantry.latitude);
      const lng = parseFloat(pantry.longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        const newCenter: [number, number] = [lat, lng];
        setMapCenter(newCenter);
        setSelectedPantryId(pantry.id);
      }
    }
  };

  const handleMapReset = () => {
    setSelectedPantryId(null);
    // Reset to default center and search
    setMapCenter([40.6259, -75.3697]);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Desktop layout: Sidebar + Map */}
      <div className="hidden md:flex h-[calc(100vh-4rem)]">
        <SearchSidebar
          pantries={displayPantries}
          isLoading={isLoading || isSearching}
          onPantrySelect={handlePantrySelect}
          onShowOnMap={handleShowOnMap}
          onSearch={handleSearch}
          searchQuery={searchQuery}
          selectedDistance={selectedDistance}
          onDistanceChange={setSelectedDistance}
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
          selectedPantryId={selectedPantryId}
        />
        
        <div className="flex-1 bg-muted/30 relative">
          <InteractiveMap
            pantries={displayPantries}
            center={mapCenter}
            selectedPantry={selectedPantry}
            onPantrySelect={handleMapPantrySelect}
            onLocationUpdate={handleLocationUpdate}
            onMapReset={handleMapReset}
            className="h-full w-full"
          />
        </div>
      </div>

      {/* Mobile layout: Fixed search at top + Full screen map */}
      <div className="md:hidden flex flex-col h-[calc(100vh-4rem)]">
        {/* Fixed search bar at top */}
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 p-4 shadow-sm">
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const query = formData.get('search') as string;
            if (query?.trim()) {
              handleSearch(query.trim());
            }
          }} className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                name="search"
                type="text"
                placeholder="Search address or zip code"
                defaultValue={searchQuery}
                className="pl-10 h-12 text-base bg-white border-gray-300"
                data-testid="input-search-mobile"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={selectedDistance} onValueChange={setSelectedDistance}>
                <SelectTrigger className="flex-1 h-10 bg-white">
                  <SelectValue placeholder="Distance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 miles</SelectItem>
                  <SelectItem value="10">10 miles</SelectItem>
                  <SelectItem value="25">25 miles</SelectItem>
                  <SelectItem value="50">50 miles</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger className="flex-1 h-10 bg-white">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pantries</SelectItem>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                  <SelectItem value="appointment">By Appointment</SelectItem>
                  <SelectItem value="mobile">Mobile Pantry</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
          
          {/* Results count */}
          {searchQuery && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                {isLoading || isSearching ? "Searching..." : `${displayPantries.length} pantries found`}
              </p>
            </div>
          )}
        </div>
        
        {/* Full screen map below search */}
        <div className="flex-1 relative">
          <InteractiveMap
            pantries={displayPantries}
            center={mapCenter}
            selectedPantry={selectedPantry}
            onPantrySelect={handleMapPantrySelect}
            onLocationUpdate={handleLocationUpdate}
            onMapReset={handleMapReset}
            className="h-full w-full"
          />
          
          {/* Results drawer (only when there are search results) */}
          {searchQuery && displayPantries.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-lg shadow-lg border-t border-gray-200 max-h-60 overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">
                    {displayPantries.length} pantries found
                  </h3>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>
                
                <div className="space-y-3">
                  {displayPantries.slice(0, 10).map((pantry) => (
                    <div 
                      key={pantry.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 cursor-pointer"
                      onClick={() => handlePantrySelect(pantry)}
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 truncate">{pantry.name}</h4>
                        <p className="text-xs text-gray-500 truncate">
                          {pantry.address}, {pantry.city}, {pantry.state}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowOnMap(pantry);
                        }}
                        className="ml-2 text-xs text-primary hover:text-primary/80 font-medium"
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedPantry && (
        <PantryDetailModal
          pantry={selectedPantry}
          onClose={() => setSelectedPantry(null)}
        />
      )}
    </div>
  );
}
