import { config } from '../config';
import { logger } from '../logger';
import { SlackResult } from '../types';

export async function postSlackNotification(
  product: string,
  paymentRef: string,
  trackingNumber: string,
  orderStatus: string
): Promise<SlackResult> {
  const text =
    `*New Order Update*\n` +
    `• Product: ${product}\n` +
    `• Payment Ref: \`${paymentRef}\`\n` +
    `• Tracking: \`${trackingNumber}\`\n` +
    `• Status: *${orderStatus}*`;

  logger.info(`Posting notification to Slack channel: ${config.slack.channel || '(unset)'}`);

  if (config.mockMode) {
    logger.warn('MOCK_MODE enabled — simulating Slack chat.postMessage');
    logger.info('Slack message preview', { text });
    const ts = `${Date.now() / 1000}`;
    const channel = config.slack.channel || 'C-MOCK';
    logger.success('Slack message (mock) posted', { ts, channel });
    return { ts, channel };
  }

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${config.slack.token}`,
    },
    body: JSON.stringify({
      channel: config.slack.channel,
      text,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    logger.error('Slack HTTP error', `HTTP ${response.status} — ${errBody}`);
    throw new Error(`Slack request failed: HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    ok: boolean;
    error?: string;
    ts?: string;
    channel?: string;
  };

  if (!data.ok) {
    logger.error('Slack API error', data.error ?? 'unknown');
    throw new Error(`Slack chat.postMessage failed: ${data.error ?? 'unknown'}`);
  }

  const ts = data.ts ?? '';
  const channel = data.channel ?? config.slack.channel;
  logger.success('Slack message posted', { ts, channel });
  return { ts, channel };
}
