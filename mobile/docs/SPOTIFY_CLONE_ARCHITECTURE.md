# Spotify Clone Architecture Blueprint

## Overview

This document defines the architecture for the mobile Spotify-style application built with:

* **Expo / React Native**
* **expo-router**
* **Zustand**
* **react-native-track-player**
* **react-native-reanimated**
* **react-native-gesture-handler**
* **NativeWind**

The goal is to replicate Spotify’s UI/UX while maintaining a scalable architecture.

The key principle:

```
Logic ≠ UI
Layout ≠ Components
Player Engine ≠ Player Interface
```

---

# 1. System Architecture

The application should be divided into 4 main layers:

```
UI Layer
↓
Player UI Controller
↓
Playback Engine
↓
Audio Backend
```

### UI Layer

Responsible for rendering interface components.

### Player UI Controller

Coordinates UI actions and player commands.

### Playback Engine

Handles playback state and queue logic.

### Audio Backend

Native playback via `react-native-track-player`.

---

# 2. Folder Structure

The ideal mobile folder structure:

```
mobile
│
├ app
│   ├ (tabs)
│   │   ├ index.tsx
│   │   ├ search.tsx
│   │   ├ library.tsx
│   │   ├ chat.tsx
│   │   └ downloads.tsx
│   │
│   ├ album
│   ├ artist
│   ├ playlist
│   └ profile
│
├ player
│   ├ containers
│   │   ├ BottomPlayer.tsx
│   │   └ FullScreenPlayer.tsx
│   │
│   ├ components
│   │   ├ PlayerHeader.tsx
│   │   ├ PlayerArtwork.tsx
│   │   ├ PlayerTrackInfo.tsx
│   │   ├ PlayerProgress.tsx
│   │   ├ PlayerControls.tsx
│   │   ├ PlayerActions.tsx
│   │   ├ PlayerGestures.tsx
│   │   └ PlayerQueue.tsx
│   │
│   ├ hooks
│   │   ├ usePlayerControls.ts
│   │   ├ usePlayerLayout.ts
│   │   └ usePlayerGestures.ts
│   │
│   └ animations
│       └ playerTransitions.ts
│
├ stores
│
├ services
│
├ hooks
│
├ utils
│
└ components
```

---

# 3. Player System

## Player Engine

Located in:

```
services/playbackService.ts
stores/usePlayerStore.ts
```

Responsibilities:

```
play
pause
next
previous
queue management
repeat/shuffle
```

UI components should **never call TrackPlayer directly**.

They must use:

```
usePlayerControls()
```

---

# 4. Player UI System

Two main containers:

```
BottomPlayer
FullScreenPlayer
```

These orchestrate player components.

Example:

```
FullScreenPlayer
 ├ PlayerHeader
 ├ PlayerArtwork
 ├ PlayerTrackInfo
 ├ PlayerProgress
 ├ PlayerControls
 ├ PlayerActions
 └ LyricsPreview
```

Each component should stay under **200 lines**.

---

# 5. Layout Engine

All player layout calculations must be centralized.

File:

```
player/hooks/usePlayerLayout.ts
```

Example:

```ts
import { useWindowDimensions } from "react-native"

export function usePlayerLayout() {
 const { height, width } = useWindowDimensions()

 return {
  header: height * 0.08,
  artwork: height * 0.5,
  info: height * 0.08,
  progress: height * 0.06,
  controls: height * 0.14,
  actions: height * 0.06,
  preview: height * 0.08
 }
}
```

This ensures the UI adapts across all devices.

---

# 6. Gesture System

Gestures should be isolated.

File:

```
player/hooks/usePlayerGestures.ts
```

Handles:

```
swipe down → collapse player
swipe left → next track
swipe right → previous track
```

Components should not implement gestures themselves.

---

# 7. Animation System

File:

```
player/animations/playerTransitions.ts
```

Handles animations like:

```
mini player → fullscreen expansion
artwork swipe animation
gradient transitions
```

All animations should be reusable.

---

# 8. Styling System

Primary styling method:

```
NativeWind
```

Use StyleSheet only for:

```
animated styles
dynamic layout calculations
```

Avoid mixing systems in the same component.

---

# 9. Navigation System

Navigation is handled via:

```
expo-router
```

Tabs:

```
Home
Search
Library
Chat
Downloads
```

Player is rendered globally in:

```
app/(tabs)/_layout.tsx
```

Example:

```
<Tabs />
<BottomPlayer />
<FullScreenPlayer />
```

This mirrors Spotify’s architecture.

---

# 10. State Management

Global state uses **Zustand**.

Stores:

```
usePlayerStore
usePlayerUIStore
useLyricsStore
useArtistStore
useColorStore
useMusicStore
useSearchStore
useStreamStore
```

Rules:

```
Stores manage logic
Components render UI
Hooks connect them
```

---

# 11. Performance Rules

Avoid:

```
large components (>400 lines)
layout math inside UI
direct TrackPlayer calls in UI
```

Prefer:

```
small components
centralized hooks
separated concerns
```

---

# 12. Development Guidelines

When implementing features:

### Do

```
create hooks for logic
create components for UI
reuse player layout system
```

### Do Not

```
add layout logic inside screens
duplicate player logic
mix stores inside many components
```

---

# 13. Target UX

The final application should replicate:

```
Spotify gestures
Spotify player transitions
Spotify gradient system
Spotify responsive layout
```

Focus on:

```
smooth animations
responsive design
clean architecture
```
