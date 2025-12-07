# BitAstro Architecture

## System Overview

BitAstro is a **client-first** web application designed to deliver high-fidelity astrological insights with zero server-side latency for core features. The architecture prioritizes:

1.  **Privacy**: User data (birth details, journal entries) never leaves the browser.
2.  **Performance**: Heavy computations (astronomy, AI inference) happen locally via WebAssembly.
3.  **Aesthetics**: A "Cinematic" UI layer that decouples visual presentation from data logic.

## Module Boundaries

### 1. Presentation Layer (`src/components/`)
- **Responsibility**: Rendering UI, handling user interactions, and managing local view state.
- **Key Components**:
  - `PlanetarySystem`: Visualizes real-time ephemeris data.
  - `TheVoid`: Handles journal entries and AI reflections.
  - `Home`: The main dashboard aggregating data.
- **Design Pattern**: Composition. Components are built from smaller, reusable UI atoms (buttons, cards) and use `framer-motion` for transitions.

### 2. Service Layer (`src/services/`)
- **Responsibility**: Encapsulating complex business logic and external library interactions.
- **Key Services**:
  - `AstroEngine` (Singleton): Manages the ONNX Runtime session. Handles tokenization, inference, and sampling.
  - `ephemeris`: Wraps `astronomy-engine` to provide clean, type-safe functions for planetary positions and aspects.
  - `storage`: Abstraction over `localStorage` for persisting user profiles and journal entries.

### 3. State Management (`src/context/`)
- **Responsibility**: Global application state (User Profile, Navigation, Engine Status).
- **Implementation**: React Context API (`AppStateContext`).
- **Rationale**: The app state is relatively simple (single user, few screens), making Redux or Zustand unnecessary overhead.

## Data Flow

### Horoscope Generation
1.  **Trigger**: User opens the app or clicks "Refresh".
2.  **Input**: User's birth data (Sun Sign) + Current Date.
3.  **Ephemeris**: `ephemeris.ts` calculates current planetary transits (e.g., "Moon in Scorpio").
4.  **Prompt Engineering**: `Home.tsx` constructs a prompt: *"Horoscope for Scorpio. Transits: Moon in Scorpio..."*
5.  **Inference**: `AstroEngine` runs the ONNX model to generate the prediction.
6.  **Output**: Text is displayed and cached in `localStorage`.

### Planetary Visualization
1.  **Trigger**: `PlanetarySystem` mounts or timer ticks (every 60s).
2.  **Calculation**: `ephemeris.ts` computes RA/Dec for Sun, Moon, and Ascendant.
3.  **Mapping**: Coordinates are converted to screen positions/angles.
4.  **Rendering**: React renders the DOM elements; `framer-motion` handles the entry animations.

## Decision Log

| Decision | Context | Rationale | Status |
| :--- | :--- | :--- | :--- |
| **Client-Side AI** | Need for personalized text without high API costs. | ONNX Runtime Web allows running quantized models in-browser. Zero server cost, high privacy. | ✅ Implemented |
| **Astronomy Engine** | Need for accurate planetary data. | `astronomy-engine` is a robust, battle-tested library for JS/TS. Preferable to calling a remote NASA API for simple ephemeris. | ✅ Implemented |
| **Tailwind + Motion** | Need for "Cinematic" feel. | Tailwind handles layout/typography efficiently. Motion (Framer) provides the complex physics-based animations required for the "premium" feel. | ✅ Implemented |
| **Local Storage** | User data persistence. | No backend required for MVP. Keeps data ownership with the user. | ✅ Implemented |

## Future Considerations

- **PWA Support**: Enable offline usage and "Add to Home Screen".
- **WebGPU**: Upgrade ONNX Runtime backend from WASM to WebGPU for faster inference on supported devices.
- **Cloud Sync**: Optional opt-in for syncing data across devices (would require backend).
