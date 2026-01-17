/**
 * Conversational Forms Demo
 *
 * A powerful demonstration showing the contrast between
 * traditional forms and AI-powered conversational data capture.
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Chip,
  Alert,
  Snackbar,
  alpha,
  Divider,
  TextField,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  AutoAwesome,
  CheckCircle,
  Storage,
  PlayArrow,
  Refresh,
  Send,
  RadioButtonUnchecked,
  Article,
  Psychology,
  TouchApp,
  ExpandMore,
  Schema,
  Security,
  Speed,
  Code,
  QuestionAnswer,
  Tune,
  DataObject,
  VerifiedUser,
  CloudSync,
} from '@mui/icons-material';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import { ConversationalFormConfig } from '@/types/conversational';

// ============================================
// FAQ Data
// ============================================

const FAQ_ITEMS = [
  {
    category: 'How It Works',
    icon: <QuestionAnswer sx={{ fontSize: 20 }} />,
    questions: [
      {
        q: 'How does the AI know what questions to ask?',
        a: 'You define a configuration that specifies the "topics" to cover and an "extraction schema" that describes the data fields you want to collect. The AI uses this configuration as a guide, asking questions naturally to gather each piece of information. It tracks which topics have been covered and adapts its questions based on what the user has already shared.',
      },
      {
        q: 'How does it extract structured data from natural conversation?',
        a: 'The system uses AI-powered natural language understanding to parse user responses in real-time. When a user says "I\'m Sarah from Acme Corp," the AI recognizes "Sarah" as a name and "Acme Corp" as a company, then maps these to your defined schema fields. This extraction happens continuously as the conversation progresses.',
      },
      {
        q: 'What happens if the user provides information out of order?',
        a: 'The conversational form handles this gracefully. If a user volunteers their email before being asked, the system captures it immediately and skips that question later. The AI maintains context throughout the conversation and adapts its flow based on what information has already been collected.',
      },
      {
        q: 'Can users provide multiple pieces of information in one message?',
        a: 'Absolutely! If a user says "I\'m John Smith, my email is john@example.com, and I work at MongoDB," the system extracts all three pieces of information at once. This is one of the key advantages over traditional forms—users can communicate naturally without being constrained to one field at a time.',
      },
    ],
  },
  {
    category: 'Configuration & Customization',
    icon: <Tune sx={{ fontSize: 20 }} />,
    questions: [
      {
        q: 'How do I define what data to collect?',
        a: 'You create an "extraction schema" that defines each field: its name, data type (string, number, email, etc.), whether it\'s required, and validation rules. You also define "topics" that describe the conversational areas to explore. The AI uses both to guide the conversation and validate extracted data.',
      },
      {
        q: 'Can I customize the AI\'s personality and tone?',
        a: 'Yes! The configuration includes a "persona" section where you define the AI\'s communication style (professional, friendly, casual), tone, and specific behaviors. You can make it formal for business applications or warm and casual for consumer-facing forms.',
      },
      {
        q: 'What validation options are available?',
        a: 'You can define validation rules including: required fields, regex patterns (for emails, phone numbers, etc.), min/max values for numbers, min/max length for text, and custom validation logic. Invalid data is flagged and the AI naturally asks for corrections.',
      },
      {
        q: 'Can I set which fields are required vs. optional?',
        a: 'Yes. Each field and topic can be marked as "required," "important," or "optional." The AI prioritizes required fields and only marks the conversation complete when all required data is collected with sufficient confidence.',
      },
    ],
  },
  {
    category: 'Data & Storage',
    icon: <DataObject sx={{ fontSize: 20 }} />,
    questions: [
      {
        q: 'Where is the collected data stored?',
        a: 'Data is stored directly in MongoDB. You can configure which database and collection to use. The extracted data is saved as clean, structured JSON documents—identical to what you\'d get from a traditional form, but with the added bonus of the full conversation transcript for context.',
      },
      {
        q: 'Is the conversation transcript saved along with the data?',
        a: 'Yes, optionally. You can store the full conversation transcript alongside the extracted data. This provides valuable context, audit trails, and can be useful for training and improving your forms over time.',
      },
      {
        q: 'What format is the data saved in?',
        a: 'Data is saved as structured MongoDB documents with the exact field names you defined in your schema. For example: { "fullName": "Sarah Jones", "email": "sarah@example.com", "company": "Acme" }. It\'s immediately queryable and usable by your applications.',
      },
      {
        q: 'Can I integrate with my existing MongoDB database?',
        a: 'Yes! You can specify any MongoDB connection string and target any database/collection. The conversational form writes directly to your database, making it easy to integrate with existing applications and workflows.',
      },
    ],
  },
  {
    category: 'Security & Privacy',
    icon: <Security sx={{ fontSize: 20 }} />,
    questions: [
      {
        q: 'Is the conversation data secure?',
        a: 'Yes. All data is transmitted over HTTPS, and you control where data is stored. The AI processing can be done via cloud providers (OpenAI, etc.) or self-hosted models (Ollama) for complete data sovereignty. No conversation data is retained by the AI provider beyond the session.',
      },
      {
        q: 'Can I use self-hosted AI models for privacy?',
        a: 'Absolutely. The system supports Ollama and other self-hosted LLM solutions. This means all AI processing happens on your infrastructure, and no data ever leaves your network—ideal for sensitive data collection in healthcare, finance, or enterprise applications.',
      },
      {
        q: 'How is sensitive information handled?',
        a: 'You can mark fields as sensitive in your schema. The system supports encryption at rest, and you can configure data retention policies. For highly sensitive data, use self-hosted models to ensure data never leaves your infrastructure.',
      },
    ],
  },
  {
    category: 'Performance & Reliability',
    icon: <Speed sx={{ fontSize: 20 }} />,
    questions: [
      {
        q: 'How fast is the response time?',
        a: 'Responses stream in real-time, typically starting within 200-500ms. Users see the AI "typing" as the response generates, creating a natural chat experience. The extraction happens simultaneously, so data appears in real-time as it\'s captured.',
      },
      {
        q: 'What happens if the AI makes an extraction error?',
        a: 'The system includes confidence scoring for each extracted field. If confidence is low, the AI naturally asks clarifying questions. Users can also correct information conversationally ("Actually, my email is..."), and the system updates accordingly.',
      },
      {
        q: 'What if the network connection is interrupted?',
        a: 'The system supports draft saving and session recovery. Partial conversations can be resumed, and extracted data is preserved even if the session is interrupted. For critical applications, you can enable automatic draft persistence.',
      },
    ],
  },
  {
    category: 'Technical Integration',
    icon: <Code sx={{ fontSize: 20 }} />,
    questions: [
      {
        q: 'Can I embed conversational forms in my application?',
        a: 'Yes! The form can be embedded via iframe, React component, or Web Component. We also provide a JavaScript SDK for custom integrations. The component is fully themeable to match your application\'s design.',
      },
      {
        q: 'Is there an API for programmatic access?',
        a: 'Yes. Full REST and streaming APIs are available for creating forms, submitting data, retrieving submissions, and managing configurations. You can build completely custom UIs while leveraging the conversational AI backend.',
      },
      {
        q: 'What AI providers are supported?',
        a: 'The system supports OpenAI (GPT-4, GPT-4o), self-hosted models via Ollama (Llama, Mistral, etc.), and OpenRouter for access to multiple providers. You can switch providers without changing your form configuration.',
      },
      {
        q: 'Can I use webhooks to trigger actions when data is collected?',
        a: 'Yes. Configure webhooks to fire when forms are submitted, specific fields are collected, or confidence thresholds are met. This enables real-time integrations with CRMs, email systems, Slack notifications, and more.',
      },
    ],
  },
];

// ============================================
// FAQ Component
// ============================================

function FAQSection() {
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Box sx={{ mt: 8, mb: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Frequently Asked Questions
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          Everything you need to know about conversational forms—from how the AI works to security, customization, and integration.
        </Typography>
      </Box>

      {/* FAQ Categories */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        {FAQ_ITEMS.map((category, catIndex) => (
          <Paper
            key={catIndex}
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'background.paper',
            }}
          >
            {/* Category Header */}
            <Box
              sx={{
                p: 2,
                bgcolor: alpha('#00ED64', 0.05),
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Box sx={{ color: '#00ED64' }}>{category.icon}</Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {category.category}
              </Typography>
            </Box>

            {/* Questions */}
            <Box>
              {category.questions.map((item, qIndex) => {
                const panelId = `${catIndex}-${qIndex}`;
                return (
                  <Accordion
                    key={qIndex}
                    expanded={expanded === panelId}
                    onChange={handleChange(panelId)}
                    elevation={0}
                    disableGutters
                    sx={{
                      '&:before': { display: 'none' },
                      borderBottom: qIndex < category.questions.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMore sx={{ color: 'text.secondary' }} />}
                      sx={{
                        px: 2,
                        py: 0.5,
                        minHeight: 48,
                        '&:hover': { bgcolor: alpha('#00ED64', 0.02) },
                        '& .MuiAccordionSummary-content': { my: 1 },
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.q}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                        {item.a}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Bottom CTA */}
      <Box
        sx={{
          mt: 4,
          p: 4,
          textAlign: 'center',
          border: '1px solid',
          borderColor: alpha('#00ED64', 0.3),
          borderRadius: 2,
          background: `linear-gradient(135deg, ${alpha('#00ED64', 0.05)} 0%, ${alpha('#00684A', 0.05)} 100%)`,
        }}
      >
        <AutoAwesome sx={{ fontSize: 32, color: '#00ED64', mb: 1 }} />
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Ready to transform your forms?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
          Join the waitlist to be among the first to build conversational forms for your applications. Early access coming soon!
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<AutoAwesome />}
          sx={{
            bgcolor: '#00ED64',
            color: '#001E2B',
            fontWeight: 600,
            px: 4,
            '&:hover': { bgcolor: '#00CC55' },
          }}
          href="/"
        >
          Join the Waitlist
        </Button>
      </Box>
    </Box>
  );
}

// ============================================
// Configuration
// ============================================

const DEMO_CONFIG: ConversationalFormConfig = {
  formType: 'conversational',
  objective: "I'll help collect your contact information",
  context: 'Contact information collection for demo purposes',
  persona: {
    style: 'friendly',
    tone: 'warm and helpful',
    behaviors: ['Be concise and natural', 'Ask one question at a time'],
  },
  topics: [
    { id: 'name', name: 'Name', description: "Get the person's full name", priority: 'required', depth: 'surface', extractionField: 'fullName' },
    { id: 'email', name: 'Email', description: 'Get their email address', priority: 'required', depth: 'surface', extractionField: 'email' },
    { id: 'company', name: 'Company', description: 'Company or organization', priority: 'important', depth: 'surface', extractionField: 'company' },
    { id: 'interest', name: 'Interest', description: 'What brings them here', priority: 'optional', depth: 'moderate', extractionField: 'interest' },
  ],
  extractionSchema: [
    { field: 'fullName', type: 'string', required: true, description: 'Full name', topicId: 'name' },
    { field: 'email', type: 'string', required: true, description: 'Email address', topicId: 'email' },
    { field: 'company', type: 'string', required: false, description: 'Company', topicId: 'company' },
    { field: 'interest', type: 'string', required: false, description: 'Interest', topicId: 'interest' },
  ],
  conversationLimits: { maxTurns: 10, maxDuration: 10, minConfidence: 0.7 },
};

// ============================================
// Types
// ============================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ConversationState {
  conversationId: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  turnCount: number;
  confidence: number;
  topics: Array<{ topicId: string; name: string; covered: boolean; depth: number }>;
  partialExtractions: Record<string, unknown>;
}

// ============================================
// Traditional Form Component
// ============================================

function TraditionalForm({
  onSubmit,
  onFieldInteraction,
}: {
  onSubmit: (data: Record<string, string>) => void;
  onFieldInteraction: () => void;
}) {
  const [formData, setFormData] = useState({ fullName: '', email: '', company: '', interest: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    onFieldInteraction();
    if (touched[field]) validateField(field, value);
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field as keyof typeof formData]);
  };

  const validateField = (field: string, value: string) => {
    let error = '';
    if (field === 'fullName' && !value.trim()) error = 'Required';
    if (field === 'email') {
      if (!value.trim()) error = 'Required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Invalid email';
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameValid = validateField('fullName', formData.fullName);
    const emailValid = validateField('email', formData.email);
    setTouched({ fullName: true, email: true, company: true, interest: true });
    if (nameValid && emailValid) onSubmit(formData);
  };

  const isValid = formData.fullName.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Article sx={{ color: 'text.secondary' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Traditional Form</Typography>
      </Box>

      <TextField
        fullWidth
        label="Full Name *"
        value={formData.fullName}
        onChange={(e) => handleChange('fullName', e.target.value)}
        onBlur={() => handleBlur('fullName')}
        error={touched.fullName && !!errors.fullName}
        helperText={touched.fullName && errors.fullName}
        size="small"
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        label="Email *"
        value={formData.email}
        onChange={(e) => handleChange('email', e.target.value)}
        onBlur={() => handleBlur('email')}
        error={touched.email && !!errors.email}
        helperText={touched.email && errors.email}
        size="small"
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        label="Company"
        value={formData.company}
        onChange={(e) => handleChange('company', e.target.value)}
        size="small"
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        label="What brings you here?"
        value={formData.interest}
        onChange={(e) => handleChange('interest', e.target.value)}
        multiline
        rows={2}
        size="small"
        sx={{ mb: 2 }}
      />
      <Button type="submit" variant="contained" fullWidth disabled={!isValid} sx={{ bgcolor: 'grey.600' }}>
        Submit
      </Button>
    </Box>
  );
}

// ============================================
// Chat Component
// ============================================

function ChatForm({
  config,
  onExtraction,
  onComplete,
  onInteraction,
}: {
  config: ConversationalFormConfig;
  onExtraction: (data: Record<string, unknown>) => void;
  onComplete: (data: Record<string, unknown>, state: ConversationState) => void;
  onInteraction: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<ConversationState>({
    conversationId: `demo_${Date.now()}`,
    messages: [],
    turnCount: 0,
    confidence: 0,
    topics: config.topics.map((t) => ({ topicId: t.id, name: t.name, covered: false, depth: 0 })),
    partialExtractions: {},
  });
  const [showComplete, setShowComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'd love to get to know you. What's your name?",
      timestamp: new Date(),
    }]);
  }, []);

  // Only auto-scroll if user is already at bottom
  useEffect(() => {
    if (shouldAutoScroll.current && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // If user is within 100px of bottom, enable auto-scroll
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    onInteraction();
    shouldAutoScroll.current = true; // Enable auto-scroll when user sends a message

    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', content: input.trim(), timestamp: new Date() };
    const assistantId = `a_${Date.now()}`;

    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '', timestamp: new Date(), isStreaming: true }]);
    setInput('');
    setIsStreaming(true);
    setError(null);

    try {
      const res = await fetch('/api/demo/conversational-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.trim(), state, config }),
      });

      if (!res.ok) throw new Error(`Error: ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === 'chunk') {
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: m.content + evt.content } : m));
            } else if (evt.type === 'extraction_update' && evt.data) {
              onExtraction(evt.data);
              setState((prev) => ({ ...prev, partialExtractions: { ...prev.partialExtractions, ...evt.data } }));
            } else if (evt.type === 'state_update' && evt.state) {
              setState((prev) => ({ ...prev, ...evt.state, partialExtractions: evt.state.partialExtractions || prev.partialExtractions }));
            } else if (evt.type === 'completion_check' && evt.shouldComplete) {
              setShowComplete(true);
            } else if (evt.type === 'complete') {
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m));
            } else if (evt.type === 'error') {
              setError(evt.error);
            }
          } catch {}
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <Box sx={{ border: '1px solid', borderColor: alpha('#00ED64', 0.3), borderRadius: 2, bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', height: 420 }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#00ED64', 0.05) }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <AutoAwesome sx={{ color: '#00ED64', fontSize: 20 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Conversational Form</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {state.topics.map((t) => (
            <Chip
              key={t.topicId}
              icon={t.covered ? <CheckCircle sx={{ fontSize: 12 }} /> : <RadioButtonUnchecked sx={{ fontSize: 12 }} />}
              label={t.name}
              size="small"
              sx={{ height: 20, fontSize: '0.7rem', bgcolor: t.covered ? alpha('#00ED64', 0.2) : alpha('#fff', 0.05), '& .MuiChip-icon': { color: t.covered ? '#00ED64' : 'text.disabled' } }}
            />
          ))}
        </Box>
      </Box>

      {/* Messages */}
      <Box ref={messagesContainerRef} onScroll={handleScroll} sx={{ flex: 1, overflowY: 'auto', p: 2, scrollBehavior: 'auto' }}>
        {messages.map((m) => (
          <Box key={m.id} sx={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', mb: 1 }}>
            <Box sx={{ maxWidth: '80%', p: 1.5, borderRadius: 2, bgcolor: m.role === 'user' ? '#00ED64' : alpha('#fff', 0.05), color: m.role === 'user' ? '#001E2B' : 'text.primary' }}>
              <Typography variant="body2">{m.content}{m.isStreaming && <Box component="span" sx={{ display: 'inline-block', width: 6, height: 12, bgcolor: 'text.primary', ml: 0.5, animation: 'blink 1s infinite', '@keyframes blink': { '50%': { opacity: 0 } } }} />}</Typography>
            </Box>
          </Box>
        ))}
        {showComplete && (
          <Alert severity="success" action={<Button size="small" onClick={() => { onComplete(state.partialExtractions, state); setShowComplete(false); }}>Save</Button>}>
            Ready to save!
          </Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Type naturally..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
          disabled={isStreaming}
        />
        <IconButton onClick={sendMessage} disabled={!input.trim() || isStreaming} sx={{ bgcolor: '#00ED64', color: '#001E2B', '&:hover': { bgcolor: '#00CC55' } }}>
          {isStreaming ? <CircularProgress size={20} /> : <Send />}
        </IconButton>
      </Box>
    </Box>
  );
}

// ============================================
// Main Page
// ============================================

export default function ConversationalFormDemo() {
  const [started, setStarted] = useState(false);
  const [tradData, setTradData] = useState<Record<string, string> | null>(null);
  const [tradSubmitted, setTradSubmitted] = useState(false);
  const [tradInteractions, setTradInteractions] = useState(0);
  const [convData, setConvData] = useState<Record<string, unknown> | null>(null);
  const [convSubmitted, setConvSubmitted] = useState(false);
  const [convInteractions, setConvInteractions] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const saveTrad = async (data: Record<string, string>) => {
    setTradData(data);
    setTradSubmitted(true);
    await fetch('/api/demo/save-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, conversationId: `trad_${Date.now()}`, transcript: [], metadata: { method: 'traditional' } }),
    });
    setSnackbar({ open: true, message: 'Traditional form saved!' });
  };

  const saveConv = useCallback(async (data: Record<string, unknown>, state: ConversationState) => {
    setConvData(data);
    setConvSubmitted(true);
    await fetch('/api/demo/save-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, conversationId: state.conversationId, transcript: state.messages, metadata: { method: 'conversational' } }),
    });
    setSnackbar({ open: true, message: 'Conversational data saved!' });
  }, []);

  const reset = () => {
    setStarted(false);
    setTradData(null);
    setTradSubmitted(false);
    setTradInteractions(0);
    setConvData(null);
    setConvSubmitted(false);
    setConvInteractions(0);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>Forms, Reimagined</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>See the difference between traditional forms and AI-powered conversation</Typography>
          {!started && (
            <Button variant="contained" size="large" startIcon={<PlayArrow />} onClick={() => setStarted(true)} sx={{ bgcolor: '#00ED64', color: '#001E2B', '&:hover': { bgcolor: '#00CC55' } }}>
              Start the Comparison
            </Button>
          )}
        </Box>

        {started && (
          <>
            {/* Side by Side */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 4 }}>
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>THE OLD WAY</Typography>
                <TraditionalForm onSubmit={saveTrad} onFieldInteraction={() => setTradInteractions((n) => n + 1)} />
                {tradSubmitted && tradData && (
                  <Paper sx={{ mt: 2, p: 2, bgcolor: alpha('#fff', 0.02) }}>
                    <Typography variant="caption" color="text.secondary">Saved:</Typography>
                    <Box component="pre" sx={{ fontSize: '0.7rem', m: 0, mt: 1 }}>{JSON.stringify(tradData, null, 2)}</Box>
                  </Paper>
                )}
              </Box>
              <Box>
                <Typography variant="overline" sx={{ color: '#00ED64', mb: 1, display: 'block' }}>THE NEW WAY</Typography>
                <ChatForm config={DEMO_CONFIG} onExtraction={(d) => setConvData((p) => ({ ...p, ...d }))} onComplete={saveConv} onInteraction={() => setConvInteractions((n) => n + 1)} />
                {convData && Object.keys(convData).length > 0 && (
                  <Paper sx={{ mt: 2, p: 2, bgcolor: alpha('#00ED64', 0.05), border: '1px solid', borderColor: alpha('#00ED64', 0.2) }}>
                    <Typography variant="caption" sx={{ color: '#00ED64' }}>Extracted:</Typography>
                    <Box component="pre" sx={{ fontSize: '0.7rem', m: 0, mt: 1 }}>{JSON.stringify(convData, null, 2)}</Box>
                  </Paper>
                )}
              </Box>
            </Box>

            {/* Stats */}
            <Paper sx={{ p: 3, mb: 4, bgcolor: 'background.paper' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, textAlign: 'center' }}>The Difference</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <TouchApp sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.secondary' }}>{tradInteractions}</Typography>
                  <Typography variant="body2" color="text.secondary">Form interactions</Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#00ED64' }}>{convInteractions}</Typography>
                  <Typography variant="body2" color="text.secondary">Chat messages</Typography>
                </Box>
                <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Psychology sx={{ fontSize: 32, color: '#00ED64' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>User Experience</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}><strong>Traditional:</strong> Fill boxes, follow rules, fix errors</Typography>
                  <Typography variant="body2" sx={{ color: '#00AA44' }}><strong>Conversational:</strong> Just talk naturally</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Storage sx={{ fontSize: 32, color: '#00684A', mb: 1 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Same MongoDB Output</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Both produce identical structured data</Typography>
                  <Chip label="fullName, email, company, interest" size="small" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }} />
                </Box>
              </Box>
            </Paper>

            {/* Reset */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Button variant="outlined" startIcon={<Refresh />} onClick={reset}>Start Over</Button>
            </Box>

            {/* Benefits */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Why Conversational Forms?</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 3 }}>
                {[
                  { icon: <Psychology sx={{ fontSize: 28 }} />, title: 'Natural Interaction', desc: 'Users talk instead of filling boxes' },
                  { icon: <AutoAwesome sx={{ fontSize: 28 }} />, title: 'AI Extraction', desc: 'Automatically structures data' },
                  { icon: <Storage sx={{ fontSize: 28 }} />, title: 'Same Output', desc: 'Clean data in MongoDB' },
                ].map((b, i) => (
                  <Box key={i}>
                    <Box sx={{ color: '#00ED64', mb: 1 }}>{b.icon}</Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{b.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{b.desc}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* FAQ Section */}
            <FAQSection />
          </>
        )}

        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Typography variant="body2" color="text.secondary">Powered by NetPad &bull; Built for MongoDB</Typography>
        </Box>
      </Container>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity="success">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
