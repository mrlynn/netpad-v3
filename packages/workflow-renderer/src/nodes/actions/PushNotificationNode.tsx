/**
 * PushNotificationNode - Send push notification
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function PushNotificationNodeComponent({ data, selected }: RendererNodeProps) {
  return (
    <BaseNode
      category="action"
      icon="🔔"
      label={data.label || 'Push Notification'}
      description={data.description}
      selected={selected}
      inputHandles={1}
      outputHandles={1}
      status={data.status}
      error={data.error}
    />
  );
}

export const PushNotificationNode = memo(PushNotificationNodeComponent);
export default PushNotificationNode;
