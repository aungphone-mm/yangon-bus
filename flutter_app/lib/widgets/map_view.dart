import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../models/models.dart';

class MapViewWidget extends StatefulWidget {
  final Stop? originStop;
  final Stop? destinationStop;
  final Stop? selectedStop;
  final PathResult? currentPath;
  final List<Stop> stops;
  final Function(Stop)? onStopTap;

  const MapViewWidget({
    super.key,
    this.originStop,
    this.destinationStop,
    this.selectedStop,
    this.currentPath,
    this.stops = const [],
    this.onStopTap,
  });

  @override
  State<MapViewWidget> createState() => _MapViewWidgetState();
}

class _MapViewWidgetState extends State<MapViewWidget> {
  final MapController _mapController = MapController();
  static const LatLng _yangonCenter = LatLng(16.8661, 96.1951);

  @override
  void didUpdateWidget(MapViewWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    
    // Auto-fit bounds when origin or destination changes
    if (widget.originStop != null && widget.destinationStop != null) {
      _fitBounds();
    } else if (widget.originStop != null && oldWidget.originStop?.id != widget.originStop?.id) {
      _centerOnStop(widget.originStop!);
    } else if (widget.destinationStop != null && oldWidget.destinationStop?.id != widget.destinationStop?.id) {
      _centerOnStop(widget.destinationStop!);
    }
  }

  void _centerOnStop(Stop stop) {
    _mapController.move(LatLng(stop.lat, stop.lng), 15);
  }

  void _fitBounds() {
    if (widget.originStop == null || widget.destinationStop == null) return;
    
    final bounds = LatLngBounds(
      LatLng(widget.originStop!.lat, widget.originStop!.lng),
      LatLng(widget.destinationStop!.lat, widget.destinationStop!.lng),
    );
    
    _mapController.fitCamera(
      CameraFit.bounds(bounds: bounds, padding: const EdgeInsets.all(50)),
    );
  }

  void _centerOnYangon() {
    _mapController.move(_yangonCenter, 12);
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: _yangonCenter,
            initialZoom: 12,
            interactionOptions: const InteractionOptions(
              flags: InteractiveFlag.all,
            ),
          ),
          children: [
            // Map tiles
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.yangonbus.app',
            ),
            
            // Route polylines
            if (widget.currentPath != null && widget.currentPath!.found)
              PolylineLayer(
                polylines: _buildRoutePolylines(),
              ),
            
            // Stop markers
            MarkerLayer(
              markers: _buildMarkers(),
            ),
          ],
        ),
        // Location button
        Positioned(
          right: 16,
          bottom: 80,
          child: FloatingActionButton.small(
            heroTag: 'location',
            onPressed: _centerOnYangon,
            child: const Icon(Icons.my_location),
          ),
        ),
      ],
    );
  }

  List<Polyline> _buildRoutePolylines() {
    if (widget.currentPath == null || !widget.currentPath!.found) return [];
    
    final polylines = <Polyline>[];
    final colors = [Colors.blue, Colors.red, Colors.green, Colors.orange];
    
    int colorIndex = 0;
    String? lastRoute;
    List<LatLng> currentPoints = [];
    
    for (final segment in widget.currentPath!.segments) {
      if (segment.routeUsed != lastRoute && currentPoints.isNotEmpty) {
        polylines.add(Polyline(
          points: currentPoints,
          color: colors[colorIndex % colors.length],
          strokeWidth: 4,
        ));
        colorIndex++;
        currentPoints = [];
      }
      
      // Note: In real implementation, you'd get actual coordinates from stops
      // This is simplified - you'd need stopLookup to get actual positions
      lastRoute = segment.routeUsed;
    }
    
    return polylines;
  }

  List<Marker> _buildMarkers() {
    final markers = <Marker>[];
    
    // Origin marker
    if (widget.originStop != null) {
      markers.add(_buildMarker(
        widget.originStop!,
        Colors.green,
        'A',
        size: 40,
      ));
    }
    
    // Destination marker
    if (widget.destinationStop != null) {
      markers.add(_buildMarker(
        widget.destinationStop!,
        Colors.red,
        'B',
        size: 40,
      ));
    }
    
    // Selected stop marker
    if (widget.selectedStop != null && 
        widget.selectedStop?.id != widget.originStop?.id &&
        widget.selectedStop?.id != widget.destinationStop?.id) {
      markers.add(_buildMarker(
        widget.selectedStop!,
        Colors.blue,
        '',
        size: 36,
      ));
    }
    
    // Additional stops
    for (final stop in widget.stops) {
      if (stop.id == widget.originStop?.id ||
          stop.id == widget.destinationStop?.id ||
          stop.id == widget.selectedStop?.id) continue;
      
      markers.add(_buildMarker(
        stop,
        stop.isHub ? Colors.amber : Colors.white,
        stop.isHub ? 'H' : '',
        size: 28,
        borderColor: Theme.of(context).colorScheme.primary,
      ));
    }
    
    return markers;
  }

  Marker _buildMarker(
    Stop stop,
    Color color,
    String label, {
    double size = 32,
    Color? borderColor,
  }) {
    return Marker(
      point: LatLng(stop.lat, stop.lng),
      width: size,
      height: size,
      child: GestureDetector(
        onTap: () => widget.onStopTap?.call(stop),
        child: Container(
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(
              color: borderColor ?? Colors.white,
              width: 2,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black26,
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: color == Colors.white || color == Colors.amber
                    ? Colors.black
                    : Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: size * 0.4,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
