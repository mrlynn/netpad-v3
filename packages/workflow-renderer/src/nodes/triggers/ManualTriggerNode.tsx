/**
 * ManualTriggerNode - Manually triggered workflow
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function ManualTriggerNodeComponent({ data, selected }: RendererNodeProps) {
  return (
    <BaseNode
      category="trigger"
      icon="👆"
      label={data.label || 'Manual Trigger'}
      description={data.description || 'Click to start workflow'}
      selected={selected}
      inputHandles={0}
      outputHandles={1}
      status={data.status}
      error={data.error}
    />
  );
}

export const ManualTriggerNode = memo(ManualTriggerNodeComponent);
export default ManualTriggerNode;
