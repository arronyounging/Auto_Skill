#!/usr/bin/env node

/**
 * generate.js — Generate a single blog article from a topic.
 *
 * Usage:
 *   node scripts/generate.js                    # Pick next priority topic
 *   node scripts/generate.js --topic <slug>      # Generate specific topic
 *   node scripts/generate.js --interactive       # Interactive topic selection
 */

import { getTopics } from './lib/config-loader.js';
import { buildArticlePrompt, buildSeoReviewPrompt } from './lib/prompt-builder.js';
import { generateArticle, reviewSeo } from './lib/claude-client.js';
import { saveDraft, toFilename, listPublished, listDrafts } from './lib/file-manager.js';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--topic' && args[i + 1]) {
      flags.topic = args[++i];
    } else if (args[i] === '--interactive') {
      flags.interactive = true;
    } else if (args[i] === '--no-review') {
      flags.noReview = true;
    } else if (args[i] === '--category' && args[i + 1]) {
      flags.category = args[++i];
    }
  }
  return flags;
}

function getNextTopic(topics, flags) {
  // Filter out already generated topics
  const published = listPublished().map(a => a.filename);
  const drafts = listDrafts().map(a => a.filename);
  const existing = new Set([...published, ...drafts].map(f => f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace('.md', '')));

  let available = topics.filter(t => !existing.has(t.slug));

  if (flags.category) {
    available = available.filter(t => t.category === flags.category);
  }

  if (flags.topic) {
    const match = topics.find(t => t.slug === flags.topic);
    if (!match) {
      console.error(chalk.red(`Topic not found: ${flags.topic}`));
      console.log('Available topics:', topics.map(t => t.slug).join(', '));
      process.exit(1);
    }
    return match;
  }

  // Sort by priority (lower = higher priority)
  available.sort((a, b) => (a.priority || 5) - (b.priority || 5));

  if (available.length === 0) {
    console.log(chalk.yellow('All topics have been generated. Add more topics to the pool.'));
    process.exit(0);
  }

  return available[0];
}

async function main() {
  const flags = parseArgs();

  console.log(chalk.blue.bold('\n📝 Custyle Blog Article Generator\n'));

  // Load topics
  let topics;
  try {
    topics = getTopics();
  } catch (e) {
    console.error(chalk.red('Failed to load topics. Run `npm run topics` to generate topics first.'));
    process.exit(1);
  }

  // Select topic
  const topic = getNextTopic(topics, flags);

  console.log(chalk.cyan('Selected topic:'));
  console.log(`  Title:    ${topic.title}`);
  console.log(`  Slug:     ${topic.slug}`);
  console.log(`  Category: ${topic.category}`);
  console.log(`  Keywords: ${topic.primary_keyword}, ${topic.secondary_keywords.join(', ')}`);
  console.log(`  Intent:   ${topic.search_intent}`);
  console.log(`  Stage:    ${topic.funnel_stage}`);
  console.log('');

  // Build prompt
  const { systemPrompt, userPrompt } = buildArticlePrompt(topic);

  // Generate article
  console.log(chalk.yellow('Generating article with Claude...'));
  const startTime = Date.now();

  let articleContent;
  try {
    articleContent = await generateArticle(systemPrompt, userPrompt);
  } catch (err) {
    console.error(chalk.red(`Generation failed: ${err.message}`));
    process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(chalk.green(`Article generated in ${elapsed}s`));

  // Clean up markdown fences if Claude wraps the output
  articleContent = articleContent.replace(/^```markdown\n/, '').replace(/\n```$/, '');

  // Save draft
  const filename = toFilename(topic.slug, new Date().toISOString().split('T')[0]);
  const filepath = saveDraft(articleContent, filename);
  console.log(chalk.green(`Draft saved: ${filepath}`));

  // SEO Review (optional)
  if (!flags.noReview) {
    console.log(chalk.yellow('\nRunning SEO review...'));
    try {
      const { systemPrompt: seoSystem, userPrompt: seoUser } = buildSeoReviewPrompt(articleContent, topic);
      const seoReport = await reviewSeo(seoSystem, seoUser);

      // Try to parse JSON from the response
      const jsonMatch = seoReport.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const report = JSON.parse(jsonMatch[0]);
        console.log(chalk.cyan(`\nSEO Score: ${report.score}/100`));

        if (report.issues && report.issues.length > 0) {
          console.log(chalk.yellow('Issues found:'));
          report.issues.forEach(issue => {
            const color = issue.severity === 'high' ? 'red' : issue.severity === 'medium' ? 'yellow' : 'gray';
            console.log(chalk[color](`  [${issue.severity}] ${issue.element}: ${issue.issue}`));
          });
        }

        if (report.suggested_improvements) {
          console.log(chalk.cyan('\nSuggested improvements:'));
          report.suggested_improvements.forEach(s => console.log(`  - ${s}`));
        }
      }
    } catch (err) {
      console.log(chalk.yellow(`SEO review skipped: ${err.message}`));
    }
  }

  console.log(chalk.blue.bold('\nDone! Review the draft and run `npm run publish` when ready.\n'));
}

main().catch(err => {
  console.error(chalk.red(`Error: ${err.message}`));
  process.exit(1);
});
