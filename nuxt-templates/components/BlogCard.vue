<template>
  <NuxtLink :to="`/blog/${articleSlug}`" class="blog-card">
    <div class="blog-card__image">
      <img
        v-if="article.cover"
        :src="article.cover"
        :alt="article.coverAlt || article.title"
        loading="lazy"
      />
      <div v-else class="blog-card__placeholder" />
    </div>
    <div class="blog-card__body">
      <span v-if="article.category" class="blog-card__category">
        {{ formatCategory(article.category) }}
      </span>
      <h3 class="blog-card__title">{{ article.title }}</h3>
      <p class="blog-card__summary">{{ article.summary || article.description }}</p>
      <div class="blog-card__meta">
        <time :datetime="article.date">{{ formatDate(article.date) }}</time>
        <span v-if="article.readingTime">{{ article.readingTime }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup>
const props = defineProps({
  article: { type: Object, required: true },
});

const articleSlug = computed(() => {
  // Extract slug from _path (e.g. /blog/my-article → my-article)
  return props.article._path?.split('/').pop() || '';
});

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCategory(slug) {
  const map = {
    'agentic-commerce': 'Agentic Commerce',
    'ai-merch-agent': 'AI Merch Agent',
    'prompt-to-product': 'Prompt-to-Product',
    'creator-economy': 'Creator Economy',
    'supply-chain-fulfillment': 'Supply Chain',
    'design-technology': 'Design & Tech',
  };
  return map[slug] || slug;
}
</script>

<style scoped>
.blog-card {
  display: flex;
  flex-direction: column;
  border-radius: 0.75rem;
  overflow: hidden;
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #e5e7eb);
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.2s, transform 0.2s;
}
.blog-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.blog-card__image {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}
.blog-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}
.blog-card:hover .blog-card__image img {
  transform: scale(1.03);
}
.blog-card__placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #7a61fe 0%, #ff6b38 100%);
}

.blog-card__body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.blog-card__category {
  font-size: 0.75rem;
  font-weight: 600;
  color: #7a61fe;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.5rem;
}

.blog-card__title {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.3;
  margin-bottom: 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.blog-card__summary {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.blog-card__meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--color-text-muted, #9ca3af);
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border, #f3f4f6);
}
</style>
