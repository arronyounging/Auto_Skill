#!/usr/bin/env node

/**
 * generate-batch.js — Generate multiple articles in sequence.
 *
 * Usage:
 *   node scripts/generate-batch.js --count 3
 *   node scripts/generate-batch.js --count 5 --category agentic-commerce
 *   node scripts/generate-batch.js --count 2 --no-review
 */

import { getTopics } from './lib/config-loader.js';
import { buildArticlePrompt } from './lib/prompt-builder.js';
import { generateArticle } from './lib/claude-client.js';
import { saveDraft, toFilename, listPublished, listDrafts } from './lib/file-manager.js';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = { count: 1 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      flags.count = parseInt(args[++i], 10);
    } else if (args[i] === '--category' && args[i + 1]) {
      flags.category = args[++i];
    } else if (args[i] === '--no-review') {
      flags.noReview = true;
    }
  }
  return flags;
}

async function main() {
  const flags = parseArgs();

  console.log(chalk.blue.bold(`\n📝 Batch Article Generator — generating ${flags.count} articles\n`));

  const topics = getTopics();
  const published = listPublished().map(a => a.filename);
  const drafts = listDrafts().map(a => a.filename);
  const existing = new Set([...published, ...drafts].map(f => f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace('.md', '')));

  let available = topics.filter(t => !existing.has(t.slug));
  if (flags.category) {
    available = available.filter(t => t.category === flags.category);
  }
  available.sort((a, b) => (a.priority || 5) - (b.priority || 5));

  const toGenerate = available.slice(0, flags.count);

  if (toGenerate.length === 0) {
    console.log(chalk.yellow('No topics available for generation.'));
    process.exit(0);
  }

  console.log(chalk.cyan(`Found ${toGenerate.length} topics to generate:\n`));
  toGenerate.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.title} [${t.category}]`);
  });
  console.log('');

  const results = [];

  for (let i = 0; i < toGenerate.length; i++) {
    const topic = toGenerate[i];
    console.log(chalk.yellow(`\n[${i + 1}/${toGenerate.length}] Generating: ${topic.title}`));

    try {
      const { systemPrompt, userPrompt } = buildArticlePrompt(topic);
      const startTime = Date.now();
      let content = await generateArticle(systemPrompt, userPrompt);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      content = content.replace(/^```markdown\n/, '').replace(/\n```$/, '');

      const filename = toFilename(topic.slug, new Date().toISOString().split('T')[0]);
      const filepath = saveDraft(content, filename);

      console.log(chalk.green(`  ✓ Generated in ${elapsed}s → ${filepath}`));
      results.push({ topic: topic.title, status: 'success', filepath });
    } catch (err) {
      console.error(chalk.red(`  ✗ Failed: ${err.message}`));
      results.push({ topic: topic.title, status: 'failed', error: err.message });
    }

    // Brief pause between generations to respect rate limits
    if (i < toGenerate.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Summary
  console.log(chalk.blue.bold('\n--- Batch Generation Summary ---\n'));
  const succeeded = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;
  console.log(chalk.green(`  Succeeded: ${succeeded}`));
  if (failed > 0) console.log(chalk.red(`  Failed:    ${failed}`));
  console.log('');
}

main().catch(err => {
  console.error(chalk.red(`Error: ${err.message}`));
  process.exit(1);
});
