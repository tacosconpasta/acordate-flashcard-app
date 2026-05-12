<h1 align="center">Acórdate</h1>

<p align="center">
  <strong>A flashcard app built to feel native — swipe, shake, and flip your way to fluency.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Ionic-8.8.5-3880FF?style=flat-square&logo=ionic&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Capacitor-8-119EFF?style=flat-square&logo=capacitor&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-native-003B57?style=flat-square&logo=sqlite&logoColor=white" />
</p>

---

Acórdate is a cross-platform flashcard app that runs natively on iOS and Android (via Capacitor).

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | [Ionic React](https://ionicframework.com/) v8 |
| Frontend | React 19 + TypeScript 5.9 |
| Build | Vite 5 + Ionic |
| Native Runtime | Capacitor v8 (iOS & Android) |
| Storage | `@capacitor-community/sqlite` (native) / `sql.js` + `jeep-sqlite` |
| Routing | React Router v5 via `@ionic/react-router` |
| Testing | Vitest (unit) + Cypress (e2e) | #None as of yet

---

## Features

- **Decks** — create, edit, delete, and view your practice decks.
- **Cards** — front / back / description per card
- **Practice mode**
  - Physics-based swipe-to-dismiss with velocity fling
  - 3D flip on tap
  - Shake phone to discard current card
  - Stacked card peek (next card visible behind the current one)
  - Auto-reshuffle on deck completion

- **Multi-user** — separate deck libraries per user profile
- **Dark mode** — follows system preference via `@media (prefers-color-scheme: dark)`
- **NATIVE** — Meant for iOS and Android use only, because SQLite doesn't work on web.

---

### Practice Engine — `src/pages/PracticeView.tsx`

The practice screen is the technical centerpiece. Cards are shuffled with Fisher-Yates on load and auto-reshuffled when the deck is exhausted.

**Gesture system** is built on the Pointer Events API (single unified handler for mouse, touch, and stylus):

- `onPointerDown` / `onPointerMove` — tracks position delta and maintains a rolling 6-sample velocity buffer for fling detection
- `onPointerUp` — evaluates `dist` and `speed` to decide between: **tap-to-flip**, **fling-to-dismiss**, **snap-back**, or **swipe-hint-flip**

**Fly-away animation** runs via direct DOM style mutation (`wrapperRef.current.style`) to keep it off React's render cycle. After the card exits the viewport, content is swapped and a double `requestAnimationFrame` ensures the new card content is painted before the entrance transition fires — preventing a flash of stale content.

**3D flip** uses CSS `transform-style: preserve-3d` + `backface-visibility: hidden` on two absolutely-positioned face divs. `animateFlip.current` (a ref, not state) gates the CSS transition so dragging doesn't trigger a flip animation.

**Shake-to-dismiss** uses the `DeviceMotionEvent` API. On iOS 13+, it requests permission via `DeviceMotionEvent.requestPermission()`. Jerk magnitude is computed as `√(Δx² + Δy² + Δz²)` between samples; crossing 28 m/s² triggers a fling with a 900 ms cooldown.

### Models — `src/models/`

```
User      { id, name, image }
Deck      { id, name, image, description, last_practiced, user_id }
Card      { id, front, back, description, last_practiced, deck_id }
DeckWithCards extends Deck { cards: Card[] }
```

## Getting Started

```bash
npm install

# Run in browser
npm run dev

# Build for production
npm run build

# Run unit tests
npm run test.unit

# Run e2e tests
npm run test.e2e
```

### Native (Capacitor)

```bash
# iOS
npx cap add ios && npx cap open ios

# Android
npx cap add android && npx cap open android
```

---

## Project Structure

```
src/
├── lib/ #Utilities
│   └── Database.ts #SQLite connection + all query functions
├── models/ #Model classes
│   ├── Card.ts
│   ├── Deck.ts
│   └── User.ts
├── pages/ #Views
│   ├── Onboarding.tsx
│   ├── Home.tsx
│   ├── AddDeck.tsx / ModifyDeck.tsx
│   ├── ViewDeck.tsx
│   ├── AddCard.tsx / ModifyCard.tsx
│   └── PracticeView.tsx 
├── theme/ #Possible future variables
│   └── variables.css
└── App.tsx #Route definitions
```

---

<p align="center">Built with Ionic + React + Capacitor and an SQLite data store · Raúl Villarreal · 2026</p>
