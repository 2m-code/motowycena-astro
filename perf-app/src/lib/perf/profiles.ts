/**
 * Profile sieci/CPU/device do testowania.
 * Liczby zgodne z Lighthouse 12 defaults i web.dev/articles/throttling.
 */
import type { Profile } from './types.js';

const MB = 1024 * 1024;
const KB = 1024;

export const PROFILES: Record<string, Profile> = {
  'mobile-slow4g': {
    id: 'mobile-slow4g',
    label: 'Mobile / Slow 4G / CPU x4 (Lighthouse mobile default)',
    formFactor: 'PHONE',
    viewport: {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
    userAgent:
      'Mozilla/5.0 (Linux; Android 11; Moto G Power) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    cpuThrottle: 4,
    network: {
      offline: false,
      downloadThroughput: (1.6 * MB) / 8, // 1.6 Mbps
      uploadThroughput: (750 * KB) / 8,
      latency: 400,
    },
  },
  'mobile-fast4g': {
    id: 'mobile-fast4g',
    label: 'Mobile / Fast 4G / CPU x4',
    formFactor: 'PHONE',
    viewport: {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    cpuThrottle: 4,
    network: {
      offline: false,
      downloadThroughput: (9 * MB) / 8,
      uploadThroughput: (1.5 * MB) / 8,
      latency: 170,
    },
  },
  'desktop-cable': {
    id: 'desktop-cable',
    label: 'Desktop / Cable / CPU x1 (Lighthouse desktop)',
    formFactor: 'DESKTOP',
    viewport: {
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    cpuThrottle: 1,
    network: {
      offline: false,
      downloadThroughput: (10 * MB) / 8,
      uploadThroughput: (3 * MB) / 8,
      latency: 40,
    },
  },
  'no-throttle': {
    id: 'no-throttle',
    label: 'Bez throttlingu (smoke test)',
    formFactor: 'DESKTOP',
    viewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    cpuThrottle: 1,
    network: {
      offline: false,
      downloadThroughput: 0,
      uploadThroughput: 0,
      latency: 0,
    },
  },
};

export function getProfile(id: string): Profile {
  const p = PROFILES[id];
  if (!p) {
    throw new Error(
      `Nieznany profil "${id}". Dostępne: ${Object.keys(PROFILES).join(', ')}`,
    );
  }
  return p;
}

export function listProfiles(): Profile[] {
  return Object.values(PROFILES);
}
