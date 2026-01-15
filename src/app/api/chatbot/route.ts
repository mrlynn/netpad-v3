/**
 * Chatbot API Endpoint (for external embeds)
 * 
 * POST /api/chatbot
 * Alias for /api/ai/chat with CORS support for external embeds
 * 
 * This endpoint is designed for embedding the NetPad chatbot on external sites
 * like docs.netpad.io
 */

import { NextRequest, NextResponse } from 'next/server';

// CORS Configuration
const ALLOWED_ORIGINS = [
  'https://docs.netpad.io',
  'https://www.netpad.io',
  'https://netpad.io',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3001'] : []),
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : null;
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

// Re-export the chat handler with CORS support
// Import and reuse the same handler logic
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  try {
    // Import the chat handler dynamically to avoid circular dependencies
    const chatRoute = await import('../ai/chat/route');
    const chatHandler = chatRoute.POST;
    
    // Call the chat handler and get its response
    const response = await chatHandler(request);
    
    // Clone the response and add CORS headers
    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        ...Object.fromEntries(response.headers.entries()),
      },
    });
  } catch (error) {
    console.error('[Chatbot API] Error calling chat handler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}