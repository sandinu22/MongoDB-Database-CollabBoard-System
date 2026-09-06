# CollabBoard — M1 + M2 + M3

CollabBoard is a React + Node.js/Express + MongoDB collaborative task board built for the staged full-stack group project.

This version completes the functional scope through **M3 – Persistence & Offline Support**:

- **M1:** reusable React board / column / task UI
- **M2:** Express REST API, registration/login, JWT-protected routes, real frontend API integration
- **M3:** MongoDB/Mongoose persistence, localStorage caching, offline pending actions, reconnection sync, and optimistic task conflict/version handling

M4 (testing/CI) and M5 (Socket.io, Docker, deployment) are intentionally not implemented in this package because they are later milestones.

## Features

### Authentication
- Register a new user
- Login with email/password
- Passwords are hashed with Node.js `scrypt`
- JWT HS256 tokens are generated and verified by the backend
- Board/task APIs require `Authorization: Bearer <token>`
- Logout clears the local authenticated workspace cache

### Boards
- Create, view, edit and delete boards
- Board owner can add registered collaborators by email
- Only board owners can edit/delete a board
- Board members can access and work with tasks
- Deleting a board also deletes its MongoDB tasks

### Tasks
- Create, edit and delete tasks
- To Do / Doing / Done stages
- Drag a task card between columns to move it
- Set priority, assignee, due label, comments and progress
- Every task has a numeric `version`
- Updates are atomic: stale versions return `409 Conflict` instead of silently overwriting newer work

### M3 persistence and offline support
- Users, boards and tasks are stored in MongoDB via Mongoose
- Current boards and columns are cached in `localStorage`
- Cached data can render after refresh / temporary connection loss
- Offline board/task changes are queued locally
- Pending actions are replayed when the browser reconnects
- Temporary offline IDs are mapped to real MongoDB IDs during synchronization
- Failed/conflicted operations remain pending instead of being discarded
- Conflict UI lets the user load the latest server version

## Project structure

```text
CollabBoard/
├── server/
│   ├── config/
│   │   └── db.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Board.js
│   │   └── Task.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── boards.js
│   │   └── tasks.js
│   ├── utils/
│   │   ├── jwt.js
│   │   └── password.js
│   └── index.js
├── src/
│   ├── auth/
│   │   └── AuthContext.jsx
│   ├── components/
│   │   ├── forms/
│   │   │   ├── BoardForm.jsx
│   │   │   └── TaskForm.jsx
│   │   ├── Board.jsx
│   │   ├── Column.jsx
│   │   ├── Header.jsx
│   │   ├── Modal.jsx
│   │   └── TaskCard.jsx
│   ├── context/
│   │   └── BoardDataContext.jsx
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── BoardPage.jsx
│   │   ├── ColumnPage.jsx
│   │   └── TaskPage.jsx
│   ├── services/
│   │   └── api.js
│   ├── utils/
│   │   └── storage.js
│   ├── App.jsx
│   └── main.jsx
├── postman/
├── .env.example
├── package.json
└── vite.config.js
```

## 1. Requirements

Install:

- Node.js 20+ (Node 22 is also fine)
- npm
- A MongoDB Atlas cluster, or local MongoDB

## 2. Install dependencies

From the project folder:

```bash
npm install
```

> Do not copy `node_modules` from another operating system. Run `npm install` on the computer where you will use the project.

## 3. Configure `.env`

Copy the example:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `.env`:

```env
MONGO_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER/collabboard?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=YOUR_LONG_RANDOM_SECRET
PORT=3000
VITE_API_URL=http://localhost:3000
```

Generate a strong JWT secret on macOS/Linux:

```bash
openssl rand -hex 32
```

### Important security rules

- Never commit `.env`
- Never put the Atlas password in `.env.example`
- Never put `MONGO_URI` in React source code
- Never place the JWT secret in GitHub / README / screenshots

`.gitignore` already excludes `.env`.

## 4. MongoDB Atlas checklist

In Atlas:

1. Create a database user.
2. Give it permission to read/write the project database.
3. Under **Network Access**, allow the IP address of the computer running the backend.
4. Copy the Node.js connection string.
5. Replace `<db_password>` with the database user's password **inside `.env` only**.
6. Keep `/collabboard` in the URI so data is stored in the `collabboard` database.

## 5. Run the system

Terminal 1 — backend:

```bash
npm run server
```

Expected output after a successful connection:

```text
MongoDB connected: .../collabboard
CollabBoard API running at http://localhost:3000
```

Terminal 2 — frontend:

```bash
npm run dev
```

Open the local Vite URL shown in the terminal (normally `http://localhost:5173`).

## 6. API endpoints

### Public

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`

### Protected

- `GET /api/auth/me`
- `GET /api/boards`
- `GET /api/boards/:id`
- `POST /api/boards`
- `PATCH /api/boards/:id`
- `DELETE /api/boards/:id`
- `GET /api/columns?boardId=<boardId>`
- `GET /api/tasks?boardId=<boardId>`
- `GET /api/tasks/:id`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`

Protected requests use:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

## 7. Conflict demonstration

Each task contains:

```json
{
  "version": 1
}
```

A normal task update sends the current version:

```json
{
  "title": "Updated task",
  "version": 1
}
```

After the update succeeds, the server increments the version.

If another request later tries to update using the old version, the server returns:

```text
409 Conflict
```

with the current server task. This prevents silent overwrites.

## 8. Offline demonstration

1. Login while online.
2. Open a board so it is cached.
3. Switch the browser/network offline.
4. Create/edit/move/delete tasks; changes are held locally.
5. Refresh: cached content remains available.
6. Reconnect.
7. CollabBoard processes pending actions and reloads server data.

The connection indicator in the header shows Online, Offline, Syncing, or Conflict states.

## 9. M3 lecturer demonstration flow

Use this sequence:

1. Register and login.
2. Create a board.
3. Create a task.
4. Open MongoDB Atlas and show the `users`, `boards`, and `tasks` collections.
5. Refresh the browser and show that the task remains.
6. Edit/move the task and refresh again.
7. Temporarily go offline and make a task change.
8. Reconnect and show it syncing.
9. Demonstrate a stale-version update returning `409 Conflict` using Postman or two browser sessions.

## Known scope boundary

This package intentionally stops at M3. Real-time Socket.io synchronization, automated Jest/Supertest/React Testing Library tests, GitHub Actions, Docker Compose, public deployment, and final launch belong to M4/M5.
