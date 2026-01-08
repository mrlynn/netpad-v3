'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  useTheme,
  alpha,
  Fade,
  Link,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CookieIcon from '@mui/icons-material/Cookie';
import LockIcon from '@mui/icons-material/Lock';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import { useConsent } from '@/contexts/ConsentContext';
import {
  ConsentPreferences,
  CookieCategory,
  CATEGORY_INFO,
  COOKIE_DEFINITIONS,
} from '@/types/consent';

export default function CookieConsentModal() {
  const theme = useTheme();
  const {
    modalState,
    preferences: savedPreferences,
    acceptAll,
    rejectAll,
    savePreferences,
    showPreferences,
    hideModal,
  } = useConsent();

  // Don't show cookie consent in embedded contexts
  const isEmbedded = typeof window !== 'undefined' && 
    (new URLSearchParams(window.location.search).get('embedded') === 'true' ||
     window.self !== window.top);
  
  if (isEmbedded || modalState === 'hidden') {
    return null;
  }

  // Local state for preference toggles
  const [localPrefs, setLocalPrefs] = useState<Omit<ConsentPreferences, 'essential'>>({
    functional: savedPreferences.functional,
    analytics: savedPreferences.analytics,
    marketing: savedPreferences.marketing,
  });

  // Update local prefs when saved prefs change
  React.useEffect(() => {
    setLocalPrefs({
      functional: savedPreferences.functional,
      analytics: savedPreferences.analytics,
      marketing: savedPreferences.marketing,
    });
  }, [savedPreferences]);

  const handleToggle = (category: keyof Omit<ConsentPreferences, 'essential'>) => {
    setLocalPrefs((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSavePreferences = async () => {
    await savePreferences(localPrefs);
  };

  // Get cookies for a category
  const getCookiesForCategory = (category: CookieCategory) =>
    COOKIE_DEFINITIONS.filter((c) => c.category === category);

  // Initial banner view
  if (modalState === 'banner') {
    return (
      <Fade in>
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            p: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha('#0a1628', 0.98)} 100%)`,
            backdropFilter: 'blur(10px)',
            borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
            boxShadow: `0 -4px 20px ${alpha('#000', 0.3)}`,
          }}
        >
          <Box
            sx={{
              maxWidth: 1200,
              mx: 'auto',
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'center' },
              gap: 2,
            }}
          >
            {/* Icon and text */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  display: { xs: 'none', sm: 'flex' },
                }}
              >
                <CookieIcon sx={{ color: theme.palette.primary.main, fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  We value your privacy
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600 }}>
                  We use cookies to enhance your experience. Essential cookies are required
                  for the site to work. You can choose to enable additional cookies for
                  analytics and personalization.{' '}
                  <Link href="/privacy/cookies" sx={{ color: theme.palette.primary.main }}>
                    Learn more
                  </Link>
                </Typography>
              </Box>
            </Box>

            {/* Action buttons */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1,
                minWidth: { md: 380 },
              }}
            >
              <Button
                variant="outlined"
                onClick={showPreferences}
                startIcon={<SettingsIcon />}
                sx={{
                  borderColor: alpha(theme.palette.primary.main, 0.5),
                  color: theme.palette.text.primary,
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                Customize
              </Button>
              <Button
                variant="outlined"
                onClick={rejectAll}
                sx={{
                  borderColor: alpha(theme.palette.text.secondary, 0.3),
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    borderColor: theme.palette.text.secondary,
                    bgcolor: alpha(theme.palette.text.secondary, 0.08),
                  },
                }}
              >
                Reject All
              </Button>
              <Button
                variant="contained"
                onClick={acceptAll}
                sx={{
                  bgcolor: theme.palette.primary.main,
                  color: '#000',
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: theme.palette.primary.light,
                  },
                }}
              >
                Accept All
              </Button>
            </Box>
          </Box>
        </Box>
      </Fade>
    );
  }

  // Detailed preferences modal
  return (
    <Dialog
      open={modalState === 'preferences'}
      onClose={hideModal}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: theme.palette.background.paper,
          backgroundImage: 'none',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CookieIcon sx={{ color: theme.palette.primary.main }} />
          <Typography variant="h6" fontWeight={600}>
            Cookie Preferences
          </Typography>
        </Box>
        <IconButton onClick={hideModal} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Choose which cookies you want to allow. Essential cookies cannot be disabled
          as they are required for the website to function properly.
        </Typography>

        {/* Essential Cookies - Always On */}
        <Accordion
          defaultExpanded
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            '&:before': { display: 'none' },
            mb: 1.5,
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
              <LockIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600}>{CATEGORY_INFO.essential.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Always enabled
                </Typography>
              </Box>
              <Chip
                label="Required"
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.2),
                  color: theme.palette.primary.main,
                }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {CATEGORY_INFO.essential.description}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {getCookiesForCategory('essential').map((cookie) => (
                <Box
                  key={cookie.name}
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.background.default, 0.5),
                  }}
                >
                  <Typography variant="body2" fontWeight={500}>
                    {cookie.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {cookie.purpose} • {cookie.duration}
                  </Typography>
                </Box>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Functional Cookies */}
        <Accordion
          sx={{
            bgcolor: 'transparent',
            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            '&:before': { display: 'none' },
            mb: 1.5,
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600}>{CATEGORY_INFO.functional.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {getCookiesForCategory('functional').length} cookies
                </Typography>
              </Box>
              <Switch
                checked={localPrefs.functional}
                onChange={() => handleToggle('functional')}
                onClick={(e) => e.stopPropagation()}
                color="primary"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {CATEGORY_INFO.functional.description}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {getCookiesForCategory('functional').map((cookie) => (
                <Box
                  key={cookie.name}
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.background.default, 0.5),
                  }}
                >
                  <Typography variant="body2" fontWeight={500}>
                    {cookie.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {cookie.purpose} • {cookie.duration}
                  </Typography>
                </Box>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Analytics Cookies */}
        <Accordion
          sx={{
            bgcolor: 'transparent',
            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            '&:before': { display: 'none' },
            mb: 1.5,
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600}>{CATEGORY_INFO.analytics.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {getCookiesForCategory('analytics').length} cookies
                </Typography>
              </Box>
              <Switch
                checked={localPrefs.analytics}
                onChange={() => handleToggle('analytics')}
                onClick={(e) => e.stopPropagation()}
                color="primary"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {CATEGORY_INFO.analytics.description}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {getCookiesForCategory('analytics').map((cookie) => (
                <Box
                  key={cookie.name}
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.background.default, 0.5),
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" fontWeight={500}>
                      {cookie.name}
                    </Typography>
                    {cookie.provider !== 'first-party' && (
                      <Chip label={cookie.provider} size="small" variant="outlined" />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {cookie.purpose} • {cookie.duration}
                  </Typography>
                </Box>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Marketing Cookies */}
        <Accordion
          sx={{
            bgcolor: 'transparent',
            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600}>{CATEGORY_INFO.marketing.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {getCookiesForCategory('marketing').length} cookies
                </Typography>
              </Box>
              <Switch
                checked={localPrefs.marketing}
                onChange={() => handleToggle('marketing')}
                onClick={(e) => e.stopPropagation()}
                color="primary"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {CATEGORY_INFO.marketing.description}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {getCookiesForCategory('marketing').map((cookie) => (
                <Box
                  key={cookie.name}
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.background.default, 0.5),
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" fontWeight={500}>
                      {cookie.name}
                    </Typography>
                    {cookie.provider !== 'first-party' && (
                      <Chip label={cookie.provider} size="small" variant="outlined" />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {cookie.purpose} • {cookie.duration}
                  </Typography>
                </Box>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          gap: 1,
        }}
      >
        <Button onClick={rejectAll} color="inherit">
          Reject All
        </Button>
        <Button onClick={acceptAll} color="inherit">
          Accept All
        </Button>
        <Button
          variant="contained"
          onClick={handleSavePreferences}
          sx={{
            bgcolor: theme.palette.primary.main,
            color: '#000',
            fontWeight: 600,
            '&:hover': {
              bgcolor: theme.palette.primary.light,
            },
          }}
        >
          Save Preferences
        </Button>
      </DialogActions>
    </Dialog>
  );
}
