'use client';

import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  alpha,
} from '@mui/material';
import { FieldTypeEditorProps, createUpdateValidation } from './shared/utils';

/**
 * DateTime Field Editor
 * Handles: date, time, datetime
 */
export function DateTimeFieldEditor({ config, onUpdate }: FieldTypeEditorProps) {
  const updateValidation = createUpdateValidation(config, onUpdate);
  const fieldType = config.type?.toLowerCase();

  const isDate = fieldType === 'date';
  const isTime = fieldType === 'time';
  const isDateTime = fieldType === 'datetime' || fieldType === 'date-time';

  if (!isDate && !isTime && !isDateTime) {
    return null;
  }

  if (isDate) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          Date Settings
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            type="date"
            label="Earliest Date"
            value={config.validation?.minDate ?? ''}
            onChange={(e) => updateValidation('minDate', e.target.value || undefined)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            type="date"
            label="Latest Date"
            value={config.validation?.maxDate ?? ''}
            onChange={(e) => updateValidation('maxDate', e.target.value || undefined)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
        </Box>

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.allowPastDates !== false}
              onChange={(e) => updateValidation('allowPastDates', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Allow Past Dates</Typography>}
        />

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.allowFutureDates !== false}
              onChange={(e) => updateValidation('allowFutureDates', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Allow Future Dates</Typography>}
        />
      </Box>
    );
  }

  if (isTime) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          Time Settings
        </Typography>

        <FormControl fullWidth size="small">
          <InputLabel>Time Format</InputLabel>
          <Select
            value={config.validation?.timeFormat || '12h'}
            label="Time Format"
            onChange={(e) => updateValidation('timeFormat', e.target.value)}
          >
            <MenuItem value="12h">12-hour (AM/PM)</MenuItem>
            <MenuItem value="24h">24-hour</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Minute Interval</InputLabel>
          <Select
            value={config.validation?.minuteStep || 1}
            label="Minute Interval"
            onChange={(e) => updateValidation('minuteStep', Number(e.target.value))}
          >
            <MenuItem value={1}>1 minute</MenuItem>
            <MenuItem value={5}>5 minutes</MenuItem>
            <MenuItem value={10}>10 minutes</MenuItem>
            <MenuItem value={15}>15 minutes</MenuItem>
            <MenuItem value={30}>30 minutes</MenuItem>
            <MenuItem value={60}>1 hour</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            type="time"
            label="Earliest Time"
            value={config.validation?.minTime || ''}
            onChange={(e) => updateValidation('minTime', e.target.value || undefined)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            type="time"
            label="Latest Time"
            value={config.validation?.maxTime || ''}
            onChange={(e) => updateValidation('maxTime', e.target.value || undefined)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
        </Box>

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.showSeconds || false}
              onChange={(e) => updateValidation('showSeconds', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Include Seconds</Typography>}
        />
      </Box>
    );
  }

  // DateTime
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
        Date & Time Settings
      </Typography>

      <FormControl fullWidth size="small">
        <InputLabel>Time Format</InputLabel>
        <Select
          value={config.validation?.timeFormat || '12h'}
          label="Time Format"
          onChange={(e) => updateValidation('timeFormat', e.target.value)}
        >
          <MenuItem value="12h">12-hour (AM/PM)</MenuItem>
          <MenuItem value="24h">24-hour</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel>Timezone Handling</InputLabel>
        <Select
          value={config.validation?.dateTimeTimezone || 'local'}
          label="Timezone Handling"
          onChange={(e) => updateValidation('dateTimeTimezone', e.target.value)}
        >
          <MenuItem value="local">User's Local Time</MenuItem>
          <MenuItem value="utc">UTC</MenuItem>
          <MenuItem value="custom">Custom Timezone</MenuItem>
        </Select>
      </FormControl>

      {config.validation?.dateTimeTimezone === 'custom' && (
        <TextField
          size="small"
          label="Custom Timezone"
          placeholder="America/New_York"
          value={config.validation?.customTimezone || ''}
          onChange={(e) => updateValidation('customTimezone', e.target.value)}
          fullWidth
        />
      )}

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={config.validation?.showTimezoneSelector || false}
            onChange={(e) => updateValidation('showTimezoneSelector', e.target.checked)}
          />
        }
        label={<Typography variant="body2">Show Timezone Selector</Typography>}
      />

      <FormControl fullWidth size="small">
        <InputLabel>Minute Interval</InputLabel>
        <Select
          value={config.validation?.minuteStep || 1}
          label="Minute Interval"
          onChange={(e) => updateValidation('minuteStep', Number(e.target.value))}
        >
          <MenuItem value={1}>1 minute</MenuItem>
          <MenuItem value={5}>5 minutes</MenuItem>
          <MenuItem value={15}>15 minutes</MenuItem>
          <MenuItem value={30}>30 minutes</MenuItem>
        </Select>
      </FormControl>

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={config.validation?.allowPastDates !== false}
            onChange={(e) => updateValidation('allowPastDates', e.target.checked)}
          />
        }
        label={<Typography variant="body2">Allow Past Dates</Typography>}
      />

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={config.validation?.allowFutureDates !== false}
            onChange={(e) => updateValidation('allowFutureDates', e.target.checked)}
          />
        }
        label={<Typography variant="body2">Allow Future Dates</Typography>}
      />
    </Box>
  );
}
