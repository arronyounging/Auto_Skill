#!/usr/bin/env node

/**
 * preview.js — Preview a draft article's structure and metadata.
 *
 * Usage:
 *   node scripts/preview.js                    # Preview latest draft
 *   node scripts/preview.js --file <filename>  # Preview specific file
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import matter from 'gray-matter';
import { listDrafts, getPaths } from './lib/file-manager.js';
import chalk from 'chalk';

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) flags.file = args[++i];
  }
  return flags;
}

async function main() {
  const flags = parseArgs();

  console.log(chalk.blue.bold('\n👁  Article Preview\n'));

  const drafts = listDrafts();
  if (drafts.length === 0) {
    console.log(chalk.yellow('No drafts available.'));
    process.exit(0);
  }

  let target = drafts[drafts.length - 1]; // Latest by default
  if (flags.file) {
    target = drafts.find(d => d.filename.includes(flags.file));
    if (!target) {
      console.error(chalk.red(`Draft not found: ${flags.file}`));
      process.exit(1);
    }
  }

  const { DRAFTS_DIR } = getPaths();
  const raw = readFileSync(resolve(DRAFTS_DIR, target.filename), 'utf-8');
  const { data, content } = matter(raw);

  // Display metadata
  console.log(chalk.cyan.bold('--- Frontmatter ---'));
  console.log(`Title:       ${data.title || 'N/A'}`);
  console.log(`Description: ${data.description || 'N/A'}`);
  console.log(`Author:      ${data.author || 'N/A'}`);
  console.log(`Date:        ${data.date || 'N/A'}`);
  console.log(`Category:    ${data.category || 'N/A'}`);
  console.log(`Tags:        ${(data.tags || []).join(', ')}`);
  console.log(`Reading:     ${data.readingTime || 'N/A'}`);

  if (data.seo) {
    console.log(`Primary KW:  ${data.seo.primaryKeyword || 'N/A'}`);
    console.log(`Secondary:   ${(data.seo.secondaryKeywords || []).join(', ')}`);
  }

  // Word count
  const words = content.split(/\s+/).filter(Boolean).length;
  console.log(`Word Count:  ${words}`);

  // Headings outline
  const headings = content.match(/^#{1,3} .+$/gm) || [];
  console.log(chalk.cyan.bold('\n--- Outline ---'));
  headings.forEach(h => {
    const level = h.match(/^#+/)[0].length;
    const indent = '  '.repeat(level - 1);
    console.log(`${indent}${h.replace(/^#+\s*/, '')}`);
  });

  // Links
  const links = content.match(/\[([^\]]+)\]\(([^\)]+)\)/g) || [];
  const internal = links.filter(l => l.includes('custyle.ai') || l.match(/\]\(\//));
  const external = links.filter(l => !l.includes('custyle.ai') && !l.match(/\]\(\//));

  console.log(chalk.cyan.bold('\n--- Links ---'));
  console.log(`Internal (${internal.length}):`);
  internal.forEach(l => console.log(`  ${l}`));
  console.log(`External (${external.length}):`);
  external.forEach(l => console.log(`  ${l}`));

  // First 300 chars preview
  console.log(chalk.cyan.bold('\n--- Content Preview ---'));
  console.log(content.trim().substring(0, 500) + '...\n');
}

main().catch(err => {
  console.error(chalk.red(`Error: ${err.message}`));
  process.exit(1);
});
