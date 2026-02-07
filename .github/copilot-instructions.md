# AI coding agent guide for aichess

## Big picture architecture
- Monorepo with three packages: backend (Express + Socket.IO), frontend (React + Vite), and shared (TypeScript types/enums).
- REST API lives in [backend/src/server.ts](backend/src/server.ts) with routes under [backend/src/routes](backend/src/routes) and controllers under [backend/src/controllers](backend/src/controllers); most game logic is in [backend/src/services/gameService.ts](backend/src/services/gameService.ts).
- Real-time gameplay uses Socket.IO: handlers in [backend/src/socket.ts](backend/src/socket.ts) and client connection in [frontend/src/hooks/useSocket.ts](frontend/src/hooks/useSocket.ts). Event names are centralized in `SocketEvent` in [shared/src/types.ts](shared/src/types.ts).
- Shared enums/types (e.g., `TimeControl`, `SocketEvent`) are imported directly from [shared/src/types.ts](shared/src/types.ts) by the backend and can be reused by the frontend.

## Data flow & integration points
- Database access is via a single PG pool in [backend/src/db.ts](backend/src/db.ts) using `DATABASE_URL`.
- Authentication is JWT-based: middleware in [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts), auth controller in [backend/src/controllers/auth.ts](backend/src/controllers/auth.ts). Socket.IO auth uses the JWT from `socket.handshake.auth.token` in [backend/src/socket.ts](backend/src/socket.ts).
- Frontend API calls go through Axios instance in [frontend/src/services/api.ts](frontend/src/services/api.ts), which injects the bearer token from the Zustand store in [frontend/src/store/authStore.ts](frontend/src/store/authStore.ts) and auto-refreshes on 401.
- Game UI uses chess.js + react-chessboard; see [frontend/src/pages/GamePage.tsx](frontend/src/pages/GamePage.tsx) for move flow and socket event handling.

## Developer workflows (local)
- Install everything: `npm run setup` at repo root (runs installs + builds shared types).
- Dev servers: `npm run dev:backend` and `npm run dev:frontend` from repo root (or `npm run dev` inside each package).
- Build order matters for production: run shared first (`npm run build:shared`) then backend/frontend (`npm run build:backend`, `npm run build:frontend`).
- Docker Compose is available for full stack infra (Postgres + Redis + app) in [docker-compose.yml](docker-compose.yml).

## Project-specific conventions
- Socket events must use `SocketEvent` enum from [shared/src/types.ts](shared/src/types.ts); server emits and client listens should stay aligned.
- Game mutations should go through `GameService` in [backend/src/services/gameService.ts](backend/src/services/gameService.ts); controllers are thin wrappers.
- Frontend auth state is stored in localStorage via Zustand in [frontend/src/store/authStore.ts](frontend/src/store/authStore.ts); API calls rely on that store.

## When adding features
- Add REST endpoints by creating a controller in [backend/src/controllers](backend/src/controllers) and wiring it in [backend/src/routes](backend/src/routes); add auth via `authenticate` middleware when needed.
- Add new real-time events by extending `SocketEvent` and updating both [backend/src/socket.ts](backend/src/socket.ts) and client listeners (often in [frontend/src/pages/GamePage.tsx](frontend/src/pages/GamePage.tsx)).