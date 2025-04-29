import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader, Save, MapPin, Layers, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

// We'll add actual Leaflet implementation in a separate step
// This is a placeholder for the map component

const SatelliteMapView = ({ farm, date, onBoundariesChange }) => {
  const mapRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [boundaries, setBoundaries] = useState(null);
  const [ndviData, setNdviData] = useState(null);
  
  // Load map when component mounts
  useEffect(() => {
    if (farm) {
      // In a real implementation, this would initialize the Leaflet map
      // and load the farm boundaries if they exist
      console.log(`Loading map for farm: ${farm.name}`);
      
      // Simulate loading
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
        toast.success('Map loaded successfully');
        
        // If the farm has boundaries, set them
        if (farm.boundaries) {
          setBoundaries(farm.boundaries);
        }
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [farm]);
  
  // When date changes, fetch new satellite data
  useEffect(() => {
    if (farm && boundaries && date) {
      // In a real implementation, this would fetch NDVI data from the backend
      console.log(`Fetching NDVI data for date: ${date.toISOString().split('T')[0]}`);
      
      // Simulate loading
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
        
        // Simulate NDVI data
        setNdviData({
          averageNdvi: Math.random() * 0.5 + 0.3, // Random value between 0.3 and 0.8
          minNdvi: 0.1,
          maxNdvi: 0.9,
          date: date.toISOString()
        });
        
        toast.success('NDVI data loaded');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [farm, boundaries, date]);
  
  const handleSaveBoundaries = () => {
    // In a real implementation, this would save the boundaries to Firestore
    toast.success('Field boundaries saved', {
      description: 'Your field boundaries have been saved successfully'
    });
    
    // Notify parent component
    if (onBoundariesChange) {
      onBoundariesChange(boundaries);
    }
  };
  
  // Function to render a placeholder map
  const renderPlaceholderMap = () => (
    <div className="h-[500px] bg-slate-100 rounded-md flex items-center justify-center">
      {isLoading ? (
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading satellite data...</p>
        </div>
      ) : farm ? (
        <div className="text-center p-8">
          <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-slate-700 mb-2">Map View Ready</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            In the actual implementation, this would show a Leaflet map with drawing tools and satellite imagery.
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline">
              <Layers className="h-4 w-4 mr-2" />
              Toggle Layers
            </Button>
            <Button className="bg-green-600 hover:bg-green-700">
              Draw Field
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center p-8">
          <Info className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-slate-700 mb-2">No Farm Selected</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Please select a farm to view satellite imagery.
          </p>
        </div>
      )}
    </div>
  );
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Satellite View</CardTitle>
          {boundaries && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" onClick={handleSaveBoundaries} disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Boundaries
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save the current field boundaries</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {renderPlaceholderMap()}
        
        {ndviData && (
          <div className="mt-4 p-4 bg-green-50 rounded-md border border-green-100">
            <h3 className="font-medium text-green-800 mb-2">NDVI Analysis</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-green-600">Average NDVI</p>
                <p className="text-xl font-bold text-green-800">{ndviData.averageNdvi.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-green-600">Min NDVI</p>
                <p className="text-xl font-bold text-green-800">{ndviData.minNdvi.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-green-600">Max NDVI</p>
                <p className="text-xl font-bold text-green-800">{ndviData.maxNdvi.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SatelliteMapView; 