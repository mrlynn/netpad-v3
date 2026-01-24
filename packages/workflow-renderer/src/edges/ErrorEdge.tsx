/**
 * ErrorEdge - Error path edge (red)
 */

import React, { memo } from 'react';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { useRendererTheme } from '../hooks/useTheme';

function ErrorEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  style,
  markerEnd,
}: EdgeProps) {
  const theme = useRendererTheme();

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  const edgeStyle = {
    stroke: theme.edge.error,
    strokeWidth: selected ? 2.5 : 2,
    strokeDasharray: '5,5',
    ...style,
  };

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={edgeStyle}
      markerEnd={markerEnd}
    />
  );
}

export const ErrorEdge = memo(ErrorEdgeComponent);
export default ErrorEdge;
