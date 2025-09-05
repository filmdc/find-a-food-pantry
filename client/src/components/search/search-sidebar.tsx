import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import PantryCard from "@/components/pantry/pantry-card";
import { Pantry } from "@shared/schema";

interface SearchSidebarProps {
  pantries: Pantry[];
  isLoading: boolean;
  onPantrySelect: (pantry: Pantry) => void;
  onShowOnMap: (pantry: Pantry) => void;
  onSearch: (query: string, lat?: number, lng?: number) => void;
  searchQuery: string;
  selectedDistance: string;
  onDistanceChange: (distance: string) => void;
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  selectedPantryId?: string | null;
  isMobile?: boolean;
}

export default function SearchSidebar({
  pantries,
  isLoading,
  onPantrySelect,
  onShowOnMap,
  onSearch,
  searchQuery,
  selectedDistance,
  onDistanceChange,
  selectedFilter,
  onFilterChange,
  selectedPantryId,
  isMobile = false,
}: SearchSidebarProps) {
  const [inputValue, setInputValue] = useState(searchQuery);

  // Update input value when searchQuery changes to prevent disappearing
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputValue.trim()) {
      // Try to geocode the search query using our backend endpoint
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(inputValue)}`);
        const results = await response.json();
        
        if (Array.isArray(results) && results.length > 0 && results[0].lat && results[0].lon) {
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);
          if (!isNaN(lat) && !isNaN(lng)) {
            onSearch(inputValue, lat, lng);
            return;
          }
        }
        
        // No valid geocoding results, fall back to text search
        onSearch(inputValue);
      } catch (error) {
        // Silently fall back to text-only search
        onSearch(inputValue);
      }
    } else {
      onSearch('');
    }
  };

  const filteredPantries = pantries.filter(pantry => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'walk-in') return pantry.accessType === 'walk-in';
    if (selectedFilter === 'appointment') return pantry.accessType === 'appointment';
    if (selectedFilter === 'mobile') return pantry.accessType === 'mobile';
    return true;
  });

  if (isMobile) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200">
        {/* Compact mobile search form */}
        <div className="p-4">
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                id="search-location-mobile"
                type="text"
                placeholder="Search address or zip code"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="pl-10 h-12 text-base bg-white border-gray-300 focus:border-primary focus:ring-primary"
                data-testid="input-search-location-mobile"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={selectedDistance} onValueChange={onDistanceChange}>
                <SelectTrigger className="flex-1 h-10 bg-white border-gray-300" data-testid="select-distance-mobile">
                  <SelectValue placeholder="Distance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 miles</SelectItem>
                  <SelectItem value="10">10 miles</SelectItem>
                  <SelectItem value="25">25 miles</SelectItem>
                  <SelectItem value="50">50 miles</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedFilter} onValueChange={onFilterChange}>
                <SelectTrigger className="flex-1 h-10 bg-white border-gray-300" data-testid="select-filter-mobile">
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
        </div>
        
        {/* Mobile results count */}
        {searchQuery && (
          <div className="px-4 pb-3 border-t border-gray-200 bg-gray-50/80">
            <p className="text-sm text-gray-600 pt-2">
              {isLoading ? "Searching..." : `${filteredPantries.length} found`}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full md:w-96 bg-card border-r border-border overflow-y-auto">
      {/* Search Controls */}
      <div className="p-6 border-b border-border">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div>
            <Label htmlFor="search-location" className="block text-sm font-medium text-foreground mb-2">
              Search Location
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="search-location"
                type="text"
                placeholder="Enter address or zip code"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="pl-10"
                data-testid="input-search-location"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="distance-select" className="block text-sm font-medium text-foreground mb-2">
                Distance
              </Label>
              <Select value={selectedDistance} onValueChange={onDistanceChange}>
                <SelectTrigger id="distance-select" data-testid="select-distance">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 miles</SelectItem>
                  <SelectItem value="10">10 miles</SelectItem>
                  <SelectItem value="25">25 miles</SelectItem>
                  <SelectItem value="50">50 miles</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-select" className="block text-sm font-medium text-foreground mb-2">
                Filter
              </Label>
              <Select value={selectedFilter} onValueChange={onFilterChange}>
                <SelectTrigger id="filter-select" data-testid="select-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pantries</SelectItem>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                  <SelectItem value="appointment">By Appointment</SelectItem>
                  <SelectItem value="mobile">Mobile Pantries</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>
      </div>

      {/* Pantry List */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {searchQuery ? 'Search Results' : 'Nearby Pantries'}
          </h2>
          <span className="text-sm text-muted-foreground" data-testid="text-pantry-count">
            {isLoading ? '...' : `${filteredPantries.length} found`}
          </span>
        </div>
        
        <div className="space-y-4">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="border border-border rounded-lg p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))
          ) : filteredPantries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-2">No pantries found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search criteria or expanding the distance range.
              </p>
            </div>
          ) : (
            filteredPantries.map((pantry) => (
              <PantryCard
                key={pantry.id}
                pantry={pantry}
                onClick={() => onPantrySelect(pantry)}
                onShowOnMap={() => onShowOnMap(pantry)}
                isSelected={pantry.id === selectedPantryId}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
