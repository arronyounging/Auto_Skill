<template>
  <div class="blog-list">
    <!-- Hero Section -->
    <section class="blog-hero">
      <div class="container">
        <h1 class="blog-hero__title">Custyle Blog</h1>
        <p class="blog-hero__subtitle">
          Insights on Agentic Commerce, AI Merchandising, and the future of Prompt-to-Product.
        </p>
      </div>
    </section>

    <!-- Featured Article -->
    <section v-if="featured" class="blog-featured">
      <div class="container">
        <NuxtLink :to="`/blog/${featured._path.split('/').pop()}`" class="featured-card">
          <div class="featured-card__image">
            <img
              v-if="featured.cover"
              :src="featured.cover"
              :alt="featured.coverAlt || featured.title"
              loading="lazy"
            />
            <div v-else class="featured-card__placeholder" />
          </div>
          <div class="featured-card__content">
            <span class="featured-card__badge">Featured</span>
            <span v-if="featured.category" class="featured-card__category">
              {{ formatCategory(featured.category) }}
            </span>
            <h2 class="featured-card__title">{{ featured.title }}</h2>
            <p class="featured-card__summary">{{ featured.summary || featured.description }}</p>
            <div class="featured-card__meta">
              <time :datetime="featured.date">{{ formatDate(featured.date) }}</time>
              <span v-if="featured.readingTime" class="featured-card__reading">
                {{ featured.readingTime }}
              </span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- Category Filter -->
    <section class="blog-filters">
      <div class="container">
        <div class="category-tabs">
          <button
            :class="['category-tab', { active: !activeCategory }]"
            @click="activeCategory = null"
          >
            All
          </button>
          <button
            v-for="cat in categories"
            :key="cat.id"
            :class="['category-tab', { active: activeCategory === cat.id }]"
            @click="activeCategory = cat.id"
          >
            {{ cat.name }}
          </button>
        </div>
      </div>
    </section>

    <!-- Article Grid -->
    <section class="blog-grid">
      <div class="container">
        <div class="articles-grid">
          <BlogCard
            v-for="article in filteredArticles"
            :key="article._path"
            :article="article"
          />
        </div>

        <!-- Empty State -->
        <div v-if="filteredArticles.length === 0" class="blog-empty">
          <p>No articles found in this category yet.</p>
        </div>

        <!-- Load More -->
        <div v-if="hasMore" class="blog-load-more">
          <button class="btn-load-more" @click="loadMore">
            Load More Articles
          </button>
        </div>
      </div>
    </section>

    <!-- Newsletter CTA -->
    <section class="blog-newsletter">
      <div class="container">
        <div class="newsletter-card">
          <h3>Stay updated on Agentic Commerce</h3>
          <p>Get the latest insights on AI merchandising and Prompt-to-Product delivered to your inbox.</p>
          <form class="newsletter-form" @submit.prevent="subscribe">
            <input
              v-model="email"
              type="email"
              placeholder="Enter your email"
              required
            />
            <button type="submit" class="btn-subscribe">Subscribe</button>
          </form>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const PAGE_SIZE = 12;

const activeCategory = ref(null);
const page = ref(1);
const email = ref('');

// Fetch all blog articles
const { data: articles } = await useAsyncData('blog-list', () =>
  queryContent('/blog')
    .where({ draft: { $ne: true } })
    .sort({ date: -1 })
    .find()
);

// Categories
const categories = [
  { id: 'agentic-commerce', name: 'Agentic Commerce' },
  { id: 'ai-merch-agent', name: 'AI Merch Agent' },
  { id: 'prompt-to-product', name: 'Prompt-to-Product' },
  { id: 'creator-economy', name: 'Creator Economy' },
  { id: 'supply-chain-fulfillment', name: 'Supply Chain' },
  { id: 'design-technology', name: 'Design & Tech' },
];

// Featured: first article (or one marked as featured)
const featured = computed(() => {
  if (!articles.value || articles.value.length === 0) return null;
  return articles.value.find(a => a.featured) || articles.value[0];
});

// Filter by category and exclude featured
const filteredArticles = computed(() => {
  if (!articles.value) return [];
  let list = articles.value.filter(a => a !== featured.value);
  if (activeCategory.value) {
    list = list.filter(a => a.category === activeCategory.value);
  }
  return list.slice(0, page.value * PAGE_SIZE);
});

const hasMore = computed(() => {
  if (!articles.value) return false;
  const total = activeCategory.value
    ? articles.value.filter(a => a.category === activeCategory.value).length - 1
    : articles.value.length - 1;
  return page.value * PAGE_SIZE < total;
});

function loadMore() {
  page.value++;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatCategory(slug) {
  const cat = categories.find(c => c.id === slug);
  return cat ? cat.name : slug;
}

function subscribe() {
  // Integrate with newsletter service
  console.log('Subscribe:', email.value);
  email.value = '';
}

// SEO
useHead({
  title: 'Blog | Custyle — AI Merch Agent for Agentic Commerce',
  meta: [
    {
      name: 'description',
      content: 'Insights on Agentic Commerce, AI merchandising, and the Prompt-to-Product workflow. Stay updated with the latest from Custyle.',
    },
    { property: 'og:title', content: 'Custyle Blog' },
    {
      property: 'og:description',
      content: 'Insights on Agentic Commerce, AI merchandising, and the Prompt-to-Product workflow.',
    },
    { property: 'og:type', content: 'website' },
  ],
});
</script>

<style scoped>
.blog-hero {
  padding: 4rem 0 2rem;
  text-align: center;
}
.blog-hero__title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.blog-hero__subtitle {
  font-size: 1.125rem;
  color: var(--color-text-secondary, #6b7280);
  max-width: 600px;
  margin: 0 auto;
}

.blog-featured {
  padding: 1rem 0 2rem;
}
.featured-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  border-radius: 1rem;
  overflow: hidden;
  background: var(--color-surface, #f9fafb);
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.2s;
}
.featured-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}
.featured-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.featured-card__placeholder {
  width: 100%;
  height: 100%;
  min-height: 300px;
  background: linear-gradient(135deg, #7a61fe 0%, #ff6b38 100%);
}
.featured-card__content {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.featured-card__badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #7a61fe;
  color: white;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  width: fit-content;
  margin-bottom: 0.5rem;
}
.featured-card__category {
  font-size: 0.875rem;
  color: #7a61fe;
  font-weight: 500;
}
.featured-card__title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0.5rem 0;
  line-height: 1.3;
}
.featured-card__summary {
  color: var(--color-text-secondary, #6b7280);
  line-height: 1.6;
}
.featured-card__meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--color-text-muted, #9ca3af);
  margin-top: 1rem;
}

.blog-filters {
  padding: 1rem 0;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}
.category-tabs {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}
.category-tab {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 2rem;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  font-size: 0.875rem;
  transition: all 0.15s;
}
.category-tab:hover {
  border-color: #7a61fe;
  color: #7a61fe;
}
.category-tab.active {
  background: #7a61fe;
  color: white;
  border-color: #7a61fe;
}

.blog-grid {
  padding: 2rem 0;
}
.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.blog-empty {
  text-align: center;
  padding: 4rem 0;
  color: var(--color-text-secondary, #6b7280);
}

.blog-load-more {
  text-align: center;
  padding: 2rem 0;
}
.btn-load-more {
  padding: 0.75rem 2rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.15s;
}
.btn-load-more:hover {
  border-color: #7a61fe;
  color: #7a61fe;
}

.blog-newsletter {
  padding: 3rem 0;
}
.newsletter-card {
  background: linear-gradient(135deg, #7a61fe 0%, #6b4eff 100%);
  color: white;
  padding: 3rem;
  border-radius: 1rem;
  text-align: center;
}
.newsletter-card h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}
.newsletter-card p {
  opacity: 0.9;
  margin-bottom: 1.5rem;
}
.newsletter-form {
  display: flex;
  gap: 0.5rem;
  max-width: 400px;
  margin: 0 auto;
}
.newsletter-form input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}
.btn-subscribe {
  padding: 0.75rem 1.5rem;
  background: #ff6b38;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  transition: background 0.15s;
}
.btn-subscribe:hover {
  background: #e55a2b;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

@media (max-width: 768px) {
  .featured-card {
    grid-template-columns: 1fr;
  }
  .featured-card__placeholder {
    min-height: 200px;
  }
  .articles-grid {
    grid-template-columns: 1fr;
  }
  .newsletter-form {
    flex-direction: column;
  }
}
</style>
