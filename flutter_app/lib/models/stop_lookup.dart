import 'stop.dart';

/// Hub stop info
class HubInfo {
  final int stopId;
  final String name;
  final String township;
  final int routeCount;

  const HubInfo({
    required this.stopId,
    required this.name,
    required this.township,
    required this.routeCount,
  });

  factory HubInfo.fromJson(Map<String, dynamic> json) {
    return HubInfo(
      stopId: json['stop_id'] as int,
      name: json['name'] as String,
      township: json['township'] as String,
      routeCount: json['route_count'] as int,
    );
  }
}

/// Township info
class TownshipInfo {
  final int stopCount;
  final List<TownshipStop> stops;

  const TownshipInfo({
    required this.stopCount,
    required this.stops,
  });

  factory TownshipInfo.fromJson(Map<String, dynamic> json) {
    return TownshipInfo(
      stopCount: json['stop_count'] as int,
      stops: (json['stops'] as List)
          .map((s) => TownshipStop.fromJson(s))
          .toList(),
    );
  }
}

class TownshipStop {
  final int id;
  final String name;
  final int routeCount;

  const TownshipStop({
    required this.id,
    required this.name,
    required this.routeCount,
  });

  factory TownshipStop.fromJson(Map<String, dynamic> json) {
    return TownshipStop(
      id: json['id'] as int,
      name: json['name'] as String,
      routeCount: json['route_count'] as int,
    );
  }
}

/// Complete stop lookup data
class StopLookup {
  final StopLookupMetadata metadata;
  final Map<String, Stop> stops;
  final Map<String, TownshipInfo> byTownship;
  final List<HubInfo> hubs;

  const StopLookup({
    required this.metadata,
    required this.stops,
    required this.byTownship,
    required this.hubs,
  });

  factory StopLookup.fromJson(Map<String, dynamic> json) {
    // Parse stops
    final stopsJson = json['stops'] as Map<String, dynamic>;
    final stops = stopsJson.map(
      (key, value) => MapEntry(key, Stop.fromJson(value)),
    );

    // Parse by_township
    final townshipJson = json['by_township'] as Map<String, dynamic>;
    final byTownship = townshipJson.map(
      (key, value) => MapEntry(key, TownshipInfo.fromJson(value)),
    );

    // Parse hubs
    final hubs = (json['hubs'] as List)
        .map((h) => HubInfo.fromJson(h))
        .toList();

    return StopLookup(
      metadata: StopLookupMetadata.fromJson(json['metadata']),
      stops: stops,
      byTownship: byTownship,
      hubs: hubs,
    );
  }

  /// Get a stop by ID
  Stop? getStop(int id) => stops[id.toString()];

  /// Get all stops as a list
  List<Stop> get allStops => stops.values.toList();

  /// Get all township names
  List<String> get townships => byTownship.keys.toList()..sort();
}

/// Metadata for stop lookup
class StopLookupMetadata {
  final String generated;
  final int totalStops;
  final int stopsWithRoutes;
  final String description;

  const StopLookupMetadata({
    required this.generated,
    required this.totalStops,
    required this.stopsWithRoutes,
    required this.description,
  });

  factory StopLookupMetadata.fromJson(Map<String, dynamic> json) {
    return StopLookupMetadata(
      generated: json['generated'] as String,
      totalStops: json['total_stops'] as int,
      stopsWithRoutes: json['stops_with_routes'] as int,
      description: json['description'] as String,
    );
  }
}
