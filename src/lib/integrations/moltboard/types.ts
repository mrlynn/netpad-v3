/**
 * Moltboard Integration Types
 */

// ============================================
// Core Types
// ============================================

export interface MoltboardBoard {
  id: string;
  _id?: string;
  tenantId: string;
  name: string;
  description?: string | null;
  columns: MoltboardColumn[];
  createdAt: string;
  updatedAt: string;
}

export interface MoltboardColumn {
  id: string;
  title: string;
  boardId: string;
  order: number;
  color: 'default' | 'info' | 'warning' | 'success' | 'error';
}

export interface MoltboardTask {
  id: string;
  _id?: string;
  tenantId: string;
  boardId: string;
  columnId: string;
  title: string;
  description?: string | null;
  labels?: string[];
  priority?: MoltboardPriority | null;
  dueDate?: string | null;
  assigneeId?: string | null;
  order?: number;
  checklist?: MoltboardChecklistItem[];
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type MoltboardPriority = 'p0' | 'p1' | 'p2' | 'p3';

export interface MoltboardChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  order: number;
  children?: MoltboardChecklistItem[];
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateTaskInput {
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  labels?: string[];
  priority?: MoltboardPriority;
  dueDate?: string;
  assigneeId?: string;
  checklist?: Omit<MoltboardChecklistItem, 'id'>[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  columnId?: string;
  labels?: string[];
  priority?: MoltboardPriority | null;
  dueDate?: string | null;
  assigneeId?: string | null;
  archived?: boolean;
  checklist?: MoltboardChecklistItem[];
  order?: number;
}

export interface TaskQueryParams {
  boardId?: string;
  columnId?: string;
  labels?: string[];
  priority?: MoltboardPriority;
  assigneeId?: string;
  archived?: boolean;
  search?: string;
}

export interface MoltboardApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

// ============================================
// Integration Configuration
// ============================================

export interface MoltboardIntegrationConfig {
  /** API base URL */
  baseUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Default board ID (optional) */
  defaultBoardId?: string;
  /** Default column ID for new tasks (optional) */
  defaultColumnId?: string;
}

export interface MoltboardCredentials {
  type: 'moltboard';
  apiKey: string;
  baseUrl: string;
}

// ============================================
// Workflow Node Types
// ============================================

export interface MoltboardCreateTaskConfig {
  /** Connection credential ID */
  credentialId?: string;
  /** Or direct API key */
  apiKey?: string;
  /** API base URL */
  baseUrl?: string;
  /** Target board */
  boardId: string;
  /** Target column */
  columnId: string;
  /** Task title (supports {{variables}}) */
  title: string;
  /** Task description (supports {{variables}}) */
  description?: string;
  /** Labels to add */
  labels?: string[];
  /** Priority level */
  priority?: MoltboardPriority;
  /** Due date (ISO string or expression) */
  dueDate?: string;
  /** Assignee ID */
  assigneeId?: string;
}

export interface MoltboardUpdateTaskConfig {
  credentialId?: string;
  apiKey?: string;
  baseUrl?: string;
  taskId: string;
  title?: string;
  description?: string;
  columnId?: string;
  labels?: string[];
  priority?: MoltboardPriority | null;
  dueDate?: string | null;
  assigneeId?: string | null;
}

export interface MoltboardMoveTaskConfig {
  credentialId?: string;
  apiKey?: string;
  baseUrl?: string;
  taskId: string;
  columnId: string;
}

export interface MoltboardGetTasksConfig {
  credentialId?: string;
  apiKey?: string;
  baseUrl?: string;
  boardId?: string;
  columnId?: string;
  labels?: string[];
  priority?: MoltboardPriority;
  limit?: number;
}
