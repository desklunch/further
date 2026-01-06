# Tasks - Personal Productivity App

## Overview
A personal productivity web app focused on managing tasks across life domains. Built with React, Express, and in-memory storage.

## Current State
v0.1 - Domains & Tasks Core implementation complete with:
- Domain management with 9 seed domains (Body, Space, Mind, Plan, Connect, Attack, Create, Learn, Manage)
- Task CRUD with completion, archival, and restoration
- Multiple sort modes (manual, due date, scheduled, priority, effort, complexity, created)
- Filter by status (open, completed, archived)
- Dark/light theme toggle

## Architecture

### Frontend (client/)
- **Framework**: React with TypeScript, Vite bundler
- **Styling**: Tailwind CSS with Shadcn UI components
- **State**: TanStack Query for server state
- **Routing**: Wouter
- **Key Components**:
  - `pages/tasks.tsx` - Main tasks page with domain grouping
  - `components/task-row.tsx` - Individual task display with metadata chips
  - `components/domain-header.tsx` - Domain section header with task count
  - `components/filter-sort-bar.tsx` - Filter and sort controls
  - `components/inline-task-form.tsx` - Inline task creation per domain
  - `components/task-edit-drawer.tsx` - Side drawer for editing tasks
  - `components/global-add-task-dialog.tsx` - Modal for adding tasks from header

### Backend (server/)
- **Framework**: Express.js with TypeScript
- **Storage**: In-memory storage with seed domains
- **API Endpoints**:
  - `GET /api/domains` - List all domains
  - `POST /api/domains` - Create domain
  - `PATCH /api/domains/:id` - Update domain
  - `POST /api/domains/reorder` - Reorder domains
  - `GET /api/tasks?status=&sort=` - List tasks with filters
  - `POST /api/tasks` - Create task
  - `PATCH /api/tasks/:id` - Update task
  - `POST /api/tasks/:id/complete` - Complete task
  - `POST /api/tasks/:id/reopen` - Reopen task
  - `POST /api/tasks/:id/archive` - Archive task
  - `POST /api/tasks/:id/restore` - Restore archived task
  - `POST /api/domains/:domainId/tasks/reorder` - Reorder tasks within domain

### Shared (shared/)
- `schema.ts` - TypeScript types and Zod schemas for domains and tasks

## Data Model

### Domain
- id, userId, name, sortOrder, isActive, createdAt, updatedAt

### Task
- id, userId, domainId, title, status (open|completed|archived)
- Optional: priority (1-5), effortPoints (1-8), complexity (1-5), scheduledDate, dueDate
- domainSortOrder, createdAt, updatedAt, completedAt, archivedAt

## Running the App
```bash
npm run dev
```
Server runs on port 5000, serving both API and frontend.

## Design System
- Font: Inter
- Primary color: Blue (210 hue)
- See design_guidelines.md for full design specs
