import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/transit_provider.dart';
import '../../widgets/stop_search_field.dart';
import '../../widgets/map_view.dart';
import '../../widgets/path_result_card.dart';

class PlannerTab extends StatelessWidget {
  const PlannerTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<TransitProvider>(
      builder: (context, provider, child) {
        return Column(
          children: [
            // Search inputs
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 4,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                children: [
                  // Origin search
                  StopSearchField(
                    label: 'စတင်မည့်နေရာ',
                    hint: 'စတင်မည့်နေရာရွေးရန်...',
                    selectedStop: provider.originStop,
                    markerColor: Colors.green,
                    markerLabel: 'A',
                    onSelectStop: provider.setOrigin,
                    onClear: () => provider.setOrigin(null),
                  ),
                  const SizedBox(height: 8),
                  
                  // Swap button
                  Row(
                    children: [
                      const Expanded(child: Divider()),
                      IconButton(
                        onPressed: provider.originStop != null || provider.destinationStop != null
                            ? provider.swapOriginDestination
                            : null,
                        icon: const Icon(Icons.swap_vert),
                        tooltip: 'Swap',
                      ),
                      const Expanded(child: Divider()),
                    ],
                  ),
                  const SizedBox(height: 8),
                  
                  // Destination search
                  StopSearchField(
                    label: 'သွားမည့်နေရာ',
                    hint: 'သွားမည့်နေရာရွေးရန်...',
                    selectedStop: provider.destinationStop,
                    markerColor: Colors.red,
                    markerLabel: 'B',
                    onSelectStop: provider.setDestination,
                    onClear: () => provider.setDestination(null),
                  ),
                  
                  // Clear button
                  if (provider.originStop != null || provider.destinationStop != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: TextButton(
                        onPressed: provider.clearRoute,
                        child: const Text('အားလုံးရှင်းရန်'),
                      ),
                    ),
                ],
              ),
            ),
            
            // Map and results
            Expanded(
              child: Stack(
                children: [
                  // Map
                  MapViewWidget(
                    originStop: provider.originStop,
                    destinationStop: provider.destinationStop,
                    currentPath: provider.currentPath,
                  ),
                  
                  // Path result overlay
                  if (provider.currentPath != null && provider.currentPath!.found)
                    Positioned(
                      left: 16,
                      right: 16,
                      bottom: 16,
                      child: PathResultCard(pathResult: provider.currentPath!),
                    ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}
