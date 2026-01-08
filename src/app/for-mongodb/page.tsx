'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';

import StorageIcon from '@mui/icons-material/Storage';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BoltIcon from '@mui/icons-material/Bolt';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ApiIcon from '@mui/icons-material/Api';
import ShieldIcon from '@mui/icons-material/Shield';
import HistoryIcon from '@mui/icons-material/History';
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import BuildIcon from '@mui/icons-material/Build';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';

/**
 * NetPad – MongoDB landing page
 * Purpose: A dedicated marketing page for MongoDB users that explains the “missing operational layer”
 * (intake → decision → action) with a subtle spotlight-card interaction.
 */

function SpotlightCard({
  eyebrow,
  title,
  icon,
  children,
  tone = 'green',
}: {
  eyebrow?: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: 'green' | 'blue' | 'purple' | 'orange';
}) {
  const toneMap: Record<string, { rgb: string; border: string }> = {
    green: { rgb: '120, 255, 190', border: 'rgba(120, 255, 190, 0.22)' },
    blue: { rgb: '110, 140, 255', border: 'rgba(110, 140, 255, 0.22)' },
    purple: { rgb: '168, 85, 247', border: 'rgba(168, 85, 247, 0.22)' },
    orange: { rgb: '255, 170, 90', border: 'rgba(255, 170, 90, 0.22)' },
  };

  const t = toneMap[tone];

  const onMouseMove = React.useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--y', `${e.clientY - rect.top}px`);
  }, []);

  return (
    <Card
      onMouseMove={onMouseMove}
      elevation={0}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,

        // Readability first: more solid surface
        background: 'rgba(16, 18, 24, 0.86)',
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(4px)',

        transition: 'transform 160ms ease, border-color 160ms ease',

        // Spotlight (hover only)
        '&:before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(650px circle at var(--x, 50%) var(--y, 50%),
            rgba(${t.rgb}, 0.12),
            rgba(${t.rgb}, 0.05) 42%,
            transparent 72%)`,
          opacity: 0,
          transition: 'opacity 180ms ease',
          pointerEvents: 'none',
        },

        // Subtle top sheen to separate content from background
        '&:after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.00))',
          pointerEvents: 'none',
          opacity: 0.35,
        },

        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: t.border,
        },
        '&:hover:before': {
          opacity: 1,
        },
        '@media (hover: none)': {
          '&:before': { display: 'none' },
          '&:hover': { transform: 'none' },
        },
      }}
    >
      <CardContent sx={{ position: 'relative', p: { xs: 2.5, md: 3 } }}>
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            {icon ? (
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(0,0,0,0.18)',
                  color: 'rgba(255,255,255,0.90)',
                }}
              >
                {icon}
              </Box>
            ) : null}

            <Box>
              {eyebrow ? (
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(255,255,255,0.62)', letterSpacing: 0.4 }}
                >
                  {eyebrow}
                </Typography>
              ) : null}
              <Typography variant="h6" sx={{ lineHeight: 1.15, color: 'rgba(255,255,255,0.92)', fontWeight: 650 }}>
                {title}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ height: 1, background: 'rgba(255,255,255,0.10)' }} />

          <Box sx={{ color: 'rgba(255,255,255,0.82)' }}>{children}</Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function SectionHeader({
  kicker,
  title,
  body,
  align = 'left',
}: {
  kicker?: string;
  title: string;
  body?: React.ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <Stack
      spacing={1.25}
      sx={{ textAlign: align, maxWidth: align === 'center' ? 880 : 980 }}
    >
      {kicker ? (
        <Typography
          variant="overline"
          sx={{ color: 'rgba(255,255,255,0.70)', letterSpacing: 1 }}
        >
          {kicker}
        </Typography>
      ) : null}
      <Typography variant="h3" sx={{ lineHeight: 1.05 }}>
        {title}
      </Typography>
      {body ? (
        <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.78)', fontWeight: 400 }}>
          {body}
        </Typography>
      ) : null}
    </Stack>
  );
}

export default function Page() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        color: 'white',
        background:
          'radial-gradient(1200px circle at 20% 0%, rgba(120,255,190,0.14), transparent 55%), radial-gradient(900px circle at 85% 10%, rgba(110,140,255,0.12), transparent 50%), linear-gradient(180deg, rgba(9,10,14,1) 0%, rgba(9,10,14,1) 55%, rgba(7,8,12,1) 100%)',
      }}
    >
      {/* HERO */}
      <Box sx={{ pt: { xs: 8, md: 12 }, pb: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Stack spacing={3.5}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip
                label="For MongoDB users"
                size="small"
                sx={{
                  borderRadius: 999,
                  background: 'rgba(120,255,190,0.12)',
                  color: 'rgba(255,255,255,0.90)',
                  border: '1px solid rgba(120,255,190,0.20)',
                }}
              />
              <Chip
                icon={<StorageIcon sx={{ fontSize: 18 }} />}
                label="Document lifecycle • intake → decision → action"
                size="small"
                sx={{
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.85)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
              />
            </Stack>

            <Typography
              variant="h2"
              sx={{
                lineHeight: 1.02,
                maxWidth: 980,
                letterSpacing: -0.6,
              }}
            >
              The missing operational layer for MongoDB data.
            </Typography>

            <Typography variant="h5" sx={{ color: 'rgba(255,255,255,0.78)', maxWidth: 980 }}>
              MongoDB is exceptional at storing, querying, and securing data. NetPad completes the
              picture by managing how that data is <b>created</b>, <b>reviewed</b>, <b>approved</b>,{' '}
              <b>automated</b>, and <b>audited</b> — without building everything from scratch.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="contained"
                size="large"
                href="#how"
                sx={{
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontSize: 16,
                  px: 2.5,
                  background: 'rgba(120,255,190,0.90)',
                  color: 'rgba(0,0,0,0.92)',
                  '&:hover': { background: 'rgba(120,255,190,0.98)' },
                }}
              >
                See how NetPad works with MongoDB
              </Button>

              <Button
                component={Link}
                href="/request-access"
                variant="outlined"
                size="large"
                sx={{
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontSize: 16,
                  px: 2.5,
                  borderColor: 'rgba(255,255,255,0.18)',
                  color: 'rgba(255,255,255,0.88)',
                  '&:hover': { borderColor: 'rgba(255,255,255,0.30)' },
                }}
              >
                Request access
              </Button>
            </Stack>

            <Grid container spacing={2} sx={{ pt: { xs: 1, md: 2 } }}>
              <Grid item xs={12} md={4}>
                <SpotlightCard
                  title="MongoDB stays the engine"
                  eyebrow="No replacement. No abstraction war."
                  icon={<StorageIcon />}
                  tone="green"
                >
                  <Typography variant="body1">
                    NetPad sits on top of your collections. Documents remain the source of truth —
                    queries, search, analytics, and security still live where they should.
                  </Typography>
                </SpotlightCard>
              </Grid>
              <Grid item xs={12} md={4}>
                <SpotlightCard
                  title="NetPad becomes the control plane"
                  eyebrow="The missing “around the data” layer"
                  icon={<WorkspacesIcon />}
                  tone="blue"
                >
                  <Typography variant="body1">
                    Intake, approvals, orchestration, automation, and visibility — mapped directly to
                    document state, not tickets and spreadsheets.
                  </Typography>
                </SpotlightCard>
              </Grid>
              <Grid item xs={12} md={4}>
                <SpotlightCard
                  title="Humans + systems + AI"
                  eyebrow="One lifecycle, multiple interfaces"
                  icon={<AutoAwesomeIcon />}
                  tone="purple"
                >
                  <Typography variant="body1">
                    Use forms, APIs, and conversational experiences to create and update the same
                    MongoDB documents — with deterministic workflows and accountable decisions.
                  </Typography>
                </SpotlightCard>
              </Grid>
            </Grid>
          </Stack>
        </Container>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.10)' }} />

      {/* PAIN / GAP */}
      <Box sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="flex-start">
            <Grid item xs={12} md={6}>
              <SectionHeader
                kicker="the mongoDB reality"
                title="MongoDB gives you power. Teams still build the rest."
                body={
                  <>
                    MongoDB teams don’t struggle with storage. They struggle with everything{' '}
                    <i>around</i> it — the intake UIs, the approvals, the glue code, and the “audit
                    narrative” you end up reconstructing at the worst possible time.
                  </>
                }
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <SpotlightCard
                title="What MongoDB excels at"
                eyebrow="The foundation"
                icon={<StorageIcon />}
                tone="green"
              >
                <Stack spacing={0.75}>
                  {[
                    'Flexible document models',
                    'Scale + performance',
                    'Powerful queries and indexing',
                    'Search and analytics capabilities',
                    'Security primitives and controls',
                  ].map((x) => (
                    <Typography key={x} variant="body1">
                      • {x}
                    </Typography>
                  ))}
                </Stack>
              </SpotlightCard>

              <Box sx={{ height: 14 }} />

              <SpotlightCard
                title="What teams still rebuild"
                eyebrow="The operational layer"
                icon={<BuildIcon />}
                tone="orange"
              >
                <Stack spacing={0.75}>
                  {[
                    'Human-friendly intake and admin UIs',
                    'Approval flows and ownership',
                    'State transitions and escalation',
                    'Automation that is consistent and observable',
                    'Audit trails that stand up to scrutiny',
                  ].map((x) => (
                    <Typography key={x} variant="body1">
                      • {x}
                    </Typography>
                  ))}
                </Stack>
              </SpotlightCard>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* LIFECYCLE */}
      <Box id="how" sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="lg">
          <Stack spacing={4.5}>
            <SectionHeader
              kicker="the missing layer"
              title="NetPad completes the MongoDB data lifecycle"
              body={
                <>
                  NetPad turns collections into <b>living systems</b>. The database stays the source
                  of truth. NetPad adds the operational layer: interaction, orchestration, governance,
                  and accountable outcomes.
                </>
              }
            />

            <Grid container spacing={2.25}>
              <Grid item xs={12} md={4}>
                <SpotlightCard
                  eyebrow="1) create"
                  title="Capture documents through any interface"
                  icon={<ApiIcon />}
                  tone="blue"
                >
                  <Stack spacing={0.75}>
                    <Typography variant="body1">• Forms write directly to collections</Typography>
                    <Typography variant="body1">• APIs support programmatic ingestion</Typography>
                    <Typography variant="body1">
                      • Conversational input collects structured data
                    </Typography>
                  </Stack>
                </SpotlightCard>
              </Grid>

              <Grid item xs={12} md={4}>
                <SpotlightCard
                  eyebrow="2) review"
                  title="Ownership, assignment, and approvals"
                  icon={<FactCheckIcon />}
                  tone="green"
                >
                  <Stack spacing={0.75}>
                    <Typography variant="body1">• Assign reviewers by rules or queues</Typography>
                    <Typography variant="body1">• Approve/deny with reason + history</Typography>
                    <Typography variant="body1">• Keep humans accountable</Typography>
                  </Stack>
                </SpotlightCard>
              </Grid>

              <Grid item xs={12} md={4}>
                <SpotlightCard
                  eyebrow="3) decide"
                  title="Workflow logic as document state transitions"
                  icon={<AccountTreeIcon />}
                  tone="purple"
                >
                  <Stack spacing={0.75}>
                    <Typography variant="body1">• Branching, conditions, and escalation</Typography>
                    <Typography variant="body1">• Deterministic paths (not mystery automation)</Typography>
                    <Typography variant="body1">• Visible “where is it stuck?” answers</Typography>
                  </Stack>
                </SpotlightCard>
              </Grid>

              <Grid item xs={12} md={4}>
                <SpotlightCard
                  eyebrow="4) act"
                  title="Automate downstream actions"
                  icon={<BoltIcon />}
                  tone="orange"
                >
                  <Stack spacing={0.75}>
                    <Typography variant="body1">• Integrations triggered from state changes</Typography>
                    <Typography variant="body1">• Notifications that match the workflow</Typography>
                    <Typography variant="body1">• Fewer scripts. Less glue.</Typography>
                  </Stack>
                </SpotlightCard>
              </Grid>

              <Grid item xs={12} md={4}>
                <SpotlightCard
                  eyebrow="5) audit"
                  title="Immutable event history by default"
                  icon={<HistoryIcon />}
                  tone="blue"
                >
                  <Stack spacing={0.75}>
                    <Typography variant="body1">• Who did what, when, and to which document</Typography>
                    <Typography variant="body1">• Change summaries without leaking secrets</Typography>
                    <Typography variant="body1">• Evidence when you need it most</Typography>
                  </Stack>
                </SpotlightCard>
              </Grid>

              <Grid item xs={12} md={4}>
                <SpotlightCard
                  eyebrow="6) evolve"
                  title="Change schemas and workflows independently"
                  icon={<ManageSearchIcon />}
                  tone="green"
                >
                  <Stack spacing={0.75}>
                    <Typography variant="body1">• Iterate without rewrites</Typography>
                    <Typography variant="body1">• New fields don’t break old data</Typography>
                    <Typography variant="body1">• Roll forward with confidence</Typography>
                  </Stack>
                </SpotlightCard>
              </Grid>
            </Grid>

            <Box
              sx={{
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 3,
                p: { xs: 2.5, md: 3 },
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              <Typography variant="h5" sx={{ mb: 1.25 }}>
                The idea is simple:
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.80)', fontSize: 18 }}>
                MongoDB is your <b>system of record</b>. NetPad is the <b>system of flow</b> — the
                layer that makes documents move through people, systems, and AI without chaos.
              </Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* DOCUMENT-NATIVE */}
      <Box sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="lg">
          <Stack spacing={4.5}>
            <SectionHeader
              kicker="built the way mongo teams think"
              title="Document-native by design"
              body={
                <>
                  NetPad isn’t a ticketing system pretending to support documents. It’s built around
                  the same mental model MongoDB users already have: documents, collections, state, and
                  access patterns.
                </>
              }
            />

            <Grid container spacing={2.25}>
              <Grid item xs={12} md={4}>
                <SpotlightCard
                  eyebrow="mapping"
                  title="Forms map to collections"
                  icon={<StorageIcon />}
                  tone="green"
                >
                  <Typography variant="body1">
                    Forms aren’t the product — they’re one interface. A form field maps to a document
                    field. Your data stays where it belongs.
                  </Typography>
                </SpotlightCard>
              </Grid>

              <Grid item xs={12} md={4}>
                <SpotlightCard
                  eyebrow="state"
                  title="Workflows model state transitions"
                  icon={<AccountTreeIcon />}
                  tone="purple"
                >
                  <Typography variant="body1">
                    Workflows define how documents move: submitted → reviewed → approved → executed —
                    with branching, escalation, and ownership.
                  </Typography>
                </SpotlightCard>
              </Grid>

              <Grid item xs={12} md={4}>
                <SpotlightCard
                  eyebrow="trust"
                  title="Audit events reference document IDs"
                  icon={<HistoryIcon />}
                  tone="blue"
                >
                  <Typography variant="body1">
                    Every meaningful action becomes an immutable event tied to the document and the
                    actor — so the story is always reconstructable.
                  </Typography>
                </SpotlightCard>
              </Grid>
            </Grid>
          </Stack>
        </Container>
      </Box>

      {/* AI SECTION */}
      <Box sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="lg">
          <Stack spacing={4.5}>
            <SectionHeader
              kicker="ai, grounded"
              title="AI that assists MongoDB workflows — not magic prompts"
              body={
                <>
                  NetPad uses AI to support operational work: triage, enrichment, routing suggestions,
                  and summarization. The workflow stays deterministic. Humans stay accountable.
                </>
              }
            />

            <Grid container spacing={2.25}>
              <Grid item xs={12} md={4}>
                <SpotlightCard
                  eyebrow="triage"
                  title="Route faster with smarter intake"
                  icon={<AutoAwesomeIcon />}
                  tone="purple"
                >
                  <Typography variant="body1">
                    Use AI to extract structured fields, detect intent, and suggest ownership — so
                    the right documents reach the right people without back-and-forth.
                  </Typography>
                </SpotlightCard>
              </Grid>
              <Grid item xs={12} md={4}>
                <SpotlightCard
                  eyebrow="enrichment"
                  title="Enrich documents at creation time"
                  icon={<BoltIcon />}
                  tone="orange"
                >
                  <Typography variant="body1">
                    Add summaries, tags, risk indicators, or normalization steps as part of the
                    workflow — without turning your product into a prompt playground.
                  </Typography>
                </SpotlightCard>
              </Grid>
              <Grid item xs={12} md={4}>
                <SpotlightCard
                  eyebrow="context"
                  title="Give reviewers the story, not the noise"
                  icon={<ManageSearchIcon />}
                  tone="blue"
                >
                  <Typography variant="body1">
                    Summarize history, highlight changes, and surface relevant context so reviewers
                    can decide faster — with full traceability back to the data.
                  </Typography>
                </SpotlightCard>
              </Grid>
            </Grid>
          </Stack>
        </Container>
      </Box>

      {/* GOVERNANCE */}
      <Box sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="lg">
          <Stack spacing={4.5}>
            <SectionHeader
              kicker="governance and trust"
              title="Operational control without friction"
              body={
                <>
                  MongoDB gives you strong primitives. NetPad layers on operational trust: roles,
                  environments, auditability, and visibility — built for high-stakes work.
                </>
              }
            />

            <Grid container spacing={2.25}>
              <Grid item xs={12} md={3}>
                <SpotlightCard
                  eyebrow="access"
                  title="Role-based control"
                  icon={<ShieldIcon />}
                  tone="green"
                >
                  <Typography variant="body2">
                    Project and environment scoping, permissions, and separation between configuration
                    and execution.
                  </Typography>
                </SpotlightCard>
              </Grid>

              <Grid item xs={12} md={3}>
                <SpotlightCard
                  eyebrow="audit"
                  title="Immutable history"
                  icon={<VerifiedUserIcon />}
                  tone="blue"
                >
                  <Typography variant="body2">
                    Append-only events for meaningful actions — who, what, when, and where — without
                    leaking secrets.
                  </Typography>
                </SpotlightCard>
              </Grid>

              <Grid item xs={12} md={3}>
                <SpotlightCard
                  eyebrow="visibility"
                  title="Observable workflows"
                  icon={<WorkspacesIcon />}
                  tone="purple"
                >
                  <Typography variant="body2">
                    Clear “where is it stuck?” answers, run histories, failure context, and outcomes
                    you can trust.
                  </Typography>
                </SpotlightCard>
              </Grid>

              <Grid item xs={12} md={3}>
                <SpotlightCard
                  eyebrow="rigor"
                  title="Built for ops"
                  icon={<FactCheckIcon />}
                  tone="orange"
                >
                  <Typography variant="body2">
                    Designed for compliance intake, access requests, risk reviews, and internal tools
                    that need accountability.
                  </Typography>
                </SpotlightCard>
              </Grid>
            </Grid>
          </Stack>
        </Container>
      </Box>

      {/* WHO ITS FOR */}
      <Box sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <SectionHeader
                kicker="who this is for"
                title="If you’re already using MongoDB, NetPad fits especially well"
                body={
                  <>
                    NetPad is for teams who want their MongoDB data to behave like a system — with
                    consistent intake, decisions, automation, and auditability — not a pile of docs
                    surrounded by ad-hoc tooling.
                  </>
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 3,
                  p: { xs: 2.5, md: 3 },
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <Typography variant="h6" sx={{ mb: 1.5 }}>
                  Great fits
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {[
                    'Platform engineering',
                    'Internal tools',
                    'Security & compliance',
                    'Risk reviews',
                    'IT intake',
                    'RevOps workflows',
                    'Solutions architects',
                    'Developer enablement',
                  ].map((x) => (
                    <Chip
                      key={x}
                      label={x}
                      sx={{
                        mb: 1,
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        color: 'rgba(255,255,255,0.86)',
                      }}
                    />
                  ))}
                </Stack>

                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.10)' }} />

                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                  If you’re currently wiring together forms + tickets + scripts + spreadsheets to
                  manage MongoDB-backed processes… you’re exactly who this is for.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* FINAL CTA */}
      <Box sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.12)',
              background:
                'radial-gradient(900px circle at 15% 0%, rgba(120,255,190,0.18), transparent 55%), radial-gradient(900px circle at 90% 30%, rgba(110,140,255,0.14), transparent 55%), rgba(255,255,255,0.03)',
              p: { xs: 3, md: 5 },
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={8}>
                <Typography variant="h3" sx={{ lineHeight: 1.05, mb: 1 }}>
                  Stop rebuilding the same MongoDB tooling.
                </Typography>
                <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.78)', fontWeight: 400 }}>
                  Let MongoDB do what it does best. Let NetPad handle the operational layer — intake,
                  decisions, automation, and auditability — so your data lifecycle behaves like a
                  system.
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Stack spacing={1.25}>
                  <Button
                    component={Link}
                    href="/request-access"
                    variant="contained"
                    size="large"
                    sx={{
                      borderRadius: 2.5,
                      textTransform: 'none',
                      fontSize: 16,
                      px: 2.5,
                      background: 'rgba(120,255,190,0.92)',
                      color: 'rgba(0,0,0,0.92)',
                      '&:hover': { background: 'rgba(120,255,190,1)' },
                    }}
                  >
                    Request access
                  </Button>
                  <Button
                    component={Link}
                    href="/contact"
                    variant="outlined"
                    size="large"
                    sx={{
                      borderRadius: 2.5,
                      textTransform: 'none',
                      fontSize: 16,
                      px: 2.5,
                      borderColor: 'rgba(255,255,255,0.18)',
                      color: 'rgba(255,255,255,0.88)',
                      '&:hover': { borderColor: 'rgba(255,255,255,0.30)' },
                    }}
                  >
                    Talk to us
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>

          <Typography
            variant="caption"
            sx={{ display: 'block', mt: 3, color: 'rgba(255,255,255,0.55)' }}
          >
            Note: This page is intentionally MongoDB-forward. The core NetPad story remains broader:
            design how data moves through your organization — regardless of how it’s stored.
          </Typography>
        </Container>
      </Box>

      {/* Footer spacer */}
      <Box sx={{ pb: 6 }} />
    </Box>
  );
}
