/**
 * SmsSendNode - Send SMS message
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function SmsSendNodeComponent({ data, selected }: RendererNodeProps) {
  return (
    <BaseNode
      category="action"
      icon="📱"
      label={data.label || 'Send SMS'}
      description={data.description}
      selected={selected}
      inputHandles={1}
      outputHandles={1}
      status={data.status}
      error={data.error}
    />
  );
}

export const SmsSendNode = memo(SmsSendNodeComponent);
export default SmsSendNode;
