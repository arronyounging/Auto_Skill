<template>
  <article v-if="article" class="blog-article">
    <!-- Breadcrumb -->
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <div class="container">
        <ol class="breadcrumb__list" itemscope itemtype="https://schema.org/BreadcrumbList">
          <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <NuxtLink to="/" itemprop="item"><span itemprop="name">Home</span></NuxtLink>
            <meta itemprop="position" content="1" />
          </li>
          <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <NuxtLink to="/blog" itemprop="item"><span itemprop="name">Blog</span></NuxtLink>
            <meta itemprop="position" content="2" />
          </li>
          <li v-if="article.category" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <NuxtLink :to="`/blog/category/${article.category}`" itemprop="item">
              <span itemprop="name">{{ formatCategory(article.category) }}</span>
            </NuxtLink>
            <meta itemprop="position" content="3" />
          </li>
        </ol>
      </div>
    </nav>

    <!-- Article Header -->
    <header class="article-header">
      <div class="container container--narrow">
        <NuxtLink
          v-if="article.category"
          :to="`/blog/category/${article.category}`"
          class="article-header__category"
        >
          {{ formatCategory(article.category) }}
        </NuxtLink>

        <h1 class="article-header__title">{{ article.title }}</h1>

        <p v-if="article.description" class="article-header__description">
          {{ article.description }}
        </p>

        <!-- Author & Meta -->
        <div class="article-meta">
          <div class="article-meta__author">
            <img
              v-if="authorData?.avatar"
              :src="authorData.avatar"
              :alt="authorData.name"
              class="article-meta__avatar"
            />
            <div>
              <span class="article-meta__name">{{ authorData?.name || article.author }}</span>
              <span v-if="authorData?.role" class="article-meta__role">{{ authorData.role }}</span>
            </div>
          </div>
          <div class="article-meta__details">
            <time :datetime="article.date">{{ formatDate(article.date) }}</time>
            <span v-if="article.readingTime" class="article-meta__reading">
              {{ article.readingTime }} read
            </span>
          </div>
          <!-- Social Share -->
          <div class="article-meta__share">
            <a :href="twitterShareUrl" target="_blank" rel="noopener" aria-label="Share on Twitter">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a :href="linkedinShareUrl" target="_blank" rel="noopener" aria-label="Share on LinkedIn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </header>

    <!-- Cover Image -->
    <div v-if="article.cover" class="article-cover">
      <div class="container">
        <img
          :src="article.cover"
          :alt="article.coverAlt || article.title"
          class="article-cover__img"
          loading="eager"
        />
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="article-body-wrapper">
      <div class="container container--narrow">
        <div class="article-layout">
          <!-- Table of Contents (Sidebar) -->
          <aside v-if="toc && toc.links && toc.links.length > 0" class="article-toc">
            <div class="article-toc__sticky">
              <h4 class="article-toc__title">Table of Contents</h4>
              <nav>
                <ul class="article-toc__list">
                  <li v-for="link in toc.links" :key="link.id">
                    <a :href="`#${link.id}`" :class="{ active: activeHeading === link.id }">
                      {{ link.text }}
                    </a>
                    <ul v-if="link.children && link.children.length > 0">
                      <li v-for="child in link.children" :key="child.id">
                        <a :href="`#${child.id}`" :class="{ active: activeHeading === child.id }">
                          {{ child.text }}
                        </a>
                      </li>
                    </ul>
                  </li>
                </ul>
              </nav>
            </div>
          </aside>

          <!-- Article Content -->
          <div class="article-content">
            <ContentRenderer :value="article" />
          </div>
        </div>
      </div>
    </div>

    <!-- Author Bio -->
    <section v-if="authorData" class="author-bio">
      <div class="container container--narrow">
        <div class="author-bio__card">
          <img
            v-if="authorData.avatar"
            :src="authorData.avatar"
            :alt="authorData.name"
            class="author-bio__avatar"
          />
          <div>
            <h4 class="author-bio__name">{{ authorData.name }}</h4>
            <p v-if="authorData.role" class="author-bio__role">{{ authorData.role }}</p>
            <p class="author-bio__text">{{ authorData.bio }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Related Articles -->
    <section v-if="relatedArticles && relatedArticles.length > 0" class="related-articles">
      <div class="container">
        <h3 class="related-articles__title">Related Articles</h3>
        <div class="related-articles__grid">
          <BlogCard
            v-for="related in relatedArticles"
            :key="related._path"
            :article="related"
          />
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="article-cta">
      <div class="container container--narrow">
        <div class="cta-card">
          <h3>Ready to turn ideas into products?</h3>
          <p>Try Custyle's AI Merch Agent — go from prompt to sellable merchandise in minutes.</p>
          <div class="cta-card__buttons">
            <NuxtLink to="https://custyle.ai" class="btn-primary">Start Creating</NuxtLink>
            <NuxtLink to="/blog" class="btn-secondary">Read More</NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- JSON-LD Structured Data -->
    <Head>
      <script type="application/ld+json">
        {{ jsonLd }}
      </script>
    </Head>
  </article>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const route = useRoute();
const slug = route.params.slug;

// Fetch article
const { data: article } = await useAsyncData(`blog-${slug}`, () =>
  queryContent('/blog', slug).findOne()
);

if (!article.value) {
  throw createError({ statusCode: 404, statusMessage: 'Article not found' });
}

// TOC from article
const toc = computed(() => article.value?.body?.toc || { links: [] });

// Active heading tracking for TOC highlight
const activeHeading = ref('');

let observer = null;
onMounted(() => {
  const headings = document.querySelectorAll('.article-content h2, .article-content h3');
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeHeading.value = entry.target.id;
        }
      }
    },
    { rootMargin: '-80px 0px -60% 0px' }
  );
  headings.forEach(h => observer.observe(h));
});

onUnmounted(() => {
  observer?.disconnect();
});

// Author data
const authors = {
  'custyle-team': {
    name: 'Custyle Team',
    role: 'Custyle Editorial',
    avatar: '/images/authors/custyle-team.png',
    bio: 'The Custyle team builds the world\'s first AI MerchAgent — turning creative intent into sellable, fulfillable merchandise through Agentic Commerce.',
  },
  'custyle-engineering': {
    name: 'Custyle Engineering',
    role: 'Engineering Team',
    avatar: '/images/authors/custyle-engineering.png',
    bio: 'The engineering team behind Custyle\'s AI-powered merchandising pipeline — from generative design to production-ready fulfillment.',
  },
};

const authorData = computed(() => {
  if (!article.value?.author) return authors['custyle-team'];
  return authors[article.value.author] || { name: article.value.author };
});

// Related articles (same category, exclude current)
const { data: relatedArticles } = await useAsyncData(`related-${slug}`, () =>
  queryContent('/blog')
    .where({
      category: article.value?.category,
      _path: { $ne: article.value?._path },
      draft: { $ne: true },
    })
    .sort({ date: -1 })
    .limit(3)
    .find()
);

// Share URLs
const pageUrl = computed(() => `https://custyle.ai/blog/${slug}`);
const twitterShareUrl = computed(
  () => `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl.value)}&text=${encodeURIComponent(article.value?.title || '')}`
);
const linkedinShareUrl = computed(
  () => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl.value)}`
);

// JSON-LD
const jsonLd = computed(() =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.value?.title,
    description: article.value?.description,
    image: article.value?.cover ? `https://custyle.ai${article.value.cover}` : undefined,
    datePublished: article.value?.date,
    author: {
      '@type': 'Organization',
      name: authorData.value?.name || 'Custyle',
      url: 'https://custyle.ai',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Custyle',
      url: 'https://custyle.ai',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl.value,
    },
  })
);

// Helper
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatCategory(slug) {
  const map = {
    'agentic-commerce': 'Agentic Commerce',
    'ai-merch-agent': 'AI Merch Agent',
    'prompt-to-product': 'Prompt-to-Product',
    'creator-economy': 'Creator Economy',
    'supply-chain-fulfillment': 'Supply Chain & Fulfillment',
    'design-technology': 'Design & Technology',
  };
  return map[slug] || slug;
}

// SEO
useHead({
  title: `${article.value?.title} | Custyle Blog`,
  meta: [
    { name: 'description', content: article.value?.description },
    { property: 'og:title', content: article.value?.title },
    { property: 'og:description', content: article.value?.description },
    { property: 'og:type', content: 'article' },
    { property: 'og:url', content: pageUrl.value },
    ...(article.value?.cover
      ? [{ property: 'og:image', content: `https://custyle.ai${article.value.cover}` }]
      : []),
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: article.value?.title },
    { name: 'twitter:description', content: article.value?.description },
  ],
  link: [{ rel: 'canonical', href: pageUrl.value }],
});
</script>

<style scoped>
.breadcrumb {
  padding: 1rem 0;
  font-size: 0.875rem;
}
.breadcrumb__list {
  display: flex;
  list-style: none;
  gap: 0.5rem;
  padding: 0;
  margin: 0;
}
.breadcrumb__list li:not(:last-child)::after {
  content: '/';
  margin-left: 0.5rem;
  color: var(--color-text-muted, #9ca3af);
}
.breadcrumb__list a {
  color: var(--color-text-secondary, #6b7280);
  text-decoration: none;
}
.breadcrumb__list a:hover {
  color: #7a61fe;
}

.article-header {
  padding: 1rem 0 2rem;
}
.article-header__category {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: rgba(122, 97, 254, 0.1);
  color: #7a61fe;
  border-radius: 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  margin-bottom: 1rem;
}
.article-header__title {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 1rem;
}
.article-header__description {
  font-size: 1.125rem;
  color: var(--color-text-secondary, #6b7280);
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
}
.article-meta__author {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.article-meta__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}
.article-meta__name {
  display: block;
  font-weight: 600;
  font-size: 0.875rem;
}
.article-meta__role {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted, #9ca3af);
}
.article-meta__details {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
}
.article-meta__share {
  display: flex;
  gap: 0.75rem;
  margin-left: auto;
}
.article-meta__share a {
  color: var(--color-text-secondary, #6b7280);
  transition: color 0.15s;
}
.article-meta__share a:hover {
  color: #7a61fe;
}

.article-cover {
  padding: 1rem 0 2rem;
}
.article-cover__img {
  width: 100%;
  max-height: 480px;
  object-fit: cover;
  border-radius: 1rem;
}

.article-body-wrapper {
  padding: 0 0 3rem;
}
.article-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 3rem;
}

.article-toc {
  font-size: 0.875rem;
}
.article-toc__sticky {
  position: sticky;
  top: 5rem;
}
.article-toc__title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted, #9ca3af);
  margin-bottom: 0.75rem;
}
.article-toc__list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.article-toc__list li {
  margin-bottom: 0.5rem;
}
.article-toc__list a {
  color: var(--color-text-secondary, #6b7280);
  text-decoration: none;
  line-height: 1.4;
  display: block;
  padding-left: 0.75rem;
  border-left: 2px solid transparent;
  transition: all 0.15s;
}
.article-toc__list a:hover,
.article-toc__list a.active {
  color: #7a61fe;
  border-left-color: #7a61fe;
}
.article-toc__list ul {
  list-style: none;
  padding-left: 0.75rem;
  margin: 0.25rem 0 0;
}

.article-content {
  min-width: 0;
}
.article-content :deep(h2) {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  scroll-margin-top: 5rem;
}
.article-content :deep(h3) {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
  scroll-margin-top: 5rem;
}
.article-content :deep(p) {
  line-height: 1.75;
  margin-bottom: 1.25rem;
}
.article-content :deep(a) {
  color: #7a61fe;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.article-content :deep(ul),
.article-content :deep(ol) {
  padding-left: 1.5rem;
  margin-bottom: 1.25rem;
  line-height: 1.75;
}
.article-content :deep(blockquote) {
  border-left: 3px solid #7a61fe;
  padding-left: 1rem;
  margin: 1.5rem 0;
  color: var(--color-text-secondary, #6b7280);
  font-style: italic;
}
.article-content :deep(img) {
  max-width: 100%;
  border-radius: 0.75rem;
  margin: 1.5rem 0;
}
.article-content :deep(code) {
  background: var(--color-surface, #f3f4f6);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}
.article-content :deep(pre) {
  background: var(--color-surface, #1f2937);
  color: #e5e7eb;
  padding: 1.25rem;
  border-radius: 0.75rem;
  overflow-x: auto;
  margin: 1.5rem 0;
}

.author-bio {
  padding: 2rem 0;
  border-top: 1px solid var(--color-border, #e5e7eb);
}
.author-bio__card {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}
.author-bio__avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.author-bio__name {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.125rem;
}
.author-bio__role {
  font-size: 0.875rem;
  color: #7a61fe;
  margin-bottom: 0.5rem;
}
.author-bio__text {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  line-height: 1.6;
}

.related-articles {
  padding: 3rem 0;
  background: var(--color-surface, #f9fafb);
}
.related-articles__title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
}
.related-articles__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.article-cta {
  padding: 3rem 0;
}
.cta-card {
  background: linear-gradient(135deg, #7a61fe 0%, #6b4eff 100%);
  color: white;
  padding: 3rem;
  border-radius: 1rem;
  text-align: center;
}
.cta-card h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}
.cta-card p {
  opacity: 0.9;
  margin-bottom: 1.5rem;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}
.cta-card__buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}
.btn-primary {
  padding: 0.75rem 2rem;
  background: #ff6b38;
  color: white;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 600;
  transition: background 0.15s;
}
.btn-primary:hover {
  background: #e55a2b;
}
.btn-secondary {
  padding: 0.75rem 2rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 600;
  transition: background 0.15s;
}
.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}
.container--narrow {
  max-width: 900px;
}

@media (max-width: 768px) {
  .article-header__title {
    font-size: 1.75rem;
  }
  .article-layout {
    grid-template-columns: 1fr;
  }
  .article-toc {
    display: none;
  }
  .cta-card__buttons {
    flex-direction: column;
    align-items: center;
  }
}
</style>
