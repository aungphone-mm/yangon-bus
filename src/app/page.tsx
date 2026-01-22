'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Stop, StopLookup, PlannerGraph, PathResult } from '@/types/transit';
import { useFavorites } from '@/lib/useFavorites';
import StopSearch from '@/components/StopSearch';
import StopDetail from '@/components/StopDetail';
import RoutePlanner from '@/components/RoutePlanner';

// Dynamic import for map (avoid SSR issues with Leaflet)
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] bg-gray-100 animate-pulse flex items-center justify-center">
      <span className="text-gray-400">Loading map...</span>
    </div>
  ),
});

type Tab = 'search' | 'planner' | 'favorites' | 'hubs' | 'all-routes';

export default function Home() {
  const [stopLookup, setStopLookup] = useState<StopLookup | null>(null);
  const [graph, setGraph] = useState<PlannerGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [currentPath, setCurrentPath] = useState<PathResult | null>(null);
  const [showStopDetail, setShowStopDetail] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // Planner tab states
  const [plannerOrigin, setPlannerOrigin] = useState<Stop | null>(null);
  const [plannerDestination, setPlannerDestination] = useState<Stop | null>(null);

  // Favorites hook
  const {
    favorites,
    isLoaded: favoritesLoaded,
    isFavorite,
    toggleFavorite,
    clearFavorites,
    count: favoriteCount,
  } = useFavorites();

  // Memoize route metadata map
  const allRoutesMap = useMemo(() => {
    if (!stopLookup) return new Map();

    const routeMap = new Map<string, {
      id: string;
      name: string;
      color: string;
      stopCount: number;
      stops: Stop[];
    }>();

    Object.values(stopLookup.stops).forEach(stop => {
      stop.routes.forEach(route => {
        if (!routeMap.has(route.id)) {
          routeMap.set(route.id, {
            id: route.id,
            name: route.name,
            color: `#${route.color}`,
            stopCount: 0,
            stops: []
          });
        }
        const routeData = routeMap.get(route.id)!;
        routeData.stopCount++;
        routeData.stops.push(stop);
      });
    });

    return routeMap;
  }, [stopLookup]);

  // Memoize sorted routes array
  const allRoutesArray = useMemo(() =>
    Array.from(allRoutesMap.values()).sort((a, b) => a.id.localeCompare(b.id)),
    [allRoutesMap]
  );

  // Memoize filtered stops for selected route
  const filteredRouteStops = useMemo(() => {
    if (!selectedRouteId) return [];
    return allRoutesMap.get(selectedRouteId)?.stops || [];
  }, [selectedRouteId, allRoutesMap]);

  // Optimize favorite lookups with Set
  const favoriteSet = useMemo(() =>
    new Set(favorites.map(f => f.id)),
    [favorites]
  );

  const isFavoriteOptimized = useCallback((stopId: number) =>
    favoriteSet.has(stopId),
    [favoriteSet]
  );

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [stopsRes, graphRes] = await Promise.all([
          fetch('/data/stop_lookup.json'),
          fetch('/data/planner_graph.json'),
        ]);

        if (!stopsRes.ok || !graphRes.ok) {
          throw new Error('Failed to load transit data');
        }

        const [stopsData, graphData] = await Promise.all([
          stopsRes.json(),
          graphRes.json(),
        ]);

        setStopLookup(stopsData);
        setGraph(graphData);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleStopSelect = useCallback((stop: Stop) => {
    setSelectedStop(stop);
    setShowStopDetail(true);
  }, []);

  const handlePathFound = useCallback((path: PathResult) => {
    setCurrentPath(path);
  }, []);

  const handleToggleFavorite = useCallback((stop: Stop) => {
    toggleFavorite({
      id: stop.id,
      name_en: stop.name_en,
      name_mm: stop.name_mm,
      township_en: stop.township_en,
    });
  }, [toggleFavorite]);

  const handleRouteClick = useCallback((routeId: string) => {
    setSelectedRouteId(routeId);

    // Keep StopDetail open for search, favorites, hubs, and all-routes tabs
    // This allows users to repeatedly click routes to filter while viewing all available routes
    if (activeTab !== 'search' && activeTab !== 'favorites' && activeTab !== 'hubs' && activeTab !== 'all-routes') {
      setShowStopDetail(false);
      setSelectedStop(null);
    }
  }, [activeTab]);

  // Memoize favorite stops
  const favoriteStops = useMemo(() =>
    stopLookup ? favorites.map((f) => stopLookup.stops[f.id]).filter(Boolean) : [],
    [stopLookup, favorites]
  );

  // Memoize hub stops
  const hubStops = useMemo(() =>
    stopLookup
      ? stopLookup.hubs.slice(0, 30).map((h) => stopLookup.stops[h.stop_id]).filter(Boolean)
      : [],
    [stopLookup]
  );

  // Extract transfer points from path result
  const transferPoints = useMemo(() => {
    if (!currentPath || !stopLookup) return [];

    const transferStopIds = currentPath.segments
      .filter(segment => segment.isTransferPoint)
      .map(segment => segment.to);

    return transferStopIds
      .map(id => stopLookup.stops[id])
      .filter(Boolean);
  }, [currentPath, stopLookup]);

  // Memoize MapView stops prop
  const mapViewStops = useMemo(() => {
    if (activeTab === 'planner') {
      const stops = [];
      if (plannerOrigin) stops.push(plannerOrigin);
      // Add transfer points to the map so they can be rendered
      if (transferPoints.length > 0) stops.push(...transferPoints);
      if (plannerDestination) stops.push(plannerDestination);
      return stops;
    }
    if (activeTab === 'all-routes') {
      return selectedRouteId ? filteredRouteStops : Object.values(stopLookup?.stops || {});
    }
    // For search, favorites, and hubs tabs: show filtered route stops if a route is selected
    if (activeTab === 'search') {
      return selectedRouteId ? filteredRouteStops : (selectedStop ? [selectedStop] : []);
    }
    if (activeTab === 'favorites') {
      return selectedRouteId ? filteredRouteStops : favoriteStops;
    }
    if (activeTab === 'hubs') {
      return selectedRouteId ? filteredRouteStops : hubStops;
    }
    if (selectedStop) return [selectedStop];
    return [];
  }, [activeTab, hubStops, favoriteStops, plannerOrigin, plannerDestination, transferPoints, selectedRouteId, filteredRouteStops, stopLookup, selectedStop]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading Yangon Bus data...</p>
        </div>
      </div>
    );
  }

  if (error || !stopLookup || !graph) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <svg className="w-16 h-16 text-red-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-gray-800">Failed to Load Data</h2>
          <p className="mt-2 text-gray-600">{error || 'Please check your data files and try again.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <div>
                <h1 className="text-xl font-bold">Yangon Bus</h1>
                <p className="text-xs text-white/70">Find your route</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium">{stopLookup.metadata.total_stops} stops</p>
              <p className="text-white/70">{graph.metadata.total_nodes} connected</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'search' as Tab, label: 'Search', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
              { id: 'planner' as Tab, label: 'Planner', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
              { id: 'favorites' as Tab, label: 'Favorites', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', badge: favoriteCount },
              { id: 'hubs' as Tab, label: 'Hubs', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
              { id: 'all-routes' as Tab, label: 'All Routes', icon: 'M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowStopDetail(false);
                }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill={tab.id === 'favorites' && favoriteCount > 0 ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-white rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Panel */}
          <div className="space-y-4">
            {/* Search Tab */}
            {activeTab === 'search' && (
              <div className="animate-fade-in">
                <div className="bg-white rounded-lg shadow-lg p-4">
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">Find a Stop</h2>
                  <StopSearch
                    stopLookup={stopLookup}
                    onSelectStop={handleStopSelect}
                    placeholder="Search by name, township, or road..."
                  />
                </div>

                {showStopDetail && selectedStop && (
                  <div className="mt-4 animate-fade-in">
                    <StopDetail
                      stop={selectedStop}
                      onClose={() => {
                        setShowStopDetail(false);
                        setSelectedStop(null);
                        setSelectedRouteId(null);
                      }}
                      isFavorite={isFavorite(selectedStop.id)}
                      onToggleFavorite={() => handleToggleFavorite(selectedStop)}
                      onRouteClick={handleRouteClick}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Planner Tab */}
            {activeTab === 'planner' && (
              <div className="animate-fade-in">
                <RoutePlanner
                  stopLookup={stopLookup}
                  graph={graph}
                  onPathFound={handlePathFound}
                  onOriginChange={setPlannerOrigin}
                  onDestinationChange={setPlannerDestination}
                />
              </div>
            )}

            {/* Favorites Tab */}
            {activeTab === 'favorites' && (
              <div className="animate-fade-in">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-yellow-500 text-white p-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        My Favorite Stops
                      </h2>
                      {favoriteCount > 0 && (
                        <button
                          onClick={() => {
                            if (confirm('Clear all favorites?')) {
                              clearFavorites();
                            }
                          }}
                          className="text-sm text-white/80 hover:text-white transition-colors"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-white/80 mt-1">
                      {favoriteCount} saved stop{favoriteCount !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {favoriteCount === 0 ? (
                    <div className="p-8 text-center">
                      <svg className="w-16 h-16 text-gray-200 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <p className="mt-4 text-gray-500">No favorite stops yet</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Search for stops and tap the star to save them here
                      </p>
                      <button
                        onClick={() => setActiveTab('search')}
                        className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Search Stops
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto scrollbar-visible">
                      {favorites.map((fav) => {
                        const stop = stopLookup.stops[fav.id];
                        if (!stop) return null;
                        return (
                          <div
                            key={fav.id}
                            className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                          >
                            <button
                              onClick={() => handleStopSelect(stop)}
                              className="flex-1 text-left"
                            >
                              <p className="font-medium text-gray-900">{fav.name_en}</p>
                              <p className="text-sm text-gray-500">{fav.name_mm}</p>
                              <p className="text-xs text-gray-400 mt-1">{fav.township_en}</p>
                            </button>
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                              {stop.route_count} routes
                            </span>
                            <button
                              onClick={() => toggleFavorite(fav)}
                              className="p-2 text-yellow-500 hover:text-yellow-600 transition-colors"
                              title="Remove from favorites"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Show stop detail if selected from favorites */}
                {showStopDetail && selectedStop && (
                  <div className="mt-4 animate-fade-in">
                    <StopDetail
                      stop={selectedStop}
                      onClose={() => {
                        setShowStopDetail(false);
                        setSelectedStop(null);
                        setSelectedRouteId(null);
                      }}
                      isFavorite={isFavorite(selectedStop.id)}
                      onToggleFavorite={() => handleToggleFavorite(selectedStop)}
                      onRouteClick={handleRouteClick}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Hubs Tab */}
            {activeTab === 'hubs' && (
              <div className="animate-fade-in">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-secondary text-white p-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      Major Transfer Hubs
                    </h2>
                    <p className="text-sm text-white/80 mt-1">
                      Stops with the most bus routes
                    </p>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto scrollbar-visible">
                    {stopLookup.hubs.slice(0, 30).map((hub, index) => {
                      const stop = stopLookup.stops[hub.stop_id];
                      if (!stop) return null;
                      return (
                        <button
                          key={hub.stop_id}
                          onClick={() => handleStopSelect(stop)}
                          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                        >
                          <span className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{hub.name}</p>
                            <p className="text-sm text-gray-500">{hub.township}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isFavorite(hub.stop_id) && (
                              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            )}
                            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                              {hub.route_count} routes
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Show stop detail if selected from hubs */}
                {showStopDetail && selectedStop && (
                  <div className="mt-4 animate-fade-in">
                    <StopDetail
                      stop={selectedStop}
                      onClose={() => {
                        setShowStopDetail(false);
                        setSelectedStop(null);
                        setSelectedRouteId(null);
                      }}
                      isFavorite={isFavorite(selectedStop.id)}
                      onToggleFavorite={() => handleToggleFavorite(selectedStop)}
                      onRouteClick={handleRouteClick}
                    />
                  </div>
                )}
              </div>
            )}

            {/* All Routes Tab */}
            {activeTab === 'all-routes' && (
              <div className="animate-fade-in">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-primary text-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                        </svg>
                        <div>
                          <h2 className="text-lg font-bold">
                            {selectedRouteId ? allRoutesMap.get(selectedRouteId)?.name || 'Unknown Route' : 'All Routes'}
                          </h2>
                          <p className="text-sm text-white/80">
                            {selectedRouteId ? 'Route stops' : `${allRoutesArray.length} routes available`}
                          </p>
                        </div>
                      </div>
                      {selectedRouteId && (
                        <button
                          onClick={() => {
                            setSelectedRouteId(null);
                            setShowStopDetail(false);
                            setSelectedStop(null);
                          }}
                          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm transition-colors"
                        >
                          Show All
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto scrollbar-visible">
                    {!selectedRouteId ? (
                      // Show all routes list
                      allRoutesArray.map((route) => (
                        <button
                          key={route.id}
                          onClick={() => setSelectedRouteId(route.id)}
                          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div
                            className="w-10 h-10 rounded flex items-center justify-center font-bold text-white"
                            style={{ backgroundColor: route.color }}
                          >
                            {route.id}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{route.name}</p>
                            <p className="text-sm text-gray-500">{route.stopCount} stops</p>
                          </div>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))
                    ) : (
                      // Show stops for selected route
                      filteredRouteStops.map((stop: Stop) => (
                        <button
                          key={stop.id}
                          onClick={() => handleStopSelect(stop)}
                          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                            stop.is_hub ? 'bg-yellow-400 border-yellow-600 text-yellow-900' : 'bg-white border-primary text-primary'
                          }`}>
                            {stop.is_hub ? 'H' : ''}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{stop.name_en}</p>
                            <p className="text-sm text-gray-500">{stop.township_en}</p>
                          </div>
                          {isFavoriteOptimized(stop.id) && (
                            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  {/* Show stop detail if user clicked on a stop */}
                  {showStopDetail && selectedStop && (
                    <div className="p-4 border-t border-gray-200 animate-fade-in">
                      <StopDetail
                        stop={selectedStop}
                        onClose={() => {
                          setShowStopDetail(false);
                          setSelectedStop(null);
                        }}
                        isFavorite={isFavorite(selectedStop.id)}
                        onToggleFavorite={() => handleToggleFavorite(selectedStop)}
                        onRouteClick={handleRouteClick}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Map */}
          <div className="lg:sticky lg:top-20 h-[500px] lg:h-[calc(100vh-120px)]">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full">
              <MapView
                stops={mapViewStops}
                selectedStop={activeTab === 'all-routes' ? null : selectedStop}
                originStop={activeTab === 'planner' ? plannerOrigin : null}
                destinationStop={activeTab === 'planner' ? plannerDestination : null}
                transferPoints={activeTab === 'planner' ? transferPoints : []}
                onStopClick={handleStopSelect}
                center={activeTab === 'all-routes' ? [16.8661, 96.1951] : undefined}
                zoom={activeTab === 'all-routes' ? 11 : undefined}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img
              src="/logo.png"
              alt="Profile"
              className="h-12 w-12 rounded-full object-cover ring-2 ring-gray-600"
              onError={(e) => {
                // Hide image if it doesn't exist
                e.currentTarget.style.display = 'none';
              }}
            />
            <p className="text-gray-400">
              Yangon Bus Transit App • Data from YRTA
            </p>
          </div>
          <p className="text-gray-500 mt-1">
            {stopLookup.metadata.total_stops} stops • {graph.metadata.total_edges} connections
            {favoriteCount > 0 && ` • ${favoriteCount} favorites`}
          </p>
        </div>
      </footer>
    </div>
  );
}
