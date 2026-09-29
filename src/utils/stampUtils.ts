/**
 * Utility functions for loading and exporting the authentic
 * West-Coast Pharmaceutical Works Ltd. rubber stamp seal image (Picture1_s-removebg-preview.png).
 * Uses the exact stamp image directly for document display and DOCX exports.
 */

import { DEFAULT_STAMP_BASE64, DEFAULT_STAMP_DATA_URL } from './stampBase64';

export const STAMP_STORAGE_KEY = 'custom_stamp_image';
export const DEFAULT_STAMP_PATH = '/Picture1_s-removebg-preview.png';

export interface StampOptions {
  size?: number;
  rotationDeg?: number;
}

/**
 * Returns the active stamp image URL (either user uploaded from localStorage or default image data url)
 */
export function getActiveStampImageUrl(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const custom = window.localStorage.getItem(STAMP_STORAGE_KEY);
    if (custom && custom.startsWith('data:image')) {
      return custom;
    }
  }
  return DEFAULT_STAMP_DATA_URL;
}

/**
 * Saves a custom stamp data URL (e.g. when user selects Picture1_s-removebg-preview.png)
 */
export function setActiveStampImage(dataUrl: string | null): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (dataUrl) {
      window.localStorage.setItem(STAMP_STORAGE_KEY, dataUrl);
    } else {
      window.localStorage.removeItem(STAMP_STORAGE_KEY);
    }
    window.dispatchEvent(new Event('stamp_updated'));
  }
}

/**
 * Returns a data URL or path of the stamp image
 */
export function getWestCoastStampPngDataUrl(_size: number = 240): string {
  return getActiveStampImageUrl();
}

/**
 * Returns a Uint8Array of the stamp PNG for embedding directly into DOCX ImageRun
 */
export async function getWestCoastStampUint8Array(_size: number = 240): Promise<Uint8Array | null> {
  // 1. Check browser localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    const custom = window.localStorage.getItem(STAMP_STORAGE_KEY);
    if (custom && custom.includes(';base64,')) {
      try {
        const b64 = custom.split(';base64,')[1];
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
          bytes[i] = bin.charCodeAt(i);
        }
        return bytes;
      } catch (e) {
        console.warn('Failed to parse custom stamp base64:', e);
      }
    }
  }

  // 2. Return pre-encoded base64 bytes directly
  try {
    const bin = atob(DEFAULT_STAMP_BASE64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  } catch (err) {
    console.warn('Failed to decode default stamp base64:', err);
  }

  return null;
}

