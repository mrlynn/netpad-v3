/**
 * Contract Editor Component
 * 
 * Visual editor for creating and editing application contracts
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Chip,
  IconButton,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Close,
  Add,
  Delete,
  ExpandMore,
  Save,
  Gavel,
} from '@mui/icons-material';
import { NetPadSpinner } from '@/components/common/NetPadLoader';
import { ApplicationContract } from '@/types/application';
import { CreateContractInput } from '@/lib/platform/applicationContracts';

interface ContractEditorProps {
  open: boolean;
  onClose: () => void;
  applicationId: string;
  orgId: string;
  contract?: ApplicationContract; // If provided, edit mode
  suggestedVersion?: string; // Suggested version for new contracts
  onSave: (contract: CreateContractInput) => Promise<void>;
}

const INPUT_TYPES = ['string', 'number', 'boolean', 'object', 'array'];
const SIDE_EFFECT_TYPES = ['write', 'api_call', 'notification', 'workflow_trigger'];
const OUTPUT_TYPES = ['string', 'number', 'boolean', 'object', 'array'];

export function ContractEditor({
  open,
  onClose,
  applicationId,
  orgId,
  contract,
  suggestedVersion,
  onSave,
}: ContractEditorProps) {
  const isEditMode = !!contract;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [version, setVersion] = useState(contract?.version || suggestedVersion || '1.0.0');
  const [status, setStatus] = useState<'draft' | 'active' | 'deprecated'>(contract?.status || 'draft');
  const [inputs, setInputs] = useState<ApplicationContract['inputs']>(contract?.inputs || {});
  const [outputs, setOutputs] = useState<ApplicationContract['outputs']>(contract?.outputs || {});
  const [sideEffects, setSideEffects] = useState<ApplicationContract['sideEffects']>(contract?.sideEffects || []);
  const [events, setEvents] = useState<ApplicationContract['events']>(contract?.events || []);
  const [behaviors, setBehaviors] = useState<ApplicationContract['behaviors']>(contract?.behaviors || []);
  const [stability, setStability] = useState<ApplicationContract['stability']>(
    contract?.stability || {
      inputs: false,
      outputs: false,
      sideEffects: false,
      events: false,
    }
  );

  // Reset form when contract changes
  useEffect(() => {
    if (contract) {
      setVersion(contract.version);
      setStatus(contract.status);
      setInputs(contract.inputs);
      setOutputs(contract.outputs);
      setSideEffects(contract.sideEffects);
      setEvents(contract.events);
      setBehaviors(contract.behaviors);
      setStability(contract.stability);
    } else {
      setVersion(suggestedVersion || '1.0.0');
      setStatus('draft');
      setInputs({});
      setOutputs({});
      setSideEffects([]);
      setEvents([]);
      setBehaviors([]);
      setStability({
        inputs: false,
        outputs: false,
        sideEffects: false,
        events: false,
      });
    }
    setError(null);
  }, [contract, suggestedVersion, open]);

  const handleSave = async () => {
    setError(null);
    setSaving(true);

    try {
      // Validate version format
      if (!/^\d+\.\d+\.\d+$/.test(version)) {
        throw new Error('Version must be in semantic version format (X.Y.Z)');
      }

      // Validate that active contracts can't be edited
      if (isEditMode && contract?.status === 'active') {
        throw new Error('Active contracts cannot be modified. Create a new version instead.');
      }

      const contractData: CreateContractInput = {
        applicationId,
        version,
        status,
        inputs,
        outputs,
        sideEffects,
        events,
        behaviors,
        stability,
      };

      await onSave(contractData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save contract');
    } finally {
      setSaving(false);
    }
  };

  // Input management
  const [newInputKey, setNewInputKey] = useState('');
  const [newInputType, setNewInputType] = useState('string');
  const [newInputRequired, setNewInputRequired] = useState(false);
  const [newInputSource, setNewInputSource] = useState<'form' | 'api' | 'webhook' | 'config'>('form');
  const [newInputDescription, setNewInputDescription] = useState('');

  const handleAddInput = () => {
    if (!newInputKey.trim()) {
      setError('Input key is required');
      return;
    }
    if (inputs[newInputKey]) {
      setError(`Input '${newInputKey}' already exists`);
      return;
    }

    setInputs({
      ...inputs,
      [newInputKey]: {
        type: newInputType,
        required: newInputRequired,
        source: newInputSource,
        description: newInputDescription || undefined,
      },
    });

    setNewInputKey('');
    setNewInputType('string');
    setNewInputRequired(false);
    setNewInputSource('form');
    setNewInputDescription('');
    setError(null);
  };

  const handleRemoveInput = (key: string) => {
    const newInputs = { ...inputs };
    delete newInputs[key];
    setInputs(newInputs);
  };

  // Output management
  const [newOutputKey, setNewOutputKey] = useState('');
  const [newOutputType, setNewOutputType] = useState('string');
  const [newOutputGuaranteed, setNewOutputGuaranteed] = useState(false);
  const [newOutputDescription, setNewOutputDescription] = useState('');

  const handleAddOutput = () => {
    if (!newOutputKey.trim()) {
      setError('Output key is required');
      return;
    }
    if (outputs[newOutputKey]) {
      setError(`Output '${newOutputKey}' already exists`);
      return;
    }

    setOutputs({
      ...outputs,
      [newOutputKey]: {
        type: newOutputType,
        guaranteed: newOutputGuaranteed,
        description: newOutputDescription || undefined,
      },
    });

    setNewOutputKey('');
    setNewOutputType('string');
    setNewOutputGuaranteed(false);
    setNewOutputDescription('');
    setError(null);
  };

  const handleRemoveOutput = (key: string) => {
    const newOutputs = { ...outputs };
    delete newOutputs[key];
    setOutputs(newOutputs);
  };

  // Side effect management
  const [newSideEffectType, setNewSideEffectType] = useState<'write' | 'api_call' | 'notification' | 'workflow_trigger'>('write');
  const [newSideEffectTarget, setNewSideEffectTarget] = useState('');
  const [newSideEffectDescription, setNewSideEffectDescription] = useState('');

  const handleAddSideEffect = () => {
    if (!newSideEffectTarget.trim()) {
      setError('Side effect target is required');
      return;
    }

    setSideEffects([
      ...sideEffects,
      {
        type: newSideEffectType,
        target: newSideEffectTarget,
        description: newSideEffectDescription || undefined,
      },
    ]);

    setNewSideEffectTarget('');
    setNewSideEffectType('write');
    setNewSideEffectDescription('');
    setError(null);
  };

  const handleRemoveSideEffect = (index: number) => {
    setSideEffects(sideEffects.filter((_, i) => i !== index));
  };

  // Event management
  const [newEventName, setNewEventName] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');

  const handleAddEvent = () => {
    if (!newEventName.trim()) {
      setError('Event name is required');
      return;
    }
    if (events.some((e) => e.name === newEventName)) {
      setError(`Event '${newEventName}' already exists`);
      return;
    }

    setEvents([
      ...events,
      {
        name: newEventName,
        description: newEventDescription || undefined,
      },
    ]);

    setNewEventName('');
    setNewEventDescription('');
    setError(null);
  };

  const handleRemoveEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  // Behavior management
  const [newBehaviorWorkflowId, setNewBehaviorWorkflowId] = useState('');
  const [newBehaviorTrigger, setNewBehaviorTrigger] = useState('');
  const [newBehaviorDescription, setNewBehaviorDescription] = useState('');

  const handleAddBehavior = () => {
    if (!newBehaviorWorkflowId.trim()) {
      setError('Workflow ID is required');
      return;
    }
    if (!newBehaviorTrigger.trim()) {
      setError('Trigger is required');
      return;
    }
    if (behaviors.some((b) => b.workflowId === newBehaviorWorkflowId)) {
      setError(`Behavior for workflow '${newBehaviorWorkflowId}' already exists`);
      return;
    }

    setBehaviors([
      ...behaviors,
      {
        workflowId: newBehaviorWorkflowId,
        trigger: newBehaviorTrigger,
        description: newBehaviorDescription || undefined,
      },
    ]);

    setNewBehaviorWorkflowId('');
    setNewBehaviorTrigger('');
    setNewBehaviorDescription('');
    setError(null);
  };

  const handleRemoveBehavior = (index: number) => {
    setBehaviors(behaviors.filter((_, i) => i !== index));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh', maxHeight: 900 },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Gavel sx={{ color: '#00ED64' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {isEditMode ? 'Edit Contract' : 'Create Contract'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ overflow: 'auto', pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Basic Information */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Basic Information
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
              required
              disabled={isEditMode && contract?.status === 'active'}
              helperText="Semantic version (X.Y.Z)"
              sx={{ flex: 1, minWidth: 200 }}
            />
            <FormControl sx={{ flex: 1, minWidth: 200 }} disabled={isEditMode && contract?.status === 'active'}>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                label="Status"
              >
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="deprecated">Deprecated</MenuItem>
              </Select>
            </FormControl>
          </Box>
          {isEditMode && contract?.status === 'active' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Active contracts cannot be modified. Create a new version to make changes.
            </Alert>
          )}
        </Paper>

        {/* Inputs */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Inputs ({Object.keys(inputs).length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Key"
                  value={newInputKey}
                  onChange={(e) => setNewInputKey(e.target.value)}
                  placeholder="email"
                  size="small"
                  sx={{ flex: 1, minWidth: 150 }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Type</InputLabel>
                  <Select value={newInputType} onChange={(e) => setNewInputType(e.target.value)} label="Type">
                    {INPUT_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Source</InputLabel>
                  <Select
                    value={newInputSource}
                    onChange={(e) => setNewInputSource(e.target.value as any)}
                    label="Source"
                  >
                    <MenuItem value="form">Form</MenuItem>
                    <MenuItem value="api">API</MenuItem>
                    <MenuItem value="webhook">Webhook</MenuItem>
                    <MenuItem value="config">Config</MenuItem>
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={newInputRequired}
                      onChange={(e) => setNewInputRequired(e.target.checked)}
                    />
                  }
                  label="Required"
                />
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={handleAddInput}
                  size="small"
                  sx={{ textTransform: 'none' }}
                >
                  Add
                </Button>
              </Box>
              <TextField
                label="Description (optional)"
                value={newInputDescription}
                onChange={(e) => setNewInputDescription(e.target.value)}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
              />
            </Box>
            <List>
              {Object.entries(inputs).map(([key, input]) => (
                <Paper key={key} sx={{ mb: 1, p: 1 }}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {key}
                          </Typography>
                          <Chip label={input.type} size="small" variant="outlined" />
                          {input.required && <Chip label="Required" size="small" color="error" />}
                          {input.source && <Chip label={input.source} size="small" />}
                        </Box>
                      }
                      secondary={input.description}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveInput(key)}
                        size="small"
                        disabled={isEditMode && contract?.status === 'active'}
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </Paper>
              ))}
              {Object.keys(inputs).length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No inputs defined. Add inputs that external consumers must provide.
                </Typography>
              )}
            </List>
          </AccordionDetails>
        </Accordion>

        {/* Outputs */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Outputs ({Object.keys(outputs).length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Key"
                  value={newOutputKey}
                  onChange={(e) => setNewOutputKey(e.target.value)}
                  placeholder="status"
                  size="small"
                  sx={{ flex: 1, minWidth: 150 }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Type</InputLabel>
                  <Select value={newOutputType} onChange={(e) => setNewOutputType(e.target.value)} label="Type">
                    {OUTPUT_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={newOutputGuaranteed}
                      onChange={(e) => setNewOutputGuaranteed(e.target.checked)}
                    />
                  }
                  label="Guaranteed"
                />
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={handleAddOutput}
                  size="small"
                  sx={{ textTransform: 'none' }}
                >
                  Add
                </Button>
              </Box>
              <TextField
                label="Description (optional)"
                value={newOutputDescription}
                onChange={(e) => setNewOutputDescription(e.target.value)}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
              />
            </Box>
            <List>
              {Object.entries(outputs).map(([key, output]) => (
                <Paper key={key} sx={{ mb: 1, p: 1 }}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {key}
                          </Typography>
                          <Chip label={output.type} size="small" variant="outlined" />
                          {output.guaranteed && <Chip label="Guaranteed" size="small" color="success" />}
                        </Box>
                      }
                      secondary={output.description}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveOutput(key)}
                        size="small"
                        disabled={isEditMode && contract?.status === 'active'}
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </Paper>
              ))}
              {Object.keys(outputs).length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No outputs defined. Add outputs that consumers can rely on.
                </Typography>
              )}
            </List>
          </AccordionDetails>
        </Accordion>

        {/* Side Effects */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Side Effects ({sideEffects.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={newSideEffectType}
                    onChange={(e) => setNewSideEffectType(e.target.value as any)}
                    label="Type"
                  >
                    {SIDE_EFFECT_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Target"
                  value={newSideEffectTarget}
                  onChange={(e) => setNewSideEffectTarget(e.target.value)}
                  placeholder="users collection"
                  size="small"
                  sx={{ flex: 1, minWidth: 200 }}
                />
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={handleAddSideEffect}
                  size="small"
                  sx={{ textTransform: 'none' }}
                >
                  Add
                </Button>
              </Box>
              <TextField
                label="Description (optional)"
                value={newSideEffectDescription}
                onChange={(e) => setNewSideEffectDescription(e.target.value)}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
              />
            </Box>
            <List>
              {sideEffects.map((effect, index) => (
                <Paper key={index} sx={{ mb: 1, p: 1 }}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Chip label={effect.type} size="small" color="info" />
                          <Typography variant="subtitle2">{effect.target}</Typography>
                        </Box>
                      }
                      secondary={effect.description}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveSideEffect(index)}
                        size="small"
                        disabled={isEditMode && contract?.status === 'active'}
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </Paper>
              ))}
              {sideEffects.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No side effects defined. Document what the application does (writes, API calls, etc.).
                </Typography>
              )}
            </List>
          </AccordionDetails>
        </Accordion>

        {/* Events */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Events ({events.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Event Name"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  placeholder="user.created"
                  size="small"
                  sx={{ flex: 1, minWidth: 200 }}
                />
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={handleAddEvent}
                  size="small"
                  sx={{ textTransform: 'none' }}
                >
                  Add
                </Button>
              </Box>
              <TextField
                label="Description (optional)"
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
              />
            </Box>
            <List>
              {events.map((event, index) => (
                <Paper key={index} sx={{ mb: 1, p: 1 }}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {event.name}
                        </Typography>
                      }
                      secondary={event.description}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveEvent(index)}
                        size="small"
                        disabled={isEditMode && contract?.status === 'active'}
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </Paper>
              ))}
              {events.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No events defined. Add events that external systems can subscribe to.
                </Typography>
              )}
            </List>
          </AccordionDetails>
        </Accordion>

        {/* Behaviors */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Behaviors ({behaviors.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Workflow ID"
                  value={newBehaviorWorkflowId}
                  onChange={(e) => setNewBehaviorWorkflowId(e.target.value)}
                  placeholder="workflow_123"
                  size="small"
                  sx={{ flex: 1, minWidth: 150 }}
                />
                <TextField
                  label="Trigger"
                  value={newBehaviorTrigger}
                  onChange={(e) => setNewBehaviorTrigger(e.target.value)}
                  placeholder="form.submit"
                  size="small"
                  sx={{ flex: 1, minWidth: 150 }}
                />
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={handleAddBehavior}
                  size="small"
                  sx={{ textTransform: 'none' }}
                >
                  Add
                </Button>
              </Box>
              <TextField
                label="Description (optional)"
                value={newBehaviorDescription}
                onChange={(e) => setNewBehaviorDescription(e.target.value)}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
              />
            </Box>
            <List>
              {behaviors.map((behavior, index) => (
                <Paper key={index} sx={{ mb: 1, p: 1 }}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {behavior.workflowId}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Trigger: {behavior.trigger}
                          </Typography>
                          {behavior.description && (
                            <Typography variant="body2" color="text.secondary">
                              {behavior.description}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveBehavior(index)}
                        size="small"
                        disabled={isEditMode && contract?.status === 'active'}
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </Paper>
              ))}
              {behaviors.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No behaviors defined. Document which workflows are part of the public contract.
                </Typography>
              )}
            </List>
          </AccordionDetails>
        </Accordion>

        {/* Stability Promises */}
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Stability Promises
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Mark which parts of the contract are stable and will not change without a major version bump.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={stability.inputs}
                  onChange={(e) => setStability({ ...stability, inputs: e.target.checked })}
                  disabled={isEditMode && contract?.status === 'active'}
                />
              }
              label="Inputs are stable"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={stability.outputs}
                  onChange={(e) => setStability({ ...stability, outputs: e.target.checked })}
                  disabled={isEditMode && contract?.status === 'active'}
                />
              }
              label="Outputs are stable"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={stability.sideEffects}
                  onChange={(e) => setStability({ ...stability, sideEffects: e.target.checked })}
                  disabled={isEditMode && contract?.status === 'active'}
                />
              }
              label="Side effects are stable"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={stability.events}
                  onChange={(e) => setStability({ ...stability, events: e.target.checked })}
                  disabled={isEditMode && contract?.status === 'active'}
                />
              }
              label="Events are stable"
            />
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || (isEditMode && contract?.status === 'active')}
          startIcon={saving ? <NetPadSpinner size={16} /> : <Save />}
          sx={{
            bgcolor: '#00ED64',
            '&:hover': { bgcolor: '#00CC55' },
            textTransform: 'none',
          }}
        >
          {saving ? 'Saving...' : isEditMode ? 'Update Contract' : 'Create Contract'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
