const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BLUE = '\x1b[34m';

export const logger = {
  header(title: string): void {
    const line = '═'.repeat(60);
    console.log(`\n${BOLD}${CYAN}${line}${RESET}`);
    console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
    console.log(`${BOLD}${CYAN}${line}${RESET}\n`);
  },

  step(step: number, label: string): void {
    console.log(`\n${BOLD}${BLUE}[STEP ${step}] ${label}${RESET}`);
    console.log(`${BLUE}${'─'.repeat(50)}${RESET}`);
  },

  info(message: string, data?: unknown): void {
    const suffix = data !== undefined ? ` ${JSON.stringify(data)}` : '';
    console.log(`${CYAN}  ℹ  ${message}${suffix}${RESET}`);
  },

  success(message: string, data?: unknown): void {
    const suffix = data !== undefined ? ` ${JSON.stringify(data)}` : '';
    console.log(`${GREEN}  ✓  ${message}${suffix}${RESET}`);
  },

  warn(message: string): void {
    console.log(`${YELLOW}  ⚠  ${message}${RESET}`);
  },

  error(message: string, err?: unknown): void {
    const detail = err instanceof Error ? err.message : String(err ?? '');
    console.error(`${RED}  ✗  ${message}${detail ? ` — ${detail}` : ''}${RESET}`);
  },
};
