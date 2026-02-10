import 'package:flutter/material.dart';
import '../models/models.dart';

class PathResultCard extends StatelessWidget {
  final PathResult pathResult;

  const PathResultCard({
    super.key,
    required this.pathResult,
  });

  @override
  Widget build(BuildContext context) {
    if (!pathResult.found) {
      return Card(
        color: Colors.red[50],
        child: const Padding(
          padding: EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(Icons.error_outline, color: Colors.red),
              SizedBox(width: 12),
              Text('လမ်းကြောင်းမတွေ့ပါ'),
            ],
          ),
        ),
      );
    }

    return Card(
      elevation: 8,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.green[100],
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.check, color: Colors.green[700], size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'လမ်းကြောင်းတွေ့ပါပြီ',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      if (pathResult.suggestedRoute != null)
                        Text(
                          'အကြံပြုလမ်းကြောင်း: ${pathResult.suggestedRoute}',
                          style: TextStyle(color: Colors.grey[600], fontSize: 12),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 16),
            const Divider(height: 1),
            const SizedBox(height: 16),
            
            // Stats
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStat(
                  context,
                  Icons.linear_scale,
                  '${pathResult.totalStops}',
                  'မှတ်တိုင်',
                ),
                _buildStat(
                  context,
                  Icons.swap_horiz,
                  '${pathResult.transfers}',
                  'ပြောင်းရန်',
                ),
                _buildStat(
                  context,
                  Icons.straighten,
                  '${(pathResult.totalDistance / 1000).toStringAsFixed(1)}',
                  'km',
                ),
              ],
            ),
            
            // Route details
            if (pathResult.segments.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Divider(height: 1),
              const SizedBox(height: 12),
              
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 150),
                child: SingleChildScrollView(
                  child: Column(
                    children: _buildSegmentWidgets(context),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStat(BuildContext context, IconData icon, String value, String label) {
    return Column(
      children: [
        Icon(icon, color: Theme.of(context).colorScheme.primary),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        Text(
          label,
          style: TextStyle(color: Colors.grey[600], fontSize: 12),
        ),
      ],
    );
  }

  List<Widget> _buildSegmentWidgets(BuildContext context) {
    final widgets = <Widget>[];
    String? currentRoute;

    for (int i = 0; i < pathResult.segments.length; i++) {
      final segment = pathResult.segments[i];
      
      // Show route change
      if (segment.routeUsed != currentRoute) {
        if (currentRoute != null) {
          // Transfer indicator
          widgets.add(
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  const SizedBox(width: 8),
                  Icon(Icons.swap_horiz, color: Colors.orange[700], size: 16),
                  const SizedBox(width: 8),
                  Text(
                    'လမ်းကြောင်းပြောင်းရန်',
                    style: TextStyle(
                      color: Colors.orange[700],
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          );
        }
        
        // New route
        widgets.add(
          Container(
            margin: const EdgeInsets.symmetric(vertical: 4),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                const Icon(Icons.directions_bus, size: 16),
                const SizedBox(width: 8),
                Text(
                  'လမ်းကြောင်း ${segment.routeUsed ?? "?"}',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        );
        
        currentRoute = segment.routeUsed;
      }
      
      // Segment detail
      widgets.add(
        Padding(
          padding: const EdgeInsets.only(left: 16, top: 2, bottom: 2),
          child: Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.grey),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  segment.toName,
                  style: const TextStyle(fontSize: 13),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return widgets;
  }
}
