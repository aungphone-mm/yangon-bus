'use client';

import { useEffect, useRef, useState } from 'react';
import { Stop } from '@/types/transit';

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
  transferPoints?: Stop[];
  onStopClick?: (stop: Stop) => void;
  center?: [number, number];
  zoom?: number;
}

export default function MapView({
  stops = [],
  selectedStop,
  originStop = null,
  destinationStop = null,
  transferPoints = [],
  onStopClick,
  center = [16.8661, 96.1951], // Yangon center
  zoom = 12,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

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
      const isOrigin = originStop?.id === stop.id;
      const isDestination = destinationStop?.id === stop.id;
      const isTransfer = transferPoints.some(t => t.id === stop.id);
      const isHub = stop.is_hub;

      // Determine marker style
      let bgColor, borderColor, textColor, label, iconSize;

      if (isOrigin) {
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
            <span class="text-xs text-primary">${stop.route_count} routes</span>
          </div>
        `);

      marker.on('click', () => {
        onStopClick?.(stop);
      });

      markersRef.current.push(marker);
    });
    }
  }, [stops, selectedStop, originStop, destinationStop, transferPoints, onStopClick]);

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

  // Auto-fit map bounds when both origin and destination are selected
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !originStop || !destinationStop) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    // Check if map is ready
    const isMapReady = () => {
      return map._loaded &&
             map.getContainer() &&
             map.getSize().x > 0 &&
             map.getSize().y > 0;
    };

    const fitBounds = () => {
      try {
        map.invalidateSize();

        // Create bounds from origin and destination
        const bounds = L.latLngBounds(
          [originStop.lat, originStop.lng],
          [destinationStop.lat, destinationStop.lng]
        );

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

      {/* Mobile Map Lock/Unlock Button */}
      {isMobile && (
        <button
          onClick={() => setIsMapLocked(!isMapLocked)}
          className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000] hover:bg-gray-50 active:bg-gray-100 transition-colors"
          aria-label={isMapLocked ? "Unlock map" : "Lock map"}
        >
          {isMapLocked ? (
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs z-[1000]">
        {(originStop || destinationStop) ? (
          <>
            {originStop && (
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-white font-bold">A</div>
                <span>Origin</span>
              </div>
            )}
            {transferPoints.length > 0 && (
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center text-white font-bold">⇄</div>
                <span>Transfer</span>
              </div>
            )}
            {destinationStop && (
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-white font-bold">B</div>
                <span>Destination</span>
              </div>
            )}
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
