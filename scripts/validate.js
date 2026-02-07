#!/usr/bin/env node

/**
 * validate.js — Validate articles for SEO quality, structure, and completeness.
 *
 * Usage:
 *   node scripts/validate.js                    # Validate all drafts
 *   node scripts/validate.js --file <filename>  # Validate specific file
 *   node scripts/validate.js --published        # Validate published articles
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import matter from 'gray-matter';
import { listDrafts, listPublished, getPaths } from './lib/file-manager.js';
import chalk from 'chalk';

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) flags.file = args[++i];
    else if (args[i] === '--published') flags.published = true;
  }
  return flags;
}

/**
 * Run validation checks on a single article.
 */
function validateArticle(filepath, filename) {
  const issues = [];
  const warnings = [];

  let raw;
  try {
    raw = readFileSync(filepath, 'utf-8');
  } catch {
    issues.push('File not readable');
    return { filename, issues, warnings, score: 0 };
  }

  // Parse frontmatter
  let data, content;
  try {
    const parsed = matter(raw);
    data = parsed.data;
    content = parsed.content;
  } catch {
    issues.push('Invalid frontmatter YAML');
    return { filename, issues, warnings, score: 0 };
  }

  // --- Frontmatter checks ---
  const requiredFields = ['title', 'description', 'author', 'date', 'category', 'tags'];
  for (const field of requiredFields) {
    if (!data[field]) {
      issues.push(`Missing frontmatter field: ${field}`);
    }
  }

  // Title length
  if (data.title) {
    if (data.title.length > 70) warnings.push(`Title too long (${data.title.length} chars, recommended ≤70)`);
    if (data.title.length < 20) warnings.push(`Title too short (${data.title.length} chars)`);
  }

  // Meta description length
  if (data.description) {
    if (data.description.length > 160) warnings.push(`Meta description too long (${data.description.length} chars, max 160)`);
    if (data.description.length < 120) warnings.push(`Meta description too short (${data.description.length} chars, min 120)`);
  }

  // Tags
  if (data.tags && data.tags.length < 2) warnings.push('Consider adding more tags (minimum 2 recommended)');

  // SEO fields
  if (data.seo) {
    if (!data.seo.primaryKeyword) issues.push('Missing seo.primaryKeyword');
    if (!data.seo.secondaryKeywords || data.seo.secondaryKeywords.length === 0) {
      warnings.push('Missing seo.secondaryKeywords');
    }
  } else {
    warnings.push('Missing seo metadata block');
  }

  // --- Content checks ---
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  if (wordCount < 1000) issues.push(`Word count too low (${wordCount}, minimum 1000)`);
  else if (wordCount < 1500) warnings.push(`Word count below target (${wordCount}, target 1500-2500)`);
  else if (wordCount > 3000) warnings.push(`Word count high (${wordCount}, may need trimming)`);

  // Heading structure
  const h1Count = (content.match(/^# [^\n]+/gm) || []).length;
  const h2Count = (content.match(/^## [^\n]+/gm) || []).length;
  const h3Count = (content.match(/^### [^\n]+/gm) || []).length;

  if (h1Count > 1) warnings.push(`Multiple H1 headings found (${h1Count}), should be 1`);
  if (h2Count < 3) warnings.push(`Too few H2 sections (${h2Count}, recommend 4-6)`);

  // Check for "What You'll Learn" section
  if (!content.includes("What You'll Learn") && !content.includes("What you'll learn")) {
    warnings.push('Missing "What You\'ll Learn" section');
  }

  // Check for FAQ section
  if (!content.toLowerCase().includes('## faq') && !content.toLowerCase().includes('## frequently asked')) {
    warnings.push('Missing FAQ section (recommended for featured snippets)');
  }

  // Check for internal links
  const internalLinks = content.match(/\[([^\]]+)\]\((?:https?:\/\/custyle\.ai|\/)[^\)]*\)/g) || [];
  if (internalLinks.length < 3) {
    warnings.push(`Only ${internalLinks.length} internal links (minimum 3 recommended)`);
  }

  // Check for external links
  const allLinks = content.match(/\[([^\]]+)\]\(https?:\/\/[^\)]+\)/g) || [];
  const externalLinks = allLinks.filter(l => !l.includes('custyle.ai'));
  if (externalLinks.length < 2) {
    warnings.push(`Only ${externalLinks.length} external links (minimum 2 recommended for credibility)`);
  }

  // Check primary keyword in content
  if (data.seo && data.seo.primaryKeyword) {
    const kw = data.seo.primaryKeyword.toLowerCase();
    const contentLower = content.toLowerCase();
    const kwCount = (contentLower.match(new RegExp(kw, 'g')) || []).length;

    if (kwCount < 3) issues.push(`Primary keyword "${data.seo.primaryKeyword}" appears only ${kwCount} times (minimum 3)`);
    if (kwCount > 15) warnings.push(`Primary keyword may be over-used (${kwCount} times)`);

    // Check first 100 words
    const first100 = contentLower.split(/\s+/).slice(0, 100).join(' ');
    if (!first100.includes(kw)) {
      warnings.push('Primary keyword not found in first 100 words');
    }
  }

  // Calculate score
  let score = 100;
  score -= issues.length * 10;
  score -= warnings.length * 3;
  score = Math.max(0, Math.min(100, score));

  return {
    filename,
    title: data.title || 'Unknown',
    wordCount,
    headings: { h1: h1Count, h2: h2Count, h3: h3Count },
    links: { internal: internalLinks.length, external: externalLinks.length },
    issues,
    warnings,
    score,
  };
}

async function main() {
  const flags = parseArgs();

  console.log(chalk.blue.bold('\n🔍 Custyle Blog Article Validator\n'));

  let articles;
  if (flags.published) {
    const { PUBLISHED_DIR } = getPaths();
    articles = listPublished().map(a => ({ ...a, filepath: resolve(PUBLISHED_DIR, a.filename) }));
  } else {
    const { DRAFTS_DIR } = getPaths();
    articles = listDrafts().map(a => ({ ...a, filepath: resolve(DRAFTS_DIR, a.filename) }));
  }

  if (flags.file) {
    articles = articles.filter(a => a.filename.includes(flags.file));
  }

  if (articles.length === 0) {
    console.log(chalk.yellow('No articles found to validate.'));
    process.exit(0);
  }

  let totalScore = 0;

  for (const article of articles) {
    const result = validateArticle(article.filepath, article.filename);
    totalScore += result.score;

    const scoreColor = result.score >= 80 ? 'green' : result.score >= 60 ? 'yellow' : 'red';

    console.log(chalk[scoreColor].bold(`[${result.score}/100] ${result.title || result.filename}`));
    console.log(chalk.gray(`  Words: ${result.wordCount} | H2s: ${result.headings.h2} | Links: ${result.links.internal} internal, ${result.links.external} external`));

    if (result.issues.length > 0) {
      result.issues.forEach(i => console.log(chalk.red(`  ✗ ${i}`)));
    }
    if (result.warnings.length > 0) {
      result.warnings.forEach(w => console.log(chalk.yellow(`  ⚠ ${w}`)));
    }
    console.log('');
  }

  // Overall summary
  const avgScore = Math.round(totalScore / articles.length);
  const summaryColor = avgScore >= 80 ? 'green' : avgScore >= 60 ? 'yellow' : 'red';
  console.log(chalk[summaryColor].bold(`Average Score: ${avgScore}/100 (${articles.length} articles)\n`));
}

main().catch(err => {
  console.error(chalk.red(`Error: ${err.message}`));
  process.exit(1);
});
