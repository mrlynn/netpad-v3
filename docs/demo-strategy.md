# NetPad Demo Strategy: Interactive Examples for the 4 Pillars

## Overview
Create easily accessible, interactive demos for each of the 4 NetPad pillars to help new users understand the platform's capabilities without requiring sign-up or account creation.

## Current State Analysis

### Existing Infrastructure
- ✅ Form preview system at `/forms/[formId]/preview`
- ✅ Workflow viewer at `/workflows/view/[workflowSlug]`
- ✅ Data explorer at `/data`
- ✅ Conversational form component (`ConversationalFormChat`)
- ✅ Example forms in `scripts/example-forms/`
- ✅ Example apps in `examples/` directory

### Current Pillar Links
- **COLLECT (Forms)**: Links to `/builder` (requires auth)
- **AUTOMATE (Workflows)**: Links to `/workflows` (requires auth)
- **EXPLORE (Data)**: Links to `/data` (requires auth)
- **ENGAGE (AI & Conversational)**: Links to `/builder` (requires auth)

## Strategy Options

### Option A: Dedicated Demo Pages (Recommended)
Create standalone demo pages that work without authentication, using mock data or demo mode.

**Pros:**
- Fully interactive experience
- No authentication required
- Can showcase real functionality
- Better user engagement

**Cons:**
- Requires more development
- Need to handle demo data/mode
- May need rate limiting for AI features

### Option B: Static Examples with Screenshots/GIFs
Create informational pages with embedded examples, code snippets, and visual demonstrations.

**Pros:**
- Faster to implement
- No backend dependencies
- Easy to maintain
- Works offline

**Cons:**
- Less engaging
- Doesn't show real-time behavior
- Users can't actually "try" it

## Recommended Approach: Hybrid (Option A with Fallbacks)

Create interactive demo pages that:
1. Work without authentication
2. Use demo/mock data
3. Show real functionality
4. Include "Sign up to create your own" CTAs

## Implementation Plan by Pillar

### 1. COLLECT - Forms Demo
**Route:** `/demos/forms` or `/try/forms`

**Features to Showcase:**
- Multi-page wizard with progress indicator
- Various field types (text, dropdown, date, file upload, etc.)
- Conditional logic (show/hide fields)
- Validation (required fields, email format, etc.)
- Nested data structures
- Computed fields

**Implementation:**
- Use existing `employee-onboarding-form.json` as base
- Create demo page that loads form config
- Use `FormRenderer` in demo mode (no actual submission)
- Show success message on "submit" without saving
- Add banner: "This is a demo - Sign up to create your own forms"

**Example Form:** Employee Onboarding (already exists in examples)

---

### 2. AUTOMATE - Workflows Demo
**Route:** `/demos/workflows` or `/try/workflows`

**Features to Showcase:**
- Visual workflow canvas with nodes
- Different node types (trigger, action, condition)
- Workflow execution flow
- Real-time execution visualization

**Implementation:**
- Create a pre-built demo workflow (e.g., "Form Submission → Send Email → Update Database")
- Use `WorkflowEditorCanvas` in read-only or demo mode
- Add "Execute Demo" button that shows execution flow
- Visualize step-by-step execution with highlights
- Show execution logs/results

**Example Workflow:** IT Helpdesk Ticket Processing
- Trigger: Form submission
- Action: Create ticket in database
- Condition: Check priority
- Action: Send notification email
- Action: Update status

---

### 3. EXPLORE - Data Browser Demo
**Route:** `/demos/data` or `/try/data`

**Features to Showcase:**
- Collection browser with tree view
- Document viewing and editing
- Search and filtering
- Data relationships
- Collection statistics

**Implementation:**
- Use mock/demo database with sample collections
- Create demo MongoDB connection (read-only)
- Use existing `DataBrowser` component
- Populate with realistic sample data:
  - `employees` collection
  - `products` collection
  - `orders` collection
- Show linked forms/workflows for each collection

**Sample Collections:**
- `employees` - 50 sample employee records
- `products` - 30 sample products
- `orders` - 100 sample orders with relationships

---

### 4. ENGAGE - Conversational AI Demo
**Route:** `/demos/conversational` or `/try/conversational`

**Features to Showcase:**
- Natural language conversation
- AI-guided data collection
- Topic coverage tracking
- Data extraction from conversation
- Source citations (if RAG enabled)

**Implementation:**
- Create simple conversational form config
- Use `ConversationalFormChat` component
- Use demo mode that doesn't require real API keys
- Show example conversation flow
- Display extracted data at the end
- Add "Try your own" CTA

**Example Use Cases:**
1. **IT Support Request** - Simple ticket creation
2. **Contact Form** - Basic information collection
3. **Event Registration** - Multi-step conversation

---

## Technical Implementation Details

### Demo Mode Infrastructure

#### 1. Demo Data Storage
```typescript
// Create demo database/collections
const DEMO_DATABASE = 'netpad_demo';
const DEMO_COLLECTIONS = {
  employees: [...sampleEmployees],
  products: [...sampleProducts],
  orders: [...sampleOrders],
};
```

#### 2. Demo Form Configuration
- Store demo form configs in `public/demo-forms/` or as static JSON
- Load directly without database lookup
- Mark as `isDemo: true` to prevent actual submissions

#### 3. Demo Workflow Configuration
- Pre-built workflow JSON files
- Execution simulation (no actual API calls)
- Visual execution animation

#### 4. Demo Data Browser
- Read-only connection to demo database
- Sample data seeded on first load
- Clear "Demo Mode" indicators

### Routing Structure

```
/demos
  /forms          → Forms demo page
  /workflows      → Workflows demo page
  /data           → Data browser demo
  /conversational → Conversational AI demo
```

Or use `/try/` prefix:
```
/try/forms
/try/workflows
/try/data
/try/conversational
```

### Landing Page Integration

Update pillar CTAs to link to demo pages:
```typescript
const pillars = [
  {
    id: 'forms',
    href: '/demos/forms',  // Changed from '/builder'
    cta: 'Try Forms Demo',
  },
  // ... etc
];
```

Or add secondary "Try Demo" buttons alongside "Build a Form" buttons.

---

## Step-by-Step Implementation Plan

### Phase 1: Forms Demo (Week 1)
1. ✅ Create `/demos/forms` route
2. ✅ Load employee onboarding form config
3. ✅ Implement demo mode in FormRenderer
4. ✅ Add demo banner and CTAs
5. ✅ Test all form features work in demo mode

### Phase 2: Workflows Demo (Week 1-2)
1. ✅ Create `/demos/workflows` route
2. ✅ Create demo workflow JSON
3. ✅ Implement workflow execution simulation
4. ✅ Add visual execution flow
5. ✅ Test workflow viewer in demo mode

### Phase 3: Data Browser Demo (Week 2)
1. ✅ Create `/demos/data` route
2. ✅ Set up demo database connection
3. ✅ Seed sample collections
4. ✅ Implement read-only data browser
5. ✅ Add collection statistics

### Phase 4: Conversational Demo (Week 2-3)
1. ✅ Create `/demos/conversational` route
2. ✅ Create demo conversational form config
3. ✅ Implement demo mode for AI chat
4. ✅ Add conversation examples
5. ✅ Test data extraction display

### Phase 5: Landing Page Integration (Week 3)
1. ✅ Update pillar CTAs to link to demos
2. ✅ Add "Try Demo" buttons
3. ✅ Add demo section to landing page
4. ✅ Test all links and flows

---

## Design Considerations

### Demo Mode Indicators
- Clear banner: "🎯 Demo Mode - Sign up to create your own"
- Watermark or badge on interactive elements
- Disable actual data persistence
- Show success messages without saving

### User Experience
- Smooth transitions between demo and sign-up
- Clear CTAs: "Create Your Own" buttons
- Show value before asking for sign-up
- Fast loading (optimize demo data)

### Performance
- Lazy load demo components
- Cache demo configurations
- Optimize sample data size
- Use static generation where possible

---

## Sample Data Requirements

### Forms Demo
- Employee onboarding form (already exists)
- Product catalog form (already exists)
- Contact form (simple example)

### Workflows Demo
- IT ticket processing workflow
- Order fulfillment workflow
- Email notification workflow

### Data Browser Demo
- 50 employee records
- 30 product records
- 100 order records
- Relationships between collections

### Conversational Demo
- IT support request config
- Contact form config
- Event registration config

---

## Success Metrics

- **Engagement**: % of landing page visitors who try a demo
- **Conversion**: % of demo users who sign up
- **Time on Demo**: Average time spent in demo pages
- **Feature Discovery**: Which features users interact with most

---

## Next Steps

1. **Decision**: Choose between `/demos/` or `/try/` route prefix
2. **Priority**: Which pillar to implement first? (Recommend: Forms)
3. **Scope**: Full interactive demos or start with simpler versions?
4. **Data**: Use existing examples or create new demo-specific examples?

---

## Questions to Consider

1. Should demos require any authentication, or be completely open?
2. Should we limit demo usage (rate limiting, time limits)?
3. Do we want analytics tracking on demo usage?
4. Should demos work on mobile devices?
5. Do we need demo data to be reset periodically?
6. Should we allow users to "save" their demo work (with sign-up prompt)?
