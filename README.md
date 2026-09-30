# Chores App

A family chores app: kids earn real money for real chores, and parents check the work and pay out. There are two apps in one:

- **Child** (night-sky "Quest Path" theme): today's quests on a star map, extra missions to claim, the payday delivery, and siblings' wins.
- **Parent** (light "Ground Control" theme): today's signals and radar, reviews, the chore week board, payday, and the family.

Built with Expo (SDK 57, Expo Router, NativeWind, Reanimated) and [Convex](https://convex.dev) with Better Auth.

## Run it

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the Convex dev backend. The first run links the project and writes `.env.local`:

   ```bash
   npx convex dev
   ```

3. In another terminal, start the app:

   ```bash
   npx expo start
   ```

   Open it in Expo Go on a phone (same Wi-Fi) or in the iOS simulator.

## Check it

```bash
npm run verify
```

This runs formatting, typecheck, the Convex return-contract check, and the backend smoke tests. It pushes to the Convex **dev** deployment. `npm run lint` runs ESLint.

## Where things are

- `src/docs/`: product rules (`product.md`, `domain.md`, `specs.md`), architecture, the implementation plan and status.
- `design/`: the visual direction, screen map and journey audit.
- `src/components/art/`: the hand-made animated SVG artwork.
- `convex/`: backend. Read `convex/_generated/ai/guidelines.md` before changing it.
