import Fuse from 'fuse.js';
import { Stop, StopLookup, SearchResult } from '@/types/transit';

let fuseInstance: Fuse<Stop> | null = null;
let stopsArray: Stop[] = [];

/**
 * Initialize the search index with stop data
 */
export function initializeSearch(stopLookup: StopLookup): void {
  stopsArray = Object.values(stopLookup.stops);

  fuseInstance = new Fuse(stopsArray, {
    keys: [
      { name: 'name_en', weight: 2 },
      { name: 'name_mm', weight: 2 },
      { name: 'township_en', weight: 1 },
      { name: 'road_en', weight: 0.5 },
    ],
    threshold: 0.3,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2,
  });
}

/**
 * Search for stops by name, township, or road
 */
export function searchStops(query: string, limit: number = 10): SearchResult[] {
  if (!fuseInstance || !query.trim()) {
    return [];
  }

  const results = fuseInstance.search(query, { limit });

  return results.map(result => ({
    stop: result.item,
    score: result.score || 0,
    matchedField: result.matches?.[0]?.key || 'name_en',
  }));
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
