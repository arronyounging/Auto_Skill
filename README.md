# Custyle SEO Blog Automation

Automated SEO article generation and publishing system for the [Custyle](https://custyle.ai) blog. Generates high-quality, SEO-optimized articles about Agentic Commerce, AI Merchandising, and related topics using Claude AI.

## Architecture

```
Auto_Skill/
├── config/                  # Brand, keyword, category, author configs
│   ├── brand.yaml           # Brand voice, positioning, style guide
│   ├── keywords.yaml        # SEO keyword matrix (4 tiers)
│   ├── categories.yaml      # Blog categories with SEO metadata
│   └── authors.yaml         # Author profiles
├── prompts/                 # AI generation prompts
│   ├── article-generator.md # Main article generation system prompt
│   ├── seo-optimizer.md     # SEO review and scoring prompt
│   └── topic-generator.md   # Topic ideation prompt
├── topics/                  # Content planning
│   ├── topic-pool.yaml      # 16 initial topics with keyword mapping
│   └── content-calendar.yaml # 12-week launch plan
├── scripts/                 # Automation scripts
│   ├── generate.js          # Generate a single article
│   ├── generate-batch.js    # Batch generate multiple articles
│   ├── publish.js           # Move drafts to published / deploy to Nuxt
│   ├── schedule.js          # Cron-based scheduled generation
│   ├── validate.js          # SEO quality validation
│   ├── manage-topics.js     # Topic pool management
│   ├── preview.js           # Preview draft articles
│   └── lib/                 # Shared libraries
│       ├── config-loader.js # YAML config loading
│       ├── prompt-builder.js # Prompt assembly
│       ├── claude-client.js  # Anthropic API client
│       └── file-manager.js   # File I/O and organization
└── output/                  # Generated content (gitignored)
    ├── drafts/              # Articles pending review
    └── published/           # Approved articles
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure API key
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 3. Generate your first article
npm run generate

# 4. Validate the draft
npm run validate

# 5. Preview the article
npm run preview

# 6. Publish when ready
npm run publish
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run generate` | Generate next priority article from topic pool |
| `npm run generate -- --topic <slug>` | Generate a specific topic |
| `npm run generate -- --no-review` | Skip SEO review step |
| `npm run generate:batch` | Batch generate articles |
| `npm run generate:batch -- --count 3` | Generate 3 articles |
| `npm run generate:batch -- --category agentic-commerce` | Generate for specific category |
| `npm run publish` | Publish first draft |
| `npm run publish -- --all` | Publish all drafts |
| `npm run publish -- --deploy` | Publish and deploy to Nuxt content dir |
| `npm run schedule` | Start scheduled generation (cron) |
| `npm run schedule -- --once` | Run once and exit |
| `npm run validate` | Validate all drafts for SEO quality |
| `npm run topics list` | List all topics with status |
| `npm run topics generate -- --count 5` | AI-generate 5 new topics |
| `npm run topics status` | Show pipeline status |
| `npm run preview` | Preview latest draft |

## Content Pipeline

```
Topic Pool → Generate → Draft → Validate → Review → Publish → Deploy to Nuxt
```

1. **Topics** are defined in `topics/topic-pool.yaml` with keyword mapping, priority, and briefs
2. **Generation** uses Claude to write SEO-optimized articles following brand guidelines
3. **Validation** checks frontmatter, word count, heading structure, keyword usage, and link profile
4. **Publishing** moves approved articles and optionally deploys to the Nuxt.js content directory

## Nuxt.js Integration

Generated articles output as Markdown with YAML frontmatter compatible with `@nuxt/content`. Set `BLOG_CONTENT_DIR` in `.env` to point to your Nuxt project's `content/blog/` directory.

Frontmatter structure:

```yaml
---
title: "Article Title"
description: "Meta description (150-160 chars)"
summary: "Card display summary"
author: custyle-team
date: 2026-02-07
category: agentic-commerce
tags: [agentic-commerce, AI, merch-agent]
cover: "/images/blog/cover.jpg"
coverAlt: "Alt text"
readingTime: "8 min"
draft: false
seo:
  primaryKeyword: "agentic commerce"
  secondaryKeywords: ["AI commerce", "agent transactions"]
---
```

## SEO Strategy

The system targets 4 tiers of keywords:

1. **Core** — Category-defining terms (agentic commerce, AI merch agent)
2. **Methodology** — Workflow and process terms (intent to SKU, design to fulfillment)
3. **Industry** — Trend and ecosystem terms (ACP, creator merch, print on demand AI)
4. **Conversion** — Commercial and transactional terms (how to, best, vs comparisons)

Each article targets 1 primary keyword + 2-3 secondary keywords, with minimum 3 internal links and 2 external citations.

## Configuration

### Brand Voice (`config/brand.yaml`)
Defines Custyle's positioning, value pillars, tone, preferred/avoided terms, and internal link targets.

### Keywords (`config/keywords.yaml`)
SEO keyword matrix organized by tier with estimated volume, difficulty, and intent classification.

### Categories (`config/categories.yaml`)
6 blog categories with SEO metadata and content guidelines per category.

### Topic Pool (`topics/topic-pool.yaml`)
16 initial topics spanning all categories and funnel stages (TOFU/MOFU/BOFU), with priority ranking and content briefs.

## Scheduling

Use `npm run schedule` to run generation on a cron schedule. Default: daily at 9am.

```bash
# Custom schedule: every Monday and Thursday at 10am
npm run schedule -- --cron "0 10 * * 1,4"

# Generate 2 articles per run
npm run schedule -- --count 2
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key (required) | — |
| `BLOG_CONTENT_DIR` | Path to Nuxt content/blog directory | — |
| `DEFAULT_MODEL` | Claude model to use | `claude-sonnet-4-20250514` |
| `MAX_TOKENS` | Max tokens per generation | `8192` |
| `AUTO_PUBLISH` | Auto-publish after generation | `false` |
| `GIT_AUTO_COMMIT` | Auto-commit published articles | `false` |
| `CRON_SCHEDULE` | Default cron schedule | `0 9 * * *` |
