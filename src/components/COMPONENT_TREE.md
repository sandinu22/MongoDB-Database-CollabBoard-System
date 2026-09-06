# CollabBoard component tree (M1-M3)

```text
App
├── AuthProvider
│   ├── LoginPage
│   ├── RegisterPage
│   └── Workspace (protected)
│       └── BoardDataProvider
│           ├── Header
│           ├── Home
│           │   └── Board
│           │       ├── BoardForm
│           │       ├── TaskForm
│           │       └── Column
│           │           └── TaskCard
│           │               └── TaskForm
│           ├── BoardPage
│           ├── ColumnPage
│           │   └── TaskForm
│           └── TaskPage
│               └── TaskForm
└── Modal (shared form shell)
```

State layers:

- `AuthContext` — JWT session/user state.
- `BoardDataContext` — boards, selected board, columns/tasks, MongoDB API integration, localStorage cache, offline queue, sync, conflicts.
