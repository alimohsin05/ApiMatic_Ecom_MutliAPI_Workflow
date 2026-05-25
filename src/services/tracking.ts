import { logger } from '../logger';
import { TrackingResult } from '../types';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateTrackingNumber(): TrackingResult {
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += CHARS[Math.floor(Math.random() * CHARS.length)];
  }

  const trackingNumber = `TRK-${suffix}`;
  logger.success('Tracking number generated', { trackingNumber });
  return { trackingNumber };
}
