/// A segment in a path between two stops
class PathSegment {
  final int from;
  final int to;
  final String fromName;
  final String toName;
  final String? fromNameMm;
  final String? toNameMm;
  final List<String> routes;
  final double distance;
  final String? routeUsed;
  final bool isTransferPoint;
  final bool isWalkingSegment;
  final double? walkingDistanceMeters;
  final double? walkingTimeMinutes;

  const PathSegment({
    required this.from,
    required this.to,
    required this.fromName,
    required this.toName,
    this.fromNameMm,
    this.toNameMm,
    required this.routes,
    required this.distance,
    this.routeUsed,
    this.isTransferPoint = false,
    this.isWalkingSegment = false,
    this.walkingDistanceMeters,
    this.walkingTimeMinutes,
  });

  factory PathSegment.fromJson(Map<String, dynamic> json) {
    return PathSegment(
      from: json['from'] as int,
      to: json['to'] as int,
      fromName: json['fromName'] as String,
      toName: json['toName'] as String,
      fromNameMm: json['fromName_mm'] as String?,
      toNameMm: json['toName_mm'] as String?,
      routes: List<String>.from(json['routes'] as List),
      distance: (json['distance'] as num).toDouble(),
      routeUsed: json['routeUsed'] as String?,
      isTransferPoint: json['isTransferPoint'] as bool? ?? false,
      isWalkingSegment: json['isWalkingSegment'] as bool? ?? false,
      walkingDistanceMeters: (json['walkingDistanceMeters'] as num?)?.toDouble(),
      walkingTimeMinutes: (json['walkingTimeMinutes'] as num?)?.toDouble(),
    );
  }
}

/// Walking suggestion info
class WalkingSuggestion {
  final int originalStopId;
  final String originalStopName;
  final int walkToStopId;
  final String walkToStopName;
  final double distanceMeters;
  final double timeMinutes;

  const WalkingSuggestion({
    required this.originalStopId,
    required this.originalStopName,
    required this.walkToStopId,
    required this.walkToStopName,
    required this.distanceMeters,
    required this.timeMinutes,
  });

  factory WalkingSuggestion.fromJson(Map<String, dynamic> json) {
    return WalkingSuggestion(
      originalStopId: json['originalStopId'] as int,
      originalStopName: json['originalStopName'] as String,
      walkToStopId: json['walkToStopId'] as int,
      walkToStopName: json['walkToStopName'] as String,
      distanceMeters: (json['distanceMeters'] as num).toDouble(),
      timeMinutes: (json['timeMinutes'] as num).toDouble(),
    );
  }
}

/// Result of pathfinding between two stops
class PathResult {
  final bool found;
  final List<int> path;
  final List<PathSegment> segments;
  final double totalDistance;
  final int totalStops;
  final int transfers;
  final String? suggestedRoute;
  final WalkingSuggestion? walkingOrigin;
  final WalkingSuggestion? walkingDestination;

  const PathResult({
    required this.found,
    required this.path,
    required this.segments,
    required this.totalDistance,
    required this.totalStops,
    required this.transfers,
    this.suggestedRoute,
    this.walkingOrigin,
    this.walkingDestination,
  });

  factory PathResult.empty() {
    return const PathResult(
      found: false,
      path: [],
      segments: [],
      totalDistance: 0,
      totalStops: 0,
      transfers: 0,
    );
  }

  factory PathResult.fromJson(Map<String, dynamic> json) {
    return PathResult(
      found: json['found'] as bool,
      path: List<int>.from(json['path'] as List),
      segments: (json['segments'] as List)
          .map((s) => PathSegment.fromJson(s as Map<String, dynamic>))
          .toList(),
      totalDistance: (json['totalDistance'] as num).toDouble(),
      totalStops: json['totalStops'] as int,
      transfers: json['transfers'] as int,
      suggestedRoute: json['suggestedRoute'] as String?,
      walkingOrigin: json['walkingOrigin'] != null
          ? WalkingSuggestion.fromJson(json['walkingOrigin'])
          : null,
      walkingDestination: json['walkingDestination'] != null
          ? WalkingSuggestion.fromJson(json['walkingDestination'])
          : null,
    );
  }
}
