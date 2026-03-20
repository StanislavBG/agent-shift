import chalk from 'chalk';
import { scaffoldConfig, CONFIG_FILE } from '../config/index.js';

export interface InitOptions {
  output?: string;
}

export function runInit(opts: InitOptions): void {
  let outputPath: string;
  try {
    outputPath = scaffoldConfig(opts.output);
  } catch (e) {
    console.error(chalk.red(`✗ ${(e as Error).message}`));
    process.exit(2);
  }

  console.log('');
  console.log(chalk.bold('  agent-shift init'));
  console.log('');
  console.log(`  ${chalk.green('✓')} Created ${outputPath}`);
  console.log('');
  console.log('  Next steps:');
  console.log(`  ${chalk.dim('1.')} Edit ${CONFIG_FILE} to match your agent configuration`);
  console.log(`  ${chalk.dim('2.')} Add prompt files referenced in the config`);
  console.log(`  ${chalk.dim('3.')} Run: ${chalk.cyan('agent-shift snapshot --env staging')}`);
  console.log(`  ${chalk.dim('4.')} Run: ${chalk.cyan('agent-shift snapshot --env production')}`);
  console.log(`  ${chalk.dim('5.')} Check drift: ${chalk.cyan('agent-shift diff staging production')}`);
  console.log('');
}
