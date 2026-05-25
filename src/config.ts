import dotenv from 'dotenv';
dotenv.config();

function envOr(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  mockMode: (process.env.MOCK_MODE ?? 'false').toLowerCase() === 'true',
  skipSms: (process.env.SKIP_SMS ?? 'false').toLowerCase() === 'true',
  twilio: {
    username: envOr('TWILIO_ACCOUNT_SID', ''),
    password: envOr('TWILIO_AUTH_TOKEN', ''),
    accountSid: envOr('TWILIO_ACCOUNT_SID', ''),
    from: envOr('TWILIO_FROM', ''),
  },
  slack: {
    token: envOr('SLACK_BOT_TOKEN', ''),
    channel: envOr('SLACK_CHANNEL', ''),
  },
} as const;
