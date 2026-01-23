'use client';

import { useState, useEffect, useRef } from 'react';
import { StopLookup } from '@/types/transit';
import { searchRoutes, initializeRouteSearch, RouteSearchResult } from '@/lib/search';

interface RouteSearchProps {
  stopLookup: StopLookup;
  onSelectRoute: (routeId: string) => void;
  selectedRouteId?: string | null;
  onClearRoute?: () => void;
  placeholder?: string;
  className?: string;
}

export default function RouteSearch({
  stopLookup,
  onSelectRoute,
  selectedRouteId = null,
  onClearRoute,
  placeholder = 'လမ်းကြောင်းနံပါတ်ဖြင့်ရှာရန် (ဥပမာ 61, 78, YBS-1)...',
  className = '',
}: RouteSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RouteSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteSearchResult | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Initialize search on mount or when stopLookup changes
  useEffect(() => {
    if (stopLookup) {
      initializeRouteSearch(stopLookup);
      setInitialized(true);
    }
  }, [stopLookup]);

  // Handle search
  useEffect(() => {
    if (!initialized) return;

    // Skip search if user just selected a route
    if (justSelected) {
      setJustSelected(false);
      return;
    }

    if (query.length >= 1) {
      const searchResults = searchRoutes(query, 10);
      setResults(searchResults);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query, initialized, justSelected]);

  // Update selected route when selectedRouteId changes
  useEffect(() => {
    if (selectedRouteId && initialized) {
      const searchResults = searchRoutes(selectedRouteId, 1);
      if (searchResults.length > 0) {
        setSelectedRoute(searchResults[0]);
      }
    } else {
      setSelectedRoute(null);
    }
  }, [selectedRouteId, initialized]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (route: RouteSearchResult) => {
    setJustSelected(true);
    setQuery('');
    setIsOpen(false);
    setSelectedRoute(route);
    onSelectRoute(route.id);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedRoute(null);
    onClearRoute?.();
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {selectedRoute ? (
        /* Selected Badge Display */
        <div className="flex items-center gap-2 p-3 bg-blue-50 border-2 border-blue-500 rounded-lg group hover:bg-blue-100 transition-colors">
          <div
            className="w-10 h-10 rounded flex items-center justify-center font-bold text-white flex-shrink-0"
            style={{ backgroundColor: selectedRoute.color }}
          >
            {selectedRoute.id}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{selectedRoute.name}</p>
            <p className="text-sm text-gray-600">{selectedRoute.stopCount} မှတ်တိုင်</p>
          </div>
          <button
            onClick={handleClear}
            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded-full transition-colors"
            title="ရွေးချယ်မှုဖျက်ရန်"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        /* Search Input */
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 pl-10 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Dropdown Results */}
      {!selectedRoute && isOpen && results.length > 0 && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-[40vh] sm:max-h-80 overflow-y-auto">
          {results.map((route) => (
            <button
              key={route.id}
              onClick={() => handleSelect(route)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded flex items-center justify-center font-bold text-white flex-shrink-0 text-xs sm:text-sm"
                  style={{ backgroundColor: route.color }}
                >
                  {route.id}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{route.name}</p>
                  <p className="text-xs sm:text-sm text-gray-500">{route.stopCount} မှတ်တိုင်</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {!selectedRoute && isOpen && query.length >= 1 && results.length === 0 && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-4 text-center text-gray-500">
          "{query}" အတွက် လမ်းကြောင်းမတွေ့ရှိပါ
        </div>
      )}
    </div>
  );
}
