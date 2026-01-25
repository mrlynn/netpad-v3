'use client';

import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  Card,
  CardContent,
  alpha,
  Divider,
} from '@mui/material';
import Link from 'next/link';
import Image from 'next/image';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SpeedIcon from '@mui/icons-material/Speed';
import CodeIcon from '@mui/icons-material/Code';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DescriptionIcon from '@mui/icons-material/Description';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TerminalIcon from '@mui/icons-material/Terminal';
import LinkIcon from '@mui/icons-material/Link';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import GitHubIcon from '@mui/icons-material/GitHub';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { SpotlightCard, hexToRgb } from '@/components/marketing';

const mcpTools = [
  {
    category: 'Form Generation',
    icon: <DescriptionIcon />,
    color: '#00ED64',
    tools: [
      { name: 'generate_form', desc: 'Create complete forms from natural language' },
      { name: 'generate_field', desc: 'Generate individual field configurations' },
      { name: 'generate_conditional_logic', desc: 'Create show/hide rules' },
      { name: 'generate_computed_field', desc: 'Build calculated fields' },
      { name: 'generate_multipage_config', desc: 'Organize into multi-step wizards' },
    ],
  },
  {
    category: 'Templates & Patterns',
    icon: <AutoFixHighIcon />,
    color: '#9C27B0',
    tools: [
      { name: 'browse_templates', desc: '50+ pre-built templates' },
      { name: 'suggest_form_fields', desc: 'AI field recommendations' },
      { name: 'create_form_from_template', desc: 'Start from templates' },
    ],
  },
  {
    category: 'Workflow Automation',
    icon: <AccountTreeIcon />,
    color: '#2196F3',
    tools: [
      { name: 'create_workflow_from_template', desc: 'Generate automated workflows' },
      { name: 'list_workflow_node_types', desc: '25+ workflow node types' },
      { name: 'add_workflow_node', desc: 'Build custom automations' },
    ],
  },
  {
    category: 'Import & Integration',
    icon: <IntegrationInstructionsIcon />,
    color: '#FF6B35',
    tools: [
      { name: 'create_import_link', desc: 'Shareable one-click import URLs' },
      { name: 'generate_react_code', desc: 'Production-ready React components' },
      { name: 'scaffold_nextjs_app', desc: 'Complete Next.js applications' },
    ],
  },
];

const useCases = [
  { title: 'Internal IT Tools', examples: 'Help desks, equipment requests, onboarding checklists' },
  { title: 'Customer-Facing Forms', examples: 'Lead capture, contact forms, feedback surveys' },
  { title: 'Healthcare Applications', examples: 'Patient intake forms, appointment scheduling' },
  { title: 'Financial Services', examples: 'Expense reports, approval workflows, compliance forms' },
  { title: 'HR Operations', examples: 'Job applications, performance reviews, time-off requests' },
];

export default function MCPPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#001E2B' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'radial-gradient(ellipse at top, rgba(255, 107, 53, 0.15) 0%, transparent 60%)',
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

          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box
                  sx={{
                    bgcolor: alpha('#FF6B35', 0.2),
                    p: 1.5,
                    borderRadius: 2,
                    display: 'flex',
                  }}
                >
                  <SmartToyIcon sx={{ fontSize: 32, color: '#FF6B35' }} />
                </Box>
                <Chip
                  label="Model Context Protocol"
                  size="small"
                  sx={{
                    bgcolor: alpha('#FF6B35', 0.2),
                    color: '#FF6B35',
                    fontWeight: 600,
                  }}
                />
              </Box>

              <Typography variant="h2" fontWeight="bold" gutterBottom sx={{ lineHeight: 1.1 }}>
                Build Forms with{' '}
                <Box
                  component="span"
                  sx={{
                    background: 'linear-gradient(135deg, #FF6B35 0%, #FF8F6B 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Claude AI
                </Box>
              </Typography>

              <Typography variant="h5" sx={{ opacity: 0.85, mb: 3, lineHeight: 1.5 }}>
                Describe what you need. Get a working form in seconds.
                No clicking through configuration dialogs.
              </Typography>

              <Typography variant="body1" sx={{ color: alpha('#fff', 0.7), mb: 4, maxWidth: 500 }}>
                NetPad&apos;s MCP Server gives Claude the ability to create forms, workflows,
                and complete applications through natural conversation. Just describe your
                business need and import the result directly into NetPad.
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  component={Link}
                  href="/waitlist"
                  variant="contained"
                  size="large"
                  startIcon={<RocketLaunchIcon />}
                  sx={{
                    px: 4,
                    py: 1.5,
                    background: 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)',
                    color: '#fff',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #FF7D4D 0%, #FF6B35 100%)',
                    },
                  }}
                >
                  Get Started Free
                </Button>
                <Button
                  component="a"
                  href="https://www.npmjs.com/package/@netpad/mcp-server"
                  target="_blank"
                  variant="outlined"
                  size="large"
                  startIcon={<TerminalIcon />}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderColor: alpha('#fff', 0.3),
                    color: 'white',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#FF6B35',
                      bgcolor: alpha('#FF6B35', 0.1),
                    },
                  }}
                >
                  View on npm
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: alpha('#FF6B35', 0.3),
                  bgcolor: alpha('#000', 0.3),
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '75%', // 4:3 aspect ratio
                    bgcolor: '#1a1a1a',
                  }}
                >
                  <Image
                    src="/netpad-mcp-server-claude.gif"
                    alt="NetPad MCP Server with Claude - Demo"
                    fill
                    style={{ objectFit: 'cover' }}
                    priority
                  />
                </Box>
                <Box sx={{ p: 2, bgcolor: alpha('#FF6B35', 0.1) }}>
                  <Typography variant="body2" sx={{ color: alpha('#fff', 0.8), textAlign: 'center' }}>
                    Claude generating a form and creating an import link in real-time
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Time Comparison Section */}
      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight="bold" textAlign="center" gutterBottom sx={{ color: 'white' }}>
            Order of Magnitude Faster
          </Typography>
          <Typography variant="h6" textAlign="center" sx={{ mb: 6, color: alpha('#fff', 0.6), maxWidth: 700, mx: 'auto' }}>
            The math is simple. Traditional form building takes 30-60 minutes.
            Conversational building takes 2-3 minutes.
          </Typography>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  p: 4,
                  height: '100%',
                  bgcolor: alpha('#c62828', 0.1),
                  border: '1px solid',
                  borderColor: alpha('#c62828', 0.3),
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ color: '#ff8a80' }}>
                  Traditional Approach
                </Typography>
                <Typography variant="h2" fontWeight="bold" sx={{ color: '#ff8a80', mb: 2 }}>
                  30-60 min
                </Typography>
                <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                  {[
                    'Open platform, navigate to forms',
                    'Create new form',
                    'Add field, configure field',
                    'Repeat 10+ times',
                    'Set up validation rules',
                    'Test and iterate',
                  ].map((item, i) => (
                    <li key={i} style={{ marginBottom: 8 }}>
                      <Typography variant="body2" sx={{ color: alpha('#fff', 0.6) }}>
                        {item}
                      </Typography>
                    </li>
                  ))}
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  p: 4,
                  height: '100%',
                  bgcolor: alpha('#00ED64', 0.1),
                  border: '1px solid',
                  borderColor: alpha('#00ED64', 0.3),
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ color: '#00ED64' }}>
                  Conversational Approach
                </Typography>
                <Typography variant="h2" fontWeight="bold" sx={{ color: '#00ED64', mb: 2 }}>
                  2-3 min
                </Typography>
                <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                  {[
                    'Describe what you need',
                    'Review generated form',
                    'Click import link',
                    'Done.',
                  ].map((item, i) => (
                    <li key={i} style={{ marginBottom: 8 }}>
                      <Typography variant="body2" sx={{ color: alpha('#fff', 0.9) }}>
                        {item}
                      </Typography>
                    </li>
                  ))}
                </Box>
                <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: alpha('#00ED64', 0.2) }}>
                  <Typography variant="body2" sx={{ color: alpha('#fff', 0.7), fontStyle: 'italic' }}>
                    Stay focused on your business problem, not field configuration.
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* How It Works Section */}
      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight="bold" textAlign="center" gutterBottom sx={{ color: 'white' }}>
            How It Works
          </Typography>
          <Typography variant="h6" textAlign="center" sx={{ mb: 6, color: alpha('#fff', 0.6) }}>
            Three steps from conversation to working form
          </Typography>

          <Grid container spacing={4}>
            {[
              {
                step: '1',
                title: 'Describe Your Need',
                description: 'Tell Claude what form you need in natural language. Include fields, validation, and any specific requirements.',
                icon: <SmartToyIcon sx={{ fontSize: 40 }} />,
                color: '#FF6B35',
                example: '"I need a form for employees to submit IT support requests with name, email, department, issue category, priority, and description."',
              },
              {
                step: '2',
                title: 'Claude Creates the Form',
                description: 'Claude uses NetPad\'s MCP tools to generate a complete form configuration and creates an import link.',
                icon: <AutoFixHighIcon sx={{ fontSize: 40 }} />,
                color: '#9C27B0',
                example: 'Claude generates 8 fields with proper types, validation, and a shareable import URL.',
              },
              {
                step: '3',
                title: 'One-Click Import',
                description: 'Click the import link, select your project, and the form is ready to use. Customize further if needed.',
                icon: <CloudDownloadIcon sx={{ fontSize: 40 }} />,
                color: '#00ED64',
                example: 'The form appears in NetPad\'s builder, ready to deploy or customize.',
              },
            ].map((item, i) => (
              <Grid item xs={12} md={4} key={i}>
                <SpotlightCard
                  spotlightColor={hexToRgb(item.color)}
                  hoverBorderColor={alpha(item.color, 0.5)}
                  sx={{ height: '100%', p: 4 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box
                      sx={{
                        bgcolor: alpha(item.color, 0.2),
                        color: item.color,
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '1.5rem',
                      }}
                    >
                      {item.step}
                    </Box>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: 'white' }}>
                      {item.title}
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ color: alpha('#fff', 0.7), mb: 3 }}>
                    {item.description}
                  </Typography>
                  <Paper
                    sx={{
                      p: 2,
                      bgcolor: alpha('#000', 0.3),
                      border: '1px solid',
                      borderColor: alpha(item.color, 0.2),
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body2" sx={{ color: alpha('#fff', 0.6), fontStyle: 'italic' }}>
                      {item.example}
                    </Typography>
                  </Paper>
                </SpotlightCard>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Real Example Section */}
      <Box sx={{ py: 8, bgcolor: alpha('#FF6B35', 0.03) }}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight="bold" textAlign="center" gutterBottom sx={{ color: 'white' }}>
            See It in Action
          </Typography>
          <Typography variant="h6" textAlign="center" sx={{ mb: 6, color: alpha('#fff', 0.6) }}>
            A real conversation that creates a working IT support form
          </Typography>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  bgcolor: '#1e1e1e',
                  borderRadius: 2,
                  overflow: 'hidden',
                  height: '100%',
                }}
              >
                <Box sx={{ bgcolor: '#2d2d2d', px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <SmartToyIcon sx={{ color: '#FF6B35' }} />
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
                    You → Claude
                  </Typography>
                </Box>
                <Box sx={{ p: 3 }}>
                  <Typography
                    sx={{
                      color: '#d4d4d4',
                      fontSize: '1rem',
                      lineHeight: 1.8,
                      fontFamily: 'inherit',
                    }}
                  >
                    I need a form for employees to submit IT support requests.
                    It should capture their name, email, department, what category
                    of issue they&apos;re having, priority level, and a description
                    of the problem. Oh, and ask them what they&apos;ve already tried to fix it.
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  bgcolor: '#1e1e1e',
                  borderRadius: 2,
                  overflow: 'hidden',
                  height: '100%',
                }}
              >
                <Box sx={{ bgcolor: alpha('#00ED64', 0.2), px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckCircleIcon sx={{ color: '#00ED64' }} />
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
                    Claude&apos;s Response
                  </Typography>
                </Box>
                <Box sx={{ p: 3 }}>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      color: '#d4d4d4',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                    }}
                  >
{`✅ Import Link Created!

Form: IT Support Request
Fields: 8
Expires: Tomorrow at 4:29 PM

---

→ Import "IT Support Request" to NetPad
https://netpad.io/import/imp_mr3cbk9wtdbk

Click the link to import directly
into your NetPad account.`}
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Chip
              icon={<SpeedIcon />}
              label="From description to working form in under 30 seconds"
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

      {/* 80+ Tools Section */}
      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight="bold" textAlign="center" gutterBottom sx={{ color: 'white' }}>
            80+ MCP Tools
          </Typography>
          <Typography variant="h6" textAlign="center" sx={{ mb: 6, color: alpha('#fff', 0.6), maxWidth: 700, mx: 'auto' }}>
            Claude gains full access to NetPad&apos;s capabilities: forms, workflows, templates, and application scaffolding
          </Typography>

          <Grid container spacing={3}>
            {mcpTools.map((category, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <SpotlightCard
                  spotlightColor={hexToRgb(category.color)}
                  hoverBorderColor={alpha(category.color, 0.5)}
                  sx={{ height: '100%', p: 3 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box
                      sx={{
                        bgcolor: alpha(category.color, 0.2),
                        color: category.color,
                        p: 1.5,
                        borderRadius: 2,
                        display: 'flex',
                      }}
                    >
                      {category.icon}
                    </Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: 'white' }}>
                      {category.category}
                    </Typography>
                  </Box>
                  <Box component="ul" sx={{ pl: 0, m: 0, listStyle: 'none' }}>
                    {category.tools.map((tool, j) => (
                      <li key={j} style={{ marginBottom: 12 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: category.color,
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                          }}
                        >
                          {tool.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: alpha('#fff', 0.6) }}>
                          {tool.desc}
                        </Typography>
                      </li>
                    ))}
                  </Box>
                </SpotlightCard>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Use Cases Section */}
      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight="bold" textAlign="center" gutterBottom sx={{ color: 'white' }}>
            What Developers Are Building
          </Typography>
          <Typography variant="h6" textAlign="center" sx={{ mb: 6, color: alpha('#fff', 0.6) }}>
            From internal tools to customer-facing applications
          </Typography>

          <Grid container spacing={2}>
            {useCases.map((useCase, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Paper
                  sx={{
                    p: 3,
                    height: '100%',
                    bgcolor: alpha('#fff', 0.03),
                    border: '1px solid',
                    borderColor: alpha('#fff', 0.1),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: alpha('#FF6B35', 0.3),
                      bgcolor: alpha('#FF6B35', 0.05),
                    },
                  }}
                >
                  <Typography variant="h6" fontWeight="bold" sx={{ color: 'white', mb: 1 }}>
                    {useCase.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: alpha('#fff', 0.6) }}>
                    {useCase.examples}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Setup Section */}
      <Box sx={{ py: 8, bgcolor: alpha('#FF6B35', 0.03) }}>
        <Container maxWidth="md">
          <Typography variant="h3" fontWeight="bold" textAlign="center" gutterBottom sx={{ color: 'white' }}>
            Get Started in Minutes
          </Typography>
          <Typography variant="h6" textAlign="center" sx={{ mb: 6, color: alpha('#fff', 0.6) }}>
            Connect Claude to NetPad with a simple configuration
          </Typography>

          <Paper
            sx={{
              bgcolor: '#1e1e1e',
              borderRadius: 2,
              overflow: 'hidden',
              mb: 4,
            }}
          >
            <Box sx={{ bgcolor: '#FF6B35', px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
                Claude Desktop Configuration
              </Typography>
              <Chip label="claude_desktop_config.json" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
            </Box>
            <Box sx={{ p: 3 }}>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  color: '#d4d4d4',
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  fontFamily: 'monospace',
                }}
              >
{`{
  "mcpServers": {
    "netpad": {
      "command": "npx",
      "args": ["@netpad/mcp-server"]
    }
  }
}`}
              </Box>
            </Box>
          </Paper>

          <Typography variant="body1" textAlign="center" sx={{ color: alpha('#fff', 0.7), mb: 4 }}>
            Or connect to our hosted MCP server at{' '}
            <Box component="code" sx={{ bgcolor: alpha('#FF6B35', 0.2), px: 1, py: 0.5, borderRadius: 1, color: '#FF6B35' }}>
              https://mcp.netpad.io/mcp
            </Box>
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              component={Link}
              href="/waitlist"
              variant="contained"
              size="large"
              startIcon={<RocketLaunchIcon />}
              sx={{
                px: 4,
                py: 1.5,
                background: 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)',
                color: '#fff',
                fontWeight: 600,
                '&:hover': {
                  background: 'linear-gradient(135deg, #FF7D4D 0%, #FF6B35 100%)',
                },
              }}
            >
              Create NetPad Account
            </Button>
            <Button
              component="a"
              href="https://docs.netpad.io/mcp"
              target="_blank"
              variant="outlined"
              size="large"
              startIcon={<MenuBookIcon />}
              sx={{
                px: 4,
                py: 1.5,
                borderColor: alpha('#fff', 0.3),
                color: 'white',
                fontWeight: 600,
                '&:hover': {
                  borderColor: '#FF6B35',
                  bgcolor: alpha('#FF6B35', 0.1),
                },
              }}
            >
              Read Documentation
            </Button>
          </Box>
        </Container>
      </Box>

      {/* The Bigger Picture Section */}
      <Box sx={{ py: 8 }}>
        <Container maxWidth="md">
          <Typography variant="h3" fontWeight="bold" textAlign="center" gutterBottom sx={{ color: 'white' }}>
            The Future of Developer Tools
          </Typography>
          <Typography variant="h6" textAlign="center" sx={{ mb: 4, color: alpha('#fff', 0.6) }}>
            From &quot;click here, configure this&quot; to &quot;here&apos;s what I need—make it happen&quot;
          </Typography>

          <Paper
            sx={{
              p: 4,
              bgcolor: alpha('#FF6B35', 0.05),
              border: '1px solid',
              borderColor: alpha('#FF6B35', 0.2),
              borderRadius: 2,
            }}
          >
            <Typography variant="body1" sx={{ color: alpha('#fff', 0.85), lineHeight: 1.8, mb: 3 }}>
              This isn&apos;t just about forms. It&apos;s about a fundamental shift in how developer tools work.
            </Typography>
            <Typography variant="body1" sx={{ color: alpha('#fff', 0.85), lineHeight: 1.8, mb: 3 }}>
              The tools we use are becoming conversational. We&apos;re moving from learning each platform&apos;s
              specific UI to describing our intent and letting AI translate it into platform-specific actions.
            </Typography>
            <Typography variant="body1" sx={{ color: alpha('#fff', 0.85), lineHeight: 1.8 }}>
              AI assistants are becoming the universal interface. And platforms that don&apos;t adapt?
              They&apos;ll feel increasingly archaic—like using a command-line FTP client when everyone
              else has cloud storage.
            </Typography>
          </Paper>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ py: 8 }}>
        <Container maxWidth="md">
          <Paper
            sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: alpha('#FF6B35', 0.1),
              border: '1px solid',
              borderColor: alpha('#FF6B35', 0.3),
              borderRadius: 3,
            }}
          >
            <SmartToyIcon sx={{ fontSize: 64, color: '#FF6B35', mb: 2 }} />
            <Typography variant="h4" fontWeight="bold" sx={{ color: 'white', mb: 2 }}>
              Ready to Build with AI?
            </Typography>
            <Typography variant="body1" sx={{ color: alpha('#fff', 0.7), mb: 4, maxWidth: 500, mx: 'auto' }}>
              Join developers who are building forms and workflows 10x faster
              with conversational AI.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                component={Link}
                href="/waitlist"
                variant="contained"
                size="large"
                sx={{
                  px: 5,
                  py: 1.5,
                  background: 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #FF7D4D 0%, #FF6B35 100%)',
                  },
                }}
              >
                Get Started Free
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
                  borderColor: alpha('#fff', 0.3),
                  color: 'white',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#FF6B35',
                    bgcolor: alpha('#FF6B35', 0.1),
                  },
                }}
              >
                View on GitHub
              </Button>
            </Box>
          </Paper>
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
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Image
                src="/logo-250x250-trans.png"
                alt="NetPad"
                width={24}
                height={24}
              />
              <Typography variant="body2" sx={{ color: alpha('#fff', 0.5) }}>
                NetPad — Build Forms with AI
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Typography
                component={Link}
                href="/auth/login"
                variant="body2"
                sx={{
                  color: alpha('#fff', 0.5),
                  textDecoration: 'none',
                  '&:hover': { color: alpha('#fff', 0.8) },
                }}
              >
                Sign in
              </Typography>
              <Typography
                component="a"
                href="https://docs.netpad.io/mcp"
                target="_blank"
                variant="body2"
                sx={{
                  color: alpha('#fff', 0.5),
                  textDecoration: 'none',
                  '&:hover': { color: alpha('#fff', 0.8) },
                }}
              >
                Documentation
              </Typography>
              <Typography
                component="a"
                href="https://www.npmjs.com/package/@netpad/mcp-server"
                target="_blank"
                variant="body2"
                sx={{
                  color: alpha('#fff', 0.5),
                  textDecoration: 'none',
                  '&:hover': { color: alpha('#fff', 0.8) },
                }}
              >
                npm
              </Typography>
              <Typography
                component="a"
                href="https://github.com/mrlynn/netpad-v3"
                target="_blank"
                variant="body2"
                sx={{
                  color: alpha('#fff', 0.5),
                  textDecoration: 'none',
                  '&:hover': { color: alpha('#fff', 0.8) },
                }}
              >
                GitHub
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
