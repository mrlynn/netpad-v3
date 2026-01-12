# Rethinking Demo Placement: Conversion vs. Education

## Current State Analysis

### Current User Journey
1. **Landing Page Hero**: "Get access" (primary) + "Explore how it works" (secondary)
2. **Four Pillars Section**: Forms pillar → `/demos/forms` with "Try Demo" button
3. **Other Pillars**: Direct links to actual features (workflows, data, builder)

### The Problem
- **Forms pillar** sends users to a demo instead of the builder
- Creates a "demo trap" - users explore instead of creating
- Breaks the momentum for users ready to build
- Other pillars go straight to features, creating inconsistency

## User Psychology

### Two User Types

**Type A: "I'm Ready" Users (60-70%)**
- Know what they want
- Want to start building immediately
- Demos feel like a detour
- **Action**: Should go straight to builder/signup

**Type B: "Show Me First" Users (30-40%)**
- Need to see it work before committing
- Want to understand capabilities
- Demos build confidence
- **Action**: Should have easy access to demos

## Strategy Options

### Option 1: Remove Demos from Primary Flow ⚠️
**Change**: Forms pillar → `/builder` (like other pillars)
**Demos**: Only accessible via footer link or "Explore how it works" page

**Pros:**
- Clear, consistent path to action
- No distractions from conversion
- Forces users to commit or leave

**Cons:**
- Loses Type B users who need proof
- Higher bounce rate for uncertain visitors
- Misses opportunity to build trust

**Best For:** Product with strong brand recognition, low competition

---

### Option 2: Dual CTAs on Pillars ✅ RECOMMENDED
**Change**: Forms pillar has TWO buttons:
- Primary: "Build a Form" → `/builder` (bold, prominent)
- Secondary: "Try Demo" → `/demos/forms` (smaller, text link)

**Pros:**
- Serves both user types
- Clear hierarchy (action > exploration)
- Maintains conversion momentum
- Demos available but not distracting

**Cons:**
- Slightly more complex UI
- Need to ensure primary CTA is obvious

**Best For:** Most products - balances conversion and education

---

### Option 3: Contextual Demos
**Change**: Show demos only when user shows hesitation
- First visit: Direct to builder
- After 30s on landing: Show "Not sure? Try a demo" banner
- On exit intent: Offer demo

**Pros:**
- Smart targeting
- Doesn't distract ready users
- Catches uncertain users at right moment

**Cons:**
- Requires tracking/analytics
- More complex implementation
- May feel manipulative

**Best For:** Products with analytics infrastructure

---

### Option 4: Demos in "Learn More" Section
**Change**: 
- Forms pillar → `/builder` (primary action)
- Add "See Examples" section below pillars
- Demos accessible but not in main flow

**Pros:**
- Clean separation
- Clear conversion path
- Demos for those who seek them

**Cons:**
- Hides demos more
- May miss Type B users who don't scroll

**Best For:** Products with strong value proposition

---

### Option 5: Progressive Disclosure
**Change**:
- Forms pillar → `/builder` (primary)
- On builder page (if not logged in): Show "Try Demo First" option
- Demos accessible from builder onboarding

**Pros:**
- Demos at decision point (signup vs. try)
- Doesn't interrupt landing page flow
- Contextual to user's moment of need

**Cons:**
- Requires user to click through first
- May lose some Type B users earlier

**Best For:** Products where signup is low-friction

---

## Recommended Approach: Option 2 (Dual CTAs)

### Implementation

**Forms Pillar Card:**
```
┌─────────────────────────┐
│  [Icon]                 │
│  COLLECT                │
│  Forms                  │
│  Description...         │
│                         │
│  [Build a Form] ← Primary, bold
│  Try Demo → ← Secondary, text link
└─────────────────────────┘
```

**Benefits:**
1. **Primary action is clear**: Build/Create
2. **Demo available but secondary**: For uncertain users
3. **Consistent with other pillars**: All lead to features
4. **Maintains conversion momentum**: Ready users aren't distracted

### Alternative: Inline Demo Link
Instead of button, make it a subtle text link:
```
[Build a Form]  or  try a demo →
```

---

## Testing Strategy

### A/B Test Options:
1. **Control**: Current (demo as primary)
2. **Variant A**: Dual CTAs (build primary, demo secondary)
3. **Variant B**: Build only, demo in footer

### Metrics to Track:
- **Conversion Rate**: Landing → Signup
- **Time to Signup**: How long before conversion
- **Demo Usage**: % who use demos
- **Bounce Rate**: % who leave without action
- **Return Rate**: % who come back after demo

### Hypothesis:
- **Variant A** will have:
  - Higher conversion rate (ready users don't get distracted)
  - Similar demo usage (uncertain users still find it)
  - Lower time to signup (clearer path)

---

## Alternative: Smart Defaults

### If User is Logged In:
- Forms pillar → `/builder` (they're ready)
- No demo needed

### If User is Not Logged In:
- Forms pillar → Dual CTAs
- Primary: `/builder` (which prompts signup)
- Secondary: `/demos/forms`

This way, returning users get direct access, new users get choice.

---

## Recommendation Summary

**Short Term (Quick Win):**
- Change Forms pillar to dual CTAs
- Primary: "Build a Form" → `/builder`
- Secondary: "Try Demo" → `/demos/forms` (smaller, text link)

**Medium Term (Optimize):**
- A/B test different placements
- Track conversion funnel
- Optimize based on data

**Long Term (Scale):**
- Consider contextual demos
- Add demo links to onboarding
- Create demo gallery page

---

## Questions to Consider

1. **What's your current conversion rate?**
   - If low (<5%), demos might help
   - If high (>10%), demos might be distracting

2. **What's your user's typical journey?**
   - Do they research first? → Keep demos prominent
   - Do they want to build immediately? → Make demos secondary

3. **What's your competition doing?**
   - If competitors have demos → You need them too
   - If you're unique → Demos help explain value

4. **What's your signup friction?**
   - Low friction (email only)? → Demos less critical
   - High friction (credit card)? → Demos build trust

---

## Quick Implementation

### Option A: Dual Buttons
```tsx
<Button variant="contained" href="/builder">
  Build a Form
</Button>
<Button variant="text" href="/demos/forms" size="small">
  Try Demo
</Button>
```

### Option B: Button + Link
```tsx
<Button variant="contained" href="/builder">
  Build a Form
</Button>
<Typography variant="body2">
  or <Link href="/demos/forms">try a demo</Link>
</Typography>
```

### Option C: Inline Link
```tsx
<Button variant="contained" href="/builder">
  Build a Form
</Button>
<Typography component="span" variant="caption">
  {' '}or{' '}
  <Link href="/demos/forms">try a demo</Link>
</Typography>
```
