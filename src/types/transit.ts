// Transit data types for Yangon Bus App

export interface RouteInfo {
  id: string;
  name: string;
  agency: string;
  color: string;
  position: 'start' | 'middle' | 'end';
}

export interface Stop {
  id: number;
  name_en: string;
  name_mm: string;
  lat: number;
  lng: number;
  township_en: string;
  township_mm?: string;
  road_en: string;
  road_mm?: string;
  route_count: number;
  routes: RouteInfo[];
  is_hub: boolean;
  is_transfer_point: boolean;
}

export interface StopLookup {
  metadata: {
    generated: string;
    total_stops: number;
    stops_with_routes: number;
    description: string;
  };
  stops: Record<string, Stop>;
  by_township: Record<string, {
    stop_count: number;
    stops: Array<{ id: number; name: string; route_count: number }>;
  }>;
  hubs: Array<{
    stop_id: number;
    name: string;
    township: string;
    route_count: number;
  }>;
}

export interface GraphNode {
  id: number;
  name_en: string;
  name_mm: string;
  lat: number;
  lng: number;
  township: string;
}

export interface GraphEdge {
  to: number;
  routes: string[];
  distance: number;
  route_count: number;
}

export interface PlannerGraph {
  metadata: {
    generated: string;
    total_nodes: number;
    total_edges: number;
    description: string;
  };
  nodes: Record<string, GraphNode>;
  adjacency: Record<string, GraphEdge[]>;
  transfer_points: Array<{
    stop_id: number;
    name: string;
    township: string;
    routes: string[];
    route_count: number;
  }>;
}

export interface PathSegment {
  from: number;
  to: number;
  fromName: string;
  toName: string;
  routes: string[];
  distance: number;
  routeUsed?: string; // The actual route used for this segment
  isTransferPoint?: boolean; // Whether to transfer at the destination of this segment
}

export interface PathResult {
  found: boolean;
  path: number[];
  segments: PathSegment[];
  totalDistance: number;
  totalStops: number;
  transfers: number;
  suggestedRoute: string | null;
}

export interface SearchResult {
  stop: Stop;
  score: number;
  matchedField: string;
}
