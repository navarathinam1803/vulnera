# 🍕 NitroStack Pizza Shop Finder

A comprehensive NitroStack template showcasing interactive pizza shop discovery with maps, lists, and detailed views. This template demonstrates the NitroStack Widget SDK for building beautiful, interactive widgets.

## Features

### 🎨 **Widget SDK Features**
- ✅ `useTheme()` - Automatic dark mode support
- ✅ `useWidgetState()` - Persistent favorites and view preferences
- ✅ `useMaxHeight()` - Responsive height-aware layouts
- ✅ `useDisplayMode()` - Fullscreen mode adaptation
- ✅ `useWidgetSDK()` - Tool calling, navigation, and external links
- ✅ `<WidgetLayout>` - Automatic RPC setup

### 🗺️ **Three Interactive Widgets**
1. **Pizza Map** - Interactive Mapbox map with markers and shop selection
2. **Pizza List** - Grid/list view with sorting, filtering, and favorites
3. **Pizza Shop** - Detailed shop information with contact actions

### 📊 **MCP Tools**
- `show_pizza_map` - Display shops on an interactive map
- `show_pizza_list` - Show filterable list of shops
- `show_pizza_shop` - Display detailed shop information

## 🚀 Quick Start

### Prerequisites

```bash
# Install NitroStack CLI globally
npm install -g nitrostack

# Or use npx
npx nitrostack --version
```

### Setup Your Project

```bash
# Create a new project
nitrostack init my-pizza-app --template typescript-pizzaz
cd my-pizza-app

# Install all dependencies (root + widgets)
nitrostack install
```

### Configure Mapbox (Optional but Recommended)

The map widget uses Mapbox GL for beautiful interactive maps:

1. Get a **free** API key from [Mapbox](https://www.mapbox.com/) (sign up takes 1 minute)
2. Create `src/widgets/.env` file:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

> **Note**: The template works without Mapbox, but the map widget will show a placeholder. You can still use the list and shop detail widgets.

### Run Development Server

```bash
npm run dev
```

This starts:
- **MCP Server** - Hot reloads on code changes
- **Studio** on http://localhost:3000 - Visual testing environment
- **Widget Dev Server** on http://localhost:3001 - Hot module replacement

### Test in Studio

Try these prompts in Studio chat:
- "Show me pizza shops on a map"
- "List all pizza shops"
- "Show me details for Tony's New York Pizza"
- "Find pizza shops with high ratings"

## 📁 Project Structure

```
typescript-pizzaz/
├── src/
│   ├── index.ts                 # Main server entry
│   ├── app.module.ts            # App module
│   └── modules/
│       └── pizzaz/
│           ├── pizzaz.data.ts   # Pizza shop data
│           ├── pizzaz.service.ts # Business logic
│           ├── pizzaz.tools.ts  # MCP tools
│           └── pizzaz.module.ts # Module definition
│   └── widgets/
│       ├── app/
│       │   ├── pizza-map/       # Map widget
│       │   ├── pizza-list/      # List widget
│       │   └── pizza-shop/      # Shop detail widget
│       └── components/
│           └── PizzaCard.tsx    # Reusable card component
├── package.json
└── README.md
```

## 🎨 Widget Features

### Pizza Map Widget
- **Interactive Mapbox map** with custom markers
- **Shop sidebar** with quick selection
- **Fullscreen mode** for better exploration
- **Persistent favorites** using `useWidgetState()`
- **Theme-aware** map styles (light/dark)

### Pizza List Widget
- **Grid/List view toggle** with state persistence
- **Sorting** by rating, name, or price
- **Favorites tracking** across sessions
- **Responsive layout** using `useMaxHeight()`
- **Filter panel** for advanced search

### Pizza Shop Widget
- **Hero image** with overlay information
- **Contact actions** (call, directions, website)
- **Specialties showcase**
- **Related shops** recommendations
- **External link handling** via `useWidgetSDK()`

## 🔧 Commands

```bash
# Installation
npm install              # Install all dependencies (root + widgets)
nitrostack install       # Same as above

# Development
npm run dev              # Start dev server with Studio
npm run build            # Build TypeScript and widgets for production
npm start                # Run production server

# Upgrade
npm run upgrade          # Upgrade nitrostack to latest version

# Widget Management
npm run widget <command> # Run npm command in widgets directory
npm run widget add <pkg> # Add a widget dependency
```

## 🛠️ Customization

### Adding More Shops

Edit `src/modules/pizzaz/pizzaz.data.ts`:

```typescript
export const PIZZA_SHOPS: PizzaShop[] = [
  {
    id: 'my-pizza-shop',
    name: 'My Pizza Shop',
    description: 'Amazing pizza!',
    address: '123 Main St, City, State 12345',
    coords: [-122.4194, 37.7749], // [lng, lat]
    rating: 4.5,
    reviews: 100,
    priceLevel: 2,
    cuisine: ['Italian', 'Pizza'],
    hours: { open: '11:00 AM', close: '10:00 PM' },
    phone: '(555) 123-4567',
    website: 'https://example.com',
    image: 'https://images.unsplash.com/photo-...',
    specialties: ['Margherita', 'Pepperoni'],
    openNow: true,
  },
  // ... more shops
];
```

### Changing Map Style

Edit `src/widgets/app/pizza-map/page.tsx`:

```typescript
style: isDark 
  ? 'mapbox://styles/mapbox/dark-v11'  // Dark mode style
  : 'mapbox://styles/mapbox/streets-v12' // Light mode style
```

### Adding New Filters

Edit `src/modules/pizzaz/pizzaz.service.ts` to add more filter options.

## 📚 SDK Features Demonstrated

### Theme Awareness
```typescript
const theme = useTheme(); // 'light' | 'dark'
const bgColor = theme === 'dark' ? '#000' : '#fff';
```

### State Persistence
```typescript
const [state, setState] = useWidgetState(() => ({
  favorites: [],
  viewMode: 'grid',
}));

// State persists across widget reloads
setState({ ...state, favorites: [...state.favorites, shopId] });
```

### Responsive Layouts
```typescript
const maxHeight = useMaxHeight();
return <div style={{ maxHeight }}>{content}</div>;
```

### Display Mode Adaptation
```typescript
const displayMode = useDisplayMode(); // 'inline' | 'pip' | 'fullscreen'
const showSidebar = displayMode === 'fullscreen';
```

### External Links
```typescript
const { openExternal } = useWidgetSDK();
openExternal('https://example.com');
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy Widgets

Widget HTML files will be generated in `src/widgets/out/` - these work identically in any MCP-compatible client including OpenAI ChatGPT.

## 📚 Next Steps

- Try the **Starter Template** - Learn the basics
- Try the **Flight Booking Template** - API integration with Duffel
- Read the [NitroStack Documentation](https://nitrostack.ai/docs)
- Check out [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/)

## License

MIT

---

**Built with ❤️ using NitroStack**
