# W2S Frontend

React + Tailwind CSS frontend for the W2S workout template application.

## Setup

1. Install dependencies:
```bash
bun install
```

2. Make sure the backend is running on `http://localhost:3000`

3. Start the development server:
```bash
bun run dev
```

The frontend will be available at `http://localhost:5173`

## Features

- **Landing Page** (`/`): Displays all workout templates as clickable cards
- **Template Detail Page** (`/template/:id`): Shows detailed information about a specific template including exercises and sets

## API Endpoints

The frontend calls the following backend endpoints:
- `http://localhost:3000/listTemplates` - Get all templates
- `http://localhost:3000/getTemplateById` - Get template by ID
