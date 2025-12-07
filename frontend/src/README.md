# Co-Star Inspired Horoscopy App

A minimalist, data-driven astrological application built with React, Tailwind CSS, and Framer Motion. The design philosophy mimics the "Co-Star" aesthetic—monochromatic, typography-forward, and using high-quality texture imagery, now enhanced with premium "Liquid Glass" visuals.

## 🌟 Features

- **Onboarding Flow**: Personalized data collection (Date, Time, Location) with a "Calculating..." state.
- **Dashboard (Home)**:
  - **Planetary System**: A stunning, interactive 3D visualization of the user's "Big Three" (Sun, Moon, Rising) featuring a liquid glass aesthetic, internal fluid simulations, and a dynamic spacetime grid background.
  - Personalized daily greetings and date display.
- **At a Glance**:
  - Daily mood and energy scores (Love, Work, Creativity).
  - Staggered animation for data reveal.
- **In Depth**:
  - Tabbed interface for Daily, Weekly, and Monthly forecasts.
  - Detailed transit analysis and natal chart highlights.
- **The Void (Journal)**:
  - A reflective space for users to journal.
  - "AI" powered reflections (simulated) that provide astrological context to entries.
  - History of past entries.
- **Profile**: User settings and chart details.

## 🛠 Tech Stack

- **Frontend**: React (Vite).
- **State Management**: React Context API (`AppStateContext`) with `localStorage` persistence.
- **Styling**: Tailwind CSS (v4) with custom `@theme` configuration.
- **Animations**: `motion/react` (formerly Framer Motion) for complex page transitions, fluid planet simulations, and micro-interactions.
- **Icons**: Lucide React.
- **Components**: Shadcn/ui (radix-ui based) located in `/components/ui`.
- **Data**: Mock API services (`api.ts`) and IndexedDB caching (`storage.ts`).

## 📂 Project Structure

```
/
├── App.tsx                 # Main entry point with AppStateProvider and Layout
├── context/
│   └── AppStateContext.tsx # Global state (User, Screen, Theme)
├── services/
│   ├── api.ts              # Mock Astrology API service
│   └── storage.ts          # IndexedDB wrapper for caching
├── components/
│   ├── PlanetarySystem.tsx # Premium 3D Liquid Glass Visuals
│   ├── StarryBackground.tsx# Canvas-based starry background
│   ├── TheVoid.tsx         # Journaling feature
│   ├── Onboarding.tsx      # Initial user flow
│   ├── Home.tsx            # Main dashboard
│   ├── AtGlance.tsx        # Quick stats screen
│   ├── InDepth.tsx         # Detailed analysis screen
│   └── ui/                 # Reusable UI components
├── styles/
│   └── index.css           # Tailwind v4 setup, custom fonts (Cormorant Garamond)
└── guidelines/             # Project guidelines
```

## 🎨 Design System

- **Typography**: Uses `Cormorant Garamond` for headings to achieve the editorial/print look, and system sans-serif for data/labels.
- **Visuals**:
  - **Liquid Glass Planets**: Custom-built React components using CSS gradients and `motion/react` to simulate glowing, rotating liquid spheres with glassy shells.
  - **Spacetime Grid**: A canvas-based background that subtly distorts around the planets, simulating gravity.
- **Color Palette**: High-contrast gradients (Golden/Amber, Silver/Blue, Purple/Indigo) set against a deep void background.
- **Motion**:
  - **Page Transitions**: Smooth fade and blur (filter) effects.
  - **Fluid Dynamics**: Planets have internal organic movement.
  - **Micro-interactions**: Buttons and cards scale slightly on hover/tap.

## 🚀 Getting Started

1.  **Install Dependencies**: `npm install`
2.  **Run Dev Server**: `npm run dev`
3.  **Build**: `npm run build`

## 🔮 Future Roadmap

- **Real Backend**: Connect to Supabase for persisting User profiles and Journal entries.
- **Real Astrology API**: Replace mock calculation logic with a real ephemeris API.
- **LLM Integration**: Use OpenAI/Anthropic for generating real-time "Void" reflections based on journal text.
