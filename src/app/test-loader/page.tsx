'use client';

import NetPadMicroTiny from '@/components/NetPadMicroTiny';
import '@/styles/netpad-micro.css';

export default function TestLoaderPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900">
      <div className="flex items-center gap-3">
        <NetPadMicroTiny size={24} />
        <span className="text-sm font-medium">Thinking…</span>
      </div>
    </div>
  );
}