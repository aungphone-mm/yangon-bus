'use client';

import { useState, useEffect } from 'react';
import { Stop, StopLookup } from '@/types/transit';
import StopSearch from './StopSearch';

interface LocationPickerProps {
    stopLookup: StopLookup;
    onOriginChange?: (stop: Stop | null) => void;
    onDestinationChange?: (stop: Stop | null) => void;
    onPreviewStop?: (stop: Stop | null) => void;
    onComplete?: (origin: Stop, destination: Stop) => void;
    selectedRoutes?: string[];
    onSelectRoutes?: (routeIds: string[]) => void;
}

export default function LocationPicker({
    stopLookup,
    onOriginChange,
    onDestinationChange,
    onPreviewStop,
    onComplete,
    selectedRoutes = [],
    onSelectRoutes,
}: LocationPickerProps) {
    const [origin, setOrigin] = useState<Stop | null>(null);
    const [destination, setDestination] = useState<Stop | null>(null);

    // Preview states for confirming location
    const [previewOrigin, setPreviewOrigin] = useState<Stop | null>(null);
    const [previewDestination, setPreviewDestination] = useState<Stop | null>(null);

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

    // Notify parent when both locations are confirmed
    useEffect(() => {
        if (origin && destination) {
            onComplete?.(origin, destination);
        }
    }, [origin, destination, onComplete]);

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
    };

    const isComplete = origin && destination;

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

            {/* Completion Status */}
            {isComplete && (
                <div className="border-t border-gray-100 p-4 bg-green-50 animate-slideDown">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-green-800">တည်နေရာရွေးချယ်ပြီးပါပြီ</p>
                            <p className="text-sm text-green-600">
                                {origin?.name_en} → {destination?.name_en}
                            </p>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">A</div>
                                <span className="text-xs text-gray-500">စတင်မည့်နေရာ</span>
                            </div>
                            <p className="font-medium text-gray-900 text-sm truncate">{origin?.name_en}</p>
                            <p className="text-xs text-gray-500 truncate">{origin?.township_en}</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">B</div>
                                <span className="text-xs text-gray-500">သွားမည့်နေရာ</span>
                            </div>
                            <p className="font-medium text-gray-900 text-sm truncate">{destination?.name_en}</p>
                            <p className="text-xs text-gray-500 truncate">{destination?.township_en}</p>
                        </div>
                    </div>

                    {/* Route List - Separate sections for Origin and Destination */}
                    {(() => {
                        // Collect all unique routes to assign colors consistently
                        const allRouteIds: string[] = [];
                        origin?.routes.forEach(r => { if (!allRouteIds.includes(r.id)) allRouteIds.push(r.id); });
                        destination?.routes.forEach(r => { if (!allRouteIds.includes(r.id)) allRouteIds.push(r.id); });

                        const distinctColors = [
                            '#e63946', '#2a9d8f', '#e9c46a', '#264653', '#f4a261',
                            '#9b5de5', '#00bbf9', '#00f5d4', '#f15bb5', '#fee440',
                            '#3b82f6', '#22c55e',
                        ];
                        const getRouteColor = (routeId: string) => {
                            const index = allRouteIds.indexOf(routeId);
                            return distinctColors[index % distinctColors.length];
                        };

                        return (
                            <div className="mt-4 space-y-3">
                                {/* Origin Routes */}
                                {origin && origin.routes.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                            <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">A</span>
                                            {origin.name_en} မှတ်တိုင်မှ ({origin.routes.length} လမ်းကြောင်း)
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {origin.routes.map((route) => {
                                                const isSelected = selectedRoutes.includes(route.id);
                                                return (
                                                    <button
                                                        key={route.id}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                onSelectRoutes?.(selectedRoutes.filter(id => id !== route.id));
                                                            } else {
                                                                onSelectRoutes?.([...selectedRoutes, route.id]);
                                                            }
                                                        }}
                                                        className={`flex items-center gap-1.5 px-2 py-1 border rounded text-xs font-medium shadow-sm transition-all cursor-pointer hover:scale-105 ${isSelected
                                                            ? 'ring-2 ring-offset-1 ring-blue-500 bg-blue-50'
                                                            : 'bg-white hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <span
                                                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: getRouteColor(route.id) }}
                                                        />
                                                        {route.id}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Destination Routes */}
                                {destination && destination.routes.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                            <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">B</span>
                                            {destination.name_en} မှတ်တိုင်မှ ({destination.routes.length} လမ်းကြောင်း)
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {destination.routes.map((route) => {
                                                const isSelected = selectedRoutes.includes(route.id);
                                                return (
                                                    <button
                                                        key={route.id}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                onSelectRoutes?.(selectedRoutes.filter(id => id !== route.id));
                                                            } else {
                                                                onSelectRoutes?.([...selectedRoutes, route.id]);
                                                            }
                                                        }}
                                                        className={`flex items-center gap-1.5 px-2 py-1 border rounded text-xs font-medium shadow-sm transition-all cursor-pointer hover:scale-105 ${isSelected
                                                            ? 'ring-2 ring-offset-1 ring-blue-500 bg-blue-50'
                                                            : 'bg-white hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <span
                                                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: getRouteColor(route.id) }}
                                                        />
                                                        {route.id}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
