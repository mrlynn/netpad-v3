# CLI AI Configuration Guide

## How AI Works in the CLI

The NetPad CLI provides intelligent command interpretation using AI. When you type a natural language query or make a typo, AI helps interpret your intent.

**Important:** The CLI doesn't call AI directly. It authenticates with your NetPad server, which handles all AI calls using the server's configured AI provider.

```
┌─────────────┐      ┌─────────────────┐      ┌─────────────┐
│   CLI       │ ───► │  NetPad Server  │ ───► │  AI Provider│
│             │      │  (your API key) │      │  (OpenAI,   │
│             │      │                 │      │   Ollama,   │
│             │      │                 │      │   etc.)     │
└─────────────┘      └─────────────────┘      └─────────────┘
```

## Deployment Modes

### 1. Cloud/SaaS Mode (netpad.io)

- **AI is included** - NetPad provides the AI service
- **No configuration needed** - Just login with `netpad login`
- **Usage tracked** - AI usage may be tracked for billing/quotas

```bash
# Just works!
netpad login
netpad
> what forms do I have?  # AI interprets this
```

### 2. Self-Hosted Mode

When running your own NetPad server, you must configure an AI provider.

#### Option A: OpenAI (Recommended)

Add to your `.env.local`:

```bash
OPENAI_API_KEY=sk-...your-api-key...
OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
```

#### Option B: Ollama (Free, Local)

Run Ollama locally, then configure:

```bash
# Install Ollama: https://ollama.ai
ollama pull llama3

# Add to .env.local
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

#### Option C: Anthropic Claude

```bash
ANTHROPIC_API_KEY=sk-ant-...your-api-key...
ANTHROPIC_MODEL=claude-3-haiku-20240307  # Optional
```

#### Option D: OpenRouter (Multiple Models)

```bash
OPENROUTER_API_KEY=sk-or-...your-api-key...
OPENROUTER_MODEL=anthropic/claude-3-haiku  # Optional
```

### Checking AI Status

The CLI shows AI status on startup:

```
✓ Authenticated (org: org_xxx) | AI: openai/gpt-4o-mini
```

Or if AI is not configured:

```
✓ Authenticated (org: org_xxx)
  💡 AI interpretation disabled (no AI provider configured on server)
```

You can also check via API:

```bash
curl http://localhost:3000/api/ai/status
```

## Graceful Degradation

If AI is not available, the CLI still works - it just won't interpret natural language:

```
netpad ❯ what forms do I have?
Command not recognized: "what forms do I have?"

AI interpretation unavailable.
Use help to see available commands.

Suggestions:
  help - Show all commands
  list forms - List your forms
  ls - Browse the file system
```

## Cost Considerations

| Mode | Who Pays | Notes |
|------|----------|-------|
| Cloud SaaS | NetPad (included) | May have usage limits |
| Self-Hosted + OpenAI | You | ~$0.001 per command |
| Self-Hosted + Ollama | Free | Requires local GPU/CPU |

## Troubleshooting

### "AI interpretation unavailable"

1. Check if your server has an AI provider configured
2. Run `curl http://localhost:3000/api/ai/status` to see status
3. Add the appropriate API key to `.env.local`
4. Restart your NetPad server

### "OpenAI client not configured"

The server doesn't have `OPENAI_API_KEY` set. Either:
- Add your OpenAI API key to `.env.local`
- Or use an alternative provider (Ollama, Anthropic, OpenRouter)

### AI responses are slow

- Consider using a faster model (gpt-4o-mini vs gpt-4)
- Or use local Ollama with a smaller model
- The CLI shows a loading animation while waiting

## Security Notes

- **API keys stay on the server** - CLI never sees the AI API key
- **Server validates auth** - CLI must be logged in to use AI features
- **Usage is tracked** - All AI calls go through `aiService` with metrics
