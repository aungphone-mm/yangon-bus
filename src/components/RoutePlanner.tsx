'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Stop, StopLookup, PlannerGraph, PathResult } from '@/types/transit';
import { findPathWithTransfers } from '@/lib/pathfinder';
import StopSearch from './StopSearch';

interface RoutePlannerProps {
  stopLookup: StopLookup;
  graph: PlannerGraph;
  onPathFound?: (paths: PathResult[]) => void;
  onRouteSelected?: (path: PathResult) => void;
  onOriginChange?: (stop: Stop | null) => void;
  onDestinationChange?: (stop: Stop | null) => void;
}

export default function RoutePlanner({
  stopLookup,
  graph,
  onPathFound,
  onRouteSelected,
  onOriginChange,
  onDestinationChange,
}: RoutePlannerProps) {
  const [origin, setOrigin] = useState<Stop | null>(null);
  const [destination, setDestination] = useState<Stop | null>(null);
  const [results, setResults] = useState<PathResult[] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use ref to avoid useEffect dependency issues
  const onPathFoundRef = useRef(onPathFound);
  onPathFoundRef.current = onPathFound;

  // Notify parent of origin changes
  useEffect(() => {
    onOriginChange?.(origin);
  }, [origin, onOriginChange]);

  // Notify parent of destination changes
  useEffect(() => {
    onDestinationChange?.(destination);
  }, [destination, onDestinationChange]);

  // Find path when both stops are selected
  useEffect(() => {
    if (origin && destination) {
      setIsSearching(true);
      setError(null);

      // Use requestAnimationFrame for better UI responsiveness
      const timeoutId = setTimeout(() => {
        try {
          console.log('Finding path from', origin.id, 'to', destination.id);
          const pathResults = findPathWithTransfers(graph, origin.id, destination.id);
          console.log('Path results:', pathResults);
          setResults(pathResults);
          setSelectedIndex(0);
          onPathFoundRef.current?.(pathResults);
        } catch (err) {
          console.error('Pathfinding error:', err);
          setError('လမ်းကြောင်းရှာရာတွင်အမှားရှိသည်။ ထပ်စမ်းကြည့်ပါ။');
          setResults(null);
        } finally {
          setIsSearching(false);
        }
      }, 150);

      return () => clearTimeout(timeoutId);
    } else {
      setResults(null);
      setError(null);
    }
  }, [origin, destination, graph]);

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleClear = () => {
    setOrigin(null);
    setDestination(null);
    setResults(null);
    setError(null);
  };

  const handleRouteSelect = (index: number) => {
    setSelectedIndex(index);
    if (results && results[index]) {
      onRouteSelected?.(results[index]);
    }
  };

  const result = results ? results[selectedIndex] : null;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-visible">
      {/* Header */}
      <div className="bg-secondary text-white p-4 rounded-t-lg">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          လမ်းကြောင်းစီစဉ်ရေး
        </h2>
      </div>

      {/* Input Section */}
      <div className="p-4 space-y-3">
        {/* Origin */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            မှ
          </label>
          <StopSearch
            stopLookup={stopLookup}
            onSelectStop={setOrigin}
            selectedStop={origin}
            onClearStop={() => setOrigin(null)}
            placeholder="စတင်မည့်နေရာရွေးရန်..."
          />
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwap}
            disabled={!origin && !destination}
            className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-full transition-all disabled:opacity-30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* Destination */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            သို့
          </label>
          <StopSearch
            stopLookup={stopLookup}
            onSelectStop={setDestination}
            selectedStop={destination}
            onClearStop={() => setDestination(null)}
            placeholder="သွားမည့်နေရာရွေးရန်..."
          />
        </div>

        {/* Clear Button */}
        {(origin || destination) && (
          <button
            onClick={handleClear}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            အားလုံးရှင်းရန်
          </button>
        )}
      </div>

      {/* Loading */}
      {isSearching && (
        <div className="p-4 border-t border-gray-100 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
          <p className="mt-2 text-sm text-gray-500">အကောင်းဆုံးလမ်းကြောင်းရှာနေသည်...</p>
        </div>
      )}

      {/* Error */}
      {error && !isSearching && (
        <div className="p-4 border-t border-gray-100 bg-red-50 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Results */}
      {results && !isSearching && !error && (
        <div className="border-t border-gray-100">
          {result && result.found ? (
            <>
              {/* Route Tabs */}
              {results.length > 1 && (
                <div className="flex border-b border-gray-100 overflow-x-auto">
                  {results.map((r, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRouteSelect(idx)}
                      className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                        selectedIndex === idx
                          ? 'border-primary text-primary bg-primary/5'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      လမ်းကြောင်း {idx + 1}
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        ({r.totalStops} မှတ်တိုင်)
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="p-4 bg-green-50">
                <div className="flex items-center gap-2 text-green-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">လမ်းကြောင်းတွေ့ပြီ!</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-800">{result.totalStops}</p>
                    <p className="text-xs text-green-600">မှတ်တိုင်</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-800">
                      {(result.totalDistance / 1000).toFixed(1)}
                    </p>
                    <p className="text-xs text-green-600">ကီလိုမီတာ</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-800">{result.transfers}</p>
                    <p className="text-xs text-green-600">ပြောင်းလဲစီးခြင်း</p>
                  </div>
                </div>
                {result.suggestedRoute && (
                  <div className="mt-3">
                    <p className="text-sm text-green-700 text-center font-medium">
                      လမ်းကြောင်းစီးရန် <strong>{result.suggestedRoute}</strong>
                    </p>
                    {/* Starting instruction with Burmese */}
                    {result.segments.length > 0 && result.segments[0].fromName_mm && (
                      <p className="text-xs text-green-700 text-center mt-1" style={{ fontFamily: 'Myanmar3, Padauk, sans-serif' }}>
                        <strong>{result.segments[0].fromName_mm}</strong> မှ <strong>{result.suggestedRoute}</strong> ဘတ်စ်ကားစီးပါ
                      </p>
                    )}
                    {/* Transfer instructions prominently displayed */}
                    {result.transfers > 0 && result.segments.filter(s => s.isTransferPoint).map((segment, idx) => {
                      const nextSegment = result.segments[result.segments.findIndex(s => s === segment) + 1];
                      return (
                        <div key={idx} className="mt-2">
                          {segment.toName_mm && (
                            <p className="text-xs text-green-700 text-center" style={{ fontFamily: 'Myanmar3, Padauk, sans-serif' }}>
                              <strong>{segment.routeUsed}</strong> ဘတ်စ်ကားစီး၍ <strong>{segment.toName_mm}</strong> ဘတ်စ်ကားမှတ်တိုင်ရောက်လျှင် <strong>{nextSegment?.routeUsed}</strong> ဘတ်စ်ကားပြောင်းစီးပါ
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step by step */}
              <div className="p-4 max-h-80 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  ခရီးစဉ်အသေးစိတ်
                </h3>
                <div className="space-y-3">
                  {result.segments.map((segment, index) => (
                    <div key={index} className="flex gap-3">
                      {/* Line indicator */}
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${
                          index === 0
                            ? 'bg-green-500'
                            : segment.isTransferPoint
                            ? 'bg-orange-500'
                            : 'bg-gray-300'
                        }`}></div>
                        <div className={`w-0.5 flex-1 ${
                          segment.isTransferPoint ? 'bg-orange-300' : 'bg-gray-200'
                        }`}></div>
                        {index === result.segments.length - 1 && (
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        )}
                      </div>

                      {/* Segment info */}
                      <div className="flex-1 pb-3">
                        <p className="font-medium text-gray-900">{segment.fromName}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {segment.routeUsed ? (
                            <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
                              လမ်းကြောင်း {segment.routeUsed}
                            </span>
                          ) : (
                            segment.routes.map(route => (
                              <span
                                key={route}
                                className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded"
                              >
                                {route}
                              </span>
                            ))
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {segment.distance}မီတာ နောက်မှတ်တိုင်သို့
                        </p>

                        {/* Transfer point indicator */}
                        {segment.isTransferPoint && (
                          <div className="mt-2 p-2 bg-orange-50 border-l-2 border-orange-400 rounded">
                            <p className="text-xs font-semibold text-orange-700 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                              ဘတ်စ်ပြောင်းစီးရမည့်နေရာ {segment.toName}
                            </p>
                            <p className="text-xs text-orange-600 mt-1">
                              ဘတ်စ်ကား <strong>{segment.routeUsed}</strong> ဖြင့်စီး၍ <strong>{segment.toName}</strong> ဘတ်စ်မှတ်တိုင်ရောက်လျှင် ဘတ်စ်ကား <strong>{result.segments[index + 1]?.routeUsed}</strong> သို့ပြောင်းစီးပါ
                            </p>
                            {segment.toName_mm && (
                              <p className="text-xs text-orange-600 mt-1" style={{ fontFamily: 'Myanmar3, Padauk, sans-serif' }}>
                                <strong>{segment.routeUsed}</strong> ဘတ်စ်ကားစီး၍ <strong>{segment.toName_mm}</strong> ဘတ်စ်ကားမှတ်တိုင်ရောက်လျှင် <strong>{result.segments[index + 1]?.routeUsed}</strong> ဘတ်စ်ကားပြောင်းစီးပါ
                              </p>
                            )}
                          </div>
                        )}

                        {/* Show destination at end */}
                        {index === result.segments.length - 1 && (
                          <div className="mt-3">
                            <p className="font-medium text-gray-900">{segment.toName}</p>
                            <p className="text-xs text-red-500">ရောက်ရှိမည့်နေရာ</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-gray-500">ဤမှတ်တိုင်များကြား လမ်းကြောင်းမတွေ့ပါ</p>
              <p className="text-sm text-gray-400">အခြားမှတ်တိုင်များကိုစမ်းကြည့်ပါ သို့မဟုတ် ချိတ်ဆက်မှုရှိမရှိစစ်ဆေးပါ</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
