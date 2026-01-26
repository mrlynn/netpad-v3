# NetPad Google Forms Add-on

A Google Workspace Editor Add-on that allows users to export Google Forms definitions and responses directly to NetPad.

## Features

- **Export Form Definitions**: Convert Google Forms to NetPad forms with field type mapping
- **Export Responses**: Import existing Google Forms responses into NetPad
- **Secure Authentication**: Uses API keys stored securely in Google's PropertiesService
- **Card UI & Sidebar**: Modern interface that works in Google Forms editor

## Project Structure

```
google-forms-addon/
├── appsscript.json        # Google Apps Script manifest
├── Code.gs                # Main script logic
├── ExportSidebar.html     # Export form definition UI
├── ExportResponsesSidebar.html  # Export responses UI
├── SettingsSidebar.html   # Settings/configuration UI
└── README.md              # This file
```

## Development Setup

### Prerequisites

1. A Google account with access to Google Forms
2. [clasp](https://github.com/google/clasp) - Google Apps Script CLI
3. A NetPad account with API key access

### Setting Up clasp

1. Install clasp globally:
   ```bash
   npm install -g @google/clasp
   ```

2. Login to clasp:
   ```bash
   clasp login
   ```

3. Create a new Google Apps Script project:
   ```bash
   clasp create --type forms --title "NetPad Forms Exporter"
   ```

4. Push the code to Google Apps Script:
   ```bash
   clasp push
   ```

### Local Development

1. Make changes to the `.gs` and `.html` files
2. Push changes to Google Apps Script:
   ```bash
   clasp push
   ```
3. Test in Google Forms by opening any form and accessing the add-on from the Extensions menu

### Testing the Add-on

1. Open any Google Form in edit mode
2. Go to **Extensions > NetPad Forms Exporter > Export to NetPad**
3. If this is your first time, configure your API key in Settings
4. Select your organization and project, then click Export

## Deployment

### For Development/Testing

1. In the Apps Script editor, click **Deploy > Test deployments**
2. Select **Editor Add-on** as the deployment type
3. Click **Install** to install for your account only

### For Production (Google Workspace Marketplace)

1. Create a Google Cloud Project:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select an existing one
   - Enable the Google Workspace Marketplace SDK API

2. Configure OAuth Consent Screen:
   - Go to APIs & Services > OAuth consent screen
   - Choose "External" for public availability
   - Fill in application details:
     - App name: NetPad Forms Exporter
     - User support email: your email
     - App logo: Upload NetPad logo
     - Application home page: https://netpad.io
     - Privacy policy: https://netpad.io/privacy
     - Terms of service: https://netpad.io/terms
   - Add scopes:
     - `https://www.googleapis.com/auth/forms.currentonly`
     - `https://www.googleapis.com/auth/script.external_request`
     - `https://www.googleapis.com/auth/userinfo.email`

3. Configure Marketplace SDK:
   - Go to APIs & Services > Google Workspace Marketplace SDK
   - Fill in the App Configuration:
     - Application name: NetPad Forms Exporter
     - Application description: Export Google Forms to NetPad
     - Icons (16x16, 32x32, 96x96, 128x128)
     - Screenshots
     - Category: Productivity
     - Pricing: Free

4. Create versioned deployment:
   - In Apps Script editor, click **Deploy > New deployment**
   - Select **Editor Add-on**
   - Enter version description
   - Click **Deploy**

5. Submit for review:
   - Complete the Marketplace listing
   - Submit for Google review
   - Wait for approval (can take 1-2 weeks)

## API Integration

The add-on communicates with NetPad through these endpoints:

### Validation
```
POST /api/integrations/google-forms/validate
Authorization: Bearer <API_KEY>

{
  "organizationId": "org_123"
}
```

### Import Form Definition
```
POST /api/integrations/google-forms/addon-import
Authorization: Bearer <API_KEY>

{
  "organizationId": "org_123",
  "projectId": "proj_456",
  "importType": "definition",
  "formDefinition": { ... }
}
```

### Import Responses
```
POST /api/integrations/google-forms/addon-import
Authorization: Bearer <API_KEY>

{
  "organizationId": "org_123",
  "projectId": "proj_456",
  "formId": "form_789",
  "importType": "responses",
  "formResponses": { ... }
}
```

## Field Type Mapping

| Google Forms Type | NetPad Type | Confidence |
|-------------------|-------------|------------|
| TEXT | text | Exact |
| PARAGRAPH_TEXT | long_text | Exact |
| MULTIPLE_CHOICE | radio | Exact |
| CHECKBOX | checkbox_group | Exact |
| LIST | select | Exact |
| SCALE | rating | Exact |
| DATE | date | Exact |
| DATETIME | datetime | Exact |
| TIME | time | Exact |
| FILE_UPLOAD | file | Exact |
| GRID | matrix | Approximate |
| CHECKBOX_GRID | matrix | Approximate |
| DURATION | text | Approximate |

## Security Considerations

- API keys are stored in Google's PropertiesService (user-scoped, encrypted)
- All API calls use HTTPS
- API keys should have minimal required permissions
- Users control their own credentials

## Troubleshooting

### "Invalid API key" error
- Ensure your API key is active in NetPad
- Check that the key hasn't expired
- Verify you're using the correct organization ID

### Form not exporting
- Check browser console for errors
- Verify network connectivity to netpad.io
- Ensure you have edit access to the Google Form

### Responses not importing
- Verify the target NetPad form exists
- Check that field names match between Google Form and NetPad form
- Ensure you have permission to add submissions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly in Google Forms
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- Documentation: https://docs.netpad.io/integrations/google-forms
- Issues: https://github.com/netpad/netpad/issues
- Email: support@netpad.io
