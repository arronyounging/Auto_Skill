<template>
  <div class="blog-category">
    <section class="category-header">
      <div class="container">
        <NuxtLink to="/blog" class="category-header__back">← All Articles</NuxtLink>
        <h1 class="category-header__title">{{ categoryName }}</h1>
        <p v-if="categoryDescription" class="category-header__description">
          {{ categoryDescription }}
        </p>
      </div>
    </section>

    <section class="category-grid">
      <div class="container">
        <div class="articles-grid">
          <BlogCard
            v-for="article in articles"
            :key="article._path"
            :article="article"
          />
        </div>
        <div v-if="!articles || articles.length === 0" class="category-empty">
          <p>No articles in this category yet. Check back soon!</p>
          <NuxtLink to="/blog" class="btn-back">Browse All Articles</NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
const route = useRoute();
const slug = route.params.slug;

const categoryMap = {
  'agentic-commerce': {
    name: 'Agentic Commerce',
    description: 'Insights and analysis on the emerging Agentic Commerce ecosystem — where AI agents autonomously discover, negotiate, and complete transactions.',
  },
  'ai-merch-agent': {
    name: 'AI Merch Agent',
    description: 'Deep dives into how AI Merch Agents transform intent into sellable, fulfillable merchandise — from prompt to production.',
  },
  'prompt-to-product': {
    name: 'Prompt-to-Product',
    description: 'Practical guides and case studies on turning text prompts or images into production-ready, sellable merchandise.',
  },
  'creator-economy': {
    name: 'Creator Economy',
    description: 'How creators, communities, and brands use AI merchandising to monetize their identity and audience.',
  },
  'supply-chain-fulfillment': {
    name: 'Supply Chain & Fulfillment',
    description: 'Inside the fulfillment pipeline — from design validation to production routing, quality control, and delivery.',
  },
  'design-technology': {
    name: 'Design & Technology',
    description: 'The AI and design technology powering next-generation merchandise creation — from generative models to virtual try-on.',
  },
};

const categoryName = computed(() => categoryMap[slug]?.name || slug);
const categoryDescription = computed(() => categoryMap[slug]?.description || '');

const { data: articles } = await useAsyncData(`category-${slug}`, () =>
  queryContent('/blog')
    .where({ category: slug, draft: { $ne: true } })
    .sort({ date: -1 })
    .find()
);

useHead({
  title: `${categoryName.value} | Custyle Blog`,
  meta: [
    { name: 'description', content: categoryDescription.value },
    { property: 'og:title', content: `${categoryName.value} | Custyle Blog` },
    { property: 'og:description', content: categoryDescription.value },
  ],
});
</script>

<style scoped>
.category-header {
  padding: 3rem 0 2rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}
.category-header__back {
  font-size: 0.875rem;
  color: #7a61fe;
  text-decoration: none;
  margin-bottom: 1rem;
  display: inline-block;
}
.category-header__title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.category-header__description {
  font-size: 1.125rem;
  color: var(--color-text-secondary, #6b7280);
  max-width: 600px;
  line-height: 1.6;
}

.category-grid {
  padding: 2rem 0 4rem;
}
.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.category-empty {
  text-align: center;
  padding: 4rem 0;
  color: var(--color-text-secondary, #6b7280);
}
.btn-back {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  border: 1px solid #7a61fe;
  color: #7a61fe;
  border-radius: 0.5rem;
  text-decoration: none;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}
</style>
