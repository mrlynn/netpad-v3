# Contact Form Application - NetPad Showcase

A comprehensive, production-ready contact form application that demonstrates **all of NetPad's key capabilities**. This example showcases advanced form features, sophisticated workflow automation, MongoDB integration, and intelligent data routing.

## 🌟 What This Example Demonstrates

This application is designed to be a **stellar showcase** of NetPad's platform capabilities. It goes far beyond a simple contact form to demonstrate:

### 📝 **Advanced Form Features**

- **Multi-Page Wizard**: 3-page form with progress indicator and page titles
- **Conditional Logic**: Fields that show/hide based on inquiry type (e.g., company fields only for sales inquiries)
- **Section Headers**: Organized form layout with visual section breaks
- **Diverse Field Types**: 
  - Text fields (short_text, long_text)
  - Email and phone number fields
  - Dropdowns and radio buttons
  - Checkboxes
  - Number fields with validation
- **Field Layouts**: Half-width fields for compact, professional layouts
- **Validation**: Comprehensive validation rules (min/max length, patterns, required fields)
- **User Experience**: Placeholders, helpful descriptions, and intuitive flow

### ⚡ **Sophisticated Workflow Automation**

- **Conditional Routing**: Intelligent routing based on inquiry type and urgency
- **MongoDB Integration**: Automatic data persistence to MongoDB collections
- **Data Transformation**: Normalizes and structures form data for downstream processing
- **Parallel Execution**: Efficient workflow execution with parallel node processing
- **Multiple Email Notifications**:
  - Confirmation email to the submitter
  - Urgent alerts for high-priority inquiries
  - Sales team notifications for sales/partnership inquiries
  - General notifications for other inquiries
- **Workflow Variables**: Configurable email addresses and settings
- **Error Handling**: Retry logic with exponential backoff
- **Execution Modes**: Parallel execution for optimal performance

### 🗄️ **Data Management**

- **MongoDB Integration**: Seamless connection to MongoDB for data storage
- **Structured Data**: Well-organized document structure in MongoDB
- **Data Transformation**: Normalizes form data into consistent format

### 🎯 **Application Structure**

- **Application Contract**: Explicit API contract defining inputs, outputs, and side effects
- **Versioning**: Semantic versioning (2.0.0) with changelog support
- **Comprehensive Metadata**: Detailed manifest with setup instructions and feature list
- **Production Ready**: Error handling, retry logic, and proper configuration

## 📋 Form Structure

### Page 1: Contact Information
- Full Name (required)
- Email Address (required, validated)
- Phone Number (optional)
- Preferred Contact Method (radio: Email, Phone, Either)

### Page 2: Inquiry Details
- Inquiry Type (dropdown: General, Product, Support, Sales, Partnership, Feedback, Other)
- Subject (required)
- Message (required, 10-2000 characters)
- Urgency Level (radio, shown conditionally for support/sales inquiries)
- Company Name (conditional, shown for sales/partnership)
- Company Size (conditional, shown for sales/partnership)
- Budget (conditional, shown for sales inquiries)
- Timeline (conditional, shown for sales inquiries)

### Page 3: Additional Information
- How did you hear about us? (dropdown)
- Subscribe to newsletter (checkbox)
- Agree to terms (required checkbox)

## 🔄 Workflow Flow

```
Form Submission
    ↓
    ├─→ Save to MongoDB (contacts.submissions collection)
    ├─→ Transform Data (normalize structure)
    ├─→ Send Confirmation Email (always)
    ├─→ Check Urgency
    │   └─→ If Urgent: Send Urgent Alert Email
    └─→ Check Inquiry Type
        ├─→ If Sales/Partnership: Send Sales Team Email
        └─→ Otherwise: Send General Notification Email
```

## 🚀 Quick Start

### Prerequisites

- NetPad instance (hosted or self-hosted)
- MongoDB connection configured
- Email integration configured (SMTP or SendGrid)

### Setup Steps

1. **Import the Application Bundle**
   - Go to Applications → Click **"Import"** button
   - Upload the three template files:
     - `templates/manifest.json`
     - `templates/form.json`
     - `templates/workflow.json`
   - Click Import and wait for completion
   
   **Alternative**: Use the import script if UI import doesn't work:
   ```bash
   cd examples/simple-contact-app
   node import-bundle.js <orgId> <projectId> [baseUrl]
   ```

2. **Configure MongoDB Connection**
   - Go to Settings → Connections
   - Create or select a MongoDB connection
   - Note the connection ID

3. **Configure Email Integration**
   - Go to Settings → Integrations
   - Add SMTP or SendGrid credentials
   - Note the credential ID

4. **Update Workflow Configuration**
   - Open the workflow editor
   - Update the form trigger node: Set `formId` to your form's ID
   - Update the MongoDB write node: Set `connectionId` to your MongoDB connection ID
   - Update all email-send nodes: Set `credentialId` to your email credential ID
   - Update email addresses:
     - `contact@example.com` → Your general contact email
     - `sales@example.com` → Your sales team email
     - `urgent@example.com` → Your urgent inquiry alert email

5. **Publish and Activate**
   - Publish the form
   - Activate the workflow
   - Test with a form submission

## 📦 Application Structure

```
simple-contact-app/
├── templates/
│   ├── manifest.json      # Application metadata and contract
│   ├── form.json          # Multi-page form with conditional logic
│   └── workflow.json       # Sophisticated automation workflow
└── README.md              # This file
```

## 🎓 Learning NetPad Through This Example

This example is perfect for learning NetPad because it demonstrates:

1. **Form Building Best Practices**
   - How to structure multi-page forms
   - When and how to use conditional logic
   - Field type selection and validation
   - User experience considerations

2. **Workflow Design Patterns**
   - Conditional routing patterns
   - Data transformation strategies
   - Parallel vs sequential execution
   - Error handling and retry logic

3. **Integration Patterns**
   - MongoDB data persistence
   - Email notification systems
   - Data flow between nodes

4. **Application Architecture**
   - Contract definition
   - Versioning strategy
   - Configuration management

## 🔧 Customization

### Customize Email Templates

Edit the `body` field in email-send nodes to customize email content. Use `{{variable}}` syntax to include form data.

### Add More Routing Logic

Add additional conditional nodes to route inquiries to different teams or systems based on your needs.

### Extend Data Storage

Add more MongoDB write nodes to save data to additional collections or update existing records.

### Add Integrations

Add HTTP request nodes to integrate with external systems (CRM, ticketing systems, etc.).

## 📊 Key NetPad Capabilities Showcased

| Capability | Feature | Location |
|------------|---------|----------|
| **Forms** | Multi-page wizard | `form.json` → `multiPageConfig` |
| **Forms** | Conditional logic | `form.json` → `conditionalLogic` |
| **Forms** | Section headers | `form.json` → `layout` type fields |
| **Forms** | Field types | `form.json` → Various field types |
| **Forms** | Validation | `form.json` → `validation` objects |
| **Workflows** | Conditional routing | `workflow.json` → `conditional` nodes |
| **Workflows** | MongoDB integration | `workflow.json` → `mongodb-write` node |
| **Workflows** | Data transformation | `workflow.json` → `transform` node |
| **Workflows** | Parallel execution | `workflow.json` → `executionMode: "parallel"` |
| **Workflows** | Email notifications | `workflow.json` → `email-send` nodes |
| **Workflows** | Variables | `workflow.json` → `variables` array |
| **Applications** | Contract definition | `manifest.json` → `contract` |
| **Applications** | Versioning | `manifest.json` → `version` |

## 🧪 Testing

**📖 For detailed step-by-step testing instructions, see [TESTING.md](./TESTING.md)**

### Quick Test Scenarios

1. **General Inquiry**
   - Submit form with inquiry type "General"
   - Verify: Confirmation email sent, general notification sent, saved to MongoDB

2. **Urgent Support Request**
   - Submit form with inquiry type "Support" and urgency "Urgent"
   - Verify: Confirmation email, urgent alert email, saved to MongoDB

3. **Sales Inquiry**
   - Submit form with inquiry type "Sales" and company information
   - Verify: Confirmation email, sales team notification, saved to MongoDB

4. **Conditional Fields**
   - Test that company fields only show for sales/partnership inquiries
   - Test that urgency field only shows for support/sales inquiries

### Quick Testing Checklist

- [ ] Import application bundle
- [ ] Configure MongoDB connection (note Connection ID)
- [ ] Configure email integration (note Credential ID)
- [ ] Update workflow: Form ID, Connection ID, Credential IDs, Email addresses
- [ ] Publish form
- [ ] Activate workflow
- [ ] Test form submission
- [ ] Verify emails received
- [ ] Verify data in MongoDB
- [ ] Check workflow execution history

## 📚 Related Documentation

- [NetPad Forms Documentation](../../packages/forms/README.md)
- [NetPad Workflows Documentation](../../packages/workflows/README.md)
- [Application Contracts](../../docs/APPLICATION_CONTRACTS.md)
- [Workflow Patterns](../../docs/WORKFLOW_PATTERNS.md)

## 🤝 Contributing

This example is maintained as a showcase of NetPad's capabilities. If you have suggestions for improvements or additional features to demonstrate, please submit a PR!

## 📄 License

MIT License - See [LICENSE](../../LICENSE) for details

---

**Built with ❤️ using NetPad** - The complete platform for building MongoDB-connected applications without code.
