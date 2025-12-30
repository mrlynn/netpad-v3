'use client';

import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Paper,
  alpha,
  Chip,
  Switch,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Check,
  Close,
  AutoAwesome,
  Storage,
  Description,
  AccountTree,
  Speed,
  Groups,
  Security,
  Webhook,
  Code,
  CloudQueue,
  Business,
  Star,
  Bolt,
  Lock,
  Analytics,
  Translate,
  Tune,
  SmartToy,
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import {
  SUBSCRIPTION_TIERS,
  TIER_PRICING,
  type SubscriptionTier,
  type AIFeature,
  type PlatformFeature,
} from '@/types/platform';

// Helper to format limits
const formatLimit = (value: number): string => {
  if (value === -1) return 'Unlimited';
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
};

// Helper to format storage
const formatStorage = (mb: number): string => {
  if (mb === -1) return 'Unlimited';
  if (mb >= 1000) return `${(mb / 1000).toFixed(0)} GB`;
  return `${mb} MB`;
};

// AI feature display names
const aiFeatureNames: Record<AIFeature, string> = {
  ai_inline_suggestions: 'Inline Suggestions',
  ai_field_type_detection: 'Field Type Detection',
  ai_completion_hints: 'Completion Hints',
  ai_form_generator: 'Form Generator',
  ai_command_palette: 'Command Palette',
  ai_formula_assistant: 'Formula Assistant',
  ai_conditional_logic: 'Logic Builder',
  ai_validation_patterns: 'Validation Patterns',
  agent_form_optimization: 'Form Optimization Agent',
  agent_response_processing: 'Response Processing Agent',
  agent_compliance_audit: 'Compliance Audit Agent',
  agent_response_insights: 'Response Insights Agent',
  agent_auto_translation: 'Auto Translation Agent',
};

// Platform feature display names
const platformFeatureNames: Record<PlatformFeature, string> = {
  custom_branding: 'Custom Branding',
  white_label: 'White Label',
  api_access: 'Full API Access',
  webhooks: 'Webhooks',
  sso_saml: 'SSO / SAML',
  field_encryption: 'Field-Level Encryption',
  advanced_analytics: 'Advanced Analytics',
  csv_export: 'CSV Export',
  priority_support: 'Priority Support',
  custom_domain: 'Custom Domain',
};

// Features that are coming soon
const comingSoonFeatures: PlatformFeature[] = ['sso_saml', 'custom_domain'];

// Tier metadata
const tierMeta: Record<SubscriptionTier, {
  name: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  badge?: string;
  cta: string;
  ctaVariant: 'contained' | 'outlined';
}> = {
  free: {
    name: 'Free',
    description: 'Perfect for getting started with MongoDB-connected forms',
    color: '#00ED64',
    icon: <CloudQueue />,
    cta: 'Get Started',
    ctaVariant: 'outlined',
  },
  pro: {
    name: 'Pro',
    description: 'For professionals who need more power and AI assistance',
    color: '#00ED64',
    icon: <Bolt />,
    badge: 'Popular',
    cta: 'Start Pro Trial',
    ctaVariant: 'contained',
  },
  team: {
    name: 'Team',
    description: 'For teams that need collaboration and advanced features',
    color: '#9C27B0',
    icon: <Groups />,
    cta: 'Start Team Trial',
    ctaVariant: 'outlined',
  },
  enterprise: {
    name: 'Enterprise',
    description: 'For organizations with custom requirements and dedicated support',
    color: '#2196F3',
    icon: <Business />,
    cta: 'Contact Sales',
    ctaVariant: 'outlined',
  },
};

// Key features to highlight for each tier
const tierHighlights: Record<SubscriptionTier, string[]> = {
  free: [
    'Auto-provisioned MongoDB Atlas M0 cluster',
    '3 forms with 1,000 submissions/month',
    'Basic AI suggestions',
    '30-day data retention',
    'Community support',
  ],
  pro: [
    'Everything in Free, plus:',
    'Unlimited forms',
    '100 AI generations/month',
    '20 AI agent sessions',
    'Custom branding & webhooks',
    '1 year data retention',
  ],
  team: [
    'Everything in Pro, plus:',
    '10,000 submissions/month',
    '500 AI generations/month',
    '100 AI agent sessions',
    'Field-level encryption',
    'Unlimited data retention',
  ],
  enterprise: [
    'Everything in Team, plus:',
    'Unlimited everything',
    'SSO / SAML authentication (Coming Soon)',
    'Custom domain (Coming Soon)',
    'Compliance audit agent',
    'Dedicated support & SLA',
  ],
};

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const tiers: SubscriptionTier[] = ['free', 'pro', 'team', 'enterprise'];

  const getPrice = (tier: SubscriptionTier): string => {
    const pricing = TIER_PRICING[tier];
    if (tier === 'enterprise') return 'Custom';
    if (tier === 'free') return '$0';
    const price = annual ? pricing.yearly / 12 : pricing.monthly;
    return `$${(price / 100).toFixed(0)}`;
  };

  const getPriceSubtext = (tier: SubscriptionTier): string => {
    if (tier === 'enterprise') return 'Contact us for pricing';
    if (tier === 'free') return 'Forever free';
    if (tier === 'team') return annual ? '/seat/mo, billed annually' : '/seat/month';
    return annual ? '/mo, billed annually' : '/month';
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#001E2B' }}>
      {/* Hero Section */}
      <Box
        sx={{
          pt: { xs: 8, md: 12 },
          pb: { xs: 6, md: 8 },
          background: 'radial-gradient(ellipse at top, rgba(0, 237, 100, 0.15) 0%, transparent 60%)',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2rem', md: '3rem' },
                fontWeight: 700,
                color: '#fff',
                mb: 2,
              }}
            >
              Simple, Transparent Pricing
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: alpha('#fff', 0.7),
                maxWidth: 600,
                mx: 'auto',
                mb: 4,
                fontWeight: 400,
                fontSize: { xs: '1rem', md: '1.25rem' },
              }}
            >
              Start free with an auto-provisioned MongoDB Atlas cluster.
              Scale as you grow with powerful AI and team features.
            </Typography>

            {/* Billing Toggle */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}
            >
              <Typography
                sx={{
                  color: !annual ? '#fff' : alpha('#fff', 0.5),
                  fontWeight: !annual ? 600 : 400,
                }}
              >
                Monthly
              </Typography>
              <Switch
                checked={annual}
                onChange={(e) => setAnnual(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#00ED64',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#00ED64',
                  },
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  sx={{
                    color: annual ? '#fff' : alpha('#fff', 0.5),
                    fontWeight: annual ? 600 : 400,
                  }}
                >
                  Annual
                </Typography>
                <Chip
                  label="Save 17%"
                  size="small"
                  sx={{
                    bgcolor: alpha('#00ED64', 0.2),
                    color: '#00ED64',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Pricing Cards */}
          <Grid container spacing={3} justifyContent="center">
            {tiers.map((tier) => {
              const meta = tierMeta[tier];
              const features = SUBSCRIPTION_TIERS[tier];
              const isPopular = tier === 'pro';

              return (
                <Grid item xs={12} sm={6} lg={3} key={tier}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      bgcolor: isPopular ? alpha(meta.color, 0.08) : alpha('#fff', 0.03),
                      border: '2px solid',
                      borderColor: isPopular ? meta.color : alpha('#fff', 0.1),
                      borderRadius: 3,
                      position: 'relative',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: alpha(meta.color, 0.6),
                        transform: 'translateY(-4px)',
                      },
                    }}
                  >
                    {/* Popular Badge */}
                    {meta.badge && (
                      <Chip
                        label={meta.badge}
                        icon={<Star sx={{ fontSize: 14 }} />}
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: -12,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          bgcolor: meta.color,
                          color: '#001E2B',
                          fontWeight: 700,
                          '& .MuiChip-icon': { color: '#001E2B' },
                        }}
                      />
                    )}

                    {/* Tier Header */}
                    <Box sx={{ mb: 3 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: alpha(meta.color, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: meta.color,
                          mb: 2,
                        }}
                      >
                        {meta.icon}
                      </Box>
                      <Typography
                        variant="h5"
                        sx={{ fontWeight: 700, color: '#fff', mb: 0.5 }}
                      >
                        {meta.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: alpha('#fff', 0.6), minHeight: 40 }}
                      >
                        {meta.description}
                      </Typography>
                    </Box>

                    {/* Price */}
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                        <Typography
                          sx={{
                            fontSize: '2.5rem',
                            fontWeight: 700,
                            color: '#fff',
                          }}
                        >
                          {getPrice(tier)}
                        </Typography>
                        {tier !== 'enterprise' && tier !== 'free' && (
                          <Typography sx={{ color: alpha('#fff', 0.5) }}>
                            {getPriceSubtext(tier)}
                          </Typography>
                        )}
                      </Box>
                      {tier === 'free' && (
                        <Typography
                          variant="body2"
                          sx={{ color: alpha('#fff', 0.5), mt: 0.5 }}
                        >
                          {getPriceSubtext(tier)}
                        </Typography>
                      )}
                      {tier === 'enterprise' && (
                        <Typography
                          variant="body2"
                          sx={{ color: alpha('#fff', 0.5), mt: 0.5 }}
                        >
                          {getPriceSubtext(tier)}
                        </Typography>
                      )}
                    </Box>

                    {/* CTA Button */}
                    <Button
                      component={tier === 'enterprise' ? 'a' : Link}
                      href={tier === 'enterprise' ? 'mailto:sales@netpad.io' : '/signup'}
                      variant={meta.ctaVariant}
                      fullWidth
                      sx={{
                        mb: 3,
                        py: 1.5,
                        fontWeight: 600,
                        textTransform: 'none',
                        ...(meta.ctaVariant === 'contained'
                          ? {
                              background: `linear-gradient(135deg, ${meta.color} 0%, ${alpha(meta.color, 0.8)} 100%)`,
                              color: '#001E2B',
                              '&:hover': {
                                background: `linear-gradient(135deg, ${alpha(meta.color, 0.9)} 0%, ${meta.color} 100%)`,
                              },
                            }
                          : {
                              borderColor: alpha(meta.color, 0.5),
                              color: meta.color,
                              '&:hover': {
                                borderColor: meta.color,
                                bgcolor: alpha(meta.color, 0.1),
                              },
                            }),
                      }}
                    >
                      {meta.cta}
                    </Button>

                    {/* Key Features */}
                    <Divider sx={{ borderColor: alpha('#fff', 0.1), mb: 2 }} />
                    <List dense sx={{ flex: 1 }}>
                      {tierHighlights[tier].map((highlight, index) => (
                        <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                          {index === 0 && tier !== 'free' ? (
                            <ListItemText
                              primary={highlight}
                              primaryTypographyProps={{
                                variant: 'body2',
                                sx: { color: alpha('#fff', 0.5), fontStyle: 'italic' },
                              }}
                            />
                          ) : (
                            <>
                              <ListItemIcon sx={{ minWidth: 28 }}>
                                <Check sx={{ fontSize: 18, color: meta.color }} />
                              </ListItemIcon>
                              <ListItemText
                                primary={highlight}
                                primaryTypographyProps={{
                                  variant: 'body2',
                                  sx: { color: alpha('#fff', 0.8) },
                                }}
                              />
                            </>
                          )}
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>

      {/* Feature Comparison Table */}
      <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: alpha('#000', 0.2) }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              fontWeight: 700,
              color: '#fff',
              mb: 1,
              fontSize: { xs: '1.75rem', md: '2.25rem' },
            }}
          >
            Compare Plans
          </Typography>
          <Typography
            variant="body1"
            sx={{
              textAlign: 'center',
              color: alpha('#fff', 0.6),
              mb: 5,
              maxWidth: 500,
              mx: 'auto',
            }}
          >
            See exactly what you get with each plan
          </Typography>

          {/* Usage Limits */}
          <Paper
            elevation={0}
            sx={{
              bgcolor: alpha('#fff', 0.03),
              border: '1px solid',
              borderColor: alpha('#fff', 0.1),
              borderRadius: 3,
              overflow: 'hidden',
              mb: 4,
            }}
          >
            <Box
              sx={{
                p: 2,
                bgcolor: alpha('#00ED64', 0.05),
                borderBottom: '1px solid',
                borderColor: alpha('#fff', 0.1),
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>
                <Description sx={{ mr: 1, verticalAlign: 'middle', color: '#00ED64' }} />
                Usage Limits
              </Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Box sx={{ minWidth: 600 }}>
                {/* Header Row */}
                <Grid container sx={{ borderBottom: '1px solid', borderColor: alpha('#fff', 0.1) }}>
                  <Grid item xs={4} sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: alpha('#fff', 0.7) }}>
                      Feature
                    </Typography>
                  </Grid>
                  {tiers.map((tier) => (
                    <Grid item xs={2} key={tier} sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: tierMeta[tier].color }}>
                        {tierMeta[tier].name}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>

                {/* Limit Rows */}
                {[
                  { label: 'Forms', key: 'maxForms' },
                  { label: 'Submissions/month', key: 'maxSubmissionsPerMonth' },
                  { label: 'Connections', key: 'maxConnections' },
                  { label: 'File Storage', key: 'maxFileStorageMb', format: formatStorage },
                  { label: 'Data Retention', key: 'dataRetentionDays', format: (v: number) => v === -1 ? 'Unlimited' : `${v} days` },
                  { label: 'Team Seats', key: 'maxSeats' },
                  { label: 'AI Generations/month', key: 'aiGenerationsPerMonth' },
                  { label: 'Agent Sessions/month', key: 'agentSessionsPerMonth' },
                ].map((row, index) => (
                  <Grid
                    container
                    key={row.key}
                    sx={{
                      borderBottom: '1px solid',
                      borderColor: alpha('#fff', 0.05),
                      bgcolor: index % 2 === 0 ? 'transparent' : alpha('#fff', 0.02),
                    }}
                  >
                    <Grid item xs={4} sx={{ p: 2 }}>
                      <Typography variant="body2" sx={{ color: alpha('#fff', 0.8) }}>
                        {row.label}
                      </Typography>
                    </Grid>
                    {tiers.map((tier) => {
                      const value = SUBSCRIPTION_TIERS[tier].limits[row.key as keyof typeof SUBSCRIPTION_TIERS.free.limits];
                      const formatted = row.format ? row.format(value as number) : formatLimit(value as number);
                      return (
                        <Grid item xs={2} key={tier} sx={{ p: 2, textAlign: 'center' }}>
                          <Typography
                            variant="body2"
                            sx={{
                              color: (value as number) === -1 ? '#00ED64' : alpha('#fff', 0.8),
                              fontWeight: (value as number) === -1 ? 600 : 400,
                            }}
                          >
                            {formatted}
                          </Typography>
                        </Grid>
                      );
                    })}
                  </Grid>
                ))}
              </Box>
            </Box>
          </Paper>

          {/* AI Features */}
          <Paper
            elevation={0}
            sx={{
              bgcolor: alpha('#fff', 0.03),
              border: '1px solid',
              borderColor: alpha('#fff', 0.1),
              borderRadius: 3,
              overflow: 'hidden',
              mb: 4,
            }}
          >
            <Box
              sx={{
                p: 2,
                bgcolor: alpha('#E91E63', 0.05),
                borderBottom: '1px solid',
                borderColor: alpha('#fff', 0.1),
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>
                <AutoAwesome sx={{ mr: 1, verticalAlign: 'middle', color: '#E91E63' }} />
                AI Features
              </Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Box sx={{ minWidth: 600 }}>
                {/* Header Row */}
                <Grid container sx={{ borderBottom: '1px solid', borderColor: alpha('#fff', 0.1) }}>
                  <Grid item xs={4} sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: alpha('#fff', 0.7) }}>
                      Feature
                    </Typography>
                  </Grid>
                  {tiers.map((tier) => (
                    <Grid item xs={2} key={tier} sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: tierMeta[tier].color }}>
                        {tierMeta[tier].name}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>

                {/* Feature Rows */}
                {(Object.keys(aiFeatureNames) as AIFeature[]).map((feature, index) => (
                  <Grid
                    container
                    key={feature}
                    sx={{
                      borderBottom: '1px solid',
                      borderColor: alpha('#fff', 0.05),
                      bgcolor: index % 2 === 0 ? 'transparent' : alpha('#fff', 0.02),
                    }}
                  >
                    <Grid item xs={4} sx={{ p: 2 }}>
                      <Typography variant="body2" sx={{ color: alpha('#fff', 0.8) }}>
                        {aiFeatureNames[feature]}
                      </Typography>
                    </Grid>
                    {tiers.map((tier) => {
                      const hasFeature = SUBSCRIPTION_TIERS[tier].aiFeatures.includes(feature);
                      return (
                        <Grid item xs={2} key={tier} sx={{ p: 2, textAlign: 'center' }}>
                          {hasFeature ? (
                            <Check sx={{ fontSize: 20, color: '#00ED64' }} />
                          ) : (
                            <Close sx={{ fontSize: 20, color: alpha('#fff', 0.2) }} />
                          )}
                        </Grid>
                      );
                    })}
                  </Grid>
                ))}
              </Box>
            </Box>
          </Paper>

          {/* Platform Features */}
          <Paper
            elevation={0}
            sx={{
              bgcolor: alpha('#fff', 0.03),
              border: '1px solid',
              borderColor: alpha('#fff', 0.1),
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                p: 2,
                bgcolor: alpha('#2196F3', 0.05),
                borderBottom: '1px solid',
                borderColor: alpha('#fff', 0.1),
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>
                <Security sx={{ mr: 1, verticalAlign: 'middle', color: '#2196F3' }} />
                Platform Features
              </Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Box sx={{ minWidth: 600 }}>
                {/* Header Row */}
                <Grid container sx={{ borderBottom: '1px solid', borderColor: alpha('#fff', 0.1) }}>
                  <Grid item xs={4} sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: alpha('#fff', 0.7) }}>
                      Feature
                    </Typography>
                  </Grid>
                  {tiers.map((tier) => (
                    <Grid item xs={2} key={tier} sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: tierMeta[tier].color }}>
                        {tierMeta[tier].name}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>

                {/* Feature Rows */}
                {(Object.keys(platformFeatureNames) as PlatformFeature[]).map((feature, index) => {
                  const isComingSoon = comingSoonFeatures.includes(feature);
                  return (
                    <Grid
                      container
                      key={feature}
                      sx={{
                        borderBottom: '1px solid',
                        borderColor: alpha('#fff', 0.05),
                        bgcolor: index % 2 === 0 ? 'transparent' : alpha('#fff', 0.02),
                      }}
                    >
                      <Grid item xs={4} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: alpha('#fff', 0.8) }}>
                          {platformFeatureNames[feature]}
                        </Typography>
                        {isComingSoon && (
                          <Chip
                            label="Coming Soon"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              bgcolor: alpha('#FF9800', 0.15),
                              color: '#FF9800',
                              fontWeight: 600,
                              '& .MuiChip-label': { px: 1 },
                            }}
                          />
                        )}
                      </Grid>
                      {tiers.map((tier) => {
                        const hasFeature = SUBSCRIPTION_TIERS[tier].platformFeatures.includes(feature);
                        return (
                          <Grid item xs={2} key={tier} sx={{ p: 2, textAlign: 'center' }}>
                            {hasFeature ? (
                              isComingSoon ? (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: alpha('#FF9800', 0.8),
                                    fontWeight: 500,
                                  }}
                                >
                                  Soon
                                </Typography>
                              ) : (
                                <Check sx={{ fontSize: 20, color: '#00ED64' }} />
                              )
                            ) : (
                              <Close sx={{ fontSize: 20, color: alpha('#fff', 0.2) }} />
                            )}
                          </Grid>
                        );
                      })}
                    </Grid>
                  );
                })}
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>

      {/* FAQ Section */}
      <Box sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="md">
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              fontWeight: 700,
              color: '#fff',
              mb: 5,
              fontSize: { xs: '1.75rem', md: '2.25rem' },
            }}
          >
            Frequently Asked Questions
          </Typography>

          <Grid container spacing={3}>
            {[
              {
                q: 'What happens when I sign up for Free?',
                a: 'You get an auto-provisioned MongoDB Atlas M0 cluster immediately. No credit card required. Start building forms and collecting data right away.',
              },
              {
                q: 'Can I upgrade or downgrade anytime?',
                a: 'Yes! You can change your plan at any time. When upgrading, you\'ll be charged the prorated difference. When downgrading, you\'ll receive credit toward future billing.',
              },
              {
                q: 'What counts as an "AI generation"?',
                a: 'Each time you use AI to generate a form from natural language, get field suggestions, or create validation rules counts as one generation.',
              },
              {
                q: 'What are "Agent sessions"?',
                a: 'Agent sessions are autonomous AI operations like form optimization analysis, response processing, compliance audits, and auto-translation tasks.',
              },
              {
                q: 'Can I use my own MongoDB cluster?',
                a: 'Yes! While Free tier uses our auto-provisioned M0 cluster, all paid plans let you connect your own MongoDB Atlas clusters or self-hosted MongoDB instances.',
              },
              {
                q: 'Is my data secure?',
                a: 'Absolutely. Connection strings are encrypted at rest with AES-256. Team and Enterprise plans include MongoDB Queryable Encryption for field-level encryption.',
              },
            ].map((faq, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Box
                  sx={{
                    p: 3,
                    bgcolor: alpha('#fff', 0.03),
                    border: '1px solid',
                    borderColor: alpha('#fff', 0.1),
                    borderRadius: 2,
                    height: '100%',
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#fff', mb: 1 }}>
                    {faq.q}
                  </Typography>
                  <Typography variant="body2" sx={{ color: alpha('#fff', 0.6), lineHeight: 1.7 }}>
                    {faq.a}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          py: { xs: 6, md: 8 },
          background: 'linear-gradient(180deg, transparent 0%, rgba(0, 237, 100, 0.05) 100%)',
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 4 },
              textAlign: 'center',
              bgcolor: alpha('#00ED64', 0.05),
              border: '1px solid',
              borderColor: alpha('#00ED64', 0.2),
              borderRadius: 3,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mb: 1.5 }}>
              Ready to get started?
            </Typography>
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.6), mb: 3 }}>
              Free MongoDB Atlas cluster included. No credit card required.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                component={Link}
                href="/signup"
                variant="contained"
                size="small"
                sx={{
                  px: 3,
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #00ED64 0%, #00CC55 100%)',
                  color: '#001E2B',
                  textTransform: 'none',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #00FF6A 0%, #00ED64 100%)',
                  },
                }}
              >
                Start Free
              </Button>
              <Button
                component="a"
                href="mailto:sales@netpad.io"
                variant="outlined"
                size="small"
                sx={{
                  px: 3,
                  fontWeight: 600,
                  borderColor: alpha('#fff', 0.3),
                  color: '#fff',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#fff',
                    bgcolor: alpha('#fff', 0.1),
                  },
                }}
              >
                Contact Sales
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
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
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Image src="/logo-250x250-trans.png" alt="NetPad" width={24} height={24} />
              <Typography variant="body2" sx={{ color: alpha('#fff', 0.5), fontWeight: 500 }}>
                NetPad
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Typography
                component={Link}
                href="/"
                variant="body2"
                sx={{
                  color: alpha('#fff', 0.4),
                  textDecoration: 'none',
                  '&:hover': { color: '#00ED64' },
                }}
              >
                Home
              </Typography>
              <Typography
                component={Link}
                href="/privacy"
                variant="body2"
                sx={{
                  color: alpha('#fff', 0.4),
                  textDecoration: 'none',
                  '&:hover': { color: '#00ED64' },
                }}
              >
                Privacy
              </Typography>
              <Typography
                component={Link}
                href="/terms"
                variant="body2"
                sx={{
                  color: alpha('#fff', 0.4),
                  textDecoration: 'none',
                  '&:hover': { color: '#00ED64' },
                }}
              >
                Terms
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
