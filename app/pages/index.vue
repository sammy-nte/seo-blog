<script setup lang="ts">
const canonicalUrl = useCanonicalUrl();
const shareImageUrl = useAbsoluteSiteUrl("/og/article-coral.png");

useSeoMeta({
  title: "BG — Turn your data into a story worth finding",
  description:
    "Turn a dataset into a clear, searchable blog story. Upload a CSV, choose what matters, and share the result.",
  ogType: "website",
  ogTitle: "BG — Turn your data into a story worth finding",
  ogDescription:
    "Turn a dataset into a clear, searchable blog story. Upload a CSV, choose what matters, and share the result.",
  ogUrl: () => canonicalUrl.value,
  ogImage: () => shareImageUrl.value,
  ogImageAlt: "BG data story illustration",
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
        "@type": "WebSite",
        name: "BG",
        url: canonicalUrl.value,
        description:
          "Turn a dataset into a clear, searchable blog story. Upload a CSV, choose what matters, and share the result.",
      }),
    },
  ],
}));
</script>

<template>
  <section
    class="relative mx-auto grid min-h-[min(780px,calc(100svh-95px))] w-full max-w-[1512px] grid-cols-[minmax(0,48fr)_minmax(0,52fr)] items-center gap-[clamp(20px,2.5vw,38px)] px-[clamp(20px,5.5vw,88px)] pb-[65px] max-[1120px]:grid-cols-[minmax(0,51fr)_minmax(0,49fr)] max-[760px]:flex max-[760px]:min-h-0 max-[760px]:flex-col max-[760px]:items-stretch max-[760px]:pt-[64px] max-[760px]:pb-[35px] max-[440px]:pt-[56px]"
    aria-labelledby="hero-title"
  >
    <div class="relative z-[2] min-w-0 pb-[26px] max-[760px]:pb-0">
      <h1
        id="hero-title"
        class="m-0 max-w-[680px] font-['Space_Grotesk'] text-[clamp(60px,6vw,96px)] leading-[.99] font-bold tracking-[-.075em] max-[1120px]:text-[clamp(56px,6.8vw,80px)] max-[760px]:text-[clamp(54px,11vw,76px)] max-[380px]:text-[clamp(46px,15vw,52px)]"
      >
        Your data has<br />a <em class="not-italic text-[#ef724c]">story.</em
        ><br />Let it be found<span class="text-[#ef724c]">.</span>
      </h1>
      <p
        class="mt-[33px] max-w-[450px] text-[clamp(16px,1.22vw,18px)] leading-[1.7] text-[#5b6059] max-[760px]:mt-[27px] max-[440px]:text-base"
      >
        Turn a simple CSV into a thoughtful, search-ready blog page. Pick the
        metric that matters, and let your data lead the way.
      </p>
      <div
        class="mt-[34px] inline-grid grid-cols-[max-content_max-content] items-center gap-[clamp(16px,2vw,30px)] max-[380px]:grid-cols-2 max-[380px]:gap-3"
      >
        <NuxtLink
          to="/upload"
          class="inline-flex min-h-[56px] items-center justify-center gap-[clamp(12px,3vw,30px)] whitespace-nowrap rounded-[7px] bg-[#171917] px-[clamp(15px,4vw,23px)] text-sm font-bold text-white transition-transform hover:-translate-y-[3px] hover:bg-[#313b30] max-[380px]:min-h-[52px] max-[380px]:px-3"
          >Upload CSV
          <span class="text-[19px] leading-none font-normal" aria-hidden="true"
            >&#8594;</span
          ></NuxtLink
        >
        <NuxtLink
          to="/blog"
          class="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap text-sm font-extrabold transition-opacity hover:opacity-60"
          >Explore blogs
          <span class="text-[19px] font-normal" aria-hidden="true"
            >&#8594;</span
          ></NuxtLink
        >
      </div>
    </div>

    <div class="hero-art" aria-hidden="true">
      <div class="art-orbit orbit-one"></div>
      <div class="art-orbit orbit-two"></div>
      <div class="art-sun"></div>
      <span class="art-spark spark-one">✳</span
      ><span class="art-spark spark-two">✦</span
      ><span class="art-spark spark-three">✳</span>
      <div class="art-pill pill-csv">CSV</div>
      <div class="art-pill pill-seo">SEO READY <span>✦</span></div>
      <div class="sheet sheet-back">
        <div class="sheet-topline"></div>
        <div class="sheet-mini-bars"><i></i><i></i><i></i><i></i></div>
        <div class="sheet-rule"></div>
        <div class="sheet-rule short"></div>
      </div>
      <div class="sheet sheet-front">
        <div class="sheet-browser">
          <span></span><span></span><span></span><b>BG</b>
        </div>
        <div class="sheet-content">
          <div class="sheet-kicker">THE DATA STORY</div>
          <div class="sheet-headline">A better way<br />to tell the story.</div>
          <div class="sheet-text-line"></div>
          <div class="sheet-text-line medium"></div>
          <div class="sheet-text-line small"></div>
          <div class="sheet-chart">
            <div class="chart-grid"></div>
            <div class="chart-bars"><i></i><i></i><i></i><i></i><i></i></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
