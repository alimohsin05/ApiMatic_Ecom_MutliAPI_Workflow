export interface Order {
  product: string;
  price: number;
  email: string;
  phone: string;
  address: string;
}

export interface PaymentResult {
  referenceId: string;
  status: 'success' | 'failed';
  amount: number;
}

export interface TrackingResult {
  trackingNumber: string;
}

export interface SmsResult {
  messageSid: string;
  status: string;
}

export interface SlackResult {
  ts: string;
  channel: string;
}

export interface WorkflowResult {
  order: Order;
  payment: PaymentResult;
  tracking: TrackingResult;
  sms: SmsResult;
  slack: SlackResult | null;
  completedAt: string;
}
