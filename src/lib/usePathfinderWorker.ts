'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PlannerGraph, PathResult } from '@/types/transit';

interface UsePathfinderWorkerReturn {
    findPath: (graph: PlannerGraph, startId: number, endId: number) => Promise<PathResult[]>;
    isLoading: boolean;
    error: string | null;
    isReady: boolean;
}

/**
 * React hook for managing the pathfinder Web Worker
 * 
 * Benefits:
 * - Runs heavy Dijkstra computation off main thread
 * - Keeps UI responsive during pathfinding
 * - Automatic worker lifecycle management
 * - Promise-based API for easy async/await usage
 */
export function usePathfinderWorker(): UsePathfinderWorkerReturn {
    const workerRef = useRef<Worker | null>(null);
    const requestIdRef = useRef(0);
    const pendingRef = useRef<Map<number, { resolve: (value: PathResult[]) => void; reject: (error: Error) => void }>>(new Map());

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    // Initialize worker
    useEffect(() => {
        try {
            const worker = new Worker('/pathfinder.worker.js');

            worker.onmessage = (e) => {
                const { type, requestId, results, message, duration } = e.data;

                if (type === 'ready') {
                    console.log('[PathfinderWorker] Worker initialized');
                    setIsReady(true);
                    return;
                }

                const pending = pendingRef.current.get(requestId);
                if (!pending) return;

                if (type === 'result') {
                    console.log(`[PathfinderWorker] Pathfinding completed in ${duration?.toFixed(2)}ms`);
                    pending.resolve(results);
                } else if (type === 'error') {
                    console.error('[PathfinderWorker] Error:', message);
                    pending.reject(new Error(message));
                }

                pendingRef.current.delete(requestId);
                setIsLoading(pendingRef.current.size > 0);
            };

            worker.onerror = (e) => {
                console.error('[PathfinderWorker] Worker error:', e);
                setError('Worker failed to load');
                setIsReady(false);
            };

            workerRef.current = worker;
        } catch (err) {
            console.error('[PathfinderWorker] Failed to create worker:', err);
            setError('Web Workers not supported');
        }

        // Cleanup on unmount
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
            pendingRef.current.clear();
        };
    }, []);

    // Find path function
    const findPath = useCallback(
        (graph: PlannerGraph, startId: number, endId: number): Promise<PathResult[]> => {
            return new Promise((resolve, reject) => {
                if (!workerRef.current) {
                    reject(new Error('Worker not available'));
                    return;
                }

                const requestId = ++requestIdRef.current;
                pendingRef.current.set(requestId, { resolve, reject });

                setIsLoading(true);
                setError(null);

                workerRef.current.postMessage({
                    type: 'findPath',
                    graph,
                    startId,
                    endId,
                    requestId,
                });
            });
        },
        []
    );

    return {
        findPath,
        isLoading,
        error,
        isReady,
    };
}
