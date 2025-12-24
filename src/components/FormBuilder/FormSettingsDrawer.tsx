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
  TextField
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
} from '@mui/icons-material';
import { FormTheme, MultiPageConfig, FormLifecycle, FormVariable, FieldConfig, FormType, SearchConfig, FormDataSource, FormAccessControl, BotProtectionConfig, DraftSettings } from '@/types/form';
import { ThemeConfigEditor } from './ThemeConfigEditor';
import { PageConfigEditor } from './PageConfigEditor';
import { LifecycleConfigEditor } from './LifecycleConfigEditor';
import { VariablesPanel } from './VariablesPanel';
import { SearchConfigEditor } from './SearchConfigEditor';
import { DataSourceEditor } from './DataSourceEditor';
import { AccessControlEditor } from './AccessControlEditor';
import { BotProtectionEditor, DraftSettingsEditor } from './BotProtectionEditor';

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
  // Publishing - Data Source & Access Control
  dataSource?: FormDataSource;
  organizationId?: string;
  onDataSourceChange: (dataSource: FormDataSource | undefined, orgId?: string) => void;
  accessControl?: FormAccessControl;
  onAccessControlChange: (accessControl: FormAccessControl | undefined) => void;
  // Bot Protection & Drafts
  botProtection?: BotProtectionConfig;
  onBotProtectionChange: (config: BotProtectionConfig | undefined) => void;
  draftSettings?: DraftSettings;
  onDraftSettingsChange: (config: DraftSettings | undefined) => void;
}

export function FormSettingsDrawer({
  open,
  onClose,
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
  dataSource,
  organizationId,
  onDataSourceChange,
  accessControl,
  onAccessControlChange,
  botProtection,
  onBotProtectionChange,
  draftSettings,
  onDraftSettingsChange,
}: FormSettingsDrawerProps) {
  const [activeTab, setActiveTab] = useState(0);

  // Count configured items for badges
  const hasTheme = !!themeConfig?.preset || !!themeConfig?.primaryColor;
  const hasMultiPage = multiPageConfig?.enabled && (multiPageConfig?.pages?.length || 0) > 0;
  const hasLifecycle = !!lifecycleConfig?.create || !!lifecycleConfig?.edit;
  const variablesCount = variables.length;
  const hasSearch = formType === 'search' || formType === 'both';
  const hasPublishing = !!(dataSource?.vaultId && dataSource?.collection);
  const hasProtection = botProtection?.enabled || draftSettings?.enabled;

  const tabs = [
    {
      label: 'Publish',
      icon: <Publish fontSize="small" />,
      badge: hasPublishing ? '✓' : undefined,
      color: '#00ED64'
    },
    {
      label: 'Search',
      icon: <Search fontSize="small" />,
      badge: hasSearch ? '✓' : undefined,
      color: '#2196f3'
    },
    {
      label: 'Theme',
      icon: <Palette fontSize="small" />,
      badge: hasTheme ? '✓' : undefined,
      color: '#E91E63'
    },
    {
      label: 'Pages',
      icon: <Pages fontSize="small" />,
      badge: hasMultiPage ? (multiPageConfig?.pages?.length || 0).toString() : undefined,
      color: '#e91e63'
    },
    {
      label: 'Lifecycle',
      icon: <Speed fontSize="small" />,
      badge: hasLifecycle ? '✓' : undefined,
      color: '#9c27b0'
    },
    {
      label: 'Variables',
      icon: <DataObject fontSize="small" />,
      badge: variablesCount > 0 ? variablesCount.toString() : undefined,
      color: '#9c27b0'
    },
    {
      label: 'Protection',
      icon: <Shield fontSize="small" />,
      badge: hasProtection ? '✓' : undefined,
      color: '#ff5722'
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
      <TabPanel value={activeTab} index={0}>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Form Details
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <TextField
              label="Form Title"
              value={formName}
              onChange={(e) => onFormNameChange(e.target.value)}
              fullWidth
              size="small"
              placeholder="Enter form title"
              helperText="This title will be displayed at the top of your published form"
            />
            <TextField
              label="Description"
              value={formDescription || ''}
              onChange={(e) => onFormDescriptionChange(e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={2}
              placeholder="Optional description for your form"
              helperText="Shown below the title on the published form"
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Data Storage
          </Typography>
          <DataSourceEditor
            value={dataSource}
            organizationId={organizationId}
            onChange={onDataSourceChange}
          />

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Access Control
          </Typography>
          <AccessControlEditor
            value={accessControl}
            onChange={onAccessControlChange}
          />
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Box sx={{ p: 2 }}>
          <SearchConfigEditor
            formType={formType}
            onFormTypeChange={onFormTypeChange}
            config={searchConfig}
            onChange={onSearchConfigChange}
            fieldConfigs={fieldConfigs}
          />
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Box sx={{ p: 2 }}>
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
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <Box sx={{ p: 2 }}>
          <PageConfigEditor
            config={multiPageConfig}
            onChange={onMultiPageChange}
            fieldConfigs={fieldConfigs}
          />
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        <Box sx={{ p: 2 }}>
          <LifecycleConfigEditor
            config={lifecycleConfig}
            onChange={onLifecycleChange}
            fieldConfigs={fieldConfigs}
            collection={collection || ''}
          />
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={5}>
        <Box sx={{ p: 2 }}>
          <VariablesPanel
            variables={variables}
            onVariablesChange={onVariablesChange}
            fieldConfigs={fieldConfigs}
          />
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={6}>
        <Box sx={{ p: 2 }}>
          <BotProtectionEditor
            config={botProtection}
            onChange={onBotProtectionChange}
          />

          <Divider sx={{ my: 3 }} />

          <DraftSettingsEditor
            config={draftSettings}
            onChange={onDraftSettingsChange}
          />
        </Box>
      </TabPanel>
    </Drawer>
  );
}
