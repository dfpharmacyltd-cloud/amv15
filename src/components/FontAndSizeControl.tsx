import React from 'react';
import { FontFamilyType, FontSizePt } from '../types';

interface FontAndSizeControlProps {
  fontFamily: FontFamilyType;
  fontSize: FontSizePt;
  onFontFamilyChange: (font: FontFamilyType) => void;
  onFontSizeChange: (size: FontSizePt) => void;
  className?: string;
  label?: string;
}

const FONT_OPTIONS: { label: string; value: FontFamilyType }[] = [
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Calibri', value: 'Calibri' },
  { label: 'Segoe UI', value: 'Segoe UI' },
  { label: 'Cambria', value: 'Cambria' },
  { label: 'Georgia', value: 'Georgia' },
];

const SIZE_OPTIONS: FontSizePt[] = [9, 10, 11, 12, 13, 14, 16];

export const FontAndSizeControl: React.FC<FontAndSizeControlProps> = ({
  fontFamily,
  fontSize,
  onFontFamilyChange,
  onFontSizeChange,
  className = '',
  label,
}) => {
  return (
    <div className={`inline-flex items-center gap-1.5 p-1 bg-zinc-200/80 border border-zinc-300 rounded-lg shadow-2xs ${className}`}>
      {label && (
        <span className="text-[11px] font-semibold text-zinc-600 px-1 hidden sm:inline select-none">
          {label}:
        </span>
      )}
      {/* Font Family Dropdown - matching user uploaded image */}
      <div className="relative">
        <select
          value={fontFamily}
          onChange={(e) => onFontFamilyChange(e.target.value as FontFamilyType)}
          className="appearance-none bg-white border border-zinc-400 hover:border-zinc-500 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 rounded px-2.5 py-1 pr-6 text-xs sm:text-[13px] font-medium text-zinc-800 shadow-2xs cursor-pointer focus:outline-none transition-colors"
          style={{ fontFamily: fontFamily === 'Times New Roman' ? '"Times New Roman", Times, serif' : fontFamily }}
          title="Select Document Font Family (Default: Times New Roman)"
        >
          {FONT_OPTIONS.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              style={{ fontFamily: opt.value === 'Times New Roman' ? '"Times New Roman", Times, serif' : opt.value }}
            >
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-zinc-600">
          <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>

      {/* Font Size Dropdown - matching user uploaded image */}
      <div className="relative">
        <select
          value={fontSize}
          onChange={(e) => onFontSizeChange(Number(e.target.value) as FontSizePt)}
          className="appearance-none bg-white border border-zinc-400 hover:border-zinc-500 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 pr-5 text-xs sm:text-[13px] font-medium text-zinc-800 shadow-2xs cursor-pointer focus:outline-none transition-colors w-14 text-center"
          title="Select Base Document Font Size in pt (Default: 12)"
        >
          {SIZE_OPTIONS.map((sz) => (
            <option key={sz} value={sz}>
              {sz}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-zinc-600">
          <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
    </div>
  );
};
