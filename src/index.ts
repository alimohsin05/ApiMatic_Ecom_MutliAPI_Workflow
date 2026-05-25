import { runWorkflow } from './workflow';
import { Order } from './types';

const order: Order = {
  product: 'Demo Item',
  price: 10,
  email: 'test@example.com',
  phone: '+15550000000',
  address: 'San Francisco',
};

runWorkflow(order).catch((err: Error) => {
  console.error(`\n\x1b[1m\x1b[31m[FATAL] Workflow terminated: ${err.message}\x1b[0m\n`);
  process.exit(1);
});
