'use client';

import { Suspense } from 'react';
import { StandaloneChat } from '@/components/Chat/StandaloneChat';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { useSearchParams } from 'next/navigation';
import { CircularProgress, Box } from '@mui/material';

function ChatPageContent() {
  const searchParams = useSearchParams();
  
  // Accept query parameters from external systems
  const initialMessage = searchParams.get('message') || searchParams.get('q') || undefined;
  const title = searchParams.get('title') || undefined;
  
  return (
    <StandaloneChat
      initialMessage={initialMessage || undefined}
      title={title}
    />
  );
}

export default function ChatPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppNavBar />
      <Suspense
        fallback={
          <Box
            sx={{
              minHeight: 'calc(100vh - 64px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress />
          </Box>
        }
      >
        <ChatPageContent />
      </Suspense>
    </Box>
  );
}