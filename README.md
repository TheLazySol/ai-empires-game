# AI Empires Game

A multiplayer, web-based grand strategy game where players fight for land resources, create trade routes, and grow their population from a small settlement to a giant empire.

## Features

- **Interactive Voronoi-based Map**: Procedurally generated 200x200 tile map with zoom, pan, and multiple view modes
- **Three Map Views**: 
  - Terrain: Base map with white land and blue water
  - Political: Shows player territories with distinct colors
  - Resources: Displays resource icons and tile tints
- **Settlement System**: Right-click on land to create settlements
- **Resource Management**: 9 different resource types (Wheat, Water, Wood, Cotton, Bronze, Iron, Gold, Coal, Wildlife)
- **Player System**: Create your nation with custom name and color
- **Bottom Panel**: Overview and Production tabs with nation statistics

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Rendering**: PixiJS for high-performance map rendering
- **State Management**: Jotai
- **Database**: Supabase (PostgreSQL)
- **UI Components**: shadcn/ui, Aceternity UI, Framer Motion
- **Icons**: Lucide React

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the SQL from `supabase-schema.sql`
3. Get your project URL and anon key from Settings > API

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Generate Initial Map

Before running the app, generate a map:

```bash
pnpm run regenerate-map
```

Or with a custom seed:

```bash
pnpm run regenerate-map my-custom-seed
```

### 5. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **First Time Setup**: When you first load the game, you'll be prompted to create your nation:
   - Enter a nation name
   - Choose a color for your empire

2. **Map Interaction**:
   - **Left Click + Drag**: Pan the map
   - **Scroll Wheel**: Zoom in/out (0.25x to 5x)
   - **Right Click**: Open context menu to settle on land tiles

3. **Map Views**: Use the view selector in the top-left to switch between:
   - Terrain (default)
   - Political (shows territories)
   - Resources (shows resource locations)

4. **Bottom Panel**: 
   - **Overview Tab**: View and edit your nation name, population, and territory count
   - **Production Tab**: Coming soon - will show resource production

## Regenerating the Map

To create a new map (this will clear all settlements and territories):

```bash
pnpm run regenerate-map [optional-seed]
```

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   └── page.tsx           # Main game page
├── components/
│   ├── map/               # Map components
│   ├── panels/            # Bottom panel tabs
│   ├── modals/            # Modal components
│   └── ui/                # shadcn/ui components
├── hooks/                 # React hooks
├── lib/                   # Utilities and helpers
├── store/                 # Jotai state atoms
└── types/                 # TypeScript types
```

## Database Schema

The game uses the following Supabase tables:

- **maps**: Stores generated map data with Voronoi cells
- **players**: Player/nation information
- **settlements**: Settlement locations and data
- **territories**: Cell ownership (for future expansion mechanics)

See `supabase-schema.sql` for the complete schema.

## Future Enhancements

- Territory expansion mechanics based on resources and goods
- Trade route system
- Diplomacy system
- Population growth calculations
- Multiplayer real-time updates
- More resource types and production chains

## Development Notes

- Map generation uses Poisson disc sampling for Voronoi site placement
- Resources are distributed biome-based (coastal vs. central areas)
- Settlement expansion mechanics will be implemented in a later phase
- The game currently uses guest IDs stored in localStorage for player identification
