#!/bin/bash

# Load environment variables from .env.local
set -a
source .env.local 2>/dev/null || echo "Warning: .env.local not found"
set +a

# Run the TypeScript script
npx tsx scripts/rag/create-vector-index.ts "$@"
