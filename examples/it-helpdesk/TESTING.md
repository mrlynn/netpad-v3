# IT Help Desk Application - Testing Guide

This guide provides comprehensive testing scenarios for the IT Help Desk application.

## Pre-Testing Setup

Before testing, ensure you have:

1. **MongoDB Connection** configured in NetPad Settings → Connections
2. **Email Integration** configured (or use mock mode for testing)
3. **Slack Webhook** (optional, for critical ticket escalation testing)
4. **Test Organization & Project** set up in NetPad

## Installation Testing

### Test 1: Marketplace Import

**Objective:** Verify the application can be installed from the marketplace.

**Steps:**
1. Navigate to **Marketplace** in NetPad
2. Search for "IT Help Desk"
3. Click on the application card
4. Review the application details:
   - ✓ Name: "IT Help Desk"
   - ✓ Version: "2.1.0"
   - ✓ Category: "helpdesk"
   - ✓ Icon: 🎫
   - ✓ Description is clear and comprehensive
5. Click **Install**
6. Select target organization and project
7. Wait for installation to complete

**Expected Results:**
- Application installs without errors
- 2 forms are created: "IT Support Request" and ticket search form
- 1 workflow is created: "IT Ticket Routing"
- Application appears in Applications list

### Test 2: Bundle Import via API

**Objective:** Verify the application can be imported via the import API.

**Steps:**
1. Prepare the bundle files from `examples/it-helpdesk/templates/`:
   - `manifest.json`
   - `form.json`
   - `search-form.json`
   - `workflow.json`
2. Call the import API:
   ```bash
   curl -X POST http://localhost:3000/api/templates/import \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d @import-bundle.json
   ```
3. Verify the response indicates success

**Expected Results:**
- `success: true` in response
- Application ID and slug returned
- Forms and workflows imported correctly

---

## Form Testing

### Test 3: Ticket Submission Form - Basic Fields

**Objective:** Test the basic ticket submission flow.

**Steps:**
1. Navigate to the IT Support Request form
2. Fill in Reporter Information:
   - Full Name: "Jane Developer"
   - Email: "jane@company.com"
   - Department: "Engineering"
   - Phone Extension: "1234"
3. Fill in Issue Details:
   - Issue Category: "Software"
   - Urgency Level: "High"
   - Subject: "VS Code crashes on startup"
   - Description: "VS Code crashes every time I try to open a large TypeScript project. This started after the latest update yesterday."
4. Fill in Contact Preferences:
   - Preferred Contact Method: "Email"
   - Best Time to Reach: ["Morning", "Afternoon"]
5. Submit the form

**Expected Results:**
- Form validates all required fields
- Submission succeeds without errors
- Success message is displayed
- Ticket is saved to MongoDB collection

### Test 4: Conditional Fields - Hardware Category

**Objective:** Verify conditional fields appear based on issue category.

**Steps:**
1. Open the IT Support Request form
2. Select Issue Category: "Hardware"
3. Observe that "Asset ID / Serial Number" field appears
4. Fill in the asset ID: "DELL-12345"
5. Switch Issue Category to "Software"
6. Observe that "Asset ID" field disappears
7. Observe that "Application Name" field appears

**Expected Results:**
- Conditional fields show/hide correctly based on category
- Field values are preserved when switching categories
- Only relevant fields are submitted

### Test 5: Conditional Fields - All Categories

**Objective:** Test all category-specific conditional fields.

**Test Cases:**

| Issue Category | Conditional Field | Field Type | Test Value |
|----------------|-------------------|------------|------------|
| Hardware | Asset ID / Serial Number | Text | "LAPTOP-2023-001" |
| Software | Application Name | Text | "Microsoft Excel" |
| Network | Network Location | Dropdown | "Floor 2 - East Wing" |
| Access & Permissions | System / Resource Name | Text | "Salesforce CRM" |
| Other | (none) | - | - |

**Steps for each category:**
1. Select the issue category
2. Verify the conditional field appears
3. Fill in the test value
4. Submit the form
5. Verify the conditional field data is saved

**Expected Results:**
- Each category shows only its specific conditional field
- All conditional field values are correctly saved to MongoDB
- Validation works on conditional fields

### Test 6: Form Validation

**Objective:** Test form validation rules.

**Test Cases:**

| Field | Validation Rule | Invalid Input | Expected Error |
|-------|----------------|---------------|----------------|
| Full Name | Required | (empty) | "Full Name is required" |
| Email | Required, valid email | "not-an-email" | "Please enter a valid email" |
| Department | Required | (empty) | "Department is required" |
| Subject | Required | (empty) | "Subject is required" |
| Description | Required, min 20 chars | "Too short" | "Description must be at least 20 characters" |

**Steps:**
1. For each test case, enter the invalid input
2. Attempt to submit the form
3. Verify the expected error message appears
4. Correct the input and verify the error clears

**Expected Results:**
- All validation rules work correctly
- Error messages are clear and helpful
- Form cannot be submitted with invalid data

### Test 7: Urgency Level Radio Buttons

**Objective:** Verify urgency level selection works correctly.

**Steps:**
1. Open the form
2. Verify all urgency options are displayed:
   - 🟢 Low — Can wait a few days
   - 🟡 Medium — Need help today
   - 🟠 High — Urgent, blocking work
   - 🔴 Critical — System down, major impact
3. Select each urgency level and verify only one can be selected at a time
4. Submit a ticket with "Critical" urgency
5. Verify the urgency value is saved correctly

**Expected Results:**
- Radio buttons work as expected (single selection)
- Emojis display correctly
- Selected value is saved to MongoDB
- Critical tickets trigger special handling in workflow

---

## Workflow Testing

### Test 8: Workflow Trigger - Form Submission

**Objective:** Verify the workflow triggers when a ticket is submitted.

**Setup:**
1. Ensure the "IT Ticket Routing" workflow is activated
2. Configure a test email address in the workflow

**Steps:**
1. Submit a test ticket via the form
2. Monitor workflow execution logs
3. Check for workflow run entry

**Expected Results:**
- Workflow triggers automatically on form submission
- Workflow execution appears in logs
- No errors in workflow execution

### Test 9: Email Notifications - Reporter Confirmation

**Objective:** Test the confirmation email sent to the ticket reporter.

**Steps:**
1. Configure email integration with a test inbox
2. Submit a ticket with your test email address
3. Check the test inbox for confirmation email
4. Verify email contents:
   - ✓ "From" name: "IT Support"
   - ✓ Subject includes ticket subject
   - ✓ Body includes reporter name
   - ✓ Body includes ticket details (category, urgency)
   - ✓ Body includes expected response time based on urgency
   - ✓ Email is properly formatted (Markdown or plain text)

**Expected Results:**
- Email arrives within 1 minute
- All ticket details are included
- Formatting is correct
- No merge tag errors (e.g., no `{{undefined}}`)

### Test 10: Email Notifications - IT Team Alert

**Objective:** Test the notification email sent to the IT team.

**Steps:**
1. Configure IT team email in workflow (e.g., "it-support@yourcompany.com")
2. Submit a ticket
3. Check the IT team inbox
4. Verify email contents:
   - ✓ Subject includes urgency level tag (e.g., "[high]")
   - ✓ Subject includes ticket subject and reporter name
   - ✓ Body includes all ticket details
   - ✓ Body includes reporter contact information
   - ✓ Body includes department and phone extension

**Expected Results:**
- Email arrives within 1 minute
- Subject line clearly indicates urgency
- All relevant information is included for IT team to triage

### Test 11: Critical Ticket Escalation - Slack

**Objective:** Verify critical tickets trigger Slack webhook.

**Setup:**
1. Configure a Slack incoming webhook URL in the workflow
2. Set up a test Slack channel to receive alerts

**Steps:**
1. Submit a ticket with Urgency Level: "Critical"
2. Check the Slack channel for the alert
3. Verify the Slack message:
   - ✓ Emoji indicator (🚨)
   - ✓ "CRITICAL" in message
   - ✓ Reporter name and department
   - ✓ Ticket subject
   - ✓ Brief description

**Expected Results:**
- Slack alert appears immediately (within seconds)
- Message format is clear and attention-grabbing
- All critical information is included

### Test 12: Workflow Conditional Logic - Critical vs Non-Critical

**Objective:** Verify only critical tickets trigger Slack escalation.

**Steps:**
1. Submit 4 tickets with different urgency levels:
   - Low urgency ticket
   - Medium urgency ticket
   - High urgency ticket
   - Critical urgency ticket
2. Monitor Slack channel
3. Verify only the critical ticket triggers Slack alert

**Expected Results:**
- Only critical tickets escalate to Slack
- Low, medium, and high tickets do NOT trigger Slack
- All tickets still send email notifications

### Test 13: Workflow Parallel Execution

**Objective:** Verify email nodes execute in parallel for speed.

**Steps:**
1. Submit a ticket
2. Monitor workflow execution timing
3. Verify both email nodes execute simultaneously (not sequentially)
4. Check workflow logs for execution timing

**Expected Results:**
- Requester confirmation and IT team notification execute in parallel
- Total workflow execution time is ~2-3 seconds (not 4-6 seconds)
- No race conditions or data corruption

---

## Search Form Testing

### Test 14: Ticket Search - Basic Search

**Objective:** Test the ticket search form.

**Setup:**
1. Create at least 10 test tickets with varying:
   - Departments
   - Issue categories
   - Urgency levels
   - Submission dates

**Steps:**
1. Navigate to the ticket search form
2. Enter a search term in the text search field (e.g., "laptop")
3. Submit the search
4. Verify results show tickets containing "laptop" in subject or description

**Expected Results:**
- Search returns relevant results
- Results display key ticket information (subject, urgency, department, date)
- Search is case-insensitive

### Test 15: Smart Dropdown Filters

**Objective:** Test the smart dropdown filters with data counts.

**Steps:**
1. Open the ticket search form
2. Click the "Urgency" dropdown
3. Verify options show with counts:
   - Critical (2)
   - High (5)
   - Medium (8)
   - Low (3)
4. Select "Critical" and submit
5. Verify only critical tickets are returned

**Expected Results:**
- Dropdowns show actual data values from existing tickets
- Counts are accurate
- Filtering works correctly
- No empty categories are shown (or they're shown with count 0)

### Test 16: Multi-Filter Combination

**Objective:** Test combining multiple filters.

**Steps:**
1. Apply multiple filters:
   - Urgency: "High"
   - Department: "Engineering"
   - Date range: Last 7 days
2. Submit the search
3. Verify results match ALL filter criteria (AND logic)

**Expected Results:**
- Results match all applied filters
- No tickets outside the filter criteria are shown
- Filter combinations work correctly

### Test 17: Search Results Display

**Objective:** Verify search results are displayed correctly.

**Steps:**
1. Perform a search that returns 5+ results
2. Verify each result card displays:
   - ✓ Ticket subject
   - ✓ Reporter name and email
   - ✓ Department
   - ✓ Issue category
   - ✓ Urgency level (with color indicator)
   - ✓ Submission date
   - ✓ Brief description preview
3. Click on a result to view full details

**Expected Results:**
- All ticket information is displayed correctly
- Color coding for urgency levels works
- Clicking a result shows full ticket details
- Results are sorted by date (newest first) by default

---

## Data Persistence Testing

### Test 18: MongoDB Storage Verification

**Objective:** Verify tickets are correctly saved to MongoDB.

**Steps:**
1. Submit a test ticket
2. Connect to MongoDB directly (via MongoDB Compass or shell)
3. Query the tickets collection: `db.it_support_tickets.findOne()`
4. Verify the document structure:
   ```javascript
   {
     "_id": ObjectId("..."),
     "fullName": "Jane Developer",
     "email": "jane@company.com",
     "department": "engineering",
     "phoneExtension": "1234",
     "issueCategory": "software",
     "urgencyLevel": "high",
     "subject": "VS Code crashes",
     "description": "...",
     "applicationName": "Visual Studio Code",
     "preferredContactMethod": "email",
     "bestTimeToReach": ["morning", "afternoon"],
     "additionalNotes": "...",
     "submittedAt": ISODate("2026-01-21T..."),
     "status": "new"
   }
   ```

**Expected Results:**
- Document matches submitted form data
- All fields are present (including conditional fields if applicable)
- Data types are correct (strings, arrays, dates)
- No sensitive data is exposed

### Test 19: Conditional Field Data Storage

**Objective:** Verify conditional fields are only saved when applicable.

**Steps:**
1. Submit a ticket with Issue Category: "Hardware"
   - Fill in Asset ID: "LAPTOP-001"
2. Query MongoDB for the ticket
3. Verify `assetId` field is present with value "LAPTOP-001"
4. Submit another ticket with Issue Category: "Software"
   - Fill in Application Name: "Excel"
5. Query MongoDB for the second ticket
6. Verify `applicationName` field is present
7. Verify `assetId` field is NOT present (or is null/empty)

**Expected Results:**
- Only relevant conditional fields are saved
- No empty/null fields clutter the document
- Data structure is clean and efficient

---

## Edge Case Testing

### Test 20: Special Characters in Text Fields

**Objective:** Test handling of special characters and edge cases.

**Test Cases:**
| Field | Input | Expected Behavior |
|-------|-------|------------------|
| Subject | `Test <script>alert('xss')</script>` | HTML escaped, no script execution |
| Description | Multi-line text with `\n` breaks | Line breaks preserved |
| Email | `user+tag@example.com` | Valid email accepted |
| Asset ID | `ASSET-001/ABC#123` | Special chars allowed |

**Steps:**
1. For each test case, enter the input
2. Submit the form
3. Verify data is correctly stored
4. Verify no security vulnerabilities (XSS, injection)

**Expected Results:**
- Special characters are properly escaped
- No code execution vulnerabilities
- Data integrity is maintained
- Line breaks and formatting are preserved

### Test 21: Maximum Length Fields

**Objective:** Test field length limits.

**Steps:**
1. Enter very long text in Description field (>5000 characters)
2. Attempt to submit
3. Verify validation handles the input appropriately

**Expected Results:**
- If max length is enforced, validation error appears
- If no max length, long text is accepted and saved
- No database errors or truncation without warning

### Test 22: Form Abandonment and Resume

**Objective:** Test form state persistence when user navigates away.

**Steps:**
1. Fill out half of the form
2. Navigate away from the page
3. Return to the form
4. Verify field values are preserved (if browser/local storage is used)

**Expected Results:**
- (Optional feature) Form data is preserved
- OR: User receives warning before navigating away
- No data loss on accidental navigation

---

## Performance Testing

### Test 23: Form Load Time

**Objective:** Measure form rendering performance.

**Steps:**
1. Clear browser cache
2. Navigate to the IT Support Request form
3. Measure time to interactive (TTI)
4. Verify form is usable within 2 seconds

**Expected Results:**
- Form loads in < 2 seconds on modern connection
- No layout shifts during load
- All fields are rendered correctly

### Test 24: Workflow Execution Time

**Objective:** Measure workflow processing speed.

**Steps:**
1. Submit a ticket
2. Measure time from submission to workflow completion
3. Check workflow logs for execution duration

**Expected Results:**
- Total workflow execution < 5 seconds
- Email nodes execute in parallel
- No timeout errors

### Test 25: Search Performance with Large Dataset

**Objective:** Test search performance with many tickets.

**Setup:**
1. Create 1000+ test tickets (use a script if needed)

**Steps:**
1. Perform various searches
2. Measure query response time
3. Verify pagination works (if implemented)

**Expected Results:**
- Search results return in < 3 seconds
- UI remains responsive
- No browser memory issues
- Pagination limits results to reasonable page size

---

## Integration Testing

### Test 26: Multiple Ticket Workflow

**Objective:** Test complete ticket lifecycle from submission to resolution.

**Steps:**
1. Submit a ticket (status: "new")
2. IT team reviews ticket (status: "in-progress")
3. IT team adds notes and updates
4. Ticket is resolved (status: "resolved")
5. Reporter is notified of resolution

**Expected Results:**
- Ticket status updates correctly
- All stakeholders receive appropriate notifications
- Ticket history is preserved

### Test 27: Concurrent Submissions

**Objective:** Test handling of multiple simultaneous ticket submissions.

**Steps:**
1. Open the form in 5 different browser tabs
2. Fill out and submit all forms at the same time
3. Verify all submissions are processed correctly
4. Check MongoDB for all 5 tickets
5. Verify all workflows execute without errors

**Expected Results:**
- All submissions succeed
- No race conditions or data corruption
- All workflows trigger correctly
- No duplicate tickets are created

---

## Accessibility Testing

### Test 28: Keyboard Navigation

**Objective:** Verify form is fully keyboard accessible.

**Steps:**
1. Navigate to the form using only keyboard (Tab, Shift+Tab)
2. Fill out all fields using only keyboard
3. Submit the form using Enter or Space on submit button

**Expected Results:**
- All form fields are reachable via Tab
- Tab order is logical (top to bottom, left to right)
- Focus indicators are visible
- Form can be submitted without mouse

### Test 29: Screen Reader Compatibility

**Objective:** Test form with screen reader (NVDA, JAWS, or VoiceOver).

**Steps:**
1. Enable screen reader
2. Navigate through the form
3. Verify all labels and instructions are announced
4. Verify error messages are announced
5. Submit the form

**Expected Results:**
- All form labels are properly associated with inputs
- Required fields are announced
- Error messages are announced immediately
- Submit button is announced correctly

---

## Mobile Responsiveness Testing

### Test 30: Mobile Form Submission

**Objective:** Test form on mobile devices.

**Devices to test:**
- iPhone (iOS Safari)
- Android phone (Chrome)
- Tablet (iPad/Android tablet)

**Steps:**
1. Open form on mobile device
2. Verify layout adapts to small screen
3. Fill out and submit form
4. Verify all fields are usable on mobile

**Expected Results:**
- Form is fully responsive
- Fields are large enough to tap accurately
- No horizontal scrolling required
- Keyboard pops up appropriately for each field type
- Submit button is easily reachable

---

## Error Handling Testing

### Test 31: Network Error During Submission

**Objective:** Test form behavior when network fails during submission.

**Steps:**
1. Fill out the form
2. Open browser DevTools → Network tab
3. Enable "Offline" mode
4. Attempt to submit the form
5. Observe error handling
6. Re-enable network and retry

**Expected Results:**
- Clear error message: "Network error, please try again"
- Form data is not lost
- Retry mechanism is available
- No data corruption

### Test 32: Workflow Email Failure

**Objective:** Test workflow behavior when email sending fails.

**Steps:**
1. Configure email integration with invalid credentials
2. Submit a ticket
3. Monitor workflow execution
4. Verify error is logged
5. Verify ticket is still saved to MongoDB

**Expected Results:**
- Workflow execution fails gracefully
- Error is logged with details
- Ticket data is preserved
- Workflow can be retried manually
- User receives appropriate error message

---

## Regression Testing Checklist

After any code changes, verify:

- [ ] Form submission still works
- [ ] Conditional fields still show/hide correctly
- [ ] Workflow triggers correctly
- [ ] Email notifications are sent
- [ ] Search form returns accurate results
- [ ] MongoDB data structure is unchanged
- [ ] No console errors in browser
- [ ] No errors in server logs
- [ ] All validation rules still work
- [ ] Urgency-based escalation still works

---

## Test Data Templates

### Sample Ticket 1: Low Priority Software Issue
```json
{
  "fullName": "John Smith",
  "email": "john@company.com",
  "department": "sales",
  "phoneExtension": "2345",
  "issueCategory": "software",
  "urgencyLevel": "low",
  "subject": "Excel formula not calculating correctly",
  "description": "When I use the VLOOKUP function in Excel, it returns #N/A even though the value exists in my lookup table.",
  "applicationName": "Microsoft Excel",
  "preferredContactMethod": "email",
  "bestTimeToReach": ["afternoon"]
}
```

### Sample Ticket 2: Critical Hardware Issue
```json
{
  "fullName": "Sarah Johnson",
  "email": "sarah@company.com",
  "department": "engineering",
  "phoneExtension": "3456",
  "issueCategory": "hardware",
  "urgencyLevel": "critical",
  "subject": "Laptop won't boot - urgent presentation in 1 hour",
  "description": "My laptop shows a black screen when I try to turn it on. I have an important client presentation in 1 hour and all my files are on this machine.",
  "assetId": "LAPTOP-ENG-042",
  "preferredContactMethod": "phone",
  "bestTimeToReach": ["now", "asap"]
}
```

### Sample Ticket 3: Network Connectivity Issue
```json
{
  "fullName": "Mike Chen",
  "email": "mike@company.com",
  "department": "marketing",
  "phoneExtension": "4567",
  "issueCategory": "network",
  "urgencyLevel": "high",
  "subject": "Can't connect to shared drive",
  "description": "I'm unable to access the marketing shared drive on the network. I get an error message 'Network path not found' when I try to connect.",
  "networkLocation": "floor_2_east",
  "preferredContactMethod": "chat",
  "bestTimeToReach": ["morning", "afternoon"]
}
```

---

## Automated Testing

For CI/CD integration, consider automating these test categories:

1. **Unit Tests**: Form validation logic
2. **Integration Tests**: Workflow trigger mechanism
3. **E2E Tests**: Complete ticket submission flow
4. **API Tests**: Template import API
5. **Performance Tests**: Search query response time

Example Playwright test:
```typescript
test('submit IT support ticket', async ({ page }) => {
  await page.goto('/forms/it-support-request');

  await page.fill('[name="fullName"]', 'Test User');
  await page.fill('[name="email"]', 'test@example.com');
  await page.selectOption('[name="department"]', 'engineering');
  await page.selectOption('[name="issueCategory"]', 'software');
  await page.check('[value="high"]');
  await page.fill('[name="subject"]', 'Test issue');
  await page.fill('[name="description"]', 'This is a test ticket for automated testing purposes.');

  await page.click('button[type="submit"]');

  await expect(page.locator('.success-message')).toBeVisible();
});
```

---

## Reporting Issues

When reporting bugs, include:

1. **Test scenario** from this guide
2. **Expected result** vs **actual result**
3. **Browser/device** information
4. **Screenshots** or **error messages**
5. **Steps to reproduce**
6. **MongoDB collection** state (if relevant)
7. **Workflow logs** (if workflow-related)

---

## Next Steps

After successful testing:

1. ✅ Mark the application as "Production Ready"
2. 📝 Update documentation with any findings
3. 🚀 Publish updated version to marketplace (if changes made)
4. 📧 Notify stakeholders of successful testing
5. 🎉 Deploy to production environment
