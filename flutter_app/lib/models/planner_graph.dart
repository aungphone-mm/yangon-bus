/// Node in the planner graph
class GraphNode {
  final int id;
  final String nameEn;
  final String nameMm;
  final double lat;
  final double lng;
  final String township;

  const GraphNode({
    required this.id,
    required this.nameEn,
    required this.nameMm,
    required this.lat,
    required this.lng,
    required this.township,
  });

  factory GraphNode.fromJson(Map<String, dynamic> json) {
    return GraphNode(
      id: json['id'] as int,
      nameEn: json['name_en'] as String,
      nameMm: json['name_mm'] as String,
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      township: json['township'] as String,
    );
  }
}

/// Edge connecting two nodes in the graph
class GraphEdge {
  final int to;
  final List<String> routes;
  final double distance;
  final int routeCount;

  const GraphEdge({
    required this.to,
    required this.routes,
    required this.distance,
    required this.routeCount,
  });

  factory GraphEdge.fromJson(Map<String, dynamic> json) {
    return GraphEdge(
      to: json['to'] as int,
      routes: List<String>.from(json['routes'] as List),
      distance: (json['distance'] as num).toDouble(),
      routeCount: json['route_count'] as int,
    );
  }
}

/// Transfer point in the network
class TransferPoint {
  final int stopId;
  final String name;
  final String township;
  final List<String> routes;
  final int routeCount;

  const TransferPoint({
    required this.stopId,
    required this.name,
    required this.township,
    required this.routes,
    required this.routeCount,
  });

  factory TransferPoint.fromJson(Map<String, dynamic> json) {
    return TransferPoint(
      stopId: json['stop_id'] as int,
      name: json['name'] as String,
      township: json['township'] as String,
      routes: List<String>.from(json['routes'] as List),
      routeCount: json['route_count'] as int,
    );
  }
}

/// Complete planner graph for pathfinding
class PlannerGraph {
  final PlannerGraphMetadata metadata;
  final Map<String, GraphNode> nodes;
  final Map<String, List<GraphEdge>> adjacency;
  final List<TransferPoint> transferPoints;

  const PlannerGraph({
    required this.metadata,
    required this.nodes,
    required this.adjacency,
    required this.transferPoints,
  });

  factory PlannerGraph.fromJson(Map<String, dynamic> json) {
    // Parse nodes
    final nodesJson = json['nodes'] as Map<String, dynamic>;
    final nodes = nodesJson.map(
      (key, value) => MapEntry(key, GraphNode.fromJson(value)),
    );

    // Parse adjacency
    final adjJson = json['adjacency'] as Map<String, dynamic>;
    final adjacency = adjJson.map(
      (key, value) => MapEntry(
        key,
        (value as List).map((e) => GraphEdge.fromJson(e)).toList(),
      ),
    );

    // Parse transfer points
    final transferPoints = (json['transfer_points'] as List)
        .map((t) => TransferPoint.fromJson(t))
        .toList();

    return PlannerGraph(
      metadata: PlannerGraphMetadata.fromJson(json['metadata']),
      nodes: nodes,
      adjacency: adjacency,
      transferPoints: transferPoints,
    );
  }

  /// Get edges from a specific node
  List<GraphEdge> getEdges(int nodeId) {
    return adjacency[nodeId.toString()] ?? [];
  }

  /// Get a node by ID
  GraphNode? getNode(int nodeId) {
    return nodes[nodeId.toString()];
  }
}

/// Metadata for the planner graph
class PlannerGraphMetadata {
  final String generated;
  final int totalNodes;
  final int totalEdges;
  final String description;

  const PlannerGraphMetadata({
    required this.generated,
    required this.totalNodes,
    required this.totalEdges,
    required this.description,
  });

  factory PlannerGraphMetadata.fromJson(Map<String, dynamic> json) {
    return PlannerGraphMetadata(
      generated: json['generated'] as String,
      totalNodes: json['total_nodes'] as int,
      totalEdges: json['total_edges'] as int,
      description: json['description'] as String,
    );
  }
}
