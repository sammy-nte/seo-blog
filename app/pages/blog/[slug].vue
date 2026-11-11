<script setup lang="ts">
import StatCard from "~/components/blog/StatCard.vue";
import { findSampleBlog, formatArticleDate } from "~/data/sampleBlogs";
import type { BlogArticle } from "#shared/types/blog";
import type { GeneratedArticlePreview } from "#shared/types/articlePreview";

const route = useRoute();
const slug = computed(() => String(route.params.slug));
const articlePreview = useState<GeneratedArticlePreview | null>(
  "generated-article-preview",
  () => null,
);
const { data: loadedArticle, error } = await useAsyncData(
  `article-${slug.value}`,
  async () => {
    if (articlePreview.value?.article.slug === slug.value)
      return articlePreview.value.article;
    const sample = findSampleBlog(slug.value);
    return sample ?? (await $fetch<BlogArticle>(`/api/articles/${slug.value}`));
  },
);
if (error.value || !loadedArticle.value)
  throw createError({ statusCode: 404, statusMessage: "Article not found." });
const article = computed(() => loadedArticle.value!);
const isPreview = computed(
  () => articlePreview.value?.article.slug === article.value.slug,
);
const isPublishing = ref(false);
const publishError = ref("");
const selectedMetric = ref("");
const selectedDirection = ref<"asc" | "desc">("desc");
const siteUrl = useSiteUrl();
const canonicalUrl = useCanonicalUrl();
const shareImageUrl = useAbsoluteSiteUrl(
  computed(() => `/og/article-${article.value.accent}.png`),
);

const activeMetric = computed(
  () =>
    article.value.ranking.metrics.find(
      (metric) => metric.key === selectedMetric.value,
    ) ?? article.value.ranking.metrics[0],
);
const rankedRows = computed(() =>
  [...article.value.ranking.rows].sort((a, b) => {
    const aValue = a.values[activeMetric.value?.key ?? ""]?.sortValue ?? null;
    const bValue = b.values[activeMetric.value?.key ?? ""]?.sortValue ?? null;
    if (aValue === null || bValue === null)
      return aValue === bValue
        ? a.entity.localeCompare(b.entity)
        : aValue === null
          ? 1
          : -1;
    return selectedDirection.value === "asc"
      ? aValue - bValue
      : bValue - aValue;
  }),
);

const jumpLinks = computed(() => [
  ...(article.value.takeaways.length
    ? [{ id: "takeaways", label: "Key takeaways" }]
    : []),
  ...(article.value.stats.length
    ? [{ id: "statistics", label: "Dataset in brief" }]
    : []),
  ...article.value.sections
    .slice(0, 1)
    .map((section, index) => ({
      id: `analysis-${index + 1}`,
      label: section.heading,
    })),
  ...(article.value.ranking.rows.length
    ? [{ id: "ranking", label: article.value.ranking.title }]
    : []),
  ...article.value.sections
    .slice(1)
    .map((section, index) => ({
      id: `analysis-${index + 2}`,
      label: section.heading,
    })),
  ...(article.value.methodology
    ? [{ id: "methodology", label: "Methodology & data note" }]
    : []),
  ...(article.value.conclusion
    ? [{ id: "conclusion", label: "Conclusion" }]
    : []),
]);

watch(
  article,
  (current) => {
    selectedMetric.value = current.defaultRankingMetric;
    selectedDirection.value = current.defaultRankingDirection;
  },
  { immediate: true },
);

function onMetricChange() {
  if (activeMetric.value)
    selectedDirection.value = activeMetric.value.defaultDirection;
}

async function publishArticle() {
  if (!articlePreview.value || isPublishing.value) return;
  isPublishing.value = true;
  publishError.value = "";
  try {
    const result = await $fetch<{ url: string }>("/api/articles/publish", {
      method: "POST",
      body: {
        request: articlePreview.value.request,
        editorial: articlePreview.value.editorial,
        publishedAt: articlePreview.value.article.publishedAt,
        slug: articlePreview.value.article.slug,
      },
      timeout: 45_000,
      retry: 0,
    });
    articlePreview.value = null;
    await navigateTo(result.url, { external: true });
  } catch (error) {
    const failure = error as { data?: { statusMessage?: string } };
    publishError.value =
      failure.data?.statusMessage ??
      "The article could not be published. Your preview is still available.";
  } finally {
    isPublishing.value = false;
  }
}

useSeoMeta({
  title: () => article.value.seoTitle,
  description: () => article.value.metaDescription,
  ogType: "article",
  ogTitle: () => article.value.seoTitle,
  ogDescription: () => article.value.metaDescription,
  ogUrl: () => canonicalUrl.value,
  ogImage: () => shareImageUrl.value,
  ogImageAlt: () => `${article.value.title} — BG data story`,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  articlePublishedTime: () => article.value.publishedAt,
  twitterCard: "summary_large_image",
  twitterTitle: () => article.value.seoTitle,
  twitterDescription: () => article.value.metaDescription,
  twitterImage: () => shareImageUrl.value,
});

useHead(() => ({
  link: [{ rel: "canonical", href: canonicalUrl.value }],
  script: [
    {
      type: "application/ld+json",
      textContent: jsonLd({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: article.value.title,
        description: article.value.metaDescription,
        url: canonicalUrl.value,
        mainEntityOfPage: canonicalUrl.value,
        image: [shareImageUrl.value],
        datePublished: article.value.publishedAt,
        isAccessibleForFree: true,
        author: {
          "@type": "Organization",
          name: "BG",
          url: siteUrl.value,
        },
        publisher: {
          "@type": "Organization",
          name: "BG",
          url: siteUrl.value,
        },
      }),
    },
  ],
}));
</script>

<template>
  <article>
    <div
      v-if="isPreview"
      class="sticky top-0 z-20 border-y border-[#efc5b6] bg-[#fff3ed]/95 px-5 py-3 backdrop-blur"
    >
      <div
        class="mx-auto flex max-w-[1120px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p class="text-sm font-bold text-[#7f3d29]">
            Article preview — not published
          </p>
          <p class="mt-1 text-xs text-[#97604e]">
            Read the full article and check the ranking before publishing it.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#171917] px-5 text-xs font-bold text-white disabled:opacity-50 sm:w-auto"
          :disabled="isPublishing"
          @click="publishArticle"
        >
          <span
            v-if="isPublishing"
            class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden="true"
          ></span
          >{{ isPublishing ? "Publishing…" : "Confirm and publish" }}
        </button>
      </div>
      <p
        v-if="publishError"
        role="alert"
        class="mx-auto mt-3 max-w-[1120px] rounded-lg bg-white px-4 py-2 text-xs font-semibold text-[#a43e28]"
      >
        {{ publishError }}
      </p>
    </div>
    <div class="px-5 pt-8 sm:px-8 sm:pt-10">
      <NuxtLink
        to="/blog"
        class="inline-flex items-center gap-2 text-xs font-extrabold tracking-[.08em] text-[#777d75] uppercase hover:text-[#e27651]"
        >← All stories</NuxtLink
      >
    </div>
    <header
      class="mx-auto max-w-[1120px] px-[clamp(16px,5.5vw,72px)] pt-[clamp(40px,7vw,90px)] pb-[clamp(48px,8vw,100px)] text-center"
    >
      <p
        class="text-[11px] font-extrabold tracking-[.2em] text-[#e27651] uppercase"
      >
        {{ article.eyebrow }}
      </p>
      <h1
        class="mx-auto mt-5 max-w-[1000px] font-['Space_Grotesk'] text-[clamp(40px,10vw,94px)] leading-[.98] font-bold tracking-[-.065em] [overflow-wrap:anywhere]"
      >
        {{ article.title }}
      </h1>
      <p
        class="mx-auto mt-7 max-w-[760px] text-[clamp(17px,2vw,21px)] leading-[1.65] text-[#5f655d]"
      >
        {{ article.intro }}
      </p>
      <div
        class="mt-8 flex items-center justify-center gap-3 text-xs font-semibold text-[#858b83]"
      >
        <time :datetime="article.publishedAt">{{
          formatArticleDate(article.publishedAt)
        }}</time
        ><span>•</span><span>{{ article.readingMinutes }} min read</span>
      </div>
    </header>

    <div class="mx-auto max-w-[1370px] px-[clamp(16px,5.5vw,76px)]">
      <div
        class="relative min-h-[260px] overflow-hidden rounded-[20px] bg-[#222820] sm:min-h-[470px] sm:rounded-[24px]"
        aria-hidden="true"
      >
        <div
          class="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:64px_64px]"
        ></div>
        <div
          class="absolute top-[14%] left-[8%] h-[70%] w-[70%] rounded-full border border-white/20"
        ></div>
        <div
          class="absolute -right-[5%] -bottom-[35%] h-[100%] w-[55%] rounded-full bg-[#ea7955]"
        ></div>
        <div
          class="article-data-bars absolute inset-x-[8%] bottom-[12%] flex h-[62%] items-end gap-[clamp(10px,3vw,42px)]"
        >
          <i></i><i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <p
          class="absolute top-7 left-7 text-[10px] font-extrabold tracking-[.22em] text-white/65 sm:top-10 sm:left-10"
        >
          A COMPANY DATA STORY
        </p>
      </div>
    </div>

    <div
      class="mx-auto grid w-full min-w-0 max-w-[1120px] gap-[clamp(56px,10vw,120px)] px-[clamp(16px,5.5vw,72px)] py-[clamp(58px,10vw,130px)]"
    >
      <nav
        v-if="jumpLinks.length"
        aria-label="In this article"
        class="rounded-2xl border border-[#e1e4dc] bg-white p-5 shadow-[0_12px_35px_rgba(25,30,24,.04)] sm:p-7"
      >
        <p
          class="text-[10px] font-extrabold tracking-[.18em] text-[#e27651] uppercase"
        >
          In this article
        </p>
        <ol class="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <li v-for="(link, index) in jumpLinks" :key="link.id">
            <a
              :href="`#${link.id}`"
              class="group flex gap-3 text-sm font-semibold text-[#555b53] hover:text-[#e27651]"
              ><span class="text-[#a0a59d]">{{
                String(index + 1).padStart(2, "0")
              }}</span
              ><span
                class="underline decoration-[#d9ddd4] underline-offset-4 group-hover:decoration-[#e27651]"
                >{{ link.label }}</span
              ></a
            >
          </li>
        </ol>
      </nav>

      <section
        v-if="article.takeaways.length"
        id="takeaways"
        class="scroll-mt-8 grid gap-8 border-y border-[#dfe2da] py-10 md:grid-cols-[.65fr_1.35fr] md:py-14"
      >
        <div>
          <p
            class="text-[10px] font-extrabold tracking-[.18em] text-[#e27651] uppercase"
          >
            At a glance
          </p>
          <h2
            class="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.05em]"
          >
            Key takeaways
          </h2>
        </div>
        <ul class="grid gap-5">
          <li
            v-for="(takeaway, index) in article.takeaways"
            :key="takeaway"
            class="flex gap-4 text-[16px] leading-7 text-[#4f554e]"
          >
            <span
              class="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8f0d8] text-[10px] font-extrabold text-[#46573a]"
              >{{ index + 1 }}</span
            >{{ takeaway }}
          </li>
        </ul>
      </section>

      <section v-if="article.stats.length" id="statistics" class="min-w-0 scroll-mt-8">
        <div class="mb-7 max-w-[620px]">
          <p
            class="text-[10px] font-extrabold tracking-[.18em] text-[#e27651] uppercase"
          >
            The numbers
          </p>
          <h2
            class="mt-3 font-['Space_Grotesk'] text-[clamp(34px,5vw,48px)] font-bold tracking-[-.055em]"
          >
            Dataset in brief
          </h2>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            v-for="stat in article.stats"
            :key="stat.key"
            :label="stat.label"
            :value="stat.value"
            :description="stat.description"
          />
        </div>
      </section>

      <section
        v-if="article.sections[0]"
        id="analysis-1"
        class="scroll-mt-8 mx-auto grid w-full max-w-[900px] gap-5 md:grid-cols-[140px_1fr] md:gap-10"
      >
        <p
          class="pt-2 text-[10px] font-extrabold tracking-[.18em] text-[#9b9f98]"
        >
          01
        </p>
        <div>
          <h2
            class="font-['Space_Grotesk'] text-[clamp(33px,5vw,50px)] leading-[1.05] font-bold tracking-[-.055em] [overflow-wrap:anywhere]"
          >
            {{ article.sections[0].heading }}
          </h2>
          <p
            v-for="paragraph in article.sections[0].paragraphs"
            :key="paragraph"
            class="mt-6 text-[17px] leading-8 text-[#555b53]"
          >
            {{ paragraph }}
          </p>
        </div>
      </section>

      <section
        v-if="article.ranking.rows.length && activeMetric"
        id="ranking"
        class="min-w-0 scroll-mt-8"
        aria-labelledby="ranking-title"
      >
        <div class="max-w-[720px]">
          <p
            class="text-[10px] font-extrabold tracking-[.18em] text-[#e27651] uppercase"
          >
            The complete list
          </p>
          <h2
            id="ranking-title"
            class="mt-3 font-['Space_Grotesk'] text-[clamp(34px,8vw,58px)] font-bold tracking-[-.055em] [overflow-wrap:anywhere]"
          >
            {{ article.ranking.title }}
          </h2>
          <p class="mt-4 text-base leading-7 text-[#656b63]">
            {{ article.ranking.description }}
          </p>
        </div>
        <div
          class="mt-7 flex flex-col gap-4 rounded-xl border border-[#e1e4dc] bg-[#f6f7f3] p-4 sm:flex-row sm:items-end sm:p-5"
        >
          <label
            class="flex-1 text-[11px] font-extrabold tracking-[.08em] text-[#71776f] uppercase"
            >Ranking metric<select
              v-model="selectedMetric"
              class="mt-2 min-h-11 w-full rounded-lg border border-[#d4d8d0] bg-white px-3 text-sm font-bold normal-case tracking-normal text-[#171917] outline-none focus:border-[#e27651] focus:ring-2 focus:ring-[#f7dfd6]"
              @change="onMetricChange"
            >
              <option
                v-for="metric in article.ranking.metrics"
                :key="metric.key"
                :value="metric.key"
              >
                {{ metric.label }}
              </option>
            </select></label
          >
          <label
            class="flex-1 text-[11px] font-extrabold tracking-[.08em] text-[#71776f] uppercase"
            >Direction<select
              v-model="selectedDirection"
              class="mt-2 min-h-11 w-full rounded-lg border border-[#d4d8d0] bg-white px-3 text-sm font-bold normal-case tracking-normal text-[#171917] outline-none focus:border-[#e27651] focus:ring-2 focus:ring-[#f7dfd6]"
            >
              <option value="desc">Highest to lowest</option>
              <option value="asc">Lowest to highest</option>
            </select></label
          >
        </div>
        <div
          class="mt-4 min-w-0 overflow-hidden rounded-2xl border border-[#dfe2da] bg-white"
        >
          <div class="w-full overflow-x-auto overscroll-x-contain">
            <table class="w-full min-w-[680px] border-collapse text-left">
              <thead
                class="bg-[#f1f3ed] text-[10px] font-extrabold tracking-[.12em] text-[#737970] uppercase"
              >
                <tr>
                  <th class="w-20 px-5 py-4">Rank</th>
                  <th class="px-5 py-4">{{ article.ranking.entityLabel }}</th>
                  <th class="px-5 py-4 text-right">{{ activeMetric.label }}</th>
                  <th v-if="article.ranking.detailLabel" class="px-5 py-4">
                    {{ article.ranking.detailLabel }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in rankedRows"
                  :key="row.id"
                  class="border-t border-[#e8eae4] first:border-t-0"
                >
                  <td class="px-5 py-5 text-sm font-bold text-[#979c94]">
                    {{ String(index + 1).padStart(2, "0") }}
                  </td>
                  <td
                    class="px-5 py-5 font-['Space_Grotesk'] text-base font-bold"
                  >
                    {{ row.entity }}
                  </td>
                  <td
                    class="px-5 py-5 text-right font-mono text-sm font-semibold"
                    :class="
                      row.values[activeMetric.key]?.sortValue === null
                        ? 'text-[#a4a8a1]'
                        : ''
                    "
                  >
                    {{ row.values[activeMetric.key]?.formatted ?? "N/A" }}
                  </td>
                  <td
                    v-if="article.ranking.detailLabel"
                    class="px-5 py-5 text-xs text-[#777d75]"
                  >
                    {{ row.detail || "—" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section
        v-for="(section, index) in article.sections.slice(1)"
        :id="`analysis-${index + 2}`"
        :key="section.heading"
        class="scroll-mt-8 mx-auto grid w-full max-w-[900px] gap-5 md:grid-cols-[140px_1fr] md:gap-10"
      >
        <p
          class="pt-2 text-[10px] font-extrabold tracking-[.18em] text-[#9b9f98]"
        >
          {{ String(index + 2).padStart(2, "0") }}
        </p>
        <div>
          <h2
            class="font-['Space_Grotesk'] text-[clamp(33px,5vw,50px)] leading-[1.05] font-bold tracking-[-.055em] [overflow-wrap:anywhere]"
          >
            {{ section.heading }}
          </h2>
          <p
            v-for="paragraph in section.paragraphs"
            :key="paragraph"
            class="mt-6 text-[17px] leading-8 text-[#555b53]"
          >
            {{ paragraph }}
          </p>
        </div>
      </section>

      <aside
        v-if="article.methodology"
        id="methodology"
        class="scroll-mt-8 rounded-2xl border border-[#dee3d8] bg-[#f1f5e9] p-6 sm:p-9"
      >
        <p
          class="text-[10px] font-extrabold tracking-[.18em] text-[#60744e] uppercase"
        >
          Methodology & data note
        </p>
        <p class="mt-4 max-w-[900px] text-sm leading-7 text-[#596254]">
          {{ article.methodology }}
        </p>
        <p
          class="mt-5 border-t border-[#d8e0ce] pt-4 text-xs font-semibold break-words text-[#6d7667]"
        >
          Source: {{ article.source.fileName }} ·
          {{ article.source.rowCount.toLocaleString() }} rows ·
          {{ article.source.columnCount.toLocaleString() }} columns
        </p>
      </aside>

      <section
        v-if="article.conclusion"
        id="conclusion"
        class="scroll-mt-8 mx-auto max-w-[860px] text-center"
      >
        <p
          class="text-[10px] font-extrabold tracking-[.18em] text-[#e27651] uppercase"
        >
          Conclusion
        </p>
        <h2
          class="mt-4 font-['Space_Grotesk'] text-[clamp(38px,6vw,60px)] font-bold tracking-[-.06em]"
        >
          What the data leaves us with
        </h2>
        <p class="mt-6 text-[18px] leading-8 text-[#555b53]">
          {{ article.conclusion }}
        </p>
        <NuxtLink
          to="/blog"
          class="mt-9 inline-flex min-h-12 items-center gap-3 rounded-full bg-[#171917] px-6 text-sm font-bold text-white hover:bg-[#313b30]"
          >Explore more stories <span>→</span></NuxtLink
        >
      </section>
    </div>
  </article>
</template>
