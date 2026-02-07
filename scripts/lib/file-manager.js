/**
 * File manager — handles reading, writing, and organizing
 * generated blog content files.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import slugify from 'slugify';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../..');
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'output');
const DRAFTS_DIR = resolve(OUTPUT_DIR, 'drafts');
const PUBLISHED_DIR = resolve(OUTPUT_DIR, 'published');

// Ensure output directories exist
[OUTPUT_DIR, DRAFTS_DIR, PUBLISHED_DIR].forEach(dir => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
});

/**
 * Generate a safe filename from a title/slug.
 */
export function toFilename(title, date) {
  const slug = slugify(title, { lower: true, strict: true });
  const dateStr = date || new Date().toISOString().split('T')[0];
  return `${dateStr}-${slug}.md`;
}

/**
 * Save a draft article.
 */
export function saveDraft(content, filename) {
  const filepath = resolve(DRAFTS_DIR, filename);
  writeFileSync(filepath, content, 'utf-8');
  return filepath;
}

/**
 * Save a published article (ready for Nuxt content directory).
 */
export function savePublished(content, filename) {
  const filepath = resolve(PUBLISHED_DIR, filename);
  writeFileSync(filepath, content, 'utf-8');
  return filepath;
}

/**
 * Copy a published article to the Nuxt blog content directory.
 */
export function deployToNuxt(content, filename) {
  const blogDir = process.env.BLOG_CONTENT_DIR;
  if (!blogDir) {
    throw new Error('BLOG_CONTENT_DIR is not set in .env');
  }

  const targetDir = resolve(blogDir);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  const filepath = resolve(targetDir, filename);
  writeFileSync(filepath, content, 'utf-8');
  return filepath;
}

/**
 * Read an article file and parse frontmatter.
 */
export function readArticle(filepath) {
  const raw = readFileSync(filepath, 'utf-8');
  return matter(raw);
}

/**
 * List all draft articles.
 */
export function listDrafts() {
  if (!existsSync(DRAFTS_DIR)) return [];
  return readdirSync(DRAFTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const filepath = join(DRAFTS_DIR, f);
      const { data } = readArticle(filepath);
      return { filename: f, filepath, ...data };
    });
}

/**
 * List all published articles.
 */
export function listPublished() {
  if (!existsSync(PUBLISHED_DIR)) return [];
  return readdirSync(PUBLISHED_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const filepath = join(PUBLISHED_DIR, f);
      const { data } = readArticle(filepath);
      return { filename: f, filepath, ...data };
    });
}

/**
 * Get output directory paths.
 */
export function getPaths() {
  return { OUTPUT_DIR, DRAFTS_DIR, PUBLISHED_DIR, PROJECT_ROOT };
}
