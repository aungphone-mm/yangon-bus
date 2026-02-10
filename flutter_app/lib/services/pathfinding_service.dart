import 'dart:collection';
import '../models/models.dart';

/// Service for finding paths between stops
class PathfindingService {
  final PlannerGraph graph;

  PathfindingService(this.graph);

  /// Find a path between two stops using BFS with transfer optimization
  PathResult findPath(int originId, int destinationId, {int maxTransfers = 3}) {
    if (originId == destinationId) {
      return PathResult.empty();
    }

    // BFS state: (currentNode, path, routeUsed, transfers)
    final queue = Queue<_BfsState>();
    final visited = <String>{};

    // Start from origin
    queue.add(_BfsState(
      nodeId: originId,
      path: [originId],
      routes: [],
      currentRoute: null,
      transfers: 0,
    ));

    _BfsState? bestResult;
    int bestScore = -1;

    while (queue.isNotEmpty) {
      final state = queue.removeFirst();

      // Check if we reached destination
      if (state.nodeId == destinationId) {
        final score = _calculatePathScore(state);
        if (bestScore < 0 || score > bestScore) {
          bestScore = score;
          bestResult = state;
        }
        continue;
      }

      // Skip if too many transfers
      if (state.transfers > maxTransfers) continue;

      // Skip if already visited with same or fewer transfers
      final visitKey = '${state.nodeId}_${state.transfers}';
      if (visited.contains(visitKey)) continue;
      visited.add(visitKey);

      // Explore neighbors
      final edges = graph.getEdges(state.nodeId);
      for (final edge in edges) {
        // Determine if this is a transfer
        final isTransfer = state.currentRoute != null &&
            !edge.routes.contains(state.currentRoute);

        // Choose best route to use
        String routeToUse;
        if (!isTransfer && state.currentRoute != null && edge.routes.contains(state.currentRoute)) {
          routeToUse = state.currentRoute!;
        } else {
          routeToUse = edge.routes.first;
        }

        queue.add(_BfsState(
          nodeId: edge.to,
          path: [...state.path, edge.to],
          routes: [...state.routes, routeToUse],
          currentRoute: routeToUse,
          transfers: state.transfers + (isTransfer ? 1 : 0),
        ));
      }
    }

    if (bestResult == null) {
      return PathResult.empty();
    }

    // Build segments
    final segments = <PathSegment>[];
    String? previousRoute;

    for (int i = 0; i < bestResult.path.length - 1; i++) {
      final fromId = bestResult.path[i];
      final toId = bestResult.path[i + 1];
      final routeUsed = bestResult.routes[i];

      final fromNode = graph.getNode(fromId);
      final toNode = graph.getNode(toId);

      if (fromNode == null || toNode == null) continue;

      // Find edge for distance
      final edges = graph.getEdges(fromId);
      final edge = edges.firstWhere(
        (e) => e.to == toId,
        orElse: () => GraphEdge(to: toId, routes: [], distance: 0, routeCount: 0),
      );

      final isTransfer = previousRoute != null && previousRoute != routeUsed;

      segments.add(PathSegment(
        from: fromId,
        to: toId,
        fromName: fromNode.nameEn,
        toName: toNode.nameEn,
        fromNameMm: fromNode.nameMm,
        toNameMm: toNode.nameMm,
        routes: edge.routes,
        distance: edge.distance,
        routeUsed: routeUsed,
        isTransferPoint: isTransfer,
      ));

      previousRoute = routeUsed;
    }

    return PathResult(
      found: true,
      path: bestResult.path,
      segments: segments,
      totalDistance: segments.fold(0, (sum, s) => sum + s.distance),
      totalStops: segments.length,
      transfers: bestResult.transfers,
      suggestedRoute: bestResult.routes.isNotEmpty ? bestResult.routes.first : null,
    );
  }

  int _calculatePathScore(_BfsState state) {
    // Prefer fewer transfers, then shorter paths
    return 10000 - (state.transfers * 1000) - state.path.length;
  }
}

class _BfsState {
  final int nodeId;
  final List<int> path;
  final List<String> routes;
  final String? currentRoute;
  final int transfers;

  _BfsState({
    required this.nodeId,
    required this.path,
    required this.routes,
    required this.currentRoute,
    required this.transfers,
  });
}
