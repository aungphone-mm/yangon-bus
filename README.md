# Yangon Bus Transit App

A web application for searching bus stops, finding routes, and planning journeys across Yangon, Myanmar.

## Features

- **Stop Search** - Search by name (English/Myanmar), township, or road
- **Route Planner** - Find the best path between any two stops
- **Hub Directory** - Browse major transfer points
- **Interactive Map** - Visualize stops and routes on OpenStreetMap
- **Mobile Friendly** - Responsive design, works on all devices
- **Offline Ready** - PWA support for offline use

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

```bash
# Navigate to project directory
cd yangon-bus-app

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
```

This creates a static export in the `out/` directory.

## Deploy to Vercel

### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Option 2: GitHub Integration

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Click "Deploy"

That's it! Vercel auto-detects Next.js and configures everything.

## Deploy to Cloudflare Pages

```bash
# Build the project
npm run build

# Install Wrangler
npm install -g wrangler

# Deploy
wrangler pages deploy out
```

## Project Structure

```
yangon-bus-app/
├── public/
│   └── data/
│       ├── stop_lookup.json    # Stop data with routes
│       └── planner_graph.json  # Pathfinding graph
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main page
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── StopSearch.tsx      # Search component
│   │   ├── StopDetail.tsx      # Stop info display
│   │   ├── RoutePlanner.tsx    # Journey planner
│   │   └── MapView.tsx         # Leaflet map
│   ├── lib/
│   │   ├── pathfinder.ts       # BFS pathfinding
│   │   └── search.ts           # Fuse.js search
│   └── types/
│       └── transit.ts          # TypeScript types
├── package.json
├── tailwind.config.ts
└── next.config.js
```

## Data Sources

- **Routes**: 125 bus routes from YRTA, YBPC, and other operators
- **Stops**: 2,093 bus stops across 44 townships
- **Network**: 3,008 connections between stops

## Tech Stack

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **Search**: Fuse.js (fuzzy search)
- **Maps**: Leaflet + OpenStreetMap
- **Language**: TypeScript

## Customization

### Update Transit Data

Replace the JSON files in `public/data/` with new data:
- `stop_lookup.json` - Stop information and routes
- `planner_graph.json` - Stop connections for pathfinding

### Change Theme Colors

Edit `tailwind.config.ts`:

```ts
theme: {
  extend: {
    colors: {
      primary: '#405CAA',   // Main color
      secondary: '#2C8A6C', // Accent color
      accent: '#DF504E',    // Highlight color
    },
  },
},
```

## License

MIT License - Feel free to use and modify for your own projects.

## Credits

- Transit data: YRTA (Yangon Region Transport Authority)
- Map tiles: OpenStreetMap contributors
