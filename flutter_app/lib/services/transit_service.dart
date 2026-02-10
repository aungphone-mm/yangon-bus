import 'dart:convert';
import 'package:flutter/services.dart';
import '../models/models.dart';

/// Service for loading and managing transit data
class TransitService {
  StopLookup? _stopLookup;
  PlannerGraph? _graph;
  bool _isLoaded = false;

  bool get isLoaded => _isLoaded;
  StopLookup? get stopLookup => _stopLookup;
  PlannerGraph? get graph => _graph;

  /// Load all transit data from assets
  Future<void> loadData() async {
    if (_isLoaded) return;

    try {
      // Load stop lookup
      final stopLookupJson = await rootBundle.loadString('assets/data/stop_lookup.json');
      _stopLookup = StopLookup.fromJson(json.decode(stopLookupJson));

      // Load planner graph
      final graphJson = await rootBundle.loadString('assets/data/planner_graph.json');
      _graph = PlannerGraph.fromJson(json.decode(graphJson));

      _isLoaded = true;
    } catch (e) {
      print('Error loading transit data: $e');
      rethrow;
    }
  }

  /// Get a stop by ID
  Stop? getStop(int id) => _stopLookup?.getStop(id);

  /// Get all stops
  List<Stop> get allStops => _stopLookup?.allStops ?? [];

  /// Get hub stops
  List<HubInfo> get hubs => _stopLookup?.hubs ?? [];

  /// Search stops by query
  List<Stop> searchStops(String query, {int limit = 20}) {
    if (_stopLookup == null || query.isEmpty) return [];

    final lowerQuery = query.toLowerCase();
    final results = <MapEntry<Stop, int>>[];

    for (final stop in _stopLookup!.allStops) {
      int score = 0;

      // Check English name
      if (stop.nameEn.toLowerCase().contains(lowerQuery)) {
        score += stop.nameEn.toLowerCase().startsWith(lowerQuery) ? 100 : 50;
      }

      // Check Burmese name
      if (stop.nameMm.contains(query)) {
        score += 80;
      }

      // Check township
      if (stop.townshipEn.toLowerCase().contains(lowerQuery)) {
        score += 30;
      }

      // Check road
      if (stop.roadEn.toLowerCase().contains(lowerQuery)) {
        score += 20;
      }

      // Boost hubs
      if (stop.isHub) {
        score += 10;
      }

      if (score > 0) {
        results.add(MapEntry(stop, score));
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.value.compareTo(a.value));

    return results.take(limit).map((e) => e.key).toList();
  }

  /// Get all unique route IDs
  Set<String> get allRouteIds {
    final routes = <String>{};
    for (final stop in allStops) {
      for (final route in stop.routes) {
        routes.add(route.id);
      }
    }
    return routes;
  }

  /// Get stops for a specific route
  List<Stop> getStopsForRoute(String routeId) {
    return allStops.where((stop) => 
      stop.routes.any((r) => r.id == routeId)
    ).toList();
  }
}
