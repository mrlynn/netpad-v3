/**
 * Node exports for @netpad/workflow-renderer
 */

// Base component
export { BaseNode } from './BaseNode';
export type { BaseNodeProps } from './BaseNode';

// Trigger nodes
export {
  FormTriggerNode,
  WebhookTriggerNode,
  ScheduleTriggerNode,
  ManualTriggerNode,
} from './triggers';

// Logic nodes
export {
  FilterNode,
  SwitchNode,
  DelayNode,
  LoopNode,
  ParallelNode,
  MergeNode,
} from './logic';

// Data nodes
export {
  MongoQueryNode,
  MongoInsertNode,
  MongoUpdateNode,
  MongoDeleteNode,
  TransformNode,
} from './data';

// Action nodes
export {
  EmailSendNode,
  SlackSendNode,
  WebhookCallNode,
  HttpRequestNode,
  SmsSendNode,
  PushNotificationNode,
  FunctionNode,
} from './actions';

// AI nodes
export {
  LLMGenerateNode,
  LLMClassifyNode,
  LLMExtractNode,
  LLMSummarizeNode,
} from './ai';

// Utility nodes
export {
  NoteNode,
  VariableSetNode,
  VariableGetNode,
} from './utility';

// Node registry for WorkflowRenderer
import type { ComponentType } from 'react';
import { FormTriggerNode, WebhookTriggerNode, ScheduleTriggerNode, ManualTriggerNode } from './triggers';
import { FilterNode, SwitchNode, DelayNode, LoopNode, ParallelNode, MergeNode } from './logic';
import { MongoQueryNode, MongoInsertNode, MongoUpdateNode, MongoDeleteNode, TransformNode } from './data';
import { EmailSendNode, SlackSendNode, WebhookCallNode, HttpRequestNode, SmsSendNode, PushNotificationNode, FunctionNode } from './actions';
import { LLMGenerateNode, LLMClassifyNode, LLMExtractNode, LLMSummarizeNode } from './ai';
import { NoteNode, VariableSetNode, VariableGetNode } from './utility';
import { BaseNode } from './BaseNode';
import type { NodeType } from '../types/workflow';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNodeComponent = ComponentType<any>;

/**
 * Registry of all built-in node components
 */
export const nodeRegistry: Record<NodeType, AnyNodeComponent> = {
  // Triggers
  form_trigger: FormTriggerNode,
  webhook_trigger: WebhookTriggerNode,
  schedule_trigger: ScheduleTriggerNode,
  manual_trigger: ManualTriggerNode,
  // Logic
  filter: FilterNode,
  switch: SwitchNode,
  delay: DelayNode,
  loop: LoopNode,
  parallel: ParallelNode,
  merge: MergeNode,
  // Data
  mongodb_query: MongoQueryNode,
  mongodb_insert: MongoInsertNode,
  mongodb_update: MongoUpdateNode,
  mongodb_delete: MongoDeleteNode,
  transform: TransformNode,
  // Actions
  email_send: EmailSendNode,
  slack_send: SlackSendNode,
  webhook_call: WebhookCallNode,
  http_request: HttpRequestNode,
  sms_send: SmsSendNode,
  push_notification: PushNotificationNode,
  function: FunctionNode,
  // AI
  llm_generate: LLMGenerateNode,
  llm_classify: LLMClassifyNode,
  llm_extract: LLMExtractNode,
  llm_summarize: LLMSummarizeNode,
  // Utility
  note: NoteNode,
  variable_set: VariableSetNode,
  variable_get: VariableGetNode,
};

/**
 * Get a node component by type, with fallback to BaseNode for unknown types
 */
export function getNodeComponent(type: string): AnyNodeComponent {
  return nodeRegistry[type as NodeType] || BaseNode;
}
