'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { OnboardingTour, useTourStatus, TourStep } from '@/components/Help/OnboardingTour';
import { pipelineBuilderTourSteps, formBuilderTourSteps, workflowEditorTourSteps } from '@/lib/tourContent';
import { useHelp } from '@/contexts/HelpContext';

type TourType = 'pipeline-builder' | 'form-builder' | 'workflow-editor';

interface TourContextValue {
  startTour: (tourType: TourType) => void;
  endTour: () => void;
  isTourActive: boolean;
  currentTourType: TourType | null;
  hasCompletedTour: (tourType: TourType) => boolean;
  resetTour: (tourType: TourType) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

const tourStepsMap: Record<TourType, TourStep[]> = {
  'pipeline-builder': pipelineBuilderTourSteps,
  'form-builder': formBuilderTourSteps,
  'workflow-editor': workflowEditorTourSteps,
};

// Detect the appropriate tour type based on current context
// Returns null if no valid tour context is detected (e.g., landing page)
function detectTourType(): TourType | null {
  // Check for workflow editor elements first (most specific)
  if (document.querySelector('[data-tour="workflow-toolbar"]') ||
      document.querySelector('[data-tour="node-palette"]')) {
    return 'workflow-editor';
  }
  // Check for form builder elements
  if (document.querySelector('[data-tour="form-connection"]') ||
      document.querySelector('[data-tour="field-list"]')) {
    return 'form-builder';
  }
  // Check for pipeline builder elements
  if (document.querySelector('[data-tour="stage-library"]') ||
      document.querySelector('[data-tour="pipeline-canvas"]')) {
    return 'pipeline-builder';
  }
  
  // Fallback - check URL path (be specific, only on actual feature pages)
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    
    // Landing page or root - don't show a tour
    if (path === '/' || path === '') {
      return null;
    }
    
    // Only trigger tours on specific feature pages
    if (path.includes('/workflows/') && path.match(/\/workflows\/[^/]+$/)) {
      // Workflow editor page (has workflowId in path)
      return 'workflow-editor';
    }
    if (path.includes('/builder') || (path.includes('/forms/') && !path.endsWith('/forms'))) {
      // Form builder page
      return 'form-builder';
    }
    
    // Other pages (settings, data explorer, etc.) - no tour
    return null;
  }
  
  // No valid context detected - don't show a tour
  return null;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentTourType, setCurrentTourType] = useState<TourType | null>(null);
  const { setStartTourCallback } = useHelp();

  const pipelineTourStatus = useTourStatus('pipeline-builder');
  const formTourStatus = useTourStatus('form-builder');
  const workflowTourStatus = useTourStatus('workflow-editor');

  const startTour = useCallback((tourType: TourType) => {
    setCurrentTourType(tourType);
    setIsTourActive(true);
  }, []);

  // Start the appropriate tour based on current context
  const startContextualTour = useCallback(() => {
    const tourType = detectTourType();
    // Only start tour if we detected a valid context
    // Don't start tours on landing pages or pages without tour context
    if (tourType) {
      startTour(tourType);
    }
  }, [startTour]);

  // Register the start tour callback with HelpContext
  // Detects the appropriate tour based on current page/context
  useEffect(() => {
    setStartTourCallback(startContextualTour);
    return () => setStartTourCallback(null);
  }, [setStartTourCallback, startContextualTour]);

  const endTour = useCallback(() => {
    setIsTourActive(false);
    setCurrentTourType(null);
  }, []);

  const hasCompletedTour = useCallback((tourType: TourType) => {
    switch (tourType) {
      case 'pipeline-builder':
        return pipelineTourStatus.hasCompletedTour;
      case 'form-builder':
        return formTourStatus.hasCompletedTour;
      case 'workflow-editor':
        return workflowTourStatus.hasCompletedTour;
      default:
        return true;
    }
  }, [pipelineTourStatus.hasCompletedTour, formTourStatus.hasCompletedTour, workflowTourStatus.hasCompletedTour]);

  const resetTour = useCallback((tourType: TourType) => {
    switch (tourType) {
      case 'pipeline-builder':
        pipelineTourStatus.resetTour();
        break;
      case 'form-builder':
        formTourStatus.resetTour();
        break;
      case 'workflow-editor':
        workflowTourStatus.resetTour();
        break;
    }
  }, [pipelineTourStatus, formTourStatus, workflowTourStatus]);

  return (
    <TourContext.Provider
      value={{
        startTour,
        endTour,
        isTourActive,
        currentTourType,
        hasCompletedTour,
        resetTour,
      }}
    >
      {children}
      {currentTourType && (
        <OnboardingTour
          steps={tourStepsMap[currentTourType]}
          isOpen={isTourActive}
          onClose={endTour}
          onComplete={endTour}
          tourId={currentTourType}
        />
      )}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
