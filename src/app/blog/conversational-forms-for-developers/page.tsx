'use client';

import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  alpha,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ArrowBack,
  Schedule,
  AutoAwesome,
  Code,
  Storage,
  AccountTree,
  Settings,
  PlayArrow,
  CheckCircle,
  ContentCopy,
} from '@mui/icons-material';
import Link from 'next/link';
import { useState } from 'react';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { useAuth } from '@/contexts/AuthContext';

// Reusable components
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="h4"
      sx={{
        fontWeight: 700,
        color: '#fff',
        mt: 6,
        mb: 3,
        fontSize: { xs: '1.5rem', md: '1.75rem' },
      }}
    >
      {children}
    </Typography>
  );
}

function SubHeader({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="h5"
      sx={{
        fontWeight: 600,
        color: '#fff',
        mt: 4,
        mb: 2,
        fontSize: { xs: '1.2rem', md: '1.35rem' },
      }}
    >
      {children}
    </Typography>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        color: alpha('#fff', 0.8),
        mb: 3,
        lineHeight: 1.8,
        fontSize: '1.05rem',
      }}
    >
      {children}
    </Typography>
  );
}

function CodeBlock({
  title,
  language,
  children,
}: {
  title?: string;
  language?: string;
  children: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        my: 3,
        bgcolor: alpha('#000', 0.4),
        border: '1px solid',
        borderColor: alpha('#fff', 0.1),
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {title && (
        <Box
          sx={{
            px: 3,
            py: 1.5,
            bgcolor: alpha('#fff', 0.05),
            borderBottom: '1px solid',
            borderColor: alpha('#fff', 0.1),
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Code sx={{ fontSize: 16, color: alpha('#fff', 0.5) }} />
            <Typography
              variant="body2"
              sx={{ color: alpha('#fff', 0.6), fontWeight: 500 }}
            >
              {title}
            </Typography>
            {language && (
              <Chip
                label={language}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: alpha('#00ED64', 0.15),
                  color: '#00ED64',
                }}
              />
            )}
          </Box>
          <Button
            size="small"
            startIcon={copied ? <CheckCircle /> : <ContentCopy />}
            onClick={handleCopy}
            sx={{
              color: copied ? '#00ED64' : alpha('#fff', 0.5),
              fontSize: '0.75rem',
              '&:hover': { color: '#00ED64' },
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </Box>
      )}
      <Box
        component="pre"
        sx={{
          p: 3,
          m: 0,
          fontFamily: '"Fira Code", "Monaco", monospace',
          fontSize: '0.85rem',
          color: alpha('#fff', 0.9),
          lineHeight: 1.6,
          whiteSpace: 'pre',
          overflowX: 'auto',
        }}
      >
        {children}
      </Box>
    </Paper>
  );
}

function DiagramBlock({ children }: { children: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        my: 4,
        p: 3,
        bgcolor: alpha('#00ED64', 0.05),
        border: '1px solid',
        borderColor: alpha('#00ED64', 0.2),
        borderRadius: 2,
      }}
    >
      <Box
        component="pre"
        sx={{
          m: 0,
          fontFamily: '"Fira Code", monospace',
          fontSize: '0.8rem',
          color: alpha('#fff', 0.85),
          lineHeight: 1.5,
          whiteSpace: 'pre',
          overflowX: 'auto',
        }}
      >
        {children}
      </Box>
    </Paper>
  );
}

function ConfigTable({
  rows,
}: {
  rows: { property: string; purpose: string }[];
}) {
  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        my: 3,
        bgcolor: alpha('#fff', 0.02),
        border: '1px solid',
        borderColor: alpha('#fff', 0.1),
        borderRadius: 2,
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell
              sx={{
                color: alpha('#fff', 0.6),
                fontWeight: 600,
                borderColor: alpha('#fff', 0.1),
              }}
            >
              Property
            </TableCell>
            <TableCell
              sx={{
                color: alpha('#fff', 0.6),
                fontWeight: 600,
                borderColor: alpha('#fff', 0.1),
              }}
            >
              Purpose
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              <TableCell
                sx={{
                  color: '#00ED64',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  borderColor: alpha('#fff', 0.05),
                }}
              >
                {row.property}
              </TableCell>
              <TableCell
                sx={{
                  color: alpha('#fff', 0.8),
                  borderColor: alpha('#fff', 0.05),
                }}
              >
                {row.purpose}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function OperatorTable({
  rows,
}: {
  rows: { operator: string; description: string; example: string }[];
}) {
  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        my: 3,
        bgcolor: alpha('#fff', 0.02),
        border: '1px solid',
        borderColor: alpha('#fff', 0.1),
        borderRadius: 2,
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell
              sx={{
                color: alpha('#fff', 0.6),
                fontWeight: 600,
                borderColor: alpha('#fff', 0.1),
              }}
            >
              Operator
            </TableCell>
            <TableCell
              sx={{
                color: alpha('#fff', 0.6),
                fontWeight: 600,
                borderColor: alpha('#fff', 0.1),
              }}
            >
              Description
            </TableCell>
            <TableCell
              sx={{
                color: alpha('#fff', 0.6),
                fontWeight: 600,
                borderColor: alpha('#fff', 0.1),
              }}
            >
              Example
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              <TableCell
                sx={{
                  color: '#00ED64',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  borderColor: alpha('#fff', 0.05),
                }}
              >
                {row.operator}
              </TableCell>
              <TableCell
                sx={{
                  color: alpha('#fff', 0.8),
                  borderColor: alpha('#fff', 0.05),
                }}
              >
                {row.description}
              </TableCell>
              <TableCell
                sx={{
                  color: alpha('#fff', 0.6),
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  borderColor: alpha('#fff', 0.05),
                }}
              >
                {row.example}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function StepHeader({
  step,
  title,
  icon,
}: {
  step: number;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 6, mb: 3 }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          bgcolor: alpha('#00ED64', 0.15),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#00ED64',
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          variant="overline"
          sx={{ color: '#00ED64', fontWeight: 600 }}
        >
          Step {step}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff' }}>
          {title}
        </Typography>
      </Box>
    </Box>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <Box sx={{ my: 3 }}>
      {items.map((item, i) => (
        <Box
          key={i}
          sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}
        >
          <CheckCircle sx={{ color: '#00ED64', fontSize: 18, mt: 0.25 }} />
          <Typography sx={{ color: alpha('#fff', 0.8), lineHeight: 1.7 }}>
            {item}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export default function ConversationalFormsForDevelopersPage() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#001E2B' }}>
      {!isLoading && isAuthenticated && <AppNavBar />}

      {/* Header */}
      <Box
        sx={{
          pt: { xs: 6, md: 10 },
          pb: { xs: 4, md: 6 },
          background: `radial-gradient(ellipse at top, rgba(0, 237, 100, 0.1) 0%, transparent 60%)`,
        }}
      >
        <Container maxWidth="md">
          <Button
            component={Link}
            href="/blog"
            startIcon={<ArrowBack />}
            sx={{
              color: alpha('#fff', 0.6),
              mb: 4,
              '&:hover': { color: '#00ED64' },
            }}
          >
            Back to Blog
          </Button>

          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            <Chip
              label="Technical"
              size="small"
              sx={{
                bgcolor: alpha('#9C27B0', 0.15),
                color: '#9C27B0',
                fontWeight: 600,
              }}
            />
            <Chip
              label="Part 2"
              size="small"
              sx={{
                bgcolor: alpha('#00ED64', 0.15),
                color: '#00ED64',
                fontWeight: 600,
              }}
            />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: alpha('#fff', 0.5),
              }}
            >
              <Schedule sx={{ fontSize: 16 }} />
              <Typography variant="body2">12 min read</Typography>
            </Box>
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.5) }}>
              January 2025
            </Typography>
          </Box>

          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2rem', md: '2.75rem' },
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.2,
              mb: 3,
            }}
          >
            Conversational Forms for Developers: Schema, Logic, and Automation
          </Typography>

          <Typography
            sx={{
              fontSize: '1.2rem',
              color: alpha('#fff', 0.7),
              lineHeight: 1.6,
            }}
          >
            The technical deep-dive: defining schemas, configuring conversation flow, adding conditional logic, and connecting to workflows.
          </Typography>
        </Container>
      </Box>

      {/* Article Content */}
      <Container maxWidth="md" sx={{ pb: 8 }}>
        <Box sx={{ maxWidth: 720 }}>
          {/* Intro */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 4,
              bgcolor: alpha('#2196F3', 0.1),
              border: '1px solid',
              borderColor: alpha('#2196F3', 0.2),
              borderRadius: 2,
            }}
          >
            <Typography sx={{ color: alpha('#fff', 0.85) }}>
              In{' '}
              <Link
                href="/blog/conversational-forms-101"
                style={{ color: '#00ED64' }}
              >
                Part 1
              </Link>
              , we covered the business case for conversational forms—why they convert better, when to use them, and how they fit into your data capture strategy. Now let&apos;s build one.
            </Typography>
          </Paper>

          <Paragraph>
            This guide walks through the technical implementation: defining your schema, configuring the conversation flow, adding conditional logic, connecting to workflows, and deploying to production. By the end, you&apos;ll have a working conversational form capturing structured data into MongoDB.
          </Paragraph>

          {/* Architecture */}
          <SectionHeader>The Architecture: How It Actually Works</SectionHeader>

          <Paragraph>
            Before we write any configuration, here&apos;s what&apos;s happening under the hood:
          </Paragraph>

          <DiagramBlock>
{`┌─────────────────────────────────────────────────────────────────┐
│                        YOUR SCHEMA                              │
│  (fields, types, validation rules, required/optional)           │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
          ┌─────────────────┐         ┌─────────────────┐
          │  TRADITIONAL    │         │  CONVERSATIONAL │
          │  FORM VIEW      │         │  CHAT VIEW      │
          │                 │         │                 │
          │  [Field 1]      │         │  Bot: Question  │
          │  [Field 2]      │         │  User: Answer   │
          │  [Field 3]      │         │  Bot: Follow-up │
          │  [Submit]       │         │  ...            │
          └────────┬────────┘         └────────┬────────┘
                   │                           │
                   └─────────────┬─────────────┘
                                 │
                                 ▼
                   ┌─────────────────────────┐
                   │   IDENTICAL DATA        │
                   │   STRUCTURE             │
                   │                         │
                   │   {                     │
                   │     "name": "Sarah",    │
                   │     "email": "...",     │
                   │     "urgency": "high"   │
                   │   }                     │
                   └────────────┬────────────┘
                                │
                                ▼
                   ┌─────────────────────────┐
                   │   WORKFLOWS             │
                   │   (routing, email,      │
                   │    Slack, webhooks)     │
                   └────────────┬────────────┘
                                │
                                ▼
                   ┌─────────────────────────┐
                   │   MONGODB               │
                   │   (your collection)     │
                   └─────────────────────────┘`}
          </DiagramBlock>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              my: 4,
              bgcolor: alpha('#00ED64', 0.1),
              border: '1px solid',
              borderColor: alpha('#00ED64', 0.2),
              borderRadius: 2,
              borderLeft: '4px solid #00ED64',
            }}
          >
            <Typography sx={{ color: alpha('#fff', 0.9), fontWeight: 500 }}>
              <strong>Key insight:</strong> The schema is the source of truth. Both interfaces render from it. Data flows identically regardless of which interface the user chose.
            </Typography>
          </Paper>

          {/* Step 1: Define Schema */}
          <StepHeader step={1} title="Define Your Schema" icon={<Storage />} />

          <Paragraph>
            Every conversational form starts with a schema. This defines what data you&apos;re capturing, field types, validation rules, and what&apos;s required vs. optional.
          </Paragraph>

          <SubHeader>Basic Schema Example: IT Support Ticket</SubHeader>

          <CodeBlock title="schema.json" language="JSON">
{`{
  "name": "IT Support Request",
  "slug": "it-support-request",
  "description": "Internal IT help desk ticket",
  "fields": [
    {
      "path": "reporter_name",
      "label": "Your Name",
      "type": "short_text",
      "required": true,
      "placeholder": "Enter your full name"
    },
    {
      "path": "reporter_email",
      "label": "Email",
      "type": "email",
      "required": true,
      "validation": {
        "pattern": "^[^@]+@yourcompany\\\\.com$",
        "errorMessage": "Please use your company email"
      }
    },
    {
      "path": "issue_type",
      "label": "Issue Type",
      "type": "dropdown",
      "required": true,
      "options": [
        { "label": "Hardware", "value": "hardware" },
        { "label": "Software", "value": "software" },
        { "label": "Network/Connectivity", "value": "network" },
        { "label": "Access/Permissions", "value": "access" },
        { "label": "Other", "value": "other" }
      ]
    },
    {
      "path": "urgency",
      "label": "Urgency",
      "type": "dropdown",
      "required": true,
      "options": [
        { "label": "Critical - System down", "value": "critical" },
        { "label": "High - Blocking my work", "value": "high" },
        { "label": "Medium - Inconvenient but working", "value": "medium" },
        { "label": "Low - When you get a chance", "value": "low" }
      ]
    },
    {
      "path": "description",
      "label": "Describe the Issue",
      "type": "long_text",
      "required": true,
      "placeholder": "What's happening? When did it start?",
      "validation": {
        "minLength": 20,
        "errorMessage": "Please provide at least a brief description"
      }
    },
    {
      "path": "device_type",
      "label": "Device Type",
      "type": "dropdown",
      "required": false,
      "options": [
        { "label": "Laptop", "value": "laptop" },
        { "label": "Desktop", "value": "desktop" },
        { "label": "Mobile", "value": "mobile" },
        { "label": "Other", "value": "other" }
      ]
    },
    {
      "path": "asset_tag",
      "label": "Asset Tag (if known)",
      "type": "short_text",
      "required": false,
      "helpText": "Found on the sticker on your device"
    }
  ]
}`}
          </CodeBlock>

          <Paragraph>
            This schema works for both the traditional form view and conversational view. The traditional form renders all fields at once. The conversational view turns each field into a question.
          </Paragraph>

          {/* Step 2: Configure Conversation */}
          <StepHeader step={2} title="Configure the Conversation" icon={<Settings />} />

          <Paragraph>
            The conversational interface needs additional configuration to control <em>how</em> questions are asked—tone, phrasing, follow-up behavior.
          </Paragraph>

          <SubHeader>Conversation Configuration</SubHeader>

          <CodeBlock title="conversation-config.json" language="JSON">
{`{
  "formId": "it-support-request",
  "conversational": {
    "enabled": true,
    "persona": {
      "style": "friendly",
      "tone": "I'm here to help you get this sorted quickly.",
      "behaviors": [
        "Acknowledge user frustration empathetically",
        "Keep responses concise",
        "Confirm understanding before moving on"
      ],
      "restrictions": [
        "Don't promise specific resolution times",
        "Don't troubleshoot—just capture the ticket"
      ]
    },
    "objective": "Collect all required information for an IT support ticket while making the user feel heard.",
    "greeting": "Hey! I'm here to help you report an IT issue. Let's get you sorted. What's your name?",
    "closing": "Got it—I've logged your ticket. Someone from IT will reach out shortly. Anything else I can help with?",
    "topics": [
      {
        "id": "reporter_info",
        "name": "Reporter Information",
        "description": "Capture who is reporting the issue",
        "priority": "required",
        "depth": "surface",
        "fields": ["reporter_name", "reporter_email"]
      },
      {
        "id": "issue_details",
        "name": "Issue Details",
        "description": "Understand what's wrong",
        "priority": "required",
        "depth": "moderate",
        "fields": ["issue_type", "urgency", "description"]
      },
      {
        "id": "device_info",
        "name": "Device Information",
        "description": "Capture device details if relevant",
        "priority": "optional",
        "depth": "surface",
        "fields": ["device_type", "asset_tag"]
      }
    ],
    "limits": {
      "maxTurns": 15,
      "maxDuration": 5,
      "minConfidence": 0.8
    }
  }
}`}
          </CodeBlock>

          <SubHeader>What This Configuration Does</SubHeader>

          <ConfigTable
            rows={[
              { property: 'persona.style', purpose: 'Controls conversational tone (friendly, professional, empathetic, casual)' },
              { property: 'persona.behaviors', purpose: 'Guidelines the AI follows during conversation' },
              { property: 'persona.restrictions', purpose: 'Things the AI will not do or say' },
              { property: 'objective', purpose: 'The goal of the conversation (helps AI stay on track)' },
              { property: 'greeting / closing', purpose: 'Fixed opening and closing messages' },
              { property: 'topics', purpose: 'Groups fields into logical conversation segments' },
              { property: 'topics[].priority', purpose: 'Whether the topic is required or optional' },
              { property: 'topics[].depth', purpose: 'How deeply to explore (surface = quick, deep = follow-ups)' },
              { property: 'limits.maxTurns', purpose: 'Prevents endless conversations' },
              { property: 'limits.minConfidence', purpose: 'Minimum confidence threshold before accepting an answer' },
            ]}
          />

          {/* Step 3: Conditional Logic */}
          <StepHeader step={3} title="Add Conditional Logic" icon={<AccountTree />} />

          <Paragraph>
            Conversational forms shine when different users need different questions. Here&apos;s how to add branching.
          </Paragraph>

          <SubHeader>Conditional Field Configuration</SubHeader>

          <CodeBlock title="conditional-field.json" language="JSON">
{`{
  "path": "hardware_details",
  "label": "Hardware Details",
  "type": "long_text",
  "required": false,
  "conditionalLogic": {
    "action": "show",
    "logicType": "all",
    "conditions": [
      {
        "field": "issue_type",
        "operator": "equals",
        "value": "hardware"
      }
    ]
  },
  "conversationalPrompt": "Since this is a hardware issue, can you describe what's physically happening? Any sounds, lights, or error messages?"
}`}
          </CodeBlock>

          <SubHeader>More Complex Branching</SubHeader>

          <Paragraph>
            Show a field only when urgency is critical AND issue type is network:
          </Paragraph>

          <CodeBlock title="complex-condition.json" language="JSON">
{`{
  "path": "affected_users",
  "label": "How many people are affected?",
  "type": "number",
  "required": false,
  "conditionalLogic": {
    "action": "show",
    "logicType": "all",
    "conditions": [
      {
        "field": "urgency",
        "operator": "equals",
        "value": "critical"
      },
      {
        "field": "issue_type",
        "operator": "equals",
        "value": "network"
      }
    ]
  },
  "conversationalPrompt": "This sounds serious. How many people on your team are affected by this network issue?"
}`}
          </CodeBlock>

          <SubHeader>Available Operators</SubHeader>

          <OperatorTable
            rows={[
              { operator: 'equals', description: 'Exact match', example: '"urgency" equals "critical"' },
              { operator: 'not_equals', description: 'Does not match', example: '"issue_type" not_equals "other"' },
              { operator: 'contains', description: 'String contains', example: '"description" contains "password"' },
              { operator: 'greater_than', description: 'Numeric comparison', example: '"affected_users" greater_than 10' },
              { operator: 'less_than', description: 'Numeric comparison', example: '"budget" less_than 1000' },
              { operator: 'is_empty', description: 'Field has no value', example: '"asset_tag" is_empty' },
              { operator: 'is_not_empty', description: 'Field has a value', example: '"device_type" is_not_empty' },
            ]}
          />

          {/* Step 4: Workflows */}
          <StepHeader step={4} title="Connect to Workflows" icon={<AccountTree />} />

          <Paragraph>
            Once data is captured, you typically want to trigger downstream automation. NetPad workflows connect directly to form submissions.
          </Paragraph>

          <SubHeader>Basic Workflow: Email Notification + Database Save</SubHeader>

          <CodeBlock title="workflow.json" language="JSON">
{`{
  "name": "IT Ticket Processing",
  "trigger": {
    "type": "form_submission",
    "formSlug": "it-support-request"
  },
  "nodes": [
    {
      "id": "save_to_db",
      "type": "mongodb-insert",
      "config": {
        "collection": "support_tickets",
        "document": {
          "reporter": "{{form.reporter_name}}",
          "email": "{{form.reporter_email}}",
          "issue_type": "{{form.issue_type}}",
          "urgency": "{{form.urgency}}",
          "description": "{{form.description}}",
          "status": "open",
          "created_at": "{{now}}"
        }
      }
    },
    {
      "id": "notify_user",
      "type": "email-send",
      "config": {
        "to": "{{form.reporter_email}}",
        "subject": "We received your IT request",
        "body": "Hi {{form.reporter_name}},\\n\\nWe've logged your {{form.issue_type}} issue. Our team will review it shortly.\\n\\nTicket ID: {{save_to_db.insertedId}}\\n\\nThanks,\\nIT Support"
      }
    },
    {
      "id": "notify_it_team",
      "type": "email-send",
      "config": {
        "to": "it-support@yourcompany.com",
        "subject": "[{{form.urgency | uppercase}}] New ticket: {{form.issue_type}}",
        "body": "New ticket from {{form.reporter_name}} ({{form.reporter_email}}):\\n\\n{{form.description}}\\n\\nUrgency: {{form.urgency}}\\nDevice: {{form.device_type | default: 'Not specified'}}"
      }
    }
  ]
}`}
          </CodeBlock>

          <SubHeader>Advanced Workflow: Conditional Routing</SubHeader>

          <Paragraph>Route critical issues to Slack immediately:</Paragraph>

          <CodeBlock title="advanced-workflow.json" language="JSON">
{`{
  "name": "IT Ticket Processing with Escalation",
  "trigger": {
    "type": "form_submission",
    "formSlug": "it-support-request"
  },
  "nodes": [
    {
      "id": "save_to_db",
      "type": "mongodb-insert",
      "config": {
        "collection": "support_tickets",
        "document": {
          "reporter": "{{form.reporter_name}}",
          "email": "{{form.reporter_email}}",
          "issue_type": "{{form.issue_type}}",
          "urgency": "{{form.urgency}}",
          "description": "{{form.description}}",
          "status": "open",
          "created_at": "{{now}}"
        }
      }
    },
    {
      "id": "check_urgency",
      "type": "condition",
      "config": {
        "expression": "form.urgency === 'critical'"
      }
    },
    {
      "id": "slack_alert",
      "type": "slack-send",
      "runAfter": "check_urgency",
      "runCondition": "check_urgency.result === true",
      "config": {
        "channel": "#it-alerts",
        "message": "🚨 *CRITICAL TICKET*\\n\\n*From:* {{form.reporter_name}}\\n*Issue:* {{form.issue_type}}\\n*Description:* {{form.description}}\\n\\n<{{ticket_url}}|View Ticket>"
      }
    }
  ]
}`}
          </CodeBlock>

          <SubHeader>Workflow Visualization</SubHeader>

          <DiagramBlock>
{`┌─────────────────────┐
│  Form Submitted     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Save to MongoDB    │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌─────────┐ ┌─────────────┐
│ Email   │ │ Urgency =   │
│ User    │ │ Critical?   │
└─────────┘ └──────┬──────┘
              Yes  │  No
                   ▼
            ┌─────────────┐
            │ Slack Alert │
            │ #it-alerts  │
            └─────────────┘`}
          </DiagramBlock>

          {/* Step 5: Deploy */}
          <StepHeader step={5} title="Deploy and Test" icon={<PlayArrow />} />

          <SubHeader>Deployment Options</SubHeader>

          <Typography
            variant="h6"
            sx={{ color: '#fff', fontWeight: 600, mt: 3, mb: 2 }}
          >
            Option A: Standalone Page
          </Typography>

          <CodeBlock title="URLs" language="bash">
{`# Your form is live at:
https://forms.netpad.io/your-org/it-support-request

# Conversational view:
https://forms.netpad.io/your-org/it-support-request?mode=conversation

# Traditional view (default):
https://forms.netpad.io/your-org/it-support-request?mode=form`}
          </CodeBlock>

          <Typography
            variant="h6"
            sx={{ color: '#fff', fontWeight: 600, mt: 4, mb: 2 }}
          >
            Option B: Embed on Your Site
          </Typography>

          <CodeBlock title="embed.html" language="HTML">
{`<!-- Traditional form embed -->
<iframe
  src="https://forms.netpad.io/your-org/it-support-request?embed=true&mode=form"
  width="100%"
  height="600"
  frameborder="0">
</iframe>

<!-- Conversational embed -->
<iframe
  src="https://forms.netpad.io/your-org/it-support-request?embed=true&mode=conversation"
  width="400"
  height="600"
  frameborder="0">
</iframe>`}
          </CodeBlock>

          <Typography
            variant="h6"
            sx={{ color: '#fff', fontWeight: 600, mt: 4, mb: 2 }}
          >
            Option C: JavaScript SDK
          </Typography>

          <CodeBlock title="sdk-example.html" language="HTML">
{`<script src="https://cdn.netpad.io/embed.js"></script>
<script>
  NetPad.init({
    formSlug: 'it-support-request',
    orgSlug: 'your-org',
    mode: 'conversation', // or 'form'
    container: '#netpad-form',
    theme: {
      primaryColor: '#0066cc',
      fontFamily: 'Inter, sans-serif'
    },
    onSubmit: (data) => {
      console.log('Form submitted:', data);
      // Custom handling
    }
  });
</script>

<div id="netpad-form"></div>`}
          </CodeBlock>

          <SubHeader>Testing the Conversation</SubHeader>

          <Paragraph>Before going live, test your conversational form:</Paragraph>

          <CodeBlock title="CLI Testing" language="bash">
{`# Using NetPad CLI
npx netpad test-conversation \\
  --form it-support-request \\
  --org your-org \\
  --verbose

# Output shows:
# - Each question asked
# - User simulation responses
# - Extracted data
# - Confidence scores
# - Any validation errors`}
          </CodeBlock>

          {/* Step 6: Monitor */}
          <StepHeader step={6} title="Monitor and Iterate" icon={<Settings />} />

          <SubHeader>Key Metrics to Track</SubHeader>

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              my: 3,
              bgcolor: alpha('#fff', 0.02),
              border: '1px solid',
              borderColor: alpha('#fff', 0.1),
              borderRadius: 2,
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: alpha('#fff', 0.6), fontWeight: 600, borderColor: alpha('#fff', 0.1) }}>
                    Metric
                  </TableCell>
                  <TableCell sx={{ color: alpha('#fff', 0.6), fontWeight: 600, borderColor: alpha('#fff', 0.1) }}>
                    What It Tells You
                  </TableCell>
                  <TableCell sx={{ color: alpha('#fff', 0.6), fontWeight: 600, borderColor: alpha('#fff', 0.1) }}>
                    Where to Find It
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  { metric: 'Completion rate', tells: '% of users who finish', where: 'Form Analytics' },
                  { metric: 'Average turns', tells: 'How long conversations take', where: 'Conversation Analytics' },
                  { metric: 'Drop-off points', tells: 'Where users abandon', where: 'Funnel Analysis' },
                  { metric: 'Confidence scores', tells: 'Data extraction quality', where: 'Conversation Logs' },
                  { metric: 'Field-level completion', tells: 'Which fields get skipped', where: 'Form Analytics' },
                ].map((row, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ color: '#00ED64', fontWeight: 500, borderColor: alpha('#fff', 0.05) }}>
                      {row.metric}
                    </TableCell>
                    <TableCell sx={{ color: alpha('#fff', 0.8), borderColor: alpha('#fff', 0.05) }}>
                      {row.tells}
                    </TableCell>
                    <TableCell sx={{ color: alpha('#fff', 0.6), borderColor: alpha('#fff', 0.05) }}>
                      {row.where}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <SubHeader>A/B Testing Both Interfaces</SubHeader>

          <CodeBlock title="ab-test-config.json" language="JSON">
{`{
  "formSlug": "it-support-request",
  "abTest": {
    "enabled": true,
    "variants": [
      {
        "id": "traditional",
        "mode": "form",
        "weight": 50
      },
      {
        "id": "conversational",
        "mode": "conversation",
        "weight": 50
      }
    ],
    "metrics": ["completion_rate", "time_to_complete", "data_quality_score"]
  }
}`}
          </CodeBlock>

          <Paragraph>
            NetPad automatically tracks which variant each user sees and reports conversion metrics by variant.
          </Paragraph>

          {/* Key Takeaways */}
          <SectionHeader>Key Takeaways</SectionHeader>

          <BulletList
            items={[
              'Schema is the source of truth — Define fields once, both interfaces render from it',
              'Conversation config adds personality — Persona, topics, and limits shape the chat experience',
              'Conditional logic works in both modes — Same branching rules, different presentation',
              "Workflows don't care which interface was used — Data arrives identically",
              'Test both interfaces — A/B testing is built in; measure what converts',
              'Deploy flexibly — Standalone, embedded, or via SDK',
            ]}
          />

          <Divider sx={{ my: 6, borderColor: alpha('#fff', 0.1) }} />

          {/* CTA */}
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: 'center',
              background: `linear-gradient(135deg, ${alpha('#00ED64', 0.1)} 0%, ${alpha('#00684A', 0.1)} 100%)`,
              border: '1px solid',
              borderColor: alpha('#00ED64', 0.3),
              borderRadius: 3,
            }}
          >
            <AutoAwesome sx={{ fontSize: 40, color: '#00ED64', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
              Ready to build?
            </Typography>
            <Typography sx={{ color: alpha('#fff', 0.7), mb: 4, maxWidth: 500, mx: 'auto' }}>
              Try our live demo to see conversational forms in action, or join the waitlist for early access to start building.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                component={Link}
                href="/demo/conversational"
                variant="contained"
                size="large"
                startIcon={<PlayArrow />}
                sx={{
                  px: 4,
                  bgcolor: '#00ED64',
                  color: '#001E2B',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#00CC55' },
                }}
              >
                Try the Demo
              </Button>
              <Button
                component={Link}
                href="/auth/login"
                variant="outlined"
                size="large"
                sx={{
                  px: 4,
                  borderColor: alpha('#00ED64', 0.5),
                  color: '#00ED64',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#00ED64',
                    bgcolor: alpha('#00ED64', 0.1),
                  },
                }}
              >
                Join the Waitlist
              </Button>
            </Box>
          </Paper>

          {/* Back to Part 1 */}
          <Box sx={{ mt: 6, textAlign: 'center' }}>
            <Typography sx={{ color: alpha('#fff', 0.5), mb: 1 }}>
              Missed Part 1?
            </Typography>
            <Button
              component={Link}
              href="/blog/conversational-forms-101"
              sx={{ color: '#00ED64', fontWeight: 600 }}
            >
              ← Read Conversational Forms 101: The Business Case
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
