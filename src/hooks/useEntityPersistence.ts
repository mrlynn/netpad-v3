'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SaveStatus } from '@/components/common/EntityStatusChip';

interface UseEntityPersistenceOptions<T> {
  entityType: 'form' | 'workflow';
  entityId?: string;
  initialData: T;
  saveFunction: (data: T) => Promise<void>;
  autosaveDelay?: number;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
  enabled?: boolean;
}

interface UseEntityPersistenceReturn<T> {
  data: T;
  isDirty: boolean;
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  error: Error | null;
  isSaving: boolean;

  updateData: (updates: Partial<T> | ((prev: T) => T)) => void;
  setData: (data: T) => void;
  save: () => Promise<boolean>;
  retrySave: () => Promise<boolean>;
  resetDirty: () => void;
  markDirty: () => void;
}

export function useEntityPersistence<T extends object>({
  entityId,
  initialData,
  saveFunction,
  autosaveDelay = 0,
  onSaveSuccess,
  onSaveError,
  enabled = true,
}: UseEntityPersistenceOptions<T>): UseEntityPersistenceReturn<T> {
  const [data, setDataState] = useState<T>(initialData);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<T | null>(null);
  const initialDataRef = useRef<string>(JSON.stringify(initialData));

  // Reset when initialData changes (new entity loaded)
  useEffect(() => {
    const newInitialStr = JSON.stringify(initialData);
    if (initialDataRef.current !== newInitialStr) {
      initialDataRef.current = newInitialStr;
      setDataState(initialData);
      setIsDirty(false);
      setSaveStatus('saved');
      setError(null);
    }
  }, [initialData]);

  // Clear autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (!enabled || isSaving) return false;

    const dataToSave = pendingDataRef.current || data;

    setIsSaving(true);
    setSaveStatus('saving');
    setError(null);

    try {
      await saveFunction(dataToSave);
      setLastSaved(new Date());
      setSaveStatus('saved');
      setIsDirty(false);
      pendingDataRef.current = null;
      onSaveSuccess?.();
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Save failed');
      setError(error);
      setSaveStatus('error');
      onSaveError?.(error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [data, enabled, isSaving, onSaveError, onSaveSuccess, saveFunction]);

  const retrySave = useCallback(async (): Promise<boolean> => {
    return save();
  }, [save]);

  const scheduleAutosave = useCallback(() => {
    if (autosaveDelay <= 0 || !enabled) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      save();
    }, autosaveDelay);
  }, [autosaveDelay, enabled, save]);

  const updateData = useCallback(
    (updates: Partial<T> | ((prev: T) => T)) => {
      setDataState((prev) => {
        const newData = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
        pendingDataRef.current = newData;
        return newData;
      });
      setIsDirty(true);
      setSaveStatus('unsaved');

      if (autosaveDelay > 0) {
        scheduleAutosave();
      }
    },
    [autosaveDelay, scheduleAutosave]
  );

  const setData = useCallback((newData: T) => {
    setDataState(newData);
    pendingDataRef.current = newData;
    setIsDirty(true);
    setSaveStatus('unsaved');
  }, []);

  const resetDirty = useCallback(() => {
    setIsDirty(false);
    setSaveStatus('saved');
    initialDataRef.current = JSON.stringify(data);
  }, [data]);

  const markDirty = useCallback(() => {
    setIsDirty(true);
    setSaveStatus('unsaved');
  }, []);

  return {
    data,
    isDirty,
    saveStatus,
    lastSaved,
    error,
    isSaving,
    updateData,
    setData,
    save,
    retrySave,
    resetDirty,
    markDirty,
  };
}

export default useEntityPersistence;
