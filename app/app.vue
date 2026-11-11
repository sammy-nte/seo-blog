<template>
  <div
    class="min-h-screen overflow-x-clip bg-[#fcfbf8] font-['DM_Sans'] text-[#171917]"
  >
    <NuxtRouteAnnouncer />
    <header
      class="relative z-10 mx-auto flex max-w-[1512px] items-center justify-between gap-3 px-[clamp(20px,5.5vw,88px)] py-[29px] max-[760px]:pt-[22px]"
    >
      <NuxtLink
        to="/"
        class="whitespace-nowrap font-['Space_Grotesk'] text-[28px] leading-none font-bold tracking-[-.085em] max-[760px]:text-[25px]"
        aria-label="BG home"
        >BG</NuxtLink
      >
      <nav
        class="flex shrink-0 items-center gap-[clamp(12px,3vw,48px)] text-sm font-bold max-[760px]:text-xs max-[380px]:gap-2"
        aria-label="Main navigation"
      >
        <NuxtLink
          to="/blog"
          class="inline-flex min-h-[45px] items-center whitespace-nowrap rounded-full border border-[#d9ddd2] px-[18px] transition-opacity hover:opacity-60 max-[760px]:min-h-10 max-[760px]:px-[14px] max-[380px]:px-3"
          ><span class="max-[380px]:hidden">Read blogs</span
          ><span class="hidden max-[380px]:inline">Blogs</span></NuxtLink
        >
        <NuxtLink
          to="/upload"
          class="inline-flex min-h-[45px] items-center justify-center gap-[30px] whitespace-nowrap rounded-full bg-[#171917] px-[19px] text-white transition-transform hover:-translate-y-[3px] hover:bg-[#313b30] max-[760px]:min-h-10 max-[760px]:gap-2 max-[760px]:px-[14px] max-[380px]:px-3"
          ><span class="max-[380px]:hidden">Upload a blog &#8594;</span></NuxtLink
        >
      </nav>
    </header>
    <main><NuxtPage /></main>
  </div>
</template>
