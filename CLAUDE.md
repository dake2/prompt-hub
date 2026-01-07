# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based "AI Prompt Market" (AI 提示词市场) - an internal prompt sharing platform where users can browse, search, vote on, and submit AI prompts organized by categories.

## Tech Stack

- **Build Tool**: Vite with React SWC plugin
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui (Radix UI primitives with Tailwind CSS)
- **Styling**: Tailwind CSS with custom utility classes in `src/index.css`
- **Routing**: React Router DOM
- **State Management**: React hooks (useState, useMemo, useEffect)
- **Data Fetching**: TanStack React Query (configured but mock data used)
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Theme**: next-themes for dark/light mode with localStorage persistence

## Available Commands

```bash
npm run dev          # Start development server on port 8080
npm run build        # Production build
npm run build:dev    # Development mode build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components (don't modify directly, use shadcn CLI)
│   ├── AddPromptDialog.tsx
│   ├── CategorySidebar.tsx
│   ├── LoginDialog.tsx
│   ├── NavLink.tsx
│   ├── PromptCard.tsx
│   ├── PromptDetail.tsx
│   ├── SearchBar.tsx
│   └── ThemeToggle.tsx
├── data/
│   └── mockData.ts      # Categories and prompts mock data
├── hooks/
│   ├── use-mobile.tsx   # Responsive hook
│   └── use-toast.ts     # Toast notification hook
├── lib/
│   └── utils.ts         # Utility functions (cn for class merging)
├── pages/
│   ├── Index.tsx        # Main application page
│   └── NotFound.tsx
├── types/
│   └── prompt.ts        # Prompt and Category interfaces
├── App.tsx              # Root with providers and routing
├── main.tsx             # Entry point
└── index.css            # Global styles with Tailwind directives and custom classes
```

## Key Architecture Notes

### Data Models

**Prompt** (`src/types/prompt.ts`):
```typescript
interface Prompt {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  upvotes: number;
  downvotes: number;
  author: string;
  createdAt: string;
  userVote?: 'up' | 'down' | null;
}
```

**Category**:
```typescript
interface Category {
  id: string;
  name: string;
  icon: string;        // Lucide icon name as string
  count: number;
}
```

### State Management Pattern

The main application state (`src/pages/Index.tsx`) is managed through React hooks:
- Prompts are stored in component state (not persisted)
- Category selection and search query filter the displayed prompts
- User authentication is simulated with local state
- Theme preference is persisted in localStorage

### Custom CSS Classes

The application uses custom Tailwind component classes defined in `src/index.css`:
- `.glass` - Backdrop blur with semi-transparent background
- `.gradient-text` - Gradient text effect (primary to cyan)
- `.prompt-card` - Card styling with hover effects
- `.tag-chip` - Tag/label styling
- `.category-item` - Sidebar category items with active state
- `.vote-button` - Upvote/downvote button styling
- `.search-input` - Search input styling

### Theme System

Dark/light theme is controlled via:
- Adding `dark` class to the root element
- CSS custom properties in `:root` and `.dark` selectors
- Persisted in localStorage as `"theme": "dark"|"light"`

## Adding New Components

When adding new shadcn/ui components, use:
```bash
npx shadcn@latest add <component-name>
```

This will add the component to `src/components/ui/` and update any necessary dependencies.

## Path Aliases

The project uses `@` as an alias for `./src` (configured in both `tsconfig.json` and `vite.config.ts`).
