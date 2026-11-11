<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from "vue";
import { parseCsvFile, type ParsedCsv } from "~/utils/parseCsv";
import { findMetricCandidates } from "~/utils/metricCandidates";
import { prepareSuggestions } from "~/utils/prepareSuggestions";
import {
  availableStatisticKeys,
  statisticLabels,
  validateRecommendation,
  type Recommendation,
  type StatisticKey,
} from "#shared/utils/suggestions";
import type { BlogArticle } from "#shared/types/blog";
import type { GeneratedArticlePreview } from "#shared/types/articlePreview";
import type {
  EditorialResponse,
  FinalGenerationRequest,
} from "#shared/utils/articleGeneration";

const canonicalUrl = useCanonicalUrl();
const shareImageUrl = useAbsoluteSiteUrl("/og/article-sand.png");

useSeoMeta({
  title: "Upload a CSV — BG",
  description: "Upload a CSV and choose the data metric for your blog story.",
  ogType: "website",
  ogTitle: "Upload a CSV — BG",
  ogDescription: "Upload a CSV and choose the data metric for your blog story.",
  ogUrl: () => canonicalUrl.value,
  ogImage: () => shareImageUrl.value,
  ogImageAlt: "BG CSV data story illustration",
  ogImageWidth: 1200,
  ogImageHeight: 630,
});

useHead(() => ({
  link: [{ rel: "canonical", href: canonicalUrl.value }],
}));

const fileInput = ref<HTMLInputElement | null>(null);
const dataset = ref<ParsedCsv | null>(null);
const errorMessage = ref("");
const isDragging = ref(false);
const isParsing = ref(false);
const step = ref<1 | 2>(1);
const selectedMetric = ref("");
const selectedEntity = ref("");
const selectedDirection = ref<"asc" | "desc">("desc");
const selectedStatistics = ref<StatisticKey[]>([]);
const recommendation = ref<Recommendation | null>(null);
const confirmedSelection = ref<Recommendation | null>(null);
const isSuggesting = ref(false);
const suggestionError = ref("");
const isGenerating = ref(false);
const generationError = ref("");
const articlePreview = useState<GeneratedArticlePreview | null>(
  "generated-article-preview",
  () => null,
);
let requestController: AbortController | undefined;
let generationController: AbortController | undefined;
let requestVersion = 0;

const candidates = computed(() =>
  dataset.value
    ? findMetricCandidates(dataset.value.headers, dataset.value.rows)
    : [],
);
const selectedCandidate = computed(() =>
  candidates.value.find(
    (candidate) => candidate.column === selectedMetric.value,
  ),
);

const aiPayload = computed(() =>
  dataset.value ? prepareSuggestions(dataset.value) : null,
);
const selectedPayloadMetric = computed(() =>
  aiPayload.value?.metricCandidates.find(
    (item) => item.column === selectedMetric.value,
  ),
);
const availableStatistics = computed(() =>
  selectedPayloadMetric.value
    ? availableStatisticKeys(selectedPayloadMetric.value)
    : [],
);
const canConfirm = computed(() =>
  Boolean(
    recommendation.value &&
    selectedEntity.value &&
    selectedMetric.value &&
    !isSuggesting.value,
  ),
);

watch(
  [selectedEntity, selectedMetric, selectedDirection, selectedStatistics],
  () => {
    confirmedSelection.value = null;
  },
  { deep: true },
);
onBeforeUnmount(() => {
  requestController?.abort();
  generationController?.abort();
});

function cancelSuggestions() {
  requestVersion++;
  requestController?.abort();
  generationController?.abort();
  isSuggesting.value = false;
  isGenerating.value = false;
  confirmedSelection.value = null;
}

function changeFile() {
  cancelSuggestions();
  step.value = 1;
}

function onMetricChange() {
  selectedStatistics.value =
    recommendation.value?.rankingMetric === selectedMetric.value
      ? recommendation.value.statistics.map((item) => item.key)
      : [];
}

function confirmSuggestions() {
  if (!canConfirm.value || !aiPayload.value || !recommendation.value) return;
  try {
    confirmedSelection.value = validateRecommendation(
      {
        ...recommendation.value,
        entityColumn: selectedEntity.value,
        entityReason:
          selectedEntity.value === recommendation.value.entityColumn
            ? recommendation.value.entityReason
            : "Selected by you.",
        rankingMetric: selectedMetric.value,
        metricReason:
          selectedMetric.value === recommendation.value.rankingMetric
            ? recommendation.value.metricReason
            : "Selected by you.",
        direction: selectedDirection.value,
        directionReason:
          selectedDirection.value === recommendation.value.direction
            ? recommendation.value.directionReason
            : "Selected by you.",
        statistics: selectedStatistics.value.map((key) => ({
          key,
          reason: "Confirmed by you.",
        })),
      },
      aiPayload.value,
    );
    suggestionError.value = "";
    generationError.value = "";
  } catch {
    suggestionError.value =
      "Please choose valid columns and statistics for the selected metric.";
  }
}

async function generatePreview() {
  if (!dataset.value || !confirmedSelection.value || isGenerating.value) return;
  generationController?.abort();
  generationController = new AbortController();
  isGenerating.value = true;
  generationError.value = "";
  try {
    const request: FinalGenerationRequest = {
      dataset: {
        fileName: dataset.value.fileName,
        headers: dataset.value.headers,
        rows: dataset.value.rows,
      },
      confirmation: {
        entityColumn: confirmedSelection.value.entityColumn!,
        rankingMetric: confirmedSelection.value.rankingMetric!,
        direction: confirmedSelection.value.direction,
        selectedStatistics: confirmedSelection.value.statistics.map(
          (statistic) => statistic.key,
        ),
      },
    };
    const result = await $fetch<{
      article: BlogArticle;
      editorial: EditorialResponse;
    }>("/api/articles/generate", {
      method: "POST",
      body: request,
      signal: generationController.signal,
      timeout: 90_000,
      retry: 0,
    });
    articlePreview.value = {
      article: result.article,
      editorial: result.editorial,
      request,
    };
    await navigateTo(`/blog/${result.article.slug}?preview=1`);
  } catch (error) {
    const failure = error as { data?: { statusMessage?: string } };
    generationError.value =
      failure.data?.statusMessage ??
      "The article preview could not be generated. Please try again.";
  } finally {
    isGenerating.value = false;
  }
}

async function handleFile(file?: File) {
  if (!file) return;
  cancelSuggestions();
  errorMessage.value = "";
  dataset.value = null;
  selectedMetric.value = "";
  recommendation.value = null;
  selectedEntity.value = "";
  selectedStatistics.value = [];
  suggestionError.value = "";
  step.value = 1;
  isParsing.value = true;

  try {
    dataset.value = await parseCsvFile(file);
    selectedMetric.value =
      findMetricCandidates(dataset.value.headers, dataset.value.rows)[0]
        ?.column ?? "";
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "The CSV could not be parsed.";
  } finally {
    isParsing.value = false;
    if (fileInput.value) fileInput.value.value = "";
  }
}

function onInputChange(event: Event) {
  handleFile((event.target as HTMLInputElement).files?.[0]);
}

function onDrop(event: DragEvent) {
  isDragging.value = false;
  handleFile(event.dataTransfer?.files?.[0]);
}

async function goToSuggestions() {
  if (!aiPayload.value || !candidates.value.length || isSuggesting.value)
    return;
  const version = ++requestVersion;
  requestController?.abort();
  requestController = new AbortController();
  isSuggesting.value = true;
  recommendation.value = null;
  confirmedSelection.value = null;
  suggestionError.value = "";
  step.value = 2;
  try {
    const result = await $fetch<Recommendation>("/api/suggestions", {
      method: "POST",
      body: aiPayload.value,
      signal: requestController.signal,
      timeout: 40000,
      retry: 0,
    });
    if (version !== requestVersion) return;
    recommendation.value = validateRecommendation(result, aiPayload.value);
    selectedEntity.value = result.entityColumn ?? "";
    selectedMetric.value = result.rankingMetric ?? "";
    selectedDirection.value = result.direction;
    selectedStatistics.value = result.statistics.map((item) => item.key);
  } catch (error) {
    if (version !== requestVersion) return;
    const failure = error as { data?: { statusMessage?: string } };
    suggestionError.value =
      failure.data?.statusMessage ??
      "Suggestions could not be loaded. Please try again.";
  } finally {
    if (version === requestVersion) isSuggesting.value = false;
  }
}
</script>

<template>
  <section
    class="mx-auto min-h-[calc(100svh-105px)] max-w-[1050px] px-4 pt-[clamp(42px,8vw,110px)] pb-16 sm:px-8 sm:pb-20"
  >
    <div class="mx-auto mb-10 max-w-[680px] text-center">
      <h1
        class="font-['Space_Grotesk'] text-[clamp(38px,10vw,68px)] leading-[1.04] font-bold tracking-[-.065em]"
      >
        From CSV to story.
      </h1>
      <p
        class="mx-auto mt-4 max-w-[530px] text-[15px] leading-7 text-[#666b65] sm:text-base"
      >
        Start with your data. We’ll help you choose what the first blog page
        should focus on.
      </p>
    </div>

    <div class="relative mx-auto max-w-[780px]">
      <div
        class="absolute inset-x-5 -top-3 h-10 rounded-[18px] border border-[#e8e9e4] bg-white/70"
      ></div>
      <div
        class="relative rounded-[18px] border border-[#e5e8e1] bg-white p-4 shadow-[0_20px_65px_rgba(26,36,25,.08)] sm:p-8"
      >
        <div
          class="flex flex-wrap items-center justify-between gap-4 border-b border-[#ecede8] pb-5 sm:pb-6"
        >
          <div>
            <p
              class="mb-1 text-[11px] font-extrabold tracking-[.17em] text-[#92998e]"
            >
              STEP {{ step }} OF 2
            </p>
            <h2
              class="font-['Space_Grotesk'] text-2xl font-bold tracking-[-.045em]"
            >
              {{ step === 1 ? "Upload your data" : "Review suggestions" }}
            </h2>
          </div>
          <div
            class="flex max-w-full items-center gap-2 overflow-x-auto pb-1"
            aria-label="Progress"
          >
            <span
              class="flex h-8 items-center gap-2 rounded-full px-3 text-xs font-bold"
              :class="
                step === 1
                  ? 'bg-[#171917] text-white'
                  : 'bg-[#e9f2d8] text-[#314325]'
              "
            >
              <span>{{ step === 1 ? "1" : "✓" }}</span> Upload
            </span>
            <span class="h-px w-5 bg-[#cdd2c8]"></span>
            <span
              class="flex h-8 items-center gap-2 rounded-full px-3 text-xs font-bold"
              :class="
                step === 2
                  ? 'bg-[#171917] text-white'
                  : 'bg-[#f2f3ef] text-[#8c938b]'
              "
            >
              <span>2</span> Suggestions
            </span>
          </div>
        </div>

        <div v-if="step === 1" class="pt-7">
          <input
            ref="fileInput"
            type="file"
            accept=".csv,text/csv"
            class="sr-only"
            aria-label="Choose a CSV file"
            @change="onInputChange"
          />
          <div
            class="flex min-h-[250px] flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors sm:min-h-[300px] sm:px-5 sm:py-10"
            :class="
              isDragging
                ? 'border-[#e27651] bg-[#fff7f3]'
                : 'border-[#d9ded5] bg-[#fbfcf8]'
            "
            @dragenter.prevent="isDragging = true"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDrop"
          >
            <div
              class="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f5e9e3]"
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M12 16V4m0 0L8 8m4-4 4 4" />
                <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
              </svg>
            </div>
            <h3
              class="font-['Space_Grotesk'] text-xl font-bold tracking-[-.035em]"
            >
              Drop your CSV here
            </h3>
            <p class="mt-2 text-sm text-[#777e76]">
              or select a file from your computer
            </p>
            <button
              type="button"
              class="mt-6 rounded-full bg-[#171917] px-6 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 hover:bg-[#313b30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e27651]"
              :disabled="isParsing"
              @click="fileInput?.click()"
            >
              {{ isParsing ? "Reading file…" : "Select CSV file" }}
            </button>
            <p class="mt-4 text-xs text-[#9ba199]">
              CSV files only · up to 10 MB
            </p>
          </div>

          <p
            v-if="errorMessage"
            role="alert"
            class="mt-4 rounded-lg border border-[#f5c9bd] bg-[#fff3ef] px-4 py-3 text-sm text-[#a43e28]"
          >
            {{ errorMessage }}
          </p>

          <div
            v-if="dataset"
            class="mt-6 rounded-xl border border-[#e4e9dc] bg-[#f8fbf3] p-5"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p
                  class="text-[11px] font-extrabold tracking-[.16em] text-[#627c45]"
                >
                  FILE READY
                </p>
                <p class="mt-1 break-all font-bold">{{ dataset.fileName }}</p>
              </div>
              <button
                type="button"
                class="text-sm font-bold underline underline-offset-4 hover:text-[#e27651]"
                @click="fileInput?.click()"
              >
                Choose another
              </button>
            </div>
            <div class="mt-5 flex flex-wrap gap-2">
              <span
                class="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#485543]"
                >{{ dataset.rowCount.toLocaleString() }} rows</span
              >
              <span
                class="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#485543]"
                >{{ dataset.headers.length }} columns</span
              >
            </div>
            <p class="mt-4 text-xs font-bold text-[#62705d]">Columns found</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <span
                v-for="header in dataset.headers"
                :key="header"
                class="rounded-md border border-[#dce5d3] bg-white px-2.5 py-1 text-xs"
                >{{ header }}</span
              >
            </div>
          </div>

          <p
            v-if="dataset && !candidates.length"
            role="status"
            class="mt-4 text-sm text-[#9d4b36]"
          >
            No numerical candidates were found. Please choose a CSV with
            numerical values to rank.
          </p>
          <button
            type="button"
            class="mt-7 flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-[#171917] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-[#313b30]"
            :disabled="
              !dataset || isParsing || isSuggesting || !candidates.length
            "
            @click="goToSuggestions"
          >
            Get Suggestions <span aria-hidden="true">→</span>
          </button>
        </div>

        <div v-else-if="dataset" class="pt-7">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-sm font-bold">{{ dataset.fileName }}</p>
              <p class="mt-1 text-xs text-[#7d847c]">
                {{ dataset.rowCount.toLocaleString() }} rows ·
                {{ dataset.headers.length }} columns
              </p>
            </div>
            <button
              type="button"
              class="text-sm font-bold underline underline-offset-4 hover:text-[#e27651]"
              @click="changeFile"
            >
              ← Change file
            </button>
          </div>

          <div
            v-if="isSuggesting"
            role="status"
            aria-live="polite"
            class="mt-7 rounded-xl bg-[#f8fbf5] px-5 py-10 text-center"
          >
            <span
              aria-hidden="true"
              class="mx-auto mb-4 block h-6 w-6 animate-spin rounded-full border-2 border-[#dce5d3] border-t-[#171917] motion-reduce:animate-none"
            ></span>
            <p class="font-bold">Finding a focus for your story…</p>
            <p class="mt-2 text-sm text-[#657064]">
              Gemini is reviewing your columns, sample rows and calculated
              statistics.
            </p>
          </div>
          <div
            v-if="suggestionError"
            role="alert"
            class="mt-5 rounded-xl border border-[#f5c9bd] bg-[#fff3ef] p-5 text-sm text-[#a43e28]"
          >
            <p>{{ suggestionError }}</p>
            <button
              type="button"
              class="mt-3 font-bold underline underline-offset-4 disabled:opacity-40"
              :disabled="isSuggesting"
              @click="goToSuggestions"
            >
              Try again
            </button>
          </div>

          <div v-if="recommendation" class="mt-7 space-y-5">
            <div class="rounded-xl border border-[#dfe5d8] bg-[#f8fbf5] p-5">
              <p
                class="text-[11px] font-extrabold tracking-[.16em] text-[#627c45]"
              >
                SUGGESTED BY GEMINI
              </p>
              <p class="mt-2 text-sm leading-6 text-[#657064]">
                Review these choices and change anything before confirming.
              </p>
              <ul
                v-if="recommendation.warnings.length"
                class="mt-3 list-disc space-y-1 pl-4 text-sm text-[#87601a]"
              >
                <li v-for="warning in recommendation.warnings" :key="warning">
                  {{ warning }}
                </li>
              </ul>
            </div>
            <div class="rounded-xl border border-[#e5e8e1] p-5">
              <label for="entity" class="mb-2 block text-sm font-bold"
                >Company / entity name column</label
              >
              <select
                id="entity"
                v-model="selectedEntity"
                class="min-h-12 min-w-0 w-full rounded-lg border border-[#cfd5cb] bg-white px-3 text-sm focus:ring-2 focus:ring-[#f7dfd6] sm:px-4"
              >
                <option disabled value="">
                  Choose the column containing names
                </option>
                <option
                  v-for="header in dataset.headers"
                  :key="header"
                  :value="header"
                >
                  {{ header }}
                </option>
              </select>
              <p class="mt-2 text-sm leading-6 text-[#70776e]">
                {{
                  selectedEntity === (recommendation.entityColumn ?? "")
                    ? recommendation.entityReason
                    : "Your choice will be used to label the records."
                }}
              </p>
            </div>
            <div class="rounded-xl border border-[#e5e8e1] p-5">
              <label for="metric" class="mb-2 block text-sm font-bold"
                >Default ranking metric</label
              >
              <select
                id="metric"
                v-model="selectedMetric"
                class="min-h-12 min-w-0 w-full rounded-lg border border-[#cfd5cb] bg-white px-3 text-sm font-semibold outline-none focus:border-[#e27651] focus:ring-2 focus:ring-[#f7dfd6] sm:px-4"
                @change="onMetricChange"
              >
                <option disabled value="">Choose a numerical metric</option>
                <option
                  v-for="metric in candidates"
                  :key="metric.column"
                  :value="metric.column"
                >
                  {{ metric.column }} —
                  {{ metric.rangeCount ? "range-based" : metric.kind }},
                  {{ Math.round(metric.completeness * 100) }}% complete
                </option>
              </select>
              <p class="mt-2 text-sm leading-6 text-[#70776e]">
                {{
                  selectedMetric === (recommendation.rankingMetric ?? "")
                    ? recommendation.metricReason
                    : "You changed the metric. Choose the statistics that are meaningful for this column below."
                }}
              </p>
              <p
                v-if="selectedCandidate?.inconsistentUnitCount"
                class="mt-3 rounded-lg bg-[#fff8e8] px-3 py-2 text-xs leading-5 text-[#87601a]"
              >
                Values with inconsistent units are excluded from calculations.
                Their records will still be included in the ranking table.
              </p>
              <p
                v-if="selectedCandidate?.rangeCount"
                class="mt-3 rounded-lg bg-[#eef5e4] px-3 py-2 text-xs leading-5 text-[#48613d]"
              >
                This metric contains ranges. Results are bounded and rankings
                use midpoint estimates; overlapping ranges do not establish a
                definite leader.
              </p>
            </div>
            <div class="rounded-xl border border-[#e5e8e1] p-5">
              <label for="direction" class="mb-2 block text-sm font-bold"
                >Ranking direction</label
              >
              <select
                id="direction"
                v-model="selectedDirection"
                class="min-h-12 w-full rounded-lg border border-[#cfd5cb] bg-white px-4 text-sm focus:ring-2 focus:ring-[#f7dfd6]"
              >
                <option value="desc">Highest to lowest</option>
                <option value="asc">Lowest to highest</option>
              </select>
              <p class="mt-2 text-sm leading-6 text-[#70776e]">
                {{
                  selectedDirection === recommendation.direction &&
                  selectedMetric === recommendation.rankingMetric
                    ? recommendation.directionReason
                    : "Your chosen order will be used for this metric."
                }}
              </p>
            </div>
            <fieldset class="rounded-xl border border-[#e5e8e1] p-5">
              <legend class="px-1 text-sm font-bold">
                Statistics to display
              </legend>
              <p class="mb-4 text-sm text-[#70776e]">
                Select the calculations that make sense for this metric. You can
                leave all unchecked.
              </p>
              <label
                v-for="key in availableStatistics"
                :key="key"
                class="flex cursor-pointer items-start gap-3 border-t border-[#eef0eb] py-3"
              >
                <input
                  v-model="selectedStatistics"
                  type="checkbox"
                  :value="key"
                  class="mt-1 h-4 w-4 accent-[#171917]"
                />
                <span>
                  <span class="block text-sm font-bold">{{
                    statisticLabels[key]
                  }}</span>
                  <span
                    v-if="
                      selectedMetric === recommendation.rankingMetric &&
                      recommendation.statistics.find((item) => item.key === key)
                    "
                    class="mt-1 block text-xs leading-5 text-[#70776e]"
                    >{{
                      recommendation.statistics.find((item) => item.key === key)
                        ?.reason
                    }}</span
                  >
                </span>
              </label>
              <p v-if="!selectedMetric" class="text-sm text-[#70776e]">
                Choose a metric to see its available statistics.
              </p>
            </fieldset>
          </div>

          <div class="mt-5 overflow-hidden rounded-xl border border-[#e5e8e1]">
            <div
              class="flex items-center justify-between gap-4 border-b border-[#e5e8e1] px-5 py-4"
            >
              <h3 class="text-sm font-bold">Data preview</h3>
              <span class="text-xs text-[#8c938b]"
                >First {{ dataset.preview.length }} rows</span
              >
            </div>
            <div class="max-h-[320px] overflow-auto">
              <table class="w-full min-w-max border-collapse text-left text-xs">
                <thead class="sticky top-0 bg-[#f8f9f5]">
                  <tr>
                    <th
                      v-for="header in dataset.headers"
                      :key="header"
                      scope="col"
                      class="border-b border-[#e5e8e1] px-4 py-3 font-extrabold"
                    >
                      {{ header }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, index) in dataset.preview"
                    :key="index"
                    class="border-b border-[#eef0eb] last:border-b-0"
                  >
                    <td
                      v-for="header in dataset.headers"
                      :key="header"
                      class="max-w-[220px] truncate px-4 py-3 text-[#5c635b]"
                      :title="row[header]"
                    >
                      {{ row[header] || "—" }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <button
            v-if="recommendation"
            type="button"
            class="mt-7 flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-[#171917] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-[#313b30]"
            :disabled="!canConfirm"
            @click="confirmSuggestions"
          >
            Confirm choices <span aria-hidden="true">→</span>
          </button>
          <p
            v-if="confirmedSelection"
            role="status"
            class="mt-3 rounded-lg bg-[#eef5e4] px-4 py-3 text-sm font-semibold text-[#3f6235]"
          >
            Choices confirmed for this upload:
            {{ confirmedSelection.entityColumn }}, ranked by
            {{ confirmedSelection.rankingMetric }} ({{
              confirmedSelection.direction === "asc"
                ? "lowest first"
                : "highest first"
            }}), with {{ confirmedSelection.statistics.length }} statistics.
          </p>
          <div
            v-if="confirmedSelection"
            class="mt-5 rounded-xl border border-[#e5e8e1] bg-[#fbfcf8] p-5"
          >
            <p class="font-bold">Ready to create the article preview</p>
            <p class="mt-2 text-sm leading-6 text-[#70776e]">
              Gemini will write the editorial sections. Rankings, statistics and
              formatted values will be rebuilt and verified by the application.
              Nothing is saved until you read and publish the preview.
            </p>
            <button
              type="button"
              class="mt-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-[#e27651] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:enabled:bg-[#cc6442]"
              :disabled="isGenerating"
              @click="generatePreview"
            >
              <span
                v-if="isGenerating"
                class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
                aria-hidden="true"
              ></span>
              {{
                isGenerating
                  ? "Generating article preview…"
                  : "Generate article preview"
              }}
              <span v-if="!isGenerating" aria-hidden="true">→</span>
            </button>
          </div>
          <p
            v-if="generationError"
            role="alert"
            class="mt-4 rounded-lg border border-[#f5c9bd] bg-[#fff3ef] px-4 py-3 text-sm text-[#a43e28]"
          >
            {{ generationError }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
