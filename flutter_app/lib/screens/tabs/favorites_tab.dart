import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/transit_provider.dart';
import '../../providers/favorites_provider.dart';
import '../../widgets/stop_list_tile.dart';

class FavoritesTab extends StatelessWidget {
  const FavoritesTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer2<FavoritesProvider, TransitProvider>(
      builder: (context, favorites, transit, child) {
        if (favorites.count == 0) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.star_outline,
                  size: 80,
                  color: Colors.grey[300],
                ),
                const SizedBox(height: 16),
                Text(
                  'အကြိုက်ဆုံးမှတ်တိုင်များမရှိသေးပါ',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Colors.grey[500],
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'မှတ်တိုင်များရှာပြီး ကြယ်ပွင့်ကိုနှိပ်၍ သိမ်းဆည်းပါ',
                  style: TextStyle(color: Colors.grey[400]),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        }

        return Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              color: Colors.amber,
              child: Row(
                children: [
                  const Icon(Icons.star, color: Colors.white),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'ကျွန်ုပ်၏အကြိုက်ဆုံးမှတ်တိုင်များ',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        Text(
                          '${favorites.count} သိမ်းဆည်းထားသောမှတ်တိုင်',
                          style: const TextStyle(color: Colors.white70),
                        ),
                      ],
                    ),
                  ),
                  TextButton(
                    onPressed: () => _confirmClearAll(context, favorites),
                    child: const Text(
                      'အားလုံးရှင်းရန်',
                      style: TextStyle(color: Colors.white70),
                    ),
                  ),
                ],
              ),
            ),
            
            // Favorites list
            Expanded(
              child: ListView.builder(
                itemCount: favorites.favorites.length,
                itemBuilder: (context, index) {
                  final fav = favorites.favorites[index];
                  final stop = transit.getStop(fav.id);
                  
                  if (stop == null) {
                    return ListTile(
                      title: Text(fav.nameEn),
                      subtitle: Text(fav.townshipEn),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () => favorites.removeFavorite(fav.id),
                      ),
                    );
                  }
                  
                  return StopListTile(
                    stop: stop,
                    trailing: IconButton(
                      icon: const Icon(Icons.star, color: Colors.amber),
                      onPressed: () => favorites.removeFavorite(stop.id),
                    ),
                    onTap: () => transit.selectStop(stop),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }

  void _confirmClearAll(BuildContext context, FavoritesProvider favorites) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('အားလုံးရှင်းမလား?'),
        content: const Text('သိမ်းဆည်းထားသောမှတ်တိုင်များအားလုံးကို ဖျက်ပစ်မည်။'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('မလုပ်တော့ပါ'),
          ),
          ElevatedButton(
            onPressed: () {
              favorites.clearFavorites();
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('ရှင်းမည်'),
          ),
        ],
      ),
    );
  }
}
