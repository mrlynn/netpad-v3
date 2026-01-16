# Testing Guide: Contact Form Application

This guide walks you through testing the enhanced contact form application step-by-step.

## Prerequisites

Before testing, ensure you have:

- ✅ A NetPad instance running (hosted at netpad.io or self-hosted)
- ✅ A MongoDB connection configured
- ✅ An email integration configured (SMTP or SendGrid)

## Step 1: Import the Application Bundle

**Easy Method: Use the Import Button**

1. **Navigate to Applications**
   - Go to your organization → Projects → Select a project
   - Click on "Applications" in the sidebar

2. **Click the "Import" Button**
   - You'll see an **"Import"** button next to the "Create Application" button
   - Click it to open the import dialog

3. **Upload Bundle Files**
   - Drag and drop or click to browse
   - Select the three files from `examples/simple-contact-app/templates/`:
     - `manifest.json` (required)
     - `form.json` (required)
     - `workflow.json` (optional, but recommended)
   - The dialog will show which files you've selected

4. **Import**
   - Click the **"Import"** button
   - Wait for the import to complete
   - You'll see a success message with details about imported forms and workflows

5. **Verify Import**
   - The application, form, and workflow should now appear in your Applications list
   - You can view them by clicking on the application card

### Alternative: Import via API (If UI doesn't work)

**Easy Method: Use the provided script**

1. **Run the import script** (requires Node.js 18+):
   ```bash
   cd examples/simple-contact-app
   node import-bundle.js <orgId> <projectId> [baseUrl]
   ```
   
   Example:
   ```bash
   node import-bundle.js org_qpuGzFP-4Aq1-Jaw proj_abc123 http://localhost:3000
   ```
   
   **Note**: You need to be logged into NetPad in your browser for the script to work (it uses cookies).

2. **Manual API Method** (if script doesn't work):
   
   Use a tool like Postman, Insomnia, or curl:
   ```bash
   curl -X POST "http://localhost:3000/api/templates/import?orgId=YOUR_ORG_ID&projectId=YOUR_PROJECT_ID" \
     -H "Content-Type: application/json" \
     -H "Cookie: your-session-cookie" \
     -d @bundle.json
   ```
   
   Where `bundle.json` contains:
   ```json
   {
     "manifest": { ... },
     "forms": [ ... ],
     "workflows": [ ... ],
     "options": {
       "generateNewIds": true,
       "preserveSlugs": false,
       "overwriteExisting": false
     }
   }
   ```

### Alternative: Manual Creation (If import doesn't work)

If the API import doesn't work, you can manually create the form and workflow:

1. **Create the Form**
   - Go to Forms → Create Form
   - Copy the content from `templates/form.json`
   - Paste/configure the form fields manually in the form builder
   - Save and note the Form ID

2. **Create the Workflow**
   - Go to Workflows → Create Workflow
   - Copy the content from `templates/workflow.json`
   - Configure the workflow nodes manually in the workflow editor
   - Save and note the Workflow ID

3. **Associate with Application**
   - Go back to your Application
   - The forms and workflows should be automatically associated if created within the application context
   - Or manually link them in the application settings

## Step 3: Configure MongoDB Connection

1. **Go to Settings**
   - Click on your profile/avatar → Settings
   - Or navigate to `/settings?tab=connections`

2. **Create/Select Connection**
   - Go to the "Connections" tab
   - Either create a new MongoDB connection or use an existing one
   - **Important**: Note the Connection ID (it will look like `vault_xxxxx`)

3. **Test Connection**
   - Click "Test Connection" to verify it works
   - Ensure the connection has write permissions

## Step 4: Configure Email Integration

1. **Go to Integrations Settings**
   - In Settings, go to the "Integrations" tab
   - Or navigate to `/settings?tab=integrations`

2. **Add Email Credentials**
   - Click "Add Integration" or "New Credential"
   - Choose either:
     - **SMTP**: Enter your SMTP server details
     - **SendGrid**: Enter your SendGrid API key
   - **Important**: Note the Credential ID (it will look like `intcred_xxxxx`)

3. **Test Email**
   - Use the test function to verify email sending works

## Step 5: Update Workflow Configuration

1. **Open the Workflow**
   - Go to Applications → Your Contact Form Application
   - Click on the workflow (should be named "Contact Form Automation")
   - This opens the workflow editor

2. **Update Form Trigger Node**
   - Click on the "Contact Form Submitted" node (trigger node)
   - In the configuration panel, find `formId`
   - Replace `YOUR_FORM_ID_HERE` with your actual form ID
   - **To find your form ID**: 
     - Go to Forms section
     - Click on your contact form
     - The ID is in the URL or form settings

3. **Update MongoDB Write Node**
   - Click on the "Save to Database" node
   - Find `connectionId` in the configuration
   - Replace `YOUR_CONNECTION_ID_HERE` with your MongoDB connection ID (from Step 2)

4. **Update Email Nodes**
   - Click on each email-send node:
     - "Send Confirmation"
     - "Urgent Alert"
     - "Sales Team Notification"
     - "General Notification"
   - For each node, find `credentialId`
   - Replace `YOUR_EMAIL_CREDENTIAL_ID_HERE` with your email credential ID (from Step 3)

5. **Update Email Addresses**
   - **Send Confirmation**: Already uses `{{trigger.payload.data.email}}` (auto-filled)
   - **Urgent Alert**: Change `urgent@example.com` to your urgent alert email
   - **Sales Team Notification**: Change `sales@example.com` to your sales team email
   - **General Notification**: Change `contact@example.com` to your general contact email

6. **Save the Workflow**
   - Click "Save" in the workflow editor
   - The workflow should now be configured

## Step 6: Publish the Form

1. **Open the Form**
   - Go to Forms section
   - Click on your contact form

2. **Publish**
   - Click "Publish" button
   - Choose publishing options:
     - Public URL (for testing)
     - Custom slug (optional)
   - Copy the published form URL

## Step 7: Activate the Workflow

1. **Activate Workflow**
   - Go back to the workflow editor
   - Click "Activate" or toggle the workflow status to "Active"
   - The workflow should now be listening for form submissions

## Step 8: Test Form Submissions

### Test 1: General Inquiry

**Purpose**: Test basic form submission and general notification flow

1. **Open the published form URL**
2. **Fill out the form**:
   - Page 1: Name, Email, Phone (optional), Preferred Contact
   - Page 2: 
     - Inquiry Type: **"General Question"**
     - Subject: "Test General Inquiry"
     - Message: "This is a test of the general inquiry flow"
     - (Urgency field should NOT appear)
   - Page 3: How did you hear, Newsletter (optional), Agree to terms ✓
3. **Submit the form**
4. **Verify**:
   - ✅ Form submission succeeds
   - ✅ Confirmation email received at your email address
   - ✅ General notification email sent to `contact@example.com`
   - ✅ Data saved to MongoDB collection `contacts.submissions`
   - ✅ Workflow execution shows in workflow history

### Test 2: Urgent Support Request

**Purpose**: Test conditional routing for urgent inquiries

1. **Open the form again**
2. **Fill out the form**:
   - Page 1: Name, Email, etc.
   - Page 2:
     - Inquiry Type: **"Technical Support"**
     - Subject: "URGENT: System Down"
     - Message: "This is an urgent test"
     - Urgency: **"🔴 Urgent - Immediate attention needed"**
   - Page 3: Complete remaining fields
3. **Submit the form**
4. **Verify**:
   - ✅ Confirmation email received
   - ✅ **Urgent alert email** sent to `urgent@example.com`
   - ✅ General notification also sent
   - ✅ Data saved to MongoDB with `urgency: "urgent"`

### Test 3: Sales Inquiry with Conditional Fields

**Purpose**: Test conditional field visibility and sales routing

1. **Open the form again**
2. **Fill out the form**:
   - Page 1: Name, Email, etc.
   - Page 2:
     - Inquiry Type: **"Sales Inquiry"**
     - Subject: "Interested in Your Product"
     - Message: "I'd like to learn more"
     - **Company Name**: "Acme Corp" (should appear)
     - **Company Size**: "51-200 employees" (should appear)
     - **Budget**: 50000 (should appear)
     - **Timeline**: "Within 3 months" (should appear)
     - Urgency: "Medium" (should appear)
   - Page 3: Complete remaining fields
3. **Submit the form**
4. **Verify**:
   - ✅ Confirmation email received
   - ✅ **Sales team notification** sent to `sales@example.com`
   - ✅ Data saved to MongoDB with company information
   - ✅ Conditional fields were visible and saved

### Test 4: Partnership Inquiry

**Purpose**: Test another conditional routing path

1. **Open the form again**
2. **Fill out the form**:
   - Inquiry Type: **"Partnership Opportunity"**
   - Include company information
3. **Submit the form**
4. **Verify**:
   - ✅ Sales team notification sent (partnerships route to sales)

## Step 9: Verify MongoDB Data

1. **Go to Data Browser**
   - Navigate to Data section in NetPad
   - Or go to `/orgs/[orgId]/projects/[projectId]/data`

2. **Check Collection**
   - Navigate to database: `contacts`
   - Navigate to collection: `submissions`
   - You should see all your test submissions

3. **Verify Data Structure**
   - Each document should have:
     - `name`, `email`, `phone`
     - `inquiryType`, `subject`, `message`
     - `urgency` (if provided)
     - `companyName`, `companySize` (if provided)
     - `submittedAt`, `status: "new"`

## Step 10: Check Workflow Execution

1. **View Workflow History**
   - Go to the workflow editor
   - Click on "Executions" or "History" tab
   - You should see execution records for each form submission

2. **Inspect Execution Details**
   - Click on an execution to see:
     - Which nodes executed
     - Execution time for each node
     - Data passed between nodes
     - Any errors (if any occurred)

3. **Verify Node Execution**
   - ✅ Form trigger fired
   - ✅ MongoDB write completed
   - ✅ Data transformation completed
   - ✅ Appropriate email nodes executed based on routing

## Troubleshooting

### Form Not Submitting

- **Check**: Form is published
- **Check**: All required fields are filled
- **Check**: Validation rules are met
- **Check**: Browser console for errors

### Workflow Not Triggering

- **Check**: Workflow is activated
- **Check**: Form ID in trigger node matches actual form ID
- **Check**: Workflow execution history for errors
- **Check**: Form submission actually completed

### Emails Not Sending

- **Check**: Email credential ID is correct
- **Check**: Email integration is configured and tested
- **Check**: Email addresses are valid
- **Check**: Workflow execution logs for email node errors
- **Check**: Spam folder for emails

### MongoDB Write Failing

- **Check**: Connection ID is correct
- **Check**: MongoDB connection is active and tested
- **Check**: Database and collection names are correct
- **Check**: Connection has write permissions
- **Check**: Workflow execution logs for MongoDB node errors

### Conditional Fields Not Showing

- **Check**: Form configuration has conditional logic set
- **Check**: You're selecting the correct inquiry type
- **Check**: Browser console for JavaScript errors
- **Check**: Form is using the latest version

### Conditional Routing Not Working

- **Check**: Conditional node configuration
- **Check**: Field paths in conditions match form field paths
- **Check**: Operator and values are correct
- **Check**: Workflow execution shows which branch was taken

## Quick Test Checklist

- [ ] Application created successfully
- [ ] Forms and workflows imported/created
- [ ] MongoDB connection configured
- [ ] Email integration configured
- [ ] Workflow form ID updated
- [ ] Workflow connection ID updated
- [ ] Workflow email credential IDs updated
- [ ] Email addresses updated
- [ ] Form published
- [ ] Workflow activated
- [ ] General inquiry test passed
- [ ] Urgent inquiry test passed
- [ ] Sales inquiry test passed
- [ ] Conditional fields visible
- [ ] Data saved to MongoDB
- [ ] Emails received
- [ ] Workflow executions visible

## Next Steps

Once testing is complete:

1. **Customize for Production**
   - Update email addresses to production addresses
   - Configure proper MongoDB database/collection names
   - Set up proper error monitoring
   - Configure retry policies if needed

2. **Enhance Further**
   - Add more conditional routing logic
   - Integrate with CRM systems
   - Add webhook notifications
   - Set up scheduled reports

3. **Deploy**
   - Create an application release
   - Publish to marketplace (optional)
   - Share with your team

## Need Help?

- Check the main [README.md](./README.md) for more details
- Review NetPad documentation
- Check workflow execution logs for detailed error messages
- Verify all configuration IDs are correct

---

**Happy Testing! 🚀**
