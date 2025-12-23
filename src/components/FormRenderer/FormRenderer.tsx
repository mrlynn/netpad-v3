'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  CircularProgress,
  Alert,
  Collapse,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  LinearProgress,
  Paper,
  Tabs,
  Tab,
  alpha,
  Slider,
  Chip,
  Radio,
  RadioGroup,
} from '@mui/material';
import { ArrowBack, ArrowForward, Check, Add, Delete, Lock, CloudUpload, InsertDriveFile, Close } from '@mui/icons-material';
import { FormConfiguration, FieldConfig, LookupConfig, FormPage, FormTheme, LayoutFieldType, LayoutConfig, URLParamConfig, FieldInteractionData, FormDraft } from '@/types/form';
import { evaluateConditionalLogic } from '@/utils/conditionalLogic';
import { evaluateFormula } from '@/utils/computedFields';
import { getResolvedTheme } from '@/lib/formThemes';
import { TurnstileWidget, TurnstileWidgetRef } from './TurnstileWidget';

// Generate a random honeypot field name to avoid pattern detection
function generateHoneypotFieldName(): string {
  const prefixes = ['website', 'url', 'homepage', 'company_site', 'business_url'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${suffix}`;
}

// Generate a simple session ID for draft tracking
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Layout field types that don't have data input
const LAYOUT_FIELD_TYPES: LayoutFieldType[] = ['section-header', 'description', 'divider', 'image', 'spacer'];

// Helper to parse URL parameter value based on config
function parseUrlParamValue(value: string | null, config: URLParamConfig): any {
  if (value === null || value === undefined) {
    return config.defaultValue;
  }

  // Apply transform
  let transformedValue = value;
  switch (config.transform) {
    case 'uppercase':
      transformedValue = value.toUpperCase();
      break;
    case 'lowercase':
      transformedValue = value.toLowerCase();
      break;
    case 'trim':
      transformedValue = value.trim();
      break;
  }

  // Validate against allowed values
  if (config.validation?.allowedValues && config.validation.allowedValues.length > 0) {
    if (!config.validation.allowedValues.includes(transformedValue)) {
      return config.defaultValue;
    }
  }

  // Validate against pattern
  if (config.validation?.pattern) {
    try {
      const regex = new RegExp(config.validation.pattern);
      if (!regex.test(transformedValue)) {
        return config.defaultValue;
      }
    } catch {
      // Invalid regex, ignore validation
    }
  }

  // Parse based on data type
  switch (config.dataType) {
    case 'number':
      const num = Number(transformedValue);
      return isNaN(num) ? config.defaultValue : num;
    case 'boolean':
      return transformedValue === 'true' || transformedValue === '1' || transformedValue === 'yes';
    case 'json':
      try {
        return JSON.parse(transformedValue);
      } catch {
        return config.defaultValue;
      }
    default:
      return transformedValue;
  }
}

// Helper to detect if array is key-value pattern (Attribute Pattern)
function isKeyValueArray(arr: any[]): boolean {
  if (!arr || arr.length === 0) return false;
  const sampleItems = arr.slice(0, 3);
  return sampleItems.every(item => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
    const keys = Object.keys(item);
    if (keys.length !== 2) return false;
    const hasKeyField = keys.some(k => ['key', 'name', 'attribute', 'property'].includes(k.toLowerCase()));
    const hasValueField = keys.some(k => ['value', 'val', 'data'].includes(k.toLowerCase()));
    return hasKeyField && hasValueField;
  });
}

// Helper to detect key and value field names from array
function detectKeyValueFields(arr: any[]): { keyField: string; valueField: string } {
  if (!arr || arr.length === 0) return { keyField: 'key', valueField: 'value' };
  const firstItem = arr[0];
  if (typeof firstItem !== 'object') return { keyField: 'key', valueField: 'value' };
  const keys = Object.keys(firstItem);
  const keyField = keys.find(k => ['key', 'name', 'attribute', 'property'].includes(k.toLowerCase())) || keys[0];
  const valueField = keys.find(k => ['value', 'val', 'data'].includes(k.toLowerCase())) || keys[1];
  return { keyField, valueField };
}

// Helper to convert File to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

interface FormRendererProps {
  form: FormConfiguration;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  initialData?: Record<string, any>;
}

interface LookupOption {
  value: any;
  label: string;
  raw: any;
}

export function FormRenderer({ form, onSubmit, initialData = {} }: FormRendererProps) {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupOptions, setLookupOptions] = useState<Record<string, LookupOption[]>>({});
  const [lookupLoading, setLookupLoading] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [pageErrors, setPageErrors] = useState<Record<number, string[]>>({});
  const [justNavigated, setJustNavigated] = useState(false);
  const [urlParamsProcessed, setUrlParamsProcessed] = useState(false);

  // ============================================
  // Bot Protection State
  // ============================================
  const [honeypotFieldName] = useState(() => generateHoneypotFieldName());
  const [honeypotValue, setHoneypotValue] = useState('');
  const [formLoadTime] = useState(() => Date.now());
  const turnstileRef = useRef<TurnstileWidgetRef>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>(undefined);

  // ============================================
  // Auto-save & Draft State
  // ============================================
  const [sessionId] = useState(() => {
    // Try to get existing session from localStorage, or create new one
    if (typeof window !== 'undefined') {
      const storedSession = localStorage.getItem(`form_session_${form.id}`);
      if (storedSession) return storedSession;
      const newSession = generateSessionId();
      localStorage.setItem(`form_session_${form.id}`, newSession);
      return newSession;
    }
    return generateSessionId();
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<FormDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ============================================
  // Field Interaction Tracking State
  // ============================================
  const [fieldInteractions, setFieldInteractions] = useState<Record<string, FieldInteractionData>>({});
  const [formStartedAt] = useState(() => new Date().toISOString());

  const fieldConfigs = form.fieldConfigs.filter((f) => f.included);
  const isMultiPage = form.multiPage?.enabled && (form.multiPage?.pages?.length || 0) > 1;
  const pages = form.multiPage?.pages || [];
  const multiPageConfig = form.multiPage;

  // Get resolved theme
  const theme = useMemo(() => getResolvedTheme(form.theme), [form.theme]);
  const isDarkMode = theme.mode === 'dark';

  // Theme-based styling
  const getSpacing = () => {
    switch (theme.spacing) {
      case 'compact': return 2;
      case 'spacious': return 4;
      default: return 3;
    }
  };

  const inputVariant = theme.inputStyle || 'outlined';

  // Get visible pages (respecting conditional logic)
  const visiblePages = useMemo(() => {
    if (!isMultiPage) return [];
    return pages
      .filter((page) => {
        if (!page.conditionalLogic) return true;
        return evaluateConditionalLogic(page.conditionalLogic, formData);
      })
      .sort((a, b) => a.order - b.order);
  }, [isMultiPage, pages, formData]);

  // Get fields for current page
  const currentPageFields = useMemo(() => {
    if (!isMultiPage || visiblePages.length === 0) {
      return fieldConfigs;
    }
    const page = visiblePages[currentPage];
    if (!page) return [];
    return fieldConfigs.filter((f) => page.fields.includes(f.path));
  }, [isMultiPage, visiblePages, currentPage, fieldConfigs]);

  // Ensure currentPage stays within bounds when visiblePages changes
  useEffect(() => {
    if (isMultiPage && visiblePages.length > 0 && currentPage >= visiblePages.length) {
      setCurrentPage(visiblePages.length - 1);
    }
  }, [isMultiPage, visiblePages.length, currentPage]);

  const currentPageData = visiblePages[currentPage];
  const isLastPage = isMultiPage && visiblePages.length > 0 && currentPage === visiblePages.length - 1;
  const isFirstPage = currentPage === 0;

  // Process URL parameters on initial load
  useEffect(() => {
    if (urlParamsProcessed) return;

    const urlParamFields = fieldConfigs.filter((f) => f.urlParam || f.type === 'url-param');
    if (urlParamFields.length === 0) {
      setUrlParamsProcessed(true);
      return;
    }

    const newFormData = { ...formData };
    let hasChanges = false;

    for (const field of urlParamFields) {
      const config = field.urlParam;
      if (!config?.paramName) continue;

      const paramValue = searchParams.get(config.paramName);
      const parsedValue = parseUrlParamValue(paramValue, config);

      if (parsedValue !== undefined && parsedValue !== null) {
        // Set value at the field path
        const keys = field.path.split('.');
        const lastKey = keys.pop()!;
        let target = newFormData;

        for (const key of keys) {
          if (!target[key] || typeof target[key] !== 'object') {
            target[key] = {};
          }
          target = target[key];
        }

        target[lastKey] = parsedValue;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      setFormData(newFormData);
    }
    setUrlParamsProcessed(true);
  }, [fieldConfigs, formData, searchParams, urlParamsProcessed]);

  // Load lookup options for fields that have lookup config
  useEffect(() => {
    const loadLookupOptions = async () => {
      const lookupFields = fieldConfigs.filter((f) => f.lookup?.preloadOptions);

      for (const field of lookupFields) {
        if (!field.lookup) continue;
        await fetchLookupOptions(field.path, field.lookup);
      }
    };

    loadLookupOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLookupOptions = async (fieldPath: string, lookup: LookupConfig) => {
    setLookupLoading((prev) => ({ ...prev, [fieldPath]: true }));

    try {
      let filter = {};
      if (lookup.filterField && lookup.filterSourceField) {
        const filterValue = getFieldValue(lookup.filterSourceField);
        if (filterValue) {
          filter = { [lookup.filterField]: filterValue };
        }
      }

      const response = await fetch('/api/mongodb/lookup-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: form.id,
          collection: lookup.collection,
          displayField: lookup.displayField,
          valueField: lookup.valueField,
          filter,
        }),
      });

      const data = await response.json();

      if (data.success && data.options) {
        setLookupOptions((prev) => ({
          ...prev,
          [fieldPath]: data.options.map((opt: any) => ({
            value: opt[lookup.valueField],
            label: String(opt[lookup.displayField] || opt[lookup.valueField]),
            raw: opt,
          })),
        }));
      }
    } catch (err) {
      console.error('Failed to fetch lookup options:', err);
    } finally {
      setLookupLoading((prev) => ({ ...prev, [fieldPath]: false }));
    }
  };

  const getFieldValue = (path: string): any => {
    const keys = path.split('.');
    let value = formData;
    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return '';
      }
    }
    return value !== undefined ? value : '';
  };

  const setFieldValue = (path: string, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev };
      const keys = path.split('.');
      const lastKey = keys.pop()!;
      let target = newData;

      for (const key of keys) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        target = target[key];
      }

      target[lastKey] = value;
      return newData;
    });
  };

  // ============================================
  // Bot Protection Helpers
  // ============================================
  const botProtectionConfig = form.botProtection;
  const isBotProtectionEnabled = botProtectionConfig?.enabled ?? false;
  const isHoneypotEnabled = isBotProtectionEnabled && (botProtectionConfig?.honeypot?.enabled ?? true);
  const isTimingEnabled = isBotProtectionEnabled && (botProtectionConfig?.timing?.enabled ?? true);
  const isTurnstileEnabled = isBotProtectionEnabled && botProtectionConfig?.turnstile?.enabled && botProtectionConfig?.turnstile?.siteKey;
  const minSubmitTime = botProtectionConfig?.timing?.minSubmitTime ?? 3;
  const maxSubmitTime = botProtectionConfig?.timing?.maxSubmitTime ?? 3600;

  /**
   * Validates bot protection checks before submission
   * Returns true if the submission appears human, false if bot-like
   */
  const validateBotProtection = useCallback((): { valid: boolean; reason?: string } => {
    if (!isBotProtectionEnabled) {
      return { valid: true };
    }

    // Check honeypot - should be empty
    if (isHoneypotEnabled && honeypotValue.trim() !== '') {
      console.warn('Bot detected: honeypot field filled');
      return { valid: false, reason: 'spam_detected' };
    }

    // Check timing - should be within reasonable bounds
    if (isTimingEnabled) {
      const timeSpent = (Date.now() - formLoadTime) / 1000; // seconds

      if (timeSpent < minSubmitTime) {
        console.warn(`Bot detected: submitted too fast (${timeSpent.toFixed(1)}s < ${minSubmitTime}s)`);
        return { valid: false, reason: 'submitted_too_fast' };
      }

      if (timeSpent > maxSubmitTime) {
        console.warn(`Stale form: submitted too slow (${timeSpent.toFixed(1)}s > ${maxSubmitTime}s)`);
        // Don't block, just log - form might have been left open
      }
    }

    // Check Turnstile token
    if (isTurnstileEnabled) {
      const token = turnstileRef.current?.getToken() || turnstileToken;
      if (!token) {
        console.warn('Bot protection: Turnstile token missing');
        return { valid: false, reason: 'turnstile_required' };
      }
    }

    return { valid: true };
  }, [isBotProtectionEnabled, isHoneypotEnabled, isTimingEnabled, isTurnstileEnabled, honeypotValue, formLoadTime, minSubmitTime, maxSubmitTime, turnstileToken]);

  // ============================================
  // Field Interaction Tracking
  // ============================================

  /**
   * Track when a field is focused (first interaction)
   */
  const trackFieldFocus = useCallback((fieldPath: string) => {
    const now = Date.now();
    setFieldInteractions(prev => {
      const existing = prev[fieldPath] || {};
      return {
        ...prev,
        [fieldPath]: {
          ...existing,
          firstViewedAt: existing.firstViewedAt || now,
          firstFocusAt: existing.firstFocusAt || now,
        }
      };
    });
  }, []);

  /**
   * Track when a field loses focus
   */
  const trackFieldBlur = useCallback((fieldPath: string, hasValue: boolean) => {
    const now = Date.now();
    setFieldInteractions(prev => {
      const existing = prev[fieldPath] || {};
      const focusTime = existing.firstFocusAt ? now - existing.firstFocusAt : 0;
      return {
        ...prev,
        [fieldPath]: {
          ...existing,
          lastBlurAt: now,
          totalFocusTime: (existing.totalFocusTime || 0) + focusTime,
          completed: hasValue,
        }
      };
    });
  }, []);

  /**
   * Track when a field value changes
   */
  const trackFieldChange = useCallback((fieldPath: string) => {
    setFieldInteractions(prev => {
      const existing = prev[fieldPath] || {};
      return {
        ...prev,
        [fieldPath]: {
          ...existing,
          changeCount: (existing.changeCount || 0) + 1,
        }
      };
    });
  }, []);

  // ============================================
  // Auto-save & Draft Recovery
  // ============================================
  const draftSettings = form.draftSettings;
  const isAutoSaveEnabled = draftSettings?.enabled ?? false;
  const autoSaveInterval = (draftSettings?.autoSaveInterval ?? 30) * 1000; // Convert to ms
  const draftTTLDays = draftSettings?.draftTTL ?? 7;

  /**
   * Save current form state as a draft to localStorage
   */
  const saveDraftToLocal = useCallback(() => {
    if (!form.id || typeof window === 'undefined') return;

    const draft: FormDraft = {
      id: `draft_${form.id}_${sessionId}`,
      formId: form.id,
      formVersion: form.currentVersion,
      data: formData,
      currentPage,
      fieldInteractions,
      startedAt: formStartedAt,
      lastSavedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + draftTTLDays * 24 * 60 * 60 * 1000).toISOString(),
      sessionId,
    };

    try {
      localStorage.setItem(`form_draft_${form.id}`, JSON.stringify(draft));
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to save draft to localStorage:', err);
    }
  }, [form.id, form.currentVersion, formData, currentPage, fieldInteractions, formStartedAt, sessionId, draftTTLDays]);

  /**
   * Load draft from localStorage
   */
  const loadDraftFromLocal = useCallback((): FormDraft | null => {
    if (!form.id || typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(`form_draft_${form.id}`);
      if (!stored) return null;

      const draft: FormDraft = JSON.parse(stored);

      // Check if draft has expired
      if (new Date(draft.expiresAt) < new Date()) {
        localStorage.removeItem(`form_draft_${form.id}`);
        return null;
      }

      // Check if draft has any meaningful data
      const hasData = Object.keys(draft.data).some(key => {
        const value = draft.data[key];
        return value !== '' && value !== null && value !== undefined;
      });

      if (!hasData) return null;

      return draft;
    } catch (err) {
      console.error('Failed to load draft from localStorage:', err);
      return null;
    }
  }, [form.id]);

  /**
   * Clear draft from localStorage (after successful submit)
   */
  const clearDraft = useCallback(() => {
    if (!form.id || typeof window === 'undefined') return;

    try {
      localStorage.removeItem(`form_draft_${form.id}`);
      localStorage.removeItem(`form_session_${form.id}`);
    } catch (err) {
      console.error('Failed to clear draft:', err);
    }
  }, [form.id]);

  /**
   * Restore form state from a draft
   */
  const restoreDraft = useCallback((draft: FormDraft) => {
    setFormData(draft.data);
    setCurrentPage(draft.currentPage);
    setFieldInteractions(draft.fieldInteractions || {});
    setShowDraftRecovery(false);
    setRecoveredDraft(null);
  }, []);

  /**
   * Dismiss draft recovery and start fresh
   */
  const dismissDraftRecovery = useCallback(() => {
    clearDraft();
    setShowDraftRecovery(false);
    setRecoveredDraft(null);
  }, [clearDraft]);

  // Check for existing draft on mount
  useEffect(() => {
    if (!isAutoSaveEnabled || !draftSettings?.showRecoveryPrompt) return;

    const draft = loadDraftFromLocal();
    if (draft) {
      setRecoveredDraft(draft);
      setShowDraftRecovery(true);
    }
  }, [isAutoSaveEnabled, draftSettings?.showRecoveryPrompt, loadDraftFromLocal]);

  // Auto-save interval
  useEffect(() => {
    if (!isAutoSaveEnabled) return;

    const interval = setInterval(() => {
      // Only save if there's data and user has interacted
      const hasData = Object.keys(formData).length > 0;
      const hasInteractions = Object.keys(fieldInteractions).length > 0;

      if (hasData || hasInteractions) {
        setIsSaving(true);
        saveDraftToLocal();
        setTimeout(() => setIsSaving(false), 500);
      }
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [isAutoSaveEnabled, autoSaveInterval, formData, fieldInteractions, saveDraftToLocal]);

  // Save on visibility change (user switching tabs/closing)
  useEffect(() => {
    if (!isAutoSaveEnabled || typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveDraftToLocal();
      }
    };

    const handleBeforeUnload = () => {
      saveDraftToLocal();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAutoSaveEnabled, saveDraftToLocal]);

  const validatePage = (pageIndex: number): string[] => {
    const errors: string[] = [];
    const pageFields = isMultiPage && visiblePages[pageIndex]
      ? fieldConfigs.filter((f) => visiblePages[pageIndex].fields.includes(f.path))
      : fieldConfigs;

    for (const field of pageFields) {
      // Check conditional visibility - skip validation for hidden fields
      const isVisible = evaluateConditionalLogic(field.conditionalLogic, formData);
      if (!isVisible) continue;

      const value = getFieldValue(field.path);

      // Check required fields
      if (field.required) {
        if (value === '' || value === undefined || value === null) {
          errors.push(`${field.label} is required`);
          continue; // Skip other validations if field is empty and required
        }
      }

      // Skip validation if field is empty and not required
      if (value === '' || value === undefined || value === null) {
        continue;
      }

      // String length validations
      if (typeof value === 'string') {
        if (field.validation?.minLength !== undefined && value.length < field.validation.minLength) {
          errors.push(`${field.label} must be at least ${field.validation.minLength} characters`);
        }
        if (field.validation?.maxLength !== undefined && value.length > field.validation.maxLength) {
          errors.push(`${field.label} must be no more than ${field.validation.maxLength} characters`);
        }
        // Pattern validation
        if (field.validation?.pattern) {
          try {
            const regex = new RegExp(field.validation.pattern);
            if (!regex.test(value)) {
              errors.push(`${field.label} format is invalid`);
            }
          } catch {
            // Invalid regex, skip validation
          }
        }
      }

      // Number range validations
      if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)) && field.type === 'number')) {
        const numValue = typeof value === 'number' ? value : Number(value);
        if (field.validation?.min !== undefined && numValue < field.validation.min) {
          errors.push(`${field.label} must be at least ${field.validation.min}`);
        }
        if (field.validation?.max !== undefined && numValue > field.validation.max) {
          errors.push(`${field.label} must be no more than ${field.validation.max}`);
        }
      }
    }
    return errors;
  };

  const validateForm = (): boolean => {
    const errors = validatePage(currentPage);
    if (errors.length > 0) {
      setError(errors[0]);
      return false;
    }
    return true;
  };

  const handleNextPage = () => {
    if (multiPageConfig?.validateOnPageChange) {
      const errors = validatePage(currentPage);
      if (errors.length > 0) {
        setPageErrors((prev) => ({ ...prev, [currentPage]: errors }));
        setError(errors[0]);
        return;
      }
    }
    setPageErrors((prev) => ({ ...prev, [currentPage]: [] }));
    setError(null);
    // Set flag to prevent immediate form submission after navigation
    setJustNavigated(true);
    setCurrentPage((prev) => Math.min(prev + 1, visiblePages.length - 1));
    // Clear the flag after a short delay
    setTimeout(() => setJustNavigated(false), 100);
  };

  const handlePrevPage = () => {
    setError(null);
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const handleJumpToPage = (pageIndex: number) => {
    if (!multiPageConfig?.allowJumpToPage) return;
    setError(null);
    setCurrentPage(pageIndex);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent submission if we just navigated to this page
    if (justNavigated) {
      return;
    }

    setError(null);

    // Bot protection validation
    const botCheck = validateBotProtection();
    if (!botCheck.valid) {
      // Show generic error to avoid revealing detection method
      setError('Unable to submit form. Please try again.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const document: Record<string, any> = {};

      for (const field of fieldConfigs) {
        if (field.includeInDocument === false) continue;

        const value = getFieldValue(field.path);
        if (value !== '' && value !== undefined) {
          const keys = field.path.split('.');
          const lastKey = keys.pop()!;
          let target = document;

          for (const key of keys) {
            if (!target[key]) target[key] = {};
            target = target[key];
          }

          target[lastKey] = value;
        }
      }

      // Include bot protection metadata for server-side verification
      const submissionData = {
        ...document,
        _botProtection: isBotProtectionEnabled ? {
          honeypotField: honeypotFieldName,
          honeypotValue: honeypotValue,
          formLoadTime: formLoadTime,
          submitTime: Date.now(),
          timeSpent: Math.round((Date.now() - formLoadTime) / 1000),
          turnstileToken: isTurnstileEnabled ? (turnstileRef.current?.getToken() || turnstileToken) : undefined,
        } : undefined,
        _fieldInteractions: Object.keys(fieldInteractions).length > 0 ? fieldInteractions : undefined,
        _formMeta: {
          sessionId,
          startedAt: formStartedAt,
          submittedAt: new Date().toISOString(),
        },
      };

      await onSubmit(submissionData);

      // Clear draft on successful submission
      clearDraft();
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Render layout elements (non-data display)
  const renderLayoutField = (layout: LayoutConfig) => {
    switch (layout.type) {
      case 'section-header':
        return (
          <Box
            sx={{
              py: 2,
              borderBottom: '2px solid',
              borderColor: layout.borderColor || alpha(theme.primaryColor || '#00ED64', 0.3),
              bgcolor: layout.backgroundColor || 'transparent',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: layout.textColor || 'text.primary',
                mb: layout.subtitle ? 0.5 : 0
              }}
            >
              {layout.title}
            </Typography>
            {layout.subtitle && (
              <Typography
                variant="body2"
                sx={{ color: layout.textColor || 'text.secondary' }}
              >
                {layout.subtitle}
              </Typography>
            )}
          </Box>
        );

      case 'description':
        return (
          <Box
            sx={{
              py: 1.5,
              px: 2,
              bgcolor: layout.backgroundColor || alpha('#2196f3', 0.05),
              borderRadius: 1,
              borderLeft: '3px solid',
              borderColor: layout.borderColor || '#2196f3',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: layout.textColor || 'text.secondary',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6
              }}
            >
              {layout.content}
            </Typography>
          </Box>
        );

      case 'divider':
        return <Divider sx={{ my: 2, borderColor: layout.borderColor || 'divider' }} />;

      case 'image':
        return (
          <Box
            sx={{
              py: 2,
              display: 'flex',
              justifyContent: layout.imageAlignment || 'center',
            }}
          >
            <Box
              component="img"
              src={layout.imageUrl}
              alt={layout.imageAlt || ''}
              sx={{
                maxWidth: '100%',
                width: layout.imageWidth === 'full'
                  ? '100%'
                  : layout.imageWidth === 'auto' || !layout.imageWidth
                    ? 'auto'
                    : layout.imageWidth,
                height: 'auto',
                borderRadius: 1,
              }}
            />
          </Box>
        );

      case 'spacer':
        return <Box sx={{ height: layout.height || 24 }} />;

      default:
        return null;
    }
  };

  const renderField = (config: FieldConfig) => {
    // Handle layout fields (non-data display elements)
    if (config.layout || LAYOUT_FIELD_TYPES.includes(config.type as LayoutFieldType)) {
      const layoutConfig = config.layout || { type: config.type as LayoutFieldType };
      return renderLayoutField(layoutConfig);
    }

    const value = getFieldValue(config.path);

    // Handle computed fields
    if (config.computed) {
      const computedValue = evaluateFormula(config.computed.formula, formData, fieldConfigs);
      return (
        <TextField
          fullWidth
          label={config.label}
          value={computedValue !== null ? String(computedValue) : ''}
          InputProps={{
            readOnly: true,
            sx: { bgcolor: alpha('#00ED64', 0.05) },
          }}
          helperText="Calculated automatically"
          size="small"
        />
      );
    }

    // Handle lookup fields
    if (config.lookup) {
      const options = lookupOptions[config.path] || [];
      const isLoading = lookupLoading[config.path];

      if (config.lookup.searchable) {
        if (config.lookup.multiple) {
          const selectedValues = Array.isArray(value) ? value : [];
          return (
            <Autocomplete
              multiple
              options={options}
              getOptionLabel={(option) => option.label || ''}
              value={options.filter((opt) => selectedValues.includes(opt.value))}
              onChange={(_, newValue) => {
                const values = (newValue as LookupOption[]).map((v) => v.value);
                setFieldValue(config.path, values);
              }}
              loading={isLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={config.label}
                  required={config.required}
                  placeholder={config.placeholder}
                />
              )}
            />
          );
        }
        return (
          <Autocomplete
            options={options}
            getOptionLabel={(option) => option.label || ''}
            value={options.find((opt) => opt.value === value) || null}
            onChange={(_, newValue) => {
              const opt = newValue as LookupOption | null;
              setFieldValue(config.path, opt?.value ?? '');
            }}
            loading={isLoading}
            renderInput={(params) => (
              <TextField
                {...params}
                label={config.label}
                required={config.required}
                placeholder={config.placeholder}
              />
            )}
          />
        );
      }

      return (
        <FormControl fullWidth>
          <InputLabel>{config.label}</InputLabel>
          <Select
            value={value || ''}
            label={config.label}
            onChange={(e) => setFieldValue(config.path, e.target.value)}
            required={config.required}
            multiple={config.lookup.multiple}
          >
            {options.map((opt) => (
              <MenuItem key={String(opt.value)} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    // Handle URL parameter fields
    if (config.type === 'url-param' || config.urlParam) {
      const urlConfig = config.urlParam;

      // If hidden, don't render anything visible
      if (urlConfig?.hidden) {
        return null;
      }

      // Render as a readonly or editable text field
      const isReadonly = urlConfig?.readonly;
      const paramLabel = urlConfig?.paramName
        ? `${config.label} (from URL: ${urlConfig.paramName})`
        : config.label;

      return (
        <TextField
          fullWidth
          label={paramLabel}
          value={value ?? urlConfig?.defaultValue ?? ''}
          onChange={(e) => !isReadonly && setFieldValue(config.path, e.target.value)}
          InputProps={{
            readOnly: isReadonly,
            sx: isReadonly ? { bgcolor: alpha('#e91e63', 0.05) } : undefined,
          }}
          helperText={isReadonly ? 'Value set from URL parameter' : `URL parameter: ${urlConfig?.paramName || 'not set'}`}
          required={config.required}
          placeholder={config.placeholder}
        />
      );
    }

    // Render by type
    switch (config.type) {
      case 'boolean':
      case 'yes-no':
      case 'yes_no': {
        const yesLabel = config.validation?.yesLabel || 'Yes';
        const noLabel = config.validation?.noLabel || 'No';
        const displayStyle = config.validation?.displayStyle || 'switch';

        // Switch style (default)
        if (displayStyle === 'switch') {
          return (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                {config.label}
                {config.required && <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>}
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(value)}
                    onChange={(e) => setFieldValue(config.path, e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: theme.primaryColor || '#00ED64',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: theme.primaryColor || '#00ED64',
                      },
                    }}
                  />
                }
                label={value ? yesLabel : noLabel}
                sx={{ ml: 0 }}
              />
            </Box>
          );
        }

        // Buttons style (Yes/No toggle buttons)
        if (displayStyle === 'buttons') {
          return (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                {config.label}
                {config.required && <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={yesLabel}
                  onClick={() => setFieldValue(config.path, true)}
                  sx={{
                    cursor: 'pointer',
                    fontWeight: 500,
                    px: 2,
                    bgcolor: value === true ? (theme.primaryColor || '#00ED64') : alpha(theme.primaryColor || '#00ED64', 0.1),
                    color: value === true ? (isDarkMode ? '#000' : '#001E2B') : (theme.primaryColor || '#00ED64'),
                    '&:hover': {
                      bgcolor: value === true ? (theme.primaryColor || '#00ED64') : alpha(theme.primaryColor || '#00ED64', 0.2),
                    },
                  }}
                />
                <Chip
                  label={noLabel}
                  onClick={() => setFieldValue(config.path, false)}
                  sx={{
                    cursor: 'pointer',
                    fontWeight: 500,
                    px: 2,
                    bgcolor: value === false ? (theme.primaryColor || '#00ED64') : alpha(theme.primaryColor || '#00ED64', 0.1),
                    color: value === false ? (isDarkMode ? '#000' : '#001E2B') : (theme.primaryColor || '#00ED64'),
                    '&:hover': {
                      bgcolor: value === false ? (theme.primaryColor || '#00ED64') : alpha(theme.primaryColor || '#00ED64', 0.2),
                    },
                  }}
                />
              </Box>
            </Box>
          );
        }

        // Checkbox style
        if (displayStyle === 'checkbox') {
          return (
            <FormControlLabel
              control={
                <Radio
                  checked={Boolean(value)}
                  onChange={(e) => setFieldValue(config.path, e.target.checked)}
                  sx={{
                    color: alpha(theme.primaryColor || '#00ED64', 0.5),
                    '&.Mui-checked': {
                      color: theme.primaryColor || '#00ED64',
                    },
                  }}
                />
              }
              label={config.label}
            />
          );
        }

        // Fallback: basic switch
        return (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(e) => setFieldValue(config.path, e.target.checked)}
              />
            }
            label={config.label}
          />
        );
      }

      case 'rating':
      case 'scale':
      case 'number': {
        const minVal = config.validation?.min;
        const maxVal = config.validation?.max;
        const displayStyle = config.validation?.scaleDisplayStyle;
        const step = config.validation?.step || 1;
        const showValue = config.validation?.showValue !== false;
        const lowLabel = config.validation?.lowLabel;
        const highLabel = config.validation?.highLabel;

        // Check if this is a scale/rating field (has min/max defined with reasonable range)
        const isScale = minVal !== undefined && maxVal !== undefined && (maxVal - minVal) <= 100;

        // Slider display style
        if (isScale && displayStyle === 'slider') {
          const currentValue = typeof value === 'number' ? value : minVal;
          return (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                {config.label}
                {config.required && <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>}
              </Typography>
              <Box sx={{ px: 1 }}>
                {/* Labels for endpoints */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {lowLabel || minVal}
                  </Typography>
                  {showValue && (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: theme.primaryColor || '#00ED64' }}>
                      {currentValue}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {highLabel || maxVal}
                  </Typography>
                </Box>
                <Slider
                  value={currentValue}
                  min={minVal}
                  max={maxVal}
                  step={step}
                  marks
                  valueLabelDisplay={showValue ? 'auto' : 'off'}
                  onChange={(_, newValue) => setFieldValue(config.path, newValue as number)}
                  sx={{
                    color: theme.primaryColor || '#00ED64',
                    '& .MuiSlider-thumb': {
                      bgcolor: theme.primaryColor || '#00ED64',
                      '&:hover, &.Mui-focusVisible': {
                        boxShadow: `0 0 0 8px ${alpha(theme.primaryColor || '#00ED64', 0.16)}`,
                      },
                    },
                    '& .MuiSlider-track': {
                      bgcolor: theme.primaryColor || '#00ED64',
                    },
                    '& .MuiSlider-rail': {
                      bgcolor: alpha(theme.primaryColor || '#00ED64', 0.3),
                    },
                    '& .MuiSlider-mark': {
                      bgcolor: alpha(theme.primaryColor || '#00ED64', 0.5),
                    },
                    '& .MuiSlider-valueLabel': {
                      bgcolor: theme.primaryColor || '#00ED64',
                      color: isDarkMode ? '#000' : '#001E2B',
                    },
                  }}
                />
              </Box>
            </Box>
          );
        }

        // Radio buttons display style
        if (isScale && displayStyle === 'radio') {
          const options = Array.from({ length: maxVal - minVal + 1 }, (_, i) => minVal + i);
          return (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                {config.label}
                {config.required && <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>}
              </Typography>
              {/* Labels for endpoints */}
              {(lowLabel || highLabel) && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">{lowLabel}</Typography>
                  <Typography variant="caption" color="text.secondary">{highLabel}</Typography>
                </Box>
              )}
              <RadioGroup
                value={value ?? ''}
                onChange={(e) => setFieldValue(config.path, Number(e.target.value))}
                sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}
              >
                {options.map((opt) => (
                  <FormControlLabel
                    key={opt}
                    value={opt}
                    control={
                      <Radio
                        size="small"
                        sx={{
                          color: alpha(theme.primaryColor || '#00ED64', 0.5),
                          '&.Mui-checked': {
                            color: theme.primaryColor || '#00ED64',
                          },
                        }}
                      />
                    }
                    label={opt}
                    sx={{
                      m: 0,
                      '& .MuiFormControlLabel-label': {
                        fontSize: '0.875rem',
                      },
                    }}
                  />
                ))}
              </RadioGroup>
            </Box>
          );
        }

        // Number buttons display style (default for scales)
        if (isScale && (!displayStyle || displayStyle === 'buttons')) {
          const options = Array.from({ length: maxVal - minVal + 1 }, (_, i) => minVal + i);
          return (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                {config.label}
                {config.required && <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>}
              </Typography>
              {/* Labels for endpoints */}
              {(lowLabel || highLabel) && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">{lowLabel}</Typography>
                  <Typography variant="caption" color="text.secondary">{highLabel}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {options.map((opt) => (
                  <Chip
                    key={opt}
                    label={opt}
                    onClick={() => setFieldValue(config.path, opt)}
                    sx={{
                      cursor: 'pointer',
                      fontWeight: 500,
                      bgcolor: value === opt ? (theme.primaryColor || '#00ED64') : alpha(theme.primaryColor || '#00ED64', 0.1),
                      color: value === opt ? (isDarkMode ? '#000' : '#001E2B') : (theme.primaryColor || '#00ED64'),
                      '&:hover': {
                        bgcolor: value === opt ? (theme.primaryColor || '#00ED64') : alpha(theme.primaryColor || '#00ED64', 0.2),
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          );
        }

        // Default number input (for non-scale numbers or very large ranges)
        return (
          <TextField
            fullWidth
            type="number"
            label={config.label}
            placeholder={config.placeholder}
            value={value ?? ''}
            onChange={(e) => {
              const numVal = e.target.value === '' ? '' : Number(e.target.value);
              setFieldValue(config.path, numVal);
            }}
            required={config.required}
            inputProps={{
              min: config.validation?.min,
              max: config.validation?.max,
            }}
          />
        );
      }

      case 'nps': {
        // NPS (Net Promoter Score) - 0-10 scale with color-coded segments
        const npsColors = {
          detractor: '#ef4444',  // Red (0-6)
          passive: '#f59e0b',    // Orange/Yellow (7-8)
          promoter: '#22c55e',   // Green (9-10)
        };
        const lowLabel = config.validation?.lowLabel || 'Not at all likely';
        const highLabel = config.validation?.highLabel || 'Extremely likely';
        const currentValue = typeof value === 'number' ? value : null;

        const getNPSColor = (score: number) => {
          if (score <= 6) return npsColors.detractor;
          if (score <= 8) return npsColors.passive;
          return npsColors.promoter;
        };

        return (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
              {config.label}
              {config.required && <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>}
            </Typography>
            {/* NPS Scale 0-10 */}
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center', mb: 1 }}>
              {Array.from({ length: 11 }, (_, i) => i).map((score) => {
                const isSelected = currentValue === score;
                const scoreColor = getNPSColor(score);
                return (
                  <Chip
                    key={score}
                    label={score}
                    onClick={() => setFieldValue(config.path, score)}
                    sx={{
                      cursor: 'pointer',
                      fontWeight: 600,
                      minWidth: 36,
                      bgcolor: isSelected ? scoreColor : alpha(scoreColor, 0.1),
                      color: isSelected ? '#fff' : scoreColor,
                      '&:hover': {
                        bgcolor: isSelected ? scoreColor : alpha(scoreColor, 0.2),
                      },
                    }}
                  />
                );
              })}
            </Box>
            {/* Endpoint labels */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
              <Typography variant="caption" sx={{ color: npsColors.detractor, fontWeight: 500 }}>
                {lowLabel}
              </Typography>
              <Typography variant="caption" sx={{ color: npsColors.promoter, fontWeight: 500 }}>
                {highLabel}
              </Typography>
            </Box>
            {/* Category labels */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5, px: 0.5 }}>
              <Typography variant="caption" sx={{ color: npsColors.detractor, opacity: 0.7 }}>
                Detractors (0-6)
              </Typography>
              <Typography variant="caption" sx={{ color: npsColors.passive, opacity: 0.7 }}>
                Passives (7-8)
              </Typography>
              <Typography variant="caption" sx={{ color: npsColors.promoter, opacity: 0.7 }}>
                Promoters (9-10)
              </Typography>
            </Box>
          </Box>
        );
      }

      case 'date':
        return (
          <TextField
            fullWidth
            type="date"
            label={config.label}
            value={value || ''}
            onChange={(e) => setFieldValue(config.path, e.target.value)}
            required={config.required}
            InputLabelProps={{ shrink: true }}
          />
        );

      case 'email':
        return (
          <TextField
            fullWidth
            type="email"
            label={config.label}
            placeholder={config.placeholder}
            value={value || ''}
            onChange={(e) => setFieldValue(config.path, e.target.value)}
            required={config.required}
          />
        );

      case 'url':
        return (
          <TextField
            fullWidth
            type="url"
            label={config.label}
            placeholder={config.placeholder}
            value={value || ''}
            onChange={(e) => setFieldValue(config.path, e.target.value)}
            required={config.required}
          />
        );

      case 'array':
      case 'array-object': {
        const arrayValue = Array.isArray(value) ? value : [];
        const arrayPattern = config.arrayPattern?.pattern;

        // Key-Value pattern (Attribute Pattern)
        if (arrayPattern === 'key-value' || (config.type === 'array-object' && isKeyValueArray(arrayValue))) {
          const { keyField, valueField } = config.arrayPattern
            ? { keyField: config.arrayPattern.keyField || 'key', valueField: config.arrayPattern.valueField || 'value' }
            : detectKeyValueFields(arrayValue);
          const keyLabel = config.arrayPattern?.keyLabel || 'Key';
          const valueLabel = config.arrayPattern?.valueLabel || 'Value';

          return (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                {config.label}
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: `${theme.borderRadius || 8}px`,
                  overflow: 'hidden'
                }}
              >
                {/* Header */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 40px',
                    gap: 1,
                    p: 1,
                    bgcolor: alpha(theme.primaryColor || '#00ED64', 0.05),
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>{keyLabel}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>{valueLabel}</Typography>
                  <Box />
                </Box>
                {/* Rows */}
                {arrayValue.map((item, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 40px',
                      gap: 1,
                      p: 1,
                      borderBottom: index < arrayValue.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: alpha(theme.primaryColor || '#00ED64', 0.02) }
                    }}
                  >
                    <TextField
                      size="small"
                      variant="standard"
                      value={item[keyField] || ''}
                      onChange={(e) => {
                        const newArr = [...arrayValue];
                        newArr[index] = { ...newArr[index], [keyField]: e.target.value };
                        setFieldValue(config.path, newArr);
                      }}
                      InputProps={{ disableUnderline: true }}
                    />
                    <TextField
                      size="small"
                      variant="standard"
                      value={item[valueField] ?? ''}
                      onChange={(e) => {
                        const newArr = [...arrayValue];
                        newArr[index] = { ...newArr[index], [valueField]: e.target.value };
                        setFieldValue(config.path, newArr);
                      }}
                      InputProps={{ disableUnderline: true }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Button
                        size="small"
                        onClick={() => {
                          const newArr = arrayValue.filter((_, i) => i !== index);
                          setFieldValue(config.path, newArr);
                        }}
                        sx={{ minWidth: 'auto', p: 0.5, color: 'text.secondary' }}
                      >
                        <Delete fontSize="small" />
                      </Button>
                    </Box>
                  </Box>
                ))}
                {/* Add row */}
                <Box sx={{ p: 1, bgcolor: alpha(theme.primaryColor || '#00ED64', 0.03) }}>
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => {
                      setFieldValue(config.path, [...arrayValue, { [keyField]: '', [valueField]: '' }]);
                    }}
                    sx={{ color: theme.primaryColor || '#00ED64' }}
                  >
                    Add {config.label?.replace(/s$/, '') || 'Item'}
                  </Button>
                </Box>
              </Paper>
            </Box>
          );
        }

        // Default: Simple tags/chips input for primitive arrays
        return (
          <TextField
            fullWidth
            label={config.label}
            placeholder={config.placeholder || 'Enter comma-separated values'}
            value={arrayValue.join(', ')}
            onChange={(e) => {
              const arrayVal = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
              setFieldValue(config.path, arrayVal);
            }}
            required={config.required}
            helperText="Separate values with commas"
          />
        );
      }

      case 'file_upload':
      case 'file-upload':
      case 'image_upload':
      case 'image-upload': {
        const isImageOnly = config.type === 'image_upload' || config.type === 'image-upload';
        const acceptTypes = isImageOnly
          ? 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml'
          : config.validation?.allowedTypes?.join(',') || '*/*';
        const maxSize = config.validation?.maxSize || (isImageOnly ? 10 : 25); // MB
        const multiple = config.validation?.multiple || false;

        // Value is an array of uploaded file objects: { url, name, size, type }
        const uploadedFiles = Array.isArray(value) ? value : (value ? [value] : []);

        const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const selectedFiles = e.target.files;
          if (!selectedFiles || selectedFiles.length === 0) return;

          const newFiles: Array<{ url: string; name: string; size: number; type: string; uploading?: boolean }> = [];

          for (const file of Array.from(selectedFiles)) {
            // Validate file size
            if (file.size > maxSize * 1024 * 1024) {
              alert(`File "${file.name}" exceeds maximum size of ${maxSize}MB`);
              continue;
            }

            // Validate file type for images
            if (isImageOnly && !file.type.startsWith('image/')) {
              alert(`File "${file.name}" is not an image`);
              continue;
            }

            // Convert to base64 for storage (for now - can be enhanced to use blob storage)
            try {
              const base64 = await fileToBase64(file);
              newFiles.push({
                url: base64,
                name: file.name,
                size: file.size,
                type: file.type,
              });
            } catch (err) {
              console.error('Failed to read file:', err);
            }
          }

          if (newFiles.length > 0) {
            if (multiple) {
              setFieldValue(config.path, [...uploadedFiles, ...newFiles]);
            } else {
              setFieldValue(config.path, newFiles[0]);
            }
          }

          // Reset input
          e.target.value = '';
        };

        const removeFile = (index: number) => {
          if (multiple) {
            const newFiles = uploadedFiles.filter((_, i) => i !== index);
            setFieldValue(config.path, newFiles.length > 0 ? newFiles : null);
          } else {
            setFieldValue(config.path, null);
          }
        };

        return (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
              {config.label}
              {config.required && <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>}
            </Typography>

            {/* Upload Area */}
            <Box
              component="label"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: `${theme.borderRadius || 8}px`,
                bgcolor: alpha(theme.primaryColor || '#00ED64', 0.02),
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: theme.primaryColor || '#00ED64',
                  bgcolor: alpha(theme.primaryColor || '#00ED64', 0.05),
                },
              }}
            >
              <input
                type="file"
                accept={acceptTypes}
                multiple={multiple}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <CloudUpload sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {config.placeholder || 'Click to upload or drag and drop'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isImageOnly ? 'Images only' : 'All files'} • Max {maxSize}MB
                {multiple && ' • Multiple files allowed'}
              </Typography>
            </Box>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {uploadedFiles.map((file, index) => (
                  <Paper
                    key={index}
                    elevation={0}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: `${theme.borderRadius || 8}px`,
                    }}
                  >
                    {/* Preview for images */}
                    {file.type?.startsWith('image/') && file.url ? (
                      <Box
                        component="img"
                        src={file.url}
                        alt={file.name}
                        sx={{
                          width: 48,
                          height: 48,
                          objectFit: 'cover',
                          borderRadius: 1,
                        }}
                      />
                    ) : (
                      <InsertDriveFile sx={{ fontSize: 40, color: 'text.secondary' }} />
                    )}

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                        {file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(file.size)}
                      </Typography>
                    </Box>

                    <Button
                      size="small"
                      onClick={() => removeFile(index)}
                      sx={{ minWidth: 'auto', p: 0.5, color: 'text.secondary' }}
                    >
                      <Close fontSize="small" />
                    </Button>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        );
      }

      default:
        return (
          <TextField
            fullWidth
            label={config.label}
            placeholder={config.placeholder}
            value={value || ''}
            onChange={(e) => setFieldValue(config.path, e.target.value)}
            required={config.required}
            multiline={(value?.length || 0) > 100}
            rows={(value?.length || 0) > 100 ? 4 : 1}
            inputProps={{
              maxLength: config.validation?.maxLength,
            }}
          />
        );
    }
  };

  // Render step indicator based on style
  const renderStepIndicator = () => {
    if (!isMultiPage || !multiPageConfig?.showStepIndicator) return null;

    const style = multiPageConfig?.stepIndicatorStyle || 'numbers';
    const progress = ((currentPage + 1) / visiblePages.length) * 100;

    switch (style) {
      case 'progress':
        return (
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ color: theme.textSecondaryColor }}>
                Step {currentPage + 1} of {visiblePages.length}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.textSecondaryColor }}>
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: `${theme.borderRadius || 8}px`,
                bgcolor: alpha(theme.primaryColor || '#00ED64', 0.1),
                '& .MuiLinearProgress-bar': {
                  bgcolor: theme.primaryColor || '#00ED64',
                  borderRadius: `${theme.borderRadius || 8}px`,
                },
              }}
            />
          </Box>
        );

      case 'dots':
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 4 }}>
            {visiblePages.map((_, index) => (
              <Box
                key={index}
                onClick={() => multiPageConfig?.allowJumpToPage && handleJumpToPage(index)}
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: index === currentPage ? (theme.primaryColor || '#00ED64') : alpha(theme.primaryColor || '#00ED64', 0.2),
                  cursor: multiPageConfig?.allowJumpToPage ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  '&:hover': multiPageConfig?.allowJumpToPage
                    ? { transform: 'scale(1.2)' }
                    : {},
                }}
              />
            ))}
          </Box>
        );

      case 'tabs':
        return (
          <Tabs
            value={currentPage}
            onChange={(_, v) => multiPageConfig?.allowJumpToPage && handleJumpToPage(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 4 }}
          >
            {visiblePages.map((page, index) => (
              <Tab
                key={page.id}
                label={page.title}
                disabled={!multiPageConfig?.allowJumpToPage && index !== currentPage}
              />
            ))}
          </Tabs>
        );

      case 'numbers':
      default:
        return (
          <Stepper
            activeStep={currentPage}
            alternativeLabel
            sx={{ mb: 4 }}
          >
            {visiblePages.map((page, index) => (
              <Step
                key={page.id}
                completed={index < currentPage}
              >
                {multiPageConfig?.allowJumpToPage ? (
                  <StepButton onClick={() => handleJumpToPage(index)}>
                    {page.title}
                  </StepButton>
                ) : (
                  <StepLabel>{page.title}</StepLabel>
                )}
              </Step>
            ))}
          </Stepper>
        );
    }
  };

  // Theme-based button styles
  const primaryButtonSx = {
    background: theme.primaryColor ? `linear-gradient(135deg, ${theme.primaryColor} 0%, ${alpha(theme.primaryColor, 0.8)} 100%)` : 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
    color: isDarkMode ? '#000' : '#001E2B',
    fontWeight: 600,
    borderRadius: `${theme.buttonBorderRadius || theme.borderRadius || 8}px`,
    '&:hover': {
      background: theme.primaryColor ? `linear-gradient(135deg, ${alpha(theme.primaryColor, 0.9)} 0%, ${alpha(theme.primaryColor, 0.7)} 100%)` : 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
    },
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: `${theme.inputBorderRadius || theme.borderRadius || 8}px`,
      fontFamily: theme.fontFamily,
    },
    '& .MuiFilledInput-root': {
      borderRadius: `${theme.inputBorderRadius || theme.borderRadius || 8}px`,
      bgcolor: theme.surfaceColor,
    },
    '& .MuiInputLabel-root': {
      fontFamily: theme.fontFamily,
    },
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        fontFamily: theme.fontFamily,
        color: theme.textColor,
        ...(theme.glassmorphism && {
          '& .MuiPaper-root': {
            backdropFilter: 'blur(10px)',
            bgcolor: alpha(theme.surfaceColor || '#fff', 0.8),
          },
        }),
      }}
    >
      {/* Draft Recovery Dialog */}
      {showDraftRecovery && recoveredDraft && (
        <Alert
          severity="info"
          sx={{
            mb: getSpacing(),
            borderRadius: `${theme.borderRadius || 8}px`,
          }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                color="inherit"
                onClick={() => restoreDraft(recoveredDraft)}
              >
                Resume
              </Button>
              <Button
                size="small"
                color="inherit"
                onClick={dismissDraftRecovery}
              >
                Start Fresh
              </Button>
            </Box>
          }
        >
          You have unsaved progress from{' '}
          {new Date(recoveredDraft.lastSavedAt).toLocaleString()}.
        </Alert>
      )}

      {/* Auto-save Indicator */}
      {isAutoSaveEnabled && draftSettings?.showSaveIndicator && lastSaved && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'right',
            color: 'text.secondary',
            mb: 1,
            opacity: isSaving ? 1 : 0.7,
          }}
        >
          {isSaving ? 'Saving...' : `Saved ${lastSaved.toLocaleTimeString()}`}
        </Typography>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: getSpacing(),
            borderRadius: `${theme.borderRadius || 8}px`,
          }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Honeypot Field - Hidden from humans, visible to bots */}
      {isHoneypotEnabled && (
        <Box
          sx={{
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            opacity: 0,
            height: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <TextField
            name={honeypotFieldName}
            value={honeypotValue}
            onChange={(e) => setHoneypotValue(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            placeholder="Leave this field empty"
          />
        </Box>
      )}

      {/* Turnstile CAPTCHA Widget */}
      {isTurnstileEnabled && botProtectionConfig?.turnstile?.siteKey && (
        <TurnstileWidget
          ref={turnstileRef}
          siteKey={botProtectionConfig.turnstile.siteKey}
          theme={botProtectionConfig.turnstile.theme || (isDarkMode ? 'dark' : 'light')}
          appearance={botProtectionConfig.turnstile.appearance || 'always'}
          action={botProtectionConfig.turnstile.action}
          onSuccess={setTurnstileToken}
          onExpired={() => setTurnstileToken(undefined)}
        />
      )}

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Page Title and Description */}
      {isMultiPage && multiPageConfig?.showPageTitles && currentPageData && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {currentPageData.title}
          </Typography>
          {currentPageData.description && (
            <Typography variant="body2" color="text.secondary">
              {currentPageData.description}
            </Typography>
          )}
        </Box>
      )}

      {/* Form Fields */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: getSpacing() }}>
        {currentPageFields.map((config, index) => {
          const isVisible = evaluateConditionalLogic(config.conditionalLogic, formData);
          const isEncrypted = config.encryption?.enabled;

          return (
            <Collapse key={config.path} in={isVisible} unmountOnExit>
              <Box sx={inputSx}>
                {/* Encryption indicator for sensitive fields */}
                {isEncrypted && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mb: 0.5,
                    }}
                  >
                    <Lock sx={{ fontSize: 14, color: 'success.main' }} />
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'success.main',
                        fontWeight: 500,
                        fontSize: '0.7rem',
                      }}
                    >
                      Encrypted field
                    </Typography>
                  </Box>
                )}
                {renderField(config)}
                {index < currentPageFields.length - 1 && <Divider sx={{ mt: getSpacing() }} />}
              </Box>
            </Collapse>
          );
        })}
      </Box>

      {/* Navigation Buttons */}
      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'space-between' }}>
        {isMultiPage && !isFirstPage ? (
          <Button
            key="prev-button"
            type="button"
            variant="outlined"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handlePrevPage();
            }}
            startIcon={<ArrowBack />}
            sx={{
              flex: 1,
              borderRadius: `${theme.buttonBorderRadius || theme.borderRadius || 8}px`,
              borderColor: theme.primaryColor,
              color: theme.primaryColor,
            }}
          >
            {currentPageData?.prevLabel || 'Previous'}
          </Button>
        ) : (
          <Box sx={{ flex: 1 }} />
        )}

        {isMultiPage && !isLastPage ? (
          <Button
            key="next-button"
            type="button"
            variant="contained"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNextPage();
            }}
            endIcon={<ArrowForward />}
            sx={{
              flex: 1,
              ...primaryButtonSx,
            }}
          >
            {currentPageData?.nextLabel || 'Next'}
          </Button>
        ) : (
          <Button
            key="submit-button"
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting}
            endIcon={submitting ? undefined : <Check />}
            sx={{
              flex: 1,
              py: 1.5,
              ...primaryButtonSx,
            }}
          >
            {submitting ? (
              <CircularProgress size={24} sx={{ color: isDarkMode ? '#000' : '#fff' }} />
            ) : (
              multiPageConfig?.submitButtonLabel || 'Submit'
            )}
          </Button>
        )}
      </Box>
    </Box>
  );
}
