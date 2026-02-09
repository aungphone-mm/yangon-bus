'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Stop, StopLookup, PlannerGraph, PathResult } from '@/types/transit';
import { usePathfinderWorker } from '@/lib/usePathfinderWorker';
import StopSearch from './StopSearch';

interface RoutePlannerProps {
  stopLookup: StopLookup;
  graph: PlannerGraph;

  onPathFound?: (paths: PathResult[]) => void;
  onRouteSelected?: (path: PathResult) => void;
  onOriginChange?: (stop: Stop | null) => void;
  onDestinationChange?: (stop: Stop | null) => void;
  onPreviewStop?: (stop: Stop | null) => void;
}

export default function RoutePlanner({
  stopLookup,
  graph,
  onPathFound,
  onRouteSelected,
  onOriginChange,
  onDestinationChange,
  onPreviewStop,
}: RoutePlannerProps) {
  const [origin, setOrigin] = useState<Stop | null>(null);
  const [destination, setDestination] = useState<Stop | null>(null);
  const [results, setResults] = useState<PathResult[] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<number | null>(null);

  // Preview states for confirming location
  const [previewOrigin, setPreviewOrigin] = useState<Stop | null>(null);
  const [previewDestination, setPreviewDestination] = useState<Stop | null>(null);

  // Use ref to avoid useEffect dependency issues
  const onPathFoundRef = useRef(onPathFound);
  onPathFoundRef.current = onPathFound;

  // Initialize the pathfinder worker
  const { findPath, isReady: workerReady } = usePathfinderWorker();

  // Notify parent of origin changes
  useEffect(() => {
    onOriginChange?.(origin);
  }, [origin, onOriginChange]);

  // Notify parent of destination changes
  useEffect(() => {
    onDestinationChange?.(destination);
  }, [destination, onDestinationChange]);

  // Notify parent of preview stop changes (for map zooming)
  useEffect(() => {
    const previewStop = previewOrigin || previewDestination;
    onPreviewStop?.(previewStop);
  }, [previewOrigin, previewDestination, onPreviewStop]);

  // Handlers for preview confirmation
  const handleConfirmOrigin = () => {
    if (previewOrigin) {
      setOrigin(previewOrigin);
      setPreviewOrigin(null);
    }
  };

  const handleCancelOriginPreview = () => {
    setPreviewOrigin(null);
  };

  const handleConfirmDestination = () => {
    if (previewDestination) {
      setDestination(previewDestination);
      setPreviewDestination(null);
    }
  };

  const handleCancelDestinationPreview = () => {
    setPreviewDestination(null);
  };

  // Find path when both stops are selected (using Web Worker)
  useEffect(() => {
    if (origin && destination && workerReady) {
      if (!graph || !graph.adjacency) {
        setError('ဒေတာမတင်ရသေးပါ။ ခဏစောင့်ပါ။');
        return;
      }

      setIsSearching(true);
      setError(null);

      console.log('Starting pathfinding via Web Worker...', { origin: origin.id, dest: destination.id });
      const startTime = performance.now();

      findPath(graph, origin.id, destination.id)
        .then((pathResults) => {
          const endTime = performance.now();
          console.log(`Pathfinding complete in ${endTime - startTime}ms`, pathResults);

          setResults(pathResults);
          setSelectedIndex(0);
          onPathFoundRef.current?.(pathResults);
        })
        .catch((err) => {
          console.error('Pathfinding error:', err);
          setError('လမ်းကြောင်းရှာရာတွင်အမှားရှိသည်။ ထပ်စမ်းကြည့်ပါ။');
          setResults(null);
        })
        .finally(() => {
          setIsSearching(false);
        });
    } else {
      setResults(null);
      setError(null);
    }
  }, [origin, destination, graph, workerReady, findPath]);

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleClear = () => {
    setOrigin(null);
    setDestination(null);
    setPreviewOrigin(null);
    setPreviewDestination(null);
    setResults(null);
    setError(null);
  };

  const handleRouteSelect = (index: number) => {
    setSelectedIndex(index);
    if (results && results[index]) {
      onRouteSelected?.(results[index]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-visible">
      {/* Input Section */}
      <div className="p-3 sm:p-4">
        <div className="flex gap-2">
          {/* Origin and Destination */}
          <div className="flex-1 space-y-3">
            {/* Origin */}
            <div>
              {previewOrigin ? (
                /* Preview Origin - Confirm Location */
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 border-2 border-blue-400 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">A</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{previewOrigin.name_en}</p>
                        <p className="text-sm text-gray-600 truncate">{previewOrigin.township_en}</p>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mb-2">မြေပုံပေါ်တွင် တည်နေရာကို စစ်ဆေးပါ</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleConfirmOrigin}
                        className="flex-1 py-2 px-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        အတည်ပြုရန်
                      </button>
                      <button
                        onClick={handleCancelOriginPreview}
                        className="py-2 px-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        မလုပ်တော့ပါ
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <StopSearch
                  stopLookup={stopLookup}
                  onSelectStop={setPreviewOrigin}
                  selectedStop={origin}
                  onClearStop={() => setOrigin(null)}
                  placeholder="စတင်မည့်နေရာရွေးရန်..."
                />
              )}
            </div>

            {/* Destination */}
            <div>
              {previewDestination ? (
                /* Preview Destination - Confirm Location */
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 border-2 border-blue-400 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">B</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{previewDestination.name_en}</p>
                        <p className="text-sm text-gray-600 truncate">{previewDestination.township_en}</p>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mb-2">မြေပုံပေါ်တွင် တည်နေရာကို စစ်ဆေးပါ</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleConfirmDestination}
                        className="flex-1 py-2 px-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        အတည်ပြုရန်
                      </button>
                      <button
                        onClick={handleCancelDestinationPreview}
                        className="py-2 px-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        မလုပ်တော့ပါ
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <StopSearch
                  stopLookup={stopLookup}
                  onSelectStop={setPreviewDestination}
                  selectedStop={destination}
                  onClearStop={() => setDestination(null)}
                  placeholder="သွားမည့်နေရာရွေးရန်..."
                />
              )}
            </div>
          </div>

          {/* Swap Button - positioned on the right */}
          <div className="flex items-center pt-6">
            <button
              onClick={handleSwap}
              disabled={!origin && !destination}
              className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-full transition-all disabled:opacity-30"
              aria-label="Swap origin and destination"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Clear Button */}
        {(origin || destination) && (
          <button
            onClick={handleClear}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mt-2"
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
        <div className="border-t border-gray-100 animate-slideDown">
          {results.some(r => r.found) ? (
            <div className="flex flex-col gap-3 p-3">
              {results.map((r, idx) => (
                <div key={idx} className="border rounded-lg overflow-hidden">
                  {/* Route Header - Clickable to select */}
                  <button
                    onClick={() => {
                      handleRouteSelect(idx);
                      setExpandedDetails(expandedDetails === idx ? null : idx);
                    }}
                    className={`w-full px-3 py-2 text-sm font-medium text-left transition-all duration-300 ${selectedIndex === idx
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    YBS {r.suggestedRoute} ({r.totalStops} မှတ်တိုင်)
                  </button>

                  {/* Summary for each route */}
                  <div className="p-3 bg-green-50">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-green-800">{r.totalStops}</p>
                        <p className="text-[10px] text-green-600">မှတ်တိုင်</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-800">
                          {(r.totalDistance / 1000).toFixed(1)}
                        </p>
                        <p className="text-[10px] text-green-600">ကီလိုမီတာ</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-800">{r.transfers}</p>
                        <p className="text-[10px] text-green-600">ပြောင်းလဲစီးခြင်း</p>
                      </div>
                    </div>
                    {r.suggestedRoute && (
                      <div className="mt-2">
                        <p className="text-xs text-green-700 text-center font-medium">
                          YBS <strong>{r.suggestedRoute}</strong>
                        </p>
                        {/* Transfer instructions */}
                        {r.transfers > 0 && r.segments.filter(s => s.isTransferPoint).map((segment, tidx) => {
                          const nextSegment = r.segments[r.segments.findIndex(s => s === segment) + 1];
                          return (
                            <p key={tidx} className="text-xs text-green-700 text-center mt-1" style={{ fontFamily: 'Myanmar3, Padauk, sans-serif' }}>
                              <strong>{segment.routeUsed}</strong> ဘတ်စ်ကားစီး၍ <strong>{segment.toName_mm || segment.toName}</strong> ဘတ်စ်ကားမှတ်တိုင်ရောက်လျှင် <strong>{nextSegment?.routeUsed}</strong> ဘတ်စ်ကားပြောင်းစီးပါ
                            </p>
                          );
                        })}
                      </div>
                    )}

                    {/* Walking Suggestions */}
                    {(r.walkingOrigin || r.walkingDestination) && (
                      <div className="mt-2 pt-2 border-t border-green-200">
                        <p className="text-xs font-semibold text-blue-700 text-center mb-1 flex items-center justify-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          ပိုကောင်းသောလမ်းကြောင်း
                        </p>

                        {r.walkingOrigin && (
                          <div className="flex items-center justify-center gap-2 p-2 bg-blue-50 rounded-lg mb-1">
                            <span className="text-lg">🚶</span>
                            <div className="text-xs text-blue-800" style={{ fontFamily: 'Myanmar3, Padauk, sans-serif' }}>
                              <strong>{r.walkingOrigin.originalStopName}</strong> မှ{' '}
                              <strong>{r.walkingOrigin.walkToStopName}</strong> သို့ လမ်းလျှောက်ပါ
                              <span className="ml-1 text-blue-600">
                                ({r.walkingOrigin.distanceMeters}m, ~{r.walkingOrigin.timeMinutes}မိနစ်)
                              </span>
                            </div>
                          </div>
                        )}

                        {r.walkingDestination && (
                          <div className="flex items-center justify-center gap-2 p-2 bg-blue-50 rounded-lg">
                            <span className="text-lg">🚶</span>
                            <div className="text-xs text-blue-800" style={{ fontFamily: 'Myanmar3, Padauk, sans-serif' }}>
                              <strong>{r.walkingDestination.walkFromStopName}</strong> မှ{' '}
                              <strong>{r.walkingDestination.originalStopName}</strong> သို့ လမ်းလျှောက်ပါ
                              <span className="ml-1 text-blue-600">
                                ({r.walkingDestination.distanceMeters}m, ~{r.walkingDestination.timeMinutes}မိနစ်)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expandable Details Section */}
                  <button
                    onClick={() => setExpandedDetails(expandedDetails === idx ? null : idx)}
                    className="w-full px-3 py-2 bg-gray-50 border-t flex items-center justify-between text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-medium">ခရီးစဉ်အသေးစိတ်</span>
                    <svg
                      className={`w-5 h-5 transition-transform duration-300 ${expandedDetails === idx ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Step by step - Collapsible */}
                  {expandedDetails === idx && (
                    <div className="p-3 max-h-[40vh] overflow-y-auto scrollbar-visible animate-slideDown border-t">
                      <div className="space-y-3">
                        {r.segments.map((segment, index) => (
                          <div key={index} className="flex gap-3">
                            {/* Line indicator */}
                            <div className="flex flex-col items-center">
                              <div className={`w-3 h-3 rounded-full ${index === 0
                                ? 'bg-green-500'
                                : segment.isTransferPoint
                                  ? 'bg-orange-500'
                                  : 'bg-gray-300'
                                }`}></div>
                              <div className={`w-0.5 flex-1 ${segment.isTransferPoint ? 'bg-orange-300' : 'bg-gray-200'
                                }`}></div>
                              {index === r.segments.length - 1 && (
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
                                  {segment.toName_mm && (
                                    <p className="text-xs text-orange-600 mt-1" style={{ fontFamily: 'Myanmar3, Padauk, sans-serif' }}>
                                      <strong>{segment.routeUsed}</strong> ဘတ်စ်ကားစီး၍ <strong>{segment.toName_mm}</strong> မှတ်တိုင်ရောက်လျှင် <strong>{r.segments[index + 1]?.routeUsed}</strong> ပြောင်းစီးပါ
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Show destination at end */}
                              {index === r.segments.length - 1 && (
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
                  )}
                </div>
              ))}
            </div>
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
