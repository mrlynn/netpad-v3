import { NextRequest, NextResponse } from 'next/server';
import { generateFilterFromQuery, FilterGenerationRequest } from '@/lib/ai/filterQueryGenerator';

export async function POST(request: NextRequest) {
  try {
    const body: FilterGenerationRequest = await request.json();

    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    const result = await generateFilterFromQuery(body);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in generate-filter API:', error);

    // Provide more helpful error messages
    let errorMessage = 'Failed to generate filter query';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}
