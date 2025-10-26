# Development Guide - svaz.app

This guide provides instructions for setting up a local development environment and contributing to svaz.app.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Environment Setup](#development-environment-setup)
- [Running in Development Mode](#running-in-development-mode)
- [Project Structure](#project-structure)
- [Code Style and Conventions](#code-style-and-conventions)
- [Git Workflow](#git-workflow)
- [Testing](#testing)
- [Debugging](#debugging)
- [Adding New Features](#adding-new-features)
- [Common Tasks](#common-tasks)

---

## Prerequisites

### Required Software

- **Node.js** 22.x or higher
- **npm** 10.x or higher
- **Docker** 24.0+ and **Docker Compose** 2.20+ (for database and services)
- **Git**
- **Code Editor**: VS Code (recommended) or any editor with TypeScript support

### Recommended VS Code Extensions

- ESLint
- Prettier
- Prisma
- Tailwind CSS IntelliSense
- Docker

---

## Development Environment Setup

### Option 1: Quick Setup with Installation Script

You can use the automated installation script to set up a development environment:

```bash
# Clone the repository
git clone https://github.com/geladons/svazapp.git
cd svazapp

# Run installation script (will set up all services)
sudo ./install.sh --dir $(pwd)
```

This will:
- Install all dependencies (Docker, Docker Compose)
- Generate configuration files
- Start all services
- Set up the database

After installation, you can stop the services and run frontend/API in development mode:

```bash
# Stop all services
docker compose down

# Keep only database and supporting services running
docker compose up -d db livekit coturn

# Run API and Frontend in development mode (see below)
```

### Option 2: Manual Setup

### 1. Clone the Repository

```bash
git clone https://github.com/geladons/svazapp.git
cd svazapp
```

### 2. Install Dependencies

#### Frontend

```bash
cd frontend
npm install
```

#### API

```bash
cd ../api
npm install
```

### 3. Setup Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit with your local values
nano .env
```

**For local development**, use these values:

```bash
DOMAIN=localhost
POSTGRES_PASSWORD=dev_password
DATABASE_URL=postgresql://svazapp:dev_password@localhost:5432/svazapp
JWT_SECRET=dev_jwt_secret_min_32_characters_long
LIVEKIT_API_KEY=dev_api_key
LIVEKIT_API_SECRET=dev_api_secret
LIVEKIT_PUBLIC_URL=ws://localhost/livekit
COTURN_PASSWORD=dev_coturn_password
SESSION_SECRET=dev_session_secret
```

### 4. Start Database

```bash
# Start only the database service
docker compose up -d db
```

### 5. Run Database Migrations

```bash
cd api
npx prisma migrate dev
```

This will:
- Create the database schema
- Generate Prisma Client
- Seed the database (if seed script exists)

---

## Running in Development Mode

### Option 1: Run Services Separately (Recommended for Development)

This allows hot-reload and better debugging.

#### Terminal 1: API

```bash
cd api
npm run dev
```

API will run on `http://localhost:8080`

#### Terminal 2: Frontend

```bash
cd frontend
npm run dev
```

Frontend will run on `http://localhost:3000`

#### Terminal 3: LiveKit (Optional)

```bash
docker compose up livekit
```

#### Terminal 4: CoTURN (Optional)

```bash
docker compose up coturn
```

### Option 2: Run All Services with Docker Compose

```bash
docker compose up
```

This runs all services in production mode (slower builds, no hot-reload).

---

## Project Structure

```
svazapp/
├── frontend/                   # Next.js PWA
│   ├── app/                    # App Router pages
│   │   ├── (app)/              # Protected routes (require auth)
│   │   ├── (auth)/             # Auth routes (login, register)
│   │   ├── guest/              # Guest routes (guest calls)
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Root page (redirects)
│   ├── components/             # React components
│   │   ├── app/                # App-specific components
│   │   ├── auth/               # Authentication components
│   │   ├── calls/              # Call-related components
│   │   ├── chats/              # Chat components
│   │   ├── contacts/           # Contact components
│   │   ├── layout/             # Layout components
│   │   ├── providers/          # Context providers
│   │   └── ui/                 # Shadcn UI components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities and helpers
│   ├── store/                  # Zustand stores
│   ├── sw/                     # Service Worker code
│   └── public/                 # Static assets
├── api/                        # Fastify backend
│   ├── src/
│   │   ├── routes/             # API route handlers
│   │   ├── services/           # Business logic
│   │   ├── plugins/            # Fastify plugins
│   │   ├── app.ts              # Fastify app setup
│   │   └── server.ts           # Server entry point
│   └── prisma/
│       ├── schema.prisma       # Database schema
│       └── migrations/         # Database migrations
├── caddy/                      # Caddy reverse proxy
│   ├── Caddyfile.template      # Caddy configuration
│   └── Dockerfile
├── docker-compose.yml          # Service orchestration
├── .env.example                # Environment template
└── docs/                       # Documentation
```

---

## Code Style and Conventions

### General Rules

All code must follow the **"Свод Правил Разработки Проекта svaz.app"** (Development Rules) defined in `.augment/rules/imported/rules.md`.

### Key Principles

1. **Plan-First**: No code without a plan
2. **YAGNI**: Only implement what's needed
3. **Clarity > Cleverness**: Readable code over "smart" code
4. **API-First**: Define API contracts before implementation
5. **Atomic Tasks**: One task, one commit

### Naming Conventions

- **Variables/Functions**: `camelCase`
- **Classes/Components**: `PascalCase`
- **Files**: `kebab-case.ts` (except React components: `PascalCase.tsx`)
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: No `I` prefix (e.g., `User` not `IUser`)

### TypeScript

- **Strict mode**: Always enabled
- **No `any`**: Use `unknown` for type-safe checks
- **Explicit types**: All function parameters and return types
- **TSDoc**: Document all public functions

Example:

```typescript
/**
 * Fetch user by ID
 * 
 * @param userId - The user's unique identifier
 * @returns User object or null if not found
 */
async function getUserById(userId: string): Promise<User | null> {
  // Implementation
}
```

### Formatting

- **Prettier**: Auto-format on save
- **ESLint**: No errors allowed
- **Line length**: 100 characters (Prettier default)

### Commit Messages

Follow **Conventional Commits**:

```
feat(api): add user profile endpoint
fix(frontend): resolve login redirect loop
refactor(auth): simplify token validation
docs(readme): update installation steps
chore(deps): update dependencies
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `style`: Formatting changes
- `docs`: Documentation
- `chore`: Maintenance tasks
- `test`: Tests

---

## Git Workflow

### Branch Naming

```
feature/short-description
fix/bug-description
refactor/component-name
docs/documentation-update
```

### Workflow

1. **Create branch from main**

```bash
git checkout main
git pull origin main
git checkout -b feature/my-feature
```

2. **Make changes and commit**

```bash
git add .
git commit -m "feat(scope): description"
```

3. **Push to remote**

```bash
git push origin feature/my-feature
```

4. **Create Pull Request**

- Go to GitHub
- Create PR from your branch to `main`
- Add description and screenshots
- Request review

5. **After approval, merge**

```bash
git checkout main
git pull origin main
git branch -d feature/my-feature
```

---

## Testing

### Frontend Tests

```bash
cd frontend
npm run test
```

### API Tests

```bash
cd api
npm run test
```

### E2E Tests

```bash
npm run test:e2e
```

### Manual Testing Checklist

- [ ] Authentication (login, register, logout)
- [ ] Contact management (add, accept, reject, delete)
- [ ] 1-on-1 calls (initiate, answer, hang up)
- [ ] Guest calls (create, join, share link)
- [ ] Chat messaging (send, receive, history)
- [ ] PWA installation
- [ ] Emergency mode (disconnect network, test P2P)
- [ ] Responsive design (mobile, tablet, desktop)

---

## Debugging

### Frontend Debugging

#### Browser DevTools

1. Open Chrome DevTools (F12)
2. Go to Sources tab
3. Set breakpoints in TypeScript files
4. Reload page

#### React DevTools

Install React DevTools extension for Chrome/Firefox.

#### Console Logging

```typescript
console.log('Debug:', variable);
console.error('Error:', error);
console.warn('Warning:', warning);
```

### API Debugging

#### VS Code Debugger

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/api",
      "console": "integratedTerminal"
    }
  ]
}
```

#### Fastify Logging

Logs are automatically output to console in development mode.

```typescript
fastify.log.info('Info message');
fastify.log.error('Error message');
fastify.log.debug('Debug message');
```

### Database Debugging

#### Prisma Studio

Visual database editor:

```bash
cd api
npx prisma studio
```

Opens at `http://localhost:5555`

#### Direct SQL Queries

```bash
docker compose exec db psql -U svazapp svazapp
```

---

## Adding New Features

### 1. Plan

- Define the feature requirements
- Design API contracts (if needed)
- Sketch UI mockups (if needed)
- Break down into tasks

### 2. Backend (if needed)

#### Add Database Model

Edit `api/prisma/schema.prisma`:

```prisma
model NewModel {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Fields
  name      String
  
  // Relations
  userId    String
  user      User     @relation(fields: [userId], references: [id])
}
```

Run migration:

```bash
npx prisma migrate dev --name add_new_model
```

#### Add Service

Create `api/src/services/new-feature.service.ts`:

```typescript
export class NewFeatureService {
  constructor(private readonly prisma: PrismaClient) {}
  
  async create(data: CreateData): Promise<NewModel> {
    return this.prisma.newModel.create({ data });
  }
}
```

#### Add Routes

Create `api/src/routes/new-feature.routes.ts`:

```typescript
export default async function newFeatureRoutes(fastify: FastifyInstance) {
  fastify.get('/new-feature', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    // Handler
  });
}
```

### 3. Frontend

#### Add Store (if needed)

Create `frontend/store/new-feature-store.ts`:

```typescript
import { create } from 'zustand';

interface NewFeatureState {
  items: Item[];
  addItem: (item: Item) => void;
}

export const useNewFeatureStore = create<NewFeatureState>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
}));
```

#### Add Component

Create `frontend/components/new-feature/new-feature.tsx`:

```typescript
'use client';

export function NewFeature() {
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

#### Add Page (if needed)

Create `frontend/app/(app)/new-feature/page.tsx`:

```typescript
import { NewFeature } from '@/components/new-feature/new-feature';

export default function NewFeaturePage() {
  return <NewFeature />;
}
```

---

## Common Tasks

### Add New Dependency

```bash
# Frontend
cd frontend
npm install package-name

# API
cd api
npm install package-name
```

### Update Dependencies

```bash
npm update
```

### Generate Prisma Client

```bash
cd api
npx prisma generate
```

### Reset Database

```bash
cd api
npx prisma migrate reset
```

**Warning**: This deletes all data!

### Format Code

```bash
# Frontend
cd frontend
npm run format

# API
cd api
npm run format
```

### Lint Code

```bash
# Frontend
cd frontend
npm run lint

# API
cd api
npm run lint
```

### Build for Production

```bash
# Frontend
cd frontend
npm run build

# API
cd api
npm run build
```

---

## Tips and Best Practices

1. **Always run linter before committing**
2. **Write meaningful commit messages**
3. **Keep PRs small and focused**
4. **Test your changes thoroughly**
5. **Update documentation when adding features**
6. **Ask for help when stuck**
7. **Review code before submitting PR**
8. **Use TypeScript strict mode**
9. **Follow the project's coding standards**
10. **Keep dependencies up to date**

---

## Getting Help

- **Documentation**: Check `design.md`, `tech_stack.md`, `User_flow.md`
- **Code Examples**: Look at existing components/services
- **Issues**: Search GitHub issues for similar problems
- **Ask**: Open a discussion or issue on GitHub

---

Happy coding! 🚀

