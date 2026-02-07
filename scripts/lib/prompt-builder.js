/**
 * Prompt builder — assembles generation prompts by combining
 * system prompts with topic-specific context and brand guidelines.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getBrand, getCategoryById, getKeywordCluster } from './config-loader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = resolve(__dirname, '../../prompts');

function loadPromptTemplate(name) {
  return readFileSync(resolve(PROMPTS_DIR, `${name}.md`), 'utf-8');
}

/**
 * Build the full article generation prompt for a given topic.
 */
export function buildArticlePrompt(topic) {
  const systemPrompt = loadPromptTemplate('article-generator');
  const brand = getBrand();
  const category = getCategoryById(topic.category);

  const today = new Date().toISOString().split('T')[0];

  const userPrompt = `
## Article Assignment

**Title**: ${topic.title}
**Slug**: ${topic.slug}
**Date**: ${today}
**Category**: ${category ? category.name : topic.category}
**Author**: ${topic.author || 'custyle-team'}

**Primary Keyword**: ${topic.primary_keyword}
**Secondary Keywords**: ${topic.secondary_keywords.join(', ')}

**Search Intent**: ${topic.search_intent}
**Funnel Stage**: ${topic.funnel_stage}
**Content Type**: ${topic.content_type}
**Target Word Count**: ${topic.estimated_word_count || 2000}

**Content Brief**:
${topic.brief}

${category ? `**Category Guidelines**: ${category.content_guidelines}` : ''}

**Brand Positioning**: ${brand.brand.positioning}
**Core Value Pillars**:
${brand.brand.value_pillars.map(v => `- ${v.title}: ${v.description}`).join('\n')}

**Trust Mechanism**: ${brand.brand.trust_mechanism}

**Internal Link Targets** (use at least 3):
${brand.seo.internal_link_targets.map(l => `- ${l.url} (anchors: ${l.anchor_variations.join(', ')})`).join('\n')}

Please write the complete article following the system prompt structure and SEO requirements. Output as Markdown with YAML frontmatter.
`;

  return { systemPrompt, userPrompt };
}

/**
 * Build the SEO optimization review prompt for a given article.
 */
export function buildSeoReviewPrompt(articleContent, topic) {
  const systemPrompt = loadPromptTemplate('seo-optimizer');

  const userPrompt = `
## Article to Review

**Primary Keyword**: ${topic.primary_keyword}
**Secondary Keywords**: ${topic.secondary_keywords.join(', ')}
**Target Category**: ${topic.category}

**Article Content**:

${articleContent}

Please analyze this article and return the SEO optimization report as JSON.
`;

  return { systemPrompt, userPrompt };
}

/**
 * Build the topic generation prompt.
 */
export function buildTopicGenerationPrompt(count, focusCategory) {
  const systemPrompt = loadPromptTemplate('topic-generator');
  const brand = getBrand();

  const userPrompt = `
Generate ${count} new blog topic ideas for Custyle.

${focusCategory ? `**Focus Category**: ${focusCategory}` : '**Mix across all categories**'}

**Brand Context**: ${brand.brand.positioning}
**Current Date**: ${new Date().toISOString().split('T')[0]}

**Preferred Keywords to Target**:
${brand.voice.preferred_terms.map(t => `- ${t}`).join('\n')}

Please output the topics in the specified YAML format.
`;

  return { systemPrompt, userPrompt };
}
