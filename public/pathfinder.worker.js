/**
 * Web Worker for Pathfinding
 * Self-contained pathfinding logic to run off the main thread
 * 
 * This worker handles heavy Dijkstra computation to keep UI responsive
 * on budget Android devices common in Myanmar.
 */

// Algorithm constants
const TRANSFER_PENALTY = 100;
const STOP_COST = 1;
const AVOID_PENALTY = 2000;

// Walking constants
const WALKING_DISTANCE_METERS = 500;
const WALKING_SPEED_METERS_PER_MIN = 80;
const WALKING_BENEFIT_THRESHOLD = 50;

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Find stops within walking distance of a given stop
 */
function findNearbyStops(graph, stopId, maxDistance = WALKING_DISTANCE_METERS) {
    const sourceNode = graph.nodes[stopId];
    if (!sourceNode) return [];

    const nearbyStops = [];

    for (const [id, node] of Object.entries(graph.nodes)) {
        const nodeId = parseInt(id);
        if (nodeId === stopId) continue;
        if (!graph.adjacency[nodeId]) continue;

        const distance = calculateDistance(
            sourceNode.lat, sourceNode.lng,
            node.lat, node.lng
        );

        if (distance <= maxDistance) {
            nearbyStops.push({ stopId: nodeId, distance });
        }
    }

    return nearbyStops.sort((a, b) => a.distance - b.distance);
}

// Priority Queue Implementation
class MinPriorityQueue {
    constructor() {
        this.heap = [];
    }

    enqueue(item, priority) {
        this.heap.push({ item, priority });
        this.bubbleUp(this.heap.length - 1);
    }

    dequeue() {
        if (this.isEmpty()) return undefined;
        const min = this.heap[0].item;
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.bubbleDown(0);
        }
        return min;
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    bubbleUp(index) {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.heap[index].priority >= this.heap[parentIndex].priority) break;
            [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
            index = parentIndex;
        }
    }

    bubbleDown(index) {
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

/**
 * Reconstruct path from state-based parent tracking
 */
function reconstructPathWithRoutesFromStates(graph, parent, startId, endId, endStateKey) {
    const path = [];
    const segments = [];
    let totalDistance = 0;
    let currentStateKey = endStateKey;

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

        if (parentInfo.from === startId) {
            break;
        }
    }
    path.unshift(startId);

    // Mark transfer points
    for (let i = 0; i < segments.length - 1; i++) {
        if (segments[i].routeUsed !== segments[i + 1].routeUsed) {
            segments[i].isTransferPoint = true;
        }
    }

    const suggestedRoute = segments[0]?.routeUsed || null;
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
 * Find path with transfer optimization using Dijkstra algorithm
 */
function findPathWithTransferOptimization(graph, startId, endId, avoidSegments = new Set()) {
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

    const queue = new MinPriorityQueue();
    queue.enqueue({
        stopId: startId,
        currentRoute: null,
        cost: 0,
        stops: 0,
        transfers: 0,
    }, 0);

    const visited = new Map();
    const parent = new Map();
    let bestDestCost = Infinity;
    let bestDestStateKey = null;
    let iterations = 0;
    const MAX_ITERATIONS = 100000;

    while (!queue.isEmpty()) {
        iterations++;
        if (iterations > MAX_ITERATIONS) break;

        const state = queue.dequeue();
        const stateKey = `${state.stopId}:${state.currentRoute || 'null'}`;

        if (state.cost > bestDestCost) break;

        if (visited.has(stateKey) && visited.get(stateKey) <= state.cost) {
            continue;
        }
        visited.set(stateKey, state.cost);

        if (state.stopId === endId && state.cost < bestDestCost) {
            bestDestCost = state.cost;
            bestDestStateKey = stateKey;
        }

        const neighbors = graph.adjacency[state.stopId] || [];
        for (const edge of neighbors) {
            for (const routeOption of edge.routes) {
                const isTransfer = state.currentRoute !== null && state.currentRoute !== routeOption;
                const newTransfers = state.transfers + (isTransfer ? 1 : 0);
                const newStops = state.stops + 1;

                const segmentKey = `${state.stopId}:${edge.to}:${routeOption}`;
                const penalty = avoidSegments.has(segmentKey) ? AVOID_PENALTY : 0;
                const newCost = (newTransfers * TRANSFER_PENALTY) + (newStops * STOP_COST) + penalty;

                const neighborStateKey = `${edge.to}:${routeOption}`;

                if (!visited.has(neighborStateKey) || visited.get(neighborStateKey) > newCost) {
                    if (!parent.has(neighborStateKey) || parent.get(neighborStateKey).cost > newCost) {
                        parent.set(neighborStateKey, {
                            from: state.stopId,
                            edge,
                            route: routeOption,
                            cost: newCost,
                            fromStateKey: stateKey,
                        });
                    }

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
 * Find path with preference for fewer transfers
 */
function findPathWithTransfers(graph, startId, endId) {
    const results = [];
    const avoidSegments = new Set();
    const maxRoutes = 3;

    for (let i = 0; i < maxRoutes; i++) {
        const result = findPathWithTransferOptimization(graph, startId, endId, avoidSegments);

        if (!result.found) {
            if (i === 0) results.push(result);
            break;
        }

        const pathKey = result.segments.map(s => `${s.from}:${s.to}:${s.routeUsed}`).join('|');
        const isDuplicate = results.some(r => r.segments.map(s => `${s.from}:${s.to}:${s.routeUsed}`).join('|') === pathKey);

        if (!isDuplicate) {
            results.push(result);
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
 * Find path with walking suggestions
 */
function findPathWithWalkingSuggestion(graph, startId, endId) {
    const nearbyOrigins = findNearbyStops(graph, startId, WALKING_DISTANCE_METERS);
    const nearbyDestinations = findNearbyStops(graph, endId, WALKING_DISTANCE_METERS);

    const directResults = findPathWithTransfers(graph, startId, endId);
    const directBest = directResults[0];

    const directCost = directBest?.found
        ? (directBest.transfers * TRANSFER_PENALTY) + (directBest.totalStops * STOP_COST)
        : Infinity;

    let bestResult = directBest;
    let bestCost = directCost;
    let walkingOriginInfo = undefined;
    let walkingDestinationInfo = undefined;

    // Try walking from origin
    for (const nearby of nearbyOrigins.slice(0, 5)) {
        const results = findPathWithTransfers(graph, nearby.stopId, endId);
        const result = results[0];

        if (result?.found) {
            const walkingTimeMinutes = Math.ceil(nearby.distance / WALKING_SPEED_METERS_PER_MIN);
            const cost = (result.transfers * TRANSFER_PENALTY) + (result.totalStops * STOP_COST);

            if (cost + WALKING_BENEFIT_THRESHOLD < bestCost) {
                const originNode = graph.nodes[startId];
                const walkToNode = graph.nodes[nearby.stopId];

                bestResult = result;
                bestCost = cost;
                walkingOriginInfo = {
                    originalStopId: startId,
                    originalStopName: originNode?.name_en || `Stop ${startId}`,
                    walkToStopId: nearby.stopId,
                    walkToStopName: walkToNode?.name_en || `Stop ${nearby.stopId}`,
                    distanceMeters: Math.round(nearby.distance),
                    timeMinutes: walkingTimeMinutes
                };
                walkingDestinationInfo = undefined;
            }
        }
    }

    // Try walking to destination
    for (const nearby of nearbyDestinations.slice(0, 5)) {
        const results = findPathWithTransfers(graph, startId, nearby.stopId);
        const result = results[0];

        if (result?.found) {
            const walkingTimeMinutes = Math.ceil(nearby.distance / WALKING_SPEED_METERS_PER_MIN);
            const cost = (result.transfers * TRANSFER_PENALTY) + (result.totalStops * STOP_COST);

            if (cost + WALKING_BENEFIT_THRESHOLD < bestCost) {
                const destNode = graph.nodes[endId];
                const walkFromNode = graph.nodes[nearby.stopId];

                bestResult = result;
                bestCost = cost;
                walkingDestinationInfo = {
                    walkFromStopId: nearby.stopId,
                    walkFromStopName: walkFromNode?.name_en || `Stop ${nearby.stopId}`,
                    originalStopId: endId,
                    originalStopName: destNode?.name_en || `Stop ${endId}`,
                    distanceMeters: Math.round(nearby.distance),
                    timeMinutes: walkingTimeMinutes
                };
                walkingOriginInfo = undefined;
            }
        }
    }

    // Try walking at both ends
    for (const nearbyOrigin of nearbyOrigins.slice(0, 3)) {
        for (const nearbyDest of nearbyDestinations.slice(0, 3)) {
            const results = findPathWithTransfers(graph, nearbyOrigin.stopId, nearbyDest.stopId);
            const result = results[0];

            if (result?.found) {
                const cost = (result.transfers * TRANSFER_PENALTY) + (result.totalStops * STOP_COST);

                if (cost + (WALKING_BENEFIT_THRESHOLD * 2) < bestCost) {
                    const originNode = graph.nodes[startId];
                    const walkToNode = graph.nodes[nearbyOrigin.stopId];
                    const destNode = graph.nodes[endId];
                    const walkFromNode = graph.nodes[nearbyDest.stopId];

                    bestResult = result;
                    bestCost = cost;
                    walkingOriginInfo = {
                        originalStopId: startId,
                        originalStopName: originNode?.name_en || `Stop ${startId}`,
                        walkToStopId: nearbyOrigin.stopId,
                        walkToStopName: walkToNode?.name_en || `Stop ${nearbyOrigin.stopId}`,
                        distanceMeters: Math.round(nearbyOrigin.distance),
                        timeMinutes: Math.ceil(nearbyOrigin.distance / WALKING_SPEED_METERS_PER_MIN)
                    };
                    walkingDestinationInfo = {
                        walkFromStopId: nearbyDest.stopId,
                        walkFromStopName: walkFromNode?.name_en || `Stop ${nearbyDest.stopId}`,
                        originalStopId: endId,
                        originalStopName: destNode?.name_en || `Stop ${endId}`,
                        distanceMeters: Math.round(nearbyDest.distance),
                        timeMinutes: Math.ceil(nearbyDest.distance / WALKING_SPEED_METERS_PER_MIN)
                    };
                }
            }
        }
    }

    // Attach walking info
    if (bestResult) {
        bestResult.walkingOrigin = walkingOriginInfo;
        bestResult.walkingDestination = walkingDestinationInfo;
    }

    // Build results
    const finalResults = [];

    if (bestResult?.found) {
        finalResults.push(bestResult);
    }

    if (directBest?.found && bestResult !== directBest) {
        finalResults.push(directBest);
    }

    for (let i = 1; i < directResults.length && finalResults.length < 3; i++) {
        if (directResults[i]?.found) {
            finalResults.push(directResults[i]);
        }
    }

    return finalResults;
}

// Worker message handler
self.onmessage = function (e) {
    const { type, graph, startId, endId, requestId } = e.data;

    if (type === 'findPath') {
        try {
            const startTime = performance.now();
            const results = findPathWithWalkingSuggestion(graph, startId, endId);
            const endTime = performance.now();

            self.postMessage({
                type: 'result',
                requestId,
                results,
                duration: endTime - startTime
            });
        } catch (error) {
            self.postMessage({
                type: 'error',
                requestId,
                message: error.message || 'Pathfinding error'
            });
        }
    }
};

// Signal ready
self.postMessage({ type: 'ready' });
