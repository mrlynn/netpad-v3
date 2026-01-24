/**
 * FormTriggerNode - Triggered by form submission
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function FormTriggerNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { formName?: string } | undefined;
  const configPreview = config?.formName || undefined;

  return (
    <BaseNode
      category="trigger"
      icon="📋"
      label={data.label || 'Form Trigger'}
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

export const FormTriggerNode = memo(FormTriggerNodeComponent);
export default FormTriggerNode;
