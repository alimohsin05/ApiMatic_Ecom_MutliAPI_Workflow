import { config } from './config';
import { saveAbortedOrder, saveCompletedOrder } from './db';
import { logger } from './logger';
import { processPayment } from './services/payment';
import { postSlackNotification } from './services/slack';
import { sendSms } from './services/sms';
import { generateTrackingNumber } from './services/tracking';
import { Order, WorkflowResult } from './types';

export type WorkflowEvent =
  | { type: 'start'; order: Order }
  | { type: 'step-start'; step: number; label: string }
  | { type: 'step-success'; step: number; data: Record<string, unknown> }
  | { type: 'step-skipped'; step: number; reason: string }
  | { type: 'step-error'; step: number; message: string; fatal: boolean }
  | { type: 'complete'; result: WorkflowResult }
  | { type: 'aborted'; message: string };

export type WorkflowEventHandler = (event: WorkflowEvent) => void;

export async function runWorkflow(
  order: Order,
  onEvent: WorkflowEventHandler = () => {}
): Promise<WorkflowResult> {
  logger.header('AGENTIC WORKFLOW ENGINE — STARTING');
  logger.info('Order received', {
    product: order.product,
    price: `$${order.price}`,
    email: order.email,
    phone: order.phone,
    address: order.address,
  });
  onEvent({ type: 'start', order });

  // ── STEP 1: Payment ────────────────────────────────────────────────────────
  logger.step(1, 'Payment Processing');
  onEvent({ type: 'step-start', step: 1, label: 'Payment Processing' });
  let payment;
  try {
    payment = await processPayment(order);
    onEvent({ type: 'step-success', step: 1, data: { ...payment } });
  } catch (err) {
    const message = (err as Error).message;
    logger.error('Payment failed — workflow terminated');
    onEvent({ type: 'step-error', step: 1, message, fatal: true });
    onEvent({ type: 'aborted', message: `Aborted at Step 1: ${message}` });
    saveAbortedOrder(order, `Step 1 (Payment): ${message}`);
    throw new Error(`Workflow aborted at Step 1 (Payment): ${message}`);
  }

  // ── STEP 2: Tracking ───────────────────────────────────────────────────────
  logger.step(2, 'Shipment Tracking');
  onEvent({ type: 'step-start', step: 2, label: 'Shipment Tracking' });
  const tracking = generateTrackingNumber();
  onEvent({ type: 'step-success', step: 2, data: { ...tracking } });

  // ── STEP 3: SMS (Twilio) ───────────────────────────────────────────────────
  logger.step(3, 'SMS Notification via Twilio');
  onEvent({ type: 'step-start', step: 3, label: 'SMS Notification via Twilio' });
  let sms;
  if (config.skipSms) {
    logger.warn('SKIP_SMS enabled — bypassing Twilio step');
    sms = { messageSid: 'SM-SKIPPED', status: 'skipped' };
    onEvent({ type: 'step-skipped', step: 3, reason: 'SKIP_SMS=true' });
  } else {
    try {
      sms = await sendSms(order.phone, payment.referenceId, tracking.trackingNumber);
      onEvent({ type: 'step-success', step: 3, data: { ...sms } });
    } catch (err) {
      const message = (err as Error).message;
      logger.error('SMS failed — workflow terminated before Slack step');
      onEvent({ type: 'step-error', step: 3, message, fatal: true });
      onEvent({ type: 'aborted', message: `Aborted at Step 3: ${message}` });
      saveAbortedOrder(order, `Step 3 (SMS): ${message}`, {
        paymentRef: payment.referenceId,
        trackingNumber: tracking.trackingNumber,
      });
      throw new Error(`Workflow aborted at Step 3 (SMS): ${message}`);
    }
  }

  // ── STEP 4: Slack ──────────────────────────────────────────────────────────
  logger.step(4, 'Slack Notification');
  onEvent({ type: 'step-start', step: 4, label: 'Slack Notification' });
  let slack: WorkflowResult['slack'] = null;
  try {
    slack = await postSlackNotification(
      order.product,
      payment.referenceId,
      tracking.trackingNumber,
      'CONFIRMED'
    );
    onEvent({ type: 'step-success', step: 4, data: { ...slack } });
  } catch (err) {
    const message = (err as Error).message;
    logger.warn('Slack notification failed — workflow continues');
    logger.error('Slack error', err);
    onEvent({ type: 'step-error', step: 4, message, fatal: false });
  }

  const result: WorkflowResult = {
    order,
    payment,
    tracking,
    sms,
    slack,
    completedAt: new Date().toISOString(),
  };

  logger.header('WORKFLOW COMPLETE');
  logger.success('All steps finished', {
    paymentRef: payment.referenceId,
    trackingNumber: tracking.trackingNumber,
    smsSid: sms.messageSid,
    slackPosted: slack !== null,
    completedAt: result.completedAt,
  });
  const orderId = saveCompletedOrder(result);
  logger.info('Order persisted', { orderId });
  onEvent({ type: 'complete', result: { ...result, orderId } as WorkflowResult & { orderId: number } });

  return result;
}
