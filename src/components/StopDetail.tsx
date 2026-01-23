'use client';

import { Stop } from '@/types/transit';

interface StopDetailProps {
  stop: Stop;
  onClose?: () => void;
  onRouteClick?: (routeId: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export default function StopDetail({
  stop,
  onClose,
  onRouteClick,
  isFavorite = false,
  onToggleFavorite,
}: StopDetailProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-primary text-white p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-xl font-bold">{stop.name_en}</h2>
            <p className="text-white/80 text-lg">{stop.name_mm}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Favorite Button */}
            {onToggleFavorite && (
              <button
                onClick={onToggleFavorite}
                className={`p-2 rounded-full transition-all ${
                  isFavorite
                    ? 'bg-yellow-400 text-yellow-900'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
                title={isFavorite ? 'အကြိုက်ဆုံးမှဖယ်ရန်' : 'အကြိုက်ဆုံးထဲထည့်ရန်'}
              >
                <svg
                  className="w-5 h-5"
                  fill={isFavorite ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </button>
            )}
            {/* Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <span className="bg-white/20 px-2 py-1 rounded">
            {stop.township_en}
          </span>
          <span className="bg-white/20 px-2 py-1 rounded">
            {stop.road_en}
          </span>
          {stop.is_hub && (
            <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded font-medium">
              အချက်အချာ
            </span>
          )}
          {isFavorite && (
            <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              အကြိုက်ဆုံး
            </span>
          )}
        </div>
      </div>

      {/* Routes */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          ဤမှတ်တိုင်ရှိ လမ်းကြောင်းများ ({stop.route_count})
        </h3>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {stop.routes.map((route) => (
            <button
              key={`${route.id}-${route.position}`}
              onClick={() => onRouteClick?.(route.id)}
              className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
            >
              {/* Route Color Badge */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: `#${route.color}` }}
              >
                {route.id.length <= 3 ? route.id : route.id.substring(0, 2)}
              </div>

              {/* Route Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  လမ်းကြောင်း {route.id}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {route.name}
                </p>
                <p className="text-xs text-gray-400">
                  {route.agency}
                  {route.position !== 'middle' && (
                    <span className="ml-2 text-primary font-medium">
                      {route.position === 'start' ? 'ဤနေရာမှစတင်သည်' : 'ဤနေရာတွင်ဆုံးသည်'}
                    </span>
                  )}
                </p>
              </div>

              {/* Arrow */}
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Stop Info Footer */}
      <div className="border-t border-gray-100 p-4 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Stop ID: {stop.id}</span>
          <span>
            {stop.lat.toFixed(6)}, {stop.lng.toFixed(6)}
          </span>
        </div>
      </div>
    </div>
  );
}
