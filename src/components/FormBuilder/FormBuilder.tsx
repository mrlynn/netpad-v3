'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
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
import { Save, Add, Folder, Close, CheckCircle, ContentCopy, OpenInNew, NoteAdd, Public, Settings, MoreVert, PostAdd, Keyboard, TuneOutlined, Visibility, FileDownload, FileUpload, CloudUpload as PublishToMarketplaceIcon } from '@mui/icons-material';
import { FileMenu } from '@/components/common/FileMenu';
import { EntityStatusChip, SaveStatus } from '@/components/common/EntityStatusChip';
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
import { PublishItemDialog } from '@/components/Marketplace/PublishItemDialog';
import { FieldConfig, FormVariable, MultiPageConfig, FormLifecycle, FormTheme, FormType, SearchConfig, FormDataSource, FormAccessControl, BotProtectionConfig, DraftSettings, FormConfiguration } from '@/types/form';
import { FormReaction } from '@/types/reactions';
import { FormHooksConfig } from '@/types/formHooks';
import { generateFieldPath } from '@/utils/fieldPath';
import { useChat } from '@/contexts/ChatContext';
import { cleanFormForExport } from '@/lib/templates/export';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePathname } from 'next/navigation';
import { parseOrgProjectFromPath } from '@/lib/routing';
import { formNameToCollectionName } from '@/lib/utils/collectionNaming';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { ComponentProtectionIndicator } from '@/components/Applications/ComponentProtectionIndicator';
import { useProjectDefaultVault } from '@/lib/swr';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { ContextHelpButton } from '@/components/Help/ContextHelpButton';

interface FormBuilderProps {
  initialFormId?: string;
  initialFormConfig?: FormConfiguration;
  organizationId?: string;
  projectId?: string;
  applicationId?: string;
}

export function FormBuilder({ initialFormId, initialFormConfig, organizationId: propOrganizationId, projectId: propProjectId, applicationId: propApplicationId }: FormBuilderProps) {
  const { connectionString, databaseName, collection, sampleDocs, dispatch } = usePipeline();
  const { currentOrgId, organization } = useOrganization();
  const pathname = usePathname();
  
  // Get project context from URL or props
  const { projectId: urlProjectId } = parseOrgProjectFromPath(pathname);
  const effectiveProjectId = propProjectId || urlProjectId || localStorage.getItem('selected_project_id') || undefined;
  const effectiveOrgId = propOrganizationId || currentOrgId || undefined;

  // Fetch project's default vault with SWR caching (10 min cache)
  const { data: defaultVaultData } = useProjectDefaultVault(effectiveProjectId);

  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>(initialFormConfig?.fieldConfigs || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [variables, setVariables] = useState<FormVariable[]>([]);
  const [multiPageConfig, setMultiPageConfig] = useState<MultiPageConfig | undefined>(undefined);
  const [lifecycleConfig, setLifecycleConfig] = useState<FormLifecycle | undefined>(undefined);
  const [themeConfig, setThemeConfig] = useState<FormTheme | undefined>(undefined);

  const [currentFormId, setCurrentFormId] = useState<string | undefined>(undefined);
  const [currentFormName, setCurrentFormName] = useState<string>(initialFormConfig?.name || '');
  const [currentFormDescription, setCurrentFormDescription] = useState<string>(initialFormConfig?.description || '');
  const [currentFormSlug, setCurrentFormSlug] = useState<string | undefined>(undefined);
  const [currentFormIsPublished, setCurrentFormIsPublished] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    savedForm: SavedFormInfo | null;
  }>({ open: false, savedForm: null });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [selectedFieldPath, setSelectedFieldPath] = useState<string | null>(null);
  const [formType, setFormType] = useState<FormType>(initialFormConfig?.formType || 'data-entry');
  const [searchConfig, setSearchConfig] = useState<SearchConfig | undefined>(undefined);
  const [conversationalConfig, setConversationalConfig] = useState<import('@/types/conversational').ConversationalFormConfig | undefined>(initialFormConfig?.conversationalConfig);
  const [projectId, setProjectId] = useState<string | undefined>(propProjectId);
  const [dataSource, setDataSource] = useState<FormDataSource | undefined>(undefined);
  const [accessControl, setAccessControl] = useState<FormAccessControl | undefined>(undefined);
  const [organizationId, setOrganizationId] = useState<string | undefined>(propOrganizationId);
  const [addQuestionDialogOpen, setAddQuestionDialogOpen] = useState(false);
  const [dataSourceModalOpen, setDataSourceModalOpen] = useState(false);
  const [botProtection, setBotProtection] = useState<BotProtectionConfig | undefined>(undefined);
  const [draftSettings, setDraftSettings] = useState<DraftSettings | undefined>(undefined);
  const [hooksConfig, setHooksConfig] = useState<FormHooksConfig | undefined>(undefined);
  const [reactions, setReactions] = useState<FormReaction[]>([]);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [newFormDialogOpen, setNewFormDialogOpen] = useState(false);
  const [pendingField, setPendingField] = useState<FieldConfig | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<{
    name: string;
    fields: FieldConfig[];
    formType?: FormType;
    searchConfig?: SearchConfig;
    conversationalConfig?: import('@/types/conversational').ConversationalFormConfig;
  } | null>(null);
  const [publishToMarketplaceOpen, setPublishToMarketplaceOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // File input ref for importing forms
  const importInputRef = useRef<HTMLInputElement>(null);

  // Track unsaved changes - warns user before navigating away
  const { isDirty, markDirty, markClean } = useUnsavedChanges({
    message: 'You have unsaved changes to this form. Are you sure you want to leave?',
  });

  // Track initial state to compare for dirty detection
  const initialStateRef = useRef<string | null>(null);

  // Set initial state snapshot after form loads
  useEffect(() => {
    if (currentFormId && fieldConfigs.length > 0 && !initialStateRef.current) {
      initialStateRef.current = JSON.stringify({
        fieldConfigs,
        formName: currentFormName,
        formType,
        themeConfig,
        multiPageConfig,
        variables,
      });
    }
  }, [currentFormId, fieldConfigs, currentFormName, formType, themeConfig, multiPageConfig, variables]);

  // Check for changes whenever form state updates
  useEffect(() => {
    if (!initialStateRef.current) return;

    const currentState = JSON.stringify({
      fieldConfigs,
      formName: currentFormName,
      formType,
      themeConfig,
      multiPageConfig,
      variables,
    });

    if (currentState !== initialStateRef.current) {
      markDirty();
      // Only mark as unsaved if we're not currently saving
      if (saveStatus !== 'saving') {
        setSaveStatus('unsaved');
      }
    }
  }, [fieldConfigs, currentFormName, formType, themeConfig, multiPageConfig, variables, markDirty, saveStatus]);

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

  // Handle preview form - opens in new tab
  const handlePreviewForm = useCallback(() => {
    if (currentFormId) {
      window.open(`/forms/${currentFormId}/preview`, '_blank');
    }
  }, [currentFormId]);

  // Handle export form definition
  const handleExportForm = useCallback(() => {
    if (fieldConfigs.length === 0) return;

    // Build the current form configuration
    const formConfig = {
      id: currentFormId,
      name: currentFormName || 'Untitled Form',
      description: currentFormDescription,
      slug: currentFormSlug,
      fieldConfigs,
      variables,
      multiPageConfig,
      lifecycleConfig,
      theme: themeConfig,
      formType,
      searchConfig,
      conversationalConfig,
      botProtection,
      draftSettings,
      hooksConfig,
    };

    // Clean the form for export (removes sensitive data)
    const exportedForm = cleanFormForExport(formConfig as any);

    // Create and download the file
    const blob = new Blob([JSON.stringify(exportedForm, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(currentFormName || 'form').toLowerCase().replace(/\s+/g, '-')}-definition.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setMoreMenuAnchor(null);
  }, [fieldConfigs, currentFormId, currentFormName, currentFormDescription, currentFormSlug, variables, multiPageConfig, lifecycleConfig, themeConfig, formType, searchConfig, conversationalConfig, botProtection, draftSettings, hooksConfig]);

  // Handle import form definition
  const handleImportForm = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const imported = JSON.parse(content);

        // Validate basic structure
        if (!imported.fieldConfigs || !Array.isArray(imported.fieldConfigs)) {
          throw new Error('Invalid form configuration: missing fieldConfigs array');
        }

        // Apply the imported configuration
        setFieldConfigs(imported.fieldConfigs);
        if (imported.name) setCurrentFormName(imported.name);
        if (imported.description) setCurrentFormDescription(imported.description);
        if (imported.variables) setVariables(imported.variables);
        if (imported.multiPageConfig) setMultiPageConfig(imported.multiPageConfig);
        if (imported.lifecycleConfig) setLifecycleConfig(imported.lifecycleConfig);
        if (imported.theme) setThemeConfig(imported.theme);
        if (imported.formType) setFormType(imported.formType);
        if (imported.searchConfig) setSearchConfig(imported.searchConfig);
        if (imported.conversationalConfig) setConversationalConfig(imported.conversationalConfig);
        if (imported.botProtection) setBotProtection(imported.botProtection);
        if (imported.draftSettings) setDraftSettings(imported.draftSettings);
        if (imported.hooksConfig) setHooksConfig(imported.hooksConfig);

        // Clear the current form ID so this becomes a new form
        setCurrentFormId(undefined);
        setCurrentFormSlug(undefined);
        setCurrentFormIsPublished(false);

        // Show success notification
        setError(null);
        setNotification({
          open: true,
          savedForm: {
            id: 'imported',
            name: imported.name || 'Imported Form',
            slug: '',
            isPublished: false,
            version: 1,
          },
        });
      } catch (err: any) {
        setError(`Failed to import form: ${err.message}`);
      }
    };
    reader.readAsText(file);

    // Reset the input so the same file can be selected again
    event.target.value = '';
    setMoreMenuAnchor(null);
  }, []);

  // Direct save function - saves without dialog for existing forms
  const handleDirectSave = useCallback(async (): Promise<boolean> => {
    // If no form ID (new form), open the dialog instead
    if (!currentFormId || !currentFormName) {
      setSaveDialogOpen(true);
      return false;
    }

    // If no fields, nothing to save
    if (fieldConfigs.length === 0) {
      return false;
    }

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const config = {
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
        reactions,
        formType,
        searchConfig,
        conversationalConfig,
        dataSource,
        accessControl,
        organizationId,
        projectId,
        applicationId: propApplicationId,
        botProtection,
        draftSettings,
      };

      const response = await fetch('/api/forms-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formConfig: config, publish: currentFormIsPublished })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save form');
      }

      // Update state with saved info
      setCurrentFormSlug(data.form.slug);
      setLastSaved(new Date());
      setSaveStatus('saved');
      markClean();

      // Update initial state snapshot
      initialStateRef.current = JSON.stringify({
        fieldConfigs,
        formName: currentFormName,
        formType,
        themeConfig,
        multiPageConfig,
        variables,
      });

      return true;
    } catch (err) {
      console.error('Failed to save form:', err);
      setSaveStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to save form');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    currentFormId, currentFormName, currentFormDescription, currentFormSlug,
    currentFormIsPublished, collection, databaseName, fieldConfigs, variables,
    multiPageConfig, lifecycleConfig, themeConfig, hooksConfig, reactions, formType,
    searchConfig, conversationalConfig, dataSource, accessControl,
    organizationId, projectId, propApplicationId, botProtection, draftSettings, markClean
  ]);

  // Keyboard shortcuts for power users
  const handleKeyboardShortcuts = useCallback((e: KeyboardEvent) => {
    // Don't trigger if user is typing in an input
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdKey = isMac ? e.metaKey : e.ctrlKey;

    // Cmd/Ctrl + S: Save form (direct save for existing forms, dialog for new)
    if (cmdKey && e.key === 's') {
      e.preventDefault();
      if (fieldConfigs.length > 0) {
        handleDirectSave();
      }
    }
    // Cmd/Ctrl + Shift + S: Save As (always opens dialog)
    else if (cmdKey && e.shiftKey && e.key === 'S') {
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
    // Cmd/Ctrl + Shift + P: Preview form
    else if (cmdKey && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      if (currentFormId && fieldConfigs.length > 0) {
        handlePreviewForm();
      }
    }
  }, [fieldConfigs.length, selectedFieldPath, settingsDrawerOpen, showLibrary, currentFormId, handlePreviewForm, handleDirectSave]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [handleKeyboardShortcuts]);

  // Initialize organizationId and projectId from context/props (update if context changes)
  useEffect(() => {
    if (effectiveOrgId) {
      setOrganizationId(effectiveOrgId);
    }
    if (effectiveProjectId) {
      setProjectId(effectiveProjectId);
    }
  }, [effectiveOrgId, effectiveProjectId]);

  // Auto-populate dataSource when default vault data is available (via SWR cache)
  // ONLY for new forms - don't auto-populate when editing an existing form
  useEffect(() => {
    console.log('[FormBuilder] Auto-populate dataSource effect:', {
      initialFormId,
      hasDataSource: !!dataSource?.vaultId,
      dataSourceVaultId: dataSource?.vaultId,
      hasDefaultVault: defaultVaultData?.hasDefaultVault,
      defaultVaultId: defaultVaultData?.vault?.vaultId,
      currentFormId,
    });

    // Don't auto-populate if we're editing an existing form (initialFormId provided)
    // The form's saved dataSource will be loaded by loadFormById
    if (initialFormId) {
      console.log('[FormBuilder] Skipping auto-populate: editing existing form');
      return;
    }

    // Don't override if dataSource is already set (user may have manually configured it)
    if (dataSource?.vaultId) {
      console.log('[FormBuilder] Skipping auto-populate: dataSource already set');
      return;
    }

    if (defaultVaultData?.hasDefaultVault && defaultVaultData.vault) {
      // Auto-generate collection name from form name if form name exists
      const collectionName = currentFormName
        ? formNameToCollectionName(currentFormName)
        : 'form_responses';

      console.log('[FormBuilder] Auto-populating dataSource with default vault:', {
        vaultId: defaultVaultData.vault.vaultId,
        collection: collectionName,
      });

      setDataSource({
        vaultId: defaultVaultData.vault.vaultId,
        collection: collectionName,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultVaultData, initialFormId]); // Note: intentionally not including dataSource to avoid loops

  // Auto-update collection name when form name changes (if using default vault)
  useEffect(() => {
    if (!currentFormName || !dataSource?.vaultId) return;
    
    // Only auto-update if collection name looks auto-generated (ends with _responses)
    const currentCollection = dataSource.collection || '';
    if (currentCollection.endsWith('_responses') || currentCollection === 'form_responses') {
      const newCollectionName = formNameToCollectionName(currentFormName);
      if (newCollectionName !== currentCollection) {
        setDataSource({
          ...dataSource,
          collection: newCollectionName,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFormName]); // Only depend on form name, not dataSource to avoid loops

  // Load form from initialFormId when provided (e.g., from URL params)
  // Wait for effectiveOrgId to be available to ensure we load from the org database
  useEffect(() => {
    if (initialFormId && effectiveOrgId) {
      loadFormById(initialFormId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFormId, effectiveOrgId]);

  // Load form from initialFormConfig when provided (e.g., from landing page generation)
  useEffect(() => {
    if (initialFormConfig && !initialFormId) {
      console.log('[FormBuilder] Loading from initialFormConfig:', initialFormConfig.name);
      setFieldConfigs(initialFormConfig.fieldConfigs || []);
      setCurrentFormName(initialFormConfig.name || 'Generated Form');
      setCurrentFormDescription(initialFormConfig.description || '');
      setFormType(initialFormConfig.formType || 'conversational');
      setConversationalConfig(initialFormConfig.conversationalConfig);
      setHooksConfig(initialFormConfig.hooks);
      setReactions(initialFormConfig.reactions || []);
      setOrganizationId(initialFormConfig.organizationId);
      setProjectId(initialFormConfig.projectId);
      setFormData({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFormConfig]);

  const loadFormById = async (formId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Include orgId in query params if available for organization database lookup
      const orgIdParam = effectiveOrgId ? `?orgId=${effectiveOrgId}` : '';
      const response = await fetch(`/api/forms/${formId}${orgIdParam}`);
      const data = await response.json();

      if (data.success && data.form) {
        const config = data.form;
        console.log('[FormBuilder] Loading form with dataSource:', {
          formId: config.id,
          hasDataSource: !!config.dataSource,
          dataSource: config.dataSource,
          vaultId: config.dataSource?.vaultId,
          collection: config.dataSource?.collection,
          organizationId: config.organizationId,
        });
        setFieldConfigs(config.fieldConfigs || []);
        setVariables(config.variables || []);
        setMultiPageConfig(config.multiPage);
        setLifecycleConfig(config.lifecycle);
        setThemeConfig(config.theme);
        setHooksConfig(config.hooks);
        setReactions(config.reactions || []);
        setCurrentFormId(config.id);
        setCurrentFormName(config.name || '');
        setCurrentFormDescription(config.description || '');
        setCurrentFormSlug(config.slug);
        setCurrentFormIsPublished(config.isPublished || false);
        setFormType(config.formType || 'data-entry');
        setSearchConfig(config.searchConfig);
        setConversationalConfig(config.conversationalConfig);
        setDataSource(config.dataSource);
        setAccessControl(config.accessControl);
        setOrganizationId(config.organizationId);
        setProjectId(config.projectId);
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
    }
    // Note: We no longer reset fieldConfigs to [] here when there's no connection.
    // This allows templates and initialFormConfig to work without being wiped out.
    // Fields are only reset when explicitly loading from a connection/collection.
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
        setPendingTemplate({ name: templateName, fields: [field], formType: 'data-entry' });
      }
      setNewFormDialogOpen(true);
    } else {
      // Already have fields, just add the new one
      addCustomField(field);
      setSelectedFieldPath(field.path);
    }
  };

  // Handle adding a template with all fields at once
  // Updated to accept full template to support formType and searchConfig
  const handleAddTemplate = (template: import('@/lib/templates/loader').FormTemplate) => {
    if (!template.fields || template.fields.length === 0) return;

    const fields = template.fields.map(field => ({
      ...field,
      source: 'custom' as const,
    })) as FieldConfig[];

    // Store template metadata including formType and searchConfig
    setPendingTemplate({
      name: template.name,
      fields,
      formType: template.formType,
      searchConfig: template.searchConfig,
      conversationalConfig: template.conversationalConfig,
    });
    setPendingField(fields[0]); // Keep first field for backwards compatibility
    setNewFormDialogOpen(true);
  };

  // Handle new form dialog confirmation
  const handleNewFormConfirm = (formName: string, collectionName: string, selectedProjectId?: string) => {
    // Set the form name
    setCurrentFormName(formName);
    
    // Set the project ID
    if (selectedProjectId) {
      setProjectId(selectedProjectId);
    }

    // Set the collection name in data source
    setDataSource({
      collection: collectionName,
    });

    // Add the pending field(s)
    if (pendingTemplate && pendingTemplate.fields.length > 0) {
      // Apply template configuration (formType, searchConfig, etc.)
      if (pendingTemplate.formType) {
        setFormType(pendingTemplate.formType);
      }
      if (pendingTemplate.searchConfig) {
        setSearchConfig(pendingTemplate.searchConfig);
      }
      if (pendingTemplate.conversationalConfig) {
        setConversationalConfig(pendingTemplate.conversationalConfig);
      }

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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }} data-testid="form-builder">
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
        {/* Left: File menu + Form identity */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <FileMenu
            entityType="form"
            entityName={currentFormName}
            entityId={currentFormId}
            isDirty={isDirty}
            onNew={() => handleNewForm()}
            onOpen={() => setShowLibrary(true)}
            onSave={handleDirectSave}
            onSaveAs={() => setSaveDialogOpen(true)}
            onExport={handleExportForm}
            onImport={() => importInputRef.current?.click()}
            onDelete={currentFormId ? async () => {
              if (window.confirm(`Are you sure you want to delete "${currentFormName}"? This action cannot be undone.`)) {
                try {
                  const orgIdParam = effectiveOrgId ? `?orgId=${effectiveOrgId}` : '';
                  const response = await fetch(`/api/forms/${currentFormId}${orgIdParam}`, {
                    method: 'DELETE',
                  });

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to delete form');
                  }

                  // Reset form state after successful deletion
                  setCurrentFormId(undefined);
                  setCurrentFormName('');
                  setCurrentFormDescription('');
                  setCurrentFormSlug(undefined);
                  setCurrentFormIsPublished(false);
                  setFieldConfigs([]);
                  setVariables([]);
                  setMultiPageConfig(undefined);
                  setLifecycleConfig(undefined);
                  setThemeConfig(undefined);
                  setDataSource(undefined);
                  setAccessControl(undefined);
                  setFormData({});
                  markClean();

                  setError(null);
                  setSuccessMessage('Form deleted successfully');

                  // Notify sidebar to refresh its forms list
                  window.dispatchEvent(new CustomEvent('netpad:form-changed', {
                    detail: { applicationId: propApplicationId }
                  }));
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to delete form');
                }
              }
            } : undefined}
          />

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

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

          {/* Status chip - always visible */}
          <EntityStatusChip
            status={saveStatus}
            lastSaved={lastSaved}
            onRetry={saveStatus === 'error' ? handleDirectSave : undefined}
            entityType="form"
          />

          {currentFormIsPublished && (
            <Tooltip title="Published">
              <Public sx={{ fontSize: 16, color: 'success.main' }} />
            </Tooltip>
          )}
          {isLoading && <NetPadLoader size="small" showPhrases={false} />}

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
            onClick={handlePreviewForm}
            disabled={!currentFormId || fieldConfigs.length === 0}
            startIcon={<Visibility fontSize="small" />}
            sx={{
              minWidth: 'auto',
              px: 1.5,
              borderColor: alpha('#FF9800', 0.5),
              color: '#FF9800',
              '&:hover': {
                borderColor: '#FF9800',
                bgcolor: alpha('#FF9800', 0.08),
              },
              '&.Mui-disabled': {
                borderColor: 'divider',
                color: 'text.disabled',
              },
            }}
          >
            Preview
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
              conversationalConfig,
              dataSource,
              accessControl,
              organizationId,
              projectId,
            }}
            organizationSlug={organization?.slug}
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
            {currentFormId && fieldConfigs.length > 0 && (
              <MenuItem
                onClick={() => { handlePreviewForm(); setMoreMenuAnchor(null); }}
              >
                <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
                <ListItemText>Preview Form</ListItemText>
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
            <MenuItem
              onClick={handleExportForm}
              disabled={fieldConfigs.length === 0}
            >
              <ListItemIcon><FileDownload fontSize="small" /></ListItemIcon>
              <ListItemText>Export Form Definition</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => { setPublishToMarketplaceOpen(true); setMoreMenuAnchor(null); }}
              disabled={fieldConfigs.length === 0 || !currentFormName}
            >
              <ListItemIcon><PublishToMarketplaceIcon fontSize="small" sx={{ color: '#2196F3' }} /></ListItemIcon>
              <ListItemText>Publish to Marketplace</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { importInputRef.current?.click(); setMoreMenuAnchor(null); }}>
              <ListItemIcon><FileUpload fontSize="small" /></ListItemIcon>
              <ListItemText>Import Form Definition</ListItemText>
            </MenuItem>
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
            minHeight: 'calc(100vh - 200px)',
            bgcolor: 'background.default'
          }}
        >
          <NetPadLoader size="large" variant="ascii" message="Loading collection schema..." />
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
          onStartBlank={() => {
            // Start with a blank form - add a simple text field to get started
            // This will trigger the form naming dialog
            const blankField: FieldConfig = {
              path: 'field1',
              label: 'Question 1',
              type: 'string',
              included: true,
              required: false,
              source: 'custom',
            };
            handleStartNewForm(blankField);
          }}
        />
      ) : (
        // Main editing area - Google Forms style centered layout
        <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* Component Protection Indicator */}
          {currentFormId && effectiveOrgId && propApplicationId && (
            <Box sx={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 1000 }}>
              <ComponentProtectionIndicator
                componentId={currentFormId}
                componentType="form"
                orgId={effectiveOrgId}
                applicationId={propApplicationId}
              />
            </Box>
          )}
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
            formType={formType}
            theme={themeConfig}
          />

          {/* Floating Action Toolbar - Google Forms Style */}
          <FloatingActionToolbar
            onAddField={handleQuickAddField}
            onOpenAddDialog={() => setAddQuestionDialogOpen(true)}
          />

          {/* Field Configuration Drawer - right-side panel (better UX than bottom panel) */}
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
        organizationId={organizationId}
        projectId={effectiveProjectId}
        applicationId={propApplicationId}
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
          // Reset dirty state and update initial state snapshot
          markClean();
          initialStateRef.current = JSON.stringify({
            fieldConfigs,
            formName: info.name,
            formType,
            themeConfig,
            multiPageConfig,
            variables,
          });
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
          conversationalConfig,
          dataSource,
          accessControl,
          organizationId,
          projectId,
          applicationId: propApplicationId,
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

      {/* Success Message Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSuccessMessage(null)}
          severity="success"
          sx={{ width: '100%' }}
        >
          {successMessage}
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
            <ContextHelpButton topicId="form-library" placement="top-start" />
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
              setProjectId(config.projectId);
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
        conversationalConfig={conversationalConfig}
        onConversationalConfigChange={setConversationalConfig}
        onGenerateFieldsFromSchema={(schema) => {
          // Generate form fields from extraction schema
          const newFields: FieldConfig[] = schema.map((s) => {
            // Map extraction schema type to form field type
            let fieldType: FieldConfig['type'] = 'text';
            if (s.type === 'number') fieldType = 'number';
            else if (s.type === 'boolean') fieldType = 'yes-no';
            else if (s.type === 'enum') fieldType = s.options && s.options.length > 0 ? 'select' : 'text';
            else if (s.type === 'array') fieldType = 'array';
            else if (s.type === 'object') fieldType = 'object';
            
            const field: FieldConfig = {
              path: s.field,
              label: s.description || s.field,
              type: fieldType,
              included: true,
              required: s.required || false,
              source: 'custom', // Fields generated from conversational extraction schema
            };

            // Add options for enum/select fields
            if (s.type === 'enum' && s.options && s.options.length > 0) {
              field.validation = {
                options: s.options.map(opt => typeof opt === 'string' ? opt : { label: opt, value: opt }),
              };
            }

            return field;
          });

          // Replace existing fields with generated ones
          setFieldConfigs(newFields);
        }}
        dataSource={dataSource}
        organizationId={organizationId}
        projectId={effectiveProjectId}
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
        formId={currentFormId}
        formSlug={currentFormSlug}
        isPublished={currentFormIsPublished}
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
        applicationId={propApplicationId}
        currentFormId={currentFormId}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        open={shortcutsHelpOpen}
        onClose={() => setShortcutsHelpOpen(false)}
      />

      {/* Hidden file input for importing form definitions */}
      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportForm}
      />

      {/* Publish to Marketplace Dialog */}
      <PublishItemDialog
        open={publishToMarketplaceOpen}
        onClose={() => setPublishToMarketplaceOpen(false)}
        itemType="form"
        form={{
          id: currentFormId,
          name: currentFormName,
          description: currentFormDescription,
          slug: currentFormSlug,
          fieldConfigs: fieldConfigs,
          variables: variables,
          theme: themeConfig,
          multiPage: multiPageConfig,
          botProtection: botProtection,
          draftSettings: draftSettings,
        }}
        existingManifest={{
          name: currentFormName,
          description: currentFormDescription,
        }}
        onPublishSuccess={(result) => {
          console.log('[FormBuilder] Published to marketplace:', result);
        }}
      />
    </Box>
  );
}

