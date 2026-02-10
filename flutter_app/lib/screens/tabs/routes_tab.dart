import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/transit_provider.dart';
import '../../widgets/stop_list_tile.dart';

class RoutesTab extends StatefulWidget {
  const RoutesTab({super.key});

  @override
  State<RoutesTab> createState() => _RoutesTabState();
}

class _RoutesTabState extends State<RoutesTab> {
  String? _selectedRouteId;

  @override
  Widget build(BuildContext context) {
    return Consumer<TransitProvider>(
      builder: (context, provider, child) {
        final routeIds = provider.allRouteIds.toList()..sort();

        return Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              color: Theme.of(context).colorScheme.primary,
              child: Row(
                children: [
                  const Icon(Icons.route, color: Colors.white),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _selectedRouteId != null ? 'လမ်းကြောင်း $_selectedRouteId' : 'လမ်းကြောင်းအားလုံး',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      Text(
                        _selectedRouteId != null 
                            ? 'လမ်းကြောင်းမှတ်တိုင်များ' 
                            : '${routeIds.length} လမ်းကြောင်းများရရှိနိုင်သည်',
                        style: const TextStyle(color: Colors.white70),
                      ),
                    ],
                  ),
                  const Spacer(),
                  if (_selectedRouteId != null)
                    TextButton(
                      onPressed: () => setState(() => _selectedRouteId = null),
                      child: const Text(
                        'အားလုံးပြရန်',
                        style: TextStyle(color: Colors.white),
                      ),
                    ),
                ],
              ),
            ),
            
            // Content
            Expanded(
              child: _selectedRouteId == null
                  ? _buildRoutesList(context, routeIds)
                  : _buildStopsList(context, provider),
            ),
          ],
        );
      },
    );
  }

  Widget _buildRoutesList(BuildContext context, List<String> routeIds) {
    return ListView.builder(
      itemCount: routeIds.length,
      itemBuilder: (context, index) {
        final routeId = routeIds[index];
        
        return ListTile(
          leading: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: Text(
                routeId,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          title: Text('လမ်းကြောင်း $routeId'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => setState(() => _selectedRouteId = routeId),
        );
      },
    );
  }

  Widget _buildStopsList(BuildContext context, TransitProvider provider) {
    final stops = provider.getStopsForRoute(_selectedRouteId!);
    
    return ListView.builder(
      itemCount: stops.length,
      itemBuilder: (context, index) {
        final stop = stops[index];
        return StopListTile(
          stop: stop,
          onTap: () => provider.selectStop(stop),
        );
      },
    );
  }
}
