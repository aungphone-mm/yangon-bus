import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/transit_provider.dart';

class HubsTab extends StatelessWidget {
  const HubsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<TransitProvider>(
      builder: (context, provider, child) {
        final hubs = provider.hubs.take(30).toList();

        return Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              color: Theme.of(context).colorScheme.secondary,
              child: const Row(
                children: [
                  Icon(Icons.hub, color: Colors.white),
                  SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'လမ်းဆုံမှတ်တိုင်များ',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      Text(
                        'အများဆုံးဘတ်စ်လမ်းကြောင်းရှိသောမှတ်တိုင်များ',
                        style: TextStyle(color: Colors.white70),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            
            // Hubs list
            Expanded(
              child: ListView.builder(
                itemCount: hubs.length,
                itemBuilder: (context, index) {
                  final hub = hubs[index];
                  final stop = provider.getStop(hub.stopId);

                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: Colors.grey[200],
                      child: Text(
                        '${index + 1}',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.secondary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    title: Text(hub.name),
                    subtitle: Text(hub.township),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.blue[50],
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '${hub.routeCount} လမ်းကြောင်း',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    onTap: () {
                      if (stop != null) {
                        provider.selectStop(stop);
                      }
                    },
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }
}
