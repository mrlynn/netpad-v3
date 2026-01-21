# NetPad Standalone Application Template

This is a standalone application template deployed from [NetPad](https://netpad.io). It contains forms, workflows, and configuration that were packaged and deployed from the NetPad platform.

## Getting Started

### Prerequisites

- Node.js 18 or later
- MongoDB database (Atlas M0 free tier works great)

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Required
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mydb
MONGODB_DATABASE=netpad_app

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000

# For Conversational Forms (AI-powered)
OPENAI_API_KEY=sk-your-api-key-here
```

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

### Initialization

On first run, the application will show an "Initialize" button. Click it to seed your forms and workflows from the `bundle.json` file into the database.

Alternatively, call the init endpoint:

```bash
curl -X POST http://localhost:3000/api/init
```

### Production

```bash
npm run build
npm start
```

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── init/          # Initialization endpoint
│   │   │   ├── forms/         # Form data endpoint
│   │   │   └── submissions/   # Form submission endpoint
│   │   ├── forms/[slug]/      # Form rendering pages
│   │   └── page.tsx           # Home page
│   ├── components/
│   │   └── FormRenderer.tsx   # Form rendering component
│   ├── lib/
│   │   ├── db.ts              # Database connection
│   │   └── bundle.ts          # Bundle loading utilities
│   └── types/
│       └── bundle.ts          # Type definitions
├── bundle.json                # Forms, workflows, and config
├── package.json
└── vercel.json
```

## Deployment

This application is optimized for deployment on Vercel:

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

The application will auto-initialize on first request.

## Customization

### Styling

Edit `src/app/globals.css` to customize colors and styling.

### Adding Features

This is a standard Next.js 14 application. You can:

- Add new pages in `src/app/`
- Create new API routes in `src/app/api/`
- Add components in `src/components/`

### Updating Forms

To update forms or workflows:

1. Make changes in NetPad
2. Export a new bundle
3. Replace `bundle.json`
4. Redeploy or call `/api/init?force=true`

## Conversational Forms (AI-Powered)

This application supports AI-powered conversational forms. Instead of traditional form fields, users have a natural conversation with an AI assistant that guides them through information gathering.

### Setup

1. **Get an OpenAI API Key**: Sign up at [platform.openai.com](https://platform.openai.com) and create an API key.

2. **Configure the Environment Variable**:
   ```env
   OPENAI_API_KEY=sk-your-api-key-here
   ```

3. **Optional Model Selection**: By default, the application uses `gpt-4o-mini` which is cost-effective (~$0.001 per conversation turn). You can override this:
   ```env
   OPENAI_MODEL=gpt-4o  # More capable, higher cost
   ```

### Pricing Estimates

| Model | Cost per 1M tokens (input/output) | Typical conversation cost |
|-------|-----------------------------------|--------------------------|
| gpt-4o-mini | $0.15 / $0.60 | ~$0.001-0.01 |
| gpt-4o | $2.50 / $10.00 | ~$0.01-0.10 |
| gpt-3.5-turbo | $0.50 / $1.50 | ~$0.001-0.005 |

### How It Works

1. Forms configured with `conversationalConfig` in the bundle are rendered as chat interfaces
2. The AI assistant guides users through topics defined in the configuration
3. Data is extracted from the conversation and validated against the extraction schema
4. When topics are covered and confidence is high, the user can submit

### Form Configuration

Conversational forms require a `conversationalConfig` in the form definition:

```json
{
  "conversationalConfig": {
    "formType": "conversational",
    "objective": "Collect IT support ticket information",
    "topics": [
      {
        "id": "issue",
        "name": "Issue Description",
        "description": "What problem is the user experiencing?",
        "priority": "required",
        "depth": "moderate"
      }
    ],
    "persona": {
      "style": "professional"
    },
    "extractionSchema": [
      {
        "field": "issueDescription",
        "type": "string",
        "required": true,
        "description": "Description of the issue"
      }
    ],
    "conversationLimits": {
      "maxTurns": 15,
      "maxDuration": 30,
      "minConfidence": 0.8
    }
  }
}
```

## Support

For issues with this application, check:
- [NetPad Documentation](https://docs.netpad.io)
- [NetPad GitHub](https://github.com/mrlynn/netpad-v3)

---

Generated with [NetPad](https://netpad.io) - The MongoDB-powered form and workflow platform.
