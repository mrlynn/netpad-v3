'use client';

import {
  Box,
  Typography,
  Paper,
  IconButton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Close as CloseIcon,
  QuestionAnswer as QuestionIcon,
  OpenInNew as ExternalIcon,
  MenuBook as DocsIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';

interface ActionCardProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  isExternal?: boolean;
}

function ActionCard({ title, subtitle, icon, onClick, href, isExternal }: ActionCardProps) {
  const theme = useTheme();

  const cardContent = (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: alpha(theme.palette.primary.main, 0.3),
          bgcolor: alpha(theme.palette.primary.main, 0.03),
          transform: 'translateY(-1px)',
          boxShadow: theme.shadows[2],
        },
      }}
      onClick={onClick}
    >
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 500,
            color: theme.palette.text.primary,
            mb: subtitle ? 0.25 : 0,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            sx={{ color: theme.palette.text.secondary }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          color: theme.palette.text.secondary,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {icon}
      </Box>
    </Paper>
  );

  if (href) {
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        style={{ textDecoration: 'none' }}
      >
        {cardContent}
      </a>
    );
  }

  return cardContent;
}

interface ChatHomeProps {
  onAskQuestion: () => void;
  onClose: () => void;
}

export function ChatHome({ onAskQuestion, onClose }: ChatHomeProps) {
  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Welcome Header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light || theme.palette.primary.main} 100%)`,
          px: 3,
          pt: 2,
          pb: 3,
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'white',
            opacity: 0.8,
            '&:hover': { opacity: 1, bgcolor: alpha('#fff', 0.1) },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        {/* Avatar */}
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
            boxShadow: theme.shadows[2],
          }}
        >
          <AIIcon sx={{ color: theme.palette.primary.main, fontSize: 24 }} />
        </Box>

        {/* Greeting */}
        <Typography
          variant="h5"
          sx={{
            color: theme.palette.mode === 'dark' ? '#001E2B' : 'white',
            fontWeight: 600,
            lineHeight: 1.3,
          }}
        >
          Hi there!
        </Typography>
        <Typography
          variant="h5"
          sx={{
            color: theme.palette.mode === 'dark' ? '#001E2B' : 'white',
            fontWeight: 600,
            lineHeight: 1.3,
          }}
        >
          How can we help?
        </Typography>
      </Box>

      {/* Action Cards */}
      <Box
        sx={{
          flex: 1,
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          bgcolor: theme.palette.background.paper,
          overflowY: 'auto',
        }}
      >
        <ActionCard
          title="Ask a question"
          subtitle="AI Agent and team can help"
          icon={<QuestionIcon fontSize="small" />}
          onClick={onAskQuestion}
        />

        <ActionCard
          title="Read Our Documentation"
          icon={<ExternalIcon fontSize="small" />}
          href="#"
          isExternal
        />

        <ActionCard
          title="Request a call"
          subtitle="Fill out our contact form"
          icon={<CalendarIcon fontSize="small" />}
          href="/contact"
        />
      </Box>
    </Box>
  );
}
