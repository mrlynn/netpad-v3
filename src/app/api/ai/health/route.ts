/**
 * AI/LLM Health Check Endpoint
 *
 * GET /api/ai/health - Check AI/LLM provider configuration and connectivity
 *
 * Tests which LLM provider is configured (OpenAI, Ollama, etc.)
 * and verifies it's available and working.
 */

import { NextResponse } from 'next/server';
import { createDefaultProvider, getProviderConfigFromEnv } from '@/lib/ai/providers';
import { ProviderError } from '@/lib/ai/providers/base';

interface AIHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'not_configured';
  timestamp: string;
  provider?: {
    type: 'openai' | 'ollama' | 'openrouter';
    name: string;
    configured: boolean;
    available: boolean;
    baseURL?: string;
    defaultModel?: string;
    error?: string;
  };
  test?: {
    completed: boolean;
    success: boolean;
    responseTime?: number;
    error?: string;
    sampleResponse?: string;
  };
  models?: {
    available: boolean;
    count?: number;
    models?: string[];
    error?: string;
  };
  environment: {
    openaiConfigured: boolean;
    ollamaConfigured: boolean;
    openrouterConfigured: boolean;
    activeProvider: 'openai' | 'ollama' | 'openrouter' | 'none';
  };
}

export async function GET() {
  const startTime = Date.now();
  const health: AIHealthStatus = {
    status: 'not_configured',
    timestamp: new Date().toISOString(),
    environment: {
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      ollamaConfigured: !!process.env.OLLAMA_BASE_URL,
      openrouterConfigured: !!process.env.OPENROUTER_API_KEY,
      activeProvider: 'none',
    },
  };

  try {
    // Get provider configuration from environment
    const providerConfig = getProviderConfigFromEnv();
    
    if (!providerConfig) {
      health.status = 'not_configured';
      return NextResponse.json(health, { status: 200 });
    }

    // Create provider instance
    const provider = createDefaultProvider();
    
    if (!provider) {
      health.status = 'not_configured';
      return NextResponse.json(health, { status: 200 });
    }

    health.environment.activeProvider = providerConfig.type;
    health.provider = {
      type: providerConfig.type,
      name: providerConfig.type === 'openai' ? 'OpenAI' 
            : providerConfig.type === 'ollama' ? 'Ollama' 
            : 'OpenRouter',
      configured: true,
      available: false,
      baseURL: providerConfig.baseURL,
      defaultModel: providerConfig.defaultModel,
    };

    // Test provider availability
    try {
      const isAvailable = await provider.isAvailable();
      health.provider.available = isAvailable;
      
      if (!isAvailable) {
        health.status = 'unhealthy';
        health.provider.error = 'Provider is not reachable or not responding';
        return NextResponse.json(health, { status: 200 });
      }
    } catch (error) {
      health.status = 'unhealthy';
      health.provider.available = false;
      health.provider.error = error instanceof Error ? error.message : 'Unknown error checking availability';
      return NextResponse.json(health, { status: 200 });
    }

    // Get available models
    try {
      const testStartTime = Date.now();
      const models = await provider.getAvailableModels();
      const modelsTime = Date.now() - testStartTime;
      
      health.models = {
        available: true,
        count: models.length,
        models: models.slice(0, 10), // Limit to first 10 for response size
      };

      if (modelsTime > 3000) {
        health.status = 'degraded';
      }
    } catch (error) {
      health.models = {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error fetching models',
      };
      health.status = 'degraded';
    }

    // Test with a simple chat request
    try {
      const testStartTime = Date.now();
      const testMessage = 'Say "OK" if you can read this.';
      
      let responseText = '';
      const stream = provider.streamChat(
        [
          { role: 'user', content: testMessage },
        ],
        {
          maxTokens: 10,
          temperature: 0.1,
        }
      );

      // Collect first few chunks
      let chunkCount = 0;
      for await (const chunk of stream) {
        responseText += chunk;
        chunkCount++;
        if (chunkCount >= 3 || responseText.length >= 20) {
          break; // Just test connectivity, don't wait for full response
        }
      }

      const responseTime = Date.now() - testStartTime;
      
      health.test = {
        completed: true,
        success: true,
        responseTime,
        sampleResponse: responseText.trim() || 'Response received',
      };

      // Determine overall status
      if (responseTime > 5000) {
        health.status = 'degraded';
      } else {
        health.status = 'healthy';
      }
    } catch (error) {
      health.test = {
        completed: true,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during test',
      };
      
      if (error instanceof ProviderError) {
        health.provider.error = error.message;
      }
      
      health.status = 'unhealthy';
    }
  } catch (error) {
    health.status = 'unhealthy';
    if (!health.provider) {
      health.provider = {
        type: 'openai',
        name: 'Unknown',
        configured: false,
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } else {
      health.provider.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  // At this point, if status was 'not_configured', we would have returned early
  // So status can only be 'healthy' | 'degraded' | 'unhealthy'
  const httpStatus = health.status === 'healthy' || health.status === 'degraded' 
    ? 200 
    : 503;

  return NextResponse.json(health, {
    status: httpStatus,
    headers: {
      'Content-Type': 'application/json',
      'X-Health-Status': health.status,
    },
  });
}