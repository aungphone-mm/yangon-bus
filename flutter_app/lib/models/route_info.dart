/// Route information for a bus line
class RouteInfo {
  final String id;
  final String name;
  final String agency;
  final String color;
  final String position; // 'start' | 'middle' | 'end'

  const RouteInfo({
    required this.id,
    required this.name,
    required this.agency,
    required this.color,
    required this.position,
  });

  factory RouteInfo.fromJson(Map<String, dynamic> json) {
    return RouteInfo(
      id: json['id'] as String,
      name: json['name'] as String,
      agency: json['agency'] as String? ?? '',
      color: json['color'] as String,
      position: json['position'] as String? ?? 'middle',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'agency': agency,
      'color': color,
      'position': position,
    };
  }

  /// Get the color as a Flutter Color
  int get colorValue {
    String hex = color.replaceAll('#', '');
    if (hex.length == 6) {
      hex = 'FF$hex';
    }
    return int.parse(hex, radix: 16);
  }
}
