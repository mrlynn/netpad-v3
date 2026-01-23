'use client';

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  alpha,
  useTheme,
} from '@mui/material';
import { KeyboardArrowDown, GitHub, MenuBook } from '@mui/icons-material';

export interface CollaborateHeroProps {
  /** Main title */
  title?: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Primary CTA button text */
  ctaText?: string;
  /** Primary CTA click handler or href */
  ctaAction?: string | (() => void);
  /** Secondary CTA button text */
  secondaryText?: string;
  /** Secondary CTA click handler or href */
  secondaryAction?: string | (() => void);
  /** Show GitHub link */
  showGitHub?: boolean;
  /** GitHub URL */
  githubUrl?: string;
  /** Show docs link */
  showDocs?: boolean;
  /** Docs URL */
  docsUrl?: string;
  /** Custom logo/image element */
  logo?: React.ReactNode;
  /** Background variant */
  variant?: 'gradient' | 'solid' | 'minimal';
}

/**
 * CollaborateHero - Hero section for collaborate pages
 *
 * Usage:
 * ```tsx
 * import { CollaborateHero } from '@netpad/collaborate/components';
 *
 * <CollaborateHero
 *   title="Build NetPad With Me"
 *   subtitle="Looking for collaborators to shape what NetPad becomes"
 *   ctaText="Get Involved"
 *   ctaAction="#form-section"
 *   showGitHub={true}
 * />
 * ```
 */
export function CollaborateHero({
  title = 'Build NetPad With Me',
  subtitle = "I'm looking for 1-2 people who want to shape what a MongoDB-native development platform becomes.",
  ctaText = 'Tell me about yourself',
  ctaAction = '#form-section',
  secondaryText = 'Learn more',
  secondaryAction,
  showGitHub = true,
  githubUrl = 'https://github.com/mrlynn/netpad-v3',
  showDocs = true,
  docsUrl = 'https://docs.netpad.io',
  logo,
  variant = 'gradient',
}: CollaborateHeroProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const bgColor = isDark ? '#001E2B' : '#f5f7fa';
  const textColor = isDark ? '#fff' : '#1a1a2e';
  const textSecondary = isDark ? alpha('#fff', 0.7) : alpha('#000', 0.6);
  const textMuted = isDark ? alpha('#fff', 0.5) : alpha('#000', 0.4);

  const handleCtaClick = () => {
    if (typeof ctaAction === 'function') {
      ctaAction();
    } else if (ctaAction.startsWith('#')) {
      document.querySelector(ctaAction)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = ctaAction;
    }
  };

  const handleSecondaryClick = () => {
    if (!secondaryAction) return;
    if (typeof secondaryAction === 'function') {
      secondaryAction();
    } else if (secondaryAction.startsWith('#')) {
      document.querySelector(secondaryAction)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = secondaryAction;
    }
  };

  const getBackground = () => {
    if (variant === 'minimal') return 'transparent';
    if (variant === 'solid') return bgColor;
    return isDark
      ? 'radial-gradient(ellipse at top, rgba(0, 237, 100, 0.12) 0%, transparent 60%)'
      : 'radial-gradient(ellipse at top, rgba(0, 237, 100, 0.2) 0%, transparent 60%)';
  };

  return (
    <Box
      sx={{
        minHeight: variant === 'minimal' ? 'auto' : '40vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: getBackground(),
        py: { xs: 8, md: variant === 'minimal' ? 6 : 16 },
        px: 2,
      }}
    >
      <Container maxWidth="xl" sx={{ textAlign: 'center' }}>
        {/* Logo */}
        {logo && (
          <Box sx={{ mb: 3 }}>
            {logo}
          </Box>
        )}

        {/* Title */}
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '2.5rem', md: '4rem', lg: '5rem' },
            fontWeight: 800,
            color: textColor,
            mb: 3,
            lineHeight: 1.1,
          }}
        >
          {title}
        </Typography>

        {/* Subtitle */}
        <Typography
          variant="h5"
          sx={{
            color: textSecondary,
            mb: 5,
            maxWidth: 600,
            mx: 'auto',
            fontWeight: 400,
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </Typography>

        {/* CTA Buttons */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            justifyContent: 'center',
            alignItems: 'center',
            mb: 4,
          }}
        >
          <Button
            variant="contained"
            size="large"
            onClick={handleCtaClick}
            sx={{
              bgcolor: '#00ED64',
              color: '#001E2B',
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': {
                bgcolor: '#00FF6A',
              },
            }}
          >
            {ctaText}
          </Button>

          {secondaryAction && (
            <Button
              variant="text"
              size="large"
              onClick={handleSecondaryClick}
              endIcon={<KeyboardArrowDown />}
              sx={{
                color: textSecondary,
                textTransform: 'none',
                '&:hover': { color: '#00ED64' },
              }}
            >
              {secondaryText}
            </Button>
          )}
        </Box>

        {/* Links */}
        {(showGitHub || showDocs) && (
          <Box
            sx={{
              display: 'flex',
              gap: 3,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {showGitHub && (
              <Button
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<GitHub />}
                sx={{
                  color: textMuted,
                  textTransform: 'none',
                  '&:hover': { color: '#00ED64' },
                }}
              >
                GitHub
              </Button>
            )}
            {showDocs && (
              <Button
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<MenuBook />}
                sx={{
                  color: textMuted,
                  textTransform: 'none',
                  '&:hover': { color: '#00ED64' },
                }}
              >
                Documentation
              </Button>
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default CollaborateHero;
