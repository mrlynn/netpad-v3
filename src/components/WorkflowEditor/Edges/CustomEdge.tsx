'use client';

import React from 'react';
import {
  EdgeProps,
  getBezierPath,
  getStraightPath,
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
} from 'reactflow';
import { useTheme, alpha } from '@mui/material';

/**
 * Custom edge component that properly respects style properties
 * including custom stroke colors and widths set via EdgeConfigPanel
 */
export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
}: EdgeProps) {
  const theme = useTheme();
  const colorMode = theme.palette.mode;

  // Default colors based on theme
  const defaultStroke = colorMode === 'dark'
    ? theme.palette.primary.light
    : theme.palette.primary.main;

  // Use custom stroke color if provided, otherwise use default
  const strokeColor = style?.stroke || defaultStroke;
  const strokeWidth = style?.strokeWidth || 0.5;

  // Get the path based on edge type (default is bezier)
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Calculate glow effect based on stroke color
  const glowColor = style?.stroke
    ? alpha(style.stroke as string, 0.4)
    : colorMode === 'dark'
      ? 'rgba(0, 237, 100, 0.4)'
      : 'rgba(0, 104, 74, 0.3)';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth,
          filter: `drop-shadow(0 0 3px ${glowColor})`,
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 11,
              fontWeight: 500,
              pointerEvents: 'all',
              padding: '2px 6px',
              borderRadius: 4,
              backgroundColor: colorMode === 'dark'
                ? alpha('#000', 0.7)
                : alpha('#fff', 0.9),
              color: colorMode === 'dark' ? '#fff' : '#000',
              border: `1px solid ${colorMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

/**
 * Straight edge variant
 */
export function CustomStraightEdge(props: EdgeProps) {
  const theme = useTheme();
  const colorMode = theme.palette.mode;

  const defaultStroke = colorMode === 'dark'
    ? theme.palette.primary.light
    : theme.palette.primary.main;

  const strokeColor = props.style?.stroke || defaultStroke;
  const strokeWidth = props.style?.strokeWidth || 0.5;

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
  });

  const glowColor = props.style?.stroke
    ? alpha(props.style.stroke as string, 0.4)
    : colorMode === 'dark'
      ? 'rgba(0, 237, 100, 0.4)'
      : 'rgba(0, 104, 74, 0.3)';

  return (
    <>
      <BaseEdge
        id={props.id}
        path={edgePath}
        markerEnd={props.markerEnd}
        style={{
          ...props.style,
          stroke: strokeColor,
          strokeWidth,
          filter: `drop-shadow(0 0 3px ${glowColor})`,
        }}
      />
      {props.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 11,
              fontWeight: 500,
              pointerEvents: 'all',
              padding: '2px 6px',
              borderRadius: 4,
              backgroundColor: colorMode === 'dark'
                ? alpha('#000', 0.7)
                : alpha('#fff', 0.9),
              color: colorMode === 'dark' ? '#fff' : '#000',
              border: `1px solid ${colorMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            }}
            className="nodrag nopan"
          >
            {props.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

/**
 * Step edge variant (right angles)
 */
export function CustomStepEdge(props: EdgeProps) {
  const theme = useTheme();
  const colorMode = theme.palette.mode;

  const defaultStroke = colorMode === 'dark'
    ? theme.palette.primary.light
    : theme.palette.primary.main;

  const strokeColor = props.style?.stroke || defaultStroke;
  const strokeWidth = props.style?.strokeWidth || 0.5;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    borderRadius: 0, // Sharp corners for step
  });

  const glowColor = props.style?.stroke
    ? alpha(props.style.stroke as string, 0.4)
    : colorMode === 'dark'
      ? 'rgba(0, 237, 100, 0.4)'
      : 'rgba(0, 104, 74, 0.3)';

  return (
    <>
      <BaseEdge
        id={props.id}
        path={edgePath}
        markerEnd={props.markerEnd}
        style={{
          ...props.style,
          stroke: strokeColor,
          strokeWidth,
          filter: `drop-shadow(0 0 3px ${glowColor})`,
        }}
      />
      {props.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 11,
              fontWeight: 500,
              pointerEvents: 'all',
              padding: '2px 6px',
              borderRadius: 4,
              backgroundColor: colorMode === 'dark'
                ? alpha('#000', 0.7)
                : alpha('#fff', 0.9),
              color: colorMode === 'dark' ? '#fff' : '#000',
              border: `1px solid ${colorMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            }}
            className="nodrag nopan"
          >
            {props.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

/**
 * Smooth step edge variant (rounded corners)
 */
export function CustomSmoothStepEdge(props: EdgeProps) {
  const theme = useTheme();
  const colorMode = theme.palette.mode;

  const defaultStroke = colorMode === 'dark'
    ? theme.palette.primary.light
    : theme.palette.primary.main;

  const strokeColor = props.style?.stroke || defaultStroke;
  const strokeWidth = props.style?.strokeWidth || 0.5;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    borderRadius: 10, // Rounded corners
  });

  const glowColor = props.style?.stroke
    ? alpha(props.style.stroke as string, 0.4)
    : colorMode === 'dark'
      ? 'rgba(0, 237, 100, 0.4)'
      : 'rgba(0, 104, 74, 0.3)';

  return (
    <>
      <BaseEdge
        id={props.id}
        path={edgePath}
        markerEnd={props.markerEnd}
        style={{
          ...props.style,
          stroke: strokeColor,
          strokeWidth,
          filter: `drop-shadow(0 0 3px ${glowColor})`,
        }}
      />
      {props.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 11,
              fontWeight: 500,
              pointerEvents: 'all',
              padding: '2px 6px',
              borderRadius: 4,
              backgroundColor: colorMode === 'dark'
                ? alpha('#000', 0.7)
                : alpha('#fff', 0.9),
              color: colorMode === 'dark' ? '#fff' : '#000',
              border: `1px solid ${colorMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            }}
            className="nodrag nopan"
          >
            {props.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default CustomEdge;
