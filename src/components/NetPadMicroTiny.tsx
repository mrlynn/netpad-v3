// /src/components/NetPadMicroTiny.jsx
export default function NetPadMicroTiny({ size = 20, title = "NetPad" }) {
    return (
      <svg
        id="netpad-micro-tiny"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 256 256"
        width={size}
        height={size}
        role="img"
        aria-label={title}
        className="netpad-micro netpad-micro--tiny"
      >
        <g
          id="mark"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line id="antenna-stem" x1="128" y1="46" x2="128" y2="70" strokeWidth="22" />
          <circle id="antenna-dot" cx="128" cy="30" r="20" fill="currentColor" stroke="none" />
  
          <path
            id="head-outline"
            d="M72 82 Q72 64 90 64 H166 Q184 64 184 82 V154 Q184 172 166 172 H90 Q72 172 72 154 Z"
            strokeWidth="22"
          />
  
          <circle id="eye-left" cx="108" cy="122" r="18" fill="currentColor" stroke="none" />
          <circle id="eye-right" cx="148" cy="122" r="18" fill="currentColor" stroke="none" />
        </g>
      </svg>
    );
  }