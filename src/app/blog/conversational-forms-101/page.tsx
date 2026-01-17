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
} from '@mui/material';
import {
  ArrowBack,
  Schedule,
  AutoAwesome,
  CheckCircle,
  Cancel,
  LightbulbOutlined,
  FormatQuote,
} from '@mui/icons-material';
import Link from 'next/link';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { useAuth } from '@/contexts/AuthContext';

// Reusable components for the blog post
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

function CodeBlock({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <Paper
      elevation={0}
      sx={{
        my: 3,
        bgcolor: alpha('#000', 0.3),
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
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: alpha('#fff', 0.6), fontWeight: 500 }}
          >
            {title}
          </Typography>
        </Box>
      )}
      <Box
        component="pre"
        sx={{
          p: 3,
          m: 0,
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          color: alpha('#fff', 0.9),
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {children}
      </Box>
    </Paper>
  );
}

function Callout({ type = 'info', children }: { type?: 'info' | 'tip' | 'warning'; children: React.ReactNode }) {
  const colors = {
    info: { bg: '#2196F3', border: '#2196F3' },
    tip: { bg: '#00ED64', border: '#00ED64' },
    warning: { bg: '#FF9800', border: '#FF9800' },
  };

  return (
    <Paper
      elevation={0}
      sx={{
        my: 4,
        p: 3,
        bgcolor: alpha(colors[type].bg, 0.1),
        border: '1px solid',
        borderColor: alpha(colors[type].border, 0.3),
        borderRadius: 2,
        borderLeft: '4px solid',
        borderLeftColor: colors[type].border,
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <LightbulbOutlined sx={{ color: colors[type].border, mt: 0.25 }} />
        <Typography sx={{ color: alpha('#fff', 0.85), lineHeight: 1.7 }}>
          {children}
        </Typography>
      </Box>
    </Paper>
  );
}

function ComparisonTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: { label: string; conversational: boolean; traditional: boolean }[];
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        my: 4,
        bgcolor: alpha('#fff', 0.02),
        border: '1px solid',
        borderColor: alpha('#fff', 0.1),
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 3,
          py: 2,
          bgcolor: alpha('#fff', 0.05),
          borderBottom: '1px solid',
          borderColor: alpha('#fff', 0.1),
        }}
      >
        <Typography sx={{ fontWeight: 600, color: '#fff' }}>{title}</Typography>
      </Box>
      <Box sx={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: '12px 16px',
                    textAlign: i === 0 ? 'left' : 'center',
                    borderBottom: `1px solid ${alpha('#fff', 0.1)}`,
                    color: alpha('#fff', 0.6),
                    fontWeight: 500,
                    fontSize: '0.85rem',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td
                  style={{
                    padding: '12px 16px',
                    borderBottom:
                      i < rows.length - 1 ? `1px solid ${alpha('#fff', 0.05)}` : 'none',
                    color: alpha('#fff', 0.8),
                    fontSize: '0.95rem',
                  }}
                >
                  {row.label}
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    borderBottom:
                      i < rows.length - 1 ? `1px solid ${alpha('#fff', 0.05)}` : 'none',
                  }}
                >
                  {row.conversational ? (
                    <CheckCircle sx={{ color: '#00ED64', fontSize: 20 }} />
                  ) : (
                    <Cancel sx={{ color: alpha('#fff', 0.3), fontSize: 20 }} />
                  )}
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    borderBottom:
                      i < rows.length - 1 ? `1px solid ${alpha('#fff', 0.05)}` : 'none',
                  }}
                >
                  {row.traditional ? (
                    <CheckCircle sx={{ color: '#00ED64', fontSize: 20 }} />
                  ) : (
                    <Cancel sx={{ color: alpha('#fff', 0.3), fontSize: 20 }} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Paper>
  );
}

function BulletList({
  items,
  type = 'check',
}: {
  items: string[];
  type?: 'check' | 'x' | 'bullet';
}) {
  const icons = {
    check: <CheckCircle sx={{ color: '#00ED64', fontSize: 18 }} />,
    x: <Cancel sx={{ color: '#E91E63', fontSize: 18 }} />,
    bullet: <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#00ED64' }} />,
  };

  return (
    <Box sx={{ my: 3 }}>
      {items.map((item, i) => (
        <Box
          key={i}
          sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}
        >
          <Box sx={{ mt: type === 'bullet' ? 0.75 : 0.25 }}>{icons[type]}</Box>
          <Typography sx={{ color: alpha('#fff', 0.8), lineHeight: 1.7 }}>
            {item}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export default function ConversationalForms101Page() {
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
          {/* Back link */}
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

          {/* Meta */}
          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            <Chip
              label="Product"
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
              <Typography variant="body2">8 min read</Typography>
            </Box>
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.5) }}>
              January 2025
            </Typography>
          </Box>

          {/* Title */}
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
            Conversational Forms 101: The Business Case for Better Data Capture
          </Typography>

          {/* Subtitle */}
          <Typography
            sx={{
              fontSize: '1.2rem',
              color: alpha('#fff', 0.7),
              lineHeight: 1.6,
            }}
          >
            Why chat-based data collection outperforms traditional forms for high-value conversions—and when to use each.
          </Typography>
        </Container>
      </Box>

      {/* Article Content */}
      <Container maxWidth="md" sx={{ pb: 8 }}>
        <Box sx={{ maxWidth: 720 }}>
          {/* The Problem Nobody Talks About */}
          <SectionHeader>The Problem Nobody Talks About</SectionHeader>

          <Paragraph>
            You&apos;ve probably seen this: A user lands on your signup form. They see 10 fields.
            Their eyes glaze over. They close the tab.
          </Paragraph>

          <Paragraph>
            It&apos;s not a new problem. But the solution most teams use is stuck in the 1990s:
            add a progress bar, break fields into steps, maybe add some encouraging copy. The
            form still <em>feels</em> like a form.
          </Paragraph>

          <Paragraph>
            Meanwhile, your user&apos;s entire life is spent talking to chat interfaces. They text
            their friends. They ask Slack questions. They prompt ChatGPT. Natural conversation is
            now the dominant UI pattern in their world.
          </Paragraph>

          <Callout type="tip">
            <strong>Here&apos;s the tension:</strong> You need structured data from users (name, email,
            company, budget, urgency level). But the interface they&apos;re comfortable with is
            conversational, not form-based. What if you didn&apos;t have to choose?
          </Callout>

          {/* What Are Conversational Forms? */}
          <SectionHeader>What Are Conversational Forms?</SectionHeader>

          <Paragraph>
            A conversational form is <strong>a chat-based interface that captures the same
            structured data as a traditional form, but one question at a time, in natural
            conversation style</strong>.
          </Paragraph>

          <Paragraph>Instead of this:</Paragraph>

          <CodeBlock title="Traditional Form View">
{`Name: ___________
Email: ___________
Company: ___________
Budget: [Dropdown]
[Submit Button]`}
          </CodeBlock>

          <Paragraph>You get this:</Paragraph>

          <CodeBlock title="Conversational View">
{`Bot: Hey! What's your name?
User: I'm Sarah
Bot: Nice to meet you, Sarah. What's your company?
User: Acme Corp
Bot: Got it. What's your budget for this?
User: Around 50k
Bot: Perfect. I'll get you connected with the right team.`}
          </CodeBlock>

          <Paragraph>
            Both interfaces capture the exact same data. Same schema. Same database record. Same
            downstream workflows.
          </Paragraph>

          <Paragraph>
            The difference is <strong>user experience and completion rates</strong>—and it&apos;s
            substantial.
          </Paragraph>

          {/* Why Conversational Forms Work */}
          <SectionHeader>Why Conversational Forms Work (The Psychology)</SectionHeader>

          <SubHeader>1. Lower Cognitive Load</SubHeader>

          <Paragraph>
            A form with 10 fields creates decision fatigue. Your brain has to:
          </Paragraph>

          <BulletList
            type="bullet"
            items={[
              'Scan all fields',
              'Understand what each one means',
              'Figure out the right order to fill them',
              "Decide if you're willing to share all that information",
            ]}
          />

          <Paragraph>
            A conversational form removes this. You answer one question. Then the next. Your brain
            focuses on a single decision at a time.
          </Paragraph>

          <Callout type="info">
            <strong>Result:</strong> Higher completion rates, especially for longer forms.
          </Callout>

          <SubHeader>2. Reduced Friction</SubHeader>

          <Paragraph>
            Forms say: &ldquo;Give me everything at once.&rdquo;
          </Paragraph>

          <Paragraph>
            Conversations say: &ldquo;Let&apos;s take this one step at a time.&rdquo;
          </Paragraph>

          <Paragraph>
            The psychological difference is real. Users are more likely to <em>start</em> a
            conversation than to commit to filling out a form. And once they&apos;ve answered one
            question, there&apos;s momentum—answering the next is easier than abandoning mid-way.
          </Paragraph>

          <SubHeader>3. Opportunity for Dynamic Paths</SubHeader>

          <Paragraph>
            In a traditional form, every user sees the same fields (or you build complex
            conditional logic that&apos;s hard to test).
          </Paragraph>

          <Paragraph>
            In a conversational form, you can naturally branch based on answers:
          </Paragraph>

          <BulletList
            type="bullet"
            items={[
              '"What\'s your use case?" → User says "customer support"',
              '"How many tickets per month?" → Asks follow-up questions specific to support teams',
              'Meanwhile, another user says "data analytics" and gets a completely different conversation',
            ]}
          />

          <Paragraph>
            Each user gets a tailored experience. Each conversation feels smart, not generic.
          </Paragraph>

          <SubHeader>4. Natural Handling of Complex Data</SubHeader>

          <Paragraph>Some information is hard to capture in a form field:</Paragraph>

          <BulletList
            type="bullet"
            items={[
              '"Tell me about your biggest operational challenge" — Users give you essay-length answers that are awkward in a text field',
              '"What does your ideal solution look like?" — Better as a natural question than a form field',
            ]}
          />

          <Paragraph>
            Conversational interfaces make this feel normal. You&apos;re asking for feedback, not
            demanding structured input.
          </Paragraph>

          {/* When to Use */}
          <SectionHeader>When to Use Conversational Forms (vs. Traditional Forms)</SectionHeader>

          <Paragraph>
            Both interfaces have strengths. The decision should be based on your use case.
          </Paragraph>

          <SubHeader>Use Conversational Forms When:</SubHeader>

          <BulletList
            type="check"
            items={[
              'High-value conversions matter more than speed — Example: Qualified lead capture, customer intake, support requests',
              "You need tailored experiences — Example: Onboarding flows that differ by customer segment",
              "Your audience is non-technical — Example: IT help desk, employee surveys, feedback collection",
              "You want to build relationships — Example: Customer discovery, user research",
              "You're asking for sensitive information — Example: Health data, financial details, personal preferences",
            ]}
          />

          <SubHeader>Use Traditional Forms When:</SubHeader>

          <BulletList
            type="check"
            items={[
              'Speed is the goal — Example: Newsletter signups, quick polls, fast checkout',
              'You have just a few required fields — Example: Email capture, simple surveys (3-5 questions)',
              'Users are already in context — Example: A "Report a bug" button where users expect a quick form',
              'You need bulk submission capability — Example: Spreadsheet imports, batch data entry',
            ]}
          />

          <ComparisonTable
            title="Quick Comparison"
            headers={['Use Case', 'Conversational', 'Traditional']}
            rows={[
              { label: 'Lead qualification (high-value)', conversational: true, traditional: false },
              { label: 'Newsletter signup', conversational: false, traditional: true },
              { label: 'Customer onboarding', conversational: true, traditional: false },
              { label: 'Bug reports (quick)', conversational: false, traditional: true },
              { label: 'Employee surveys', conversational: true, traditional: true },
              { label: 'Bulk data entry', conversational: false, traditional: true },
              { label: 'Sensitive data collection', conversational: true, traditional: false },
            ]}
          />

          {/* Real Examples */}
          <SectionHeader>Real Examples: The Difference in Action</SectionHeader>

          <SubHeader>Example 1: IT Help Desk Ticket</SubHeader>

          <Paper
            elevation={0}
            sx={{
              my: 3,
              p: 3,
              bgcolor: alpha('#E91E63', 0.1),
              border: '1px solid',
              borderColor: alpha('#E91E63', 0.2),
              borderRadius: 2,
            }}
          >
            <Typography sx={{ fontWeight: 600, color: '#E91E63', mb: 2 }}>
              Traditional Form Approach
            </Typography>
            <BulletList
              type="x"
              items={[
                'User sees form with fields: Issue Type, Urgency, Description, Department, Email',
                'Many users feel overwhelmed, leave the form incomplete',
                'You get tickets missing critical info',
                'Your IT team has to chase users for follow-ups',
              ]}
            />
          </Paper>

          <Paper
            elevation={0}
            sx={{
              my: 3,
              p: 3,
              bgcolor: alpha('#00ED64', 0.1),
              border: '1px solid',
              borderColor: alpha('#00ED64', 0.2),
              borderRadius: 2,
            }}
          >
            <Typography sx={{ fontWeight: 600, color: '#00ED64', mb: 2 }}>
              Conversational Approach
            </Typography>
            <BulletList
              type="check"
              items={[
                '"What\'s the issue you\'re facing?" → User describes problem naturally',
                '"How urgent is this?" → Smart branching: if critical, next question is SLA; if low, skip that',
                '"Which department are you in?" → Only asked if relevant',
                'User completes in 90 seconds, all required info present',
                'Automatic routing to right team based on issue type and urgency',
              ]}
            />
          </Paper>

          <Callout type="tip">
            <strong>Result:</strong> 70% fewer incomplete tickets, 50% faster resolution time.
          </Callout>

          <SubHeader>Example 2: SaaS Customer Onboarding</SubHeader>

          <Paper
            elevation={0}
            sx={{
              my: 3,
              p: 3,
              bgcolor: alpha('#E91E63', 0.1),
              border: '1px solid',
              borderColor: alpha('#E91E63', 0.2),
              borderRadius: 2,
            }}
          >
            <Typography sx={{ fontWeight: 600, color: '#E91E63', mb: 2 }}>
              Traditional Form Approach
            </Typography>
            <BulletList
              type="x"
              items={[
                'New signup sees pre-built form: Company size, industry, use case, budget, team size, timeline',
                '25% bounce rate before completion',
                "No sense of the customer's actual needs",
                'Sales team follows up with everyone, wastes time on bad-fit leads',
              ]}
            />
          </Paper>

          <Paper
            elevation={0}
            sx={{
              my: 3,
              p: 3,
              bgcolor: alpha('#00ED64', 0.1),
              border: '1px solid',
              borderColor: alpha('#00ED64', 0.2),
              borderRadius: 2,
            }}
          >
            <Typography sx={{ fontWeight: 600, color: '#00ED64', mb: 2 }}>
              Conversational Approach
            </Typography>
            <BulletList
              type="check"
              items={[
                '"What\'s your biggest goal for this software?" → User answers naturally',
                'Based on answer, smart follow-ups: If they say "reduce costs," ask about budget. If they say "faster workflows," ask about team size and process.',
                '"What timeline are you working with?" → Surfaces urgency and buying readiness',
                'By the end, you have a rich picture of the customer without asking irrelevant questions',
              ]}
            />
          </Paper>

          <Callout type="tip">
            <strong>Result:</strong> 35% higher completion, more qualified leads, shorter sales cycle.
          </Callout>

          {/* How NetPad Implements */}
          <SectionHeader>How NetPad Implements Conversational Forms</SectionHeader>

          <Paragraph>
            Here&apos;s what makes NetPad different: You don&apos;t choose between conversational or
            traditional at design time. <strong>You build once and deploy both.</strong>
          </Paragraph>

          <SubHeader>The Architecture</SubHeader>

          <BulletList
            type="bullet"
            items={[
              'You define your data schema — What fields do you need? (name, email, budget, urgency, etc.)',
              'Choose your interface(s): Traditional form view, conversational chat view, or both—and A/B test them',
              "The data flows the same way — Whether someone uses the form or chat, the structured data arrives identically in your database",
            ]}
          />

          <SubHeader>Why This Matters</SubHeader>

          <BulletList
            type="check"
            items={[
              "No rebuilding. You don't need two separate forms. One schema, two interfaces.",
              'A/B test interfaces. Run both side-by-side and measure which converts better for your use case.',
              'Flexible deployment. Embed the form on your website, use the chat interface in your mobile app, or let users pick their preference.',
              "Predictable data. Unlike pure AI chatbots, conversational forms stick to your schema. No hallucinations. No parsing errors. Just structured data.",
            ]}
          />

          {/* Competitive Advantage */}
          <SectionHeader>The Competitive Advantage</SectionHeader>

          <Paragraph>
            Traditional form builders (Typeform, Tally, Google Forms) offer beautiful forms. But
            they&apos;re still <em>forms</em>—linear, field-by-field, desktop-first.
          </Paragraph>

          <Paragraph>
            AI chatbots (ChatGPT + custom API, automated agents) offer natural conversation. But
            they&apos;re unpredictable—you never quite know what data you&apos;ll get back, and you have to
            engineer prompts to get clean structured output.
          </Paragraph>

          <Paragraph>
            NetPad conversational forms give you the middle path:{' '}
            <strong>conversational UX with predictable, structured data.</strong>
          </Paragraph>

          <Paragraph>For a product team, that means:</Paragraph>

          <BulletList
            type="check"
            items={[
              'Better conversion rates (conversational is more engaging)',
              'Cleaner data (schema ensures consistency)',
              'Easier automation (structured data triggers workflows reliably)',
              'Lower cost (no prompt engineering, no parsing logic)',
            ]}
          />

          {/* When to Start */}
          <SectionHeader>When Should You Start Thinking About Conversational Forms?</SectionHeader>

          <Paper
            elevation={0}
            sx={{
              my: 3,
              p: 3,
              bgcolor: alpha('#00ED64', 0.05),
              border: '1px solid',
              borderColor: alpha('#00ED64', 0.2),
              borderRadius: 2,
            }}
          >
            <Typography sx={{ fontWeight: 600, color: '#00ED64', mb: 2 }}>
              Immediately, if:
            </Typography>
            <BulletList
              type="check"
              items={[
                "You're building user intake flows and completion rates are a bottleneck",
                "You're collecting data from non-technical users (they prefer chat to forms)",
                'You want to test whether interface affects conversion (A/B test both)',
              ]}
            />
          </Paper>

          <Paper
            elevation={0}
            sx={{
              my: 3,
              p: 3,
              bgcolor: alpha('#2196F3', 0.05),
              border: '1px solid',
              borderColor: alpha('#2196F3', 0.2),
              borderRadius: 2,
            }}
          >
            <Typography sx={{ fontWeight: 600, color: '#2196F3', mb: 2 }}>
              Soon, if:
            </Typography>
            <BulletList
              type="check"
              items={[
                "You're building internal tools (employees prefer conversational interfaces)",
                "You're collecting sensitive information (conversation feels less invasive)",
                'Your form has conditional logic (conversation handles branching more naturally)',
              ]}
            />
          </Paper>

          <Paper
            elevation={0}
            sx={{
              my: 3,
              p: 3,
              bgcolor: alpha('#fff', 0.02),
              border: '1px solid',
              borderColor: alpha('#fff', 0.1),
              borderRadius: 2,
            }}
          >
            <Typography sx={{ fontWeight: 600, color: alpha('#fff', 0.7), mb: 2 }}>
              Eventually, if:
            </Typography>
            <BulletList
              type="bullet"
              items={[
                'You\'re focused on speed and simplicity (traditional forms are still best for "quick email signup")',
                "You don't have conversion or engagement problems with your current approach",
              ]}
            />
          </Paper>

          {/* Key Takeaways */}
          <SectionHeader>Key Takeaways</SectionHeader>

          <BulletList
            type="check"
            items={[
              'Conversational forms capture structured data through chat interfaces — same schema, different UX',
              'They work because of psychology — lower cognitive load, reduced friction, natural branching, better relationship building',
              "Not every use case needs them — they're best for high-value conversions, non-technical audiences, and complex branching",
              "NetPad lets you build once, deploy twice — test both interfaces without rebuilding",
              'The competitive advantage is real — higher conversion + predictable data + simpler automation',
            ]}
          />

          <Divider sx={{ my: 6, borderColor: alpha('#fff', 0.1) }} />

          {/* CTA Section */}
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
              Ready to try conversational forms?
            </Typography>
            <Typography sx={{ color: alpha('#fff', 0.7), mb: 4, maxWidth: 500, mx: 'auto' }}>
              See the difference yourself with our interactive demo. Experience how natural
              conversation captures the same structured data as traditional forms.
            </Typography>
            <Box
              sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}
            >
              <Button
                component={Link}
                href="/demo/conversational"
                variant="contained"
                size="large"
                startIcon={<AutoAwesome />}
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

          {/* Part 2 Link */}
          <Box sx={{ mt: 6, textAlign: 'center' }}>
            <Typography sx={{ color: alpha('#fff', 0.5), mb: 1 }}>
              Ready for the technical deep-dive?
            </Typography>
            <Button
              component={Link}
              href="/blog/conversational-forms-for-developers"
              sx={{ color: '#00ED64', fontWeight: 600, fontSize: '1.1rem' }}
            >
              Read Part 2: Conversational Forms for Developers →
            </Button>
            <Typography sx={{ color: alpha('#fff', 0.6), maxWidth: 500, mx: 'auto', mt: 1 }}>
              Schema definition, conditional logic, workflow integration, and deployment options.
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
