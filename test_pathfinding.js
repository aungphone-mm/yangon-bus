const fs = require('fs');

// Load the exact same graph that the frontend uses
const graph = JSON.parse(fs.readFileSync('public/data/planner_graph.json', 'utf8'));

console.log('Graph loaded.');
console.log('Total nodes:', Object.keys(graph.nodes).length);
console.log('Total adjacency:', Object.keys(graph.adjacency).length);

// Test specific stops
const startId = 287;  // Hledan
const endId = 2457;   // Byamaso

console.log('\nChecking nodes:');
console.log('Start node (287):', graph.nodes[startId] ? 'exists' : 'MISSING');
console.log('End node (2457):', graph.nodes[endId] ? 'exists' : 'MISSING');

console.log('\nChecking adjacency:');
console.log('Start adjacency (287):', graph.adjacency[startId] ? graph.adjacency[startId].length + ' edges' : 'MISSING');
console.log('End adjacency (2457):', graph.adjacency[endId] ? graph.adjacency[endId].length + ' edges' : 'MISSING');

// Simple BFS to test connectivity
function testConnectivity(graph, start, end) {
    const visited = new Set();
    const queue = [start];
    let iterations = 0;
    const maxIterations = 100000;

    while (queue.length > 0 && iterations < maxIterations) {
        iterations++;
        const current = queue.shift();

        if (current === end) {
            console.log(`\nPath found! Took ${iterations} iterations.`);
            return true;
        }

        if (visited.has(current)) continue;
        visited.add(current);

        const edges = graph.adjacency[current] || [];
        for (const edge of edges) {
            if (!visited.has(edge.to)) {
                queue.push(edge.to);
            }
        }
    }

    console.log(`\nNo path found. Visited ${visited.size} nodes in ${iterations} iterations.`);
    return false;
}

console.log('\n--- Testing connectivity with simple BFS ---');
console.log('From 287 (Hledan) to 2457 (Byamaso):');
testConnectivity(graph, startId, endId);

console.log('\nFrom 2457 (Byamaso) to 287 (Hledan):');
testConnectivity(graph, endId, startId);

// Now test the actual pathfinder algorithm behavior
console.log('\n--- Testing pathfinder algorithm timing ---');

// Simulate the exact algorithm from pathfinder.ts
const TRANSFER_PENALTY = 100;
const STOP_COST = 1;

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

function findPathWithTransferOptimization(graph, startId, endId) {
    if (startId === endId) {
        return { found: true, path: [startId], totalStops: 1 };
    }

    if (!graph.adjacency[startId] || !graph.adjacency[endId]) {
        console.log('Missing adjacency for start or end!');
        return { found: false };
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
    let iterations = 0;
    const maxIterations = 1000000;
    let bestDestCost = Infinity;
    let bestDestStateKey = null;

    console.log('Starting Dijkstra...');
    const startTime = Date.now();

    while (!queue.isEmpty() && iterations < maxIterations) {
        iterations++;

        if (iterations % 10000 === 0) {
            console.log(`  Iteration ${iterations}, queue size: ${queue.heap.length}, visited: ${visited.size}`);
        }

        const state = queue.dequeue();
        const stateKey = `${state.stopId}:${state.currentRoute || 'null'}`;

        if (state.cost > bestDestCost) {
            break;
        }

        if (visited.has(stateKey) && visited.get(stateKey) <= state.cost) {
            continue;
        }
        visited.set(stateKey, state.cost);

        if (state.stopId === endId && state.cost < bestDestCost) {
            bestDestCost = state.cost;
            bestDestStateKey = stateKey;
            console.log(`  Found destination at cost ${bestDestCost}`);
        }

        const neighbors = graph.adjacency[state.stopId] || [];
        for (const edge of neighbors) {
            for (const routeOption of edge.routes) {
                const isTransfer = state.currentRoute !== null && state.currentRoute !== routeOption;
                const newTransfers = state.transfers + (isTransfer ? 1 : 0);
                const newStops = state.stops + 1;
                const newCost = (newTransfers * TRANSFER_PENALTY) + (newStops * STOP_COST);

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

    const endTime = Date.now();
    console.log(`Finished in ${endTime - startTime}ms, ${iterations} iterations`);

    if (bestDestStateKey === null) {
        return { found: false };
    }

    return { found: true, bestDestCost, iterations };
}

const result = findPathWithTransferOptimization(graph, startId, endId);
console.log('\nResult:', result);
