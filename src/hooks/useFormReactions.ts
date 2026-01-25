'use client';

/**
 * useFormReactions Hook
 *
 * Client-side React hook for managing form reactions.
 * Handles debouncing, execution, state management, and field updates.
 *
 * Phase 1: Manual trigger only - triggerReaction() must be called explicitly.
 * Phase 3 will add automatic field event listeners.
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type {
  FormReaction,
  FieldEvent,
  ReactionExecutionResult,
} from '@/types/reactions';

/**
 * State for a single reaction
 */
export interface ReactionState {
  status: 'idle' | 'pending' | 'success' | 'error';
  lastExecuted?: Date;
  lastResult?: ReactionExecutionResult;
  error?: {
    message: string;
    code: string;
  };
}

/**
 * Error from a reaction execution
 */
export interface ReactionError {
  message: string;
  code: string;
  reactionId: string;
}

/**
 * Options for the useFormReactions hook
 */
export interface UseFormReactionsOptions {
  /** Form ID */
  formId: string;

  /** Organization ID */
  orgId: string;

  /** Reactions configured on the form */
  reactions: FormReaction[];

  /** Current form data (should be kept in sync with form state) */
  formData: Record<string, unknown>;

  /** Callback to update form fields with reaction results */
  onFieldUpdate: (updates: Record<string, unknown>) => void;

  /** Optional: Callback when a reaction starts executing */
  onReactionStart?: (reactionId: string) => void;

  /** Optional: Callback when a reaction completes successfully */
  onReactionComplete?: (reactionId: string, result: ReactionExecutionResult) => void;

  /** Optional: Callback when a reaction fails */
  onReactionError?: (reactionId: string, error: ReactionError) => void;
}

/**
 * Return type for the useFormReactions hook
 */
export interface UseFormReactionsReturn {
  /**
   * Current state of each reaction, keyed by reaction ID.
   */
  reactionStates: Record<string, ReactionState>;

  /**
   * Fields currently being updated by reactions.
   * Useful for showing loading indicators on specific fields.
   */
  pendingFields: string[];

  /**
   * Fields that were recently updated by reactions.
   * Useful for highlight animation.
   */
  recentlyUpdatedFields: string[];

  /**
   * Manually trigger a reaction.
   * In Phase 1, this must be called explicitly.
   * Phase 3 will add automatic triggering on field events.
   */
  triggerReaction: (
    reactionId: string,
    context?: {
      triggerField?: string;
      triggerEvent?: FieldEvent;
    }
  ) => Promise<void>;

  /**
   * Cancel a pending reaction.
   */
  cancelReaction: (reactionId: string) => void;

  /**
   * Check if a field has any reactions attached to it.
   */
  hasReaction: (fieldPath: string) => boolean;

  /**
   * Get all reactions configured for a specific field.
   */
  getFieldReactions: (fieldPath: string) => FormReaction[];

  /**
   * Get all enabled reactions.
   */
  enabledReactions: FormReaction[];
}

/**
 * Hook for managing form reactions
 */
export function useFormReactions(options: UseFormReactionsOptions): UseFormReactionsReturn {
  const {
    formId,
    orgId,
    reactions,
    formData,
    onFieldUpdate,
    onReactionStart,
    onReactionComplete,
    onReactionError,
  } = options;

  // State for tracking reaction execution status
  const [reactionStates, setReactionStates] = useState<Record<string, ReactionState>>({});
  const [pendingFields, setPendingFields] = useState<string[]>([]);
  const [recentlyUpdatedFields, setRecentlyUpdatedFields] = useState<string[]>([]);

  // Refs for managing abort controllers and debounce timers
  const abortControllers = useRef<Record<string, AbortController>>({});
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Cancel all pending requests
      Object.values(abortControllers.current).forEach((controller) => {
        controller.abort();
      });
      // Clear all debounce timers
      Object.values(debounceTimers.current).forEach((timer) => {
        clearTimeout(timer);
      });
    };
  }, []);

  // Memoize enabled reactions
  const enabledReactions = useMemo(() => {
    return reactions.filter((r) => r.enabled);
  }, [reactions]);

  // Check if a field has any reactions
  const hasReaction = useCallback(
    (fieldPath: string): boolean => {
      return enabledReactions.some((r) => r.trigger?.fields?.includes(fieldPath));
    },
    [enabledReactions]
  );

  // Get reactions for a specific field
  const getFieldReactions = useCallback(
    (fieldPath: string): FormReaction[] => {
      return enabledReactions.filter((r) => r.trigger?.fields?.includes(fieldPath));
    },
    [enabledReactions]
  );

  // Cancel a reaction
  const cancelReaction = useCallback((reactionId: string): void => {
    // Abort any in-flight request
    const controller = abortControllers.current[reactionId];
    if (controller) {
      controller.abort();
      delete abortControllers.current[reactionId];
    }

    // Clear any pending debounce timer
    const timer = debounceTimers.current[reactionId];
    if (timer) {
      clearTimeout(timer);
      delete debounceTimers.current[reactionId];
    }

    // Reset state to idle
    setReactionStates((prev) => ({
      ...prev,
      [reactionId]: {
        ...prev[reactionId],
        status: 'idle',
      },
    }));
  }, []);

  // Trigger a reaction
  const triggerReaction = useCallback(
    async (
      reactionId: string,
      context?: {
        triggerField?: string;
        triggerEvent?: FieldEvent;
      }
    ): Promise<void> => {
      // Find the reaction
      const reaction = reactions.find((r) => r.id === reactionId);
      if (!reaction) {
        console.warn(`[useFormReactions] Reaction not found: ${reactionId}`);
        return;
      }

      if (!reaction.enabled) {
        console.warn(`[useFormReactions] Reaction is disabled: ${reactionId}`);
        return;
      }

      // Get trigger context
      const triggerField = context?.triggerField || reaction.trigger?.fields?.[0] || '';
      const triggerEvent = context?.triggerEvent || reaction.trigger?.event || 'change';
      const debounceMs = reaction.trigger?.debounceMs || 0;

      // Clear any existing debounce timer for this reaction
      const existingTimer = debounceTimers.current[reactionId];
      if (existingTimer) {
        clearTimeout(existingTimer);
        delete debounceTimers.current[reactionId];
      }

      // Function to execute the reaction
      const execute = async (): Promise<void> => {
        // Cancel any previous in-flight request
        const existingController = abortControllers.current[reactionId];
        if (existingController) {
          existingController.abort();
        }

        // Create new abort controller
        const controller = new AbortController();
        abortControllers.current[reactionId] = controller;

        // Update state to pending
        setReactionStates((prev) => ({
          ...prev,
          [reactionId]: {
            status: 'pending',
          },
        }));

        // Track pending fields
        setPendingFields((prev) => [...new Set([...prev, triggerField])]);

        // Notify callback
        onReactionStart?.(reactionId);

        try {
          // Make API request
          const response = await fetch(
            `/api/forms/${formId}/reactions/execute?orgId=${orgId}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                reactionId,
                triggerField,
                triggerEvent,
                formData,
              }),
              signal: controller.signal,
            }
          );

          const data: ReactionExecutionResult & { success: boolean } = await response.json();

          // Handle successful completion
          if (data.status === 'completed' && data.result?.updates) {
            // Apply field updates
            onFieldUpdate(data.result.updates);

            // Track recently updated fields for highlight animation
            const updatedFields = Object.keys(data.result.updates);
            setRecentlyUpdatedFields(updatedFields);

            // Clear highlight after configured duration
            const highlightDuration = reaction.feedback?.highlightDuration || 2000;
            setTimeout(() => {
              setRecentlyUpdatedFields((prev) =>
                prev.filter((f) => !updatedFields.includes(f))
              );
            }, highlightDuration);
          }

          // Update reaction state
          setReactionStates((prev) => ({
            ...prev,
            [reactionId]: {
              status: data.status === 'completed' ? 'success' : 'error',
              lastExecuted: new Date(),
              lastResult: data,
              error: data.error
                ? {
                    message: data.error.message,
                    code: data.error.code,
                  }
                : undefined,
            },
          }));

          // Notify callbacks
          if (data.status === 'completed') {
            onReactionComplete?.(reactionId, data);
          } else if (data.error) {
            onReactionError?.(reactionId, {
              message: data.error.message,
              code: data.error.code,
              reactionId,
            });
          }
        } catch (err: unknown) {
          // Handle abort (not an error)
          if (err instanceof Error && err.name === 'AbortError') {
            return;
          }

          // Handle other errors
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';

          setReactionStates((prev) => ({
            ...prev,
            [reactionId]: {
              status: 'error',
              error: {
                message: errorMessage,
                code: 'NETWORK_ERROR',
              },
            },
          }));

          onReactionError?.(reactionId, {
            message: errorMessage,
            code: 'NETWORK_ERROR',
            reactionId,
          });
        } finally {
          // Remove from pending fields
          setPendingFields((prev) => prev.filter((f) => f !== triggerField));

          // Clean up abort controller
          delete abortControllers.current[reactionId];
        }
      };

      // Apply debounce if configured
      if (debounceMs > 0) {
        debounceTimers.current[reactionId] = setTimeout(execute, debounceMs);
      } else {
        await execute();
      }
    },
    [reactions, formId, orgId, formData, onFieldUpdate, onReactionStart, onReactionComplete, onReactionError]
  );

  return {
    reactionStates,
    pendingFields,
    recentlyUpdatedFields,
    triggerReaction,
    cancelReaction,
    hasReaction,
    getFieldReactions,
    enabledReactions,
  };
}

export default useFormReactions;
