import Fuse from 'fuse.js';
import { Stop, StopLookup, SearchResult } from '@/types/transit';

let fuseInstance: Fuse<Stop> | null = null;
let stopsArray: Stop[] = [];

// Route search types and instances
export interface RouteSearchResult {
  id: string;
  name: string;
  color: string;
  stopCount: number;
}

let routeFuseInstance: Fuse<RouteSearchResult> | null = null;
let routesArray: RouteSearchResult[] = [];

/**
 * Initialize the search index with stop data
 */
export function initializeSearch(stopLookup: StopLookup): void {
  stopsArray = Object.values(stopLookup.stops);

  fuseInstance = new Fuse(stopsArray, {
    keys: [
      { name: 'name_en', weight: 1.5 },
      { name: 'name_mm', weight: 2.5 },
      { name: 'township_en', weight: 1 },
      { name: 'road_en', weight: 0.5 },
      { name: 'road_mm', weight: 1 },
    ],
    threshold: 0.5,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 1,
    ignoreLocation: true,
    distance: 100,
    findAllMatches: true,
  });
}

/**
 * Search for stops by name, township, or road
 */
export function searchStops(query: string, limit: number = 10): SearchResult[] {
  if (!fuseInstance || !query.trim()) {
    return [];
  }

  // Search with higher limit to account for potential duplicates
  const results = fuseInstance.search(query, { limit: limit * 3 });

  // Deduplicate by stop ID and spatial proximity
  const seenIds = new Set<number>();
  const uniqueResults: SearchResult[] = [];
  const DUPLICATE_RADIUS_METERS = 50; // Consider stops within 50m as duplicates

  for (const result of results) {
    if (seenIds.has(result.item.id)) {
      continue;
    }

    // Check if we already have a nearby stop with the same name
    const isDuplicate = uniqueResults.some(existing => {
      const isSameName = existing.stop.name_en === result.item.name_en &&
                        existing.stop.name_mm === result.item.name_mm;
      if (!isSameName) return false;

      const distance = haversineDistance(
        existing.stop.lat,
        existing.stop.lng,
        result.item.lat,
        result.item.lng
      );

      // If it's a spatial duplicate, merge the route counts
      if (distance <= DUPLICATE_RADIUS_METERS) {
        // Keep the stop with more routes, or better score if route counts are equal
        if (result.item.route_count > existing.stop.route_count ||
            (result.item.route_count === existing.stop.route_count &&
             (result.score || 0) < existing.score)) {
          // Replace with the better stop
          const index = uniqueResults.indexOf(existing);
          uniqueResults[index] = {
            stop: result.item,
            score: result.score || 0,
            matchedField: result.matches?.[0]?.key || 'name_en',
          };
          seenIds.add(result.item.id);
        }
        return true;
      }

      return false;
    });

    if (!isDuplicate) {
      seenIds.add(result.item.id);
      uniqueResults.push({
        stop: result.item,
        score: result.score || 0,
        matchedField: result.matches?.[0]?.key || 'name_en',
      });

      // Stop once we have enough unique results
      if (uniqueResults.length >= limit) {
        break;
      }
    }
  }

  return uniqueResults;
}

/**
 * Get stops by township
 */
export function getStopsByTownship(
  stopLookup: StopLookup,
  township: string
): Stop[] {
  const townshipData = stopLookup.by_township[township];
  if (!townshipData) return [];

  return townshipData.stops
    .map(s => stopLookup.stops[s.id])
    .filter(Boolean);
}

/**
 * Get all townships sorted by stop count
 */
export function getTownships(stopLookup: StopLookup): Array<{ name: string; count: number }> {
  return Object.entries(stopLookup.by_township)
    .map(([name, data]) => ({ name, count: data.stop_count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get nearby stops within radius (in meters)
 */
export function getNearbyStops(
  stopLookup: StopLookup,
  lat: number,
  lng: number,
  radiusMeters: number = 500
): Stop[] {
  const stops = Object.values(stopLookup.stops);

  return stops
    .map(stop => ({
      stop,
      distance: haversineDistance(lat, lng, stop.lat, stop.lng),
    }))
    .filter(item => item.distance <= radiusMeters)
    .sort((a, b) => a.distance - b.distance)
    .map(item => item.stop);
}

/**
 * Calculate distance between two coordinates in meters
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Get hub stops (stops with many routes)
 */
export function getHubs(stopLookup: StopLookup, limit: number = 20): Stop[] {
  return stopLookup.hubs
    .slice(0, limit)
    .map(hub => stopLookup.stops[hub.stop_id])
    .filter(Boolean);
}

/**
 * Get stop by ID
 */
export function getStopById(stopLookup: StopLookup, id: number): Stop | undefined {
  return stopLookup.stops[id];
}

/**
 * Initialize the route search index with route data
 */
export function initializeRouteSearch(stopLookup: StopLookup): void {
  const routeMap = new Map<string, RouteSearchResult>();

  // Build route map from stops
  Object.values(stopLookup.stops).forEach(stop => {
    stop.routes.forEach(route => {
      if (!routeMap.has(route.id)) {
        routeMap.set(route.id, {
          id: route.id,
          name: route.name,
          color: `#${route.color}`,
          stopCount: 0,
        });
      }
      const routeData = routeMap.get(route.id)!;
      routeData.stopCount++;
    });
  });

  routesArray = Array.from(routeMap.values()).sort((a, b) => a.id.localeCompare(b.id));

  routeFuseInstance = new Fuse(routesArray, {
    keys: [
      { name: 'id', weight: 2 },
      { name: 'name', weight: 1 },
    ],
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 1,
    ignoreLocation: true,
  });
}

/**
 * Search for routes by ID or name
 */
export function searchRoutes(query: string, limit: number = 10): RouteSearchResult[] {
  if (!routeFuseInstance || !query.trim()) {
    return [];
  }

  // Search with higher limit to account for potential duplicates
  const results = routeFuseInstance.search(query, { limit: limit * 2 });

  // Deduplicate by route ID (keep best score for each route)
  const seenIds = new Set<string>();
  const uniqueResults: RouteSearchResult[] = [];

  for (const result of results) {
    if (!seenIds.has(result.item.id)) {
      seenIds.add(result.item.id);
      uniqueResults.push(result.item);

      // Stop once we have enough unique results
      if (uniqueResults.length >= limit) {
        break;
      }
    }
  }

  return uniqueResults;
}
