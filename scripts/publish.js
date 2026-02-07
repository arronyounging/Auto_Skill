#!/usr/bin/env node

/**
 * publish.js — Move drafts to published state and optionally deploy to Nuxt.
 *
 * Usage:
 *   node scripts/publish.js                     # List drafts and publish interactively
 *   node scripts/publish.js --all               # Publish all drafts
 *   node scripts/publish.js --file <filename>   # Publish specific draft
 *   node scripts/publish.js --deploy            # Also copy to Nuxt content dir
 */

import { readFileSync, renameSync, existsSync } from 'fs';
import { resolve, basename } from 'path';
import { listDrafts, savePublished, deployToNuxt, readArticle, getPaths } from './lib/file-manager.js';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--all') flags.all = true;
    else if (args[i] === '--deploy') flags.deploy = true;
    else if (args[i] === '--file' && args[i + 1]) flags.file = args[++i];
    else if (args[i] === '--dry-run') flags.dryRun = true;
  }
  return flags;
}

function publishDraft(draft, flags) {
  const { DRAFTS_DIR } = getPaths();
  const content = readFileSync(resolve(DRAFTS_DIR, draft.filename), 'utf-8');

  // Save to published directory
  const pubPath = savePublished(content, draft.filename);
  console.log(chalk.green(`  Published: ${pubPath}`));

  // Deploy to Nuxt content directory if requested
  if (flags.deploy) {
    try {
      const nuxtPath = deployToNuxt(content, draft.filename);
      console.log(chalk.green(`  Deployed:  ${nuxtPath}`));
    } catch (err) {
      console.log(chalk.yellow(`  Deploy skipped: ${err.message}`));
    }
  }

  // Remove from drafts
  const draftPath = resolve(DRAFTS_DIR, draft.filename);
  if (existsSync(draftPath)) {
    const { PUBLISHED_DIR } = getPaths();
    // File already copied to published, just remove the draft
    const fs = await import('fs');
    fs.unlinkSync(draftPath);
  }

  return pubPath;
}

async function main() {
  const flags = parseArgs();

  console.log(chalk.blue.bold('\n📤 Custyle Blog Publisher\n'));

  const drafts = listDrafts();

  if (drafts.length === 0) {
    console.log(chalk.yellow('No drafts to publish. Run `npm run generate` first.'));
    process.exit(0);
  }

  console.log(chalk.cyan(`Found ${drafts.length} draft(s):\n`));
  drafts.forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.title || d.filename}`);
    if (d.category) console.log(`     Category: ${d.category}`);
    if (d.date) console.log(`     Date: ${d.date}`);
  });

  let toPublish = drafts;

  if (flags.file) {
    toPublish = drafts.filter(d => d.filename === flags.file || d.filename.includes(flags.file));
    if (toPublish.length === 0) {
      console.error(chalk.red(`\nDraft not found: ${flags.file}`));
      process.exit(1);
    }
  } else if (!flags.all) {
    // Default: publish the first (highest priority) draft
    toPublish = [drafts[0]];
  }

  console.log(chalk.yellow(`\nPublishing ${toPublish.length} article(s)...\n`));

  const { DRAFTS_DIR } = getPaths();

  for (const draft of toPublish) {
    console.log(chalk.cyan(`Publishing: ${draft.title || draft.filename}`));

    const content = readFileSync(resolve(DRAFTS_DIR, draft.filename), 'utf-8');

    // Save to published
    if (!flags.dryRun) {
      const pubPath = savePublished(content, draft.filename);
      console.log(chalk.green(`  → Published: ${pubPath}`));

      // Deploy to Nuxt
      if (flags.deploy) {
        try {
          const nuxtPath = deployToNuxt(content, draft.filename);
          console.log(chalk.green(`  → Deployed:  ${nuxtPath}`));
        } catch (err) {
          console.log(chalk.yellow(`  → Deploy skipped: ${err.message}`));
        }
      }
    } else {
      console.log(chalk.gray('  → Dry run, no files written'));
    }
  }

  if (flags.deploy && process.env.GIT_AUTO_COMMIT === 'true') {
    console.log(chalk.yellow('\nAuto-commit is enabled. Remember to push changes to the blog repo.'));
  }

  console.log(chalk.blue.bold('\nDone!\n'));
}

main().catch(err => {
  console.error(chalk.red(`Error: ${err.message}`));
  process.exit(1);
});
