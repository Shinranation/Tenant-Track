# TenantTrack

TenantTrack is a web-based property management and rent monitoring system for landlords who manage multiple buildings, rooms, and tenants. It gives property owners one centralized place to view rent, water, and electricity payment statuses with color-coded indicators, making it easier to spot paid, upcoming, and overdue accounts.

The app is planned to store tenant profiles, lease contracts, due dates, payment history, and occupancy records. Compared with spreadsheet-based tracking, TenantTrack is designed to be faster, clearer, and easier to maintain as rental operations grow.

## Tech Stack

- React
- Vite
- Supabase

## UI Direction

The starter dashboard follows the provided TenantTrack mockup: a blue title bar, gray workspace, compact building panels, and color-coded payment dots for fast room scanning.

## Project Structure

```text
TenantTrack/
  src/
    components/
      BuildingCard.jsx
      DashboardStats.jsx
      StatusLegend.jsx
    data/
      sampleProperties.js
    lib/
      supabaseClient.js
    App.jsx
    main.jsx
    styles.css
  .env.example
  index.html
  package.json
```

## Getting Started

```bash
npm install
npm run dev
```

Create a `.env` file using `.env.example` when you are ready to connect Supabase.
