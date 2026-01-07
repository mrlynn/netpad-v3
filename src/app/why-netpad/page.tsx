'use client';

import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  alpha,
} from '@mui/material';
import Link from 'next/link';
import Image from 'next/image';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CodeIcon from '@mui/icons-material/Code';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import StorageIcon from '@mui/icons-material/Storage';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DescriptionIcon from '@mui/icons-material/Description';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import GitHubIcon from '@mui/icons-material/GitHub';
import TerminalIcon from '@mui/icons-material/Terminal';
import SchoolIcon from '@mui/icons-material/School';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';

const CodeBlock = ({ title, lines, color }: { title: string; lines: number; color: string }) => (
  <Box
    sx={{
      bgcolor: '#1e1e1e',
      borderRadius: 2,
      overflow: 'hidden',
      height: '100%',
    }}
  >
    <Box sx={{ bgcolor: color, px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 'bold' }}>
        {title}
      </Typography>
      <Chip label={`~${lines} lines`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
    </Box>
    <Box sx={{ p: 2 }}>
      <pre style={{ margin: 0, color: '#d4d4d4', fontSize: '11px', lineHeight: 1.4, overflow: 'auto', maxHeight: 400 }}>
        {title.includes('Without') ? scratchCode : netpadCode}
      </pre>
    </Box>
  </Box>
);

const scratchCode = `// form-components/TextField.tsx (1 of 15+ components)
import { useState, useEffect } from 'react';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  helpText?: string;
}

export function TextField({
  label, value, onChange, error, required,
  placeholder, disabled, minLength, maxLength,
  pattern, helpText
}: TextFieldProps) {
  const [touched, setTouched] = useState(false);
  const [localError, setLocalError] = useState<string>();

  useEffect(() => {
    if (!touched) return;
    if (required && !value) {
      setLocalError(\`\${label} is required\`);
    } else if (minLength && value.length < minLength) {
      setLocalError(\`Min \${minLength} characters\`);
    } else if (maxLength && value.length > maxLength) {
      setLocalError(\`Max \${maxLength} characters\`);
    } else if (pattern && !pattern.test(value)) {
      setLocalError('Invalid format');
    } else {
      setLocalError(undefined);
    }
  }, [value, touched, required, minLength, maxLength]);

  return (
    <div className="form-field">
      <label>{label}{required && '*'}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {helpText && <span className="help">{helpText}</span>}
      {(error || localError) && (
        <span className="error">{error || localError}</span>
      )}
    </div>
  );
}

// Repeat for: EmailField, PhoneField, SelectField,
// DateField, CheckboxField, RadioField, TextArea,
// NumberField, SliderField, RatingField, FileUpload,
// AutocompleteField, TagsField, SwitchField...

// form-logic/useMultiPageForm.ts
export function useMultiPageForm(config) {
  const [currentPage, setCurrentPage] = useState(0);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [visited, setVisited] = useState(new Set());

  const validatePage = (pageIndex: number) => {
    const pageFields = config.pages[pageIndex].fields;
    const pageErrors = {};
    // ... 50+ lines of validation logic
  };

  const nextPage = () => {
    if (validatePage(currentPage)) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // ... 100+ more lines for prev, submit, etc.
}

// form-logic/conditionalLogic.ts
export function evaluateConditions(conditions, data) {
  // ... 80+ lines of condition evaluation
}

// form-logic/nestedData.ts
export function setNestedValue(obj, path, value) {
  // ... 40+ lines of nested object handling
}

// Plus: API routes, database schemas, error handling,
// accessibility, testing, documentation...

// Total: 2000+ lines across 20+ files
// Time: 2-4 weeks of development`;

const netpadCode = `// app/onboarding/page.tsx - THE ENTIRE FORM
import { FormRenderer, FormConfiguration } from '@netpad/forms';

const onboardingForm: FormConfiguration = {
  name: 'Employee Onboarding',
  fieldConfigs: [
    {
      path: 'firstName',
      label: 'First Name',
      type: 'short_text',
      included: true,
      required: true,
      fieldWidth: 'half',
    },
    {
      path: 'email',
      label: 'Email',
      type: 'email',
      included: true,
      required: true,
    },
    {
      path: 'department',
      label: 'Department',
      type: 'dropdown',
      included: true,
      options: [
        { label: 'Engineering', value: 'eng' },
        { label: 'Marketing', value: 'mkt' },
      ],
    },
    {
      path: 'officeLocation',
      label: 'Office',
      type: 'dropdown',
      included: true,
      conditionalLogic: {
        action: 'show',
        conditions: [
          { field: 'workType', operator: 'equals', value: 'hybrid' }
        ],
      },
    },
    {
      path: 'emergencyContact.name',
      label: 'Emergency Contact',
      type: 'short_text',
      included: true,
    },
    {
      path: 'emergencyContact.phone',
      label: 'Contact Phone',
      type: 'phone',
      included: true,
    },
  ],
  multiPage: {
    enabled: true,
    showProgressBar: true,
    pages: [
      { id: 'personal', title: 'Personal', fields: ['firstName', 'email'] },
      { id: 'work', title: 'Employment', fields: ['department', 'officeLocation'] },
      { id: 'emergency', title: 'Emergency', fields: ['emergencyContact.name', 'emergencyContact.phone'] },
    ],
  },
};

export default function OnboardingPage() {
  const handleSubmit = async (data) => {
    await fetch('/api/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  return <FormRenderer config={onboardingForm} onSubmit={handleSubmit} />;
}

// That's it. ~80 lines. Ships today.`;

const comparisonData = [
  { feature: 'Text, Email, Phone fields', scratch: '3 components (~150 lines)', netpad: 'Built-in' },
  { feature: 'Date/Time pickers', scratch: '2 components + library', netpad: 'Built-in' },
  { feature: 'Dropdowns, Radio, Checkbox', scratch: '3 components (~200 lines)', netpad: 'Built-in' },
  { feature: 'File upload', scratch: '1 component + S3 setup', netpad: 'Built-in' },
  { feature: 'Multi-page wizard', scratch: 'Custom state machine (~300 lines)', netpad: '5 lines of config' },
  { feature: 'Progress indicator', scratch: 'Custom component (~100 lines)', netpad: '1 boolean flag' },
  { feature: 'Field validation', scratch: 'Per-field + form-level (~200 lines)', netpad: 'Declarative config' },
  { feature: 'Conditional logic', scratch: 'Custom evaluator (~150 lines)', netpad: 'JSON conditions' },
  { feature: 'Nested data (contact.phone)', scratch: 'Utility functions (~80 lines)', netpad: 'Dot notation' },
  { feature: 'Computed fields', scratch: 'Custom formula parser', netpad: 'Formula strings' },
  { feature: 'Conversational forms', scratch: 'Chat UI + NLP + extraction (~2000 lines)', netpad: 'Template-based config' },
  { feature: 'AI form generation', scratch: 'LLM integration + parsing (~500 lines)', netpad: 'Built-in AI agents' },
  { feature: 'Error display', scratch: 'Custom error handling', netpad: 'Automatic' },
  { feature: 'Accessibility (ARIA)', scratch: 'Manual implementation', netpad: 'Built-in' },
];

const capabilityComparison = [
  {
    category: 'Forms',
    icon: <DescriptionIcon />,
    color: '#00ED64',
    scratch: ['Build 15+ field components', 'Implement validation logic', 'Handle conditional visibility', 'Manage multi-page state', 'Style everything from scratch'],
    netpad: ['28+ field types included', 'Declarative validation', 'JSON-based conditions', 'Config-driven wizards', 'Themeable out of the box'],
    scratchTime: '2-3 weeks',
    netpadTime: '2-3 hours',
  },
  {
    category: 'Workflows',
    icon: <AccountTreeIcon />,
    color: '#9C27B0',
    scratch: ['Design state machine', 'Build approval chains', 'Implement notifications', 'Handle edge cases', 'Add audit logging'],
    netpad: ['Visual workflow builder', 'Pre-built approval patterns', 'Email/Slack integration', 'Automatic retries', 'Built-in audit trail'],
    scratchTime: '3-4 weeks',
    netpadTime: '1-2 days',
  },
  {
    category: 'Data Management',
    icon: <StorageIcon />,
    color: '#2196F3',
    scratch: ['Design database schema', 'Build CRUD APIs', 'Implement search/filter', 'Add pagination', 'Build admin dashboard'],
    netpad: ['Automatic MongoDB storage', 'REST API included', 'Full-text search', 'Built-in pagination', 'Admin dashboard ready'],
    scratchTime: '2-3 weeks',
    netpadTime: 'Included',
  },
  {
    category: 'AI & Conversational',
    icon: <ChatBubbleIcon />,
    color: '#E91E63',
    scratch: ['Build chat interface', 'Implement NLP processing', 'Create conversation flows', 'Handle data extraction', 'Build template system'],
    netpad: ['Conversational forms built-in', '12+ AI agents included', 'Template admin system', 'Automatic data extraction', 'Natural language processing'],
    scratchTime: '4-6 weeks',
    netpadTime: '1-2 hours',
  },
];

export default function WhyNetPadPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#001E2B' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'radial-gradient(ellipse at top, rgba(0, 237, 100, 0.15) 0%, transparent 60%)',
          color: 'white',
          py: 8,
        }}
      >
        <Container maxWidth="lg">
          <Button
            component={Link}
            href="/"
            startIcon={<ArrowBackIcon />}
            sx={{ color: 'white', mb: 4, '&:hover': { bgcolor: alpha('#fff', 0.1) } }}
          >
            Back to Home
          </Button>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Image
              src="/logo-250x250-trans.png"
              alt="NetPad"
              width={48}
              height={48}
              style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 237, 100, 0.3))' }}
            />
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Why NetPad?
            </Typography>
          </Box>

          <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ maxWidth: 800 }}>
            Stop rebuilding forms, workflows, data management, and AI experiences from scratch.
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.8, maxWidth: 700, mb: 4 }}>
            Ship production-ready applications in hours instead of weeks.
            Focus on what makes your app unique, not boilerplate infrastructure.
          </Typography>

          <Grid container spacing={3}>
            {[
              { icon: <SpeedIcon sx={{ fontSize: 40 }} />, stat: '10x', label: 'Faster Development' },
              { icon: <CodeIcon sx={{ fontSize: 40 }} />, stat: '90%', label: 'Less Code' },
              { icon: <SecurityIcon sx={{ fontSize: 40 }} />, stat: '160+', label: 'API Endpoints' },
              { icon: <SmartToyIcon sx={{ fontSize: 40 }} />, stat: '12+', label: 'AI Agents' },
            ].map((item, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Paper
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    bgcolor: alpha('#fff', 0.05),
                    border: '1px solid',
                    borderColor: alpha('#fff', 0.1),
                    color: 'white',
                  }}
                >
                  <Box sx={{ color: '#00ED64' }}>{item.icon}</Box>
                  <Typography variant="h3" fontWeight="bold" sx={{ my: 1, color: '#00ED64' }}>
                    {item.stat}
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.8 }}>{item.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Side-by-Side Code Comparison */}
      <Box sx={{ py: 8, bgcolor: alpha('#000', 0.2) }}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight="bold" textAlign="center" gutterBottom sx={{ color: 'white' }}>
            See the Difference
          </Typography>
          <Typography variant="h6" textAlign="center" sx={{ mb: 6, maxWidth: 700, mx: 'auto', color: alpha('#fff', 0.6) }}>
            Building an employee onboarding form with multi-page wizard, conditional logic, and nested data
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <CodeBlock title="Without NetPad" lines={2000} color="#c62828" />
            </Grid>
            <Grid item xs={12} md={6}>
              <CodeBlock title="With NetPad" lines={80} color="#00ED64" />
            </Grid>
          </Grid>

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Chip
              icon={<AutoFixHighIcon />}
              label="96% less code • Ships in hours, not weeks"
              sx={{
                fontSize: '1rem',
                py: 3,
                px: 2,
                bgcolor: alpha('#00ED64', 0.1),
                color: '#00ED64',
                border: '1px solid',
                borderColor: alpha('#00ED64', 0.3),
                '& .MuiChip-icon': { color: '#00ED64' },
              }}
            />
          </Box>
        </Container>
      </Box>

      {/* Feature Comparison Table */}
      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight="bold" textAlign="center" gutterBottom sx={{ color: 'white' }}>
            Feature-by-Feature Comparison
          </Typography>
          <Typography variant="h6" textAlign="center" sx={{ mb: 6, color: alpha('#fff', 0.6) }}>
            What you&apos;d need to build vs. what NetPad provides
          </Typography>

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              bgcolor: alpha('#fff', 0.03),
              border: '1px solid',
              borderColor: alpha('#fff', 0.1),
              borderRadius: 2,
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha('#00ED64', 0.1) }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '30%', borderColor: alpha('#fff', 0.1) }}>Feature</TableCell>
                  <TableCell sx={{ color: '#ff8a80', fontWeight: 'bold', width: '35%', borderColor: alpha('#fff', 0.1) }}>Build From Scratch</TableCell>
                  <TableCell sx={{ color: '#00ED64', fontWeight: 'bold', width: '35%', borderColor: alpha('#fff', 0.1) }}>With NetPad</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {comparisonData.map((row, i) => (
                  <TableRow key={i} sx={{ '&:nth-of-type(odd)': { bgcolor: alpha('#fff', 0.02) } }}>
                    <TableCell sx={{ color: 'white', fontWeight: 500, borderColor: alpha('#fff', 0.1) }}>{row.feature}</TableCell>
                    <TableCell sx={{ borderColor: alpha('#fff', 0.1) }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: alpha('#fff', 0.7) }}>
                        <CancelIcon sx={{ color: '#c62828', fontSize: 20 }} />
                        {row.scratch}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderColor: alpha('#fff', 0.1) }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'white' }}>
                        <CheckCircleIcon sx={{ color: '#00ED64', fontSize: 20 }} />
                        {row.netpad}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Container>
      </Box>

      {/* Three Pillars Section */}
      <Box sx={{ py: 8, bgcolor: alpha('#000', 0.2) }}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight="bold" textAlign="center" gutterBottom sx={{ color: 'white' }}>
            The Four Pillars of NetPad
          </Typography>
          <Typography variant="h6" textAlign="center" sx={{ mb: 6, color: alpha('#fff', 0.6) }}>
            Forms, Workflows, Data Management, and AI & Conversational Experiences — all integrated
          </Typography>

          <Grid container spacing={4}>
            {capabilityComparison.map((cap, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Card
                  sx={{
                    height: '100%',
                    bgcolor: alpha('#fff', 0.03),
                    border: '1px solid',
                    borderColor: alpha('#fff', 0.1),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: alpha(cap.color, 0.5),
                      bgcolor: alpha(cap.color, 0.05),
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                      <Box
                        sx={{
                          bgcolor: alpha(cap.color, 0.2),
                          color: cap.color,
                          p: 1.5,
                          borderRadius: 2,
                          display: 'flex',
                        }}
                      >
                        {cap.icon}
                      </Box>
                      <Typography variant="h5" fontWeight="bold" sx={{ color: 'white' }}>
                        {cap.category}
                      </Typography>
                    </Box>

                    <Typography variant="subtitle2" sx={{ color: '#ff8a80' }} gutterBottom>
                      Without NetPad ({cap.scratchTime})
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, mb: 3, mt: 1 }}>
                      {cap.scratch.map((item, j) => (
                        <li key={j} style={{ marginBottom: 4 }}>
                          <Typography variant="body2" sx={{ color: alpha('#fff', 0.6) }}>
                            {item}
                          </Typography>
                        </li>
                      ))}
                    </Box>

                    <Divider sx={{ my: 2, borderColor: alpha('#fff', 0.1) }} />

                    <Typography variant="subtitle2" sx={{ color: cap.color }} gutterBottom>
                      With NetPad ({cap.netpadTime})
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                      {cap.netpad.map((item, j) => (
                        <li key={j} style={{ marginBottom: 4 }}>
                          <Typography variant="body2" sx={{ color: 'white' }}>{item}</Typography>
                        </li>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Bottom Line Section */}
      <Box sx={{ py: 8 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ color: 'white' }}>
            The Bottom Line
          </Typography>

          <Grid container spacing={4} sx={{ my: 4 }}>
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  p: 4,
                  bgcolor: alpha('#c62828', 0.1),
                  border: '1px solid',
                  borderColor: alpha('#c62828', 0.3),
                  height: '100%',
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ color: '#ff8a80' }}>
                  Building From Scratch
                </Typography>
                <Typography variant="h2" fontWeight="bold" sx={{ color: '#ff8a80' }}>
                  10-16 weeks
                </Typography>
                <Typography variant="body2" sx={{ mt: 2, color: alpha('#fff', 0.6) }}>
                  Forms + Workflows + Data + AI/Conversational
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#fff', 0.6) }}>
                  8,000+ lines of code
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#fff', 0.6) }}>
                  Ongoing maintenance burden
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  p: 4,
                  bgcolor: alpha('#00ED64', 0.1),
                  border: '1px solid',
                  borderColor: alpha('#00ED64', 0.3),
                  height: '100%',
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ color: '#00ED64' }}>
                  With NetPad
                </Typography>
                <Typography variant="h2" fontWeight="bold" sx={{ color: '#00ED64' }}>
                  1-2 days
                </Typography>
                <Typography variant="body2" sx={{ mt: 2, color: alpha('#fff', 0.8) }}>
                  All four capabilities integrated
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#fff', 0.8) }}>
                  ~100 lines of configuration
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#fff', 0.8) }}>
                  Maintained by NetPad team
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mt: 4 }}>
            <Button
              component={Link}
              href="/builder"
              variant="contained"
              size="large"
              startIcon={<RocketLaunchIcon />}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #00ED64 0%, #00CC55 100%)',
                color: '#001E2B',
                fontWeight: 600,
                '&:hover': {
                  background: 'linear-gradient(135deg, #00FF6A 0%, #00ED64 100%)',
                },
              }}
            >
              Start Building
            </Button>
            <Button
              component="a"
              href="https://github.com/mrlynn/netpad-v3"
              target="_blank"
              variant="outlined"
              size="large"
              startIcon={<GitHubIcon />}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                borderColor: alpha('#fff', 0.3),
                color: 'white',
                fontWeight: 600,
                '&:hover': {
                  borderColor: '#00ED64',
                  bgcolor: alpha('#00ED64', 0.1),
                },
              }}
            >
              View on GitHub
            </Button>
          </Box>

          <Typography variant="body2" sx={{ mt: 4, color: alpha('#fff', 0.5) }}>
            Free MongoDB Atlas cluster included. No credit card required.
          </Typography>
        </Container>
      </Box>

      {/* What's New in 2026 Section */}
      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Chip
              label="What's New in 2026"
              size="small"
              sx={{
                mb: 2,
                bgcolor: alpha('#E91E63', 0.1),
                color: '#E91E63',
                fontWeight: 600,
              }}
            />
            <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ color: 'white' }}>
              The Future of Data Collection
            </Typography>
            <Typography variant="h6" sx={{ color: alpha('#fff', 0.6), maxWidth: 700, mx: 'auto' }}>
              NetPad has evolved beyond traditional forms. Now with AI-powered conversational experiences, template systems, and enterprise-ready features.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {[
              {
                icon: <ChatBubbleIcon sx={{ fontSize: 40, color: '#E91E63' }} />,
                title: 'Conversational Forms',
                description: 'Collect data through natural language conversations. AI guides users, asks clarifying questions, and extracts structured data automatically.',
                color: '#E91E63',
              },
              {
                icon: <SmartToyIcon sx={{ fontSize: 40, color: '#9C27B0' }} />,
                title: '12+ AI Agents',
                description: 'Form generation, optimization, compliance auditing, translation, and workflow generation — all powered by AI.',
                color: '#9C27B0',
              },
              {
                icon: <FolderSpecialIcon sx={{ fontSize: 40, color: '#2196F3' }} />,
                title: 'Projects & Templates',
                description: 'Organize work by environment (dev/staging/prod) and accelerate development with built-in conversational form templates.',
                color: '#2196F3',
              },
              {
                icon: <RocketLaunchIcon sx={{ fontSize: 40, color: '#00ED64' }} />,
                title: 'One-Click Deployment',
                description: 'Deploy your own instance to Vercel with auto-provisioned database. From database to production in minutes.',
                color: '#00ED64',
              },
            ].map((item, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Card
                  sx={{
                    height: '100%',
                    bgcolor: alpha('#fff', 0.03),
                    border: '1px solid',
                    borderColor: alpha(item.color, 0.2),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: alpha(item.color, 0.5),
                      bgcolor: alpha(item.color, 0.05),
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 3, textAlign: 'center' }}>
                    <Box sx={{ mb: 2 }}>{item.icon}</Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: 'white', mb: 1 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: alpha('#fff', 0.6), lineHeight: 1.6 }}>
                      {item.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* NPM Package & Example Section */}
      <Box sx={{ py: 8, bgcolor: alpha('#000', 0.2) }}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight="bold" textAlign="center" gutterBottom sx={{ color: 'white' }}>
            Get Started Your Way
          </Typography>
          <Typography variant="h6" textAlign="center" sx={{ mb: 6, color: alpha('#fff', 0.6) }}>
            Use the hosted platform or integrate forms and workflows directly into your apps
          </Typography>

          <Grid container spacing={4}>
            {/* NPM Package Card */}
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  height: '100%',
                  bgcolor: alpha('#fff', 0.03),
                  border: '1px solid',
                  borderColor: alpha('#CB3837', 0.3),
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: alpha('#CB3837', 0.5),
                    bgcolor: alpha('#CB3837', 0.05),
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box
                      sx={{
                        bgcolor: alpha('#CB3837', 0.2),
                        color: '#CB3837',
                        p: 1.5,
                        borderRadius: 2,
                        display: 'flex',
                      }}
                    >
                      <TerminalIcon />
                    </Box>
                    <Box>
                      <Chip
                        label="npm package"
                        size="small"
                        sx={{ bgcolor: alpha('#CB3837', 0.2), color: '#CB3837', mb: 0.5 }}
                      />
                      <Typography variant="h5" fontWeight="bold" sx={{ color: 'white' }}>
                        @netpad/forms
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="body1" sx={{ color: alpha('#fff', 0.7), mb: 3 }}>
                    Install the npm package and render NetPad forms directly in your React applications.
                    Perfect for custom integrations and embedded forms.
                  </Typography>

                  <Paper
                    sx={{
                      p: 2,
                      mb: 3,
                      bgcolor: '#1e1e1e',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                    }}
                  >
                    <Typography sx={{ color: '#d4d4d4', fontSize: '0.85rem' }}>
                      <span style={{ color: '#00ED64' }}>$</span> npm install @netpad/forms
                    </Typography>
                  </Paper>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                    <Chip label="28+ Field Types" size="small" variant="outlined" sx={{ borderColor: alpha('#fff', 0.2), color: alpha('#fff', 0.7) }} />
                    <Chip label="Multi-page Wizards" size="small" variant="outlined" sx={{ borderColor: alpha('#fff', 0.2), color: alpha('#fff', 0.7) }} />
                    <Chip label="Conditional Logic" size="small" variant="outlined" sx={{ borderColor: alpha('#fff', 0.2), color: alpha('#fff', 0.7) }} />
                    <Chip label="TypeScript" size="small" variant="outlined" sx={{ borderColor: alpha('#fff', 0.2), color: alpha('#fff', 0.7) }} />
                  </Box>

                  <Button
                    component="a"
                    href="https://www.npmjs.com/package/@netpad/forms"
                    target="_blank"
                    variant="contained"
                    fullWidth
                    startIcon={<TerminalIcon />}
                    sx={{
                      background: 'linear-gradient(135deg, #CB3837 0%, #A32B2A 100%)',
                      color: '#fff',
                      fontWeight: 600,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #E04241 0%, #CB3837 100%)',
                      }
                    }}
                  >
                    View on npm
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Workflows API Card */}
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  height: '100%',
                  bgcolor: alpha('#fff', 0.03),
                  border: '1px solid',
                  borderColor: alpha('#9C27B0', 0.3),
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: alpha('#9C27B0', 0.5),
                    bgcolor: alpha('#9C27B0', 0.05),
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box
                      sx={{
                        bgcolor: alpha('#9C27B0', 0.2),
                        color: '#9C27B0',
                        p: 1.5,
                        borderRadius: 2,
                        display: 'flex',
                      }}
                    >
                      <AccountTreeIcon />
                    </Box>
                    <Box>
                      <Chip
                        label="npm package"
                        size="small"
                        sx={{ bgcolor: alpha('#9C27B0', 0.2), color: '#9C27B0', mb: 0.5 }}
                      />
                      <Typography variant="h5" fontWeight="bold" sx={{ color: 'white' }}>
                        @netpad/workflows
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="body1" sx={{ color: alpha('#fff', 0.7), mb: 3 }}>
                    Trigger and manage workflow executions programmatically from your backend services, cron jobs, or CI/CD pipelines.
                  </Typography>

                  <Paper
                    sx={{
                      p: 2,
                      mb: 3,
                      bgcolor: '#1e1e1e',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                    }}
                  >
                    <Typography sx={{ color: '#d4d4d4', fontSize: '0.85rem' }}>
                      <span style={{ color: '#9C27B0' }}>$</span> npm install @netpad/workflows
                    </Typography>
                  </Paper>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                    <Chip label="Execute Workflows" size="small" variant="outlined" sx={{ borderColor: alpha('#fff', 0.2), color: alpha('#fff', 0.7) }} />
                    <Chip label="Wait for Completion" size="small" variant="outlined" sx={{ borderColor: alpha('#fff', 0.2), color: alpha('#fff', 0.7) }} />
                    <Chip label="Lifecycle Control" size="small" variant="outlined" sx={{ borderColor: alpha('#fff', 0.2), color: alpha('#fff', 0.7) }} />
                    <Chip label="TypeScript" size="small" variant="outlined" sx={{ borderColor: alpha('#fff', 0.2), color: alpha('#fff', 0.7) }} />
                  </Box>

                  <Button
                    component="a"
                    href="https://www.npmjs.com/package/@netpad/workflows"
                    target="_blank"
                    variant="contained"
                    fullWidth
                    startIcon={<AccountTreeIcon />}
                    sx={{
                      background: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)',
                      color: '#fff',
                      fontWeight: 600,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #AB47BC 0%, #9C27B0 100%)',
                      }
                    }}
                  >
                    View on npm
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* MCP Server NPM Package Card */}
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  height: '100%',
                  bgcolor: alpha('#fff', 0.03),
                  border: '1px solid',
                  borderColor: alpha('#FF6B35', 0.3),
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: alpha('#FF6B35', 0.5),
                    bgcolor: alpha('#FF6B35', 0.05),
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box
                      sx={{
                        bgcolor: alpha('#FF6B35', 0.2),
                        color: '#FF6B35',
                        p: 1.5,
                        borderRadius: 2,
                        display: 'flex',
                      }}
                    >
                      <SmartToyIcon />
                    </Box>
                    <Box>
                      <Chip
                        label="npm package"
                        size="small"
                        sx={{ bgcolor: alpha('#FF6B35', 0.2), color: '#FF6B35', mb: 0.5 }}
                      />
                      <Typography variant="h5" fontWeight="bold" sx={{ color: 'white' }}>
                        @netpad/mcp-server
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="body1" sx={{ color: alpha('#fff', 0.7), mb: 3 }}>
                    Build forms with AI assistance. Use Claude, Cursor, or any MCP-compatible AI
                    to generate forms, scaffold apps, and integrate workflows using natural language.
                  </Typography>

                  <Paper
                    sx={{
                      p: 2,
                      mb: 3,
                      bgcolor: '#1e1e1e',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                    }}
                  >
                    <Typography sx={{ color: '#d4d4d4', fontSize: '0.85rem' }}>
                      <span style={{ color: '#FF6B35' }}>$</span> npx @netpad/mcp-server
                    </Typography>
                  </Paper>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                    <Chip label="22 AI Tools" size="small" variant="outlined" sx={{ borderColor: alpha('#fff', 0.2), color: alpha('#fff', 0.7) }} />
                    <Chip label="Natural Language" size="small" variant="outlined" sx={{ borderColor: alpha('#fff', 0.2), color: alpha('#fff', 0.7) }} />
                    <Chip label="App Scaffolding" size="small" variant="outlined" sx={{ borderColor: alpha('#fff', 0.2), color: alpha('#fff', 0.7) }} />
                    <Chip label="Form Generation" size="small" variant="outlined" sx={{ borderColor: alpha('#fff', 0.2), color: alpha('#fff', 0.7) }} />
                  </Box>

                  <Button
                    component="a"
                    href="https://www.npmjs.com/package/@netpad/mcp-server"
                    target="_blank"
                    variant="contained"
                    fullWidth
                    startIcon={<TerminalIcon />}
                    sx={{
                      background: 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)',
                      color: '#fff',
                      fontWeight: 600,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #FF7D4D 0%, #FF6B35 100%)',
                      }
                    }}
                  >
                    View on npm
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* IT Helpdesk Example App Card */}
            <Grid item xs={12}>
              <Card
                sx={{
                  bgcolor: alpha('#fff', 0.03),
                  border: '1px solid',
                  borderColor: alpha('#9C27B0', 0.3),
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: alpha('#9C27B0', 0.5),
                    bgcolor: alpha('#9C27B0', 0.05),
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Grid container spacing={4} alignItems="center">
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <Box
                          sx={{
                            bgcolor: alpha('#9C27B0', 0.2),
                            color: '#9C27B0',
                            p: 1.5,
                            borderRadius: 2,
                            display: 'flex',
                          }}
                        >
                          <SchoolIcon />
                        </Box>
                        <Box>
                          <Chip
                            label="Example App"
                            size="small"
                            sx={{ bgcolor: alpha('#9C27B0', 0.2), color: '#9C27B0', mb: 0.5 }}
                          />
                          <Typography variant="h5" fontWeight="bold" sx={{ color: 'white' }}>
                            IT Helpdesk
                          </Typography>
                        </Box>
                      </Box>

                      <Typography variant="body1" sx={{ color: alpha('#fff', 0.7), mb: 3 }}>
                        A complete IT helpdesk application built on NetPad. Capture requests,
                        route them to the right team, and automate approvals and notifications
                        using forms, workflows, and MongoDB.
                      </Typography>

                      <Paper
                        sx={{
                          p: 2,
                          mb: 3,
                          bgcolor: '#1e1e1e',
                          borderRadius: 1,
                          fontFamily: 'monospace',
                        }}
                      >
                        <Typography sx={{ color: '#d4d4d4', fontSize: '0.85rem' }}>
                          <span style={{ color: '#9C27B0' }}>$</span> git clone https://github.com/mrlynn/netpad-v3
                        </Typography>
                        <Typography sx={{ color: '#d4d4d4', fontSize: '0.85rem' }}>
                          <span style={{ color: '#9C27B0' }}>$</span> cd netpad-3/examples/it-helpdesk
                        </Typography>
                      </Paper>

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                        <Chip label="Request Intake" size="small" variant="outlined" sx={{ borderColor: alpha('#fff', 0.2), color: alpha('#fff', 0.7) }} />
                        <Chip label="Triage & Routing" size="small" variant="outlined" sx={{ borderColor: alpha('#fff', 0.2), color: alpha('#fff', 0.7) }} />
                        <Chip label="Approvals" size="small" variant="outlined" sx={{ borderColor: alpha('#fff', 0.2), color: alpha('#fff', 0.7) }} />
                        <Chip label="Slack & Email" size="small" variant="outlined" sx={{ borderColor: alpha('#fff', 0.2), color: alpha('#fff', 0.7) }} />
                      </Box>

                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                          component="a"
                          href="https://github.com/mrlynn/netpad-v3/tree/main/examples/it-helpdesk"
                          target="_blank"
                          variant="contained"
                          startIcon={<SchoolIcon />}
                          sx={{
                            background: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)',
                            color: '#fff',
                            fontWeight: 600,
                            '&:hover': {
                              background: 'linear-gradient(135deg, #AB47BC 0%, #9C27B0 100%)',
                            }
                          }}
                        >
                          View Example
                        </Button>
                        <Button
                          component="a"
                          href="https://github.com/mrlynn/netpad-v3/tree/main/examples/it-helpdesk"
                          target="_blank"
                          variant="outlined"
                          startIcon={<GitHubIcon />}
                          sx={{
                            borderColor: alpha('#fff', 0.3),
                            color: 'white',
                            fontWeight: 600,
                            '&:hover': {
                              borderColor: '#FF6B35',
                              bgcolor: alpha('#FF6B35', 0.1),
                            }
                          }}
                        >
                          Read README
                        </Button>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Paper
                        sx={{
                          bgcolor: '#1e1e1e',
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}
                      >
                        <Box sx={{ bgcolor: '#FF6B35', px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                            Claude Desktop Config
                          </Typography>
                          <Chip label="MCP Protocol" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.7rem' }} />
                        </Box>
                        <Box sx={{ p: 2 }}>
                          <pre style={{ margin: 0, color: '#d4d4d4', fontSize: '11px', lineHeight: 1.4, overflow: 'auto' }}>
{`{
  "mcpServers": {
    "netpad-forms": {
      "command": "npx",
      "args": ["@netpad/mcp-server"]
    }
  }
}

// Then ask Claude:
"Create a lead capture form with
 company size and interest fields"`}
                          </pre>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          py: 4,
          borderTop: '1px solid',
          borderColor: alpha('#fff', 0.1),
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            <Image
              src="/logo-250x250-trans.png"
              alt="NetPad"
              width={24}
              height={24}
            />
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.5) }}>
              NetPad — The Complete MongoDB Data Platform
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
