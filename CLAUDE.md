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
- **planner**: Route planning between two stops using BFS
- **favorites**: LocalStorage-persisted favorite stops
- **hubs**: Major transfer points (5+ routes)
- **all-routes**: Network visualization with route filtering

Each tab conditionally renders its content and controls what data is passed to the shared MapView component.

### Route Processing for "All Routes" Tab

The `processAllRoutes()` function (in `page.tsx`) builds route line segments by:

1. Iterating through graph adjacency list (not stop_lookup)
2. Extracting route IDs from each edge's `routes` array
3. Creating polyline segments from node coordinates
4. Grouping segments by route ID with color metadata

This approach accurately represents the network without assumptions about route continuity.

### MapView Component & Leaflet Integration

**Critical**: MapView (`src/components/MapView.tsx`) is dynamically imported with `ssr: false` to avoid Leaflet SSR issues.

**Map Initialization Pattern**:
- Map is initialized once in the first useEffect
- Subsequent updates (center/zoom, markers, routes, paths) use separate useEffects
- All map operations MUST check readiness: `map._loaded && map.getSize().x > 0 && map.getSize().y > 0`
- Always call `map.invalidateSize()` before adding layers or changing view
- Use setTimeout delays (50-100ms) to ensure projection is ready

**Common Pitfall**: Attempting to add polylines or markers before the map container has dimensions causes "Cannot read properties of undefined (reading 'x')" errors in Leaflet's projection code.

### State Management Pattern

State flows unidirectionally from page.tsx to components:

- **page.tsx** owns all data fetching, tab state, and selections
- Components receive data via props and emit events via callbacks
- MapView is purely presentational - it receives stops, routes, paths but doesn't manage them
- Favorites are managed by custom hook `useFavorites` using LocalStorage

### Pathfinding Algorithm

**BFS Implementation** (`src/lib/pathfinder.ts`):
- Optimizes for fewest stops (not shortest distance)
- Reconstructs path by backtracking through parent map
- Suggests optimal route by analyzing route frequency across segments
- Counts transfers by tracking route changes

The graph structure allows O(V+E) pathfinding where V = stops, E = connections.

### Search Implementation

Uses Fuse.js with weighted field matching:
- `name_en`, `name_mm`: weight 1.0 (highest priority)
- `township_en`, `road_en`: weight 0.7
- Threshold: 0.4 for fuzzy matching balance

Search logic is in `src/lib/search.ts`.

## TypeScript Types

All transit data types are in `src/types/transit.ts`:

- **Stop**: Individual bus stop with routes, location, metadata
- **StopLookup**: Complete stop database structure
- **PlannerGraph**: Network graph with nodes and adjacency list
- **PathResult**: BFS pathfinding result
- **RouteInfo**: Route metadata (id, name, color, position)

## Styling & UI

- **Framework**: Tailwind CSS with custom theme colors
- **Colors**: Primary (#405CAA), Secondary (#2C8A6C), Accent (#DF504E)
- **Responsive**: Mobile-first design with lg: breakpoint for desktop layout
- **Icons**: Inline SVG paths from Heroicons

## Map Operations

When working with MapView:

1. **Adding markers/polylines**: Wrap in try-catch, check map readiness first
2. **Changing view**: Always call `invalidateSize()` before `setView()`
3. **Route filtering**: Pass filtered `allRoutes` array to MapView
4. **Stop filtering**: Pass filtered `stops` array to MapView
5. **Cleanup**: Store references in refs and remove layers in cleanup functions

## Data Update Process

To update transit data:

1. Replace JSON files in `/public/data/`
2. Ensure `stop_lookup.json` structure matches StopLookup interface
3. Ensure `planner_graph.json` structure matches PlannerGraph interface
4. No code changes needed if structure is preserved

## Deployment

- **Vercel**: Auto-detects Next.js, zero config
- **Cloudflare Pages**: Build first, deploy `out/` directory
- The app is a static export (no server-side rendering)
