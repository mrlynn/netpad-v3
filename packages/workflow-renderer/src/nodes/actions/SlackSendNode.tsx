/**
 * SlackSendNode - Send Slack message
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function SlackSendNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { channel?: string } | undefined;
  const configPreview = config?.channel || undefined;

  return (
    <BaseNode
      category="action"
      icon="💬"
      label={data.label || 'Send to Slack'}
      description={data.description}
      selected={selected}
      configPreview={configPreview}
      inputHandles={1}
      outputHandles={1}
      status={data.status}
      error={data.error}
    />
  );
}

export const SlackSendNode = memo(SlackSendNodeComponent);
export default SlackSendNode;
