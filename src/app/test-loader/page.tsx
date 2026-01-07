'use client';

import './paddy-loader.css';

export default function TestLoaderPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="paddyLoader">
        <img src="/netpad-thinking.png" alt="Loading" className="paddyImg" />
        <div className="paddyDots" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
}
