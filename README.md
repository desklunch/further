# Tasks - Personal Productivity App

A personal productivity web app for managing tasks across life domains, with daily habits tracking, inbox capture, and smart scheduling.

## Features

### Today View
Your daily command center showing:
- **Habits** - Track daily habits with single or multi-select options
- **Scheduled Tasks** - Tasks planned for today
- **Inbox** - Quick capture and triage of ideas
- **Added to Today** - Tasks you've committed to working on today

### Task Management
- Organize tasks across 9 life domains (Body, Space, Mind, Plan, Connect, Attack, Create, Learn, Manage)
- Set priority (1-3), effort (1-3 or unknown), and valence (-1/0/+1)
- Schedule tasks and set due dates
- Drag-and-drop reordering within and across domains
- Inline title editing and full edit drawer
- Complete, archive, and restore tasks

### Habits
- Create habits with multiple options
- Single-select (pick one) or multi-select (pick several) modes
- Track daily completions
- Toggle habits active/inactive

### Inbox & Triage
- Quickly capture thoughts without interrupting your flow
- Triage items with three actions:
  - **Add to Today** - Convert to task and add to today's focus
  - **Schedule** - Convert to task with a specific date
  - **Dismiss** - Archive without creating a task

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Drag-and-Drop**: dnd-kit

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/tasks-app.git
cd tasks-app
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=your-secret-key
```

4. Push database schema
```bash
npm run db:push
```

5. Start the development server
```bash
npm run dev
```

The app will be available at `http://localhost:5000`

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and query client
│   │   └── pages/         # Page components
├── server/                 # Backend Express application
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database operations
│   └── index.ts           # Server entry point
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Drizzle schema and Zod types
└── docs/                   # Documentation
    ├── user-guide.md      # User documentation
    └── prds/              # Product requirement documents
```

## API Endpoints

### Domains
- `GET /api/domains` - List all domains
- `POST /api/domains` - Create domain
- `PATCH /api/domains/:id` - Update domain
- `POST /api/domains/reorder` - Reorder domains

### Tasks
- `GET /api/tasks` - List tasks (with filters)
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id` - Update task
- `POST /api/tasks/:id/complete` - Complete task
- `POST /api/tasks/:id/reopen` - Reopen task
- `POST /api/tasks/:id/archive` - Archive task
- `POST /api/tasks/:id/restore` - Restore task

### Today
- `GET /api/today` - Get aggregated today data

### Inbox
- `GET /api/inbox` - List inbox items
- `POST /api/inbox` - Create inbox item
- `POST /api/inbox/:id/triage` - Triage inbox item

### Habits
- `GET /api/habits` - List habits
- `POST /api/habits` - Create habit
- `PATCH /api/habits/:id` - Update habit
- `POST /api/habits/:id/entry` - Record daily entry

## License

MIT
