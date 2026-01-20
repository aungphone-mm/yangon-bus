'use client';

import { useState, useEffect, useRef } from 'react';
import { Stop, StopLookup } from '@/types/transit';
import { searchStops, initializeSearch } from '@/lib/search';

interface StopSearchProps {
  stopLookup: StopLookup;
  onSelectStop: (stop: Stop) => void;
  placeholder?: string;
  className?: string;
}

export default function StopSearch({
  stopLookup,
  onSelectStop,
  placeholder = 'Search stops...',
  className = '',
}: StopSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Stop[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Initialize search on mount
  useEffect(() => {
    if (stopLookup && !initialized) {
      initializeSearch(stopLookup);
      setInitialized(true);
    }
  }, [stopLookup, initialized]);

  // Handle search
  useEffect(() => {
    if (!initialized) return;

    if (query.length >= 2) {
      const searchResults = searchStops(query, 8);
      setResults(searchResults.map(r => r.stop));
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query, initialized]);

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

  const handleSelect = (stop: Stop) => {
    setQuery(stop.name_en);
    setIsOpen(false);
    onSelectStop(stop);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
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
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
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

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {results.map((stop) => (
            <button
              key={stop.id}
              onClick={() => handleSelect(stop)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{stop.name_en}</p>
                  <p className="text-sm text-gray-500">{stop.name_mm}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {stop.township_en} • {stop.road_en}
                  </p>
                </div>
                <span className="ml-2 px-2 py-1 text-xs font-medium text-primary bg-primary/10 rounded-full">
                  {stop.route_count} routes
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
          No stops found for "{query}"
        </div>
      )}
    </div>
  );
}
