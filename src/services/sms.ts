import { ApiError, Client, Environment, LogLevel, SmsApi } from 'twilio-api-sdk';
import { config } from '../config';
import { logger } from '../logger';
import { SmsResult } from '../types';
import { withRetry } from '../utils/retry';

export async function sendSms(
  to: string,
  paymentRef: string,
  trackingNumber: string
): Promise<SmsResult> {
  const client = new Client({
    basicAuthCredentials: {
      username: config.twilio.username, // Account SID
      password: config.twilio.password, // Auth Token
    },
    timeout: 30_000,
    environment: Environment.Production,
    logging: {
      logLevel: LogLevel.Info,
      logRequest: { logBody: false },
      logResponse: { logHeaders: false },
    },
  });

  const smsApi = new SmsApi(client);

  const body =
    `Your order has been confirmed!\n` +
    `Payment Ref: ${paymentRef}\n` +
    `Tracking Number: ${trackingNumber}\n` +
    `Track your shipment at our website.`;

  logger.info(`Sending SMS to ${to}`);

  if (config.mockMode) {
    logger.warn('MOCK_MODE enabled — simulating Twilio SMS send');
    logger.info('SMS body preview', { body });
    const messageSid = `SM-MOCK-${Date.now()}`;
    logger.success('SMS (mock) delivered', { messageSid, status: 'queued', to });
    return { messageSid, status: 'queued' };
  }

  return withRetry(async () => {
    try {
      const response = await smsApi.createMessage(
        config.twilio.accountSid, // accountSid
        to,                        // to
        undefined,                 // statusCallback
        undefined,                 // applicationSid
        undefined,                 // maxPrice
        undefined,                 // provideFeedback
        undefined,                 // attempt
        undefined,                 // validityPeriod
        undefined,                 // forceDelivery
        undefined,                 // contentRetention
        undefined,                 // addressRetention
        undefined,                 // smartEncoded
        undefined,                 // persistentAction
        undefined,                 // trafficType
        undefined,                 // shortenUrls
        undefined,                 // scheduleType
        undefined,                 // sendAt
        undefined,                 // sendAsMms
        undefined,                 // contentVariables
        undefined,                 // riskCheck
        config.twilio.from,        // from
        undefined,                 // messagingServiceSid
        body,                      // body
        undefined,                 // mediaUrl
        undefined                  // contentSid
      );

      const messageSid = response.result?.sid ?? 'unknown';
      const status = response.result?.status ?? 'sent';
      logger.success('SMS delivered', { messageSid, status, to });
      return { messageSid, status };
    } catch (err) {
      if (err instanceof ApiError) {
        logger.error('Twilio API error', `HTTP ${err.statusCode} — ${JSON.stringify(err.body)}`);
      }
      throw err;
    }
  });
}
