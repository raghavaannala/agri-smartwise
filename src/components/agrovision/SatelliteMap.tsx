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
    let markersLayer = L.layerGroup().addTo(map);
    
    // Start drawing
    const startDrawing = () => {
      console.log("⭐ DRAWING START - Clearing previous drawings");
      
      // Clear any existing drawing
      if (polygon) map.removeLayer(polygon);
      markersLayer.clearLayers();
      
      // Initialize drawing state
      isDrawing = true;
      points = [];
      
      // Create temporary polygon with bright, visible style
      polygon = L.polygon([], {
        color: '#FF3300', 
        weight: 3,
        fillOpacity: 0.4,
        fillColor: '#FF9900'
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
      
      // Also add an analyze button that appears when drawing is active
      const analyzeButton = document.createElement('div');
      analyzeButton.className = 'analyze-drawing absolute bottom-24 right-10 z-[3000] hidden';
      analyzeButton.innerHTML = `
        <button class="flex items-center bg-green-600 text-white px-4 py-2 rounded-md text-sm font-bold shadow-md">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" class="mr-1">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          Analyze This Area
        </button>
      `;
      document.querySelector('.leaflet-container')?.appendChild(analyzeButton);
      
      analyzeButton.addEventListener('click', () => {
        if (points.length >= 3) {
          completeDrawing();
          
          // Immediately analyze this area
          setTimeout(() => {
            // Create and dispatch a custom event to trigger analysis
            const analyzeEvent = new CustomEvent('analyzeDrawnArea', { 
              detail: { points: [...points] }
            });
            window.dispatchEvent(analyzeEvent);
          }, 500);
        } else {
          toast.error("Not enough points", {
            description: "Add at least 3 points to create an area."
          });
        }
      });
      
      // Store reference to analyze button
      window.analyzeButton = analyzeButton;
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
      
      // Log each point as it's added for debugging
      console.log(`⭐ Added point [${lat}, ${lng}]`);
      
      // Add marker at clicked point with bright colors
      const circleMarker = L.circleMarker([lat, lng], {
        radius: 6,
        color: '#FF3300',
        fillColor: '#FF9900',
        fillOpacity: 1,
        weight: 2
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
      
      // Show the analyze button once we have at least 3 points
      if (points.length >= 3 && window.analyzeButton) {
        window.analyzeButton.classList.remove('hidden');
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
      
      // CRITICAL: Store points globally so they can be accessed by analyzeDrawnArea
      // Make a deep copy to ensure we don't lose the reference
      const pointsCopy = JSON.parse(JSON.stringify(points));
      window.drawingPoints = pointsCopy;
      
      console.log('⭐ DRAWING COMPLETE - Storing points globally');
      console.log('⭐ Points array length:', window.drawingPoints.length);
      
      // Immediately validate that the points were stored correctly
      if (!window.drawingPoints || window.drawingPoints.length < 3) {
        console.error('⚠️ CRITICAL ERROR: Drawing points not stored correctly!');
        toast.error("Error storing drawing", {
          description: "Please try drawing again."
        });
      } else {
        console.log('✅ Drawing points stored successfully');
      }
      
      // Make the polygon permanent with a distinct style
      if (polygon) {
        polygon.setStyle({
          color: '#FF3300',
          weight: 4,
          fillColor: '#FF9900',
          fillOpacity: 0.6,
          dashArray: ''
        });
        
        // Add a popup to the polygon
        polygon.bindPopup(
          `<div class="text-center">
            <strong>Drawn Area</strong><br>
            ${pointsCopy.length} points<br>
            <button id="analyze-popup-btn" class="bg-green-600 text-white px-2 py-1 rounded mt-2 text-sm">
              Analyze This Area
            </button>
          </div>`
        ).openPopup();
        
        // Add click handler after a short delay
        setTimeout(() => {
          const analyzeBtn = document.getElementById('analyze-popup-btn');
          if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => {
              // Create and dispatch a custom event to trigger analysis
              const analyzeEvent = new CustomEvent('analyzeDrawnArea', { 
                detail: { points: pointsCopy }
              });
              window.dispatchEvent(analyzeEvent);
              
              // Close the popup after clicking
              if (polygon) polygon.closePopup();
            });
          }
        }, 100);
      }
      
      // Call the callback with the EXACT polygon points
      onAreaDrawn([...pointsCopy]);
      
      // Remove UI elements
      if (window.cancelDrawingButton) {
        window.cancelDrawingButton.remove();
        window.cancelDrawingButton = null;
      }
      
      if (window.analyzeButton) {
        window.analyzeButton.remove();
        window.analyzeButton = null;
      }
      
      // Add toast confirming the drawing is ready for analysis
      toast.success("Area drawing complete", { 
        description: "Click the Analyze Area button to analyze this region."
      });
    };
    
    // Cancel drawing operation
    const cancelDrawing = () => {
      // Remove event handlers
      map.off('click', handleMapClick);
      isDrawing = false;
      
      // Remove temporary layers
      if (polygon) map.removeLayer(polygon);
      markersLayer.clearLayers();
      
      // Remove UI elements
      if (window.cancelDrawingButton) {
        window.cancelDrawingButton.remove();
        window.cancelDrawingButton = null;
      }
      
      if (window.analyzeButton) {
        window.analyzeButton.remove();
        window.analyzeButton = null;
      }
      
      toast.info("Drawing cancelled");
    };
    
    // IMPORTANT: Expose the drawing function to window
    window.startDrawingPolygon = startDrawing;
    
    // Listen for the custom analyzeDrawnArea event
    const handleAnalyzeEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.points) {
        console.log("⭐ Received analyzeDrawnArea event with points:", customEvent.detail.points);
        
        // Update window.drawingPoints to ensure latest points are used
        window.drawingPoints = customEvent.detail.points;
        
        // Display visual feedback on the map
        if (polygon) {
          polygon.setStyle({
            color: '#00FF00',
            weight: 4,
            fillColor: '#33FF33',
            fillOpacity: 0.7,
            dashArray: '5,5'
          });
          
          // Add an "Analyzing" popup
          polygon.bindPopup(
            `<div class="text-center">
              <strong>Analyzing Area...</strong><br>
              <div class="animate-pulse mt-1">Please wait</div>
            </div>`
          ).openPopup();
        }
      }
    };
    
    window.addEventListener('analyzeDrawnArea', handleAnalyzeEvent);
    
    // Clean up
    return () => {
      map.off('click', handleMapClick);
      if (polygon) map.removeLayer(polygon);
      markersLayer.clearLayers();
      
      if (window.cancelDrawingButton) {
        window.cancelDrawingButton.remove();
      }
      
      if (window.analyzeButton) {
        window.analyzeButton.remove();
      }
      
      window.removeEventListener('analyzeDrawnArea', handleAnalyzeEvent);
      
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
    analyzeDrawnArea?: () => boolean;
    analyzeButton: HTMLDivElement | null;
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
    console.log('👉 Area drawn with points:', polygon);
    
    try {
      // Validate polygon has enough points
      if (polygon.length < 3) {
        toast.error("Invalid area", {
          description: "A polygon must have at least 3 points. Please try drawing again."
        });
        return;
      }
      
      // Calculate area in acres
      const areaInAcres = calculateAreaInAcres(polygon);
      console.log('👉 Area calculated:', areaInAcres, 'acres');
      
      // CRITICAL - Make a deep copy and store at BOTH places
      const pointsCopy = JSON.parse(JSON.stringify(polygon));
      
      // 1. Store on window for direct access
      window.drawingPoints = pointsCopy;
      console.log('👉 DIRECT: Drawing points saved globally:', pointsCopy.length, 'points');
      
      // 2. Also store in component state as backup
      setPendingArea({
        polygon: pointsCopy,
        area: areaInAcres
      });
      
      // Exit drawing mode
      setIsDrawingMode(false);
      
      // Notify parent about pending area
      if (onCustomAreaUpdate) {
        console.log('👉 Notifying parent of pending area');
        onCustomAreaUpdate(customAreas, selectedCustomAreaId, true);
      }
      
      // Show toast notification with area size
      toast.success("Area drawn successfully", {
        description: `Area: ${areaInAcres.toFixed(2)} acres. Click "Analyze Area" button to run analysis.`,
        duration: 5000
      });
    } catch (error) {
      console.error('Error handling drawn area:', error);
      toast.error("Error processing drawn area", {
        description: "Please try drawing again."
      });
    }
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
  
  // Define analyzeCustomArea before handleAnalyzeArea function
  const analyzeCustomArea = useCallback((area: CustomArea, areaInAcres: number) => {
    console.log("ANALYZING EXACT AREA:", {
      id: area.id,
      pointsCount: area.polygon.length,
      points: area.polygon,
      area: areaInAcres
    });
    
    // Show toast about analysis starting
    toast.info(`Analyzing area of ${areaInAcres.toFixed(2)} acres`, {
      description: `Processing ${area.polygon.length} coordinate points...`,
      duration: 5000
    });
    
    // Simulate API call with timeout
    setTimeout(() => {
      // Update with fake NDVI value - using a number instead of a string
      setCustomAreas(prev => 
        prev.map(existingArea => 
          existingArea.id === area.id 
            ? { 
                ...existingArea, 
                isAnalyzing: false,
                ndviValue: parseFloat((Math.random() * 0.5 + 0.2).toFixed(2)) // Ensure it's a number
              } 
            : existingArea
        )
      );
      
      toast.success("Analysis complete", {
        description: "Vegetation health information is now available."
      });
      
      // Dispatch an event to update the parent
      if (onCustomAreaUpdate) {
        onCustomAreaUpdate(
          customAreas.map(existingArea => 
            existingArea.id === area.id 
              ? { 
                  ...existingArea, 
                  isAnalyzing: false,
                  ndviValue: parseFloat((Math.random() * 0.5 + 0.2).toFixed(2)) 
                } 
              : existingArea
          ),
          area.id,
          false
        );
      }
      
    }, 2500);
  }, [customAreas, onCustomAreaUpdate]);

  const handleAnalyzeArea = useCallback(() => {
    console.log("Analyze function called with drawingPoints:", window.drawingPoints);
    
    try {
      // Use the exact points that were drawn on the map
      if (window.drawingPoints && window.drawingPoints.length >= 3) {
        console.log("EXACT USER DRAWN POINTS:", window.drawingPoints);
        const polygon = window.drawingPoints;
        const areaInAcres = calculateAreaInAcres(polygon);
        
        // Create a new custom area with the EXACT coordinates
        const newArea: CustomArea = {
          id: `custom-${Date.now()}`,
          name: `Custom Area ${customAreas.length + 1}`,
          polygon: polygon,
          ndviValue: null,
          isAnalyzing: true,
          area: areaInAcres
        };
        
        // Add the area to our state
        const updatedAreas = [...customAreas, newArea];
        setCustomAreas(updatedAreas);
        setSelectedCustomAreaId(newArea.id);
        
        // Clear pending area since we're committing it now
        setPendingArea(null);
        
        // Analyze the EXACT area that was just drawn
        console.log("Starting analysis of drawn area with ID:", newArea.id);
        analyzeCustomArea(newArea, areaInAcres);
        
        return true;
      } else if (pendingArea) {
        // Fallback to pending area if available
        console.log("Using pendingArea with coordinates:", pendingArea.polygon);
        
        const newArea: CustomArea = {
          id: `custom-${Date.now()}`,
          name: `Custom Area ${customAreas.length + 1}`,
          polygon: pendingArea.polygon,
          ndviValue: null,
          isAnalyzing: true,
          area: pendingArea.area
        };
        
        // Add the area to our state
        const updatedAreas = [...customAreas, newArea];
        setCustomAreas(updatedAreas);
        setSelectedCustomAreaId(newArea.id);
        setPendingArea(null);
        
        // Analyze the area
        analyzeCustomArea(newArea, pendingArea.area);
        return true;
      } else {
        console.error("No area to analyze - no drawing points found");
        toast.error("No area to analyze", {
          description: "Please draw an area on the map first."
        });
        return false;
      }
    } catch (error) {
      console.error("Error in analyze area:", error);
      toast.error("Error analyzing area", {
        description: "There was a problem processing your request. Please try again."
      });
      return false;
    }
  }, [pendingArea, customAreas, analyzeCustomArea, setCustomAreas, setSelectedCustomAreaId]);

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
      console.log("⭐ ANALYZE FUNCTION CALLED");
      
      // Create and dispatch a custom event to handle it in the DrawControl
      try {
        // First, check if we have drawing points
        if (window.drawingPoints && window.drawingPoints.length >= 3) {
          console.log("⭐ Using stored drawing points:", window.drawingPoints.length, "points");
          
          // Get the coordinates
          const coordinates = window.drawingPoints;
          
          // Create a visible analyzed area
          const newArea: CustomArea = {
            id: `direct-${Date.now()}`,
            name: `Analysis Result ${customAreas.length + 1}`,
            polygon: coordinates,
            ndviValue: null,
            isAnalyzing: true,
            area: calculateAreaInAcres(coordinates) || 10.0
          };
          
          // Show toast notification
          toast.info("Analyzing drawn area", {
            description: `Processing ${coordinates.length} points...`,
            duration: 3000
          });
          
          // Add to state
          setCustomAreas(prev => [...prev, newArea]);
          setSelectedCustomAreaId(newArea.id);
          
          // Dispatch an event to update the polygon style
          const visualEvent = new CustomEvent('analyzeDrawnArea', { 
            detail: { points: coordinates }
          });
          window.dispatchEvent(visualEvent);
          
          // Simulate analysis
          setTimeout(() => {
            const randomNdvi = parseFloat((Math.random() * 0.5 + 0.2).toFixed(2));
            
            setCustomAreas(prev => 
              prev.map(area => 
                area.id === newArea.id 
                  ? { ...area, ndviValue: randomNdvi, isAnalyzing: false }
                  : area
              )
            );
            
            toast.success("Analysis complete!", {
              description: `NDVI: ${randomNdvi.toFixed(2)} - View details in the analytics tab.`
            });
          }, 2000);
          
          return true;
        } else {
          console.error("⭐ No drawing points found");
          
          // Show error toast
          toast.error("No area drawn", {
            description: "Please draw an area on the map first."
          });
          
          return false;
        }
      } catch (error) {
        console.error("⭐ Error analyzing area:", error);
        toast.error("Analysis failed", {
          description: "Please try again with a new drawing."
        });
        return false;
      }
    };
    
    // Cleanup
    return () => {
      window.analyzeDrawnArea = undefined;
    };
  }, [customAreas, setCustomAreas, setSelectedCustomAreaId]);

  useEffect(() => {
    // Debug logging for custom areas
    console.log("🔍 CUSTOM AREAS UPDATED:", customAreas);
    if (customAreas.length > 0) {
      customAreas.forEach(area => {
        console.log(`Area ${area.id}: ${area.isAnalyzing ? 'Analyzing' : 'Analyzed'}, NDVI: ${area.ndviValue}, Points: ${area.polygon.length}`);
      });
    }
  }, [customAreas]);

  // Render function - mapped directly inside main component return
  const renderCustomAreas = () => {
    if (!customAreas || customAreas.length === 0) {
      return <div className="absolute top-4 left-4 bg-white p-2 rounded shadow z-[2000]">No custom areas</div>;
    }
    
    return (
      <>
        {/* Debug overlay to show custom areas status */}
        <div className="absolute top-4 left-4 bg-white p-2 rounded shadow z-[2000] max-w-xs max-h-40 overflow-auto">
          <h4 className="font-bold text-sm mb-1">Custom Areas ({customAreas.length})</h4>
          {customAreas.map(area => (
            <div key={area.id} className="text-xs mb-1">
              {area.name}: {area.isAnalyzing ? '⏳' : '✅'} 
              {area.ndviValue !== null ? ` NDVI: ${area.ndviValue.toFixed(2)}` : ''}
            </div>
          ))}
        </div>
      </>
    );
  };

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
        
        {/* Show "Analyze Area" button when a pending area exists */}
        {pendingArea && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[2000]">
            <Button
              variant="default"
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 shadow-lg"
              onClick={handleAnalyzeArea}
            >
              <LineChart className="h-5 w-5 mr-2" />
              Analyze Area
            </Button>
          </div>
        )}
        
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
            const isAnalyzed = !area.isAnalyzing && area.ndviValue !== null;
            
            return (
              <Polygon
                key={area.id}
                positions={area.polygon}
                pathOptions={{
                  color: isAnalyzed ? '#FF0000' : '#3B82F6',
                  fillColor: area.ndviValue ? ndviToColor(area.ndviValue) : '#3B82F6',
                  fillOpacity: isSelected ? 0.9 : isAnalyzed ? 0.8 : 0.5,
                  weight: isSelected ? 4 : isAnalyzed ? 3 : 1.5,
                  dashArray: area.isAnalyzing ? '5, 5' : ''
                }}
                eventHandlers={{
                  click: () => handleCustomAreaClick(area.id)
                }}
              >
                <Tooltip 
                  {...{
                    className: "bg-white/90 border-0 shadow-lg px-3 py-2",
                    permanent: isSelected || isAnalyzed
                  } as any}
                >
                  <div className="text-center">
                    <div className="font-medium flex items-center justify-between">
                      {area.name} {isAnalyzed && '✅'}
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
        
        {renderCustomAreas()}
      </div>
    </div>
  );
};

export default SatelliteMap; 