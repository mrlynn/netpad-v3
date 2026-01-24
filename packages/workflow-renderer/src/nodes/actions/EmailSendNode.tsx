/**
 * EmailSendNode - Send email
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function EmailSendNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { to?: string; recipient?: string } | undefined;
  const configPreview = config?.to || config?.recipient || undefined;

  return (
    <BaseNode
      category="action"
      icon="✉️"
      label={data.label || 'Send Email'}
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

export const EmailSendNode = memo(EmailSendNodeComponent);
export default EmailSendNode;
