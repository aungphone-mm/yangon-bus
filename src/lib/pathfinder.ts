import { PlannerGraph, PathResult, PathSegment, GraphEdge } from '@/types/transit';

// Algorithm constants
const TRANSFER_PENALTY = 100;
const STOP_COST = 1;
const AVOID_PENALTY = 2000;

// Priority Queue Implementation
interface PriorityQueueItem<T> {
  item: T;
  priority: number;
}

class MinPriorityQueue<T> {
  private heap: PriorityQueueItem<T>[] = [];

  enqueue(item: T, priority: number): void {
    this.heap.push({ item, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): T | undefined {
    if (this.isEmpty()) return undefined;
    const min = this.heap[0].item;
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return min;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].priority >= this.heap[parentIndex].priority) break;
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < this.heap.length && this.heap[leftChild].priority < this.heap[smallest].priority) {
        smallest = leftChild;
      }
      if (rightChild < this.heap.length && this.heap[rightChild].priority < this.heap[smallest].priority) {
        smallest = rightChild;
      }
      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}

// State interfaces for Dijkstra algorithm
interface PathState {
  stopId: number;
  currentRoute: string | null;
  cost: number;
  stops: number;
  transfers: number;
}

interface PathParent {
  from: number;
  edge: GraphEdge;
  route: string;
  cost: number;
}

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
      fromName_mm: fromNode?.name_mm,
      toName_mm: toNode?.name_mm,
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
 * Reconstruct the path from Dijkstra result with route tracking
 */
function reconstructPathWithRoutes(
  graph: PlannerGraph,
  parent: Map<number, PathParent>,
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
      fromName_mm: fromNode?.name_mm,
      toName_mm: toNode?.name_mm,
      routes: info.edge.routes,
      distance: info.edge.distance,
      routeUsed: info.route, // Track the actual route used
    });

    totalDistance += info.edge.distance;
    current = info.from;
  }
  path.unshift(startId);

  // Mark transfer points where route changes
  for (let i = 0; i < segments.length - 1; i++) {
    const currentSegment = segments[i];
    const nextSegment = segments[i + 1];

    // Transfer occurs when the route changes between segments
    if (currentSegment.routeUsed !== nextSegment.routeUsed) {
      currentSegment.isTransferPoint = true;
    }
  }

  // Find suggested route (one that covers most of the journey)
  const suggestedRoute = segments[0]?.routeUsed || null;

  // Count transfers based on actual route changes
  const transfers = segments.filter(s => s.isTransferPoint).length;

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
 * Reconstruct path from state-based parent tracking
 */
function reconstructPathWithRoutesFromStates(
  graph: PlannerGraph,
  parent: Map<string, PathParent & { fromStateKey: string }>,
  startId: number,
  endId: number,
  endStateKey: string
): PathResult {
  const path: number[] = [];
  const segments: PathSegment[] = [];
  let totalDistance = 0;
  let currentStateKey = endStateKey;

  // Build path backwards using state keys
  while (true) {
    const parentInfo = parent.get(currentStateKey);
    if (!parentInfo) break;

    const toStopId = parseInt(currentStateKey.split(':')[0]);
    path.unshift(toStopId);

    const fromNode = graph.nodes[parentInfo.from];
    const toNode = graph.nodes[toStopId];

    segments.unshift({
      from: parentInfo.from,
      to: toStopId,
      fromName: fromNode?.name_en || `Stop ${parentInfo.from}`,
      toName: toNode?.name_en || `Stop ${toStopId}`,
      fromName_mm: fromNode?.name_mm,
      toName_mm: toNode?.name_mm,
      routes: parentInfo.edge.routes,
      distance: parentInfo.edge.distance,
      routeUsed: parentInfo.route,
    });

    totalDistance += parentInfo.edge.distance;
    currentStateKey = parentInfo.fromStateKey;

    // Stop when we reach the start
    if (parentInfo.from === startId) {
      break;
    }
  }
  path.unshift(startId);

  // Mark transfer points where route changes
  for (let i = 0; i < segments.length - 1; i++) {
    const currentSegment = segments[i];
    const nextSegment = segments[i + 1];

    // Transfer occurs when the route changes between segments
    if (currentSegment.routeUsed !== nextSegment.routeUsed) {
      currentSegment.isTransferPoint = true;
    }
  }

  // Find suggested route (one that covers most of the journey)
  const suggestedRoute = segments[0]?.routeUsed || null;

  // Count transfers based on actual route changes
  const transfers = segments.filter(s => s.isTransferPoint).length;

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
 * Find path with transfer optimization using Dijkstra algorithm
 * Prioritizes routes with fewer transfers over routes with fewer stops
 */
function findPathWithTransferOptimization(
  graph: PlannerGraph,
  startId: number,
  endId: number,
  avoidSegments: Set<string> = new Set()
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

  // Priority queue for Dijkstra
  const queue = new MinPriorityQueue<PathState>();
  queue.enqueue({
    stopId: startId,
    currentRoute: null,
    cost: 0,
    stops: 0,
    transfers: 0,
  }, 0);

  // Track best cost to reach each (stop, route) state
  const visited = new Map<string, number>();

  // Track parent for path reconstruction - KEY FIX: Store per STATE not per STOP
  const parent = new Map<string, PathParent & { fromStateKey: string }>();

  // Track best cost and state for reaching destination
  let bestDestCost = Infinity;
  let bestDestStateKey: string | null = null;

  while (!queue.isEmpty()) {
    const state = queue.dequeue()!;
    const stateKey = `${state.stopId}:${state.currentRoute || 'null'}`;

    // Early termination: if we're processing a state with cost higher than best destination, we're done
    if (state.cost > bestDestCost) {
      break;
    }

    // Check if we've found a better path to this state
    if (visited.has(stateKey) && visited.get(stateKey)! <= state.cost) {
      continue;
    }
    visited.set(stateKey, state.cost);

    // Track if we reached destination
    if (state.stopId === endId && state.cost < bestDestCost) {
      bestDestCost = state.cost;
      bestDestStateKey = stateKey;
    }

    // Explore neighbors
    const neighbors = graph.adjacency[state.stopId] || [];
    for (const edge of neighbors) {
      // Try each route option on this edge
      for (const routeOption of edge.routes) {
        // Calculate if this is a transfer
        const isTransfer = state.currentRoute !== null && state.currentRoute !== routeOption;
        const newTransfers = state.transfers + (isTransfer ? 1 : 0);
        const newStops = state.stops + 1;
        
        // Apply penalty if this segment is in the avoid list
        const segmentKey = `${state.stopId}:${edge.to}:${routeOption}`;
        const penalty = avoidSegments.has(segmentKey) ? AVOID_PENALTY : 0;
        const newCost = (newTransfers * TRANSFER_PENALTY) + (newStops * STOP_COST) + penalty;

        const neighborStateKey = `${edge.to}:${routeOption}`;

        // If this is a better path to this neighbor state
        if (!visited.has(neighborStateKey) || visited.get(neighborStateKey)! > newCost) {
          // Update parent - KEY FIX: Store per STATE
          if (!parent.has(neighborStateKey) || parent.get(neighborStateKey)!.cost > newCost) {
            parent.set(neighborStateKey, {
              from: state.stopId,
              edge,
              route: routeOption,
              cost: newCost,
              fromStateKey: stateKey,
            });
          }

          // Enqueue new state
          queue.enqueue({
            stopId: edge.to,
            currentRoute: routeOption,
            cost: newCost,
            stops: newStops,
            transfers: newTransfers,
          }, newCost);
        }
      }
    }
  }

  // Reconstruct path from best destination state
  if (bestDestStateKey === null) {
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

  return reconstructPathWithRoutesFromStates(graph, parent, startId, endId, bestDestStateKey);
}

/**
 * Find path with preference for fewer transfers (Dijkstra-like)
 */
export function findPathWithTransfers(
  graph: PlannerGraph,
  startId: number,
  endId: number
): PathResult[] {
  const results: PathResult[] = [];
  const avoidSegments = new Set<string>();
  const maxRoutes = 3;

  for (let i = 0; i < maxRoutes; i++) {
    const result = findPathWithTransferOptimization(graph, startId, endId, avoidSegments);
    
    if (!result.found) {
      if (i === 0) results.push(result);
      break;
    }

    // Check for duplicates
    const pathKey = result.segments.map(s => `${s.from}:${s.to}:${s.routeUsed}`).join('|');
    const isDuplicate = results.some(r => r.segments.map(s => `${s.from}:${s.to}:${s.routeUsed}`).join('|') === pathKey);

    if (!isDuplicate) {
      results.push(result);
      
      // Add segments to avoid set
      for (const segment of result.segments) {
        if (segment.routeUsed) {
          avoidSegments.add(`${segment.from}:${segment.to}:${segment.routeUsed}`);
        }
      }
    } else {
      break;
    }
  }

  return results;
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
