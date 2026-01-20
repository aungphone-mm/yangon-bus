import { PlannerGraph, PathResult, PathSegment, GraphEdge } from '@/types/transit';

/**
 * Find the shortest path between two stops using BFS
 * Returns the path with fewest stops (not shortest distance)
 */
export function findPath(
  graph: PlannerGraph,
  startId: number,
  endId: number
): PathResult {
  // Edge cases
  if (startId === endId) {
    return {
      found: true,
      path: [startId],
      segments: [],
      totalDistance: 0,
      totalStops: 1,
      transfers: 0,
      suggestedRoute: null,
    };
  }

  if (!graph.adjacency[startId] || !graph.adjacency[endId]) {
    return {
      found: false,
      path: [],
      segments: [],
      totalDistance: 0,
      totalStops: 0,
      transfers: 0,
      suggestedRoute: null,
    };
  }

  // BFS for shortest path (fewest stops)
  const queue: number[] = [startId];
  const visited = new Set<number>([startId]);
  const parent = new Map<number, { from: number; edge: GraphEdge }>();

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === endId) {
      // Reconstruct path
      return reconstructPath(graph, parent, startId, endId);
    }

    const neighbors = graph.adjacency[current] || [];
    for (const edge of neighbors) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        parent.set(edge.to, { from: current, edge });
        queue.push(edge.to);
      }
    }
  }

  return {
    found: false,
    path: [],
    segments: [],
    totalDistance: 0,
    totalStops: 0,
    transfers: 0,
    suggestedRoute: null,
  };
}

/**
 * Reconstruct the path from BFS result
 */
function reconstructPath(
  graph: PlannerGraph,
  parent: Map<number, { from: number; edge: GraphEdge }>,
  startId: number,
  endId: number
): PathResult {
  const path: number[] = [];
  const segments: PathSegment[] = [];
  let current = endId;
  let totalDistance = 0;

  // Build path backwards
  while (current !== startId) {
    path.unshift(current);
    const info = parent.get(current)!;

    const fromNode = graph.nodes[info.from];
    const toNode = graph.nodes[current];

    segments.unshift({
      from: info.from,
      to: current,
      fromName: fromNode?.name_en || `Stop ${info.from}`,
      toName: toNode?.name_en || `Stop ${current}`,
      routes: info.edge.routes,
      distance: info.edge.distance,
    });

    totalDistance += info.edge.distance;
    current = info.from;
  }
  path.unshift(startId);

  // Find suggested route (one that covers most of the journey)
  const suggestedRoute = findBestRoute(segments);

  // Count transfers
  const transfers = countTransfers(segments, suggestedRoute);

  return {
    found: true,
    path,
    segments,
    totalDistance,
    totalStops: path.length,
    transfers,
    suggestedRoute,
  };
}

/**
 * Find the route that covers most segments
 */
function findBestRoute(segments: PathSegment[]): string | null {
  if (segments.length === 0) return null;

  const routeCounts: Record<string, number> = {};

  for (const segment of segments) {
    for (const route of segment.routes) {
      routeCounts[route] = (routeCounts[route] || 0) + 1;
    }
  }

  let bestRoute = '';
  let bestCount = 0;

  Object.entries(routeCounts).forEach(([route, count]) => {
    if (count > bestCount) {
      bestCount = count;
      bestRoute = route;
    }
  });

  return bestRoute || null;
}

/**
 * Count the number of transfers needed
 */
function countTransfers(segments: PathSegment[], suggestedRoute: string | null): number {
  if (segments.length <= 1 || !suggestedRoute) return 0;

  let transfers = 0;
  let currentRoute = suggestedRoute;

  for (const segment of segments) {
    if (!segment.routes.includes(currentRoute)) {
      transfers++;
      // Pick the best route for remaining journey
      currentRoute = segment.routes[0];
    }
  }

  return transfers;
}

/**
 * Find path with preference for fewer transfers (Dijkstra-like)
 */
export function findPathWithTransfers(
  graph: PlannerGraph,
  startId: number,
  endId: number
): PathResult {
  // For now, use BFS - can enhance later with transfer-weighted Dijkstra
  return findPath(graph, startId, endId);
}

/**
 * Get all routes that connect two stops directly
 */
export function getDirectRoutes(
  graph: PlannerGraph,
  stopA: number,
  stopB: number
): string[] {
  const edges = graph.adjacency[stopA] || [];
  const edge = edges.find(e => e.to === stopB);
  return edge?.routes || [];
}

/**
 * Check if two stops are directly connected
 */
export function areDirectlyConnected(
  graph: PlannerGraph,
  stopA: number,
  stopB: number
): boolean {
  const edges = graph.adjacency[stopA] || [];
  return edges.some(e => e.to === stopB);
}
