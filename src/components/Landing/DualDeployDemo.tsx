/**
 * Dual Deploy Demo Component
 * 
 * Shows the same form in two modes side-by-side:
 * - Traditional form UI
 * - AI Conversational chat UI
 * 
 * This demonstrates NetPad's "Build once, deploy twice" value proposition.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Rating,
  Paper,
  alpha,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Grow,
  Fade,
} from '@mui/material';
import {
  Send,
  Description,
  ChatBubble,
  SwapHoriz,
  CheckCircle,
  AutoAwesome,
} from '@mui/icons-material';

// Demo form schema - same data structure for both modes
const DEMO_FORM = {
  name: 'Customer Feedback',
  fields: [
    { path: 'name', label: 'Your Name', type: 'text', required: true },
    { path: 'email', label: 'Email Address', type: 'email', required: true },
    { path: 'rating', label: 'How would you rate your experience?', type: 'rating', required: true },
    { path: 'feedback', label: 'Tell us more about your experience', type: 'textarea', required: false },
  ],
};

// Chat conversation flow
const CHAT_FLOW = [
  { role: 'assistant', content: "Hi! 👋 I'd love to hear about your experience. What's your name?" },
  { role: 'user', content: '', placeholder: 'Type your name...' },
  { role: 'assistant', content: "Great to meet you, {name}! What's the best email to reach you at?" },
  { role: 'user', content: '', placeholder: 'Enter your email...' },
  { role: 'assistant', content: "Thanks! On a scale of 1-5 stars, how would you rate your experience with us?" },
  { role: 'user', content: '', placeholder: 'Rate 1-5...' },
  { role: 'assistant', content: "A {rating}-star rating — {ratingResponse}! Would you like to share any additional feedback? (or type 'skip' to finish)" },
  { role: 'user', content: '', placeholder: "Share your thoughts or type 'skip'..." },
  { role: 'assistant', content: "Thank you so much for your feedback, {name}! 🎉 We really appreciate you taking the time. Your response has been recorded." },
];

const getRatingResponse = (rating: number) => {
  if (rating >= 5) return "that's wonderful to hear";
  if (rating >= 4) return "we're glad you had a good experience";
  if (rating >= 3) return "thanks for being honest";
  return "we're sorry to hear that and will work to improve";
};

interface FormData {
  name: string;
  email: string;
  rating: number;
  feedback: string;
}

/**
 * Traditional Form View
 */
function TraditionalForm({ 
  data, 
  onChange, 
  onSubmit,
  submitted 
}: { 
  data: FormData; 
  onChange: (field: keyof FormData, value: any) => void;
  onSubmit: () => void;
  submitted: boolean;
}) {
  if (submitted) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, minHeight: 340, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <CheckCircle sx={{ fontSize: 48, color: '#00ED64', mb: 2 }} />
        <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
          Thank you, {data.name}!
        </Typography>
        <Typography variant="body2" sx={{ color: alpha('#fff', 0.7) }}>
          Your feedback has been submitted.
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, minHeight: 340 }}>
      <TextField
        label="Your Name"
        value={data.name}
        onChange={(e) => onChange('name', e.target.value)}
        required
        fullWidth
        size="small"
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: alpha('#fff', 0.05),
            '& fieldset': { borderColor: alpha('#fff', 0.2) },
            '&:hover fieldset': { borderColor: alpha('#fff', 0.3) },
            '&.Mui-focused fieldset': { borderColor: '#00ED64' },
          },
          '& .MuiInputLabel-root': { color: alpha('#fff', 0.7) },
          '& .MuiInputBase-input': { color: '#fff' },
        }}
      />
      
      <TextField
        label="Email Address"
        type="email"
        value={data.email}
        onChange={(e) => onChange('email', e.target.value)}
        required
        fullWidth
        size="small"
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: alpha('#fff', 0.05),
            '& fieldset': { borderColor: alpha('#fff', 0.2) },
            '&:hover fieldset': { borderColor: alpha('#fff', 0.3) },
            '&.Mui-focused fieldset': { borderColor: '#00ED64' },
          },
          '& .MuiInputLabel-root': { color: alpha('#fff', 0.7) },
          '& .MuiInputBase-input': { color: '#fff' },
        }}
      />
      
      <Box>
        <Typography variant="body2" sx={{ color: alpha('#fff', 0.7), mb: 1 }}>
          How would you rate your experience? *
        </Typography>
        <Rating
          value={data.rating}
          onChange={(_, value) => onChange('rating', value || 0)}
          size="large"
          sx={{
            '& .MuiRating-iconFilled': { color: '#00ED64' },
            '& .MuiRating-iconEmpty': { color: alpha('#fff', 0.3) },
          }}
        />
      </Box>
      
      <TextField
        label="Additional Feedback (optional)"
        value={data.feedback}
        onChange={(e) => onChange('feedback', e.target.value)}
        multiline
        rows={3}
        fullWidth
        size="small"
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: alpha('#fff', 0.05),
            '& fieldset': { borderColor: alpha('#fff', 0.2) },
            '&:hover fieldset': { borderColor: alpha('#fff', 0.3) },
            '&.Mui-focused fieldset': { borderColor: '#00ED64' },
          },
          '& .MuiInputLabel-root': { color: alpha('#fff', 0.7) },
          '& .MuiInputBase-input': { color: '#fff' },
        }}
      />
      
      <Button
        variant="contained"
        onClick={onSubmit}
        disabled={!data.name || !data.email || !data.rating}
        sx={{
          bgcolor: '#00ED64',
          color: '#001E2B',
          fontWeight: 600,
          '&:hover': { bgcolor: '#00c853' },
          '&.Mui-disabled': { bgcolor: alpha('#fff', 0.1), color: alpha('#fff', 0.3) },
        }}
      >
        Submit Feedback
      </Button>
    </Box>
  );
}

/**
 * Chat Message Component
 */
function ChatMessage({ role, content, isTyping }: { role: 'user' | 'assistant'; content: string; isTyping?: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: role === 'user' ? 'flex-end' : 'flex-start',
        mb: 1.5,
      }}
    >
      <Box
        sx={{
          maxWidth: '85%',
          bgcolor: role === 'user' ? '#00ED64' : alpha('#fff', 0.1),
          color: role === 'user' ? '#001E2B' : '#fff',
          borderRadius: 2,
          px: 2,
          py: 1,
          borderBottomRightRadius: role === 'user' ? 4 : 16,
          borderBottomLeftRadius: role === 'user' ? 16 : 4,
        }}
      >
        <Typography variant="body2">
          {isTyping ? (
            <Box component="span" sx={{ display: 'inline-flex', gap: 0.5 }}>
              <span className="typing-dot">●</span>
              <span className="typing-dot" style={{ animationDelay: '0.2s' }}>●</span>
              <span className="typing-dot" style={{ animationDelay: '0.4s' }}>●</span>
            </Box>
          ) : content}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Conversational Chat View
 */
function ConversationalChat({ 
  data, 
  onChange,
  submitted 
}: { 
  data: FormData; 
  onChange: (field: keyof FormData, value: any) => void;
  submitted: boolean;
}) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with first message
  useEffect(() => {
    if (messages.length === 0) {
      setIsTyping(true);
      setTimeout(() => {
        setMessages([{ role: 'assistant', content: CHAT_FLOW[0].content }]);
        setIsTyping(false);
        setCurrentStep(1);
      }, 800);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const processMessage = (content: string, stepData: FormData): string => {
    return content
      .replace('{name}', stepData.name || 'friend')
      .replace('{rating}', String(stepData.rating || ''))
      .replace('{ratingResponse}', getRatingResponse(stepData.rating || 3));
  };

  const handleSend = () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    // Update form data based on current step
    let updatedData = { ...data };
    if (currentStep === 1) {
      updatedData.name = userMessage;
      onChange('name', userMessage);
    } else if (currentStep === 3) {
      updatedData.email = userMessage;
      onChange('email', userMessage);
    } else if (currentStep === 5) {
      const rating = parseInt(userMessage) || 5;
      updatedData.rating = Math.min(5, Math.max(1, rating));
      onChange('rating', updatedData.rating);
    } else if (currentStep === 7) {
      if (userMessage.toLowerCase() !== 'skip') {
        updatedData.feedback = userMessage;
        onChange('feedback', userMessage);
      }
    }

    // Show typing indicator then respond
    setIsTyping(true);
    setTimeout(() => {
      const nextStep = currentStep + 1;
      if (nextStep < CHAT_FLOW.length) {
        const nextMessage = processMessage(CHAT_FLOW[nextStep].content, updatedData);
        setMessages(prev => [...prev, { role: 'assistant', content: nextMessage }]);
        setCurrentStep(nextStep + 1);
      }
      setIsTyping(false);
      inputRef.current?.focus();
    }, 600 + Math.random() * 400);
  };

  const isComplete = currentStep >= CHAT_FLOW.length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat messages */}
      <Box 
        sx={{ 
          flex: 1, 
          overflowY: 'auto', 
          px: 1,
          py: 2,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.map((msg, idx) => (
          <Grow in key={idx} timeout={300}>
            <div>
              <ChatMessage role={msg.role} content={msg.content} />
            </div>
          </Grow>
        ))}
        {isTyping && (
          <ChatMessage role="assistant" content="" isTyping />
        )}
        <div ref={chatEndRef} />
      </Box>

      {/* Input area */}
      {!isComplete && (
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 1, 
            p: 1.5, 
            borderTop: '1px solid',
            borderColor: alpha('#fff', 0.1),
          }}
        >
          <TextField
            inputRef={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={CHAT_FLOW[currentStep]?.placeholder || 'Type a message...'}
            fullWidth
            size="small"
            disabled={isTyping}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: alpha('#fff', 0.05),
                '& fieldset': { borderColor: alpha('#fff', 0.2) },
                '&:hover fieldset': { borderColor: alpha('#fff', 0.3) },
                '&.Mui-focused fieldset': { borderColor: '#00ED64' },
              },
              '& .MuiInputBase-input': { color: '#fff', fontSize: '0.875rem' },
            }}
          />
          <IconButton 
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            sx={{ 
              bgcolor: '#00ED64', 
              color: '#001E2B',
              '&:hover': { bgcolor: '#00c853' },
              '&.Mui-disabled': { bgcolor: alpha('#fff', 0.1), color: alpha('#fff', 0.3) },
            }}
          >
            <Send fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Typing animation styles */}
      <style jsx global>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
        .typing-dot {
          display: inline-block;
          animation: typingBounce 1s infinite;
          font-size: 8px;
        }
      `}</style>
    </Box>
  );
}

/**
 * Data Summary Sidebar
 */
function DataSummary({ data }: { data: FormData }) {
  const fields = [
    { label: 'Name', value: data.name },
    { label: 'Email', value: data.email },
    { label: 'Rating', value: data.rating ? `${data.rating}/5 ⭐` : '' },
    { label: 'Feedback', value: data.feedback },
  ];

  const filledCount = fields.filter(f => f.value).length;

  return (
    <Box 
      sx={{ 
        bgcolor: alpha('#001E2B', 0.5),
        borderRadius: 2,
        p: 2,
        border: '1px solid',
        borderColor: alpha('#00ED64', 0.2),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AutoAwesome sx={{ fontSize: 16, color: '#00ED64' }} />
        <Typography variant="caption" sx={{ color: '#00ED64', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
          Same Data Captured
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {fields.map((field) => (
          <Box key={field.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), minWidth: 60 }}>
              {field.label}:
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: field.value ? '#fff' : alpha('#fff', 0.3),
                fontWeight: field.value ? 500 : 400,
                textAlign: 'right',
                flex: 1,
                ml: 1,
                fontStyle: field.value ? 'normal' : 'italic',
              }}
            >
              {field.value || 'waiting...'}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: alpha('#fff', 0.1) }}>
        <Typography variant="caption" sx={{ color: alpha('#fff', 0.5) }}>
          {filledCount}/4 fields captured • Same schema, different UX
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Main Dual Deploy Demo Component
 */
export function DualDeployDemo() {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<FormData>({ name: '', email: '', rating: 0, feedback: '' });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [chatKey, setChatKey] = useState(0); // For resetting chat

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFormData({ name: '', email: '', rating: 0, feedback: '' });
    setFormSubmitted(false);
    setChatKey(prev => prev + 1);
  };

  return (
    <Box sx={{ py: 8 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Chip 
          icon={<SwapHoriz />}
          label="Build Once, Deploy Twice"
          sx={{ 
            bgcolor: alpha('#00ED64', 0.15),
            color: '#00ED64',
            fontWeight: 600,
            mb: 2,
          }}
        />
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', mb: 1 }}>
          Same Form. Two Experiences.
        </Typography>
        <Typography variant="body1" sx={{ color: alpha('#fff', 0.7), maxWidth: 600, mx: 'auto' }}>
          Watch how the same form schema powers both a traditional form UI and an AI-powered conversational interface. 
          Try both — the data syncs in real-time.
        </Typography>
      </Box>

      {/* Demo Container */}
      <Box 
        sx={{ 
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 250px' },
          gap: 3,
          maxWidth: 1100,
          mx: 'auto',
        }}
      >
        {/* Traditional Form */}
        <Paper
          sx={{
            bgcolor: alpha('#001E2B', 0.8),
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: activeTab === 0 ? '#00ED64' : alpha('#fff', 0.1),
            transition: 'border-color 0.2s',
            minHeight: 400,
          }}
        >
          <Box 
            sx={{ 
              px: 2, 
              py: 1.5, 
              bgcolor: alpha('#fff', 0.05),
              borderBottom: '1px solid',
              borderColor: alpha('#fff', 0.1),
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Description sx={{ fontSize: 18, color: '#00ED64' }} />
            <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600 }}>
              Traditional Form
            </Typography>
          </Box>
          <Box sx={{ p: 2.5 }}>
            <TraditionalForm 
              data={formData} 
              onChange={handleChange}
              onSubmit={() => setFormSubmitted(true)}
              submitted={formSubmitted}
            />
          </Box>
        </Paper>

        {/* Conversational Chat */}
        <Paper
          sx={{
            bgcolor: alpha('#001E2B', 0.8),
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: activeTab === 1 ? '#00ED64' : alpha('#fff', 0.1),
            transition: 'border-color 0.2s',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 400,
          }}
        >
          <Box 
            sx={{ 
              px: 2, 
              py: 1.5, 
              bgcolor: alpha('#fff', 0.05),
              borderBottom: '1px solid',
              borderColor: alpha('#fff', 0.1),
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <ChatBubble sx={{ fontSize: 18, color: '#E91E63' }} />
            <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600 }}>
              AI Conversational
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <ConversationalChat 
              key={chatKey}
              data={formData} 
              onChange={handleChange}
              submitted={formSubmitted}
            />
          </Box>
        </Paper>

        {/* Data Summary */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <DataSummary data={formData} />
          
          <Button
            variant="outlined"
            onClick={handleReset}
            fullWidth
            sx={{ 
              mt: 2,
              borderColor: alpha('#fff', 0.2),
              color: alpha('#fff', 0.7),
              '&:hover': { borderColor: alpha('#fff', 0.4), bgcolor: alpha('#fff', 0.05) },
            }}
          >
            Reset Demo
          </Button>
        </Box>
      </Box>

      {/* CTA */}
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="body2" sx={{ color: alpha('#fff', 0.5), mb: 2 }}>
          One schema. Two deployment modes. Zero extra work.
        </Typography>
        <Button
          variant="contained"
          href="/builder"
          sx={{
            bgcolor: '#00ED64',
            color: '#001E2B',
            fontWeight: 600,
            px: 4,
            '&:hover': { bgcolor: '#00c853' },
          }}
        >
          Build Your Own →
        </Button>
      </Box>
    </Box>
  );
}

export default DualDeployDemo;
