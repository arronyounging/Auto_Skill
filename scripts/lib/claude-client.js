/**
 * Claude API client — handles communication with the Anthropic API
 * for content generation, SEO review, and topic ideation.
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS || '8192', 10);

let _client = null;

function getClient() {
  if (_client) return _client;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your API key.'
    );
  }

  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

/**
 * Generate content using Claude.
 * @param {string} systemPrompt - System-level instructions
 * @param {string} userPrompt - User-level content request
 * @param {object} options - Override model/tokens
 * @returns {string} Generated text
 */
export async function generate(systemPrompt, userPrompt, options = {}) {
  const client = getClient();
  const model = options.model || DEFAULT_MODEL;
  const maxTokens = options.maxTokens || MAX_TOKENS;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  // Extract text from response
  const textBlock = response.content.find(block => block.type === 'text');
  if (!textBlock) {
    throw new Error('No text content in Claude response');
  }

  return textBlock.text;
}

/**
 * Generate an article from a topic.
 */
export async function generateArticle(systemPrompt, userPrompt) {
  return generate(systemPrompt, userPrompt, {
    maxTokens: MAX_TOKENS,
  });
}

/**
 * Run SEO review on an article.
 */
export async function reviewSeo(systemPrompt, userPrompt) {
  return generate(systemPrompt, userPrompt, {
    maxTokens: 4096,
  });
}

/**
 * Generate topic ideas.
 */
export async function generateTopics(systemPrompt, userPrompt) {
  return generate(systemPrompt, userPrompt, {
    maxTokens: 4096,
  });
}
