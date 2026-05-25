import { logger } from '../logger';
import { Order, PaymentResult } from '../types';

/**
 * Mock payment processor.
 * Replace the internals with a real gateway (Stripe, PayPal, etc.) as needed.
 * The function signature and return type stay the same regardless of provider.
 */
export async function processPayment(order: Order): Promise<PaymentResult> {
  logger.info(`Processing payment for "${order.product}"`, {
    amount: `$${order.price}`,
    email: order.email,
  });

  // Simulate network latency of a real payment gateway
  await new Promise<void>((resolve) => setTimeout(resolve, 300));

  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const referenceId = `PAY-${Date.now()}-${suffix}`;

  logger.success('Payment authorised', { referenceId, amount: `$${order.price}` });

  return {
    referenceId,
    status: 'success',
    amount: order.price,
  };
}
