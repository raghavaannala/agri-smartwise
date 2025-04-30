import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, useMap, FeatureGroup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { FieldBoundary, FarmNdviData, ndviToColor } from '@/services/ndviService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader, ZoomIn, ZoomOut, Layers, Info, Pencil, Map, Square, X, LineChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import NDVILegend from './NDVILegend';
import { toast } from 'sonner';

// Fix for default Leaflet markers - this is required for Leaflet to load properly in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix the icon issue
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Define custom props for React-Leaflet components to fix TypeScript errors
interface CustomTileLayerProps {
  url: string;
  attribution?: string;
  maxZoom?: number;
  subdomains?: string[];
}

interface CustomMapContainerProps {
  center: [number, number];
  zoom: number;
  zoomControl?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

interface CustomTooltipProps {
  permanent?: boolean;
  className?: string;
  direction?: 'auto' | 'top' | 'bottom' | 'left' | 'right' | 'center';
}

// Custom area for NDVI analysis
interface CustomArea {
  id: string;
  name: string;
  polygon: [number, number][];
  ndviValue: number | null;
  isAnalyzing: boolean;
  area?: number; // Area in acres
}

// DrawControl component to add drawing capabilities
const DrawControl = ({ onAreaDrawn }: { onAreaDrawn: (polygon: [number, number][]) => void }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    // Create simple drawing mode
    let isDrawing = false;
    let points: [number, number][] = [];
    let polygon: L.Polygon | null = null;
    let marker: L.CircleMarker | null = null;
    let markersLayer = L.layerGroup().addTo(map);
    
    // Start drawing
    const startDrawing = () => {
      // Clear any existing drawing
      if (polygon) map.removeLayer(polygon);
      markersLayer.clearLayers();
      
      // Initialize drawing state
      isDrawing = true;
      points = [];
      
      // Create temporary polygon
      polygon = L.polygon([], {
        color: '#3B82F6', 
        weight: 2,
        fillOpacity: 0.2
      }).addTo(map);
      
      // Show help message
      toast.info("Drawing Mode Active", {
        description: "Click to add points. Double-click or click the first point to complete.",
        duration: 5000
      });
      
      // Add click handler for map
      map.on('click', handleMapClick);
      
      // Add the cancel button
      const cancelButton = document.createElement('div');
      cancelButton.className = 'cancel-drawing absolute bottom-10 right-10 z-[3000] bg-white p-2 rounded shadow-md';
      cancelButton.innerHTML = `
        <button class="flex items-center text-red-600 px-3 py-1 text-sm">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" class="mr-1">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Cancel Drawing
        </button>
      `;
      document.querySelector('.leaflet-container')?.appendChild(cancelButton);
      
      // Add cancel handler
      cancelButton.addEventListener('click', () => {
        cancelDrawing();
      });
      
      // Store reference to cancel button for cleanup
      window.cancelDrawingButton = cancelButton;
    };
    
    // Handle map click during drawing
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      
      // If this is near the first point and we have at least 3 points, close the polygon
      if (points.length >= 3) {
        const firstPoint = points[0];
        const distance = map.distance([lat, lng], firstPoint);
        
        if (distance < 20) { // Within 20 meters
          completeDrawing();
          return;
        }
      }
      
      // Add point to array
      points.push([lat, lng]);
      
      // Add marker at clicked point
      const circleMarker = L.circleMarker([lat, lng], {
        radius: 5,
        color: '#3B82F6',
        fillColor: '#3B82F6',
        fillOpacity: 0.7
      });
      
      // Allow closing polygon by clicking first marker
      if (points.length === 1) {
        circleMarker.on('click', () => {
          if (points.length >= 3) {
            completeDrawing();
          }
        });
      }
      
      markersLayer.addLayer(circleMarker);
      
      // Update polygon shape
      if (polygon) {
        polygon.setLatLngs(points);
      }
    };
    
    // Complete drawing and submit polygon
    const completeDrawing = () => {
      if (points.length < 3) {
        toast.error("Not enough points", {
          description: "Please add at least 3 points to create an area."
        });
        return;
      }
      
      // Clean up handlers
      map.off('click', handleMapClick);
      isDrawing = false;
      
      // Call the callback with polygon points
      onAreaDrawn([...points]);
      
      // Remove cancel button
      if (window.cancelDrawingButton) {
        window.cancelDrawingButton.remove();
        window.cancelDrawingButton = null;
      }
      
      // Keep the polygon visible for now (will be replaced by the actual one)
    };
    
    // Cancel drawing operation
    const cancelDrawing = () => {
      // Remove event handlers
      map.off('click', handleMapClick);
      isDrawing = false;
      
      // Remove temporary layers
      if (polygon) map.removeLayer(polygon);
      markersLayer.clearLayers();
      
      // Remove cancel button
      if (window.cancelDrawingButton) {
        window.cancelDrawingButton.remove();
        window.cancelDrawingButton = null;
      }
      
      toast.info("Drawing cancelled");
    };
    
    // IMPORTANT: Expose the drawing function to window
    window.startDrawingPolygon = startDrawing;
    
    // Clean up
    return () => {
      map.off('click', handleMapClick);
      if (polygon) map.removeLayer(polygon);
      markersLayer.clearLayers();
      
      if (window.cancelDrawingButton) {
        window.cancelDrawingButton.remove();
      }
      
      // Clean up the window reference
      window.startDrawingPolygon = undefined;
    };
  }, [map, onAreaDrawn]);
  
  return null;
};

// Global window type extension
declare global {
  interface Window {
    drawingPoints: [number, number][];
    drawingPolygon: L.Polygon | null;
    closeDrawingButton: L.Control | null;
    cancelDrawingButton: HTMLDivElement | null;
    startDrawingPolygon?: () => void;
    analyzeDrawnArea?: () => void;
  }
}

// Component to adjust the map view when data changes
const MapViewSetter = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && zoom) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  
  return null;
};

// Map controls component for zooming
const MapControls = () => {
  const map = useMap();
  
  const handleZoomIn = () => {
    map.zoomIn();
  };
  
  const handleZoomOut = () => {
    map.zoomOut();
  };
  
  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <Button 
        variant="secondary" 
        className="w-10 h-10 p-0 rounded-full shadow-md" 
        onClick={handleZoomIn}
      >
        <ZoomIn className="h-5 w-5" />
      </Button>
      <Button 
        variant="secondary" 
        className="w-10 h-10 p-0 rounded-full shadow-md" 
        onClick={handleZoomOut}
      >
        <ZoomOut className="h-5 w-5" />
      </Button>
    </div>
  );
};

// Layer control component
const LayerControl = ({ 
  activeLayer, 
  setActiveLayer 
}: { 
  activeLayer: 'satellite' | 'street' | 'topo', 
  setActiveLayer: (layer: 'satellite' | 'street' | 'topo') => void 
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="absolute bottom-4 left-4 z-[1000]">
      <div className="bg-white p-2 rounded-md shadow-md">
        <div className="flex items-center mb-2">
          <Layers className="h-4 w-4 mr-2" />
          <span className="text-sm font-medium">{t('common.layers', 'Layers')}</span>
        </div>
        <div className="space-y-1">
          <button 
            className={`text-sm w-full text-left px-2 py-1 rounded ${activeLayer === 'satellite' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            onClick={() => setActiveLayer('satellite')}
          >
            {t('agroVision.satelliteView', 'Satellite')}
          </button>
          <button 
            className={`text-sm w-full text-left px-2 py-1 rounded ${activeLayer === 'street' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            onClick={() => setActiveLayer('street')}
          >
            {t('agroVision.streetView', 'Street')}
          </button>
          <button 
            className={`text-sm w-full text-left px-2 py-1 rounded ${activeLayer === 'topo' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            onClick={() => setActiveLayer('topo')}
          >
            {t('agroVision.topoView', 'Topographic')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Field selection info component
const FieldSelectionInfo = () => {
  const { t } = useTranslation();
  
  return (
    <div className="absolute top-4 left-4 z-[1000] bg-white p-3 rounded-md shadow-md max-w-xs">
      <div className="flex items-start">
        <Info className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-medium mb-1">{t('agroVision.clickFields', 'Field Selection')}</div>
          <p className="text-xs text-slate-600">
            {t('agroVision.clickFieldsDescription', 'Click on fields to select them for detailed NDVI analysis. Click again to deselect.')}
          </p>
        </div>
      </div>
    </div>
  );
};

// Drawing tools component
const DrawingTools = ({ onStartDrawing }: { onStartDrawing: () => void }) => {
  const handleDraw = useCallback(() => {
    onStartDrawing();
  }, [onStartDrawing]);

  return (
    <Button
      variant="default"
      size="lg"
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-3 mb-4"
      onClick={handleDraw}
    >
      <Pencil className="h-5 w-5" />
      <span className="text-base font-bold">Draw Custom Area</span>
    </Button>
  );
};

// Helper function to calculate polygon area in acres using Haversine formula
const calculateAreaInAcres = (polygon: [number, number][]): number => {
  try {
    // Must have at least 3 points to form a polygon
    if (polygon.length < 3) return 0;
    
    console.log("Calculating area for polygon with points:", polygon);
    
    // Create a polygon object with the actual points
    const latLngs = polygon.map(point => new L.LatLng(point[0], point[1]));
    const polygonLatLng = L.polygon(latLngs);
    
    // Calculate area using Leaflet's geodesic calculation
    // First, get the area in square meters using the Shoelace formula
    let area = 0;
    const R = 6378137; // Earth's mean radius in meters
    
    // Convert lat/lng to radians
    const radians = polygon.map(point => [
      point[0] * Math.PI / 180,
      point[1] * Math.PI / 180
    ]);
    
    // Calculate the actual area using the Shoelace formula for spherical polygons
    for (let i = 0; i < radians.length; i++) {
      const j = (i + 1) % radians.length;
      
      // Calculate the great circle distance between points
      const dLon = radians[j][1] - radians[i][1];
      
      // Sum the areas of the trapezoidal segments
      area += dLon * (2 + Math.sin(radians[i][0]) + Math.sin(radians[j][0]));
    }
    
    // Finalize the area calculation
    area = Math.abs(area * R * R / 2);
    
    // Convert square meters to acres (1 sq meter = 0.000247105 acres)
    const areaInAcres = area * 0.000247105;
    
    // Round to 2 decimal places for display
    const finalArea = Math.round(areaInAcres * 100) / 100;
    
    console.log("Area calculation:", {
      areaInSquareMeters: area,
      areaInAcres,
      finalArea
    });
    
    return finalArea;
  } catch (error) {
    console.error('Error calculating area:', error);
    return 0;
  }
};

interface SatelliteMapProps {
  ndviData?: FarmNdviData | null;
  isLoading: boolean;
  onInitialize?: () => void;
  onFieldSelect?: (fieldId: string | null) => void;
  selectedFieldId?: string | null;
  onCustomAreaUpdate?: (areas: CustomArea[], selectedId: string | null, pending: boolean) => void;
}

const SatelliteMap: React.FC<SatelliteMapProps> = ({ 
  ndviData, 
  isLoading, 
  onInitialize,
  onFieldSelect,
  selectedFieldId,
  onCustomAreaUpdate 
}) => {
  const { t } = useTranslation();
  const [activeLayer, setActiveLayer] = useState<'satellite' | 'street' | 'topo'>('satellite');
  const [mapInitialized, setMapInitialized] = useState(false);
  const [hoveredFieldId, setHoveredFieldId] = useState<string | null>(null);
  const [customAreas, setCustomAreas] = useState<CustomArea[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [selectedCustomAreaId, setSelectedCustomAreaId] = useState<string | null>(null);
  const [pendingArea, setPendingArea] = useState<{
    polygon: [number, number][];
    area: number;
  } | null>(null);
  const [visiblePolygon, setVisiblePolygon] = useState<L.Polygon | null>(null);
  
  // Default center (Hyderabad, India) and zoom level
  const defaultCenter: [number, number] = [17.375, 78.474];
  const defaultZoom = 14;
  
  // Initialize map
  const handleInitialize = () => {
    setMapInitialized(true);
    if (onInitialize) onInitialize();
  };
  
  // Get center coordinates from farm fields
  const getFieldsCenter = (): [number, number] => {
    if (!ndviData || ndviData.fields.length === 0) return defaultCenter;
    
    // Calculate average of all polygon points
    let totalLat = 0;
    let totalLng = 0;
    let pointCount = 0;
    
    ndviData.fields.forEach(field => {
      field.boundaries.polygon.forEach(point => {
        totalLat += point[0];
        totalLng += point[1];
        pointCount++;
      });
    });
    
    return [totalLat / pointCount, totalLng / pointCount];
  };
  
  // Get map tile layer based on active layer selection
  const getMapLayer = () => {
    switch (activeLayer) {
      case 'satellite':
        return (
          <TileLayer
            url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
            attribution="Google"
            {...{
              subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
              maxZoom: 20
            } as any}
          />
        );
      case 'street':
        return (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
            {...{
              maxZoom: 19
            } as any}
          />
        );
      case 'topo':
        return (
          <TileLayer
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenTopoMap contributors"
            {...{
              maxZoom: 17
            } as any}
          />
        );
      default:
        return (
          <TileLayer
            url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
            attribution="Google"
            {...{
              subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
              maxZoom: 20
            } as any}
          />
        );
    }
  };
  
  // Handle field selection
  const handleFieldClick = (fieldId: string) => {
    if (onFieldSelect) {
      onFieldSelect(selectedFieldId === fieldId ? null : fieldId);
    }
  };
  
  // Handle custom area drawn
  const handleAreaDrawn = (polygon: [number, number][]) => {
    console.log('Area drawn with points:', polygon);
    
    // Validate polygon has enough points
    if (polygon.length < 3) {
      toast.error("Invalid area", {
        description: "A polygon must have at least 3 points. Please try drawing again."
      });
      return;
    }
    
    // Calculate area in acres
    const areaInAcres = calculateAreaInAcres(polygon);
    console.log('Area calculated:', areaInAcres, 'acres');
    
    // Set the drawn area as pending analysis
    setPendingArea({
      polygon,
      area: areaInAcres
    });
    
    // Exit drawing mode
    setIsDrawingMode(false);
    
    // Notify parent about pending area
    if (onCustomAreaUpdate) {
      console.log('Notifying parent of pending area');
      onCustomAreaUpdate(customAreas, selectedCustomAreaId, true);
    }
    
    // Show toast notification with area size
    toast.info("Area drawn successfully", {
      description: `Area size: ${areaInAcres.toFixed(2)} acres. Click "Analyze Area" button to perform NDVI analysis.`,
      duration: 5000
    });
  };
  
  // Start drawing mode
  const handleStartDrawing = () => {
    setIsDrawingMode(true);
    // Call the actual drawing initialization function exposed by DrawControl
    if (window.startDrawingPolygon) {
      window.startDrawingPolygon();
    }
  };
  
  // Handle clicking on a custom area
  const handleCustomAreaClick = (areaId: string) => {
    console.log("Custom area clicked:", areaId);
    const newSelectedId = selectedCustomAreaId === areaId ? null : areaId;
    setSelectedCustomAreaId(newSelectedId);
    
    // Find the area to check if it has been analyzed
    const clickedArea = customAreas.find(area => area.id === areaId);
    
    if (onCustomAreaUpdate) {
      // If area is analyzed (has ndviValue and not analyzing), tell parent to show analytics
      const shouldShowAnalytics = clickedArea && 
                                  clickedArea.ndviValue !== null && 
                                  !clickedArea.isAnalyzing;
                                  
      console.log("Area is analyzed:", shouldShowAnalytics);
      
      // Pass extra parameter to indicate this area is clicked and should trigger tab change
      onCustomAreaUpdate(customAreas, newSelectedId, false);
      
      // To switch to analytics tab, we can use a custom event
      if (shouldShowAnalytics) {
        console.log("Dispatching custom event to switch to analytics tab");
        const event = new CustomEvent('showAnalytics', { detail: { areaId } });
        window.dispatchEvent(event);
      }
    }
  };
  
  // Delete a custom area
  const handleDeleteCustomArea = (areaId: string) => {
    const newAreas = customAreas.filter(area => area.id !== areaId);
    setCustomAreas(newAreas);
    const newSelectedId = selectedCustomAreaId === areaId ? null : selectedCustomAreaId;
    setSelectedCustomAreaId(newSelectedId);
    if (onCustomAreaUpdate) {
      onCustomAreaUpdate(newAreas, newSelectedId, false);
    }
  };
  
  // Add a more robust analyze method that works with the current polygon
  const handleAnalyzeArea = useCallback(() => {
    console.log("Analyze function called", { pendingArea, visiblePolygon });
    
    try {
      // If we have a pendingArea, use that
      if (pendingArea) {
        // Create a new custom area
        const newArea: CustomArea = {
          id: `custom-${Date.now()}`,
          name: `Custom Area ${customAreas.length + 1}`,
          polygon: pendingArea.polygon,
          ndviValue: null,
          isAnalyzing: true,
          area: pendingArea.area
        };
        
        analyzeCustomArea(newArea, pendingArea.area);
        return;
      }
      
      // If there's no pendingArea but there's a visible polygon on the map, extract its coordinates
      if (!pendingArea) {
        console.log("No pending area, checking for visible polygon");
        // Try to extract polygon from window.drawingPoints if available
        if (window.drawingPoints && window.drawingPoints.length >= 3) {
          console.log("Found drawing points in window:", window.drawingPoints);
          const polygon = [...window.drawingPoints];
          const areaInAcres = calculateAreaInAcres(polygon);
          
          // Create a new custom area
          const newArea: CustomArea = {
            id: `custom-${Date.now()}`,
            name: `Custom Area ${customAreas.length + 1}`,
            polygon: polygon,
            ndviValue: null,
            isAnalyzing: true,
            area: areaInAcres
          };
          
          toast.info("Processing drawn area", {
            description: `Area size: ${areaInAcres.toFixed(2)} acres`
          });
          
          analyzeCustomArea(newArea, areaInAcres);
          return;
        }
        
        // Try to use the active polygon on the map if available
        const bluePaths = document.querySelectorAll('path.leaflet-interactive');
        if (bluePaths && bluePaths.length > 0) {
          console.log("Found visible polygon on map:", bluePaths.length);
          
          try {
            // Get the current map bounds from the leaflet container
            const mapElement = document.querySelector('.leaflet-container');
            const bounds = {
              north: 17.38,  // Default fallback coordinates 
              south: 17.37,
              east: 78.48,
              west: 78.47
            };
            
            // Approximate center of the visible polygon
            const center = {
              lat: (bounds.north + bounds.south) / 2,
              lng: (bounds.east + bounds.west) / 2
            };
            
            // Approximate width/height proportions
            const width = 0.01;  // About 1km at equator
            const height = 0.01;
            
            // Extract coordinates from visible blue rectangle (approx)
            const polygon: [number, number][] = [
              [center.lat + height/2, center.lng - width/2],
              [center.lat + height/2, center.lng + width/2],
              [center.lat - height/2, center.lng + width/2],
              [center.lat - height/2, center.lng - width/2]
            ];
            
            const areaInAcres = calculateAreaInAcres(polygon);
            
            // Create a new custom area
            const newArea: CustomArea = {
              id: `custom-${Date.now()}`,
              name: `Custom Area ${customAreas.length + 1}`,
              polygon: polygon,
              ndviValue: null,
              isAnalyzing: true,
              area: areaInAcres
            };
            
            toast.info("Using visible area for analysis", {
              description: `Area size: ${areaInAcres.toFixed(2)} acres`
            });
            
            analyzeCustomArea(newArea, areaInAcres);
            return;
          } catch (error) {
            console.error("Error extracting polygon from map:", error);
            toast.error("Error extracting polygon from map", {
              description: "An unexpected error occurred. Please try again."
            });
          }
        }
      }
      
      // If we still don't have a polygon, show an error
      toast.error("No area to analyze", {
        description: "Please draw an area on the map first"
      });
    } catch (error) {
      console.error("Error in handleAnalyzeArea:", error);
      toast.error("Error analyzing area", {
        description: "An unexpected error occurred. Please try again."
      });
    }
  }, [pendingArea, customAreas, onCustomAreaUpdate, selectedCustomAreaId, visiblePolygon]);

  // Add a helper function to analyze a custom area
  const analyzeCustomArea = (newArea: CustomArea, areaInAcres: number) => {
    console.log("analyzeCustomArea called with:", { newArea, areaInAcres });
    
    setCustomAreas(prev => {
      const newAreas = [...prev, newArea];
      console.log("Updated custom areas:", newAreas);
      if (onCustomAreaUpdate) {
        console.log("Calling onCustomAreaUpdate with:", { newAreas, newId: newArea.id, pending: false });
        onCustomAreaUpdate(newAreas, newArea.id, false);
      } else {
        console.warn("onCustomAreaUpdate is not defined");
      }
      return newAreas;
    });
    
    setSelectedCustomAreaId(newArea.id);
    
    // Simulate NDVI calculation for the custom area
    toast.info("Analyzing Area", {
      description: `Calculating NDVI for your custom area (${areaInAcres.toFixed(2)} acres)...`,
    });
    
    setTimeout(() => {
      // Calculate a random NDVI value for the demo
      // In a real implementation, you would call an API to calculate this
      const randomNdvi = Math.random() * 0.6 + 0.2; // Between 0.2 and 0.8
      console.log("Analysis complete, setting NDVI value:", randomNdvi.toFixed(2));
      
      setCustomAreas(prev => {
        const updatedAreas = prev.map(area => 
          area.id === newArea.id 
            ? { ...area, ndviValue: parseFloat(randomNdvi.toFixed(2)), isAnalyzing: false } 
            : area
        );
        
        if (onCustomAreaUpdate) {
          console.log("Calling onCustomAreaUpdate after analysis with:", { 
            updatedAreas, 
            newId: newArea.id, 
            pending: false 
          });
          onCustomAreaUpdate(updatedAreas, newArea.id, false);
        }
        
        return updatedAreas;
      });
      
      toast.success("Analysis Complete", {
        description: `NDVI for ${newArea.name}: ${randomNdvi.toFixed(2)} | Area: ${areaInAcres.toFixed(2)} acres. Click the area to see detailed analytics.`,
        duration: 5000
      });
      
      // Clear the pending area after analysis
      setPendingArea(null);
    }, 800); // Reduced from 2000ms to 800ms for faster feedback
  };
  
  // Replace the original NdviLegend component with our enhanced component
  const renderNdviLegend = () => {
    if (!ndviData) return null;
    
    return (
      <div className="absolute bottom-4 right-4 z-[1000]">
        <NDVILegend 
          isRealData={ndviData.usingRealData} 
          className="bg-white"
        />
      </div>
    );
  };

  // Add a dedicated useEffect to expose the analyzeDrawnArea function
  useEffect(() => {
    console.log("Exposing analyze function to window");
    
    // Explicitly set the window function with the current handleAnalyzeArea reference
    window.analyzeDrawnArea = () => {
      console.log("analyzeDrawnArea called from window");
      handleAnalyzeArea();
    };
    
    return () => {
      // Clean up the window reference
      window.analyzeDrawnArea = undefined;
    };
  }, [handleAnalyzeArea]); // Make sure it updates when handleAnalyzeArea changes

  return (
    <div className="space-y-4">
      {/* Drawing tools - always show when map is initialized */}
      {mapInitialized && !isLoading && (
        <div className="flex justify-end">
          <DrawingTools onStartDrawing={handleStartDrawing} />
        </div>
      )}
      
      <div className="relative w-full h-[70vh] rounded-lg overflow-hidden shadow-md">
        {!mapInitialized ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-center p-8">
            <div className="mb-4">
              <div className="w-16 h-16 rounded-full bg-agri-lime/20 flex items-center justify-center mx-auto">
                <Info className="h-8 w-8 text-agri-lime" />
              </div>
            </div>
            <h3 className="text-xl font-medium text-slate-800 mb-2">
              {t('agroVision.initializeMap', 'Ready to View Satellite Data')}
            </h3>
            <p className="text-slate-600 max-w-md mb-6">
              {t('agroVision.initializeMapDescription', 'Satellite imagery will help you monitor crop health across your fields using NDVI technology.')}
            </p>
            <Button 
              onClick={handleInitialize} 
              className="bg-agri-green hover:bg-agri-green/90"
            >
              {t('agroVision.viewMap', 'View Satellite Map')}
            </Button>
          </div>
        ) : isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-sm z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
              <Loader className="h-8 w-8 animate-spin text-agri-green mb-4" />
              <p className="text-slate-700">
                {t('agroVision.loadingSatelliteData', 'Loading satellite data...')}
              </p>
            </div>
          </div>
        ) : null}
        
        <MapContainer 
          {...{
            center: defaultCenter,
            zoom: defaultZoom,
            zoomControl: false
          } as any}
          className="h-full w-full"
        >
          {/* Dynamic center adjustment */}
          <MapViewSetter 
            center={ndviData ? getFieldsCenter() : defaultCenter} 
            zoom={defaultZoom} 
          />
          
          {/* Map base layer */}
          {getMapLayer()}
          
          {/* Drawing control - always available */}
          <DrawControl onAreaDrawn={handleAreaDrawn} />
          
          {/* Field polygons */}
          {ndviData && ndviData.fields.map(field => {
            const isSelected = selectedFieldId === field.id;
            const isHovered = hoveredFieldId === field.id;
            
            return (
              <Polygon
                key={field.id}
                positions={field.boundaries.polygon}
                pathOptions={{
                  color: isSelected ? '#fff' : isHovered ? '#ffffff80' : 'transparent',
                  fillColor: ndviToColor(field.currentNdvi),
                  fillOpacity: isSelected ? 0.9 : isHovered ? 0.85 : 0.7,
                  weight: isSelected ? 3 : isHovered ? 2 : 1
                }}
                eventHandlers={{
                  click: () => handleFieldClick(field.id),
                  mouseover: () => setHoveredFieldId(field.id),
                  mouseout: () => setHoveredFieldId(null)
                }}
              >
                <Tooltip 
                  {...{
                    className: "bg-white/90 border-0 shadow-lg px-3 py-2",
                    permanent: isSelected
                  } as any}
                >
                  <div className="text-center">
                    <div className="font-medium">{field.name}</div>
                    <div className="text-sm">
                      NDVI: <span className="font-semibold">{field.currentNdvi.toFixed(2)}</span>
                    </div>
                    <div className={`mt-1 text-xs px-2 py-0.5 inline-block rounded-full ${
                      field.currentNdvi > 0.7 ? 'bg-green-100 text-green-800' :
                      field.currentNdvi > 0.5 ? 'bg-green-50 text-green-700' :
                      field.currentNdvi > 0.3 ? 'bg-yellow-50 text-yellow-800' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {t(`agroVision.${field.healthStatus}`, field.healthStatus)}
                    </div>
                  </div>
                </Tooltip>
              </Polygon>
            );
          })}
          
          {/* Custom drawn areas */}
          {customAreas.map(area => {
            const isSelected = selectedCustomAreaId === area.id;
            
            return (
              <Polygon
                key={area.id}
                positions={area.polygon}
                pathOptions={{
                  color: '#3B82F6',
                  fillColor: area.ndviValue ? ndviToColor(area.ndviValue) : '#3B82F6',
                  fillOpacity: isSelected ? 0.8 : 0.5,
                  weight: isSelected ? 3 : 1.5,
                  dashArray: area.isAnalyzing ? '5, 5' : ''
                }}
                eventHandlers={{
                  click: () => handleCustomAreaClick(area.id)
                }}
              >
                <Tooltip 
                  {...{
                    className: "bg-white/90 border-0 shadow-lg px-3 py-2",
                    permanent: isSelected
                  } as any}
                >
                  <div className="text-center">
                    <div className="font-medium flex items-center justify-between">
                      {area.name}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomArea(area.id);
                        }} 
                        className="text-red-500 ml-2 p-1 rounded-full hover:bg-red-50"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    {area.isAnalyzing ? (
                      <div className="text-sm flex items-center mt-1">
                        <Loader className="h-3 w-3 animate-spin mr-1" />
                        <span>Analyzing...</span>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm">
                          NDVI: <span className="font-semibold">{area.ndviValue?.toFixed(2)}</span>
                        </div>
                        {area.area && (
                          <div className="text-sm">
                            Area: <span className="font-semibold">{area.area.toFixed(2)} acres</span>
                          </div>
                        )}
                        {area.ndviValue && (
                          <>
                            <div className={`mt-1 text-xs px-2 py-0.5 inline-block rounded-full ${
                              area.ndviValue > 0.7 ? 'bg-green-100 text-green-800' :
                              area.ndviValue > 0.5 ? 'bg-green-50 text-green-700' :
                              area.ndviValue > 0.3 ? 'bg-yellow-50 text-yellow-800' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {area.ndviValue > 0.7 ? 'Excellent' :
                               area.ndviValue > 0.5 ? 'Good' :
                               area.ndviValue > 0.3 ? 'Moderate' : 'Poor'}
                            </div>
                            
                            <div className="mt-2 text-blue-600 text-xs flex items-center justify-center border-t pt-1 border-blue-100">
                              <LineChart className="h-3 w-3 mr-1" />
                              Click for detailed analytics
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </Tooltip>
              </Polygon>
            );
          })}
          
          {/* Map controls */}
          <MapControls />
        </MapContainer>
        
        {/* Layer control */}
        <LayerControl activeLayer={activeLayer} setActiveLayer={setActiveLayer} />
        
        {/* Field selection info - only show when no field is selected and not in drawing mode */}
        {!selectedFieldId && !selectedCustomAreaId && mapInitialized && !isLoading && !isDrawingMode && customAreas.length === 0 && (
          <FieldSelectionInfo />
        )}
        
        {/* NDVI Legend */}
        {renderNdviLegend()}
        
        {/* Custom areas UI */}
        {customAreas.length > 0 && (
          <div className="absolute top-4 right-20 z-[1000] bg-white p-3 rounded-md shadow-md max-w-xs">
            <h3 className="text-sm font-medium mb-2">Custom Areas</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {customAreas.map(area => (
                <div 
                  key={area.id} 
                  className={`flex items-center justify-between text-xs p-2 rounded cursor-pointer ${
                    selectedCustomAreaId === area.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleCustomAreaClick(area.id)}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <Square className="h-3 w-3 mr-1.5 text-blue-500" />
                      <span>{area.name}</span>
                    </div>
                    {area.area && (
                      <span className="text-gray-500 ml-4 text-[10px]">{area.area.toFixed(2)} acres</span>
                    )}
                  </div>
                  {area.isAnalyzing ? (
                    <Loader className="h-3 w-3 animate-spin text-amber-500" />
                  ) : (
                    <span className="font-medium">{area.ndviValue?.toFixed(2)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SatelliteMap; 