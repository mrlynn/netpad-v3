# Moltboard Integration

NetPad ↔ Moltboard (kanban board) integration for task management.

**Status:** ✅ Implemented

## What's Included

### 1. API Client (`src/lib/integrations/moltboard/`)
- `client.ts` - Full-featured Moltboard API client with:
  - Board listing and retrieval
  - Task CRUD operations
  - Checklist management
  - Query filtering (by board, column, labels, priority)
  - Utility methods (overdue tasks, tasks due soon, etc.)
- `types.ts` - Complete TypeScript types
- `index.ts` - Exports

### 2. Workflow Node Handlers (`src/lib/workflow/nodeHandlers/`)
- `moltboardCreateTask.ts` - Create task in Moltboard
- `moltboardUpdateTask.ts` - Update existing task
- `moltboardGetTasks.ts` - Query tasks from board

Nodes appear in the workflow editor under **Integrations** category.

### 3. Dashboard Widget (`src/components/Moltboard/`)
- `MoltboardTasksWidget.tsx` - Embeddable task list widget
  - Board selector (multi-board support)
  - Priority-based sorting (P0-P3)
  - Due date display with overdue highlighting
  - Direct links to tasks in Moltboard
  - Configurable task limit and completion filter

### 4. Webhook Endpoint (`src/app/api/webhooks/moltboard/`)
- Receives webhook events from Moltboard for bidirectional sync
- Supports events: `task.created`, `task.updated`, `task.moved`, `task.deleted`
- HMAC signature verification (optional)
- Links Moltboard tasks to NetPad form submissions

### 5. Integration Credentials (TODO)
- Store API key securely via integrationCredentials system
- Support per-org Moltboard connections

### 6. Form Submission Action (TODO)
- Configure forms to create Moltboard tasks on submit
- Map form fields → task fields

## API Reference

Base URL: `https://kanban.mlynn.org` (or `moltboard.app`)

### Authentication
```
Authorization: Bearer <api_key>
```

### Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/boards | List all boards |
| GET | /api/boards/:id | Get board with columns |
| GET | /api/tasks | List all tasks (filterable) |
| POST | /api/tasks | Create task |
| PATCH | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task |

### Task Schema
```typescript
interface MoltboardTask {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  boardId: string;
  labels?: string[];
  priority?: 'p0' | 'p1' | 'p2' | 'p3';
  dueDate?: string; // ISO date
  assigneeId?: string;
  checklist?: ChecklistItem[];
  order?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}
```

## Usage

### Workflow: Create Task on Form Submit
```json
{
  "type": "moltboard:create-task",
  "config": {
    "boardId": "board_xxx",
    "columnId": "col_xxx",
    "title": "{{submission.name}} - New Inquiry",
    "description": "{{submission.message}}",
    "labels": ["form-submission"],
    "priority": "p2"
  }
}
```

### Form Settings: Auto-Create Task
Forms can be configured to automatically create a Moltboard task:
- Settings → Integrations → Moltboard
- Select board and target column
- Map form fields to task fields
