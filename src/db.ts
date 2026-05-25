import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { Order, WorkflowResult } from './types';

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'workflow.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL,
    product TEXT NOT NULL,
    price REAL NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    payment_ref TEXT,
    tracking_number TEXT,
    sms_sid TEXT,
    sms_status TEXT,
    slack_ts TEXT,
    slack_channel TEXT,
    aborted_reason TEXT,
    raw_json TEXT NOT NULL
  )
`);

const insertStmt = db.prepare(`
  INSERT INTO orders (
    created_at, completed_at, status,
    product, price, email, phone, address,
    payment_ref, tracking_number,
    sms_sid, sms_status,
    slack_ts, slack_channel,
    aborted_reason, raw_json
  ) VALUES (
    @created_at, @completed_at, @status,
    @product, @price, @email, @phone, @address,
    @payment_ref, @tracking_number,
    @sms_sid, @sms_status,
    @slack_ts, @slack_channel,
    @aborted_reason, @raw_json
  )
`);

const listStmt = db.prepare(`
  SELECT id, created_at, completed_at, status,
         product, price, email, phone, address,
         payment_ref, tracking_number,
         sms_sid, sms_status,
         slack_ts, slack_channel, aborted_reason
  FROM orders
  ORDER BY id DESC
  LIMIT ?
`);

export function saveCompletedOrder(result: WorkflowResult): number {
  const info = insertStmt.run({
    created_at: new Date().toISOString(),
    completed_at: result.completedAt,
    status: 'completed',
    product: result.order.product,
    price: result.order.price,
    email: result.order.email,
    phone: result.order.phone,
    address: result.order.address,
    payment_ref: result.payment.referenceId,
    tracking_number: result.tracking.trackingNumber,
    sms_sid: result.sms.messageSid,
    sms_status: result.sms.status,
    slack_ts: result.slack?.ts ?? null,
    slack_channel: result.slack?.channel ?? null,
    aborted_reason: null,
    raw_json: JSON.stringify(result),
  });
  return Number(info.lastInsertRowid);
}

export function saveAbortedOrder(
  order: Order,
  reason: string,
  partial: {
    paymentRef?: string | null;
    trackingNumber?: string | null;
    smsSid?: string | null;
    smsStatus?: string | null;
  } = {}
): number {
  const now = new Date().toISOString();
  const info = insertStmt.run({
    created_at: now,
    completed_at: null,
    status: 'aborted',
    product: order.product,
    price: order.price,
    email: order.email,
    phone: order.phone,
    address: order.address,
    payment_ref: partial.paymentRef ?? null,
    tracking_number: partial.trackingNumber ?? null,
    sms_sid: partial.smsSid ?? null,
    sms_status: partial.smsStatus ?? null,
    slack_ts: null,
    slack_channel: null,
    aborted_reason: reason,
    raw_json: JSON.stringify({ order, reason, partial, at: now }),
  });
  return Number(info.lastInsertRowid);
}

export interface OrderRow {
  id: number;
  created_at: string;
  completed_at: string | null;
  status: string;
  product: string;
  price: number;
  email: string;
  phone: string;
  address: string;
  payment_ref: string | null;
  tracking_number: string | null;
  sms_sid: string | null;
  sms_status: string | null;
  slack_ts: string | null;
  slack_channel: string | null;
  aborted_reason: string | null;
}

export function listOrders(limit = 50): OrderRow[] {
  return listStmt.all(limit) as OrderRow[];
}
