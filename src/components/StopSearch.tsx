'use client';

import { useState, useEffect, useRef } from 'react';
import { Stop, StopLookup } from '@/types/transit';
import { searchStops, initializeSearch } from '@/lib/search';

interface StopSearchProps {
  stopLookup: StopLookup;
  onSelectStop: (stop: Stop) => void;
  selectedStop?: Stop | null;
  onClearStop?: () => void;
  placeholder?: string;
  className?: string;
}

export default function StopSearch({
  stopLookup,
  onSelectStop,
  selectedStop = null,
  onClearStop,
  placeholder = 'Search stops...',
  className = '',
}: StopSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Stop[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Initialize search on mount or when stopLookup changes
  useEffect(() => {
    if (stopLookup) {
      initializeSearch(stopLookup);
      setInitialized(true);
    }
  }, [stopLookup]);

  // Handle search
  useEffect(() => {
    if (!initialized) return;

    // Skip search if user just selected a stop
    if (justSelected) {
      setJustSelected(false);
      return;
    }

    if (query.length >= 2) {
      const searchResults = searchStops(query, 8);
      setResults(searchResults.map(r => r.stop));
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query, initialized, justSelected]);

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
    setJustSelected(true);
    setQuery('');
    setIsOpen(false);
    onSelectStop(stop);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onClearStop?.();
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {selectedStop ? (
        /* Selected Badge Display */
        <div className="flex items-center gap-2 p-3 bg-green-50 border-2 border-green-500 rounded-lg group hover:bg-green-100 transition-colors">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate">{selectedStop.name_en}</p>
                <p className="text-sm text-gray-600 truncate">{selectedStop.township_en}</p>
              </div>
            </div>
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
      )}

      {/* Dropdown Results */}
      {!selectedStop && isOpen && results.length > 0 && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-[50vh] sm:max-h-[60vh] lg:max-h-80 overflow-y-auto">
          {results.map((stop) => (
            <button
              key={stop.id}
              onClick={() => handleSelect(stop)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{stop.name_en}</p>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">{stop.name_mm}</p>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1 truncate">
                    {stop.township_en} • {stop.road_en}
                  </p>
                </div>
                <span className="flex-shrink-0 px-2 py-1 text-[10px] sm:text-xs font-medium text-primary bg-primary/10 rounded-full whitespace-nowrap">
                  {stop.route_count}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {!selectedStop && isOpen && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-4 text-center text-gray-500">
          "{query}" အတွက် မှတ်တိုင်မတွေ့ရှိပါ
        </div>
      )}
    </div>
  );
}
