'use client';

import { useState } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Tabs,
  Tab,
  alpha,
  Divider,
  Badge,
  TextField,
} from '@mui/material';
import {
  Close,
  Palette,
  Pages,
  Speed,
  DataObject,
  Settings,
  Search,
  Publish,
  Shield,
  Bolt,
  Chat,
  Rocket,
  Extension,
  Storage,
  Code,
  Lock,
} from '@mui/icons-material';
import { FormTheme, MultiPageConfig, FormLifecycle, FormVariable, FieldConfig, FormType, SearchConfig, FormDataSource, FormAccessControl, BotProtectionConfig, DraftSettings } from '@/types/form';
import { FormHooksConfig } from '@/types/formHooks';
import { ThemeConfigEditor } from './ThemeConfigEditor';
import { PageConfigEditor } from './PageConfigEditor';
import { LifecycleConfigEditor } from './LifecycleConfigEditor';
import { HooksSettingsEditor } from './HooksSettingsEditor';
import { VariablesPanel } from './VariablesPanel';
import { SearchConfigEditor } from './SearchConfigEditor';
import { DataSourceEditor } from './DataSourceEditor';
import { AccessControlEditor } from './AccessControlEditor';
import { BotProtectionEditor, DraftSettingsEditor } from './BotProtectionEditor';
import { EmbedCodeGenerator } from './EmbedCodeGenerator';
import { ConversationalConfigEditor } from './ConversationalConfigEditor';
import { ConversationalFormConfig } from '@/types/conversational';
import { SettingsSection, SettingsItem } from '@/components/Settings';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      sx={{
        flex: 1,
        overflow: 'auto',
        display: value === index ? 'flex' : 'none',
        flexDirection: 'column'
      }}
    >
      {value === index && children}
    </Box>
  );
}

interface FormSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: number; // Optional: which tab to open by default
  // Form Details
  formName: string;
  onFormNameChange: (name: string) => void;
  formDescription?: string;
  onFormDescriptionChange: (description: string) => void;
  // Theme
  themeConfig?: FormTheme;
  onThemeChange: (theme: FormTheme | undefined) => void;
  // Multi-page
  multiPageConfig?: MultiPageConfig;
  onMultiPageChange: (config: MultiPageConfig | undefined) => void;
  fieldConfigs: FieldConfig[];
  // Lifecycle
  lifecycleConfig?: FormLifecycle;
  onLifecycleChange: (config: FormLifecycle | undefined) => void;
  collection?: string;
  // Variables
  variables: FormVariable[];
  onVariablesChange: (variables: FormVariable[]) => void;
  // Search/Form Type
  formType: FormType;
  onFormTypeChange: (type: FormType) => void;
  searchConfig?: SearchConfig;
  onSearchConfigChange: (config: SearchConfig | undefined) => void;
  // Conversational Form
  conversationalConfig?: ConversationalFormConfig;
  onConversationalConfigChange: (config: ConversationalFormConfig | undefined) => void;
  onGenerateFieldsFromSchema?: (schema: import('@/types/conversational').ExtractionSchema[]) => void;
  // Publishing - Data Source & Access Control
  dataSource?: FormDataSource;
  organizationId?: string;
  projectId?: string;
  onDataSourceChange: (dataSource: FormDataSource | undefined, orgId?: string) => void;
  accessControl?: FormAccessControl;
  onAccessControlChange: (accessControl: FormAccessControl | undefined) => void;
  // Bot Protection & Drafts
  botProtection?: BotProtectionConfig;
  onBotProtectionChange: (config: BotProtectionConfig | undefined) => void;
  draftSettings?: DraftSettings;
  onDraftSettingsChange: (config: DraftSettings | undefined) => void;
  // Hooks/Automation
  hooksConfig?: FormHooksConfig;
  onHooksConfigChange: (config: FormHooksConfig | undefined) => void;
  // Embed
  formId?: string;
  formSlug?: string;
  isPublished?: boolean;
}

export function FormSettingsDrawer({
  open,
  onClose,
  defaultTab = 0,
  formName,
  onFormNameChange,
  formDescription,
  onFormDescriptionChange,
  themeConfig,
  onThemeChange,
  multiPageConfig,
  onMultiPageChange,
  fieldConfigs,
  lifecycleConfig,
  onLifecycleChange,
  collection,
  variables,
  onVariablesChange,
  formType,
  onFormTypeChange,
  searchConfig,
  onSearchConfigChange,
  conversationalConfig,
  onConversationalConfigChange,
  onGenerateFieldsFromSchema,
  dataSource,
  organizationId,
  projectId,
  onDataSourceChange,
  accessControl,
  onAccessControlChange,
  botProtection,
  onBotProtectionChange,
  draftSettings,
  onDraftSettingsChange,
  hooksConfig,
  onHooksConfigChange,
  formId,
  formSlug,
  isPublished,
}: FormSettingsDrawerProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Count configured items for badges
  const hasTheme = !!themeConfig?.preset || !!themeConfig?.primaryColor;
  const hasMultiPage = multiPageConfig?.enabled && (multiPageConfig?.pages?.length || 0) > 0;
  const hasLifecycle = !!lifecycleConfig?.create || !!lifecycleConfig?.edit;
  const variablesCount = variables.length;
  const hasSearch = formType === 'search' || formType === 'both';
  const hasConversational = formType === 'conversational';
  const hasPublishing = !!(dataSource?.vaultId && dataSource?.collection);
  const hasProtection = botProtection?.enabled || draftSettings?.enabled;
  const hasHooks = !!(hooksConfig?.prefill?.fromUrlParams || hooksConfig?.onSuccess?.message || hooksConfig?.onSuccess?.redirect || hooksConfig?.onSuccess?.webhook || hooksConfig?.onError?.message);

  // New consolidated tabs structure (4 tabs)
  const tabs = [
    {
      label: 'Publish',
      icon: <Rocket fontSize="small" />,
      badge: hasPublishing ? '✓' : undefined,
      color: '#00ED64'
    },
    {
      label: 'Appearance',
      icon: <Palette fontSize="small" />,
      badge: (hasTheme || hasMultiPage) ? '✓' : undefined,
      color: '#E91E63'
    },
    {
      label: 'Behavior',
      icon: <Settings fontSize="small" />,
      badge: (hasLifecycle || variablesCount > 0 || hasProtection) ? '✓' : undefined,
      color: '#9c27b0'
    },
    {
      label: 'Integrations',
      icon: <Extension fontSize="small" />,
      badge: (hasSearch || hasConversational || hasHooks) ? '✓' : undefined,
      color: '#2196f3'
    }
  ];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 480 },
          maxWidth: '100%'
        }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha('#00ED64', 0.03)
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Settings sx={{ color: '#00ED64' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Form Settings
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
              fontWeight: 500
            }
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab.label}
              icon={
                tab.badge ? (
                  <Badge
                    badgeContent={tab.badge}
                    color="primary"
                    sx={{
                      '& .MuiBadge-badge': {
                        bgcolor: tab.color,
                        color: '#fff',
                        fontSize: '0.65rem',
                        minWidth: 16,
                        height: 16
                      }
                    }}
                  >
                    {tab.icon}
                  </Badge>
                ) : (
                  tab.icon
                )
              }
              iconPosition="start"
              label={tab.label}
              sx={{
                '&.Mui-selected': {
                  color: tab.color
                }
              }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Tab Panels */}
      {/* Tab 0: Publish - Data Storage + Access Control + Embed */}
      <TabPanel value={activeTab} index={0}>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Form Details
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <SettingsItem
              label="Form Title"
              description="This title will be displayed at the top of your published form"
            >
              <TextField
                value={formName}
                onChange={(e) => onFormNameChange(e.target.value)}
                fullWidth
                size="small"
                placeholder="Enter form title"
              />
            </SettingsItem>
            <SettingsItem
              label="Description"
              description="Shown below the title on the published form"
            >
              <TextField
                value={formDescription || ''}
                onChange={(e) => onFormDescriptionChange(e.target.value)}
                fullWidth
                size="small"
                multiline
                rows={2}
                placeholder="Optional description for your form"
              />
            </SettingsItem>
          </Box>

          <Divider sx={{ my: 2 }} />

          <SettingsSection
            title="Data Storage"
            description="Where form submissions are saved"
            icon={<Storage fontSize="small" />}
            color="#00ED64"
            defaultExpanded={true}
          >
            <DataSourceEditor
              value={dataSource}
              organizationId={organizationId}
              projectId={projectId}
              onChange={onDataSourceChange}
            />
          </SettingsSection>

          <SettingsSection
            title="Access Control"
            description="Control who can view and submit the form"
            icon={<Lock fontSize="small" />}
            color="#00ED64"
            defaultExpanded={true}
          >
            <AccessControlEditor
              value={accessControl}
              onChange={onAccessControlChange}
            />
          </SettingsSection>

          {/* Embed Code Generator - only show if form is published */}
          {isPublished && formId && formSlug && (
            <SettingsSection
              title="Embed Form"
              description="Get the code to embed this form on your website"
              icon={<Code fontSize="small" />}
              color="#00ED64"
              defaultExpanded={false}
            >
              <EmbedCodeGenerator
                formId={formId}
                formSlug={formSlug}
                formName={formName}
              />
            </SettingsSection>
          )}
        </Box>
      </TabPanel>

      {/* Tab 1: Appearance - Theme + Pages */}
      <TabPanel value={activeTab} index={1}>
        <Box sx={{ p: 2 }}>
          <SettingsSection
            title="Theme"
            description="Customize the appearance and styling of your form"
            icon={<Palette fontSize="small" />}
            color="#E91E63"
            defaultExpanded={true}
            badge={hasTheme ? (
              <Badge
                badgeContent="✓"
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: '#E91E63',
                    color: '#fff',
                    fontSize: '0.65rem',
                    minWidth: 16,
                    height: 16
                  }
                }}
              >
                <Box sx={{ width: 0 }} />
              </Badge>
            ) : undefined}
          >
            <ThemeConfigEditor
              config={themeConfig}
              onChange={(theme) => {
                console.log('[FormSettingsDrawer] Theme changed:', {
                  theme,
                  pageBackgroundColor: theme?.pageBackgroundColor,
                  pageBackgroundGradient: theme?.pageBackgroundGradient,
                });
                onThemeChange(theme);
              }}
              formTitle={formName}
              formDescription={formDescription}
            />
          </SettingsSection>

          <SettingsSection
            title="Pages"
            description="Organize your form into multiple pages"
            icon={<Pages fontSize="small" />}
            color="#E91E63"
            defaultExpanded={true}
            badge={hasMultiPage ? (
              <Badge
                badgeContent={multiPageConfig?.pages?.length || 0}
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: '#e91e63',
                    color: '#fff',
                    fontSize: '0.65rem',
                    minWidth: 16,
                    height: 16
                  }
                }}
              >
                <Box sx={{ width: 0 }} />
              </Badge>
            ) : undefined}
          >
            <PageConfigEditor
              config={multiPageConfig}
              onChange={onMultiPageChange}
              fieldConfigs={fieldConfigs}
            />
          </SettingsSection>
        </Box>
      </TabPanel>

      {/* Tab 2: Behavior - Lifecycle + Variables + Protection */}
      <TabPanel value={activeTab} index={2}>
        <Box sx={{ p: 2 }}>
          <SettingsSection
            title="Lifecycle"
            description="Configure create and edit workflows for form submissions"
            icon={<Speed fontSize="small" />}
            color="#9c27b0"
            defaultExpanded={true}
            badge={hasLifecycle ? (
              <Badge
                badgeContent="✓"
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: '#9c27b0',
                    color: '#fff',
                    fontSize: '0.65rem',
                    minWidth: 16,
                    height: 16
                  }
                }}
              >
                <Box sx={{ width: 0 }} />
              </Badge>
            ) : undefined}
          >
            <LifecycleConfigEditor
              config={lifecycleConfig}
              onChange={onLifecycleChange}
              fieldConfigs={fieldConfigs}
              collection={collection || ''}
            />
          </SettingsSection>

          <SettingsSection
            title="Variables"
            description="Define variables that can be used throughout your form"
            icon={<DataObject fontSize="small" />}
            color="#9c27b0"
            defaultExpanded={true}
            badge={variablesCount > 0 ? (
              <Badge
                badgeContent={variablesCount}
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: '#9c27b0',
                    color: '#fff',
                    fontSize: '0.65rem',
                    minWidth: 16,
                    height: 16
                  }
                }}
              >
                <Box sx={{ width: 0 }} />
              </Badge>
            ) : undefined}
          >
            <VariablesPanel
              variables={variables}
              onVariablesChange={onVariablesChange}
              fieldConfigs={fieldConfigs}
            />
          </SettingsSection>

          <SettingsSection
            title="Protection"
            description="Bot protection and draft saving settings"
            icon={<Shield fontSize="small" />}
            color="#9c27b0"
            defaultExpanded={false}
            badge={hasProtection ? (
              <Badge
                badgeContent="✓"
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: '#ff5722',
                    color: '#fff',
                    fontSize: '0.65rem',
                    minWidth: 16,
                    height: 16
                  }
                }}
              >
                <Box sx={{ width: 0 }} />
              </Badge>
            ) : undefined}
          >
            <BotProtectionEditor
              config={botProtection}
              onChange={onBotProtectionChange}
            />

            <Divider sx={{ my: 3 }} />

            <DraftSettingsEditor
              config={draftSettings}
              onChange={onDraftSettingsChange}
            />
          </SettingsSection>
        </Box>
      </TabPanel>

      {/* Tab 3: Integrations - Search + AI Chat + Actions */}
      <TabPanel value={activeTab} index={3}>
        <Box sx={{ p: 2 }}>
          <SettingsSection
            title="Search"
            description="Enable search functionality for your form submissions"
            icon={<Search fontSize="small" />}
            color="#2196f3"
            defaultExpanded={true}
            badge={hasSearch ? (
              <Badge
                badgeContent="✓"
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: '#2196f3',
                    color: '#fff',
                    fontSize: '0.65rem',
                    minWidth: 16,
                    height: 16
                  }
                }}
              >
                <Box sx={{ width: 0 }} />
              </Badge>
            ) : undefined}
          >
            <SearchConfigEditor
              formType={formType}
              onFormTypeChange={onFormTypeChange}
              config={searchConfig}
              onChange={onSearchConfigChange}
              fieldConfigs={fieldConfigs}
            />
          </SettingsSection>

          <SettingsSection
            title="AI Chat"
            description="Enable conversational AI chat interface for your form"
            icon={<Chat fontSize="small" />}
            color="#2196f3"
            defaultExpanded={true}
            badge={hasConversational ? (
              <Badge
                badgeContent="✓"
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: '#00ED64',
                    color: '#fff',
                    fontSize: '0.65rem',
                    minWidth: 16,
                    height: 16
                  }
                }}
              >
                <Box sx={{ width: 0 }} />
              </Badge>
            ) : undefined}
          >
            <ConversationalConfigEditor
              formType={formType}
              onFormTypeChange={onFormTypeChange}
              config={conversationalConfig}
              onChange={onConversationalConfigChange}
              fieldConfigs={fieldConfigs}
              onGenerateFieldsFromSchema={onGenerateFieldsFromSchema}
              formId={formId}
              organizationId={organizationId}
            />
          </SettingsSection>

          <SettingsSection
            title="Actions / Hooks"
            description="Configure automated actions and webhooks"
            icon={<Bolt fontSize="small" />}
            color="#2196f3"
            defaultExpanded={true}
            badge={hasHooks ? (
              <Badge
                badgeContent="✓"
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: '#ff9800',
                    color: '#fff',
                    fontSize: '0.65rem',
                    minWidth: 16,
                    height: 16
                  }
                }}
              >
                <Box sx={{ width: 0 }} />
              </Badge>
            ) : undefined}
          >
            <HooksSettingsEditor
              config={hooksConfig}
              onChange={onHooksConfigChange}
              fieldConfigs={fieldConfigs}
            />
          </SettingsSection>
        </Box>
      </TabPanel>
    </Drawer>
  );
}
