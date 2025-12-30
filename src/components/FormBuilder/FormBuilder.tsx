'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  alpha,
  Snackbar,
  IconButton,
  Tooltip,
  Drawer,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import { Save, Add, Folder, Close, CheckCircle, ContentCopy, OpenInNew, NoteAdd, Public, Settings, MoreVert, PostAdd, Keyboard, TuneOutlined } from '@mui/icons-material';
import { usePipeline } from '@/contexts/PipelineContext';
import { FormSaveDialog, SavedFormInfo } from './FormSaveDialog';
import { FormLibrary } from './FormLibrary';
import { FormSettingsDrawer } from './FormSettingsDrawer';
import { EmptyFormState } from './EmptyFormState';
import { AIGenerationConnectionContext } from './AIFormGeneratorDialog';
import { NewFormDialog } from './NewFormDialog';
import { QuickPublishButton } from './QuickPublishButton';
import { AddQuestionDialog } from './AddQuestionDialog';
import { DataSourceSetupModal } from './DataSourceSetupModal';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { WYSIWYGFormEditor } from './WYSIWYGFormEditor';
import { FieldConfigDrawer } from './FieldConfigDrawer';
import { FloatingActionToolbar } from './FloatingActionToolbar';
import { ConnectionStatusChip } from './ConnectionStatusChip';
import { FieldConfig, FormVariable, MultiPageConfig, FormLifecycle, FormTheme, FormType, SearchConfig, FormDataSource, FormAccessControl, BotProtectionConfig, DraftSettings } from '@/types/form';
import { FormHooksConfig } from '@/types/formHooks';
import { generateFieldPath } from '@/utils/fieldPath';
import { useChat } from '@/contexts/ChatContext';

interface FormBuilderProps {
  initialFormId?: string;
}

export function FormBuilder({ initialFormId }: FormBuilderProps) {
  const { connectionString, databaseName, collection, sampleDocs, dispatch } = usePipeline();
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [variables, setVariables] = useState<FormVariable[]>([]);
  const [multiPageConfig, setMultiPageConfig] = useState<MultiPageConfig | undefined>(undefined);
  const [lifecycleConfig, setLifecycleConfig] = useState<FormLifecycle | undefined>(undefined);
  const [themeConfig, setThemeConfig] = useState<FormTheme | undefined>(undefined);

  // Debug: Log whenever themeConfig changes
  useEffect(() => {
    console.log('[FormBuilder] themeConfig state changed:', {
      themeConfig,
      pageBackgroundColor: themeConfig?.pageBackgroundColor,
      pageBackgroundGradient: themeConfig?.pageBackgroundGradient,
    });
  }, [themeConfig]);

  const [currentFormId, setCurrentFormId] = useState<string | undefined>(undefined);
  const [currentFormName, setCurrentFormName] = useState<string>('');
  const [currentFormDescription, setCurrentFormDescription] = useState<string>('');
  const [currentFormSlug, setCurrentFormSlug] = useState<string | undefined>(undefined);
  const [currentFormIsPublished, setCurrentFormIsPublished] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    savedForm: SavedFormInfo | null;
  }>({ open: false, savedForm: null });
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [selectedFieldPath, setSelectedFieldPath] = useState<string | null>(null);
  const [formType, setFormType] = useState<FormType>('data-entry');
  const [searchConfig, setSearchConfig] = useState<SearchConfig | undefined>(undefined);
  const [dataSource, setDataSource] = useState<FormDataSource | undefined>(undefined);
  const [accessControl, setAccessControl] = useState<FormAccessControl | undefined>(undefined);
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);
  const [addQuestionDialogOpen, setAddQuestionDialogOpen] = useState(false);
  const [dataSourceModalOpen, setDataSourceModalOpen] = useState(false);
  const [botProtection, setBotProtection] = useState<BotProtectionConfig | undefined>(undefined);
  const [draftSettings, setDraftSettings] = useState<DraftSettings | undefined>(undefined);
  const [hooksConfig, setHooksConfig] = useState<FormHooksConfig | undefined>(undefined);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [newFormDialogOpen, setNewFormDialogOpen] = useState(false);
  const [pendingField, setPendingField] = useState<FieldConfig | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<{ name: string; fields: FieldConfig[] } | null>(null);

  // Get selected field config
  const selectedFieldConfig = selectedFieldPath
    ? fieldConfigs.find(f => f.path === selectedFieldPath) ?? null
    : null;

  // Chat assistant integration
  const { setFormContext, registerActionHandlers } = useChat();

  // Sync form context to chat assistant
  useEffect(() => {
    setFormContext({
      formId: currentFormId,
      formName: currentFormName,
      formDescription: currentFormDescription,
      fields: fieldConfigs,
      selectedFieldPath,
      formType,
      currentView: 'form-builder',
    });
  }, [
    currentFormId,
    currentFormName,
    currentFormDescription,
    fieldConfigs,
    selectedFieldPath,
    formType,
    setFormContext,
  ]);

  // Register action handlers for chat assistant
  useEffect(() => {
    registerActionHandlers({
      onAddField: (field, position) => {
        const path = field.path || generateFieldPath(field.label || 'New Field');
        const newField: FieldConfig = {
          path,
          label: field.label || 'New Field',
          type: field.type || 'text',
          included: true,
          required: field.required || false,
          placeholder: field.placeholder,
          source: 'custom',
          // Copy full validation config if provided (patterns, min/max, etc.)
          ...(field.validation ? {
            validation: field.validation
          } : {}),
          // Copy encryption config if provided (for sensitive fields like SSN)
          ...(field.encryption ? {
            encryption: field.encryption
          } : {}),
        };
        setFieldConfigs((configs) => {
          if (position !== undefined && position >= 0) {
            const newConfigs = [...configs];
            newConfigs.splice(position, 0, newField);
            return newConfigs;
          }
          return [...configs, newField];
        });
        setSelectedFieldPath(path);
      },
      onUpdateField: (path, updates) => {
        setFieldConfigs((configs) =>
          configs.map((c) => (c.path === path ? { ...c, ...updates } : c))
        );
      },
      onDeleteField: (path) => {
        setFieldConfigs((configs) => configs.filter((c) => c.path !== path));
        if (selectedFieldPath === path) {
          setSelectedFieldPath(null);
        }
      },
      onNavigate: (to) => {
        if (to === 'settings') {
          setSettingsDrawerOpen(true);
        } else if (to === 'library') {
          setShowLibrary(true);
        }
      },
    });
  }, [registerActionHandlers, selectedFieldPath]);

  // Keyboard shortcuts for power users
  const handleKeyboardShortcuts = useCallback((e: KeyboardEvent) => {
    // Don't trigger if user is typing in an input
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdKey = isMac ? e.metaKey : e.ctrlKey;

    // Cmd/Ctrl + S: Save form
    if (cmdKey && e.key === 's') {
      e.preventDefault();
      if (fieldConfigs.length > 0) {
        setSaveDialogOpen(true);
      }
    }
    // Cmd/Ctrl + N: Add new field
    else if (cmdKey && e.key === 'n') {
      e.preventDefault();
      setAddQuestionDialogOpen(true);
    }
    // Cmd/Ctrl + ,: Open settings
    else if (cmdKey && e.key === ',') {
      e.preventDefault();
      setSettingsDrawerOpen(true);
    }
    // Escape: Close panels/dialogs
    else if (e.key === 'Escape') {
      if (selectedFieldPath) {
        setSelectedFieldPath(null);
      } else if (settingsDrawerOpen) {
        setSettingsDrawerOpen(false);
      } else if (showLibrary) {
        setShowLibrary(false);
      }
    }
    // Cmd/Ctrl + L: Toggle library
    else if (cmdKey && e.key === 'l') {
      e.preventDefault();
      setShowLibrary(prev => !prev);
    }
    // ?: Show keyboard shortcuts help
    else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      setShortcutsHelpOpen(true);
    }
  }, [fieldConfigs.length, selectedFieldPath, settingsDrawerOpen, showLibrary]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [handleKeyboardShortcuts]);

  // Load form from initialFormId when provided (e.g., from URL params)
  useEffect(() => {
    if (initialFormId) {
      loadFormById(initialFormId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFormId]);

  const loadFormById = async (formId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/forms/${formId}`);
      const data = await response.json();

      if (data.success && data.form) {
        const config = data.form;
        setFieldConfigs(config.fieldConfigs || []);
        setVariables(config.variables || []);
        setMultiPageConfig(config.multiPage);
        setLifecycleConfig(config.lifecycle);
        setThemeConfig(config.theme);
        setCurrentFormId(config.id);
        setCurrentFormName(config.name || '');
        setCurrentFormDescription(config.description || '');
        setCurrentFormSlug(config.slug);
        setCurrentFormIsPublished(config.isPublished || false);
        setFormType(config.formType || 'data-entry');
        setSearchConfig(config.searchConfig);
        setDataSource(config.dataSource);
        setAccessControl(config.accessControl);
        setOrganizationId(config.organizationId);
        setFormData({});
      } else {
        setError(data.error || 'Failed to load form');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load form');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate field configs from sample documents
  useEffect(() => {
    if (sampleDocs.length > 0) {
      generateFieldConfigsFromDocs(sampleDocs);
    } else if (connectionString && databaseName && collection) {
      // Fetch sample documents if not available
      fetchSampleDocs();
    } else {
      setFieldConfigs([]);
      setFormData({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionString, databaseName, collection, sampleDocs]);

  const fetchSampleDocs = async () => {
    if (!connectionString || !databaseName || !collection) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mongodb/sample-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          databaseName,
          collection,
          limit: 5
        })
      });

      const data = await response.json();
      
      if (data.success && data.documents && data.documents.length > 0) {
        // Store sample docs in context
        dispatch({ type: 'SET_SAMPLE_DOCS', payload: { docs: data.documents } });
        // Generate field configs from the fetched documents
        generateFieldConfigsFromDocs(data.documents);
      } else {
        const errorMsg = data.error || 'No documents found in collection';
        setError(errorMsg);
        setFieldConfigs([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load sample documents');
      setFieldConfigs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFieldConfigsFromDocs = (docs: any[]) => {
    if (docs.length === 0) {
      setFieldConfigs([]);
      return;
    }

    const configs: FieldConfig[] = [];
    const processedPaths = new Set<string>();

    const processObject = (obj: any, prefix: string = '') => {
      if (!obj || typeof obj !== 'object') return;
      
      Object.keys(obj).forEach((key) => {
        if (key === '_id') return; // Skip _id by default

        const path = prefix ? `${prefix}.${key}` : key;
        if (processedPaths.has(path)) return;
        processedPaths.add(path);

        const value = obj[key];
        const type = inferFieldType(value);

        configs.push({
          path,
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          type,
          included: true,
          required: false,
          defaultValue: getDefaultValue(value, type)
        });

        // Recursively process nested objects (limit depth)
        if (type === 'object' && value !== null && typeof value === 'object' && !Array.isArray(value)) {
          const depth = path.split('.').length;
          if (depth < 3) {
            processObject(value, path);
          }
        }
        
        // For array-object types, also process the first element's structure
        if (type === 'array-object' && Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          const depth = path.split('.').length;
          if (depth < 3) {
            processObject(value[0], `${path}[]`);
          }
        }
      });
    };

    // Process first sample document to infer schema
    processObject(docs[0]);
    setFieldConfigs(configs);
  };


  const inferFieldType = (value: any): string => {
    if (value === null || value === undefined) return 'string';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'array';
      return inferFieldType(value[0]) === 'object' ? 'array-object' : 'array';
    }
    if (typeof value === 'object' && value.constructor === Object) return 'object';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return Number.isInteger(value) ? 'number' : 'number';
    if (value instanceof Date) return 'date';
    if (typeof value === 'string') {
      // Try to infer more specific types
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
      if (/^https?:\/\//.test(value)) return 'url';
      return 'string';
    }
    return 'string';
  };

  const getDefaultValue = (value: any, type: string): any => {
    if (value === null || value === undefined) return '';
    if (type === 'array') return [];
    if (type === 'object') return {};
    if (type === 'boolean') return false;
    return value;
  };

  const updateFieldConfig = (path: string, updates: Partial<FieldConfig>) => {
    setFieldConfigs((configs) =>
      configs.map((config) => (config.path === path ? { ...config, ...updates } : config))
    );
  };

  const addCustomField = (field: FieldConfig, atIndex?: number) => {
    setFieldConfigs((configs) => {
      if (atIndex !== undefined && atIndex >= 0) {
        const newConfigs = [...configs];
        newConfigs.splice(atIndex, 0, field);
        return newConfigs;
      }
      return [field, ...configs];
    });
  };

  const handleAddFieldAtIndex = (index: number) => {
    setInsertAtIndex(index);
    setAddQuestionDialogOpen(true);
  };

  // Quick add field from floating toolbar
  const handleQuickAddField = (type: string, isLayout?: boolean) => {
    const labelMap: Record<string, string> = {
      'text': 'Short Answer',
      'textarea': 'Paragraph',
      'radio': 'Multiple Choice',
      'checkbox': 'Checkboxes',
      'select': 'Dropdown',
      'section-header': 'Section Header',
      'description': 'Description Text',
      'divider': 'Divider',
      'image': 'Image',
      'date': 'Date',
      'number': 'Number',
      'email': 'Email',
      'url': 'URL',
      'file': 'File Upload',
      'boolean': 'Toggle',
      'color': 'Color',
    };

    const label = labelMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
    const path = generateFieldPath(label);

    const newField: FieldConfig = {
      path,
      label,
      type,
      included: true,
      required: false,
      source: 'custom',
      ...(isLayout ? { layout: { type: type as any } } : {}),
      ...(type === 'radio' || type === 'checkbox' || type === 'select' ? {
        validation: {
          options: [
            { value: 'option_1', label: 'Option 1' },
            { value: 'option_2', label: 'Option 2' },
            { value: 'option_3', label: 'Option 3' },
          ]
        }
      } : {}),
    };

    addCustomField(newField);
    setSelectedFieldPath(path);
  };

  const removeCustomField = (path: string) => {
    setFieldConfigs((configs) => configs.filter((c) => c.path !== path));
    // Also remove from formData
    setFormData((prev) => {
      const newData = { ...prev };
      delete newData[path];
      return newData;
    });
  };

  const moveField = (path: string, direction: 'up' | 'down') => {
    setFieldConfigs((configs) => {
      const index = configs.findIndex((c) => c.path === path);
      if (index === -1) return configs;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= configs.length) return configs;

      const newConfigs = [...configs];
      [newConfigs[index], newConfigs[newIndex]] = [newConfigs[newIndex], newConfigs[index]];
      return newConfigs;
    });
  };

  const reorderFields = (newOrder: FieldConfig[]) => {
    setFieldConfigs(newOrder);
  };

  const handleFormDataChange = (path: string, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev };
      // Handle array paths (e.g., "items[].name")
      if (path.includes('[]')) {
        // This is a nested field within an array object
        const [arrayPath, ...fieldParts] = path.split('[]');
        const fieldPath = fieldParts.join('[]');
        setNestedArrayValue(newData, arrayPath, fieldPath, value);
      } else {
        setNestedValue(newData, path, value);
      }
      return newData;
    });
  };

  const setNestedValue = (obj: any, path: string, value: any) => {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((acc, key) => {
      if (!acc[key]) acc[key] = {};
      return acc[key];
    }, obj);
    target[lastKey] = value;
  };

  const setNestedArrayValue = (obj: any, arrayPath: string, fieldPath: string, value: any) => {
    // For now, we'll handle this in ArrayFieldInput directly
    // This is a placeholder for future nested array field support
    setNestedValue(obj, arrayPath, value);
  };

  const handleNewForm = () => {
    // Reset all form state to start fresh
    setCurrentFormId(undefined);
    setCurrentFormName('');
    setCurrentFormDescription('');
    setCurrentFormSlug(undefined);
    setCurrentFormIsPublished(false);
    setVariables([]);
    setMultiPageConfig(undefined);
    setLifecycleConfig(undefined);
    setThemeConfig(undefined);
    setDataSource(undefined);
    setAccessControl(undefined);
    // Keep organizationId as user preference
    setFormData({});
    // Re-generate field configs from sample docs
    if (sampleDocs.length > 0) {
      generateFieldConfigsFromDocs(sampleDocs);
    }
  };

  // Handle starting a new form with collection naming
  const handleStartNewForm = (field: FieldConfig, templateName?: string) => {
    // If no fields yet, prompt for form name first
    if (fieldConfigs.length === 0) {
      setPendingField(field);
      if (templateName) {
        setPendingTemplate({ name: templateName, fields: [field] });
      }
      setNewFormDialogOpen(true);
    } else {
      // Already have fields, just add the new one
      addCustomField(field);
      setSelectedFieldPath(field.path);
    }
  };

  // Handle adding a template with all fields at once
  const handleAddTemplate = (fields: FieldConfig[], templateName: string) => {
    if (fields.length === 0) return;

    // Store all fields for batch addition after form naming
    setPendingTemplate({ name: templateName, fields });
    setPendingField(fields[0]); // Keep first field for backwards compatibility
    setNewFormDialogOpen(true);
  };

  // Handle new form dialog confirmation
  const handleNewFormConfirm = (formName: string, collectionName: string) => {
    // Set the form name
    setCurrentFormName(formName);

    // Set the collection name in data source
    setDataSource({
      collection: collectionName,
    });

    // Add the pending field(s)
    if (pendingTemplate && pendingTemplate.fields.length > 0) {
      // Add all template fields
      pendingTemplate.fields.forEach((field, index) => {
        addCustomField(field);
        // Select the first field
        if (index === 0) {
          setSelectedFieldPath(field.path);
        }
      });
    } else if (pendingField) {
      // Single field (non-template case)
      addCustomField(pendingField);
      setSelectedFieldPath(pendingField.path);
    }

    // Clear pending state
    setPendingField(null);
    setPendingTemplate(null);
    setNewFormDialogOpen(false);
  };

  const handleInsert = async () => {
    if (!connectionString || !databaseName || !collection) {
      setError('Please connect to MongoDB and select a collection');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mongodb/insert-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          databaseName,
          collection,
          document: formData
        })
      });

      const data = await response.json();

      if (data.success) {
        // Clear form and show success
        setFormData({});
        alert('Document inserted successfully!');
        // Optionally refresh sample docs
      } else {
        setError(data.error || 'Failed to insert document');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to insert document');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle AI-generated form with connection context
  const handleAIGenerateWithConnection = useCallback((fields: FieldConfig[], connectionContext?: AIGenerationConnectionContext) => {
    // Add all the generated fields
    fields.forEach((field, index) => {
      setTimeout(() => {
        addCustomField(field);
        if (index === 0) {
          setSelectedFieldPath(field.path);
        }
      }, index * 50);
    });

    // If connection context is provided, set up the data source
    if (connectionContext) {
      // Set organization ID if from vault
      if (connectionContext.organizationId) {
        setOrganizationId(connectionContext.organizationId);
      }

      // Set up the data source with vault reference
      if (connectionContext.vaultId) {
        setDataSource({
          vaultId: connectionContext.vaultId,
          collection: connectionContext.collection,
        });
      }
    }
  }, []);

  // Check if we have a connection - if not, show empty state with option to add fields manually
  const hasConnection = Boolean(connectionString && databaseName && collection);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Simplified Toolbar - Calm UI */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        {/* Left: Form identity */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 200,
            }}
          >
            {currentFormName || 'New Form'}
          </Typography>

          {/* Status badges - minimal */}
          {currentFormIsPublished && (
            <Tooltip title="Published">
              <Public sx={{ fontSize: 16, color: 'success.main' }} />
            </Tooltip>
          )}
          {isLoading && <CircularProgress size={14} />}

          {/* Connection status */}
          <ConnectionStatusChip
            dataSource={dataSource}
            organizationId={organizationId}
            onClick={() => setDataSourceModalOpen(true)}
          />
        </Box>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Right: Actions - minimal Google Forms style */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>

          <Tooltip title={advancedMode ? "Disable Advanced Mode" : "Enable Advanced Mode"}>
            <IconButton
              onClick={() => setAdvancedMode(!advancedMode)}
              size="small"
              sx={{
                color: advancedMode ? 'primary.main' : 'text.secondary',
                bgcolor: advancedMode ? 'action.selected' : 'transparent',
                '&:hover': {
                  bgcolor: advancedMode ? 'action.selected' : 'action.hover',
                },
              }}
            >
              <TuneOutlined fontSize="small" />
            </IconButton>
          </Tooltip>

          <Button
            variant="outlined"
            size="small"
            onClick={() => setSaveDialogOpen(true)}
            disabled={fieldConfigs.length === 0}
            sx={{ minWidth: 'auto', px: 1.5 }}
          >
            Save
          </Button>

          <QuickPublishButton
            formConfig={{
              id: currentFormId,
              name: currentFormName,
              slug: currentFormSlug,
              isPublished: currentFormIsPublished,
              collection: collection || '',
              database: databaseName || '',
              fieldConfigs,
              variables,
              multiPage: multiPageConfig,
              lifecycle: lifecycleConfig,
              theme: themeConfig,
              formType,
              searchConfig,
              dataSource,
              accessControl,
              organizationId,
            }}
            disabled={fieldConfigs.length === 0}
            onPublished={(info) => {
              setCurrentFormId(info.id);
              setCurrentFormSlug(info.slug);
              setCurrentFormIsPublished(true);
            }}
            onConfigureStorage={() => setDataSourceModalOpen(true)}
          />

          {/* More menu - consolidates secondary actions */}
          <Tooltip title="More">
            <IconButton
              onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              <MoreVert fontSize="small" />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={moreMenuAnchor}
            open={Boolean(moreMenuAnchor)}
            onClose={() => setMoreMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: { sx: { minWidth: 200 } }
            }}
          >
            <MenuItem onClick={() => { setShowLibrary(true); setMoreMenuAnchor(null); }}>
              <ListItemIcon><Folder fontSize="small" /></ListItemIcon>
              <ListItemText>Forms</ListItemText>
            </MenuItem>
            {currentFormId && (
              <MenuItem onClick={() => { handleNewForm(); setMoreMenuAnchor(null); }}>
                <ListItemIcon><NoteAdd fontSize="small" /></ListItemIcon>
                <ListItemText>New Form</ListItemText>
              </MenuItem>
            )}
            {currentFormIsPublished && currentFormSlug && (
              <MenuItem
                component="a"
                href={`/forms/${currentFormSlug}`}
                target="_blank"
                onClick={() => setMoreMenuAnchor(null)}
              >
                <ListItemIcon><OpenInNew fontSize="small" /></ListItemIcon>
                <ListItemText>View Published Form</ListItemText>
              </MenuItem>
            )}
            <Divider sx={{ my: 0.5 }} />
            <MenuItem onClick={() => { setSettingsDrawerOpen(true); setMoreMenuAnchor(null); }}>
              <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
              <ListItemText>Form Settings</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { setDataSourceModalOpen(true); setMoreMenuAnchor(null); }}>
              <ListItemIcon><PostAdd fontSize="small" /></ListItemIcon>
              <ListItemText>Storage Settings</ListItemText>
            </MenuItem>
            {hasConnection && (
              <MenuItem
                onClick={() => { handleInsert(); setMoreMenuAnchor(null); }}
                disabled={isLoading || Object.keys(formData).length === 0}
              >
                <ListItemIcon><PostAdd fontSize="small" /></ListItemIcon>
                <ListItemText>Insert Test Document</ListItemText>
              </MenuItem>
            )}
            <Divider sx={{ my: 0.5 }} />
            <MenuItem onClick={() => { setShortcutsHelpOpen(true); setMoreMenuAnchor(null); }}>
              <ListItemIcon><Keyboard fontSize="small" /></ListItemIcon>
              <ListItemText>Keyboard Shortcuts</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {error && (
        <Box sx={{ p: 2 }}>
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Box>
      )}

      {isLoading && fieldConfigs.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default'
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Loading collection schema...
            </Typography>
          </Box>
        </Box>
      ) : fieldConfigs.length === 0 ? (
        // New simplified empty state - no fields yet
        <EmptyFormState
          onAddField={(field) => {
            handleStartNewForm(field);
          }}
          onAddTemplate={handleAddTemplate}
          onOpenLibrary={() => setShowLibrary(true)}
          hasConnection={hasConnection}
          onAIGenerateWithConnection={handleAIGenerateWithConnection}
        />
      ) : (
        // Main editing area - Google Forms style centered layout
        <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* Centered Form Editor */}
          <WYSIWYGFormEditor
            fieldConfigs={fieldConfigs.filter((f) => f.included)}
            formData={formData}
            selectedFieldPath={selectedFieldPath}
            onFormDataChange={handleFormDataChange}
            onResetForm={() => setFormData({})}
            onSelectField={setSelectedFieldPath}
            onUpdateField={updateFieldConfig}
            onDeleteField={removeCustomField}
            onReorderFields={reorderFields}
            onAddFieldAtIndex={handleAddFieldAtIndex}
            allFieldConfigs={fieldConfigs}
            header={themeConfig?.header}
            formTitle={currentFormName}
            formDescription={currentFormDescription}
            onFormTitleChange={setCurrentFormName}
            onFormDescriptionChange={setCurrentFormDescription}
          />

          {/* Floating Action Toolbar - Google Forms Style */}
          <FloatingActionToolbar
            onAddField={handleQuickAddField}
            onOpenAddDialog={() => setAddQuestionDialogOpen(true)}
          />

          {/* Field Configuration Drawer - overlays content */}
          <FieldConfigDrawer
            open={!!selectedFieldConfig}
            config={selectedFieldConfig}
            allFieldConfigs={fieldConfigs}
            formSlug={currentFormSlug}
            advancedMode={advancedMode}
            dataSource={dataSource}
            organizationId={organizationId}
            onClose={() => setSelectedFieldPath(null)}
            onUpdateField={updateFieldConfig}
            onDeleteField={removeCustomField}
            onDuplicateField={(config) => {
              const newField: FieldConfig = {
                ...config,
                path: generateFieldPath(config.label + ' Copy'),
                label: config.label + ' (Copy)',
                source: 'custom',
              };
              addCustomField(newField);
              setSelectedFieldPath(newField.path);
            }}
          />
        </Box>
      )}

      {/* Add Question Dialog */}
      <AddQuestionDialog
        open={addQuestionDialogOpen}
        onClose={() => {
          setAddQuestionDialogOpen(false);
          setInsertAtIndex(null);
        }}
        onAdd={(field) => {
          addCustomField(field, insertAtIndex ?? undefined);
          setSelectedFieldPath(field.path);
          setInsertAtIndex(null);
        }}
      />

      {/* New Form Dialog - prompts for form name/collection when starting fresh */}
      <NewFormDialog
        open={newFormDialogOpen}
        onClose={() => {
          setNewFormDialogOpen(false);
          setPendingField(null);
          setPendingTemplate(null);
        }}
        onConfirm={handleNewFormConfirm}
        suggestedName={pendingTemplate?.name || ''}
      />

      {/* Save Dialog */}
      <FormSaveDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={(info) => {
          setCurrentFormId(info.id);
          setCurrentFormName(info.name);
          setCurrentFormSlug(info.slug);
          setCurrentFormIsPublished(info.isPublished);
          setShowLibrary(true);
          setNotification({ open: true, savedForm: info });
        }}
        formConfig={{
          id: currentFormId,
          name: currentFormName,
          description: currentFormDescription,
          slug: currentFormSlug,
          isPublished: currentFormIsPublished,
          collection: collection || '',
          database: databaseName || '',
          fieldConfigs,
          variables,
          multiPage: multiPageConfig,
          lifecycle: lifecycleConfig,
          theme: themeConfig,
          hooks: hooksConfig,
          formType,
          searchConfig,
          dataSource,
          accessControl,
          organizationId,
        }}
      />

      {/* Save/Publish Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={notification.savedForm?.isPublished ? null : 6000}
        onClose={() => setNotification({ open: false, savedForm: null })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setNotification({ open: false, savedForm: null })}
          severity="success"
          icon={<CheckCircle />}
          sx={{
            width: '100%',
            maxWidth: 500,
            bgcolor: notification.savedForm?.isPublished ? alpha('#00ED64', 0.95) : alpha('#2196f3', 0.95),
            color: notification.savedForm?.isPublished ? '#001E2B' : '#fff',
            '& .MuiAlert-icon': {
              color: notification.savedForm?.isPublished ? '#001E2B' : '#fff',
            },
            '& .MuiAlert-action': {
              color: notification.savedForm?.isPublished ? '#001E2B' : '#fff',
            },
          }}
          action={
            <IconButton
              size="small"
              color="inherit"
              onClick={() => setNotification({ open: false, savedForm: null })}
            >
              <Close fontSize="small" />
            </IconButton>
          }
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {notification.savedForm?.isPublished
                ? 'Form Published Successfully!'
                : 'Form Saved Successfully!'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {notification.savedForm?.name} (v{notification.savedForm?.version})
            </Typography>
            {notification.savedForm?.isPublished && (
              <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'monospace',
                    bgcolor: alpha('#000', 0.1),
                    px: 1,
                    py: 0.5,
                    borderRadius: 0.5,
                    maxWidth: 280,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  /forms/{notification.savedForm?.slug}
                </Typography>
                <IconButton
                  size="small"
                  color="inherit"
                  onClick={() => {
                    const url = `${window.location.origin}/forms/${notification.savedForm?.slug}`;
                    navigator.clipboard.writeText(url);
                  }}
                  title="Copy URL"
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  color="inherit"
                  onClick={() => {
                    window.open(`/forms/${notification.savedForm?.slug}`, '_blank');
                  }}
                  title="Open form"
                >
                  <OpenInNew fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Box>
        </Alert>
      </Snackbar>

      {/* Form Library Drawer */}
      <Drawer
        anchor="left"
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        PaperProps={{
          sx: {
            width: 340,
            bgcolor: 'background.paper',
          }
        }}
      >
        <Box sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Folder sx={{ fontSize: 20, color: '#00ED64' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Form Library
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setShowLibrary(false)}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <FormLibrary
            onLoadForm={(config) => {
              setFieldConfigs(config.fieldConfigs);
              setVariables(config.variables || []);
              setMultiPageConfig(config.multiPage);
              setLifecycleConfig(config.lifecycle);
              setThemeConfig(config.theme);
              setHooksConfig(config.hooks);
              setCurrentFormId(config.id);
              setCurrentFormName(config.name || '');
              setCurrentFormDescription(config.description || '');
              setCurrentFormSlug(config.slug);
              setCurrentFormIsPublished(config.isPublished || false);
              setDataSource(config.dataSource);
              setAccessControl(config.accessControl);
              setOrganizationId(config.organizationId);
              setFormData({});
              setShowLibrary(false);
            }}
          />
        </Box>
      </Drawer>

      {/* Settings Drawer */}
      <FormSettingsDrawer
        open={settingsDrawerOpen}
        onClose={() => setSettingsDrawerOpen(false)}
        formName={currentFormName}
        onFormNameChange={setCurrentFormName}
        formDescription={currentFormDescription}
        onFormDescriptionChange={setCurrentFormDescription}
        themeConfig={themeConfig}
        onThemeChange={(theme) => {
          console.log('[FormBuilder] setThemeConfig called with:', {
            theme,
            pageBackgroundColor: theme?.pageBackgroundColor,
            pageBackgroundGradient: theme?.pageBackgroundGradient,
          });
          setThemeConfig(theme);
        }}
        multiPageConfig={multiPageConfig}
        onMultiPageChange={setMultiPageConfig}
        fieldConfigs={fieldConfigs}
        lifecycleConfig={lifecycleConfig}
        onLifecycleChange={setLifecycleConfig}
        collection={collection || undefined}
        variables={variables}
        onVariablesChange={setVariables}
        formType={formType}
        onFormTypeChange={setFormType}
        searchConfig={searchConfig}
        onSearchConfigChange={setSearchConfig}
        dataSource={dataSource}
        organizationId={organizationId}
        onDataSourceChange={(ds, orgId) => {
          setDataSource(ds);
          if (orgId) setOrganizationId(orgId);
        }}
        accessControl={accessControl}
        onAccessControlChange={setAccessControl}
        botProtection={botProtection}
        onBotProtectionChange={setBotProtection}
        draftSettings={draftSettings}
        onDraftSettingsChange={setDraftSettings}
        hooksConfig={hooksConfig}
        onHooksConfigChange={setHooksConfig}
      />

      {/* Data Source Setup Modal */}
      <DataSourceSetupModal
        open={dataSourceModalOpen}
        onClose={() => setDataSourceModalOpen(false)}
        onComplete={(ds, orgId) => {
          setDataSource(ds);
          setOrganizationId(orgId);
        }}
        currentDataSource={dataSource}
        currentOrganizationId={organizationId}
        formName={currentFormName}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        open={shortcutsHelpOpen}
        onClose={() => setShortcutsHelpOpen(false)}
      />
    </Box>
  );
}

