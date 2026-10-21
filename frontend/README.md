# CampusOS Frontend

The user interface of CampusOS is built with React 19, TypeScript, Vite, and Tailwind CSS. It communicates with the local CampusOS FastAPI backend sidecar over loopback (`127.0.0.1`) with automatic port discovery.

## Technology Stack

- **Framework:** React 19 with TypeScript
- **Bundler:** Vite
- **Styling:** Tailwind CSS (v3) with PostCSS
- **Icons:** Lucide React (`lucide-react`)
- **Linter:** Oxlint (`.oxlintrc.json`)
- **Testing:** Vitest with `@testing-library/react` and `jsdom`

## Project Structure

```
frontend/
├── src/
│   ├── api/             # Native fetch API client with loopback port resolution (client.ts)
│   ├── assets/          # Static application assets
│   ├── components/      # UI components (Header, Sidebar, Modals, CommandPalette, etc.)
│   ├── pages/           # Application views (Dashboard, Timetable, Subjects, etc.)
│   ├── tests/           # Automated test suites (frontend.test.tsx)
│   ├── types/           # TypeScript interfaces and domain models
│   ├── App.tsx          # Root application layout and navigation
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global CSS styles and Tailwind directives
├── public/              # Public web assets (favicon, icons)
├── package.json         # Dependencies and scripts
└── vite.config.ts       # Vite bundler configuration
```

## Available Scripts

Run these scripts from within the `frontend/` directory (or use `npm --prefix frontend <script>` from the repository root):

- `npm run dev`: Starts the local Vite development server at `http://localhost:5173`.
- `npm run build`: Type-checks with `tsc -b` and compiles static assets into `dist/` for production packaging.
- `npm run lint`: Runs Oxlint static code analysis using the rules defined in `.oxlintrc.json`.
- `npm test`: Executes the automated Vitest test suite (`vitest run`).
- `npm run preview`: Locally previews the compiled production bundle from `dist/`.
