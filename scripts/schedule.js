#!/usr/bin/env node

/**
 * schedule.js — Run article generation on a cron schedule.
 *
 * Usage:
 *   node scripts/schedule.js                    # Run with default schedule (daily 9am)
 *   node scripts/schedule.js --cron "0 9 * * 1" # Custom cron (every Monday 9am)
 *   node scripts/schedule.js --once             # Run once and exit
 */

import cron from 'node-cron';
import { getTopics } from './lib/config-loader.js';
import { buildArticlePrompt } from './lib/prompt-builder.js';
import { generateArticle } from './lib/claude-client.js';
import { saveDraft, toFilename, listPublished, listDrafts } from './lib/file-manager.js';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_CRON = process.env.CRON_SCHEDULE || '0 9 * * *';

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cron' && args[i + 1]) flags.cron = args[++i];
    else if (args[i] === '--once') flags.once = true;
    else if (args[i] === '--count' && args[i + 1]) flags.count = parseInt(args[++i], 10);
  }
  return flags;
}

async function runGeneration(count = 1) {
  const timestamp = new Date().toISOString();
  console.log(chalk.blue(`\n[${timestamp}] Scheduled generation started (count: ${count})\n`));

  try {
    const topics = getTopics();
    const published = listPublished().map(a => a.filename);
    const drafts = listDrafts().map(a => a.filename);
    const existing = new Set(
      [...published, ...drafts].map(f => f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace('.md', ''))
    );

    const available = topics
      .filter(t => !existing.has(t.slug))
      .sort((a, b) => (a.priority || 5) - (b.priority || 5));

    const toGenerate = available.slice(0, count);

    if (toGenerate.length === 0) {
      console.log(chalk.yellow('No topics available. Add more topics to the pool.'));
      return;
    }

    for (const topic of toGenerate) {
      console.log(chalk.yellow(`Generating: ${topic.title}`));

      const { systemPrompt, userPrompt } = buildArticlePrompt(topic);
      let content = await generateArticle(systemPrompt, userPrompt);
      content = content.replace(/^```markdown\n/, '').replace(/\n```$/, '');

      const filename = toFilename(topic.slug, new Date().toISOString().split('T')[0]);
      const filepath = saveDraft(content, filename);
      console.log(chalk.green(`  ✓ Draft saved: ${filepath}`));

      // Pause between articles
      if (toGenerate.indexOf(topic) < toGenerate.length - 1) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    console.log(chalk.green(`\nGeneration complete. ${toGenerate.length} article(s) created.\n`));
  } catch (err) {
    console.error(chalk.red(`Generation error: ${err.message}`));
  }
}

async function main() {
  const flags = parseArgs();
  const cronExpr = flags.cron || DEFAULT_CRON;
  const count = flags.count || 1;

  if (flags.once) {
    await runGeneration(count);
    return;
  }

  if (!cron.validate(cronExpr)) {
    console.error(chalk.red(`Invalid cron expression: ${cronExpr}`));
    process.exit(1);
  }

  console.log(chalk.blue.bold('\n⏰ Custyle Blog Scheduler\n'));
  console.log(chalk.cyan(`Schedule: ${cronExpr}`));
  console.log(chalk.cyan(`Articles per run: ${count}`));
  console.log(chalk.gray('Press Ctrl+C to stop.\n'));

  cron.schedule(cronExpr, () => {
    runGeneration(count);
  });

  // Keep process alive
  process.on('SIGINT', () => {
    console.log(chalk.blue('\nScheduler stopped.'));
    process.exit(0);
  });
}

main().catch(err => {
  console.error(chalk.red(`Error: ${err.message}`));
  process.exit(1);
});
