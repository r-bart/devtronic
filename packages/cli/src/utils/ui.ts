import chalk from 'chalk';

// ---------------------------------------------------------------------------
// 256-color grays for logo gradient (visible on both light & dark terminals)
// ---------------------------------------------------------------------------
const GRAYS = [
  '\x1b[38;5;250m', // lightest
  '\x1b[38;5;248m',
  '\x1b[38;5;245m',
  '\x1b[38;5;243m',
  '\x1b[38;5;240m',
  '\x1b[38;5;238m', // darkest
];
const RESET = '\x1b[0m';

// ---------------------------------------------------------------------------
// ASCII logo — box-drawing characters, 6 lines → 6 gray shades
// ---------------------------------------------------------------------------
const LOGO_LINES = [
  '██████╗ ███████╗██╗   ██╗████████╗██████╗  ██████╗ ███╗   ██╗██╗ ██████╗',
  '██╔══██╗██╔════╝██║   ██║╚══██╔══╝██╔══██╗██╔═══██╗████╗  ██║██║██╔════╝',
  '██║  ██║█████╗  ██║   ██║   ██║   ██████╔╝██║   ██║██╔██╗ ██║██║██║     ',
  '██║  ██║██╔══╝  ╚██╗ ██╔╝   ██║   ██╔══██╗██║   ██║██║╚██╗██║██║██║     ',
  '██████╔╝███████╗ ╚████╔╝    ██║   ██║  ██║╚██████╔╝██║ ╚████║██║╚██████╗',
  '╚═════╝ ╚══════╝  ╚═══╝     ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝ ╚═════╝',
];

/**
 * Prints the devtronic ASCII logo with a gray gradient.
 * Each line gets a progressively darker shade.
 */
export function showLogo(): void {
  console.log();
  for (let i = 0; i < LOGO_LINES.length; i++) {
    console.log(`  ${GRAYS[i]}${LOGO_LINES[i]}${RESET}`);
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Standardized symbols
// ---------------------------------------------------------------------------

/** Status indicator symbols used across all commands */
export const symbols = {
  pass: chalk.green('✓'),
  fail: chalk.red('✗'),
  warn: chalk.yellow('⚠'),
  info: chalk.cyan('●'),
  bullet: chalk.dim('-'),
  star: chalk.magenta('★'),
  arrow: chalk.dim('→'),
  merged: chalk.blue('⚡'),
  updated: chalk.blue('↑'),
  skipped: chalk.yellow('⏭'),
} as const;

// ---------------------------------------------------------------------------
// Intro / outro helpers
// ---------------------------------------------------------------------------

/**
 * Generates a branded intro title for @clack/prompts p.intro().
 * @param suffix - Optional suffix appended after "devtronic"
 */
export function introTitle(suffix?: string): string {
  const text = suffix ? ` devtronic ${suffix} ` : ' devtronic ';
  return chalk.bgCyan.black(text);
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Formats a list of items as indented dashes.
 * @param items - List of items to display
 * @param indent - Number of spaces to indent (default: 2)
 */
export function formatList(items: string[], indent: number = 2): string {
  const pad = ' '.repeat(indent);
  return items.map((item) => `${pad}${chalk.dim('-')} ${item}`).join('\n');
}

/**
 * Formats a key-value pair with bold key and aligned value.
 * @param key   - Label (will be bold)
 * @param value - Value text
 * @param keyWidth - Fixed width for key alignment (default: 15)
 */
export function formatKV(key: string, value: string, keyWidth: number = 15): string {
  return `${chalk.bold(key.padEnd(keyWidth))}${value}`;
}
