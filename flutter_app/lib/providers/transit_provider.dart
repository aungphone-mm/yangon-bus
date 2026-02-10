import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../services/transit_service.dart';
import '../services/pathfinding_service.dart';

/// Provider for managing transit data and pathfinding
class TransitProvider extends ChangeNotifier {
  final TransitService _transitService = TransitService();
  PathfindingService? _pathfindingService;

  bool _isLoading = true;
  String? _error;
  Stop? _selectedStop;
  Stop? _originStop;
  Stop? _destinationStop;
  PathResult? _currentPath;
  String? _selectedRouteId;

  // Getters
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isLoaded => _transitService.isLoaded;
  StopLookup? get stopLookup => _transitService.stopLookup;
  PlannerGraph? get graph => _transitService.graph;
  Stop? get selectedStop => _selectedStop;
  Stop? get originStop => _originStop;
  Stop? get destinationStop => _destinationStop;
  PathResult? get currentPath => _currentPath;
  String? get selectedRouteId => _selectedRouteId;

  List<Stop> get allStops => _transitService.allStops;
  List<HubInfo> get hubs => _transitService.hubs;

  int get totalStops => stopLookup?.metadata.totalStops ?? 0;
  int get totalConnections => graph?.metadata.totalEdges ?? 0;

  /// Load transit data
  Future<void> loadData() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _transitService.loadData();
      if (_transitService.graph != null) {
        _pathfindingService = PathfindingService(_transitService.graph!);
      }
      _isLoading = false;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
    }

    notifyListeners();
  }

  /// Search stops by query
  List<Stop> searchStops(String query, {int limit = 20}) {
    return _transitService.searchStops(query, limit: limit);
  }

  /// Get a stop by ID
  Stop? getStop(int id) => _transitService.getStop(id);

  /// Select a stop for viewing details
  void selectStop(Stop? stop) {
    _selectedStop = stop;
    notifyListeners();
  }

  /// Set origin stop for route planning
  void setOrigin(Stop? stop) {
    _originStop = stop;
    _findPath();
    notifyListeners();
  }

  /// Set destination stop for route planning
  void setDestination(Stop? stop) {
    _destinationStop = stop;
    _findPath();
    notifyListeners();
  }

  /// Swap origin and destination
  void swapOriginDestination() {
    final temp = _originStop;
    _originStop = _destinationStop;
    _destinationStop = temp;
    _findPath();
    notifyListeners();
  }

  /// Clear route planning
  void clearRoute() {
    _originStop = null;
    _destinationStop = null;
    _currentPath = null;
    notifyListeners();
  }

  /// Select a route to view on map
  void selectRoute(String? routeId) {
    _selectedRouteId = routeId;
    notifyListeners();
  }

  /// Get stops for a specific route
  List<Stop> getStopsForRoute(String routeId) {
    return _transitService.getStopsForRoute(routeId);
  }

  /// Get all unique route IDs
  Set<String> get allRouteIds => _transitService.allRouteIds;

  /// Find path between origin and destination
  void _findPath() {
    if (_originStop == null || _destinationStop == null) {
      _currentPath = null;
      return;
    }

    if (_pathfindingService == null) {
      _currentPath = null;
      return;
    }

    _currentPath = _pathfindingService!.findPath(
      _originStop!.id,
      _destinationStop!.id,
    );
  }
}
