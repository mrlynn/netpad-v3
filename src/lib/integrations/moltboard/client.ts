/**
 * Moltboard API Client
 * 
 * A typed client for interacting with the Moltboard kanban API.
 */

import {
  MoltboardBoard,
  MoltboardTask,
  CreateTaskInput,
  UpdateTaskInput,
  TaskQueryParams,
  MoltboardApiError,
  MoltboardIntegrationConfig,
} from './types';

const DEFAULT_BASE_URL = 'https://kanban.mlynn.org';
const DEFAULT_TIMEOUT = 30000;

export class MoltboardClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(config: MoltboardIntegrationConfig) {
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.apiKey = config.apiKey;
    this.timeout = DEFAULT_TIMEOUT;
  }

  // ============================================
  // Private Helpers
  // ============================================

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: MoltboardApiError;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            error: 'Request failed',
            message: response.statusText,
            statusCode: response.status,
          };
        }
        throw new MoltboardError(
          errorData.message || errorData.error || 'Unknown error',
          response.status,
          errorData
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof MoltboardError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new MoltboardError('Request timeout', 408);
      }

      throw new MoltboardError(
        error instanceof Error ? error.message : 'Unknown error',
        500
      );
    }
  }

  // ============================================
  // Boards
  // ============================================

  /**
   * List all boards
   */
  async listBoards(): Promise<MoltboardBoard[]> {
    return this.request<MoltboardBoard[]>('GET', '/api/boards');
  }

  /**
   * Get a single board by ID
   */
  async getBoard(boardId: string): Promise<MoltboardBoard> {
    return this.request<MoltboardBoard>('GET', `/api/boards/${boardId}`);
  }

  // ============================================
  // Tasks
  // ============================================

  /**
   * List tasks with optional filters
   */
  async listTasks(params?: TaskQueryParams): Promise<MoltboardTask[]> {
    let path = '/api/tasks';
    
    if (params) {
      const searchParams = new URLSearchParams();
      if (params.boardId) searchParams.set('boardId', params.boardId);
      if (params.columnId) searchParams.set('columnId', params.columnId);
      if (params.priority) searchParams.set('priority', params.priority);
      if (params.assigneeId) searchParams.set('assigneeId', params.assigneeId);
      if (params.archived !== undefined) searchParams.set('archived', String(params.archived));
      if (params.search) searchParams.set('search', params.search);
      if (params.labels?.length) {
        params.labels.forEach(label => searchParams.append('labels', label));
      }
      
      const queryString = searchParams.toString();
      if (queryString) {
        path += `?${queryString}`;
      }
    }

    return this.request<MoltboardTask[]>('GET', path);
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId: string): Promise<MoltboardTask> {
    return this.request<MoltboardTask>('GET', `/api/tasks/${taskId}`);
  }

  /**
   * Create a new task
   */
  async createTask(input: CreateTaskInput): Promise<MoltboardTask> {
    return this.request<MoltboardTask>('POST', '/api/tasks', input);
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId: string, input: UpdateTaskInput): Promise<MoltboardTask> {
    return this.request<MoltboardTask>('PATCH', `/api/tasks/${taskId}`, input);
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('DELETE', `/api/tasks/${taskId}`);
  }

  /**
   * Move a task to a different column
   */
  async moveTask(taskId: string, columnId: string, order?: number): Promise<MoltboardTask> {
    const update: UpdateTaskInput = { columnId };
    if (order !== undefined) {
      update.order = order;
    }
    return this.updateTask(taskId, update);
  }

  /**
   * Add a checklist item to a task
   */
  async addChecklistItem(
    taskId: string,
    text: string,
    parentId?: string
  ): Promise<MoltboardTask> {
    const task = await this.getTask(taskId);
    const checklist = task.checklist || [];
    
    const newItem = {
      id: `chk_${Date.now()}`,
      text,
      completed: false,
      order: checklist.length,
    };

    if (parentId) {
      // Add as child of existing item
      const parent = checklist.find(item => item.id === parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(newItem);
      }
    } else {
      checklist.push(newItem);
    }

    return this.updateTask(taskId, { checklist });
  }

  /**
   * Toggle checklist item completion
   */
  async toggleChecklistItem(
    taskId: string,
    itemId: string,
    completed: boolean
  ): Promise<MoltboardTask> {
    const task = await this.getTask(taskId);
    const checklist = task.checklist || [];
    
    // Find and update the item (supports nested)
    const updateItem = (items: typeof checklist): boolean => {
      for (const item of items) {
        if (item.id === itemId) {
          item.completed = completed;
          return true;
        }
        if (item.children && updateItem(item.children)) {
          return true;
        }
      }
      return false;
    };

    updateItem(checklist);
    return this.updateTask(taskId, { checklist });
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get tasks grouped by column for a board
   */
  async getTasksByColumn(boardId: string): Promise<Map<string, MoltboardTask[]>> {
    const [board, tasks] = await Promise.all([
      this.getBoard(boardId),
      this.listTasks({ boardId }),
    ]);

    const tasksByColumn = new Map<string, MoltboardTask[]>();
    
    // Initialize with empty arrays for all columns
    board.columns.forEach(col => {
      tasksByColumn.set(col.id, []);
    });

    // Group tasks by column
    tasks.forEach(task => {
      const columnTasks = tasksByColumn.get(task.columnId) || [];
      columnTasks.push(task);
      tasksByColumn.set(task.columnId, columnTasks);
    });

    // Sort by order
    tasksByColumn.forEach((columnTasks, columnId) => {
      columnTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
      tasksByColumn.set(columnId, columnTasks);
    });

    return tasksByColumn;
  }

  /**
   * Search tasks across all boards
   */
  async searchTasks(query: string, boardId?: string): Promise<MoltboardTask[]> {
    return this.listTasks({ search: query, boardId });
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(boardId?: string): Promise<MoltboardTask[]> {
    const tasks = await this.listTasks({ boardId, archived: false });
    const now = new Date();
    
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      return new Date(task.dueDate) < now;
    });
  }

  /**
   * Get tasks due soon (within N days)
   */
  async getTasksDueSoon(days: number = 7, boardId?: string): Promise<MoltboardTask[]> {
    const tasks = await this.listTasks({ boardId, archived: false });
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= now && dueDate <= cutoff;
    });
  }
}

// ============================================
// Error Class
// ============================================

export class MoltboardError extends Error {
  public statusCode: number;
  public details?: MoltboardApiError;

  constructor(message: string, statusCode: number, details?: MoltboardApiError) {
    super(message);
    this.name = 'MoltboardError';
    this.statusCode = statusCode;
    this.details = details;
  }

  get isNotFound(): boolean {
    return this.statusCode === 404;
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  get isRateLimited(): boolean {
    return this.statusCode === 429;
  }

  get isRetryable(): boolean {
    return this.statusCode >= 500 || this.statusCode === 429 || this.statusCode === 408;
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a Moltboard client from credentials
 */
export function createMoltboardClient(
  apiKey: string,
  baseUrl: string = DEFAULT_BASE_URL
): MoltboardClient {
  return new MoltboardClient({ apiKey, baseUrl });
}
