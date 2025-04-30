import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { useToast } from '@/components/ui/use-toast';

// Extend window interface to expose our functions
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

interface DrawControlProps {
  onAreaDrawn: (polygon: [number, number][]) => void;
}

const DrawControl: React.FC<DrawControlProps> = ({ onAreaDrawn }) => {
  const map = useMap();
  const { toast } = useToast();
  const drawingRef = useRef<{
    points: [number, number][];
    markers: L.Marker[];
    lines: L.Polyline[];
    polygon: L.Polygon | null;
    active: boolean;
  }>({
    points: [],
    markers: [],
    lines: [],
    polygon: null,
    active: false
  });

  useEffect(() => {
    // Initialize the drawing control
    const startDrawing = () => {
      console.log('Starting drawing mode');
      
      // Reset any existing drawing
      cancelDrawing();
      
      // Set drawing state
      drawingRef.current.active = true;
      drawingRef.current.points = [];
      drawingRef.current.markers = [];
      drawingRef.current.lines = [];
      drawingRef.current.polygon = null;
      
      // Set window state for external access
      window.drawingPoints = [];
      window.drawingPolygon = null;
      
      // Show toast with instructions
      toast({
        title: "Drawing Mode Activated",
        description: "Click on the map to place points. Double-click to complete the area."
      });
      
      // Add click handler
      map.on('click', handleMapClick);
      
      // Add completion controls
      addCompleteDrawingButton();
      addCancelDrawingButton();
      
      // Add visual cue that drawing is active
      document.querySelector('.leaflet-container')?.classList.add('drawing-active');
    };
    
    // Map click handler
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (!drawingRef.current.active) return;
      
      const coordinates: [number, number] = [e.latlng.lat, e.latlng.lng];
      console.log('Map clicked at', coordinates);
      
      // Add to points
      drawingRef.current.points.push(coordinates);
      window.drawingPoints = [...drawingRef.current.points];
      
      // Add a marker
      const marker = L.marker(e.latlng, {
        icon: L.divIcon({
          className: 'drawing-vertex',
          html: '<div class="drawing-point"></div>',
          iconSize: [10, 10]
        })
      }).addTo(map);
      
      drawingRef.current.markers.push(marker);
      
      // Add a line if this is not the first point
      if (drawingRef.current.points.length > 1) {
        const lastPoint = drawingRef.current.points[drawingRef.current.points.length - 2];
        const line = L.polyline([lastPoint, coordinates], {
          color: '#3B82F6',
          weight: 2,
          opacity: 0.7,
          dashArray: '5, 5'
        }).addTo(map);
        
        drawingRef.current.lines.push(line);
      }
      
      // If we have at least 3 points, also show the polygon preview
      if (drawingRef.current.points.length >= 3) {
        updatePolygonPreview();
      }
      
      // If user double-clicks, complete the drawing
      if (e.originalEvent.detail === 2) {
        completeDrawing();
      }
    };
    
    // Update polygon preview
    const updatePolygonPreview = () => {
      // Remove existing polygon
      if (drawingRef.current.polygon) {
        map.removeLayer(drawingRef.current.polygon);
      }
      
      // Create new polygon
      const polygon = L.polygon(drawingRef.current.points, {
        color: '#3B82F6',
        weight: 2,
        opacity: 0.5,
        fillOpacity: 0.2
      }).addTo(map);
      
      drawingRef.current.polygon = polygon;
      window.drawingPolygon = polygon;
    };
    
    // Complete drawing
    const completeDrawing = () => {
      if (!drawingRef.current.active || drawingRef.current.points.length < 3) {
        toast({
          title: "Not enough points",
          description: "Please add at least 3 points to create an area.",
          variant: "destructive"
        });
        return;
      }
      
      console.log('Completing drawing with points:', drawingRef.current.points);
      
      // Create final polygon
      if (drawingRef.current.polygon) {
        map.removeLayer(drawingRef.current.polygon);
      }
      
      const finalPoints = [...drawingRef.current.points];
      
      // Clean up
      cleanupDrawing();
      
      // Notify parent component
      onAreaDrawn(finalPoints);
    };
    
    // Cancel drawing
    const cancelDrawing = () => {
      if (!drawingRef.current.active) return;
      
      console.log('Canceling drawing');
      cleanupDrawing();
      toast({
        title: "Drawing canceled"
      });
    };
    
    // Clean up drawing
    const cleanupDrawing = () => {
      // Remove all markers and lines
      drawingRef.current.markers.forEach(marker => map.removeLayer(marker));
      drawingRef.current.lines.forEach(line => map.removeLayer(line));
      
      if (drawingRef.current.polygon) {
        map.removeLayer(drawingRef.current.polygon);
      }
      
      // Remove map click handler
      map.off('click', handleMapClick);
      
      // Remove completion controls
      if (window.closeDrawingButton) {
        window.closeDrawingButton.remove();
        window.closeDrawingButton = null;
      }
      
      if (window.cancelDrawingButton) {
        window.cancelDrawingButton.remove();
        window.cancelDrawingButton = null;
      }
      
      // Reset state
      drawingRef.current.active = false;
      drawingRef.current.points = [];
      drawingRef.current.markers = [];
      drawingRef.current.lines = [];
      drawingRef.current.polygon = null;
      
      // Reset window state
      window.drawingPoints = [];
      window.drawingPolygon = null;
      
      // Remove visual cue
      document.querySelector('.leaflet-container')?.classList.remove('drawing-active');
    };
    
    // Add complete drawing button to top right corner
    const addCompleteDrawingButton = () => {
      const CompleteDrawingButton = L.Control.extend({
        onAdd: function() {
          const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
          container.innerHTML = `
            <a href="#" title="Complete Drawing" style="display: flex; align-items: center; justify-content: center; font-weight: bold; background-color: #22c55e; color: white;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </a>
          `;
          
          container.style.cursor = 'pointer';
          
          // Add click event
          container.querySelector('a')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            completeDrawing();
          });
          
          return container;
        }
      });
      
      window.closeDrawingButton = new CompleteDrawingButton({ position: 'topright' }).addTo(map);
    };
    
    // Add cancel drawing button
    const addCancelDrawingButton = () => {
      const container = L.DomUtil.create('div', 'leaflet-drawing-cancel');
      container.innerHTML = `
        <button style="position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 1000; 
                       padding: 8px 16px; background-color: white; border: 1px solid #e2e8f0; 
                       border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
                       display: flex; align-items: center; font-size: 14px; color: #64748b;">
          <span style="margin-right: 8px;">Drawing Area</span>
          <span style="font-size: 12px; background-color: #f1f5f9; color: #64748b; 
                        padding: 2px 6px; border-radius: 4px; cursor: pointer;">
            Cancel
          </span>
        </button>
      `;
      
      // Add click event to the cancel button
      container.querySelector('span:last-child')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        cancelDrawing();
      });
      
      document.body.appendChild(container);
      window.cancelDrawingButton = container;
    };
    
    // Expose the startDrawing function
    window.startDrawingPolygon = startDrawing;
    
    // Clean up when component unmounts
    return () => {
      cancelDrawing();
      window.startDrawingPolygon = undefined;
    };
  }, [map, onAreaDrawn, toast]);
  
  return null;
};

export default DrawControl; 