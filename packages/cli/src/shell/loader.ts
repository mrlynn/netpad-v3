/**
 * ASCII Loading Animation
 * 
 * Fun, crafty loader while AI is thinking
 */

import chalk from 'chalk';

// ASCII art frames for the loader
const BRAIN_FRAMES = [
  `  ${chalk.cyan('◐')} thinking...`,
  `  ${chalk.cyan('◓')} thinking...`,
  `  ${chalk.cyan('◑')} thinking...`,
  `  ${chalk.cyan('◒')} thinking...`,
];

const AI_FRAMES = [
  `  ${chalk.magenta('⠋')} AI processing`,
  `  ${chalk.magenta('⠙')} AI processing`,
  `  ${chalk.magenta('⠹')} AI processing`,
  `  ${chalk.magenta('⠸')} AI processing`,
  `  ${chalk.magenta('⠼')} AI processing`,
  `  ${chalk.magenta('⠴')} AI processing`,
  `  ${chalk.magenta('⠦')} AI processing`,
  `  ${chalk.magenta('⠧')} AI processing`,
  `  ${chalk.magenta('⠇')} AI processing`,
  `  ${chalk.magenta('⠏')} AI processing`,
];

const ROBOT_FRAMES = [
  `  ${chalk.green('🤖')} analyzing...`,
  `  ${chalk.green('🤖')} processing...`,
  `  ${chalk.green('🤖')} thinking...`,
  `  ${chalk.green('🤖')} computing...`,
];

const MATRIX_FRAMES = [
  `  ${chalk.green('[')}${chalk.greenBright('▓▓▓')}${chalk.green('░░░░░░░]')} parsing`,
  `  ${chalk.green('[')}${chalk.greenBright('▓▓▓▓▓')}${chalk.green('░░░░░]')} analyzing`,
  `  ${chalk.green('[')}${chalk.greenBright('▓▓▓▓▓▓▓')}${chalk.green('░░░]')} thinking`,
  `  ${chalk.green('[')}${chalk.greenBright('▓▓▓▓▓▓▓▓▓')}${chalk.green('░]')} computing`,
];

const WAVE_FRAMES = [
  `  ${chalk.cyan('∿∿∿')}${chalk.gray('∿∿∿∿')} interpreting`,
  `  ${chalk.gray('∿')}${chalk.cyan('∿∿∿')}${chalk.gray('∿∿∿')} interpreting`,
  `  ${chalk.gray('∿∿')}${chalk.cyan('∿∿∿')}${chalk.gray('∿∿')} interpreting`,
  `  ${chalk.gray('∿∿∿')}${chalk.cyan('∿∿∿')}${chalk.gray('∿')} interpreting`,
  `  ${chalk.gray('∿∿∿∿')}${chalk.cyan('∿∿∿')} interpreting`,
];

const SPARKLE_FRAMES = [
  `  ${chalk.yellow('✦')} ${chalk.gray('·')} ${chalk.gray('·')} AI thinking`,
  `  ${chalk.gray('·')} ${chalk.yellow('✦')} ${chalk.gray('·')} AI thinking`,
  `  ${chalk.gray('·')} ${chalk.gray('·')} ${chalk.yellow('✦')} AI thinking`,
  `  ${chalk.gray('·')} ${chalk.yellow('✦')} ${chalk.gray('·')} AI thinking`,
];

// All available frame sets
const FRAME_SETS = [AI_FRAMES, WAVE_FRAMES, SPARKLE_FRAMES, MATRIX_FRAMES];

export class Loader {
  private interval: NodeJS.Timeout | null = null;
  private frameIndex = 0;
  private frames: string[];
  private startTime = 0;

  constructor() {
    // Pick a random frame set for variety
    this.frames = FRAME_SETS[Math.floor(Math.random() * FRAME_SETS.length)];
  }

  start(): void {
    this.startTime = Date.now();
    this.frameIndex = 0;
    
    // Hide cursor
    process.stdout.write('\x1B[?25l');
    
    this.interval = setInterval(() => {
      // Clear line and write frame
      process.stdout.write('\r\x1B[K');
      process.stdout.write(this.frames[this.frameIndex]);
      
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 100);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    // Clear line and show cursor
    process.stdout.write('\r\x1B[K');
    process.stdout.write('\x1B[?25h');
    
    const elapsed = Date.now() - this.startTime;
    if (elapsed > 500) {
      // Show elapsed time if it took a while
      console.log(chalk.gray(`  ⚡ ${(elapsed / 1000).toFixed(1)}s`));
    }
  }

  /**
   * Execute a promise with loading animation
   */
  async wrap<T>(promise: Promise<T>): Promise<T> {
    this.start();
    try {
      return await promise;
    } finally {
      this.stop();
    }
  }
}

/**
 * Create a loader and execute promise with animation
 */
export async function withLoader<T>(promise: Promise<T>): Promise<T> {
  const loader = new Loader();
  return loader.wrap(promise);
}
