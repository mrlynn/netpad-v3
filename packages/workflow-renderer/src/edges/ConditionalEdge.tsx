/**
 * ConditionalEdge - Edge with condition label
 */

import React, { memo, type CSSProperties } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { useRendererTheme } from '../hooks/useTheme';
import type { EdgeData } from '../types/workflow';

interface ConditionalEdgeProps extends EdgeProps {
  data?: EdgeData;
}

function ConditionalEdgeComponent({
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
  data,
}: ConditionalEdgeProps) {
  const theme = useRendererTheme();

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  const edgeStyle = {
    stroke: selected ? theme.edge.selected : theme.edge.default,
    strokeWidth: selected ? 2.5 : 2,
    ...style,
  };

  const labelStyle: CSSProperties = {
    position: 'absolute',
    transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
    backgroundColor: theme.edge.labelBackground,
    color: theme.edge.label,
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 500,
    pointerEvents: 'none',
    border: `1px solid ${theme.node.border}`,
    whiteSpace: 'nowrap',
  };

  const label = data?.label || data?.condition;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
        markerEnd={markerEnd}
      />
      {label && (
        <EdgeLabelRenderer>
          <div style={labelStyle} className="wr-edge-label">
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const ConditionalEdge = memo(ConditionalEdgeComponent);
export default ConditionalEdge;
