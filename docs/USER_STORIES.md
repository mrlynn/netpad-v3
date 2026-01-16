# NetPad User Stories

This document contains a comprehensive series of user stories that demonstrate various stages of user interactions with NetPad, from initial discovery through advanced usage.

---

## Stage 1: Discovery & Onboarding

### Story 1.1: First-Time Visitor Discovers NetPad
**As a** first-time visitor to NetPad  
**I want to** understand what NetPad does and see it in action  
**So that** I can determine if it solves my problem

**Acceptance Criteria:**
- User lands on homepage and sees clear value proposition
- User can try interactive demos for each of the 4 pillars (Forms, Workflows, Data, Conversational AI)
- User can see example applications without signing up
- User understands NetPad is an application platform, not just a form builder

**User Flow:**
1. User visits netpad.io
2. Sees hero section explaining "Build MongoDB-connected data forms and workflows"
3. Clicks "Try Forms Demo" → sees interactive employee onboarding form
4. Clicks "Try Workflows Demo" → sees visual workflow execution
5. Clicks "Try Data Explorer" → sees sample MongoDB collections
6. Clicks "Try Conversational AI" → has a conversation with AI form
7. User clicks "Get Started" to sign up

---

### Story 1.2: New User Signs Up and Onboards
**As a** new user who just signed up  
**I want to** quickly understand how to use NetPad  
**So that** I can start building my first application

**Acceptance Criteria:**
- User completes sign-up flow (email/password or OAuth)
- User is guided through organization and project creation
- User sees onboarding tour for Form Builder on first visit
- User understands the relationship between Projects, Applications, Forms, and Workflows

**User Flow:**
1. User signs up with email/password
2. System prompts to create first organization
3. User creates organization "Acme Corp"
4. System prompts to create first project
5. User creates project "Customer Portal"
6. User lands on Applications page (empty state)
7. System shows template gallery with common application templates
8. User selects "Contact Form" template
9. System creates application with pre-configured form
10. User sees onboarding tour explaining Form Builder interface

---

## Stage 2: First Application Creation

### Story 2.1: User Creates First Form from Template
**As a** new user  
**I want to** create my first form using a template  
**So that** I can quickly get started without building from scratch

**Acceptance Criteria:**
- User can browse form templates by category
- User can preview template before using it
- User can choose to use template as-is or customize it
- Form is created in an application context

**User Flow:**
1. User clicks "Create Application" or "Create Form"
2. System shows template gallery with categories (Contact, Survey, Registration, etc.)
3. User browses "Contact Forms" category
4. User clicks "Contact Form" template to preview
5. Preview shows form fields and configuration
6. User clicks "Use Template"
7. System creates application "Contact Form" with form inside
8. User is taken to Form Builder with template fields pre-populated
9. User can immediately edit fields or publish as-is

---

### Story 2.2: User Builds Custom Form from Scratch
**As a** user who wants full control  
**I want to** build a form from scratch  
**So that** I can create exactly what I need

**Acceptance Criteria:**
- User can add fields using drag-and-drop or field picker
- User can configure field properties inline
- User can see live preview of form
- User can organize fields into multiple pages
- User can add conditional logic

**User Flow:**
1. User clicks "Create Form" → "Start from Scratch"
2. System creates empty form in default application
3. User sees Form Builder with empty canvas
4. User clicks "Add Field" → sees field type picker
5. User selects "Short Text" field
6. Field appears on canvas with inline toolbar (Required toggle, Delete, Settings)
7. User clicks field → right-side drawer opens with full configuration
8. User configures field: label "Full Name", required, placeholder
9. User adds more fields: Email, Phone, Message (Long Text)
10. User clicks "Pages" tab in settings → creates 2-page wizard
11. User moves "Message" field to page 2
12. User adds conditional logic: "Phone" field only shows if "Contact Method" = "Phone"

---

### Story 2.3: User Publishes First Form
**As a** user who has built a form  
**I want to** publish it and make it accessible  
**So that** others can fill it out

**Acceptance Criteria:**
- User can publish form with minimal clicks (Quick Publish)
- User can configure where form data is stored (MongoDB collection)
- User receives shareable URL and embed code
- Form is accessible at public URL

**User Flow:**
1. User finishes building form
2. User clicks "Publish" button in Form Builder header
3. Quick Publish popover appears
4. If no data source configured:
   - User selects MongoDB connection (or creates new)
   - User selects or creates collection name
5. If data source exists:
   - User just enters form name
6. User clicks "Publish"
7. System shows success dialog with:
   - Public form URL
   - Embed code snippet
   - QR code for mobile
8. User can copy URL or embed code
9. User clicks "View Form" → sees public form page
10. User fills out form to test it
11. Submission is saved to MongoDB collection

---

## Stage 3: Workflow Automation

### Story 3.1: User Creates First Workflow
**As a** user who has published a form  
**I want to** automate what happens when form is submitted  
**So that** I don't have to manually process each submission

**Acceptance Criteria:**
- User can create workflow triggered by form submission
- User can add workflow nodes visually
- User can configure node actions
- User can test workflow execution

**User Flow:**
1. User navigates to Workflows page
2. User clicks "Create Workflow"
3. System shows workflow template gallery
4. User selects "Form to Email" template
5. System creates workflow with:
   - Form Trigger node (connected to user's form)
   - Email Send node
6. User clicks Email Send node → right panel opens
7. User configures:
   - To: `{{formData.email}}`
   - Subject: "Thank you for your submission"
   - Body: Includes form data fields
8. User clicks "Test Workflow" → system simulates execution
9. User sees execution flow with node highlights
10. User clicks "Activate" → workflow is now live
11. Next form submission automatically triggers email

---

### Story 3.2: User Builds Complex Workflow with Conditions
**As a** user with business logic requirements  
**I want to** create a workflow with conditional branching  
**So that** different actions happen based on form data

**Acceptance Criteria:**
- User can add conditional logic nodes
- User can branch workflow based on field values
- User can chain multiple actions
- User can see workflow execution history

**User Flow:**
1. User creates new workflow "Support Ticket Processing"
2. User adds Form Trigger node → connects to "Support Request" form
3. User adds Conditional node → checks if `priority === "high"`
4. User connects Conditional node to two paths:
   - "True" path → Email Send node (to manager)
   - "False" path → Email Send node (to support team)
5. User adds MongoDB Write node to both paths → saves to "tickets" collection
6. User adds Notification node → sends Slack message
7. User tests workflow with sample data:
   - High priority → sees manager email path execute
   - Low priority → sees support team email path execute
8. User activates workflow
9. User navigates to "Executions" tab → sees execution history
10. User clicks execution → sees detailed logs and data flow

---

### Story 3.3: User Integrates Workflow with External Services
**As a** user who needs external integrations  
**I want to** connect my workflow to third-party services  
**So that** I can automate across my entire tech stack

**Acceptance Criteria:**
- User can add HTTP Request nodes
- User can configure API authentication
- User can map form data to API payloads
- User can handle API responses

**User Flow:**
1. User adds HTTP Request node to workflow
2. User configures:
   - Method: POST
   - URL: `https://api.crm.com/contacts`
   - Headers: Authorization with API key
   - Body: Maps form fields to CRM contact fields
3. User adds Transform node → converts API response format
4. User adds MongoDB Write node → saves CRM contact ID to database
5. User tests workflow → sees HTTP request execute
6. User views execution logs → sees API response
7. User activates workflow
8. Next form submission creates contact in CRM automatically

---

## Stage 4: Data Management

### Story 4.1: User Explores Form Submissions
**As a** user who has received form submissions  
**I want to** view and manage the data  
**So that** I can process and analyze it

**Acceptance Criteria:**
- User can browse form submissions in Data Explorer
- User can view individual submission details
- User can search and filter submissions
- User can export data

**User Flow:**
1. User navigates to Data Explorer
2. User sees list of MongoDB collections
3. User clicks "contact_form_submissions" collection
4. User sees table view of submissions with columns:
   - Submission date
   - Form fields (Name, Email, Message)
   - Status
5. User clicks a submission row → sees full document details
6. User uses search bar → filters by email address
7. User clicks column header → sorts by date
8. User clicks "Export" → downloads CSV file
9. User clicks "View Form" → sees which form created this data

---

### Story 4.2: User Creates Search Form for Data
**As a** user with large amounts of data  
**I want to** create a search interface  
**So that** I can quickly find specific records

**Acceptance Criteria:**
- User can create search form connected to MongoDB collection
- User can configure searchable fields
- User can set up filters and operators
- User can view search results in table or card view

**User Flow:**
1. User navigates to Forms page
2. User clicks "Create Form" → "Search Form"
3. System prompts to select MongoDB collection
4. User selects "employees" collection
5. System auto-generates search form with fields:
   - Name (text search)
   - Department (dropdown with distinct values)
   - Hire Date (date range)
   - Salary (number range)
6. User configures search operators for each field
7. User publishes search form
8. User opens search form
9. User enters search criteria:
   - Name: "John"
   - Department: "Engineering"
   - Hire Date: Last 6 months
10. User clicks "Search"
11. System displays matching records in table view
12. User can click record → view full details
13. User can export search results

---

### Story 4.3: User Manages Data Relationships
**As a** user with related data across collections  
**I want to** understand and manage relationships  
**So that** I can maintain data integrity

**Acceptance Criteria:**
- User can see relationships between collections
- User can navigate from one document to related documents
- User can create forms that reference other collections
- User can use lookup fields in forms

**User Flow:**
1. User views "orders" collection in Data Explorer
2. User sees "customerId" field with link icon
3. User clicks link → navigates to "customers" collection
4. User sees customer document with related orders listed
5. User creates new form "Order Form"
6. User adds "Customer" field → selects "Lookup" type
7. User configures lookup:
   - Source collection: "customers"
   - Display field: "name"
   - Value field: "_id"
8. User publishes form
9. When filling form, user sees dropdown of customer names
10. On submission, order document includes customer reference
11. User can navigate from order → customer → all customer orders

---

## Stage 5: Advanced Features

### Story 5.1: User Creates Conversational AI Form
**As a** user who wants a natural conversation interface  
**I want to** create an AI-powered conversational form  
**So that** users can provide information through dialogue

**Acceptance Criteria:**
- User can create conversational form configuration
- User can define topics and extraction schema
- User can configure AI persona and behavior
- User can test conversation flow

**User Flow:**
1. User navigates to Forms page
2. User clicks "Create Form" → "Conversational Form"
3. System shows conversational form builder
4. User configures:
   - Objective: "Collect IT support ticket information"
   - Persona: Professional, empathetic
   - Topics:
     - Issue description (required)
     - Priority level (required)
     - Affected systems (optional)
     - Contact preference (required)
5. User defines extraction schema:
   - `issue`: string, required
   - `priority`: enum (low, medium, high), required
   - `systems`: array of strings, optional
   - `contactMethod`: enum (email, phone, chat), required
6. User enables RAG → uploads IT documentation PDF
7. User clicks "Test Conversation"
8. System opens chat interface
9. User has conversation:
   - AI: "Hello! I'm here to help with your IT support request. What issue are you experiencing?"
   - User: "My email isn't working"
   - AI: "I understand. Can you tell me more about when this started?"
   - ... conversation continues ...
10. AI extracts structured data from conversation
11. User sees extracted data preview
12. User publishes conversational form
13. Public form shows chat interface instead of traditional form

---

### Story 5.2: User Uses AI to Generate Form
**As a** user who wants to speed up form creation  
**I want to** use AI to generate a form from description  
**So that** I don't have to manually configure every field

**Acceptance Criteria:**
- User can describe form requirements in natural language
- AI generates form configuration with appropriate fields
- User can review and edit generated form
- User can regenerate if not satisfied

**User Flow:**
1. User clicks "Create Form" → "Generate with AI"
2. System shows AI chat interface
3. User types: "I need a job application form for software engineers. Should collect name, email, resume, years of experience, preferred programming languages, and salary expectations."
4. AI generates form configuration:
   - Short Text: Name, Email
   - File Upload: Resume
   - Number: Years of Experience
   - Multi-select: Programming Languages
   - Number: Salary Expectations
5. User reviews generated form in preview
6. User clicks "Use This Form" → form is created
7. User can edit any field or add more fields
8. User can ask AI: "Add a field for GitHub profile URL"
9. AI adds URL field to form
10. User publishes form

---

### Story 5.3: User Creates Multi-Page Application
**As a** user with complex requirements  
**I want to** create an application with multiple forms and workflows  
**So that** I can build a complete solution

**Acceptance Criteria:**
- User can create application with multiple forms
- User can connect forms to workflows
- User can configure application-level settings
- User can view application overview and stats

**User Flow:**
1. User navigates to Applications page
2. User clicks "Create Application"
3. User enters:
   - Name: "Employee Onboarding"
   - Description: "Complete onboarding system for new hires"
4. System creates application
5. User is on Application detail page with tabs:
   - Overview
   - Forms
   - Workflows
   - Connections
   - Settings
6. User clicks "Add Form" → creates "Personal Information" form
7. User clicks "Add Form" → creates "Employment Details" form
8. User clicks "Add Form" → creates "Equipment Request" form
9. User navigates to Workflows tab
10. User creates workflow "Onboarding Automation":
    - Trigger: Personal Information form submission
    - Action: Send welcome email
    - Action: Create employee record in HR system
    - Action: Trigger Equipment Request form
11. User navigates to Connections tab
12. User sees visual map of forms → workflows → actions
13. User clicks "Overview" tab → sees:
    - Application stats (3 forms, 1 workflow, 50 submissions)
    - Recent activity
    - Quick actions
14. User configures application settings:
    - Theme colors
    - Default notifications
    - Access permissions

---

## Stage 6: Collaboration & Sharing

### Story 6.1: User Shares Form with Team
**As a** user who built a form  
**I want to** share it with my team members  
**So that** they can also manage and view submissions

**Acceptance Criteria:**
- User can invite team members to organization
- User can set permissions per team member
- Team members can access shared forms and data
- User can see who has access

**User Flow:**
1. User navigates to Organization Settings
2. User clicks "Team" tab
3. User clicks "Invite Member"
4. User enters email address and selects role:
   - Admin: Full access
   - Editor: Can edit forms/workflows
   - Viewer: Can view submissions only
5. User sends invitation
6. Team member receives email invitation
7. Team member accepts invitation → joins organization
8. Team member can see all forms in shared projects
9. Team member navigates to "Contact Form" → can view submissions
10. If Editor role: Team member can edit form configuration
11. User can see team member activity in audit log

---

### Story 6.2: User Publishes Application to Marketplace
**As a** user who built a useful application  
**I want to** publish it to the marketplace  
**So that** others can use and benefit from it

**Acceptance Criteria:**
- User can export application as bundle
- User can publish to marketplace with description
- Other users can discover and install application
- User can set pricing (if applicable)

**User Flow:**
1. User navigates to Application detail page
2. User clicks "Export" → system creates application bundle
3. User clicks "Publish to Marketplace"
4. System shows marketplace publishing form:
   - Application name and description
   - Category (Contact Forms, Surveys, etc.)
   - Tags
   - Screenshots
   - Pricing (Free, Paid, Freemium)
5. User fills out form and uploads screenshots
6. User clicks "Submit for Review"
7. Application is reviewed by NetPad team
8. Application is published to marketplace
9. Other users can browse marketplace
10. Other user finds "Employee Onboarding" application
11. Other user clicks "Install" → application is added to their project
12. Other user can configure and customize application
13. Original creator can see install count and ratings

---

### Story 6.3: User Installs Application from Marketplace
**As a** user looking for solutions  
**I want to** browse and install applications from marketplace  
**So that** I don't have to build everything from scratch

**Acceptance Criteria:**
- User can browse marketplace by category
- User can preview application before installing
- User can see application details, ratings, and reviews
- User can install application with one click

**User Flow:**
1. User navigates to Marketplace
2. User browses categories: "Contact Forms", "Surveys", "Registration"
3. User searches for "customer feedback"
4. User sees "Customer Feedback Survey" application
5. User clicks application → sees detail page:
   - Description and features
   - Screenshots
   - Forms and workflows included
   - Ratings and reviews
   - Install count
6. User clicks "Preview" → sees demo of application
7. User clicks "Install"
8. System prompts to select target project
9. User selects project → application is installed
10. User navigates to Applications page → sees new application
11. User clicks application → can configure and customize
12. User can see all forms and workflows that came with application
13. User can modify forms/workflows (if not locked)
14. User can fork application to create custom version

---

## Stage 7: Enterprise Features

### Story 7.1: User Configures Field-Level Encryption
**As a** user handling sensitive data  
**I want to** encrypt specific form fields  
**So that** sensitive information is protected

**Acceptance Criteria:**
- User can enable encryption for specific fields
- Encrypted fields are stored securely
- User can decrypt data when needed (with proper permissions)
- Encryption is transparent to form fillers

**User Flow:**
1. User edits form in Form Builder
2. User selects "Social Security Number" field
3. User opens field configuration drawer
4. User navigates to "Security" section
5. User enables "Field-Level Encryption"
6. User selects encryption method (Queryable Encryption)
7. User saves form
8. User publishes form
9. When form is submitted, SSN field is encrypted before storage
10. In Data Explorer, user sees encrypted value (not readable)
11. User with decryption permissions can view decrypted value
12. User can configure who has decryption access

---

### Story 7.2: User Sets Up Bot Protection
**As a** user who wants to prevent spam  
**I want to** enable bot protection on my forms  
**So that** I only receive legitimate submissions

**Acceptance Criteria:**
- User can enable bot protection in form settings
- System uses multiple detection methods (honeypot, timing, Turnstile)
- Bot submissions are blocked automatically
- User can see bot protection statistics

**User Flow:**
1. User navigates to form settings
2. User clicks "Protection" tab
3. User enables "Bot Protection"
4. System shows options:
   - Honeypot field (invisible to humans)
   - Timing analysis (detects too-fast submissions)
   - Cloudflare Turnstile (CAPTCHA alternative)
5. User enables all three methods
6. User configures Turnstile site key
7. User saves settings
8. User publishes form
9. Bot attempts to submit form → blocked by honeypot
10. Bot attempts with slower timing → blocked by Turnstile
11. Legitimate user submits form → passes all checks
12. User views form analytics → sees bot protection stats:
    - Total submissions: 100
    - Blocked bots: 15
    - Legitimate submissions: 85

---

### Story 7.3: User Configures Webhook Integrations
**As a** user who needs real-time integrations  
**I want to** configure webhooks for form submissions  
**So that** external systems are notified immediately

**Acceptance Criteria:**
- User can configure webhook URLs in form settings
- User can set webhook authentication
- User can map form data to webhook payload
- User can see webhook delivery status

**User Flow:**
1. User navigates to form settings
2. User clicks "Integrations" tab
3. User clicks "Add Webhook"
4. User configures:
   - URL: `https://api.example.com/webhook`
   - Method: POST
   - Headers: Authorization: Bearer token
   - Payload: Maps form fields to webhook format
5. User enables webhook
6. User saves settings
7. Form is submitted
8. System sends webhook immediately
9. User navigates to "Webhook Logs"
10. User sees:
    - Delivery status (success/failure)
    - Response code
    - Response time
    - Retry attempts (if failed)
11. Failed webhook is retried automatically
12. User can manually retry failed webhooks

---

### Story 7.4: User Manages API Keys and Access
**As a** developer integrating NetPad  
**I want to** create API keys for programmatic access  
**So that** I can build custom integrations

**Acceptance Criteria:**
- User can create API keys with specific permissions
- User can restrict API keys to specific projects/forms
- User can revoke API keys
- User can see API key usage logs

**User Flow:**
1. User navigates to Organization Settings
2. User clicks "API Keys" tab
3. User clicks "Create API Key"
4. User configures:
   - Name: "Production Integration"
   - Permissions: Read/Write forms, Read submissions
   - Scope: Specific project or all projects
   - Expiration: 1 year
5. User creates key → receives key value (shown once)
6. User copies key to secure location
7. Developer uses key in API client:
   ```javascript
   const client = createNetPadClient({
     baseUrl: 'https://netpad.io',
     apiKey: 'key_abc123...'
   });
   ```
8. Developer makes API calls → data is accessed
9. User views "API Usage" logs → sees:
    - API calls by key
    - Endpoints accessed
    - Rate limits
10. User revokes compromised key → API calls immediately fail
11. User creates new key to replace revoked one

---

## Stage 8: Advanced Workflows

### Story 8.1: User Creates Approval Workflow
**As a** user with approval processes  
**I want to** create a workflow with human approval steps  
**So that** submissions require review before processing

**Acceptance Criteria:**
- User can add approval nodes to workflow
- User can configure approvers and approval rules
- Approvers receive notifications
- User can track approval status

**User Flow:**
1. User creates workflow "Expense Report Approval"
2. User adds Form Trigger → connected to "Expense Report" form
3. User adds Approval node:
   - Approver: Manager (from form data: `managerEmail`)
   - Approval method: Email link
   - Timeout: 3 days
   - Auto-approve if no response: No
4. User connects Approval "approved" path → MongoDB Write (save approved expense)
5. User connects Approval "rejected" path → Email Send (notify submitter)
6. User activates workflow
7. Form is submitted → Approval node triggers
8. Manager receives email with approval link
9. Manager clicks link → sees expense details
10. Manager clicks "Approve" or "Reject"
11. If approved → expense is saved to database
12. If rejected → submitter receives rejection email
13. User views workflow executions → sees approval status for each

---

### Story 8.2: User Creates Scheduled Workflow
**As a** user who needs periodic tasks  
**I want to** create a workflow that runs on a schedule  
**So that** I can automate recurring processes

**Acceptance Criteria:**
- User can create workflow with schedule trigger
- User can configure cron expression for schedule
- Workflow runs automatically at scheduled times
- User can see execution history

**User Flow:**
1. User creates workflow "Daily Report Generator"
2. User adds Schedule Trigger node:
   - Schedule: Daily at 9:00 AM
   - Timezone: America/New_York
3. User adds MongoDB Query node → queries submissions from last 24 hours
4. User adds Transform node → aggregates data into report format
5. User adds Email Send node → sends report to stakeholders
6. User activates workflow
7. Next day at 9:00 AM → workflow executes automatically
8. System queries database → finds 50 submissions
9. System aggregates data → creates report
10. System sends email with report
11. User views execution history → sees daily executions
12. User can pause/resume schedule

---

### Story 8.3: User Creates Multi-Step Data Processing Pipeline
**As a** user with complex data processing needs  
**I want to** create a workflow with multiple transformation steps  
**So that** I can process and enrich data before storing

**Acceptance Criteria:**
- User can chain multiple data transformation nodes
- User can use AI nodes for data enrichment
- User can handle errors at each step
- User can see data flow through pipeline

**User Flow:**
1. User creates workflow "Lead Qualification Pipeline"
2. User adds Form Trigger → "Contact Form" submission
3. User adds AI Classify node:
   - Classifies lead as "Hot", "Warm", "Cold"
   - Uses form data (company size, industry, budget)
4. User adds Transform node → enriches data:
   - Adds timestamp
   - Calculates lead score
   - Formats phone number
5. User adds HTTP Request node → calls CRM API to check if lead exists
6. User adds Conditional node → checks if lead exists in CRM
7. If exists → Update CRM contact
8. If new → Create CRM contact
9. User adds MongoDB Write node → saves to "qualified_leads" collection
10. User adds Email Send node → notifies sales team
11. User tests workflow with sample data
12. User sees data transform at each step in execution view
13. User activates workflow
14. Form submission flows through entire pipeline automatically

---

## Stage 9: Monitoring & Analytics

### Story 9.1: User Views Form Analytics
**As a** user who wants to understand form performance  
**I want to** view analytics and statistics  
**So that** I can optimize my forms

**Acceptance Criteria:**
- User can see submission counts and trends
- User can see completion rates
- User can see field-level analytics
- User can export analytics data

**User Flow:**
1. User navigates to Form detail page
2. User clicks "Analytics" tab
3. User sees dashboard with:
   - Total submissions: 1,234
   - Submission trend (chart showing last 30 days)
   - Completion rate: 87%
   - Average time to complete: 3m 24s
   - Drop-off points (which page/field users abandon)
4. User clicks "Field Analytics"
5. User sees per-field statistics:
   - Most common answers for dropdown fields
   - Average values for number fields
   - Response rates for optional fields
6. User clicks "Export Analytics" → downloads CSV
7. User views "Submission Sources" → sees:
   - Direct link: 60%
   - Embed: 30%
   - QR code: 10%
8. User uses data to optimize form (removes fields with high drop-off)

---

### Story 9.2: User Monitors Workflow Health
**As a** user running critical workflows  
**I want to** monitor workflow health and performance  
**So that** I can ensure reliable automation

**Acceptance Criteria:**
- User can see workflow execution statistics
- User can see success/failure rates
- User can see execution time trends
- User can set up alerts for failures

**User Flow:**
1. User navigates to Workflow detail page
2. User clicks "Analytics" tab
3. User sees dashboard:
   - Total executions: 5,432
   - Success rate: 98.5%
   - Average execution time: 2.3s
   - Recent failures: 3 (last 24 hours)
4. User clicks "Execution History"
5. User sees list of recent executions with:
   - Status (success/failure)
   - Execution time
   - Trigger source
   - Data preview
6. User clicks failed execution → sees error details
7. User navigates to "Settings" → "Alerts"
8. User configures:
   - Alert on: Failure rate > 5%
   - Alert on: Execution time > 10s
   - Notification: Email to admin
9. User saves alert configuration
10. When failure rate exceeds threshold → user receives email alert
11. User investigates and fixes issue

---

### Story 9.3: User Tracks Application Usage
**As a** user managing multiple applications  
**I want to** see usage statistics across all applications  
**So that** I can understand overall platform usage

**Acceptance Criteria:**
- User can see application-level analytics
- User can see usage trends
- User can compare applications
- User can see resource usage

**User Flow:**
1. User navigates to Organization dashboard
2. User sees overview:
   - Total applications: 12
   - Total forms: 45
   - Total workflows: 28
   - Total submissions (last 30 days): 15,234
3. User clicks "Applications" → sees list with stats:
   - Application name
   - Submission count
   - Active workflows
   - Last activity
4. User clicks "Analytics" tab
5. User sees charts:
   - Submissions by application (bar chart)
   - Submission trends (line chart)
   - Most active applications (pie chart)
6. User filters by date range: Last 90 days
7. User exports analytics report
8. User views "Resource Usage":
   - API calls: 45,234 / 100,000 (monthly limit)
   - Storage: 2.3 GB / 10 GB
   - Workflow executions: 12,345 / unlimited
9. User upgrades plan to increase limits

---

## Stage 10: Maintenance & Optimization

### Story 10.1: User Updates Application Version
**As a** user with a published application  
**I want to** update it to a new version  
**So that** I can add features and fix bugs

**Acceptance Criteria:**
- User can version applications
- User can see version history
- User can roll back to previous version
- Users can upgrade installed applications

**User Flow:**
1. User navigates to Application detail page
2. User sees current version: "1.2.0"
3. User makes changes to forms and workflows
4. User clicks "Create New Version"
5. System prompts:
   - Version: 1.3.0 (auto-suggested)
   - Changelog: "Added email notification workflow, fixed form validation bug"
6. User creates version
7. System creates version snapshot
8. User views "Versions" tab → sees version history:
   - 1.3.0 (current) - Created 2 days ago
   - 1.2.0 - Created 1 month ago
   - 1.1.0 - Created 3 months ago
9. User clicks "1.2.0" → sees what changed
10. User clicks "Rollback" → reverts to 1.2.0
11. If application is in marketplace:
    - Users with installed app see "Update Available" notification
    - Users can upgrade to 1.3.0
    - System preserves user customizations during upgrade

---

### Story 10.2: User Optimizes Form Performance
**As a** user with slow-loading forms  
**I want to** optimize form performance  
**So that** users have a better experience

**Acceptance Criteria:**
- User can see form performance metrics
- User can identify performance bottlenecks
- User can optimize form configuration
- User can test performance improvements

**User Flow:**
1. User navigates to Form Analytics
2. User sees "Performance" section:
   - Average load time: 4.2s (needs improvement)
   - Form render time: 2.1s
   - Field count: 45 (high)
3. User clicks "Performance Recommendations"
4. System suggests:
   - Reduce field count (split into more pages)
   - Lazy load conditional fields
   - Optimize image uploads
   - Enable form caching
5. User implements recommendations:
   - Splits 45 fields into 5 pages (9 fields per page)
   - Enables lazy loading for conditional fields
   - Enables form caching
6. User tests form → sees improved load time: 1.8s
7. User publishes updated form
8. User monitors performance → sees improvement in analytics

---

### Story 10.3: User Archives Unused Applications
**As a** user with many applications  
**I want to** archive unused applications  
**So that** I can keep my workspace organized

**Acceptance Criteria:**
- User can archive applications
- Archived applications are hidden from main view
- User can restore archived applications
- User can permanently delete applications

**User Flow:**
1. User navigates to Applications page
2. User sees 20 applications
3. User filters by "Last Activity" → sees 5 applications with no activity in 6 months
4. User selects unused applications
5. User clicks "Archive" → applications are moved to archive
6. User views "Archived" filter → sees archived applications
7. User clicks application → can view but cannot edit
8. User clicks "Restore" → application returns to active list
9. User clicks "Delete Permanently" → system warns about data loss
10. User confirms deletion → application and all data are deleted
11. User receives confirmation email

---

## Summary

These user stories cover the complete journey of a NetPad user from initial discovery through advanced enterprise usage:

1. **Discovery & Onboarding** - First impressions, sign-up, and initial guidance
2. **First Application Creation** - Building and publishing first forms
3. **Workflow Automation** - Creating automated processes
4. **Data Management** - Exploring, searching, and managing data
5. **Advanced Features** - AI, conversational forms, complex applications
6. **Collaboration & Sharing** - Team collaboration and marketplace
7. **Enterprise Features** - Security, encryption, integrations
8. **Advanced Workflows** - Complex automation patterns
9. **Monitoring & Analytics** - Understanding usage and performance
10. **Maintenance & Optimization** - Keeping applications healthy and efficient

Each story demonstrates real user interactions with NetPad's features and can be used for:
- Product development planning
- User testing scenarios
- Documentation examples
- Marketing use cases
- Training materials
