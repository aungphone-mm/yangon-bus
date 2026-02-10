import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/transit_provider.dart';
import '../providers/favorites_provider.dart';
import 'tabs/planner_tab.dart';
import 'tabs/search_tab.dart';
import 'tabs/favorites_tab.dart';
import 'tabs/hubs_tab.dart';
import 'tabs/routes_tab.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _tabs = const [
    PlannerTab(),
    SearchTab(),
    FavoritesTab(),
    HubsTab(),
    RoutesTab(),
  ];

  final List<NavigationDestination> _destinations = const [
    NavigationDestination(
      icon: Icon(Icons.map_outlined),
      selectedIcon: Icon(Icons.map),
      label: 'လမ်းကြောင်း',
    ),
    NavigationDestination(
      icon: Icon(Icons.search_outlined),
      selectedIcon: Icon(Icons.search),
      label: 'ရှာဖွေရန်',
    ),
    NavigationDestination(
      icon: Icon(Icons.star_outline),
      selectedIcon: Icon(Icons.star),
      label: 'အကြိုက်ဆုံး',
    ),
    NavigationDestination(
      icon: Icon(Icons.hub_outlined),
      selectedIcon: Icon(Icons.hub),
      label: 'လမ်းဆုံ',
    ),
    NavigationDestination(
      icon: Icon(Icons.route_outlined),
      selectedIcon: Icon(Icons.route),
      label: 'အားလုံး',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final transitProvider = context.read<TransitProvider>();
    final favoritesProvider = context.read<FavoritesProvider>();

    await Future.wait([
      transitProvider.loadData(),
      favoritesProvider.loadFavorites(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<TransitProvider>(
      builder: (context, transitProvider, child) {
        if (transitProvider.isLoading) {
          return Scaffold(
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(),
                  const SizedBox(height: 16),
                  Text(
                    'ရန်ကုန်ဘတ်စ်အချက်အလက်တင်နေသည်...',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                ],
              ),
            ),
          );
        }

        if (transitProvider.error != null) {
          return Scaffold(
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 64, color: Colors.red[400]),
                  const SizedBox(height: 16),
                  Text(
                    'အချက်အလက်တင်ရန်မအောင်မြင်ပါ',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(transitProvider.error!),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadData,
                    child: const Text('ထပ်စမ်းရန်'),
                  ),
                ],
              ),
            ),
          );
        }

        return Scaffold(
          appBar: AppBar(
            title: Row(
              children: [
                const Icon(Icons.directions_bus),
                const SizedBox(width: 8),
                const Text('YBS'),
                const Spacer(),
                Text(
                  '${transitProvider.totalStops} မှတ်တိုင်',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.white70,
                  ),
                ),
              ],
            ),
          ),
          body: IndexedStack(
            index: _currentIndex,
            children: _tabs,
          ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _currentIndex,
            onDestinationSelected: (index) {
              setState(() => _currentIndex = index);
            },
            destinations: _destinations,
          ),
        );
      },
    );
  }
}
