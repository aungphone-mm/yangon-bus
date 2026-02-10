import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/favorites_provider.dart';
import '../models/models.dart';

class StopListTile extends StatelessWidget {
  final Stop stop;
  final VoidCallback? onTap;
  final Widget? trailing;

  const StopListTile({
    super.key,
    required this.stop,
    this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<FavoritesProvider>(
      builder: (context, favorites, child) {
        final isFavorite = favorites.isFavorite(stop.id);
        
        return ListTile(
          leading: CircleAvatar(
            backgroundColor: stop.isHub 
                ? Colors.amber 
                : Color.alphaBlend(Theme.of(context).colorScheme.primary.withAlpha(25), Colors.white),
            child: stop.isHub
                ? const Text('H', style: TextStyle(fontWeight: FontWeight.bold))
                : Icon(
                    Icons.directions_bus,
                    color: Theme.of(context).colorScheme.primary,
                    size: 20,
                  ),
          ),
          title: Text(
            stop.nameEn,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                stop.nameMm,
                style: const TextStyle(fontSize: 12),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                '${stop.townshipEn} • ${stop.routeCount} လမ်းကြောင်း',
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey[500],
                ),
              ),
            ],
          ),
          isThreeLine: true,
          trailing: trailing ?? Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                icon: Icon(
                  isFavorite ? Icons.star : Icons.star_outline,
                  color: isFavorite ? Colors.amber : Colors.grey,
                ),
                onPressed: () {
                  favorites.toggleFavorite(
                    id: stop.id,
                    nameEn: stop.nameEn,
                    nameMm: stop.nameMm,
                    townshipEn: stop.townshipEn,
                  );
                },
              ),
            ],
          ),
          onTap: onTap,
        );
      },
    );
  }
}
