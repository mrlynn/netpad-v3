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
} from '@mui/material';
import Link from 'next/link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CodeIcon from '@mui/icons-material/Code';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import StorageIcon from '@mui/icons-material/Storage';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

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
      <pre style={{ margin: 0, color: '#d4d4d4', fontSize: '12px', lineHeight: 1.5, overflow: 'auto' }}>
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
  { feature: 'Error display', scratch: 'Custom error handling', netpad: 'Automatic' },
  { feature: 'Accessibility (ARIA)', scratch: 'Manual implementation', netpad: 'Built-in' },
];

const capabilityComparison = [
  {
    category: 'Forms',
    icon: <CodeIcon />,
    scratch: ['Build 15+ field components', 'Implement validation logic', 'Handle conditional visibility', 'Manage multi-page state', 'Style everything from scratch'],
    netpad: ['28+ field types included', 'Declarative validation', 'JSON-based conditions', 'Config-driven wizards', 'Themeable out of the box'],
    scratchTime: '2-3 weeks',
    netpadTime: '2-3 hours',
  },
  {
    category: 'Workflows',
    icon: <AccountTreeIcon />,
    scratch: ['Design state machine', 'Build approval chains', 'Implement notifications', 'Handle edge cases', 'Add audit logging'],
    netpad: ['Visual workflow builder', 'Pre-built approval patterns', 'Email/Slack integration', 'Automatic retries', 'Built-in audit trail'],
    scratchTime: '3-4 weeks',
    netpadTime: '1-2 days',
  },
  {
    category: 'Data Management',
    icon: <StorageIcon />,
    scratch: ['Design database schema', 'Build CRUD APIs', 'Implement search/filter', 'Add pagination', 'Build admin dashboard'],
    netpad: ['Automatic MongoDB storage', 'REST API included', 'Full-text search', 'Built-in pagination', 'Admin dashboard ready'],
    scratchTime: '2-3 weeks',
    netpadTime: 'Included',
  },
];

export default function WhyNetPadPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8f9fa' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #001E2B 0%, #00303F 100%)',
          color: 'white',
          py: 8,
        }}
      >
        <Container maxWidth="lg">
          <Button
            component={Link}
            href="/"
            startIcon={<ArrowBackIcon />}
            sx={{ color: 'white', mb: 4 }}
          >
            Back to Demo
          </Button>

          <Typography variant="h2" fontWeight="bold" gutterBottom>
            Why NetPad?
          </Typography>
          <Typography variant="h5" sx={{ opacity: 0.9, maxWidth: 800, mb: 4 }}>
            Stop rebuilding forms, workflows, and data management from scratch.
            Ship production-ready applications in hours instead of weeks.
          </Typography>

          <Grid container spacing={3}>
            {[
              { icon: <SpeedIcon sx={{ fontSize: 40 }} />, stat: '10x', label: 'Faster Development' },
              { icon: <CodeIcon sx={{ fontSize: 40 }} />, stat: '90%', label: 'Less Code' },
              { icon: <SecurityIcon sx={{ fontSize: 40 }} />, stat: '100%', label: 'Type Safe' },
            ].map((item, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}>
                  {item.icon}
                  <Typography variant="h3" fontWeight="bold" sx={{ my: 1 }}>
                    {item.stat}
                  </Typography>
                  <Typography variant="body1">{item.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Side-by-Side Code Comparison */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" fontWeight="bold" textAlign="center" gutterBottom>
          See the Difference
        </Typography>
        <Typography variant="h6" color="text.secondary" textAlign="center" sx={{ mb: 6, maxWidth: 700, mx: 'auto' }}>
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
            sx={{ fontSize: '1rem', py: 3, px: 2 }}
          />
        </Box>
      </Container>

      {/* Feature Comparison Table */}
      <Box sx={{ bgcolor: 'white', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight="bold" textAlign="center" gutterBottom>
            Feature-by-Feature Comparison
          </Typography>
          <Typography variant="h6" color="text.secondary" textAlign="center" sx={{ mb: 6 }}>
            What you&apos;d need to build vs. what NetPad provides
          </Typography>

          <TableContainer component={Paper} elevation={3}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#001E2B' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '30%' }}>Feature</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '35%' }}>Build From Scratch</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '35%' }}>With NetPad</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {comparisonData.map((row, i) => (
                  <TableRow key={i} sx={{ '&:nth-of-type(odd)': { bgcolor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 500 }}>{row.feature}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CancelIcon sx={{ color: '#c62828', fontSize: 20 }} />
                        {row.scratch}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" fontWeight="bold" textAlign="center" gutterBottom>
          The Three Pillars of NetPad
        </Typography>
        <Typography variant="h6" color="text.secondary" textAlign="center" sx={{ mb: 6 }}>
          Forms, Workflows, and Data Management — all integrated
        </Typography>

        <Grid container spacing={4}>
          {capabilityComparison.map((cap, i) => (
            <Grid item xs={12} md={4} key={i}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box
                      sx={{
                        bgcolor: '#00ED64',
                        color: '#001E2B',
                        p: 1.5,
                        borderRadius: 2,
                        display: 'flex',
                      }}
                    >
                      {cap.icon}
                    </Box>
                    <Typography variant="h5" fontWeight="bold">
                      {cap.category}
                    </Typography>
                  </Box>

                  <Typography variant="subtitle2" color="error" gutterBottom>
                    Without NetPad ({cap.scratchTime})
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mb: 3 }}>
                    {cap.scratch.map((item, j) => (
                      <li key={j}>
                        <Typography variant="body2" color="text.secondary">
                          {item}
                        </Typography>
                      </li>
                    ))}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" sx={{ color: '#00ED64' }} gutterBottom>
                    With NetPad ({cap.netpadTime})
                  </Typography>
                  <Box component="ul" sx={{ pl: 2 }}>
                    {cap.netpad.map((item, j) => (
                      <li key={j}>
                        <Typography variant="body2">{item}</Typography>
                      </li>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Bottom Line Section */}
      <Box sx={{ bgcolor: '#001E2B', color: 'white', py: 8 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            The Bottom Line
          </Typography>

          <Grid container spacing={4} sx={{ my: 4 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 4, bgcolor: 'rgba(198, 40, 40, 0.2)', height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Building From Scratch
                </Typography>
                <Typography variant="h2" fontWeight="bold" sx={{ color: '#ff8a80' }}>
                  6-10 weeks
                </Typography>
                <Typography variant="body2" sx={{ mt: 2, opacity: 0.8 }}>
                  Forms + Workflows + Data Management
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  5,000+ lines of code
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Ongoing maintenance burden
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 4, bgcolor: 'rgba(0, 237, 100, 0.2)', height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  With NetPad
                </Typography>
                <Typography variant="h2" fontWeight="bold" sx={{ color: '#00ED64' }}>
                  1-2 days
                </Typography>
                <Typography variant="body2" sx={{ mt: 2, opacity: 0.8 }}>
                  All three capabilities integrated
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  ~100 lines of configuration
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Maintained by NetPad team
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Button
            component={Link}
            href="/onboarding"
            variant="contained"
            size="large"
            startIcon={<RocketLaunchIcon />}
            sx={{
              mt: 4,
              px: 6,
              py: 2,
              fontSize: '1.2rem',
              bgcolor: '#00ED64',
              color: '#001E2B',
              '&:hover': { bgcolor: '#00C853' },
            }}
          >
            Try the Demo
          </Button>

          <Typography variant="body2" sx={{ mt: 3, opacity: 0.6 }}>
            See a complete 3-page onboarding wizard built with NetPad
          </Typography>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#f5f5f5', py: 4 }}>
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Ready to get started?{' '}
            <Typography
              component="code"
              sx={{ bgcolor: '#e0e0e0', px: 1, py: 0.5, borderRadius: 1 }}
            >
              npm install @netpad/forms
            </Typography>
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
