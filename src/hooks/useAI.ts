/**
 * AI Service React Hooks
 *
 * Custom hooks for integrating AI features into React components.
 */

import { useState, useCallback } from 'react';
import { FormConfiguration, FieldConfig, ConditionalLogic } from '@/types/form';
import {
  GenerateFormResponse,
  FieldSuggestionResponse,
  GenerateFormulaResponse,
  GenerateValidationResponse,
  GenerateConditionalLogicResponse,
  GenerateWorkflowResponse,
  GeneratedWorkflow,
} from '@/lib/ai/types';

// ============================================
// Types
// ============================================

interface UseAIState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseAIFormGeneratorReturn extends UseAIState<Partial<FormConfiguration>> {
  generateForm: (prompt: string, context?: any, options?: any) => Promise<void>;
  reset: () => void;
  suggestions: string[];
  confidence: number;
}

interface UseAIFieldSuggestionsReturn extends UseAIState<FieldSuggestionResponse> {
  suggestFields: (currentForm: Partial<FormConfiguration>, limit?: number) => Promise<void>;
  reset: () => void;
}

interface UseAIFormulaReturn extends UseAIState<GenerateFormulaResponse> {
  generateFormula: (
    description: string,
    availableFields: Array<{ path: string; label: string; type: string }>,
    outputType?: string
  ) => Promise<void>;
  explainFormula: (
    formula: string,
    availableFields: Array<{ path: string; label: string; type: string }>
  ) => Promise<string | null>;
  reset: () => void;
}

interface UseAIValidationReturn extends UseAIState<GenerateValidationResponse> {
  generateValidation: (
    field: { path: string; label: string; type?: string },
    description: string
  ) => Promise<void>;
  reset: () => void;
}

interface UseAIConditionalLogicReturn extends UseAIState<GenerateConditionalLogicResponse> {
  generateConditionalLogic: (
    description: string,
    availableFields: Array<{ path: string; label: string; type: string; options?: string[] }>,
    action?: 'show' | 'hide'
  ) => Promise<void>;
  reset: () => void;
}

// ============================================
// API Helper
// ============================================

async function fetchAI<T>(endpoint: string, body: any): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'AI service request failed');
  }

  return data;
}

// ============================================
// Hooks
// ============================================

/**
 * Hook for AI-powered form generation
 */
export function useAIFormGenerator(): UseAIFormGeneratorReturn {
  const [data, setData] = useState<Partial<FormConfiguration> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(0);

  const generateForm = useCallback(
    async (prompt: string, context?: any, options?: any) => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchAI<GenerateFormResponse>('/api/ai/generate-form', {
          prompt,
          context,
          options,
        });

        setData(result.form || null);
        setSuggestions(result.suggestions || []);
        setConfidence(result.confidence);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate form');
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setSuggestions([]);
    setConfidence(0);
  }, []);

  return { data, loading, error, generateForm, reset, suggestions, confidence };
}

/**
 * Hook for AI-powered field suggestions
 */
export function useAIFieldSuggestions(): UseAIFieldSuggestionsReturn {
  const [data, setData] = useState<FieldSuggestionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestFields = useCallback(
    async (currentForm: Partial<FormConfiguration>, limit: number = 5) => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchAI<FieldSuggestionResponse>('/api/ai/suggest-fields', {
          currentForm,
          limit,
        });

        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get field suggestions');
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, suggestFields, reset };
}

/**
 * Hook for AI-powered formula generation
 */
export function useAIFormula(): UseAIFormulaReturn {
  const [data, setData] = useState<GenerateFormulaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateFormula = useCallback(
    async (
      description: string,
      availableFields: Array<{ path: string; label: string; type: string }>,
      outputType?: string
    ) => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchAI<GenerateFormulaResponse>('/api/ai/generate-formula', {
          description,
          availableFields,
          outputType,
        });

        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate formula');
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const explainFormula = useCallback(
    async (
      formula: string,
      availableFields: Array<{ path: string; label: string; type: string }>
    ): Promise<string | null> => {
      try {
        const response = await fetch('/api/ai/explain-formula', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formula, availableFields }),
        });

        const data = await response.json();
        return data.success ? data.explanation : null;
      } catch {
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, generateFormula, explainFormula, reset };
}

/**
 * Hook for AI-powered validation generation
 */
export function useAIValidation(): UseAIValidationReturn {
  const [data, setData] = useState<GenerateValidationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateValidation = useCallback(
    async (
      field: { path: string; label: string; type?: string },
      description: string
    ) => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchAI<GenerateValidationResponse>('/api/ai/generate-validation', {
          field,
          description,
        });

        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate validation');
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, generateValidation, reset };
}

/**
 * Hook for AI-powered conditional logic generation
 */
export function useAIConditionalLogic(): UseAIConditionalLogicReturn {
  const [data, setData] = useState<GenerateConditionalLogicResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateConditionalLogic = useCallback(
    async (
      description: string,
      availableFields: Array<{ path: string; label: string; type: string; options?: string[] }>,
      action: 'show' | 'hide' = 'show'
    ) => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchAI<GenerateConditionalLogicResponse>(
          '/api/ai/generate-conditional-logic',
          {
            description,
            availableFields,
            action,
          }
        );

        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate conditional logic');
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, generateConditionalLogic, reset };
}

/**
 * Hook to check AI service availability
 */
export function useAIStatus() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai');
      const data = await response.json();
      setAvailable(data.status === 'available');
    } catch {
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  return { available, loading, checkStatus };
}

// ============================================
// Workflow Generation Hooks
// ============================================

interface UseAIWorkflowGeneratorReturn extends UseAIState<GeneratedWorkflow> {
  generateWorkflow: (
    prompt: string,
    context?: {
      industry?: string;
      availableForms?: Array<{ id: string; name: string }>;
      availableConnections?: Array<{ id: string; name: string; type: string }>;
    },
    options?: {
      maxNodes?: number;
      preferredTrigger?: 'manual' | 'form' | 'webhook' | 'schedule';
      includeAINodes?: boolean;
    }
  ) => Promise<void>;
  reset: () => void;
  suggestions: string[];
  confidence: number;
}

/**
 * Hook for AI-powered workflow generation
 */
export function useAIWorkflowGenerator(): UseAIWorkflowGeneratorReturn {
  const [data, setData] = useState<GeneratedWorkflow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(0);

  const generateWorkflow = useCallback(
    async (
      prompt: string,
      context?: {
        industry?: string;
        availableForms?: Array<{ id: string; name: string }>;
        availableConnections?: Array<{ id: string; name: string; type: string }>;
      },
      options?: {
        maxNodes?: number;
        preferredTrigger?: 'manual' | 'form' | 'webhook' | 'schedule';
        includeAINodes?: boolean;
      }
    ) => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchAI<GenerateWorkflowResponse>('/api/ai/generate-workflow', {
          prompt,
          context,
          options,
        });

        setData(result.workflow || null);
        setSuggestions(result.suggestions || []);
        setConfidence(result.confidence);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate workflow');
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setSuggestions([]);
    setConfidence(0);
  }, []);

  return { data, loading, error, generateWorkflow, reset, suggestions, confidence };
}
