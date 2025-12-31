'use client';

import { useEffect } from 'react';
import { Box } from '@mui/material';

export default function APIDocsPage() {
  useEffect(() => {
    // Dynamically load Swagger UI
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js';
    script.onload = () => {
      // @ts-ignore
      window.SwaggerUIBundle({
        url: '/api/v1/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          // @ts-ignore
          window.SwaggerUIBundle.presets.apis,
          // @ts-ignore
          window.SwaggerUIBundle.SwaggerUIStandalonePreset,
        ],
        layout: 'BaseLayout',
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: 'list',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        syntaxHighlight: {
          activate: true,
          theme: 'monokai',
        },
      });
    };
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#fafafa',
        '& .swagger-ui': {
          fontFamily: 'inherit',
        },
        '& .swagger-ui .topbar': {
          display: 'none',
        },
        '& .swagger-ui .info': {
          margin: '20px 0',
        },
        '& .swagger-ui .info .title': {
          fontSize: '2rem',
          fontWeight: 700,
        },
        '& .swagger-ui .scheme-container': {
          bgcolor: '#fff',
          boxShadow: 'none',
          padding: '20px 0',
        },
        '& .swagger-ui .opblock-tag': {
          fontSize: '1.25rem',
          fontWeight: 600,
          borderBottom: '1px solid #e0e0e0',
        },
        '& .swagger-ui .opblock': {
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '10px',
        },
        '& .swagger-ui .opblock .opblock-summary': {
          borderRadius: '8px',
        },
        '& .swagger-ui .opblock.opblock-get': {
          borderColor: '#00ED64',
          bgcolor: 'rgba(0, 237, 100, 0.05)',
        },
        '& .swagger-ui .opblock.opblock-get .opblock-summary': {
          borderColor: '#00ED64',
        },
        '& .swagger-ui .opblock.opblock-post': {
          borderColor: '#2196f3',
          bgcolor: 'rgba(33, 150, 243, 0.05)',
        },
        '& .swagger-ui .opblock.opblock-delete': {
          borderColor: '#f44336',
          bgcolor: 'rgba(244, 67, 54, 0.05)',
        },
        '& .swagger-ui .opblock.opblock-patch': {
          borderColor: '#ff9800',
          bgcolor: 'rgba(255, 152, 0, 0.05)',
        },
        '& .swagger-ui .btn.execute': {
          bgcolor: '#00ED64',
          borderColor: '#00ED64',
          color: '#001E2B',
          fontWeight: 600,
          '&:hover': {
            bgcolor: '#00c853',
          },
        },
        '& .swagger-ui .btn.authorize': {
          borderColor: '#00ED64',
          color: '#00ED64',
          '&:hover': {
            bgcolor: 'rgba(0, 237, 100, 0.1)',
          },
        },
        '& .swagger-ui .auth-wrapper .authorize': {
          borderColor: '#00ED64',
          color: '#00ED64',
        },
      }}
    >
      {/* Custom Header */}
      <Box
        sx={{
          bgcolor: '#001E2B',
          color: '#fff',
          py: 3,
          px: 4,
          borderBottom: '3px solid #00ED64',
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                background: 'linear-gradient(135deg, #00ED64 0%, #00CC55 100%)',
                px: 2,
                py: 1,
                borderRadius: 1,
                fontWeight: 700,
                color: '#001E2B',
              }}
            >
              NetPad
            </Box>
            <Box sx={{ fontSize: '1.5rem', fontWeight: 600 }}>API Documentation</Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <a
              href="/api-playground"
              style={{
                color: '#00ED64',
                textDecoration: 'none',
                fontSize: '0.9rem',
              }}
            >
              API Playground
            </a>
            <a
              href="/settings?tab=api-keys"
              style={{
                color: 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                fontSize: '0.9rem',
              }}
            >
              Get API Key
            </a>
            <a
              href="/api/v1/openapi.json"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                fontSize: '0.9rem',
              }}
            >
              OpenAPI Spec
            </a>
            <a
              href="/"
              style={{
                color: 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                fontSize: '0.9rem',
              }}
            >
              Back to App
            </a>
          </Box>
        </Box>
      </Box>

      {/* Swagger UI Container */}
      <Box sx={{ maxWidth: 1200, mx: 'auto', py: 2 }}>
        <div id="swagger-ui" />
      </Box>
    </Box>
  );
}
