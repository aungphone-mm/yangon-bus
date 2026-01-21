'use client';

import { useEffect, useRef } from 'react';
import { Stop, PathResult, PlannerGraph } from '@/types/transit';

// Leaflet types
declare global {
  interface Window {
    L: any;
  }
}

interface MapViewProps {
  stops?: Stop[];
  selectedStop?: Stop | null;
  path?: PathResult | null;
  graph?: PlannerGraph;
  onStopClick?: (stop: Stop) => void;
  center?: [number, number];
  zoom?: number;
  allRoutes?: Array<{
    id: string;
    name: string;
    color: string;
    segments: Array<{ from: [number, number]; to: [number, number] }>;
  }>;
}

export default function MapView({
  stops = [],
  selectedStop,
  path,
  graph,
  onStopClick,
  center = [16.8661, 96.1951], // Yangon center
  zoom = 12,
  allRoutes,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const pathLineRef = useRef<any>(null);
  const routeLinesRef = useRef<any[]>([]);

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const loadLeaflet = () => {
      return new Promise<void>((resolve) => {
        if (window.L) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    };

    loadLeaflet().then(() => {
      if (mapInstanceRef.current) return;

      const L = window.L;
      const map = L.map(mapRef.current).setView(center, zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        routeLinesRef.current.forEach(line => line.remove());
        markersRef.current.forEach(marker => marker.remove());
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map view when center or zoom changes
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    const map = mapInstanceRef.current;

    // Check if map is ready with proper container size
    const isMapReady = () => {
      return map._loaded &&
             map.getContainer() &&
             map.getSize().x > 0 &&
             map.getSize().y > 0;
    };

    const updateView = () => {
      try {
        // Invalidate size first
        map.invalidateSize();
        // Then set view
        map.setView(center, zoom);
      } catch (e) {
        console.error('Error updating map view:', e);
      }
    };

    // Wait for map to be ready
    if (!isMapReady()) {
      const checkMapReady = setInterval(() => {
        if (isMapReady()) {
          clearInterval(checkMapReady);
          setTimeout(() => updateView(), 100);
        }
      }, 100);
      return () => clearInterval(checkMapReady);
    }

    // Add delay even if map appears ready
    setTimeout(() => updateView(), 100);
  }, [center, zoom]);

  // Update markers when stops change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    // Check if map is ready with proper container size
    const isMapReady = () => {
      return map._loaded &&
             map.getContainer() &&
             map.getSize().x > 0 &&
             map.getSize().y > 0;
    };

    // Wait for map to be ready
    if (!isMapReady()) {
      const checkMapReady = setInterval(() => {
        if (isMapReady()) {
          clearInterval(checkMapReady);
          addMarkers();
        }
      }, 100);
      return () => clearInterval(checkMapReady);
    }

    addMarkers();

    function addMarkers() {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Add stop markers
      stops.forEach(stop => {
      const isSelected = selectedStop?.id === stop.id;
      const isHub = stop.is_hub;

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold
            ${isSelected ? 'bg-primary border-white scale-125' : isHub ? 'bg-yellow-400 border-yellow-600' : 'bg-white border-primary'}
            ${isSelected ? 'text-white' : isHub ? 'text-yellow-900' : 'text-primary'}"
            style="transform: translate(-50%, -50%);">
            ${isHub ? 'H' : ''}
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([stop.lat, stop.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div class="p-2">
            <strong>${stop.name_en}</strong><br>
            <span class="text-gray-500">${stop.name_mm}</span><br>
            <span class="text-sm">${stop.township_en}</span><br>
            <span class="text-xs text-primary">${stop.route_count} routes</span>
          </div>
        `);

      marker.on('click', () => {
        onStopClick?.(stop);
      });

      markersRef.current.push(marker);
    });
    }
  }, [stops, selectedStop, onStopClick]);

  // Draw path when available
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !graph) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    // Check if map is ready with proper container size
    const isMapReady = () => {
      return map._loaded &&
             map.getContainer() &&
             map.getSize().x > 0 &&
             map.getSize().y > 0;
    };

    // Wait for map to be ready
    if (!isMapReady()) {
      const checkMapReady = setInterval(() => {
        if (isMapReady()) {
          clearInterval(checkMapReady);
          drawPath();
        }
      }, 100);
      return () => clearInterval(checkMapReady);
    }

    drawPath();

    function drawPath() {
      if (!graph) return;

      // Remove existing path
      if (pathLineRef.current) {
        try {
          pathLineRef.current.remove();
        } catch (e) {
          // Ignore errors during cleanup
        }
        pathLineRef.current = null;
      }

      if (path?.found && path.path.length > 1) {
        const pathCoords = path.path
          .map(stopId => {
            const node = graph.nodes[stopId];
            return node ? [node.lat, node.lng] : null;
          })
          .filter(Boolean);

        if (pathCoords.length > 1) {
          try {
            // Invalidate size to ensure proper projection
            map.invalidateSize();

            pathLineRef.current = L.polyline(pathCoords, {
              color: '#405CAA',
              weight: 4,
              opacity: 0.8,
            }).addTo(map);

            // Add start marker
            const startNode = graph.nodes[path.path[0]];
            if (startNode) {
              const startMarker = L.circleMarker([startNode.lat, startNode.lng], {
                radius: 10,
                color: '#22c55e',
                fillColor: '#22c55e',
                fillOpacity: 1,
              }).addTo(map);
              markersRef.current.push(startMarker);
            }

            // Add end marker
            const endNode = graph.nodes[path.path[path.path.length - 1]];
            if (endNode) {
              const endMarker = L.circleMarker([endNode.lat, endNode.lng], {
                radius: 10,
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 1,
              }).addTo(map);
              markersRef.current.push(endMarker);
            }

            // Fit bounds to path
            if (pathLineRef.current) {
              map.fitBounds(pathLineRef.current.getBounds(), { padding: [50, 50] });
            }
          } catch (e) {
            console.error('Error drawing path:', e);
          }
        }
      }
    }
  }, [path, graph]);

  // Draw all route lines when available
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !allRoutes || allRoutes.length === 0) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    // Check if map is ready with proper container size
    const isMapReady = () => {
      return map._loaded &&
             map.getContainer() &&
             map.getSize().x > 0 &&
             map.getSize().y > 0;
    };

    // Wait for map to be ready
    if (!isMapReady()) {
      const checkMapReady = setInterval(() => {
        if (isMapReady()) {
          clearInterval(checkMapReady);
          // Add small delay to ensure map is fully ready
          setTimeout(() => drawRoutes(), 50);
        }
      }, 100);
      return () => clearInterval(checkMapReady);
    }

    // Add small delay even if map appears ready
    setTimeout(() => drawRoutes(), 50);

    function drawRoutes() {
      if (!allRoutes) return;

      // Invalidate size to ensure proper projection
      try {
        map.invalidateSize();
      } catch (e) {
        console.error('Error invalidating map size:', e);
      }

      // Clear existing route lines
      routeLinesRef.current.forEach(line => {
        try {
          line.remove();
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
      routeLinesRef.current = [];

      // Draw each route
      allRoutes.forEach(route => {
        route.segments.forEach(segment => {
          try {
            const line = L.polyline([segment.from, segment.to], {
              color: route.color,
              weight: 3,
              opacity: 0.7,
            }).addTo(map);

            // Add tooltip on hover
            line.bindTooltip(
              `<div class="text-sm"><strong>${route.name}</strong><br/>Route ${route.id}</div>`,
              { sticky: true }
            );

            routeLinesRef.current.push(line);
          } catch (e) {
            console.error('Error drawing route segment:', e);
          }
        });
      });
    }
  }, [allRoutes]);

  // Center on selected stop
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedStop) return;

    const map = mapInstanceRef.current;

    // Check if map is ready with proper container size
    const isMapReady = () => {
      return map._loaded &&
             map.getContainer() &&
             map.getSize().x > 0 &&
             map.getSize().y > 0;
    };

    const centerOnStop = () => {
      try {
        map.invalidateSize();
        map.setView([selectedStop.lat, selectedStop.lng], 15);
      } catch (e) {
        console.error('Error centering on stop:', e);
      }
    };

    // Wait for map to be ready
    if (!isMapReady()) {
      const checkMapReady = setInterval(() => {
        if (isMapReady()) {
          clearInterval(checkMapReady);
          setTimeout(() => centerOnStop(), 100);
        }
      }, 100);
      return () => clearInterval(checkMapReady);
    }

    setTimeout(() => centerOnStop(), 100);
  }, [selectedStop]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden">
      <div ref={mapRef} className="absolute inset-0" />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs z-[1000]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-4 bg-yellow-400 rounded-full border border-yellow-600"></div>
          <span>Hub (5+ routes)</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-4 bg-white rounded-full border-2 border-primary"></div>
          <span>Bus Stop</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary rounded-full"></div>
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
}
