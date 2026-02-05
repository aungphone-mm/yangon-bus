'use client';

import { useEffect, useRef, useState } from 'react';
import { Stop, PathResult, StopLookup, PlannerGraph } from '@/types/transit';

// Leaflet types
declare global {
  interface Window {
    L: any;
  }
}

interface MapViewProps {
  stops?: Stop[];
  selectedStop?: Stop | null;
  originStop?: Stop | null;
  destinationStop?: Stop | null;
  previewStop?: Stop | null;
  transferPoints?: Stop[];
  currentPath?: PathResult | null;
  highlightedStops?: Stop[]; // Stops to highlight with their route polylines
  stopLookup?: StopLookup | null;
  graph?: PlannerGraph | null;
  onStopClick?: (stop: Stop) => void;
  center?: [number, number];
  zoom?: number;
}

// Helper function to check if map is ready with proper null checks
function checkMapReady(map: any): boolean {
  try {
    if (!map || !map._loaded) return false;
    const container = map.getContainer();
    if (!container) return false;
    const size = map.getSize();
    if (!size) return false;
    return size.x > 0 && size.y > 0;
  } catch (e) {
    return false;
  }
}

export default function MapView({
  stops = [],
  selectedStop,
  originStop = null,
  destinationStop = null,
  previewStop = null,
  transferPoints = [],
  currentPath = null,
  highlightedStops = [],
  stopLookup = null,
  graph = null,
  onStopClick,
  center = [16.8661, 96.1951], // Yangon center
  zoom = 12,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const userAccuracyCircleRef = useRef<any>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Detect mobile device immediately using window.innerWidth
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false; // Default to desktop for SSR
  });
  const [isMapLocked, setIsMapLocked] = useState(true); // Start locked on mobile

  // Detect mobile device and handle resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

      // Check if device is mobile at initialization time
      const isMobileDevice = window.innerWidth < 1024;

      const map = L.map(mapRef.current, {
        dragging: !isMobileDevice, // Enable on desktop, disable on mobile
        scrollWheelZoom: !isMobileDevice, // Enable on desktop, disable on mobile
        tap: true,
      }).setView(center, zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        markersRef.current.forEach(marker => marker.remove());
        polylinesRef.current.forEach(polyline => polyline.remove());
        if (userMarkerRef.current) userMarkerRef.current.remove();
        if (userAccuracyCircleRef.current) userAccuracyCircleRef.current.remove();
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Only initialize once

  // Toggle map dragging based on lock state and device type
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // On desktop, always enable dragging and zoom
    if (!isMobile) {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
    } else {
      // On mobile, respect the lock state
      if (isMapLocked) {
        map.dragging.disable();
        map.scrollWheelZoom.disable();
      } else {
        map.dragging.enable();
        map.scrollWheelZoom.enable();
      }
    }
  }, [isMapLocked, isMobile]);

  // Update map view when center or zoom changes
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    // Don't reset center/zoom if user is previewing a location
    if (previewStop) return;

    // Don't reset center/zoom if both origin and destination are set (auto-fit will handle it)
    if (originStop && destinationStop) return;

    const map = mapInstanceRef.current;

    // Check if map is ready with proper container size
    const isMapReady = () => checkMapReady(map);

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
  }, [center, zoom, previewStop, originStop, destinationStop]);

  // Update markers when stops change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    // Check if map is ready with proper container size
    const isMapReady = () => checkMapReady(map);

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
        const isOrigin = originStop?.id === stop.id;
        const isDestination = destinationStop?.id === stop.id;
        const isPreview = previewStop?.id === stop.id;
        const isTransfer = transferPoints.some(t => t.id === stop.id);
        const isHub = stop.is_hub;

        // Determine marker style
        let bgColor, borderColor, textColor, label, iconSize;

        if (isPreview) {
          bgColor = 'bg-blue-500';
          borderColor = 'border-white';
          textColor = 'text-white';
          label = '?';
          iconSize = [36, 36];
        } else if (isOrigin) {
          bgColor = 'bg-green-500';
          borderColor = 'border-white';
          textColor = 'text-white';
          label = 'A';
          iconSize = [32, 32];
        } else if (isDestination) {
          bgColor = 'bg-red-500';
          borderColor = 'border-white';
          textColor = 'text-white';
          label = 'B';
          iconSize = [32, 32];
        } else if (isTransfer) {
          bgColor = 'bg-orange-500';
          borderColor = 'border-white';
          textColor = 'text-white';
          label = '⇄';
          iconSize = [28, 28];
        } else if (isSelected) {
          bgColor = 'bg-primary';
          borderColor = 'border-white';
          textColor = 'text-white';
          label = '';
          iconSize = [30, 30];
        } else if (isHub) {
          bgColor = 'bg-yellow-400';
          borderColor = 'border-yellow-600';
          textColor = 'text-yellow-900';
          label = 'H';
          iconSize = [24, 24];
        } else {
          bgColor = 'bg-white';
          borderColor = 'border-primary';
          textColor = 'text-primary';
          label = '';
          iconSize = [24, 24];
        }

        const icon = L.divIcon({
          className: 'custom-marker',
          html: `
          <div class="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${bgColor} ${borderColor} ${textColor}"
            style="transform: translate(-50%, -50%);">
            ${label}
          </div>
        `,
          iconSize: iconSize,
          iconAnchor: [iconSize[0] / 2, iconSize[1] / 2],
        });

        const marker = L.marker([stop.lat, stop.lng], { icon })
          .addTo(map)
          .bindPopup(`
          <div class="p-2">
            <strong>${stop.name_en}</strong><br>
            <span class="text-gray-500">${stop.name_mm}</span><br>
            <span class="text-sm">${stop.township_en}</span><br>
            <span class="text-xs text-primary">${stop.route_count} လမ်းကြောင်းများ</span>
          </div>
        `);

        marker.on('click', () => {
          onStopClick?.(stop);
        });

        markersRef.current.push(marker);
      });
    }
  }, [stops, selectedStop, originStop, destinationStop, previewStop, transferPoints, onStopClick]);

  // Handle User Location Marker
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !userLocation) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    // Check if map is ready
    const isMapReady = () => checkMapReady(map);

    const addUserMarker = () => {
      try {
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(userLocation);
        } else {
          // Create a pulsing blue dot marker for user location
          userMarkerRef.current = L.circleMarker(userLocation, {
            radius: 10,
            fillColor: '#3b82f6', // Blue-500
            color: '#ffffff',
            weight: 3,
            opacity: 1,
            fillOpacity: 1
          }).addTo(map);

          userMarkerRef.current.bindPopup("<strong>သင်ရောက်ရှိနေသောနေရာ</strong>");
        }

        // Add or update accuracy circle (light blue circle around the marker)
        if (userAccuracyCircleRef.current) {
          userAccuracyCircleRef.current.setLatLng(userLocation);
        } else {
          userAccuracyCircleRef.current = L.circle(userLocation, {
            radius: 50, // 50 meters accuracy radius
            fillColor: '#3b82f6',
            color: '#3b82f6',
            weight: 1,
            opacity: 0.3,
            fillOpacity: 0.1
          }).addTo(map);
        }
      } catch (e) {
        console.error('Error adding user marker:', e);
      }
    };

    // Wait for map to be ready
    if (!isMapReady()) {
      const checkMapReady = setInterval(() => {
        if (isMapReady()) {
          clearInterval(checkMapReady);
          setTimeout(() => addUserMarker(), 50);
        }
      }, 100);
      return () => clearInterval(checkMapReady);
    }

    setTimeout(() => addUserMarker(), 50);
  }, [userLocation]);

  const handleLocate = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    // Unlock map on mobile when locating
    if (isMobile && isMapLocked) {
      setIsMapLocked(false);
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserLocation([latitude, longitude]);
        setIsLocating(false);

        // Update accuracy circle with actual GPS accuracy
        if (userAccuracyCircleRef.current) {
          userAccuracyCircleRef.current.setRadius(accuracy);
        }

        // Center map on user location with appropriate zoom
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsLocating(false);
        alert('Unable to retrieve your location');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Draw complete route polylines for all routes in current path
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !currentPath || !stopLookup || !graph) {
      // Clear existing polylines if no path
      polylinesRef.current.forEach(polyline => polyline.remove());
      polylinesRef.current = [];
      return;
    }

    const L = window.L;
    const map = mapInstanceRef.current;

    // Check if map is ready with better error handling
    const isMapReady = () => {
      try {
        if (!map || !map._loaded) return false;
        const container = map.getContainer();
        if (!container) return false;
        const size = map.getSize();
        if (!size) return false;
        return size.x > 0 && size.y > 0;
      } catch (e) {
        console.warn('Map ready check failed:', e);
        return false;
      }
    };

    const drawPolylines = () => {
      try {
        // Clear existing polylines
        polylinesRef.current.forEach(polyline => polyline.remove());
        polylinesRef.current = [];

        // Get all unique route IDs used in the journey
        const routeIds = new Set<string>();
        currentPath.segments.forEach(segment => {
          const routeUsed = segment.routeUsed || segment.routes[0];
          if (routeUsed) routeIds.add(routeUsed);
        });

        // Color map for routes
        const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b']; // blue, red, green, orange
        const routeColors = new Map<string, string>();
        Array.from(routeIds).forEach((routeId, index) => {
          routeColors.set(routeId, colors[index % colors.length]);
        });

        // For each route, draw the complete route line using graph adjacency
        routeIds.forEach((routeId) => {
          const color = routeColors.get(routeId) || '#3b82f6';
          let edgeCount = 0;

          // Iterate through all edges in the graph and draw those belonging to this route
          Object.entries(graph.adjacency).forEach(([fromIdStr, edges]) => {
            const fromId = parseInt(fromIdStr);
            const fromNode = graph.nodes[fromIdStr];
            if (!fromNode) return;

            edges.forEach(edge => {
              // Check if this edge belongs to the current route
              if (!edge.routes.includes(routeId)) return;

              const toNode = graph.nodes[edge.to.toString()];
              if (!toNode) return;

              const polyline = L.polyline(
                [[fromNode.lat, fromNode.lng], [toNode.lat, toNode.lng]],
                {
                  color: color,
                  weight: 4,
                  opacity: 0.5,
                  smoothFactor: 1
                }
              ).addTo(map);

              // Add popup showing route info
              polyline.bindPopup(`
                <div class="p-2">
                  <strong>လမ်းကြောင်း: ${routeId}</strong><br>
                  <span class="text-sm">${fromNode.name_mm} → ${toNode.name_mm}</span>
                </div>
              `);

              polylinesRef.current.push(polyline);

              // Add arrow every few edges to show direction
              if (edgeCount % 5 === 0) {
                const midLat = (fromNode.lat + toNode.lat) / 2;
                const midLng = (fromNode.lng + toNode.lng) / 2;

                const angle = Math.atan2(
                  toNode.lat - fromNode.lat,
                  toNode.lng - fromNode.lng
                ) * 180 / Math.PI + 90;

                const arrowIcon = L.divIcon({
                  className: 'arrow-icon',
                  html: `
                    <div style="
                      transform: rotate(${angle}deg);
                      width: 0;
                      height: 0;
                      border-left: 6px solid transparent;
                      border-right: 6px solid transparent;
                      border-bottom: 12px solid ${color};
                      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
                    "></div>
                  `,
                  iconSize: [12, 12],
                  iconAnchor: [6, 6]
                });

                const arrowMarker = L.marker([midLat, midLng], {
                  icon: arrowIcon,
                  interactive: false
                }).addTo(map);

                polylinesRef.current.push(arrowMarker);
              }

              edgeCount++;
            });
          });
        });
      } catch (e) {
        console.error('Error drawing polylines:', e);
      }
    };

    // Wait for map to be ready
    if (!isMapReady()) {
      const checkMapReady = setInterval(() => {
        if (isMapReady()) {
          clearInterval(checkMapReady);
          setTimeout(() => drawPolylines(), 50);
        }
      }, 100);
      return () => clearInterval(checkMapReady);
    }

    setTimeout(() => drawPolylines(), 50);
  }, [currentPath, stopLookup, graph]);

  // Draw route polylines for highlighted stops (used by picker tab)
  useEffect(() => {
    // Skip if currentPath is present (let the other effect handle it)
    if (!mapInstanceRef.current || !window.L || !graph || !highlightedStops?.length || currentPath) {
      return;
    }

    const L = window.L;
    const map = mapInstanceRef.current;

    const isMapReady = () => checkMapReady(map);

    const drawHighlightedRoutes = () => {
      try {
        // Clear existing polylines
        polylinesRef.current.forEach(polyline => polyline.remove());
        polylinesRef.current = [];

        // Get all route IDs from highlighted stops
        const routeIds = new Set<string>();

        highlightedStops.forEach(stop => {
          stop.routes.forEach(route => {
            routeIds.add(route.id);
          });
        });

        // Distinct colors for each route
        const distinctColors = [
          '#e63946', // red
          '#2a9d8f', // teal
          '#e9c46a', // yellow
          '#264653', // dark blue
          '#f4a261', // orange
          '#9b5de5', // purple
          '#00bbf9', // cyan
          '#00f5d4', // mint
          '#f15bb5', // pink
          '#fee440', // bright yellow
          '#3b82f6', // blue
          '#22c55e', // green
        ];

        // Assign colors to routes
        const routeColorMap = new Map<string, string>();
        Array.from(routeIds).forEach((routeId, index) => {
          routeColorMap.set(routeId, distinctColors[index % distinctColors.length]);
        });

        // Draw polylines for each route
        routeIds.forEach((routeId) => {
          const color = routeColorMap.get(routeId) || '#3b82f6';

          // Iterate through all edges in the graph
          Object.entries(graph.adjacency).forEach(([fromIdStr, edges]) => {
            const fromNode = graph.nodes[fromIdStr];
            if (!fromNode) return;

            edges.forEach(edge => {
              if (!edge.routes.includes(routeId)) return;

              const toNode = graph.nodes[edge.to.toString()];
              if (!toNode) return;

              const polyline = L.polyline(
                [[fromNode.lat, fromNode.lng], [toNode.lat, toNode.lng]],
                {
                  color: color,
                  weight: 4,
                  opacity: 0.6,
                  smoothFactor: 1
                }
              ).addTo(map);

              // Click on polyline to see route info
              polyline.bindPopup(`
                <div class="p-2">
                  <strong>လမ်းကြောင်း: ${routeId}</strong><br>
                  <span class="text-sm">${fromNode.name_mm} → ${toNode.name_mm}</span>
                </div>
              `);

              polylinesRef.current.push(polyline);
            });
          });
        });
      } catch (e) {
        console.error('Error drawing highlighted routes:', e);
      }
    };

    if (!isMapReady()) {
      const checkMapReadyInterval = setInterval(() => {
        if (isMapReady()) {
          clearInterval(checkMapReadyInterval);
          setTimeout(() => drawHighlightedRoutes(), 50);
        }
      }, 100);
      return () => clearInterval(checkMapReadyInterval);
    }

    setTimeout(() => drawHighlightedRoutes(), 50);
  }, [highlightedStops, graph, currentPath]);

  // Center on selected stop
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedStop) return;

    // Don't center on selected stop if both origin and destination are set (auto-fit will handle it)
    if (originStop && destinationStop) return;

    const map = mapInstanceRef.current;

    // Check if map is ready with proper container size
    const isMapReady = () => checkMapReady(map);

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
  }, [selectedStop, originStop, destinationStop]);

  // Center on preview stop when user is confirming location
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !previewStop) return;

    const map = mapInstanceRef.current;

    // Check if map is ready
    const isMapReady = () => checkMapReady(map);

    const centerOnPreview = () => {
      try {
        map.invalidateSize();
        map.setView([previewStop.lat, previewStop.lng], 16); // Higher zoom for preview
      } catch (e) {
        console.error('Error centering on preview stop:', e);
      }
    };

    // Wait for map to be ready
    if (!isMapReady()) {
      const checkMapReady = setInterval(() => {
        if (isMapReady()) {
          clearInterval(checkMapReady);
          setTimeout(() => centerOnPreview(), 100);
        }
      }, 100);
      return () => clearInterval(checkMapReady);
    }

    setTimeout(() => centerOnPreview(), 100);
  }, [previewStop]);

  // Center on origin or destination when only one is selected (planner tab)
  // Skip if preview stop is active (preview takes priority)
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    // Don't center on origin/destination if user is previewing a location
    if (previewStop) return;

    // Only center when exactly one of origin/destination is set (not both)
    const stopToCenter = originStop && !destinationStop ? originStop
      : destinationStop && !originStop ? destinationStop
        : null;

    if (!stopToCenter) return;

    const map = mapInstanceRef.current;

    // Check if map is ready
    const isMapReady = () => checkMapReady(map);

    const centerOnStop = () => {
      try {
        map.invalidateSize();
        map.setView([stopToCenter.lat, stopToCenter.lng], 15);
      } catch (e) {
        console.error('Error centering on origin/destination:', e);
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
  }, [originStop, destinationStop, previewStop]);

  // Auto-fit map bounds when both origin and destination are selected
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !originStop || !destinationStop) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    // Check if map is ready
    const isMapReady = () => checkMapReady(map);

    const fitBounds = () => {
      try {
        // Validate coordinates before creating bounds
        if (!originStop?.lat || !originStop?.lng || !destinationStop?.lat || !destinationStop?.lng) {
          console.warn('Invalid coordinates for bounds:', { originStop, destinationStop });
          return;
        }

        console.log('Fitting bounds:', {
          origin: [originStop.lat, originStop.lng],
          dest: [destinationStop.lat, destinationStop.lng]
        });

        map.invalidateSize();

        // Create bounds from origin and destination
        const bounds = L.latLngBounds(
          [originStop.lat, originStop.lng],
          [destinationStop.lat, destinationStop.lng]
        );

        // Validate bounds before fitting
        if (!bounds.isValid()) {
          console.warn('Invalid bounds check failed:', bounds);
          return;
        }

        // Fit map to bounds with padding
        map.fitBounds(bounds, { padding: [50, 50] });
      } catch (e) {
        console.error('Error fitting bounds:', e);
      }
    };

    // Wait for map to be ready
    if (!isMapReady()) {
      const checkMapReady = setInterval(() => {
        if (isMapReady()) {
          clearInterval(checkMapReady);
          setTimeout(() => fitBounds(), 100);
        }
      }, 100);
      return () => clearInterval(checkMapReady);
    }

    setTimeout(() => fitBounds(), 100);
  }, [originStop, destinationStop]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden">
      <div ref={mapRef} className="absolute inset-0" />

      {/* Map Controls (Lock & Locate) */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        {/* Locate Me Button */}
        <button
          onClick={handleLocate}
          className="bg-white rounded-lg shadow-lg p-2.5 hover:bg-gray-50 active:bg-gray-100 transition-all text-gray-700"
          title="ကျွန်ုပ်၏တည်နေရာ"
        >
          {isLocating ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>

        {/* Mobile Map Lock/Unlock Button */}
        {isMobile && (
          <>
            <button
              onClick={() => setIsMapLocked(!isMapLocked)}
              className={`bg-white rounded-lg shadow-lg p-2.5 hover:bg-gray-50 active:bg-gray-100 transition-all ${!isMapLocked ? 'ring-2 ring-green-500' : ''
                }`}
              aria-label={isMapLocked ? "မြေပုံသော့ဖွင့်ရန်" : "မြေပုံသော့ခတ်ရန်"}
              title={isMapLocked ? "မြေပုံကိုရွှေ့လျားကြည့်ရန် သော့ဖွင့်ပါ" : "မြေပုံကိုသော့ခတ်ပါ"}
            >
              {isMapLocked ? (
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            {isMapLocked && (
              <div className="mt-1 bg-gray-900/90 text-white text-[10px] px-2 py-1 rounded text-center whitespace-nowrap">
                သော့ခတ်ထားသည်
              </div>
            )}
          </>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2 sm:p-3 text-[10px] sm:text-xs z-[1000] max-w-[calc(100%-6rem)]">
        {(originStop || destinationStop) ? (
          <>
            {originStop && (
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-[10px]">A</div>
                <span className="truncate">စတင်ရာ</span>
              </div>
            )}
            {transferPoints.length > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-[10px]">⇄</div>
                <span className="truncate">ပြောင်းလဲစီးရာ</span>
              </div>
            )}
            {destinationStop && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-[10px]">B</div>
                <span className="truncate">ရောက်ရာ</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-yellow-400 rounded-full border border-yellow-600 flex-shrink-0"></div>
              <span className="truncate">အချက်အချာ</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white rounded-full border-2 border-primary flex-shrink-0"></div>
              <span className="truncate">မှတ်တိုင်</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-primary rounded-full flex-shrink-0"></div>
              <span className="truncate">ရွေးချယ်</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
