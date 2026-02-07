#!/usr/bin/env node

/**
 * manage-topics.js — Generate new topics or list existing ones.
 *
 * Usage:
 *   node scripts/manage-topics.js list                          # List all topics
 *   node scripts/manage-topics.js generate --count 5            # Generate 5 new topics
 *   node scripts/manage-topics.js generate --category merch-agent --count 3
 *   node scripts/manage-topics.js status                        # Show generation status
 */

import { writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { getTopics } from './lib/config-loader.js';
import { buildTopicGenerationPrompt } from './lib/prompt-builder.js';
import { generateTopics } from './lib/claude-client.js';
import { listDrafts, listPublished } from './lib/file-manager.js';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOPICS_FILE = resolve(__dirname, '../topics/topic-pool.yaml');

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';
  const flags = { command };
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) flags.count = parseInt(args[++i], 10);
    else if (args[i] === '--category' && args[i + 1]) flags.category = args[++i];
  }
  return flags;
}

function listTopics() {
  let topics;
  try {
    topics = getTopics();
  } catch {
    console.log(chalk.yellow('No topics found. Run `npm run topics generate` to create topics.'));
    return;
  }

  const drafts = new Set(listDrafts().map(d => d.filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace('.md', '')));
  const published = new Set(listPublished().map(d => d.filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace('.md', '')));

  console.log(chalk.blue.bold(`\nTopic Pool (${topics.length} topics)\n`));

  // Group by category
  const byCategory = {};
  for (const topic of topics) {
    const cat = topic.category || 'uncategorized';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(topic);
  }

  for (const [cat, items] of Object.entries(byCategory)) {
    console.log(chalk.cyan.bold(`  ${cat} (${items.length})`));
    for (const topic of items) {
      let status = '○';
      let color = 'white';
      if (published.has(topic.slug)) { status = '●'; color = 'green'; }
      else if (drafts.has(topic.slug)) { status = '◐'; color = 'yellow'; }

      console.log(chalk[color](`    ${status} [P${topic.priority || '-'}] ${topic.title}`));
      console.log(chalk.gray(`      ${topic.primary_keyword} | ${topic.search_intent} | ${topic.funnel_stage}`));
    }
    console.log('');
  }

  console.log(chalk.gray('Legend: ○ pending  ◐ draft  ● published\n'));
}

function showStatus() {
  let topics;
  try {
    topics = getTopics();
  } catch {
    topics = [];
  }

  const drafts = listDrafts();
  const published = listPublished();

  console.log(chalk.blue.bold('\nContent Pipeline Status\n'));
  console.log(`  Topics in pool:     ${topics.length}`);
  console.log(`  Drafts:             ${drafts.length}`);
  console.log(`  Published:          ${published.length}`);
  console.log(`  Remaining:          ${topics.length - drafts.length - published.length}`);
  console.log('');
}

async function generateNewTopics(flags) {
  const count = flags.count || 5;

  console.log(chalk.yellow(`\nGenerating ${count} new topics...`));

  const { systemPrompt, userPrompt } = buildTopicGenerationPrompt(count, flags.category);
  const result = await generateTopics(systemPrompt, userPrompt);

  // Extract YAML from response
  const yamlMatch = result.match(/```yaml\n([\s\S]*?)\n```/) || result.match(/topics:\n([\s\S]*)/);
  let newTopics;

  if (yamlMatch) {
    const yamlContent = yamlMatch[1].startsWith('topics:') ? yamlMatch[1] : `topics:\n${yamlMatch[1]}`;
    const parsed = yaml.load(yamlContent);
    newTopics = parsed.topics;
  } else {
    // Try parsing the whole response as YAML
    const parsed = yaml.load(result);
    newTopics = parsed.topics || parsed;
  }

  if (!newTopics || newTopics.length === 0) {
    console.log(chalk.red('Failed to parse generated topics.'));
    return;
  }

  console.log(chalk.green(`\nGenerated ${newTopics.length} topics:\n`));
  newTopics.forEach((t, i) => {
    console.log(chalk.cyan(`  ${i + 1}. ${t.title}`));
    console.log(chalk.gray(`     ${t.primary_keyword} | ${t.category} | ${t.funnel_stage}`));
  });

  // Merge with existing topics
  let existingTopics = [];
  try {
    existingTopics = getTopics();
  } catch {
    // No existing topics
  }

  const existingSlugs = new Set(existingTopics.map(t => t.slug));
  const uniqueNew = newTopics.filter(t => !existingSlugs.has(t.slug));

  const merged = [...existingTopics, ...uniqueNew];
  const output = yaml.dump({ topics: merged }, { lineWidth: 120, noRefs: true });
  writeFileSync(TOPICS_FILE, output, 'utf-8');

  console.log(chalk.green(`\n✓ Added ${uniqueNew.length} new topics (${merged.length} total) to ${TOPICS_FILE}\n`));
}

async function main() {
  const flags = parseArgs();

  switch (flags.command) {
    case 'list':
      listTopics();
      break;
    case 'status':
      showStatus();
      break;
    case 'generate':
      await generateNewTopics(flags);
      break;
    default:
      console.log(chalk.yellow(`Unknown command: ${flags.command}`));
      console.log('Usage: npm run topics [list|generate|status]');
  }
}

main().catch(err => {
  console.error(chalk.red(`Error: ${err.message}`));
  process.exit(1);
});
