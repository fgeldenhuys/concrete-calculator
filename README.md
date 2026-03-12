# Concrete Weight Calculator

A small frontend-only Next.js application for designing cylindrical training weights made from concrete with optional steel components.

The app lets a user:

- choose a target mass in kilograms
- work only in metric units
- specify either plate width or outer diameter
- set outer diameter in centimeters, with plate width, inner opening, and steel sizes in millimeters
- have the remaining dimension solved automatically
- include or exclude optional steel parts
- adjust values with sliders to explore different shapes quickly

## What The Calculator Models

The weight is modeled as an annular cylinder:

- an outer cylindrical body
- an inner opening for the bar or sleeve
- optional inner steel ring
- optional outer steel ring
- optional steel reinforcement rods running radially from the inner opening or ring to the outer edge or ring

Mass is calculated from:

- concrete density
- steel density
- net concrete volume
- steel volume replacing any concrete in the same space

The solver can run in two modes:

- `Solve width`: outer diameter is fixed and the app calculates width
- `Solve diameter`: width is fixed and the app calculates outer diameter

## Project Structure

- [app/page.tsx](/Users/francois/Development/concrete-calculator/app/page.tsx): main calculator UI, slider controls, and solving logic
- [app/globals.css](/Users/francois/Development/concrete-calculator/app/globals.css): page styling and responsive layout
- [app/layout.tsx](/Users/francois/Development/concrete-calculator/app/layout.tsx): app shell and metadata
- [open-next.config.ts](/Users/francois/Development/concrete-calculator/open-next.config.ts): OpenNext Cloudflare adapter config
- [wrangler.jsonc](/Users/francois/Development/concrete-calculator/wrangler.jsonc): Wrangler config for Cloudflare Workers

## Getting Started

Install dependencies:

```bash
npm install
```

Start the local Next.js development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Available Scripts

```bash
npm run dev
```

Runs the local development server.

```bash
npm run lint
```

Runs ESLint on the source files.

```bash
npm run build
```

Builds the production Next.js app.

```bash
npm run cf:build
```

Builds the app and generates the Cloudflare Worker bundle through OpenNext.

```bash
npm run cf:preview
```

Builds the Cloudflare bundle and starts a Wrangler preview.

```bash
npm run deploy
```

Builds and deploys the app to Cloudflare using OpenNext and Wrangler.

## Cloudflare Notes

This project is prepared for deployment to Cloudflare Workers using:

- `@opennextjs/cloudflare`
- `wrangler`

Before deploying, make sure Wrangler is authenticated:

```bash
npx wrangler whoami
```

If needed:

```bash
npx wrangler login
```

## Assumptions And Limits

- metric units only
- outer diameter uses centimeters, while plate width, inner opening, steel thicknesses, and rod diameter use millimeters
- densities are simplified constant values
- reinforcement is modeled as radial steel bars embedded in the plate face
- the app is frontend only and performs all calculations client-side
- results are design estimates, not engineering certification
