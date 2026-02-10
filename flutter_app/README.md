# Yangon Bus App - Flutter Version

A Flutter mobile application for finding bus routes in Yangon, Myanmar.

## 🚀 Quick Start

### Prerequisites

1. **Install Flutter SDK** (version 3.2.0 or higher)
   - Download from [flutter.dev](https://flutter.dev/docs/get-started/install/windows)
   - Extract to `C:\flutter`
   - Add `C:\flutter\bin` to your PATH
   - Run `flutter doctor` to verify installation

2. **Install Android Studio** for Android SDK and emulator

### Setup

1. **Initialize Flutter project structure**:
   ```powershell
   cd d:\project\yangon-bus-app\flutter_app
   flutter create . --project-name yangon_bus --org com.yangonbus
   ```

2. **Copy data files**:
   ```powershell
   # Create assets directory
   mkdir assets\data
   
   # Copy your JSON data files
   copy ..\public\data\stop_lookup.json assets\data\
   copy ..\public\data\planner_graph.json assets\data\
   ```

3. **Get dependencies**:
   ```powershell
   flutter pub get
   ```

4. **Run the app**:
   ```powershell
   # Run in debug mode
   flutter run
   
   # Or with a specific device
   flutter devices
   flutter run -d <device_id>
   ```

### Build APK

```powershell
# Debug APK (for testing)
flutter build apk --debug

# Release APK (for production)
flutter build apk --release

# The APK will be at:
# build/app/outputs/flutter-apk/app-release.apk
```

## 📁 Project Structure

```
flutter_app/
├── lib/
│   ├── main.dart                    # App entry point
│   ├── theme/
│   │   └── app_theme.dart           # Material 3 theme
│   ├── models/                      # Data models
│   │   ├── models.dart              # Barrel export
│   │   ├── stop.dart                # Bus stop
│   │   ├── route_info.dart          # Route info
│   │   ├── stop_lookup.dart         # Stop lookup data
│   │   ├── path_result.dart         # Pathfinding result
│   │   └── planner_graph.dart       # Graph for pathfinding
│   ├── services/
│   │   ├── transit_service.dart     # Data loading
│   │   └── pathfinding_service.dart # Route planning
│   ├── providers/
│   │   ├── transit_provider.dart    # Main state
│   │   └── favorites_provider.dart  # Favorites storage
│   ├── screens/
│   │   ├── home_screen.dart         # Main screen with tabs
│   │   └── tabs/
│   │       ├── planner_tab.dart     # Route planner
│   │       ├── search_tab.dart      # Stop search
│   │       ├── favorites_tab.dart   # Saved stops
│   │       ├── hubs_tab.dart        # Major hubs
│   │       └── routes_tab.dart      # All routes
│   └── widgets/
│       ├── map_view.dart            # Map component
│       ├── stop_list_tile.dart      # Stop list item
│       ├── stop_search_field.dart   # Search with autocomplete
│       └── path_result_card.dart    # Route results
├── assets/
│   └── data/
│       ├── stop_lookup.json         # Stop data
│       └── planner_graph.json       # Graph data
└── pubspec.yaml                     # Dependencies
```

## 🔧 Features

- ✅ **Route Planning** - Find bus routes between two stops
- ✅ **Stop Search** - Search by name (English/Burmese), township, road
- ✅ **Favorites** - Save frequently used stops
- ✅ **Hub Stops** - View major transit hubs
- ✅ **All Routes** - Browse all bus routes
- ✅ **Interactive Map** - OpenStreetMap with markers
- ✅ **Dark Mode** - Automatic dark theme support
- ✅ **Burmese Language** - Full Myanmar language support

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| `flutter_map` | OpenStreetMap integration |
| `latlong2` | Coordinate handling |
| `provider` | State management |
| `shared_preferences` | Local storage |
| `geolocator` | GPS location |

## 🔜 Next Steps

To complete the app:

1. Copy your existing JSON data files to `assets/data/`
2. Test the app on an emulator or real device
3. Add any missing features (location picker, etc.)
4. Customize the UI to match your preferences
5. Build and sign the release APK

## 📱 Building for Release

```powershell
# 1. Create a keystore (only once)
keytool -genkey -v -keystore yangon-bus-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias yangonbus

# 2. Configure signing in android/app/build.gradle

# 3. Build release APK
flutter build apk --release
```

The signed APK will be ready for distribution!
