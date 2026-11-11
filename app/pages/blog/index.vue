<script setup lang="ts">
import CoverArt from "~/components/blog/CoverArt.vue";
import { formatArticleDate } from "~/data/sampleBlogs";
import type { BlogArticleSummary } from "#shared/types/blog";

const { data: articles, error } = await useFetch<BlogArticleSummary[]>(
  "/api/articles",
  {
    default: () => [],
  },
);
const sortOrder = ref<"newest" | "oldest">("newest");
const featuredArticle = computed(() => articles.value[0] ?? null);
const sortedArticles = computed(() =>
  articles.value.slice(1).sort((a, b) => {
    const difference =
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    return sortOrder.value === "newest" ? difference : -difference;
  }),
);

const canonicalUrl = useCanonicalUrl();
const shareImageUrl = useAbsoluteSiteUrl("/og/article-ink.png");
const pageDescription =
  "Explore company rankings, verified statistics and editorial analysis built from uploaded datasets.";

useSeoMeta({
  title: "Company data stories — BG",
  description: pageDescription,
  ogType: "website",
  ogTitle: "Company data stories — BG",
  ogDescription: pageDescription,
  ogUrl: () => canonicalUrl.value,
  ogImage: () => shareImageUrl.value,
  ogImageAlt: "BG company data stories illustration",
  ogImageWidth: 1200,
  ogImageHeight: 630,
});

useHead(() => ({
  link: [{ rel: "canonical", href: canonicalUrl.value }],
  script: [
    {
      type: "application/ld+json",
      textContent: jsonLd({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Company data stories",
        description: pageDescription,
        url: canonicalUrl.value,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: articles.value.map((article, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: article.title,
            url: new URL(`/blog/${article.slug}`, canonicalUrl.value).toString(),
          })),
        },
      }),
    },
  ],
}));
</script>

<template>
  <section
    class="mx-auto max-w-[1370px] px-[clamp(16px,5.5vw,76px)] pt-5 pb-16 sm:pt-14 sm:pb-24"
  >
    <header class="mb-8 max-w-[760px] sm:mb-10">
      <p
        class="text-[10px] font-extrabold tracking-[.2em] text-[#e27651] uppercase"
      >
        The library
      </p>
      <h1
        class="mt-3 font-['Space_Grotesk'] text-[clamp(42px,7vw,72px)] leading-none font-bold tracking-[-.06em]"
      >
        Company data stories
      </h1>
    </header>
    <NuxtLink
      v-if="featuredArticle"
      :to="`/blog/${featuredArticle.slug}`"
      class="group relative block min-h-[480px] overflow-hidden rounded-[20px] bg-[#171917] text-white sm:min-h-[620px] sm:rounded-[24px]"
    >
      <CoverArt :accent="featuredArticle.accent" />
      <div
        class="absolute inset-0 bg-[linear-gradient(90deg,rgba(14,16,14,.9)_0%,rgba(14,16,14,.62)_48%,rgba(14,16,14,.08)_100%)]"
      ></div>
      <div
        class="relative z-[2] flex min-h-[480px] max-w-[760px] flex-col justify-end p-5 sm:min-h-[620px] sm:p-[clamp(42px,6vw,76px)]"
      >
        <p
          class="mb-5 text-[11px] font-extrabold tracking-[.2em] text-[#ff9a76] uppercase"
        >
          {{ featuredArticle.eyebrow }}
        </p>
        <h2
          class="font-['Space_Grotesk'] text-[clamp(35px,9vw,82px)] leading-[.98] font-bold tracking-[-.06em] [overflow-wrap:anywhere]"
        >
          {{ featuredArticle.title }}
        </h2>
        <p
          class="mt-6 max-w-[620px] text-[15px] leading-7 text-white/75 sm:text-lg"
        >
          {{ featuredArticle.excerpt }}
        </p>
        <div
          class="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-white/65"
        >
          <span>{{ formatArticleDate(featuredArticle.publishedAt) }}</span
          ><span aria-hidden="true">•</span
          ><span>{{ featuredArticle.readingMinutes }} min read</span>
          <span
            class="ml-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl text-[#171917] transition-transform group-hover:translate-x-1"
            >→</span
          >
        </div>
      </div>
    </NuxtLink>

    <div
      v-else
      class="flex min-h-[360px] flex-col items-center justify-center rounded-[20px] border border-[#dfe2da] bg-[#f5f6f1] px-5 py-12 text-center sm:min-h-[440px] sm:rounded-[24px] sm:px-6"
    >
      <p
        class="text-[10px] font-extrabold tracking-[.2em] text-[#e27651] uppercase"
      >
        {{ error ? "Unable to load stories" : "The library is ready" }}
      </p>
      <h2
        class="mt-4 max-w-[700px] font-['Space_Grotesk'] text-[clamp(34px,9vw,70px)] leading-[1] font-bold tracking-[-.055em] [overflow-wrap:anywhere]"
      >
        {{
          error
            ? "Published articles could not be loaded."
            : "Your first data story will appear here."
        }}
      </h2>
      <p class="mt-5 max-w-[560px] text-base leading-7 text-[#656b63]">
        {{
          error
            ? "Please try again in a moment."
            : "Upload a company dataset, generate the article, review it, and confirm publication."
        }}
      </p>
      <NuxtLink
        v-if="!error"
        to="/upload"
        class="mt-8 inline-flex min-h-12 items-center rounded-full bg-[#171917] px-6 text-sm font-bold text-white"
        >Create an article</NuxtLink
      >
    </div>

    <div
      v-if="featuredArticle"
      class="mt-16 flex flex-col gap-5 border-b border-[#dcdfd7] pb-7 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <h2
          class="mt-2 font-['Space_Grotesk'] text-[clamp(36px,5vw,58px)] font-bold tracking-[-.055em]"
        >
          More data stories
        </h2>
        <p class="mt-2 max-w-[520px] text-sm leading-6 text-[#6b7169]">
          Company rankings, patterns and analysis presented as clear editorial
          articles.
        </p>
      </div>
      <label
        class="inline-flex shrink-0 items-center gap-3 self-start text-xs font-bold text-[#676d65] sm:self-auto"
        >Sort by
        <select
          v-model="sortOrder"
          class="min-h-11 rounded-lg border border-[#d7dbd3] bg-white px-4 pr-10 text-sm font-bold text-[#171917] outline-none focus:border-[#e27651] focus:ring-2 focus:ring-[#f7dfd6]"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </label>
    </div>

    <div
      v-if="featuredArticle && sortedArticles.length"
      class="grid gap-x-6 gap-y-12 pt-8 md:grid-cols-2 lg:grid-cols-3"
    >
      <NuxtLink
        v-for="article in sortedArticles"
        :key="article.slug"
        :to="`/blog/${article.slug}`"
        class="group block"
      >
        <CoverArt
          :accent="article.accent"
          compact
          class="overflow-hidden rounded-2xl"
        />
        <div
          class="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-[#858b83]"
        >
          <span>{{ formatArticleDate(article.publishedAt) }}</span
          ><span>•</span><span>{{ article.readingMinutes }} min read</span>
        </div>
        <h3
          class="mt-3 font-['Space_Grotesk'] text-[25px] leading-[1.08] font-bold tracking-[-.045em] transition-colors [overflow-wrap:anywhere] group-hover:text-[#df704d]"
        >
          {{ article.title }}
        </h3>
        <p class="mt-3 line-clamp-3 text-sm leading-6 text-[#676d65]">
          {{ article.excerpt }}
        </p>
        <span class="mt-5 inline-flex items-center gap-2 text-xs font-extrabold"
          >Read story
          <span class="transition-transform group-hover:translate-x-1"
            >→</span
          ></span
        >
      </NuxtLink>
    </div>
    <p v-else-if="featuredArticle" class="pt-10 text-sm text-[#777d75]">
      More stories will appear here as they are published.
    </p>
  </section>
</template>
