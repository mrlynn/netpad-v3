'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Backdrop,
  alpha,
  Fade,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Close,
  NavigateNext,
  NavigateBefore,
  Celebration,
  KeyboardCommandKey,
} from '@mui/icons-material';

export interface TourStep {
  target: string; // CSS selector for the element to highlight
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  spotlightPadding?: number;
  disableOverlay?: boolean;
}

interface OnboardingTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  tourId: string; // Used to track if user has seen this tour
}

const TOUR_STORAGE_KEY = 'completed_tours';

export function OnboardingTour({
  steps,
  isOpen,
  onClose,
  onComplete,
  tourId,
}: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [tooltipHeight, setTooltipHeight] = useState(280); // Default estimate
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Find and highlight the target element
  const updateTargetPosition = useCallback(() => {
    if (!step || !isOpen) return;

    if (step.target === 'center') {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);

      // Scroll element into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setTargetRect(null);
    }
  }, [step, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      updateTargetPosition();

      // Re-calculate on resize
      window.addEventListener('resize', updateTargetPosition);
      window.addEventListener('scroll', updateTargetPosition, true);

      const timer = setTimeout(() => setIsAnimating(false), 300);

      return () => {
        window.removeEventListener('resize', updateTargetPosition);
        window.removeEventListener('scroll', updateTargetPosition, true);
        clearTimeout(timer);
      };
    }
  }, [isOpen, currentStep, updateTargetPosition]);

  // Measure actual tooltip height after render
  useEffect(() => {
    if (isOpen && tooltipRef.current) {
      const measureHeight = () => {
        if (tooltipRef.current) {
          const rect = tooltipRef.current.getBoundingClientRect();
          if (rect.height > 0) {
            setTooltipHeight(rect.height);
          }
        }
      };
      // Measure after a short delay to ensure content is rendered
      const timer = setTimeout(measureHeight, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentStep]);

  // Reset step when tour opens and manage focus
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      // Focus the tooltip when tour opens
      setTimeout(() => {
        tooltipRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Announce step changes to screen readers
  useEffect(() => {
    if (isOpen && step) {
      // Create a live region announcement
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.style.position = 'absolute';
      announcement.style.left = '-9999px';
      announcement.textContent = `Step ${currentStep + 1} of ${steps.length}: ${step.title}`;
      document.body.appendChild(announcement);

      // Clean up after announcement
      const cleanup = setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);

      return () => {
        clearTimeout(cleanup);
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement);
        }
      };
    }
  }, [isOpen, currentStep, step, steps.length]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setIsAnimating(true);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    // Mark tour as completed
    try {
      const completed = JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || '[]');
      if (!completed.includes(tourId)) {
        completed.push(tourId);
        localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completed));
      }
      // Dispatch event to notify other components that tour status changed
      window.dispatchEvent(new CustomEvent('tour-status-changed'));
    } catch {
      // Ignore localStorage errors
    }

    onComplete?.();
    onClose();
  };

  const handleSkip = () => {
    // Mark tour as completed even when skipped
    try {
      const completed = JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || '[]');
      if (!completed.includes(tourId)) {
        completed.push(tourId);
        localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completed));
      }
    } catch {
      // Ignore localStorage errors
    }

    // Also set a session flag to prevent re-triggering during this session
    try {
      sessionStorage.setItem(`tour_dismissed_${tourId}`, 'true');
    } catch {
      // Ignore sessionStorage errors
    }

    // Dispatch event to notify other components that tour status changed
    window.dispatchEvent(new CustomEvent('tour-status-changed'));

    onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrev();
          break;
        case 'Escape':
          e.preventDefault();
          handleSkip();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentStep, isLastStep]);

  if (!isOpen || !step) return null;

  // Calculate tooltip position
  const getTooltipPosition = () => {
    if (!targetRect || step.placement === 'center') {
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = step.spotlightPadding ?? 8;
    const tooltipWidth = 360;
    const actualTooltipHeight = tooltipHeight; // Use measured height
    const margin = 16;

    let top = 0;
    let left = 0;

    switch (step.placement || 'bottom') {
      case 'top':
        top = targetRect.top - actualTooltipHeight - margin;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + margin;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - actualTooltipHeight / 2;
        left = targetRect.left - tooltipWidth - margin;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - actualTooltipHeight / 2;
        left = targetRect.right + margin;
        break;
    }

    // Keep within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < margin) left = margin;
    if (left + tooltipWidth > viewportWidth - margin) {
      left = viewportWidth - tooltipWidth - margin;
    }
    if (top < margin) top = margin;
    if (top + actualTooltipHeight > viewportHeight - margin) {
      top = viewportHeight - actualTooltipHeight - margin;
    }

    return {
      position: 'fixed' as const,
      top,
      left,
    };
  };

  // Create spotlight mask
  const getSpotlightStyles = () => {
    if (!targetRect || step.disableOverlay) {
      return null;
    }

    const padding = step.spotlightPadding ?? 8;

    return {
      position: 'fixed' as const,
      top: targetRect.top - padding,
      left: targetRect.left - padding,
      width: targetRect.width + padding * 2,
      height: targetRect.height + padding * 2,
      borderRadius: 8,
      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
      pointerEvents: 'none' as const,
      zIndex: 1300,
      transition: 'all 0.3s ease-in-out',
    };
  };

  return (
    <>
      {/* Backdrop */}
      <Backdrop
        open={isOpen}
        sx={{
          zIndex: 1299,
          bgcolor: 'transparent',
        }}
        onClick={handleSkip}
      />

      {/* Spotlight */}
      {targetRect && !step.disableOverlay && (
        <Box sx={getSpotlightStyles()} />
      )}

      {/* Tooltip */}
      <Fade in={isOpen && !isAnimating}>
        <Paper
          ref={tooltipRef}
          elevation={8}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-step-title"
          aria-describedby="tour-step-content"
          tabIndex={-1}
          sx={{
            ...getTooltipPosition(),
            zIndex: 1301,
            width: 360,
            maxWidth: 'calc(100vw - 32px)',
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: alpha('#00ED64', 0.3),
            '&:focus': {
              outline: 'none',
            },
          }}
        >
          {/* Progress bar */}
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 3,
              bgcolor: alpha('#00ED64', 0.1),
              '& .MuiLinearProgress-bar': {
                bgcolor: '#00ED64',
              },
            }}
          />

          {/* Header */}
          <Box
            sx={{
              px: 2.5,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: alpha('#00ED64', 0.05),
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={`${currentStep + 1} / ${steps.length}`}
                size="small"
                sx={{
                  height: 24,
                  fontSize: '0.75rem',
                  bgcolor: alpha('#00ED64', 0.1),
                  color: '#00ED64',
                  fontWeight: 600,
                }}
              />
              {isLastStep && (
                <Celebration sx={{ color: '#00ED64', fontSize: 20 }} />
              )}
            </Box>
            <IconButton
              size="small"
              onClick={handleSkip}
              aria-label="Skip tour"
            >
              <Close fontSize="small" />
            </IconButton>
          </Box>

          {/* Content */}
          <Box sx={{ p: 2.5 }}>
            <Typography
              id="tour-step-title"
              variant="h6"
              component="h2"
              sx={{ fontWeight: 600, mb: 1 }}
            >
              {step.title}
            </Typography>
            <Typography
              id="tour-step-content"
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.7 }}
            >
              {step.content}
            </Typography>
          </Box>

          {/* Footer */}
          <Box
            sx={{
              px: 2.5,
              py: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: alpha('#000', 0.02),
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                onClick={handlePrev}
                disabled={currentStep === 0}
                startIcon={<NavigateBefore />}
                sx={{ color: 'text.secondary' }}
              >
                Back
              </Button>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <kbd style={{
                  padding: '2px 6px',
                  background: alpha('#000', 0.05),
                  borderRadius: 4,
                  fontSize: 10,
                }}>
                  Enter
                </kbd>
              </Typography>
              <Button
                size="small"
                variant="contained"
                onClick={handleNext}
                endIcon={!isLastStep && <NavigateNext />}
                sx={{
                  bgcolor: '#00ED64',
                  color: '#001E2B',
                  '&:hover': {
                    bgcolor: '#00c853',
                  },
                }}
              >
                {isLastStep ? 'Get Started' : 'Next'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Fade>
    </>
  );
}

// Hook to check if a tour has been completed
export function useTourStatus(tourId: string) {
  const [hasCompletedTour, setHasCompletedTour] = useState(true); // Default to true to prevent flash

  // Function to check storage for tour completion status
  const checkTourStatus = useCallback(() => {
    try {
      // Check session flag first (prevents re-triggering after dismiss)
      const dismissedThisSession = sessionStorage.getItem(`tour_dismissed_${tourId}`);
      if (dismissedThisSession === 'true') {
        return true;
      }

      const completed = JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || '[]');
      return completed.includes(tourId);
    } catch {
      return false;
    }
  }, [tourId]);

  useEffect(() => {
    setHasCompletedTour(checkTourStatus());
  }, [checkTourStatus]);

  // Listen for storage changes (to sync across the app when tour is dismissed)
  useEffect(() => {
    const handleStorageChange = () => {
      setHasCompletedTour(checkTourStatus());
    };

    // Also listen for custom event dispatched when tour is dismissed
    window.addEventListener('tour-status-changed', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('tour-status-changed', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkTourStatus]);

  const resetTour = useCallback(() => {
    try {
      const completed = JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || '[]');
      const updated = completed.filter((id: string) => id !== tourId);
      localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(updated));
      setHasCompletedTour(false);
      // Dispatch custom event to notify other instances
      window.dispatchEvent(new CustomEvent('tour-status-changed'));
    } catch {
      // Ignore localStorage errors
    }
  }, [tourId]);

  return { hasCompletedTour, resetTour };
}

// Utility to reset all tours
export function resetAllTours() {
  try {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  } catch {
    // Ignore localStorage errors
  }
}
