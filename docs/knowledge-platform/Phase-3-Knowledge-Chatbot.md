# Phase 3 Execution Plan: Knowledge Chatbot

**Timeline**: May 12 - Jun 6 (4 weeks)
**Status**: Follows Phase 2
**Goal**: Enable "Build once, deploy three ways" with chatbot deployment mode

---

## Overview

Phase 3 completes the Knowledge Platform vision by adding **chatbot deployment mode**. The same form + knowledge base that powers data collection can now be deployed as a standalone Q&A chatbot.

**The Three Deployment Modes**:

| Mode | Purpose | Primary Goal | Ends When |
|------|---------|--------------|-----------|
| **Traditional Form** | Data entry | Collect structured data | Form submitted → workflow triggers |
| **Conversational Form** | Guided intake | Collect data via conversation | Form complete → workflow triggers |
| **Knowledge Chatbot** | Self-service support | Answer questions | User satisfied OR escalates |

**Key Difference**: Chatbot mode focuses on **answering questions**, not collecting data. Escalation to form is optional.

---

## Week-by-Week Breakdown

### Week 1-2: Chatbot Deployment Mode (May 12-23)

#### Week 1: Configuration & Core (May 12-16)

**Task 1.1: Deployment Configuration Schema**

**File to modify**: `src/types/form.ts`

```typescript
export interface Form {
  // ... existing fields

  deploymentConfig?: {
    // Which modes are enabled
    modes: {
      traditional: boolean;
      conversational: boolean;
      chatbot: boolean;
    };

    // Chatbot-specific configuration
    chatbot?: ChatbotConfig;
  };
}

export interface ChatbotConfig {
  // Persona
  persona: {
    name: string;              // "IT Support Bot"
    greeting: string;          // "Hi! How can I help you today?"
    personality: 'professional' | 'friendly' | 'casual';
    avatar?: string;           // URL or emoji
    tagline?: string;          // "Your 24/7 IT assistant"
  };

  // Behavior
  behavior: {
    primaryFunction: 'answer_questions' | 'guide_users' | 'triage';
    unknownHandling: 'admit' | 'suggest' | 'escalate';
    citeSources: boolean;
    maxTurnsBeforeEscalation?: number;
  };

  // Escalation
  escalation: {
    enabled: boolean;
    triggers: EscalationTrigger[];
    action: 'show_form' | 'create_ticket' | 'notify_team';
    prefillFromConversation: boolean;
    transitionMessage?: string;
  };

  // Appearance (for embed widget)
  appearance?: {
    primaryColor?: string;
    position?: 'bottom-right' | 'bottom-left';
    size?: 'small' | 'medium' | 'large';
    buttonText?: string;
  };
}

export type EscalationTrigger =
  | UserRequestTrigger
  | ConfidenceLowTrigger
  | SentimentNegativeTrigger
  | KeywordTrigger
  | MaxTurnsTrigger;

export interface UserRequestTrigger {
  type: 'user_request';
  keywords?: string[];         // ["talk to human", "agent", "representative"]
}

export interface ConfidenceLowTrigger {
  type: 'confidence_low';
  threshold: number;           // 0-1
}

export interface SentimentNegativeTrigger {
  type: 'sentiment_negative';
  threshold: number;           // -1 to 1
}

export interface KeywordTrigger {
  type: 'keyword';
  keywords: string[];
}

export interface MaxTurnsTrigger {
  type: 'max_turns';
  turns: number;
}
```

**Acceptance Criteria**:
- [ ] Schema added to Form type
- [ ] All config options defined
- [ ] Backward compatible (existing forms unaffected)

---

**Task 1.2: Deploy Tab UI**

**File to create**: `src/components/FormBuilder/DeployTab.tsx`

```typescript
export function DeployTab({ formId }: { formId: string }) {
  const { data: form } = useQuery(['form', formId]);
  const [config, setConfig] = useState(form.deploymentConfig || defaultConfig);

  return (
    <Box>
      <Typography variant="h5">Deployment Modes</Typography>

      {/* Mode Toggles */}
      <Stack spacing={2} sx={{ mt: 3 }}>
        <ModeToggleCard
          title="Traditional Form"
          description="Classic field-based form UI"
          icon={<FormIcon />}
          enabled={config.modes.traditional}
          onToggle={(enabled) => setConfig({ ...config, modes: { ...config.modes, traditional: enabled } })}
        />

        <ModeToggleCard
          title="Conversational Form"
          description="AI-guided data collection via chat"
          icon={<ChatIcon />}
          enabled={config.modes.conversational}
          onToggle={(enabled) => setConfig({ ...config, modes: { ...config.modes, conversational: enabled } })}
        />

        <ModeToggleCard
          title="Knowledge Chatbot"
          description="Self-service Q&A support bot"
          icon={<BotIcon />}
          enabled={config.modes.chatbot}
          onToggle={(enabled) => setConfig({ ...config, modes: { ...config.modes, chatbot: enabled } })}
          onConfigure={() => setShowChatbotConfig(true)}
        />
      </Stack>

      {/* Chatbot Configuration Modal */}
      {showChatbotConfig && (
        <ChatbotConfigModal
          config={config.chatbot}
          onChange={(chatbotConfig) => setConfig({ ...config, chatbot: chatbotConfig })}
          onClose={() => setShowChatbotConfig(false)}
        />
      )}

      {/* Save Button */}
      <Button onClick={saveConfig}>Save Deployment Config</Button>
    </Box>
  );
}
```

**Acceptance Criteria**:
- [ ] Toggle each mode on/off
- [ ] Chatbot config opens modal
- [ ] Config saves to form
- [ ] Preview URLs shown for each enabled mode

---

**Task 1.3: Chatbot Configuration Modal**

**File to create**: `src/components/FormBuilder/ChatbotConfigModal.tsx`

Tabs:
1. **Persona** - Name, greeting, personality, avatar
2. **Behavior** - Primary function, unknown handling, citations
3. **Escalation** - Triggers, action, pre-fill settings
4. **Appearance** - Widget styling (for embed)

**Acceptance Criteria**:
- [ ] All config options editable
- [ ] Preview of persona/greeting
- [ ] Validation on required fields
- [ ] Save updates form

---

#### Week 2: Chatbot Behavior Engine (May 19-23)

**Task 2.1: Chatbot Conversation Mode**

**File to modify**: `src/lib/conversational/engine.ts`

```typescript
export async function generateChatbotResponse(
  formId: string,
  userMessage: string,
  conversationHistory: Message[],
  chatbotConfig: ChatbotConfig
): Promise<{
  message: string;
  sources?: Source[];
  shouldEscalate?: boolean;
  escalationReason?: string;
}> {
  // 1. Retrieve knowledge (documents + FAQs)
  const knowledge = await retrieveKnowledge(formId, userMessage, 'chatbot');

  // 2. Check escalation triggers
  const escalationCheck = await checkEscalationTriggers(
    chatbotConfig.escalation.triggers,
    { userMessage, conversationHistory, knowledge }
  );

  if (escalationCheck.shouldEscalate) {
    return {
      message: chatbotConfig.escalation.transitionMessage || "Let me connect you with someone who can help.",
      shouldEscalate: true,
      escalationReason: escalationCheck.reason,
    };
  }

  // 3. Build system prompt (Q&A focused, NOT data collection)
  const systemPrompt = `
You are ${chatbotConfig.persona.name}, a ${chatbotConfig.persona.personality} assistant.

PRIMARY FUNCTION: ${chatbotConfig.behavior.primaryFunction}

KNOWLEDGE BASE:
${formatKnowledge(knowledge)}

INSTRUCTIONS:
- Answer questions using the knowledge base
${chatbotConfig.behavior.citeSources ? '- Always cite sources when providing information' : ''}
- If you don't know, ${chatbotConfig.behavior.unknownHandling}
- Be ${chatbotConfig.persona.personality} in tone
- Do NOT try to collect form data (you're in Q&A mode, not data collection mode)

CONVERSATION HISTORY:
${formatConversationHistory(conversationHistory)}

USER QUESTION: ${userMessage}
`;

  // 4. Generate response
  const response = await callLLM(systemPrompt);

  // 5. Extract sources (if enabled)
  const sources = chatbotConfig.behavior.citeSources
    ? extractSources(knowledge)
    : undefined;

  return {
    message: response,
    sources,
  };
}
```

**Acceptance Criteria**:
- [ ] Chatbot mode uses Q&A prompt (not data collection)
- [ ] Escalation triggers checked on every turn
- [ ] Sources extracted and returned
- [ ] Unknown handling respected

---

**Task 2.2: Escalation Detection**

**File to create**: `src/lib/chatbot/escalation.ts`

```typescript
export async function checkEscalationTriggers(
  triggers: EscalationTrigger[],
  context: {
    userMessage: string;
    conversationHistory: Message[];
    knowledge: KnowledgeResult[];
  }
): Promise<{
  shouldEscalate: boolean;
  reason?: string;
  triggerId?: string;
}> {
  for (const trigger of triggers) {
    const shouldEscalate = await evaluateEscalationTrigger(trigger, context);

    if (shouldEscalate) {
      return {
        shouldEscalate: true,
        reason: getEscalationReason(trigger),
        triggerId: trigger.type,
      };
    }
  }

  return { shouldEscalate: false };
}

async function evaluateEscalationTrigger(
  trigger: EscalationTrigger,
  context: any
): Promise<boolean> {
  switch (trigger.type) {
    case 'user_request':
      return trigger.keywords.some(keyword =>
        context.userMessage.toLowerCase().includes(keyword.toLowerCase())
      );

    case 'confidence_low':
      const confidence = estimateConfidence(context.knowledge);
      return confidence < trigger.threshold;

    case 'sentiment_negative':
      const sentiment = await analyzeSentiment(context.userMessage);
      return sentiment < trigger.threshold;

    case 'keyword':
      return trigger.keywords.some(keyword =>
        context.userMessage.toLowerCase().includes(keyword.toLowerCase())
      );

    case 'max_turns':
      return context.conversationHistory.length >= trigger.turns * 2; // *2 for user+bot

    default:
      return false;
  }
}
```

**Acceptance Criteria**:
- [ ] All trigger types implemented
- [ ] First matching trigger wins
- [ ] Reason returned for logging

---

**Task 2.3: Conversation → Form Handoff**

**File to create**: `src/lib/chatbot/handoff.ts`

```typescript
export async function handoffToForm(
  conversationHistory: Message[],
  formFields: FormField[],
  prefill: boolean
): Promise<{
  transitionMessage: string;
  prefillData?: Record<string, any>;
  conversationSummary?: string;
}> {
  if (!prefill) {
    return {
      transitionMessage: "Let me gather some information from you.",
    };
  }

  // Use LLM to extract field values from conversation
  const extractionPrompt = `
Extract structured data from this conversation to pre-fill a form.

FORM FIELDS:
${formFields.map(f => `- ${f.id}: ${f.label} (${f.type})`).join('\n')}

CONVERSATION:
${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

Extract as much information as possible. Return as JSON:
{ "fieldId": "extractedValue", ... }
`;

  const extracted = await callLLM(extractionPrompt, { responseFormat: 'json' });

  return {
    transitionMessage: "I've pre-filled some information from our conversation. Please review and complete the form.",
    prefillData: JSON.parse(extracted),
    conversationSummary: summarizeConversation(conversationHistory),
  };
}
```

**Acceptance Criteria**:
- [ ] Fields extracted from conversation
- [ ] Summary generated
- [ ] Pre-fill data validated

---

### Week 3: Chatbot Deployment (May 26-30)

**Task 3.1: Chatbot Standalone Page**

**File to create**: `src/app/chat/[org]/[formSlug]/page.tsx`

```typescript
export default async function ChatbotPage({
  params,
}: {
  params: { org: string; formSlug: string };
}) {
  const form = await getFormBySlug(params.org, params.formSlug);

  if (!form.deploymentConfig?.modes.chatbot) {
    return <NotFound />;
  }

  return (
    <ChatbotInterface
      form={form}
      config={form.deploymentConfig.chatbot!}
    />
  );
}
```

Route: `https://netpad.io/chat/{org}/{formSlug}`

**Acceptance Criteria**:
- [ ] Chatbot accessible at public URL
- [ ] Persona displayed
- [ ] Greeting shown on load
- [ ] Responsive design

---

**Task 3.2: Chatbot Embed Widget**

**File to create**: `public/embed/chatbot-widget.js`

```javascript
(function() {
  const NetPadChatbot = {
    init: function(config) {
      // Required: org, formSlug
      // Optional: position, primaryColor, greeting, buttonText

      const iframe = document.createElement('iframe');
      iframe.src = `https://netpad.io/chat/${config.org}/${config.formSlug}?embed=true`;
      iframe.style.cssText = `
        position: fixed;
        ${config.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
        bottom: 20px;
        width: 400px;
        height: 600px;
        border: none;
        border-radius: 12px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.15);
        z-index: 999999;
        display: none;
      `;

      // Create toggle button
      const button = document.createElement('button');
      button.innerHTML = config.buttonText || '💬';
      button.style.cssText = `
        position: fixed;
        ${config.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
        bottom: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${config.primaryColor || '#0066cc'};
        color: white;
        border: none;
        cursor: pointer;
        font-size: 24px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 999998;
      `;

      button.onclick = () => {
        if (iframe.style.display === 'none') {
          iframe.style.display = 'block';
          button.style.display = 'none';
        }
      };

      // Close button in iframe (via postMessage)
      window.addEventListener('message', (e) => {
        if (e.data === 'chatbot-close') {
          iframe.style.display = 'none';
          button.style.display = 'block';
        }
      });

      document.body.appendChild(iframe);
      document.body.appendChild(button);
    },
  };

  window.NetPadChatbot = NetPadChatbot;
})();
```

**Usage**:
```html
<script src="https://netpad.io/embed/chatbot-widget.js"></script>
<script>
  NetPadChatbot.init({
    org: 'acme-corp',
    formSlug: 'it-support-bot',
    position: 'bottom-right',
    primaryColor: '#0066cc',
    buttonText: 'Need Help?'
  });
</script>
```

**Acceptance Criteria**:
- [ ] Widget loads without conflicts
- [ ] Customizable styling
- [ ] Opens/closes smoothly
- [ ] Mobile responsive

---

**Task 3.3: Chatbot Analytics**

**File to create**: `src/components/Chatbot/ChatbotAnalytics.tsx`

Metrics to track:
- Total conversations
- Average conversation length (turns)
- Resolution rate (% ending without escalation)
- Escalation rate (% escalated to form/human)
- Top questions asked
- Knowledge gaps (queries with no good matches)

**Acceptance Criteria**:
- [ ] Analytics dashboard created
- [ ] Real-time metrics
- [ ] Exportable reports
- [ ] Knowledge gap insights

---

### Week 4: Polish & Launch (Jun 2-6)

**Task 4.1: Chatbot Templates**

Create 3 pre-built chatbot templates:

**IT Support Bot**:
- Persona: "IT Support Bot", professional
- Knowledge: IT policies, common issues, FAQs
- Escalation: Keywords ["urgent", "emergency", "broken"], sentiment < -0.5

**HR Policy Bot**:
- Persona: "HR Assistant", friendly
- Knowledge: HR policies, benefits, PTO
- Escalation: Keywords ["complaint", "issue", "manager"], user request

**Customer Support Bot**:
- Persona: "Support Assistant", helpful
- Knowledge: Product docs, troubleshooting, FAQs
- Escalation: Confidence < 0.6, max 10 turns

**Acceptance Criteria**:
- [ ] 3 templates available
- [ ] Sample knowledge included
- [ ] Escalation configured
- [ ] Tested and working

---

**Task 4.2: Documentation**

Create guides:
- "Deploying a Knowledge Chatbot"
- "Configuring Chatbot Persona & Behavior"
- "Chatbot Escalation Strategies"
- "Embedding Chatbot on Your Website"

**Acceptance Criteria**:
- [ ] Guides published
- [ ] Code examples included
- [ ] Video tutorials

---

**Task 4.3: Launch Preparation**

- [ ] All features tested end-to-end
- [ ] Performance benchmarks met
- [ ] Security review complete
- [ ] Analytics working
- [ ] Documentation complete

---

## Success Metrics for Phase 3

At the end of Phase 3:

### Quantitative
- [ ] 20%+ of forms enable chatbot mode
- [ ] 50%+ question resolution rate (no escalation)
- [ ] 90%+ escalated conversations have context
- [ ] 10+ chatbots deployed by customers
- [ ] <2s average response time

### Qualitative
- [ ] "Build once, deploy three ways" messaging resonates
- [ ] Customers see chatbot as ticket deflection tool
- [ ] Positive feedback on escalation handoff
- [ ] Net new customers for chatbot capability

---

## Deployment Checklist

Before marking Phase 3 complete:

1. **Database**:
   - [ ] Chatbot config stored in forms
   - [ ] Escalation events tracked
   - [ ] Chatbot analytics collection created

2. **APIs**:
   - [ ] Chatbot conversation endpoint
   - [ ] Escalation endpoint
   - [ ] Analytics endpoints

3. **UI**:
   - [ ] Deploy tab functional
   - [ ] Chatbot config modal complete
   - [ ] Standalone chatbot page works
   - [ ] Embed widget tested

4. **Documentation**:
   - [ ] Deployment guides
   - [ ] API docs
   - [ ] Video tutorials

5. **Testing**:
   - [ ] End-to-end chatbot flow
   - [ ] Escalation handoff
   - [ ] Embed widget on test site
   - [ ] Performance under load

---

## Next: Phase 4

Once Phase 3 is complete, we move to **Phase 4: Templates 2.0 & Market Launch**.

This is the final phase where we:
- Update all templates with full intelligence (rules + paths + chatbot mode)
- Create "Build once, deploy three ways" marketing campaign
- Launch on Product Hunt, Hacker News
- Publish case studies

---

## The Complete Vision Realized

After Phase 3, NetPad will offer the **only platform** where:

✅ One form configuration
✅ Three deployment modes
✅ Unified knowledge base
✅ Rules-based intelligence
✅ Conversation paths
✅ MongoDB-native
✅ Open source + cloud

**No competitor has all of this.**

---

*Created: January 29, 2026*
