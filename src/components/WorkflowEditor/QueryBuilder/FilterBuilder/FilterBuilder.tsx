/**
 * Visual filter builder component for MongoDB queries
 * Allows building conditions with AND/OR logic
 */

'use client';

import React, { useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import {
  MongoFilterGroup,
  MongoFilterCondition,
  MongoLogicalOperator,
  createEmptyCondition,
  isFilterCondition,
} from '../shared/types';
import { FilterCondition } from './FilterCondition';

interface FilterBuilderProps {
  group: MongoFilterGroup;
  onChange: (group: MongoFilterGroup) => void;
  nodeId: string;
  disabled?: boolean;
}

export function FilterBuilder({
  group,
  onChange,
  nodeId,
  disabled = false,
}: FilterBuilderProps) {
  // Toggle logic (AND/OR)
  const handleLogicChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newLogic: MongoLogicalOperator | null) => {
      if (newLogic) {
        onChange({ ...group, logic: newLogic });
      }
    },
    [group, onChange]
  );

  // Add new condition
  const handleAddCondition = useCallback(() => {
    const newCondition = createEmptyCondition();
    onChange({
      ...group,
      conditions: [...group.conditions, newCondition],
    });
  }, [group, onChange]);

  // Update a condition
  const handleConditionChange = useCallback(
    (id: string, updates: Partial<MongoFilterCondition>) => {
      onChange({
        ...group,
        conditions: group.conditions.map((c) =>
          isFilterCondition(c) && c.id === id ? { ...c, ...updates } : c
        ),
      });
    },
    [group, onChange]
  );

  // Delete a condition
  const handleConditionDelete = useCallback(
    (id: string) => {
      onChange({
        ...group,
        conditions: group.conditions.filter(
          (c) => !(isFilterCondition(c) && c.id === id)
        ),
      });
    },
    [group, onChange]
  );

  // Get only filter conditions (not nested groups for now)
  const filterConditions = group.conditions.filter(isFilterCondition);

  return (
    <Box>
      {/* Logic toggle - only show when more than 1 condition */}
      {filterConditions.length > 1 && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Match
          </Typography>
          <ToggleButtonGroup
            value={group.logic}
            exclusive
            onChange={handleLogicChange}
            size="small"
            disabled={disabled}
          >
            <ToggleButton value="$and" sx={{ px: 2 }}>
              ALL
            </ToggleButton>
            <ToggleButton value="$or" sx={{ px: 2 }}>
              ANY
            </ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="body2" color="text.secondary">
            of the following:
          </Typography>
        </Box>
      )}

      {/* Condition list */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {filterConditions.map((condition, index) => (
          <FilterCondition
            key={condition.id}
            condition={condition}
            index={index}
            onChange={(updates) => handleConditionChange(condition.id, updates)}
            onDelete={() => handleConditionDelete(condition.id)}
            nodeId={nodeId}
            disabled={disabled}
          />
        ))}
      </Box>

      {/* Empty state */}
      {filterConditions.length === 0 && (
        <Box
          sx={{
            py: 3,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            mb: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No filter conditions yet
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Add conditions to filter your MongoDB query results
          </Typography>
        </Box>
      )}

      {/* Add condition button */}
      <Button
        startIcon={<AddIcon />}
        onClick={handleAddCondition}
        sx={{ mt: 2 }}
        variant="outlined"
        size="small"
        disabled={disabled}
      >
        Add Condition
      </Button>
    </Box>
  );
}

export default FilterBuilder;
