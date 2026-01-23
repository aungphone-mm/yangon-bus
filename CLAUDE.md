# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Yangon Bus Transit App - A Next.js 14 web application for searching bus stops, finding routes, and planning journeys across Yangon, Myanmar. Features 2,093 stops, 125 routes, and 3,008 connections across 44 townships.

## Development Commands

```bash
# Development server (runs on port 3000 by default)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint
npm lint
```

## Architecture & Key Concepts

### Data Architecture

The app uses two primary JSON data sources loaded at runtime:

1. **`/public/data/stop_lookup.json`** - Stop directory with metadata
   - Indexed by stop ID for O(1) lookup
   - Contains route information for each stop
   - Includes hub classification and transfer points

2. **`/public/data/planner_graph.json`** - Network graph for pathfinding
   - Adjacency list structure for BFS traversal
   - Each edge contains: destination stop, connecting routes, distance
   - Used exclusively for route planning

**Important**: These data files are separate because they serve different purposes - stop_lookup for display/search, planner_graph for algorithms.

### Tab-Based Navigation Pattern

The app uses a single-page architecture with 5 tabs (`src/app/page.tsx`):

- **search**: Stop search with Fuse.js fuzzy matching
- **planner**: Route planning between two stops using Dijkstra with transfer optimization
- **favorites**: LocalStorage-persisted favorite stops
- **hubs**: Major transfer points (5+ routes)
- **all-routes**: Network visualization with route filtering

Each tab conditionally renders its content and controls what data is passed to the shared MapView component.

**Planner Tab UI**:
- Shows actual route used (e.g., "Route 61") instead of all available routes
- Displays transfer point indicators with:
  - Orange highlight box: "Transfer at [Stop Name]"
  - Next route info: "Change to Route [X]"
  - Visual timeline with color-coded dots (green→orange→red)

### Route Processing for "All Routes" Tab

The `processAllRoutes()` function (in `page.tsx`) builds route line segments by:

1. Iterating through graph adjacency list (not stop_lookup)
2. Extracting route IDs from each edge's `routes` array
3. Creating polyline segments from node coordinates
4. Grouping segments by route ID with color metadata

This approach accurately represents the network without assumptions about route continuity.

**Route Filtering Pattern**:
- Uses `selectedRouteId` state to filter displayed routes and stops
- When a route is clicked, filters both the `stops` array and `allRoutes` array
- StopDetail component accepts `onRouteClick` callback for route selection
- "Show All" button resets filter by setting `selectedRouteId` to null

**Route Search Component**:
- `RouteSearch.tsx` provides autocomplete search for route filtering
- Shows selected route as a badge with color indicator and stop count
- Dropdown displays route ID badge (colored), name, and stop count
- Searches with minimum 1 character, shows up to 10 results
- Uses `onSelectRoute` callback to set selected route ID in parent
- Clear button resets selection and calls `onClearRoute` callback

### MapView Component & Leaflet Integration

**Critical**: MapView (`src/components/MapView.tsx`) is dynamically imported with `ssr: false` to avoid Leaflet SSR issues.

**Map Initialization Pattern**:
- Map is initialized once in the first useEffect
- Subsequent updates (center/zoom, markers, routes, paths) use separate useEffects
- All map operations MUST check readiness: `map._loaded && map.getSize().x > 0 && map.getSize().y > 0`
- Always call `map.invalidateSize()` before adding layers or changing view
- Use setTimeout delays (50-100ms) to ensure projection is ready

**Common Pitfall**: Attempting to add polylines or markers before the map container has dimensions causes "Cannot read properties of undefined (reading 'x')" errors in Leaflet's projection code.

**Marker Types** (in planner tab):
- 🟢 **Green "A"** (32x32): Origin stop
- 🟠 **Orange "⇄"** (28x28): Transfer point where passenger changes buses
- 🔴 **Red "B"** (32x32): Destination stop
- 🟡 **Yellow** (24x24): Regular stop or hub (non-planner tabs)

**Transfer Point Visualization**:
- Extracted from `PathResult.segments` where `isTransferPoint === true`
- Passed to MapView via `transferPoints` prop (only in planner tab)
- Map legend updates to show transfer indicator when transfers exist

### State Management Pattern

State flows unidirectionally from page.tsx to components:

- **page.tsx** owns all data fetching, tab state, and selections
- Components receive data via props and emit events via callbacks
- MapView is purely presentational - it receives stops, routes, paths but doesn't manage them
- Favorites are managed by custom hook `useFavorites` using LocalStorage

### Component Structure

**Main Components** (all in `src/components/`):
- **StopSearch**: Autocomplete search for stops using Fuse.js, emits `onSelect` callback
- **StopDetail**: Displays stop info with routes list, accepts `onRouteClick` for route filtering
- **RoutePlanner**: Journey planning UI with origin/destination pickers, emits path results
- **RouteSearch**: Autocomplete search for routes, shows selected route as badge
- **MapView**: Leaflet map display, dynamically imported with `ssr: false`

**Key Props Pattern**:
- All components receive `stopLookup` for data access
- Planner components also receive `graph` for pathfinding
- Selection callbacks flow up: `onSelect`, `onRouteClick`, `onPathFound`, etc.
- MapView receives preprocessed data: `stops[]`, `allRoutes[]`, `currentPath`, `transferPoints[]`

### Pathfinding Algorithms

The app implements two pathfinding approaches in `src/lib/pathfinder.ts`:

#### 1. BFS (Basic) - `findPath()`
- Optimizes for **fewest stops** (not shortest distance)
- Time complexity: O(V+E) where V = 2,080 stops, E = 3,008 connections
- Used as fallback; simple and fast

#### 2. Dijkstra with Transfer Optimization - `findPathWithTransfers()` ⭐ **Default**
- Optimizes for **fewest transfers**, then fewest stops
- Uses custom `MinPriorityQueue` (binary min-heap) implementation
- Time complexity: O((V+E) log V) - acceptable for this graph size
- **Cost formula**: `cost = (transfers × 100) + (stops × 1)`
- **Key insight**: Routes 61 and 78 both go Hledan→Sule, but route 61 has fewer stops (15 vs 17), so it's selected

**Algorithm Design**:
- State space: `(stopId, currentRoute)` pairs, not just stops
- Tracks which route is currently being used
- Transfer occurs when switching from one route to another
- Heavy penalty (100) ensures paths with fewer transfers are strongly preferred

**Path Reconstruction** (`reconstructPathWithRoutes`):
- Tracks actual route used for each segment via `PathParent.route`
- Marks transfer points where `routeUsed` changes between consecutive segments
- Sets `PathSegment.isTransferPoint = true` at transfer locations
- Calculates accurate transfer count from actual route changes

### Search Implementation

The app has two separate search systems in `src/lib/search.ts`:

#### 1. Stop Search (`searchStops()`)
Uses Fuse.js with weighted field matching:
- `name_mm`: weight 2.5 (highest priority for Burmese names)
- `name_en`: weight 1.5
- `road_mm`: weight 1.0
- `township_en`: weight 1.0
- `road_en`: weight 0.5
- Threshold: 0.5, ignoreLocation: true for better fuzzy matching

#### 2. Route Search (`searchRoutes()`)
Separate Fuse.js instance for route autocomplete:
- `id`: weight 2 (route number like "61", "YBS-1")
- `name`: weight 1 (route name like "Hledan-Sule")
- Threshold: 0.3 for stricter matching
- Used by RouteSearch component in "All Routes" tab

**Pattern**: Initialize both search indexes once when stopLookup loads (`initializeSearch()` and `initializeRouteSearch()`). Search functions return empty array if called before initialization.

## TypeScript Types

All transit data types are in `src/types/transit.ts`:

- **Stop**: Individual bus stop with routes, location, metadata
- **StopLookup**: Complete stop database structure
- **PlannerGraph**: Network graph with nodes and adjacency list
- **PathResult**: Pathfinding result with segments, transfers, suggested route
- **PathSegment**: Route segment with:
  - `routeUsed?: string` - The actual route used (e.g., "61")
  - `isTransferPoint?: boolean` - Whether to transfer at destination of this segment
- **RouteInfo**: Route metadata (id, name, color, position)

## Styling & UI

- **Framework**: Tailwind CSS with custom theme colors
- **Colors**: Primary (#405CAA), Secondary (#2C8A6C), Accent (#DF504E)
- **Responsive**: Mobile-first design with lg: breakpoint for desktop layout
- **Icons**: Inline SVG paths from Heroicons
- **Language**: All UI text is in Burmese (Myanmar) by default
  - Stop names: `name_mm` (Burmese) and `name_en` (English)
  - Search prioritizes Burmese text with higher weight (2.5 vs 1.5)
  - Buttons, labels, placeholders all use Burmese text

### Custom Scrollbar Styling

Two scrollbar styles are defined in `globals.css`:

1. **Default subtle scrollbar**: 8px width, light gray (#cbd5e1)
2. **Prominent scrollbar** (`.scrollbar-visible` class): 10px width, darker gray (#64748b) with border

Apply `.scrollbar-visible` to scrollable lists (Favorites, Hubs, All Routes) for better UX.

## Map Operations

When working with MapView:

1. **Adding markers/polylines**: Wrap in try-catch, check map readiness first
2. **Changing view**: Always call `invalidateSize()` before `setView()`
3. **Route filtering**: Pass filtered `allRoutes` array to MapView
4. **Stop filtering**: Pass filtered `stops` array to MapView
5. **Transfer points**: Pass `transferPoints` array (extracted from path segments with `isTransferPoint`)
6. **Cleanup**: Store references in refs and remove layers in cleanup functions

### Interactive Route Selection Flow

The "All Routes" tab supports drill-down interaction:

1. User clicks a stop marker on the map
2. StopDetail component displays with routes at that stop
3. User clicks a route in StopDetail
4. `onRouteClick` callback fires with route ID
5. Parent component sets `selectedRouteId` state
6. Map re-renders showing only that route's stops and lines

**Implementation**: StopDetail accepts `onRouteClick?: (routeId: string) => void` prop. Pass the handler when rendering StopDetail in any tab that needs route filtering.

## Data Update Process

To update transit data:

1. Replace JSON files in `/public/data/`
2. Ensure `stop_lookup.json` structure matches StopLookup interface
3. Ensure `planner_graph.json` structure matches PlannerGraph interface
4. No code changes needed if structure is preserved

## Deployment

The app uses Next.js static export mode (`output: 'export'` in `next.config.js`):
- No server-side rendering or API routes
- Builds to static HTML/CSS/JS in `out/` directory
- Images are unoptimized (no Next.js image optimization)

Deployment options:
- **Vercel**: Auto-detects Next.js, zero config, deploys directly from git
- **Cloudflare Pages**: Run `npm run build` first, then deploy `out/` directory
