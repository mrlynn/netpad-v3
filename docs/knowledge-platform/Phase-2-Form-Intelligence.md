# Phase 2 Execution Plan: Form Intelligence

**Timeline**: Mar 24 - May 9 (7 weeks)
**Status**: Follows Phase 1
**Goal**: Add rules and conversation paths to create intelligent, adaptive forms

---

## Overview

Phase 2 transforms conversational forms from simple data collection to intelligent assistants by adding:

1. **Rules Engine** - "If [trigger], then [action]" logic
2. **Conversation Paths** - Guided question flows for complex topics
3. **Enhanced Conversation Engine** - Integrates rules + paths + knowledge

---

## Week-by-Week Breakdown

### Week 1-3: Rules Engine (Mar 24 - Apr 11)

#### Week 1: Rules Core (Mar 24-28)

**Task 1.1: Rules Schema Design**

**File to create**: `src/types/form-rules.ts`

```typescript
export interface FormRule {
  _id: ObjectId;
  formId: string;
  organizationId: string;

  // Rule configuration
  name: string;
  description?: string;
  priority: number;            // 1-100, higher = evaluated first
  enabled: boolean;

  // Trigger (when to fire this rule)
  trigger: {
    type: 'keyword_detected' | 'field_value' | 'sentiment' | 'confidence_low' | 'always';
    config: KeywordTriggerConfig | FieldValueTriggerConfig | SentimentTriggerConfig | ConfidenceTriggerConfig;
  };

  // Actions (what to do when triggered)
  actions: RuleAction[];

  // Analytics
  stats: {
    timesTriggered: number;
    lastTriggered?: Date;
    avgExecutionTimeMs: number;
  };

  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Trigger configs
export interface KeywordTriggerConfig {
  keywords: string[];
  caseSensitive?: boolean;
  matchType?: 'any' | 'all';    // Match any keyword or all keywords
}

export interface FieldValueTriggerConfig {
  field: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'regex';
  value: any;
}

export interface SentimentTriggerConfig {
  threshold: number;            // -1 to 1
  direction: 'below' | 'above';
}

export interface ConfidenceTriggerConfig {
  threshold: number;            // 0 to 1
}

// Action types
export type RuleAction =
  | InformAction
  | WarnAction
  | SuggestValueAction
  | SetFieldAction
  | RouteAction
  | EscalateAction;

export interface InformAction {
  type: 'inform';
  message: string;
}

export interface WarnAction {
  type: 'warn';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SuggestValueAction {
  type: 'suggest_value';
  fieldId: string;
  value: any;
  message?: string;
}

export interface SetFieldAction {
  type: 'set_field';
  fieldId: string;
  value: any;
  silent?: boolean;             // Don't notify user
}

export interface RouteAction {
  type: 'route';
  destination: string;          // Workflow step ID or form section
  message?: string;
}

export interface EscalateAction {
  type: 'escalate';
  escalationType: 'human' | 'form' | 'workflow';
  reason: string;
  notifyTeam?: boolean;
}
```

**Acceptance Criteria**:
- [ ] Complete TypeScript types
- [ ] Schema supports 5+ trigger types
- [ ] Schema supports 6+ action types
- [ ] All types exported

---

**Task 1.2: Rules Storage & API**

**Files to create**:
- `src/lib/rules/storage.ts` - CRUD operations
- `src/app/api/forms/[formId]/rules/route.ts` - List/Create rules
- `src/app/api/forms/[formId]/rules/[ruleId]/route.ts` - Get/Update/Delete rule

**Acceptance Criteria**:
- [ ] Rules collection created with indexes
- [ ] CRUD APIs functional
- [ ] Rules sorted by priority
- [ ] Only enabled rules returned

---

**Task 1.3: Rule Evaluation Engine**

**File to create**: `src/lib/rules/evaluator.ts`

```typescript
export interface EvaluationContext {
  userMessage: string;
  formData: Record<string, any>;
  conversationHistory: Message[];
  sentiment?: number;          // -1 to 1
  confidence?: number;         // 0 to 1
}

export interface EvaluationResult {
  rule: FormRule;
  triggered: boolean;
  actions: RuleAction[];
  executionTimeMs: number;
}

export async function evaluateRules(
  formId: string,
  context: EvaluationContext
): Promise<EvaluationResult[]> {
  // 1. Fetch enabled rules sorted by priority
  const rules = await getRules(formId, { enabled: true });

  const results: EvaluationResult[] = [];

  // 2. Evaluate each rule
  for (const rule of rules) {
    const startTime = Date.now();
    const triggered = await evaluateTrigger(rule.trigger, context);
    const executionTime = Date.now() - startTime;

    results.push({
      rule,
      triggered,
      actions: triggered ? rule.actions : [],
      executionTimeMs: executionTime,
    });

    // Update stats
    if (triggered) {
      await updateRuleStats(rule._id, executionTime);
    }
  }

  return results;
}

async function evaluateTrigger(
  trigger: FormRule['trigger'],
  context: EvaluationContext
): Promise<boolean> {
  switch (trigger.type) {
    case 'keyword_detected':
      return evaluateKeywordTrigger(trigger.config as KeywordTriggerConfig, context);

    case 'field_value':
      return evaluateFieldValueTrigger(trigger.config as FieldValueTriggerConfig, context);

    case 'sentiment':
      return evaluateSentimentTrigger(trigger.config as SentimentTriggerConfig, context);

    case 'confidence_low':
      return evaluateConfidenceTrigger(trigger.config as ConfidenceTriggerConfig, context);

    case 'always':
      return true;

    default:
      return false;
  }
}
```

**Acceptance Criteria**:
- [ ] All trigger types implemented
- [ ] Rules evaluated in priority order
- [ ] Execution time tracked
- [ ] Stats updated on trigger

---

#### Week 2: Rules UI (Apr 1-4)

**Task 2.1: Rules List View**

**File to create**: `src/components/Intelligence/RulesList.tsx`

Features:
- List all rules for form
- Show enabled/disabled status
- Priority badges
- Trigger count stats
- Enable/disable toggle
- Delete confirmation

**Acceptance Criteria**:
- [ ] All rules displayed
- [ ] Toggle enable/disable works
- [ ] Delete with confirmation
- [ ] Loading/error states

---

**Task 2.2: Rule Editor**

**File to create**: `src/components/Intelligence/RuleEditor.tsx`

Form sections:
1. Basic info (name, description, priority)
2. Trigger configuration (dynamic based on type)
3. Actions list (add multiple actions)
4. Preview/test

**Acceptance Criteria**:
- [ ] All trigger types configurable
- [ ] All action types configurable
- [ ] Multiple actions per rule
- [ ] Validation on save

---

**Task 2.3: Rule Tester**

**File to create**: `src/components/Intelligence/RuleTester.tsx`

```typescript
export function RuleTester({ rule }: { rule: FormRule }) {
  const [testContext, setTestContext] = useState<Partial<EvaluationContext>>({});
  const [result, setResult] = useState<EvaluationResult | null>(null);

  const runTest = async () => {
    const response = await fetch(`/api/forms/${rule.formId}/rules/${rule._id}/test`, {
      method: 'POST',
      body: JSON.stringify(testContext),
    });
    const data = await response.json();
    setResult(data);
  };

  return (
    <Box>
      <TextField
        label="User Message"
        value={testContext.userMessage || ''}
        onChange={(e) => setTestContext({ ...testContext, userMessage: e.target.value })}
        fullWidth
      />

      {/* Form data inputs */}
      {/* Sentiment slider */}
      {/* Confidence slider */}

      <Button onClick={runTest}>Test Rule</Button>

      {result && (
        <Alert severity={result.triggered ? 'success' : 'info'}>
          {result.triggered ? (
            <>
              Rule triggered! Executing {result.actions.length} action(s).
              <ul>
                {result.actions.map((action, i) => (
                  <li key={i}>{action.type}: {JSON.stringify(action)}</li>
                ))}
              </ul>
            </>
          ) : (
            'Rule did not trigger with this context.'
          )}
        </Alert>
      )}
    </Box>
  );
}
```

**Acceptance Criteria**:
- [ ] Can test rules before saving
- [ ] Shows which actions would execute
- [ ] Displays execution time

---

#### Week 3: Rules Integration (Apr 7-11)

**Task 3.1: Integrate Rules into Conversation Engine**

**File to modify**: `src/lib/conversational/engine.ts`

```typescript
export async function generateConversationalResponse(
  formId: string,
  userMessage: string,
  conversationHistory: Message[]
): Promise<string> {
  // 1. Retrieve knowledge (existing)
  const knowledge = await retrieveKnowledge(formId, userMessage);

  // 2. Evaluate rules (NEW)
  const context: EvaluationContext = {
    userMessage,
    formData: extractFormData(conversationHistory),
    conversationHistory,
    sentiment: await analyzeSentiment(userMessage),
    confidence: await estimateConfidence(conversationHistory),
  };

  const ruleResults = await evaluateRules(formId, context);
  const triggeredRules = ruleResults.filter(r => r.triggered);

  // 3. Assemble system prompt
  const systemPrompt = buildSystemPrompt({
    formFields,
    knowledge,
    triggeredRules,  // NEW: Include triggered rules
  });

  // 4. Generate response
  const response = await callLLM(systemPrompt, conversationHistory);

  // 5. Execute rule actions (NEW)
  await executeRuleActions(triggeredRules);

  return response;
}
```

**Acceptance Criteria**:
- [ ] Rules evaluated on every turn
- [ ] Triggered rules included in system prompt
- [ ] Actions executed after response
- [ ] No performance degradation

---

**Task 3.2: Pre-built Rules for Templates**

Create starter rules for each template:

**IT Help Desk Template**:
1. Password reset detection → Set category, suggest self-service
2. Urgent keywords → Escalate to human
3. Negative sentiment → Notify team

**HR Onboarding Template**:
1. Benefits questions → Route to benefits section
2. PTO policy → Inform about policy document

**Patient Intake Template**:
1. Emergency keywords → Escalate immediately
2. Insurance mention → Request insurance info

**Acceptance Criteria**:
- [ ] 3-5 rules per template
- [ ] Rules improve user experience
- [ ] Rules tested and working

---

### Week 4-6: Conversation Paths (Apr 14 - May 2)

#### Week 4: Paths Core (Apr 14-18)

**Task 4.1: Paths Schema Design**

**File to create**: `src/types/conversation-paths.ts`

```typescript
export interface ConversationPath {
  _id: ObjectId;
  formId: string;
  organizationId: string;

  // Path configuration
  name: string;
  description?: string;
  enabled: boolean;

  // Activation (when to start this path)
  activation: {
    type: 'keyword' | 'semantic' | 'field_value' | 'manual';
    config: PathActivationConfig;
  };

  // Steps (ordered sequence)
  steps: PathStep[];

  // Analytics
  stats: {
    timesActivated: number;
    completionRate: number;      // % of times completed
    averageSteps: number;
    averageDurationMs: number;
    lastActivated?: Date;
  };

  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PathStep =
  | QuestionStep
  | InformStep
  | ConditionalStep;

export interface QuestionStep {
  id: string;
  type: 'question';
  question: string;
  required: boolean;
  expectedType?: 'text' | 'number' | 'date' | 'boolean' | 'choice';
  choices?: string[];

  // Field mapping (extract answer to form field)
  mapping?: {
    fieldId: string;
    extractionHint?: string;    // Help LLM extract correctly
    validator?: string;         // Regex or custom validation
  };
}

export interface InformStep {
  id: string;
  type: 'inform';
  message: string;
  pauseAfter?: number;          // Wait N seconds before continuing
}

export interface ConditionalStep {
  id: string;
  type: 'conditional';
  condition: {
    field: string;               // Field or variable to check
    operator: '==' | '!=' | '>' | '<' | 'contains';
    value: any;
  };
  thenStep: string;              // Step ID to jump to if true
  elseStep?: string;             // Step ID to jump to if false
}

export interface PathActivationConfig {
  // For keyword activation
  keywords?: string[];

  // For semantic activation
  semanticQuery?: string;
  semanticThreshold?: number;    // 0-1

  // For field_value activation
  field?: string;
  operator?: string;
  value?: any;
}

// Path execution state (stored per conversation)
export interface PathExecutionState {
  pathId: string;
  currentStepId: string;
  completedStepIds: string[];
  variables: Record<string, any>;  // Collected data
  startedAt: Date;
  updatedAt: Date;
}
```

**Acceptance Criteria**:
- [ ] Complete TypeScript types
- [ ] Schema supports 3 step types
- [ ] Activation types defined
- [ ] Execution state trackable

---

**Task 4.2: Path Detection & Activation**

**File to create**: `src/lib/paths/detector.ts`

```typescript
export async function detectActivePath(
  formId: string,
  context: {
    userMessage: string;
    formData: Record<string, any>;
  }
): Promise<ConversationPath | null> {
  const paths = await getPaths(formId, { enabled: true });

  for (const path of paths) {
    const shouldActivate = await evaluateActivation(path.activation, context);
    if (shouldActivate) {
      return path;
    }
  }

  return null;
}

async function evaluateActivation(
  activation: ConversationPath['activation'],
  context: any
): Promise<boolean> {
  switch (activation.type) {
    case 'keyword':
      return activation.config.keywords.some(keyword =>
        context.userMessage.toLowerCase().includes(keyword.toLowerCase())
      );

    case 'semantic':
      const embedding = await generateEmbedding(context.userMessage);
      const queryEmbedding = await generateEmbedding(activation.config.semanticQuery);
      const similarity = cosineSimilarity(embedding, queryEmbedding);
      return similarity >= (activation.config.semanticThreshold || 0.7);

    case 'field_value':
      const fieldValue = context.formData[activation.config.field];
      return evaluateCondition(fieldValue, activation.config.operator, activation.config.value);

    case 'manual':
      return false;  // Must be triggered explicitly

    default:
      return false;
  }
}
```

**Acceptance Criteria**:
- [ ] Path detection works for all activation types
- [ ] Semantic activation uses embeddings
- [ ] First matching path wins

---

**Task 4.3: Path Execution Engine**

**File to create**: `src/lib/paths/executor.ts`

```typescript
export async function executePathStep(
  path: ConversationPath,
  state: PathExecutionState,
  userResponse?: string
): Promise<{
  currentStep: PathStep;
  message?: string;
  extractedFields?: Record<string, any>;
  nextStepId?: string;
  completed: boolean;
}> {
  const currentStep = path.steps.find(s => s.id === state.currentStepId);

  if (!currentStep) {
    throw new Error(`Step not found: ${state.currentStepId}`);
  }

  switch (currentStep.type) {
    case 'question':
      return await executeQuestionStep(currentStep, state, userResponse);

    case 'inform':
      return await executeInformStep(currentStep, state);

    case 'conditional':
      return await executeConditionalStep(currentStep, state);

    default:
      throw new Error(`Unknown step type: ${(currentStep as any).type}`);
  }
}

async function executeQuestionStep(
  step: QuestionStep,
  state: PathExecutionState,
  userResponse?: string
): Promise<any> {
  if (!userResponse) {
    // First time asking the question
    return {
      currentStep: step,
      message: step.question,
      completed: false,
    };
  }

  // User has responded - extract field value
  let extractedValue = userResponse;

  if (step.mapping) {
    // Use LLM to extract structured data
    extractedValue = await extractFieldValue(
      userResponse,
      step.expectedType,
      step.mapping.extractionHint
    );

    // Store in form data
    state.variables[step.mapping.fieldId] = extractedValue;
  }

  // Mark step complete
  state.completedStepIds.push(step.id);

  // Find next step
  const currentIndex = path.steps.findIndex(s => s.id === step.id);
  const nextStep = path.steps[currentIndex + 1];

  return {
    currentStep: step,
    extractedFields: step.mapping ? { [step.mapping.fieldId]: extractedValue } : undefined,
    nextStepId: nextStep?.id,
    completed: !nextStep,  // No next step = path completed
  };
}
```

**Acceptance Criteria**:
- [ ] All step types execute correctly
- [ ] Field extraction works
- [ ] State persists between steps
- [ ] Path completion detected

---

#### Week 5: Paths UI (Apr 21-25)

**Task 5.1: Path Editor (Basic)**

**File to create**: `src/components/Intelligence/PathEditor.tsx`

For v1, use a **form-based editor** (not visual):

- Path name/description
- Activation configuration
- Steps list (add/remove/reorder)
- Each step configuration (based on type)
- Save/test

**Acceptance Criteria**:
- [ ] Can create paths via form
- [ ] All step types configurable
- [ ] Steps can be reordered
- [ ] Validation on save

---

**Task 5.2: Path Tester**

**File to create**: `src/components/Intelligence/PathTester.tsx`

Interactive path testing:
- Simulates conversation with path active
- Shows current step
- Shows extracted fields
- Shows completion status

**Acceptance Criteria**:
- [ ] Can test path end-to-end
- [ ] Shows field extraction
- [ ] Shows step progression

---

**Task 5.3: Pre-built Paths for Templates**

Create starter paths:

**IT Help Desk - Hardware Request**:
1. Activation: Keywords ["laptop", "computer", "hardware"]
2. Steps:
   - Question: "What type of hardware do you need?" → `hardwareType`
   - Question: "What's your department?" → `department`
   - Conditional: If laptop, ask "Mac or PC?" → `osPreference`
   - Inform: "Your request will be reviewed by IT within 2 business days."

**Patient Intake - Symptoms Triage**:
1. Activation: Semantic "I'm not feeling well"
2. Steps:
   - Question: "What symptoms are you experiencing?" → `symptoms`
   - Question: "When did symptoms start?" → `onsetDate`
   - Question: "Rate pain 1-10" → `painLevel`
   - Conditional: If painLevel > 7, escalate to urgent

**Acceptance Criteria**:
- [ ] 2-3 paths per template
- [ ] Paths tested and working
- [ ] Paths improve data quality

---

#### Week 6: Integration (Apr 28 - May 2)

**Task 6.1: Integrate Paths into Conversation Engine**

**File to modify**: `src/lib/conversational/engine.ts`

```typescript
export async function generateConversationalResponse(
  formId: string,
  userMessage: string,
  conversationHistory: Message[],
  sessionState: SessionState
): Promise<string> {
  // 1. Check if path is active
  let activePath = sessionState.activePath;

  if (!activePath) {
    // Try to detect path activation
    activePath = await detectActivePath(formId, { userMessage, formData: sessionState.formData });

    if (activePath) {
      // Initialize path execution state
      sessionState.pathState = {
        pathId: activePath._id,
        currentStepId: activePath.steps[0].id,
        completedStepIds: [],
        variables: {},
        startedAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  // 2. If path active, execute current step
  if (activePath && sessionState.pathState) {
    const stepResult = await executePathStep(activePath, sessionState.pathState, userMessage);

    // Update session state
    sessionState.pathState.currentStepId = stepResult.nextStepId;
    sessionState.pathState.updatedAt = new Date();

    if (stepResult.extractedFields) {
      Object.assign(sessionState.formData, stepResult.extractedFields);
    }

    if (stepResult.completed) {
      // Path completed
      sessionState.activePath = null;
      sessionState.pathState = null;
    }

    return stepResult.message || "Let's continue...";
  }

  // 3. Normal conversation flow (knowledge + rules)
  // ... existing logic
}
```

**Acceptance Criteria**:
- [ ] Paths activate on detection
- [ ] Path steps execute in order
- [ ] Path state persists
- [ ] Path completion clears state

---

### Week 7: Polish & Testing (May 5-9)

**Task 7.1: Conversation Analytics**

Add analytics to show:
- Rules triggered per conversation
- Paths activated and completed
- Field extraction accuracy
- Completion rates

**Acceptance Criteria**:
- [ ] Analytics dashboard created
- [ ] Shows rules/paths usage
- [ ] Exportable reports

---

**Task 7.2: Performance Testing**

Test with realistic loads:
- 100 concurrent conversations
- 50+ rules per form
- 10+ paths per form

**Acceptance Criteria**:
- [ ] Response time <2s
- [ ] No memory leaks
- [ ] Graceful degradation

---

**Task 7.3: Documentation**

Create guides:
- "Building Rule-Based Logic"
- "Creating Conversation Paths"
- "Best Practices for Form Intelligence"

**Acceptance Criteria**:
- [ ] Guides published
- [ ] Examples for each feature
- [ ] Video tutorials

---

## Success Metrics for Phase 2

At the end of Phase 2:

### Quantitative
- [ ] 30%+ of conversational forms use ≥1 rule
- [ ] 20%+ of conversational forms use ≥1 path
- [ ] >80% form completion rate (up from baseline)
- [ ] >95% data quality (correct categorization)
- [ ] <2s average response time

### Qualitative
- [ ] Rules improve user experience
- [ ] Paths guide complex flows
- [ ] Reduced support tickets for common questions
- [ ] Positive user feedback

---

## Next: Phase 3

Once Phase 2 is complete, we move to **Phase 3: Knowledge Chatbot** (Chatbot deployment mode).

See [PHASE_3_EXECUTION_PLAN.md](./PHASE_3_EXECUTION_PLAN.md) for details.

---

*Created: January 29, 2026*
