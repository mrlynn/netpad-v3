'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useReducer,
  ReactNode,
} from 'react';
import {
  ChatMessage,
  ChatAction,
  FormBuilderContext,
  WorkflowBuilderContext,
  CurrentView,
} from '@/types/chat';
import { FieldConfig } from '@/types/form';
import { WorkflowNode, WorkflowEdge, WorkflowSettings } from '@/types/workflow';

// ============================================
// State Types
// ============================================

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

type ChatStateAction =
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<ChatMessage> } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'MARK_ACTION_EXECUTED'; payload: string };

function chatReducer(state: ChatState, action: ChatStateAction): ChatState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.id
            ? { ...msg, ...action.payload.updates }
            : msg
        ),
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [], error: null };
    case 'MARK_ACTION_EXECUTED':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload ? { ...msg, actionExecuted: true } : msg
        ),
      };
    default:
      return state;
  }
}

// ============================================
// Context Interface
// ============================================

interface ChatContextValue {
  // State
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;

  // Form builder context
  formContext: FormBuilderContext;

  // Workflow builder context
  workflowContext: WorkflowBuilderContext;

  // Active context type
  activeContextType: 'form' | 'workflow' | 'none';

  // Actions
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  executeAction: (messageId: string, action: ChatAction) => void;

  // Context setters (called by FormBuilder)
  setFormContext: (context: Partial<FormBuilderContext>) => void;

  // Workflow context setters (called by WorkflowEditor)
  setWorkflowContext: (context: Partial<WorkflowBuilderContext>) => void;

  // Action handlers (set by FormBuilder)
  registerActionHandlers: (handlers: ActionHandlers) => void;

  // Workflow action handlers (set by WorkflowEditor)
  registerWorkflowActionHandlers: (handlers: WorkflowActionHandlers) => void;
}

export interface ActionHandlers {
  onAddField?: (field: Partial<FieldConfig>, position?: number) => void;
  onUpdateField?: (path: string, updates: Partial<FieldConfig>) => void;
  onDeleteField?: (path: string) => void;
  onReorderFields?: (paths: string[]) => void;
  onUpdateSettings?: (settings: Record<string, unknown>) => void;
  onNavigate?: (to: string) => void;
}

export interface WorkflowActionHandlers {
  onAddNode?: (nodeType: string, label?: string, position?: { x: number; y: number }, config?: Record<string, unknown>) => void;
  onUpdateNode?: (nodeId: string, updates: { label?: string; config?: Record<string, unknown>; enabled?: boolean }) => void;
  onDeleteNode?: (nodeId: string) => void;
  onConnectNodes?: (sourceId: string, targetId: string, sourceHandle?: string, targetHandle?: string) => void;
  onUpdateWorkflowSettings?: (settings: Partial<WorkflowSettings>) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

// ============================================
// Provider
// ============================================

const FORM_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm your form building assistant. I can help you:\n\n" +
    "- **Add fields** - \"Add a rating field for customer satisfaction\"\n" +
    "- **Suggest improvements** - \"What fields should I add?\"\n" +
    "- **Explain features** - \"How do conditional fields work?\"\n" +
    "- **Configure settings** - \"Make all fields required\"\n\n" +
    "What would you like help with?",
  timestamp: new Date(),
};

const WORKFLOW_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-workflow',
  role: 'assistant',
  content:
    "Hi! I'm your workflow building assistant. I can help you:\n\n" +
    "- **Add nodes** - \"Add an email notification after form submission\"\n" +
    "- **Connect steps** - \"Connect the trigger to the email node\"\n" +
    "- **Configure nodes** - \"Set the delay to 5 minutes\"\n" +
    "- **Explain concepts** - \"How do conditional branches work?\"\n" +
    "- **Suggest workflows** - \"Create a workflow for form submissions\"\n\n" +
    "What would you like to build?",
  timestamp: new Date(),
};

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, dispatch] = useReducer(chatReducer, {
    messages: [FORM_WELCOME_MESSAGE],
    isLoading: false,
    error: null,
  });

  const [formContext, setFormContextState] = useState<FormBuilderContext>({
    fields: [],
    currentView: 'other',
  });

  const [workflowContext, setWorkflowContextState] = useState<WorkflowBuilderContext>({
    nodes: [],
    edges: [],
    currentView: 'other',
  });

  const [activeContextType, setActiveContextType] = useState<'form' | 'workflow' | 'none'>('none');

  const [actionHandlers, setActionHandlers] = useState<ActionHandlers>({});
  const [workflowActionHandlers, setWorkflowActionHandlers] = useState<WorkflowActionHandlers>({});

  // Chat visibility
  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen((prev) => !prev), []);

  // Update form context
  const setFormContext = useCallback((context: Partial<FormBuilderContext>) => {
    setFormContextState((prev) => ({ ...prev, ...context }));
    setActiveContextType('form');
  }, []);

  // Update workflow context
  const setWorkflowContext = useCallback((context: Partial<WorkflowBuilderContext>) => {
    setWorkflowContextState((prev) => ({ ...prev, ...context }));
    setActiveContextType('workflow');
  }, []);

  // Register action handlers from FormBuilder
  const registerActionHandlers = useCallback((handlers: ActionHandlers) => {
    setActionHandlers(handlers);
  }, []);

  // Register workflow action handlers from WorkflowEditor
  const registerWorkflowActionHandlers = useCallback((handlers: WorkflowActionHandlers) => {
    setWorkflowActionHandlers(handlers);
  }, []);

  // Execute an action from assistant
  const executeAction = useCallback(
    (messageId: string, action: ChatAction) => {
      try {
        switch (action.type) {
          // Form Builder Actions
          case 'add_field':
            if (actionHandlers.onAddField) {
              actionHandlers.onAddField(
                action.payload.field,
                action.payload.position
              );
            }
            break;
          case 'update_field':
            if (actionHandlers.onUpdateField) {
              actionHandlers.onUpdateField(
                action.payload.fieldPath,
                action.payload.updates
              );
            }
            break;
          case 'delete_field':
            if (actionHandlers.onDeleteField) {
              actionHandlers.onDeleteField(action.payload.fieldPath);
            }
            break;
          case 'reorder_fields':
            if (actionHandlers.onReorderFields) {
              actionHandlers.onReorderFields(action.payload.fieldPaths);
            }
            break;
          case 'update_settings':
            if (actionHandlers.onUpdateSettings) {
              actionHandlers.onUpdateSettings(action.payload.settings);
            }
            break;
          case 'navigate':
            if (actionHandlers.onNavigate) {
              actionHandlers.onNavigate(action.payload.to);
            }
            break;
          case 'suggest_fields':
            // Handled in UI - shows selection
            break;
          case 'explain':
            // No action needed - content is in message
            break;

          // Workflow Builder Actions
          case 'add_node':
            if (workflowActionHandlers.onAddNode) {
              workflowActionHandlers.onAddNode(
                action.payload.nodeType,
                action.payload.label,
                action.payload.position,
                action.payload.config
              );
            }
            break;
          case 'update_node':
            if (workflowActionHandlers.onUpdateNode) {
              workflowActionHandlers.onUpdateNode(
                action.payload.nodeId,
                action.payload.updates
              );
            }
            break;
          case 'delete_node':
            if (workflowActionHandlers.onDeleteNode) {
              workflowActionHandlers.onDeleteNode(action.payload.nodeId);
            }
            break;
          case 'connect_nodes':
            if (workflowActionHandlers.onConnectNodes) {
              workflowActionHandlers.onConnectNodes(
                action.payload.sourceNodeId,
                action.payload.targetNodeId,
                action.payload.sourceHandle,
                action.payload.targetHandle
              );
            }
            break;
          case 'update_workflow_settings':
            if (workflowActionHandlers.onUpdateWorkflowSettings) {
              workflowActionHandlers.onUpdateWorkflowSettings(action.payload.settings);
            }
            break;
          case 'suggest_workflow':
            // Handled in UI - shows workflow template suggestion
            break;
        }
        dispatch({ type: 'MARK_ACTION_EXECUTED', payload: messageId });
      } catch (error) {
        console.error('Error executing action:', error);
        dispatch({
          type: 'SET_ERROR',
          payload: 'Failed to execute action. Please try again.',
        });
      }
    },
    [actionHandlers, workflowActionHandlers]
  );

  // Send a message
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message.trim(),
        timestamp: new Date(),
      };

      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Add placeholder for assistant response
      const assistantMessageId = `assistant-${Date.now()}`;
      const placeholderMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      dispatch({ type: 'ADD_MESSAGE', payload: placeholderMessage });

      try {
        // Build conversation history for context
        // Include all previous messages (excluding welcome and system messages)
        // Note: state.messages doesn't include the current userMessage yet due to async dispatch
        const previousMessages = state.messages
          .filter((m) => m.role !== 'system' && m.id !== 'welcome' && !m.id.startsWith('welcome-'))
          .filter((m) => m.content && m.content.trim() !== '') // Exclude empty messages
          .slice(-20) // Keep last 20 messages for longer context
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

        // The current message is sent separately in body.message, so we pass previous history
        const conversationHistory = previousMessages;

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message.trim(),
            conversationHistory,
            context: activeContextType === 'form' ? formContext : undefined,
            workflowContext: activeContextType === 'workflow' ? workflowContext : undefined,
            contextType: activeContextType,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to get response');
        }

        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            id: assistantMessageId,
            updates: {
              content: data.message,
              action: data.action,
              isStreaming: false,
            },
          },
        });
      } catch (error) {
        console.error('Chat error:', error);
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            id: assistantMessageId,
            updates: {
              content:
                "I'm sorry, I encountered an error. Please try again.",
              isStreaming: false,
            },
          },
        });
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [state.messages, formContext, workflowContext, activeContextType]
  );

  // Clear messages
  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
    const welcomeMessage = activeContextType === 'workflow'
      ? { ...WORKFLOW_WELCOME_MESSAGE, id: `welcome-workflow-${Date.now()}` }
      : { ...FORM_WELCOME_MESSAGE, id: `welcome-${Date.now()}` };
    dispatch({ type: 'ADD_MESSAGE', payload: welcomeMessage });
  }, [activeContextType]);

  // Keyboard shortcut: Cmd/Ctrl + Shift + A to toggle chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        toggleChat();
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        closeChat();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggleChat, closeChat]);

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        messages: state.messages,
        isLoading: state.isLoading,
        error: state.error,
        formContext,
        workflowContext,
        activeContextType,
        openChat,
        closeChat,
        toggleChat,
        sendMessage,
        clearMessages,
        executeAction,
        setFormContext,
        setWorkflowContext,
        registerActionHandlers,
        registerWorkflowActionHandlers,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
