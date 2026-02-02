# Moltboard Integration

NetPad ↔ Moltboard (kanban board) integration for task management.

**Status:** ✅ Implemented (PRs #14, #15, #16, #17)

---

## Quick Demo Guide

### Prerequisites
- Moltboard API key: `moltboard_sk_xxx`
- Moltboard instance: https://kanban.mlynn.org (or moltboard.app)
- NetPad running locally or on netpad.io

---

## Demo 1: Form Submission → Moltboard Task

**Goal:** When someone submits a contact form, a task is auto-created in Moltboard.

### Steps

1. **Open NetPad** → Create or edit a form (e.g., Contact Form)

2. **Go to Form Settings** → Click the gear icon or "Settings" tab

3. **Navigate to "Actions & Automation"** section

4. **Enable "Create Moltboard task"** toggle

5. **Configure the integration:**
   - Enter your Moltboard API key
   - Click "Connect & Load Boards"
   - Select your board (e.g., "NetPad")
   - Select the column (e.g., "To Do")
   - Set title template: `New inquiry from {{name}}`
   - Set description: `Email: {{email}}\nMessage: {{message}}`
   - Set priority: P2
   - Add labels: `form-submission, contact`

6. **Save the form**

7. **Test it:**
   - Preview or publish the form
   - Fill it out and submit
   - Check Moltboard → Your task should appear in the selected column!

---

## Demo 2: Workflow Node

**Goal:** Use Moltboard in a workflow to create/update tasks programmatically.

### Steps

1. **Create a new workflow** in NetPad

2. **Add a trigger** (Form Submission, Webhook, or Manual)

3. **Add "Moltboard: Create Task"** node from the Integrations palette

4. **Configure the node:**
   ```
   API Key: moltboard_sk_xxx (or use credentialId)
   Board ID: board_411973f805a0a2d9
   Column ID: col_cc9883dfa1e8dced
   Title: {{trigger.data.name}} - Support Request
   Description: {{trigger.data.message}}
   Priority: p1
   Labels: ["workflow", "auto-created"]
   ```

5. **Save and test** the workflow

---

## Demo 3: Dashboard Widget

**Goal:** Embed a Moltboard task list in a custom page.

### Code Example

```tsx
import { MoltboardTasksWidget } from '@/components/Moltboard';

export default function DashboardPage() {
  return (
    <MoltboardTasksWidget
      apiKey="moltboard_sk_xxx"
      baseUrl="https://kanban.mlynn.org"
      defaultBoardId="board_411973f805a0a2d9"
      maxTasks={10}
      showCompleted={false}
      title="My Tasks"
    />
  );
}
```

---

## Demo 4: Stored Credentials (Secure)

**Goal:** Store API key securely instead of hardcoding.

### Steps

1. Go to **Settings → Integrations**

2. Click **"Add Credential"**

3. Select **"Moltboard (Kanban)"**

4. Enter:
   - Name: "Production Moltboard"
   - API Key: `moltboard_sk_xxx`
   - Base URL: `https://kanban.mlynn.org`

5. Click **"Test Connection"** to verify

6. Save

7. **Use in workflows** with `credentialId` instead of `apiKey`:
   ```json
   {
     "type": "moltboard:create-task",
     "config": {
       "credentialId": "intcred_xxx",
       "boardId": "board_xxx",
       "columnId": "col_xxx",
       "title": "Task from workflow"
     }
   }
   ```

---

## Testing Checklist

### Form Integration
- [ ] Enable Moltboard in Form Settings
- [ ] Enter API key and connect
- [ ] Select board and column
- [ ] Configure title/description templates
- [ ] Submit a test form
- [ ] Verify task appears in Moltboard

### Workflow Nodes
- [ ] Add "Moltboard: Create Task" to workflow
- [ ] Configure with direct API key
- [ ] Test workflow execution
- [ ] Verify task created
- [ ] Test "Moltboard: Update Task" 
- [ ] Test "Moltboard: Get Tasks"

### Credentials
- [ ] Add Moltboard credential in Settings
- [ ] Test connection button works
- [ ] Use credentialId in workflow node
- [ ] Verify credential lookup works

### Widget
- [ ] Import MoltboardTasksWidget
- [ ] Render with API key
- [ ] Verify tasks load
- [ ] Test board selector (if multiple boards)

---

## API Reference

### Base URL
- Production: `https://moltboard.app`
- Dev/Testing: `https://kanban.mlynn.org`

### Authentication
```
Authorization: Bearer <api_key>
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/boards | List all boards |
| GET | /api/boards/:id | Get board with columns |
| GET | /api/tasks | List all tasks |
| GET | /api/tasks?boardId=xxx | Filter by board |
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
  dueDate?: string;
  assigneeId?: string;
  checklist?: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}
```

---

## Template Variables

Use `{{variable}}` syntax in title/description templates:

| Variable | Description |
|----------|-------------|
| `{{name}}` | Form field "name" |
| `{{email}}` | Form field "email" |
| `{{message}}` | Form field "message" |
| `{{formName}}` | Name of the form |
| `{{responseId}}` | Submission ID |
| `{{fieldPath}}` | Any form field by path |

---

## Troubleshooting

### "Invalid API key"
- Check the key starts with `moltboard_sk_`
- Verify the key is active in Moltboard settings

### "Board not found"
- The board ID must match exactly
- Use the board selector UI to avoid typos

### Task not created
- Check browser console for errors
- Verify form hooks config is saved
- Check Moltboard API is reachable

### Credentials not found
- Verify credentialId matches stored credential
- Check credential status is "active"
- Ensure organization context is correct

---

## File Locations

| Component | Path |
|-----------|------|
| API Client | `src/lib/integrations/moltboard/` |
| Workflow Nodes | `src/lib/workflow/nodeHandlers/moltboard*.ts` |
| Dashboard Widget | `src/components/Moltboard/` |
| Webhook Endpoint | `src/app/api/webhooks/moltboard/` |
| Credentials Helper | `src/lib/platform/integrationCredentials.ts` |
| Form Hook Executor | `src/lib/hooks/executeMoltboard.ts` |
| Form Hook Types | `src/types/formHooks.ts` |
| Settings UI | `src/components/Settings/IntegrationCredentialsSettings.tsx` |
| Form Settings UI | `src/components/FormBuilder/HooksSettingsEditor.tsx` |
