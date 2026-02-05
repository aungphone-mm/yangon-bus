
const fs = require('fs');
const path = require('path');

// --- PATHFINDER LOGIC (Adapted from src/lib/pathfinder.ts) ---

const TRANSFER_PENALTY = 100;
const STOP_COST = 1;
const AVOID_PENALTY = 2000;

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

        // Safety check for nodes
        const fromNode = graph.nodes[parentInfo.from] || { name_en: `Stop ${parentInfo.from}` };
        const toNode = graph.nodes[toStopId] || { name_en: `Stop ${toStopId}` };

        segments.unshift({
            from: parentInfo.from,
            to: toStopId,
            fromName: fromNode.name_en,
            toName: toNode.name_en,
            routes: parentInfo.edge.routes,
            distance: parentInfo.edge.distance,
            routeUsed: parentInfo.route,
        });

        totalDistance += parentInfo.edge.distance;
        currentStateKey = parentInfo.fromStateKey;

        if (parentInfo.from === startId) break;
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

    return { found: true, path, segments, totalDistance, transfers, suggestedRoute };
}


function findPathWithTransferOptimization(graph, startId, endId, avoidSegments = new Set()) {
    if (startId === endId) return { found: true, path: [startId], segments: [], transfers: 0 };
    if (!graph.adjacency[startId] || !graph.adjacency[endId]) return { found: false };

    const queue = new MinPriorityQueue();
    queue.enqueue({ stopId: startId, currentRoute: null, cost: 0, stops: 0, transfers: 0 }, 0);

    const visited = new Map();
    const parent = new Map();
    let bestDestCost = Infinity;
    let bestDestStateKey = null;

    while (!queue.isEmpty()) {
        const state = queue.dequeue();
        const stateKey = `${state.stopId}:${state.currentRoute || 'null'}`;

        if (state.cost > bestDestCost) break;
        if (visited.has(stateKey) && visited.get(stateKey) <= state.cost) continue;
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

    if (bestDestStateKey === null) return { found: false };
    return reconstructPathWithRoutesFromStates(graph, parent, startId, endId, bestDestStateKey);
}

// --- MAIN EXECUTION ---

const graphPath = path.join('public', 'data', 'planner_graph.json');

try {
    console.log('Loading graph...');
    const graphData = fs.readFileSync(graphPath, 'utf8');
    const graph = JSON.parse(graphData);
    console.log('Graph loaded. Nodes:', Object.keys(graph.nodes).length);

    // Start with one pair
    // Byamaso: 2457
    // Hledan: 287 (Westbound?), 288 (Eastbound?) - usually even/odd denotes direction or they are just arbitrary

    // Let's try 2457 to 287
    const startId = 2457;
    const endId = 287;

    console.log(`Calculating route from ${startId} to ${endId}...`);
    const result = findPathWithTransferOptimization(graph, startId, endId);

    if (result.found) {
        console.log('\nRoute Found!');
        console.log(`Total Stops: ${result.path.length}`);
        console.log(`Transfers: ${result.transfers}`);

        // Print path summary
        let currentRoute = null;
        let sequence = [];

        result.segments.forEach((seg, idx) => {
            if (seg.routeUsed !== currentRoute) {
                if (currentRoute) {
                    console.log(`- Take Route ${currentRoute} for ${sequence.length} stops`);
                    console.log(`  (From ${sequence[0]} to ${sequence[sequence.length - 1]})`);
                    console.log(`  TRANSITION at ${seg.fromName}`);
                }
                currentRoute = seg.routeUsed;
                sequence = [seg.fromName];
            }
            sequence.push(seg.toName);
        });
        // Final segment
        if (currentRoute) {
            console.log(`- Take Route ${currentRoute} for ${sequence.length - 1} stops`);
            console.log(`  (To ${sequence[sequence.length - 1]})`);
        }

    } else {
        console.log('No route found for this combination.');
        // Try the other Hledan ID
        console.log('Trying alternative destination: 288');
        const result2 = findPathWithTransferOptimization(graph, 2457, 288);
        if (result2.found) {
            console.log('Route found to 288!');
            // (Simpler print for now)
            console.log(`Transfers: ${result2.transfers}, Stops: ${result2.path.length}`);
        } else {
            console.log('No route found to 288 either.');
        }
    }

} catch (err) {
    console.error('Error:', err);
}
