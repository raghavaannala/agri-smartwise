import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, useMap, FeatureGroup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { FieldBoundary, FarmNdviData, ndviToColor } from '@/services/ndviService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader, ZoomIn, ZoomOut, Layers, Info, Pencil, Map, Square, X } from 'lucide-react';
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
    
    // Expose the drawing function to window so it can be called from a button
    window.startDrawingPolygon = startDrawing;
    
    // Clean up
    return () => {
      map.off('click', handleMapClick);
      if (polygon) map.removeLayer(polygon);
      markersLayer.clearLayers();
      
      if (window.cancelDrawingButton) {
        window.cancelDrawingButton.remove();
      }
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
    <div className="absolute top-24 right-4 z-[3000] bg-white p-3 rounded-md shadow-lg border-2 border-blue-500">
      <Button
        variant="default"
        size="lg"
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-3"
        onClick={handleDraw}
      >
        <Pencil className="h-5 w-5" />
        <span className="text-base font-bold">Draw Custom Area</span>
      </Button>
    </div>
  );
};

interface SatelliteMapProps {
  ndviData?: FarmNdviData | null;
  isLoading: boolean;
  onInitialize?: () => void;
  onFieldSelect?: (fieldId: string | null) => void;
  selectedFieldId?: string | null;
}

const SatelliteMap: React.FC<SatelliteMapProps> = ({ 
  ndviData, 
  isLoading, 
  onInitialize,
  onFieldSelect,
  selectedFieldId 
}) => {
  const { t } = useTranslation();
  const [activeLayer, setActiveLayer] = useState<'satellite' | 'street' | 'topo'>('satellite');
  const [mapInitialized, setMapInitialized] = useState(false);
  const [hoveredFieldId, setHoveredFieldId] = useState<string | null>(null);
  const [customAreas, setCustomAreas] = useState<CustomArea[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [selectedCustomAreaId, setSelectedCustomAreaId] = useState<string | null>(null);
  
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
    // Create a new custom area
    const newArea: CustomArea = {
      id: `custom-${Date.now()}`,
      name: `Custom Area ${customAreas.length + 1}`,
      polygon,
      ndviValue: null,
      isAnalyzing: true
    };
    
    setCustomAreas(prev => [...prev, newArea]);
    setSelectedCustomAreaId(newArea.id);
    
    // Simulate NDVI calculation for the custom area
    setTimeout(() => {
      // Calculate a random NDVI value for the demo
      // In a real implementation, you would call an API to calculate this
      const randomNdvi = Math.random() * 0.6 + 0.2; // Between 0.2 and 0.8
      
      setCustomAreas(prev => 
        prev.map(area => 
          area.id === newArea.id 
            ? { ...area, ndviValue: parseFloat(randomNdvi.toFixed(2)), isAnalyzing: false } 
            : area
        )
      );
      
      toast.success("Analysis Complete", {
        description: `NDVI for ${newArea.name}: ${randomNdvi.toFixed(2)}`,
      });
    }, 2000);
    
    toast.info("Analyzing Area", {
      description: "Calculating NDVI for your custom area...",
    });
    
    // Exit drawing mode
    setIsDrawingMode(false);
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
    setSelectedCustomAreaId(selectedCustomAreaId === areaId ? null : areaId);
  };
  
  // Delete a custom area
  const handleDeleteCustomArea = (areaId: string) => {
    setCustomAreas(prev => prev.filter(area => area.id !== areaId));
    if (selectedCustomAreaId === areaId) {
      setSelectedCustomAreaId(null);
    }
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

  return (
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
                      {area.ndviValue && (
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
      
      {/* Drawing tools - always show when map is initialized */}
      {mapInitialized && !isLoading && (
        <div className="animate-pulse-once">
          <DrawingTools onStartDrawing={handleStartDrawing} />
        </div>
      )}
      
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
                <div className="flex items-center">
                  <Square className="h-3 w-3 mr-1.5 text-blue-500" />
                  <span>{area.name}</span>
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
  );
};

export default SatelliteMap; 