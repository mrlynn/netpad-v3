/**
 * ScheduleTriggerNode - Triggered on a schedule
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function ScheduleTriggerNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { cron?: string; schedule?: string } | undefined;
  const configPreview = config?.cron || config?.schedule || undefined;

  return (
    <BaseNode
      category="trigger"
      icon="⏰"
      label={data.label || 'Schedule Trigger'}
      description={data.description}
      selected={selected}
      configPreview={configPreview}
      inputHandles={0}
      outputHandles={1}
      status={data.status}
      error={data.error}
    />
  );
}

export const ScheduleTriggerNode = memo(ScheduleTriggerNodeComponent);
export default ScheduleTriggerNode;
