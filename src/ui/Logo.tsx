import { useState } from "react";

export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="mark">
      <rect width="32" height="32" rx="7" fill="var(--paper-2)" stroke="var(--line-strong)" strokeWidth="1" />
      <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1 1.8" opacity="0.55" />
      <g className="mark-needle">
        <path d="M16 4.5 L18.8 16 L16 26.5 L13.2 16 Z" fill="currentColor" opacity="0.9" />
        <path d="M16 4.5 L18.8 16 H13.2 Z" fill="var(--terra)" />
      </g>
      <path d="M5.5 16 L16 13.8 L26.5 16 L16 18.2 Z" fill="currentColor" opacity="0.35" />
      <circle cx="16" cy="16" r="1.6" fill="var(--paper)" stroke="var(--ochre)" strokeWidth="0.8" />
    </svg>
  );
}
export function Logo({ compact = false }: { compact?: boolean }) {
  const [imgFailed, setImgFailed] = useState(false);
  const logoUrl = `${import.meta.env.BASE_URL}brand/logo.svg`;

  return (
    <span className="logo">
      {!imgFailed ? (
        <img
          src={logoUrl}
          alt="遇安 Logo"
          className="logo-img"
          width={30}
          height={30}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <Mark size={30} />
      )}
      <span className="logo-text">
        <b>遇安</b>
        {!compact && <small>Word Atlas</small>}
      </span>
    </span>
  );
}
