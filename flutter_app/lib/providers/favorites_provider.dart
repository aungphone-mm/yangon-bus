import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

/// Favorite stop info (lightweight, for storage)
class FavoriteStop {
  final int id;
  final String nameEn;
  final String nameMm;
  final String townshipEn;

  const FavoriteStop({
    required this.id,
    required this.nameEn,
    required this.nameMm,
    required this.townshipEn,
  });

  factory FavoriteStop.fromJson(Map<String, dynamic> json) {
    return FavoriteStop(
      id: json['id'] as int,
      nameEn: json['name_en'] as String,
      nameMm: json['name_mm'] as String,
      townshipEn: json['township_en'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name_en': nameEn,
      'name_mm': nameMm,
      'township_en': townshipEn,
    };
  }
}

/// Provider for managing favorite stops
class FavoritesProvider extends ChangeNotifier {
  static const String _storageKey = 'favorite_stops';
  
  List<FavoriteStop> _favorites = [];
  bool _isLoaded = false;

  List<FavoriteStop> get favorites => _favorites;
  bool get isLoaded => _isLoaded;
  int get count => _favorites.length;

  /// Load favorites from storage
  Future<void> loadFavorites() async {
    if (_isLoaded) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonString = prefs.getString(_storageKey);
      
      if (jsonString != null) {
        final List<dynamic> jsonList = json.decode(jsonString);
        _favorites = jsonList
            .map((j) => FavoriteStop.fromJson(j as Map<String, dynamic>))
            .toList();
      }
      
      _isLoaded = true;
      notifyListeners();
    } catch (e) {
      print('Error loading favorites: $e');
      _isLoaded = true;
      notifyListeners();
    }
  }

  /// Save favorites to storage
  Future<void> _saveFavorites() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList = _favorites.map((f) => f.toJson()).toList();
      await prefs.setString(_storageKey, json.encode(jsonList));
    } catch (e) {
      print('Error saving favorites: $e');
    }
  }

  /// Check if a stop is favorited
  bool isFavorite(int stopId) {
    return _favorites.any((f) => f.id == stopId);
  }

  /// Toggle favorite status for a stop
  Future<void> toggleFavorite({
    required int id,
    required String nameEn,
    required String nameMm,
    required String townshipEn,
  }) async {
    final existingIndex = _favorites.indexWhere((f) => f.id == id);
    
    if (existingIndex >= 0) {
      _favorites.removeAt(existingIndex);
    } else {
      _favorites.add(FavoriteStop(
        id: id,
        nameEn: nameEn,
        nameMm: nameMm,
        townshipEn: townshipEn,
      ));
    }
    
    notifyListeners();
    await _saveFavorites();
  }

  /// Add a favorite
  Future<void> addFavorite(FavoriteStop favorite) async {
    if (!isFavorite(favorite.id)) {
      _favorites.add(favorite);
      notifyListeners();
      await _saveFavorites();
    }
  }

  /// Remove a favorite
  Future<void> removeFavorite(int stopId) async {
    _favorites.removeWhere((f) => f.id == stopId);
    notifyListeners();
    await _saveFavorites();
  }

  /// Clear all favorites
  Future<void> clearFavorites() async {
    _favorites.clear();
    notifyListeners();
    await _saveFavorites();
  }
}
