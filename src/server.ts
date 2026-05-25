import express, { Request, Response } from 'express';
import path from 'path';
import { runWorkflow } from './workflow';
import { listOrders } from './db';
import { Order } from './types';

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/orders', (_req: Request, res: Response) => {
  res.json({ orders: listOrders(50) });
});

app.post('/api/run', async (req: Request, res: Response) => {
  const { product, price, email, phone, address } = req.body ?? {};

  if (
    typeof product !== 'string' ||
    typeof price !== 'number' ||
    typeof email !== 'string' ||
    typeof phone !== 'string' ||
    typeof address !== 'string'
  ) {
    res.status(400).json({ error: 'Invalid order payload' });
    return;
  }

  const order: Order = { product, price, email, phone, address };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await runWorkflow(order, send);
  } catch (err) {
    send({ type: 'fatal', message: (err as Error).message });
  } finally {
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`\n  Agentic Workflow demo UI → http://localhost:${PORT}\n`);
});
