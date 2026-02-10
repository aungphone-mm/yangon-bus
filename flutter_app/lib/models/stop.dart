import 'route_info.dart';

/// Bus stop model
class Stop {
  final int id;
  final String nameEn;
  final String nameMm;
  final double lat;
  final double lng;
  final String townshipEn;
  final String? townshipMm;
  final String roadEn;
  final String? roadMm;
  final int routeCount;
  final List<RouteInfo> routes;
  final bool isHub;
  final bool isTransferPoint;

  const Stop({
    required this.id,
    required this.nameEn,
    required this.nameMm,
    required this.lat,
    required this.lng,
    required this.townshipEn,
    this.townshipMm,
    required this.roadEn,
    this.roadMm,
    required this.routeCount,
    required this.routes,
    required this.isHub,
    required this.isTransferPoint,
  });

  factory Stop.fromJson(Map<String, dynamic> json) {
    return Stop(
      id: json['id'] as int,
      nameEn: json['name_en'] as String,
      nameMm: json['name_mm'] as String,
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      townshipEn: json['township_en'] as String,
      townshipMm: json['township_mm'] as String?,
      roadEn: json['road_en'] as String? ?? '',
      roadMm: json['road_mm'] as String?,
      routeCount: json['route_count'] as int,
      routes: (json['routes'] as List<dynamic>)
          .map((r) => RouteInfo.fromJson(r as Map<String, dynamic>))
          .toList(),
      isHub: json['is_hub'] as bool? ?? false,
      isTransferPoint: json['is_transfer_point'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name_en': nameEn,
      'name_mm': nameMm,
      'lat': lat,
      'lng': lng,
      'township_en': townshipEn,
      'township_mm': townshipMm,
      'road_en': roadEn,
      'road_mm': roadMm,
      'route_count': routeCount,
      'routes': routes.map((r) => r.toJson()).toList(),
      'is_hub': isHub,
      'is_transfer_point': isTransferPoint,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Stop && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}
