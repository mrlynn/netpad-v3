# Simple Contact Form Application

A minimal example application for testing NetPad application publishing workflows.

## What's Included

- **Contact Form**: Simple 4-field contact form (name, email, subject, message)
- **Email Workflow**: Basic workflow that sends email notification on form submission
- **Bundle Structure**: Ready-to-publish application bundle

## Purpose

This application is designed specifically for:
- Testing UI-based application publishing
- Testing CLI-based npm package publishing
- Validating the marketplace review workflow
- Demonstrating minimal application structure

## Structure

```
simple-contact-app/
├── templates/
│   ├── manifest.json      # Application metadata
│   ├── form.json          # Contact form definition
│   └── workflow.json      # Email notification workflow
└── README.md
```

## Form Fields

1. **Name** (text, required)
2. **Email** (email, required)
3. **Subject** (text, required)
4. **Message** (textarea, required)

## Workflow

- **Trigger**: Form submission
- **Action**: Send email notification
- **Recipient**: `contact@example.com` (update in workflow config)

## Publishing

### Via UI

1. Import this bundle into NetPad
2. Create an application
3. Create a release
4. Publish to marketplace from the Releases tab

### Via CLI

```bash
# From the NetPad CLI
netpad publish ./examples/simple-contact-app/templates
```

### Via npm

```bash
# Package and publish
npm pack
npm publish
```

## Testing Checklist

- [ ] Import bundle into NetPad
- [ ] Verify form renders correctly
- [ ] Test form submission
- [ ] Verify workflow triggers
- [ ] Create application release
- [ ] Publish to marketplace (UI)
- [ ] Verify marketplace listing
- [ ] Test import from marketplace
- [ ] Test CLI publishing (if available)
- [ ] Test npm publishing (if available)

## Customization

Before publishing, you may want to:
- Update the email recipient in `workflow.json`
- Customize form fields for your use case
- Add more workflow actions
- Update manifest metadata
