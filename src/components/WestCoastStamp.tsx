import React, { useState, useEffect } from 'react';
import { getActiveStampImageUrl } from '../utils/stampUtils';

interface WestCoastStampProps {
  /** Size in pixels (width and height). Defaults to 64px. */
  size?: number;
  /** Authentic ink rotation in degrees. Defaults to -4.5deg matching manual stamp. */
  rotateDeg?: number;
  /** Whether to overlay the Plant Head blue ink signature across/beside the stamp. */
  withSignature?: boolean;
  /** Optional custom CSS classes */
  className?: string;
}

/**
 * Authentic West-Coast Pharmaceutical Works Ltd. Circular Rubber Stamp Image.
 * Uses the exact stamp image (Picture1_s-removebg-preview.png).
 */
export const WestCoastStamp: React.FC<WestCoastStampProps> = ({
  size = 64,
  rotateDeg = -4.5,
  withSignature = false,
  className = '',
}) => {
  const [stampUrl, setStampUrl] = useState<string>(() => getActiveStampImageUrl());

  useEffect(() => {
    const handleUpdate = () => {
      setStampUrl(getActiveStampImageUrl());
    };
    window.addEventListener('stamp_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('stamp_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      title="WEST-COAST PHARMACEUTICAL WORKS LTD. AHMEDABAD"
    >
      {/* Real Stamp Image */}
      <img
        src={stampUrl}
        alt="WEST-COAST PHARMACEUTICAL WORKS LTD. Stamp"
        className="w-full h-full object-contain pointer-events-none transition-transform duration-200"
        style={{
          transform: `rotate(${rotateDeg}deg)`,
          transformOrigin: 'center center',
          filter: 'contrast(1.08) drop-shadow(0 0.5px 0.5px rgba(29, 35, 123, 0.15))',
        }}
        onError={(e) => {
          // Fallback to /stamp.png if not loaded
          const target = e.currentTarget;
          if (!target.src.endsWith('/stamp.png')) {
            target.src = '/stamp.png';
          }
        }}
        referrerPolicy="no-referrer"
      />

      {/* Optional Plant Head blue ink signature overlay */}
      {withSignature && (
        <svg
          viewBox="0 0 100 60"
          className="absolute inset-0 w-full h-full text-blue-700 pointer-events-none"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M 46 22 C 34 20 32 36 44 38 C 52 39 56 22 66 24 C 74 26 78 38 68 44 C 62 47 52 45 74 38 C 86 34 94 28 98 25"
            stroke="#1d4ed8"
            strokeWidth="2.4"
          />
          <path d="M 60 20 C 58 35 62 42 66 45" stroke="#1d4ed8" strokeWidth="2.2" />
        </svg>
      )}
    </div>
  );
};

