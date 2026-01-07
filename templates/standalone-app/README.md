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

## Support

For issues with this application, check:
- [NetPad Documentation](https://docs.netpad.io)
- [NetPad GitHub](https://github.com/mrlynn/netpad-v3)

---

Generated with [NetPad](https://netpad.io) - The MongoDB-powered form and workflow platform.
