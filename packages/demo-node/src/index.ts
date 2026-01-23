/**
 * @netpad/demo-node Extension
 *
 * ============================================================================
 * A Simple Demonstration of a NetPad Workflow Node Extension
 * ============================================================================
 *
 * This extension serves as a minimal, easy-to-understand example of how to
 * create custom workflow nodes for NetPad. It provides a single node called
 * "Log Message" that simply logs a message and passes data through.
 *
 * HOW TO USE THIS AS A TEMPLATE:
 * 1. Copy this entire package to a new directory
 * 2. Update package.json with your extension name
 * 3. Modify the node definition (label, description, config fields)
 * 4. Implement your business logic in the handler function
 * 5. Register your extension in the NetPad extension loader
 *
 * KEY CONCEPTS:
 * - Extension Metadata: Identifies your extension in the system
 * - Workflow Nodes: Custom nodes that appear in the workflow editor palette
 * - Node Definition: Describes the node's appearance and configuration UI
 * - Node Handler: The function that executes when the node runs in a workflow
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
// These types match the NetPad core types but are duplicated here to avoid
// circular dependencies. In a real extension, you would import these from
// @netpad/types if available.

/**
 * The result returned by a node handler after execution.
 */
interface NodeExecutionResult {
  /** Whether the node executed successfully */
  success: boolean;
  /** Output data from this node (available to downstream nodes) */
  data: Record<string, unknown>;
  /** Error details if success is false */
  error?: {
    code: string;        // Error code (e.g., 'MISSING_CONFIG', 'OPERATION_FAILED')
    message: string;     // Human-readable error message
    retryable: boolean;  // Whether the workflow executor should retry
  };
  /** Optional execution metadata */
  metadata?: {
    durationMs?: number;      // How long the node took to execute
    bytesProcessed?: number;  // For data processing nodes
  };
}

/**
 * The context provided to a node handler during execution.
 */
interface NodeExecutionContext {
  /** Unique ID of this node instance */
  nodeId: string;
  /** The type of node (e.g., 'demo:log-message') */
  nodeType: string;
  /** Raw configuration from the node editor */
  config: Record<string, unknown>;
  /** Configuration with variables substituted (e.g., {{formData.name}} resolved) */
  resolvedConfig: Record<string, unknown>;
  /** Input data from previous nodes in the workflow */
  inputs: Record<string, unknown>;
  /** Information about what triggered this workflow */
  trigger: {
    type: string;  // 'form-submission', 'schedule', 'webhook', 'manual', etc.
    payload?: Record<string, unknown>;  // Trigger-specific data
  };
  /** Helper to get database connection details from vault */
  getConnection: (vaultId: string) => Promise<{ connectionString: string; database: string } | null>;
  /** Helper to get email service credentials */
  getEmailCredentials: (credentialId: string) => Promise<unknown>;
}

/**
 * Type signature for node handler functions.
 */
type NodeHandler = (context: NodeExecutionContext) => Promise<NodeExecutionResult>;

/**
 * Configuration field definition for the node editor UI.
 */
interface NodeConfigField {
  name: string;           // Key in the config object
  label: string;          // Display label in the UI
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'json' | 'expression';
  defaultValue?: unknown;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;  // For 'select' type
}

/**
 * Workflow node definition that appears in the editor palette.
 */
interface ExtensionWorkflowNode {
  definition: {
    type: string;              // Unique identifier (convention: 'extensionid:node-name')
    label: string;             // Display name in palette
    description: string;       // Tooltip description
    category: 'triggers' | 'logic' | 'integrations' | 'actions' | 'data' | 'ai' | 'forms' | 'custom' | 'annotations';
    color: string;             // Hex color for the node
    icon: string;              // MUI icon name (e.g., 'Print', 'Email', 'Code')
    version: string;           // Semantic version
    configFields?: NodeConfigField[];
    outputs?: Array<{ id: string; label: string; primary?: boolean }>;
  };
  handler: NodeHandler;
}

/**
 * The NetPad Extension interface.
 */
interface NetPadExtension {
  metadata: {
    id: string;            // Unique extension identifier
    name: string;          // Human-readable name
    version: string;       // Semantic version
    description?: string;
    author?: string;
  };
  features?: string[];                    // Feature flags this extension provides
  routes?: Array<{                        // Optional API routes
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    handler: (request: NextRequest) => Promise<NextResponse>;
    requiresAuth?: boolean;
  }>;
  workflowNodes?: ExtensionWorkflowNode[];  // Custom workflow nodes
  services?: Record<string, unknown>;        // Services for dependency injection
  initialize?: () => Promise<void>;          // Called when extension loads
  cleanup?: () => Promise<void>;             // Called when extension unloads
}


// ============================================================================
// NODE CONFIGURATION
// ============================================================================

/**
 * Configuration options for the Log Message node.
 *
 * Users can set these values in the workflow editor's node configuration panel.
 */
interface LogMessageConfig {
  /** The message to log (supports {{variable}} syntax for dynamic values) */
  message?: string;
  /** Log level: info, warn, or error */
  level?: 'info' | 'warn' | 'error';
  /** Whether to include input data in the output */
  passthrough?: boolean;
  /** Custom label for the log entry */
  label?: string;
}


// ============================================================================
// NODE HANDLER
// ============================================================================

/**
 * Handler for the Log Message node.
 *
 * This function is called by the workflow executor when this node runs.
 * It receives the execution context and must return a result.
 *
 * WHAT THIS HANDLER DOES:
 * 1. Extracts configuration from the context
 * 2. Logs the message with the specified level
 * 3. Returns success with the logged data (available to downstream nodes)
 *
 * @param context - The execution context containing config, inputs, etc.
 * @returns A promise resolving to the execution result
 */
const logMessageHandler: NodeHandler = async (context): Promise<NodeExecutionResult> => {
  const startTime = Date.now();

  try {
    // Get the resolved config (with variables like {{formData.name}} already substituted)
    const config = context.resolvedConfig as LogMessageConfig;

    // Extract configuration with defaults
    const message = config.message || 'Hello from the Demo Node!';
    const level = config.level || 'info';
    const passthrough = config.passthrough !== false; // Default to true
    const label = config.label || 'Demo Node';

    // Create the log entry
    const logEntry = {
      label,
      level,
      message,
      timestamp: new Date().toISOString(),
      nodeId: context.nodeId,
      triggeredBy: context.trigger.type,
    };

    // Actually log the message (this appears in server logs)
    const logPrefix = `[${label}]`;
    switch (level) {
      case 'warn':
        console.warn(logPrefix, message);
        break;
      case 'error':
        console.error(logPrefix, message);
        break;
      default:
        console.log(logPrefix, message);
    }

    // Build the output data
    // If passthrough is enabled, include the inputs so downstream nodes can use them
    const outputData: Record<string, unknown> = {
      log: logEntry,
      message: `Logged: "${message}"`,
    };

    if (passthrough) {
      outputData.passthrough = context.inputs;
    }

    // Return success result
    return {
      success: true,
      data: outputData,
      metadata: {
        durationMs: Date.now() - startTime,
      },
    };

  } catch (error) {
    // If anything goes wrong, return a failure result
    return {
      success: false,
      data: {},
      error: {
        code: 'OPERATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        retryable: false,
      },
    };
  }
};


// ============================================================================
// NODE DEFINITION
// ============================================================================

/**
 * Node definition for the Log Message node.
 *
 * This defines how the node appears in the workflow editor:
 * - Where it shows up in the palette (category)
 * - What it looks like (color, icon, label)
 * - What configuration options it has (configFields)
 * - What outputs it provides (outputs)
 */
const logMessageDefinition = {
  // Unique type identifier - convention is 'extensionid:node-name'
  type: 'demo:log-message',

  // Display name shown in the palette and on the node
  label: 'Log Message',

  // Description shown in tooltips
  description: 'Logs a message to the console and passes data through. Great for debugging workflows!',

  // Which palette section this node appears in
  // Options: 'triggers', 'logic', 'integrations', 'actions', 'data', 'ai', 'forms', 'custom', 'annotations'
  category: 'custom' as const,

  // Node color (hex) - choose something distinct from built-in nodes
  color: '#FF6B35',  // A friendly orange

  // MUI icon name - see https://mui.com/material-ui/material-icons/
  icon: 'Terminal',

  // Semantic version of this node definition
  version: '1.0.0',

  // Configuration fields shown in the node editor panel
  configFields: [
    {
      name: 'message',
      label: 'Message',
      type: 'textarea' as const,
      placeholder: 'Enter your message here...',
      helpText: 'The message to log. Use {{variable}} syntax to include data from previous nodes.',
      defaultValue: 'Hello from the Demo Node!',
    },
    {
      name: 'level',
      label: 'Log Level',
      type: 'select' as const,
      defaultValue: 'info',
      options: [
        { label: '📝 Info', value: 'info' },
        { label: '⚠️ Warning', value: 'warn' },
        { label: '❌ Error', value: 'error' },
      ],
      helpText: 'The severity level of the log message',
    },
    {
      name: 'label',
      label: 'Label',
      type: 'text' as const,
      placeholder: 'Demo Node',
      helpText: 'A custom label that appears in the log output',
    },
    {
      name: 'passthrough',
      label: 'Pass Through Inputs',
      type: 'boolean' as const,
      defaultValue: true,
      helpText: 'If enabled, input data from previous nodes will be included in the output',
    },
  ],

  // Output handles - downstream nodes connect to these
  outputs: [
    {
      id: 'output',
      label: 'Success',
      primary: true,  // The default output connection
    },
  ],
};


// ============================================================================
// EXTENSION DEFINITION
// ============================================================================

/**
 * The Demo Node Extension.
 *
 * This is the main export that NetPad's extension loader will import.
 * It registers the extension metadata and all provided functionality.
 */
export const demoNodeExtension: NetPadExtension = {
  // Extension metadata - identifies this extension in the system
  metadata: {
    id: 'netpad-demo-node',
    name: 'Demo Node Extension',
    version: '1.0.0',
    description: 'A simple demonstration of how to create NetPad workflow node extensions',
    author: 'NetPad Team',
  },

  // Feature flags - can be used to conditionally enable functionality
  features: [
    'custom:demo-node',
  ],

  // Custom workflow nodes provided by this extension
  workflowNodes: [
    {
      definition: logMessageDefinition,
      handler: logMessageHandler,
    },
  ],

  // Lifecycle hooks
  initialize: async () => {
    console.log('[Demo Node] Extension initialized! 🚀');
    console.log('[Demo Node] The "Log Message" node is now available in the workflow editor.');
  },

  cleanup: async () => {
    console.log('[Demo Node] Extension cleaned up.');
  },
};

// Default export for the extension loader
export default demoNodeExtension;

// Named exports for direct access
export { logMessageHandler, logMessageDefinition };
export type { LogMessageConfig, NodeExecutionResult, NodeExecutionContext };
