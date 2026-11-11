import type { BlogArticle } from '#shared/types/blog'

const featuredSample: BlogArticle = {
    slug: 'operational-scale-across-growing-companies',
    title: 'What operational scale looks like across growing companies',
    seoTitle: 'Company operating capacity ranking and analysis',
    metaDescription: 'Compare reported operating capacity across a sample of growing companies, with key statistics, a complete ranking and methodology notes.',
    excerpt: 'A clear view of how reported operating capacity varies across a sample of established and emerging businesses.',
    intro: 'Company growth rarely moves in a straight line. This analysis compares reported operating capacity across the dataset, highlights the spread between organisations, and puts the ranking in context without treating size as a complete measure of performance.',
    publishedAt: '2026-11-08',
    readingMinutes: 7,
    eyebrow: 'Latest data story',
    accent: 'coral',
    takeaways: [
      'The distribution is concentrated near the top, with a wider group of companies clustered through the middle.',
      'Scale differs substantially across the sample, so the ranking is most useful as a comparative snapshot.',
      'Missing records remain visible in the full table and are not included in calculated statistics.'
    ],
    stats: [
      { key: 'validCount', label: 'Companies analysed', value: '48', description: 'Records with a usable value for the selected metric.' },
      { key: 'average', label: 'Average capacity', value: '1,284', description: 'The mean reported operating capacity across valid records.' },
      { key: 'maximum', label: 'Highest reported', value: '4,920', description: 'The largest exact value present in this sample.' }
    ],
    sections: [
      {
        heading: 'A market with a long upper tail',
        paragraphs: [
          'The leading companies sit well above the centre of the dataset. That gap is useful context: it shows that a single average cannot describe every organisation in the sample equally well.',
          'Below the leaders, the values become more tightly grouped. This middle band contains most of the dataset and gives a more representative view of the operating scale reported by a typical company.'
        ]
      },
      {
        heading: 'What the ranking can tell us',
        paragraphs: [
          'The ranking provides a consistent way to compare records using one selected measure. It is best read as a starting point for analysis rather than a verdict on company quality, efficiency, or future potential.',
          'Context still matters. Business models, reporting dates, and how each company defines capacity can all influence the values, so neighbouring positions should not be over-interpreted.'
        ]
      },
      {
        heading: 'The middle of the table matters',
        paragraphs: [
          'Attention naturally falls on the first few rows, but the middle of the table reveals the shape of the wider group. Here, relatively small differences separate many companies, suggesting that position alone may exaggerate the distance between them.'
        ]
      }
    ],
    ranking: {
      title: 'Full company ranking',
      description: 'Choose an available metric and direction to explore the full company list.',
      entityLabel: 'Company',
      detailLabel: 'Position note',
      metrics: [
        { key: 'operatingCapacity', label: 'Operating capacity', defaultDirection: 'desc', unit: 'plain', hasRanges: false, estimatedRanking: false },
        { key: 'efficiencyRate', label: 'Efficiency rate', defaultDirection: 'desc', unit: 'percentage', hasRanges: false, estimatedRanking: false }
      ],
      rows: [
        { id: 'row-1', entity: 'Northstar Group', values: { operatingCapacity: { formatted: '4,920', sortValue: 4920 }, efficiencyRate: { formatted: '86%', sortValue: 86 } } },
        { id: 'row-2', entity: 'Cedar Works', values: { operatingCapacity: { formatted: '3,740', sortValue: 3740 }, efficiencyRate: { formatted: '91%', sortValue: 91 } } },
        { id: 'row-3', entity: 'Juniper Systems', values: { operatingCapacity: { formatted: '3,180', sortValue: 3180 }, efficiencyRate: { formatted: '88%', sortValue: 88 } } },
        { id: 'row-4', entity: 'Atlas Collective', values: { operatingCapacity: { formatted: '2,760', sortValue: 2760 }, efficiencyRate: { formatted: '82%', sortValue: 82 } } },
        { id: 'row-5', entity: 'Harbour Labs', values: { operatingCapacity: { formatted: '2,210', sortValue: 2210 }, efficiencyRate: { formatted: '94%', sortValue: 94 } } },
        { id: 'row-6', entity: 'Elm Studio', values: { operatingCapacity: { formatted: '1,840', sortValue: 1840 }, efficiencyRate: { formatted: '89%', sortValue: 89 } } },
        { id: 'row-7', entity: 'Fieldstone Co.', values: { operatingCapacity: { formatted: '1,320', sortValue: 1320 }, efficiencyRate: { formatted: '84%', sortValue: 84 } } },
        { id: 'row-8', entity: 'Oak Workshop', values: { operatingCapacity: { formatted: '980', sortValue: 980 }, efficiencyRate: { formatted: '93%', sortValue: 93 } } },
        { id: 'row-9', entity: 'Common Thread', values: { operatingCapacity: { formatted: '640', sortValue: 640 }, efficiencyRate: { formatted: '79%', sortValue: 79 } } },
        { id: 'row-10', entity: 'Aster House', values: { operatingCapacity: { formatted: 'N/A', sortValue: null }, efficiencyRate: { formatted: 'N/A', sortValue: null } }, detail: 'No usable value reported' }
      ]
    },
    defaultRankingMetric: 'operatingCapacity',
    defaultRankingDirection: 'desc',
    source: { fileName: 'sample-company-data.csv', rowCount: 50, columnCount: 6 },
    methodology: 'This sample article uses placeholder company records and a single selected metric. Valid numerical values are used for the summary statistics. Missing or invalid values remain in the ranking table as N/A and are excluded from calculations. The final generated version will use the uploaded dataset and its confirmed metric.',
    conclusion: 'The dataset shows a wide range of operating scale, led by a small group of larger organisations and followed by a much denser middle. The table gives that pattern a useful structure, while the data note keeps the limits of the comparison visible.'
  }

const sampleBlogs: BlogArticle[] = [featuredSample,
  {
    ...featuredSample,
    slug: 'company-growth-patterns-in-context',
    title: 'Putting company growth patterns into context',
    seoTitle: 'Company growth patterns in context',
    metaDescription: 'Explore how the centre and edges of a company dataset reveal different growth patterns and ranking context.',
    excerpt: 'How the centre and edges of a company dataset reveal different parts of the same story.',
    intro: 'A sample editorial analysis of growth patterns.', publishedAt: '2026-10-24', readingMinutes: 6, eyebrow: 'Data story', accent: 'sage'
  },
  {
    ...featuredSample,
    slug: 'reading-company-rankings-responsibly',
    title: 'How to read a company ranking responsibly',
    seoTitle: 'How to interpret company rankings responsibly',
    metaDescription: 'Learn how data quality, range estimates and missing values affect the interpretation of company rankings.',
    excerpt: 'Why data quality, range estimates, and missing values should remain visible alongside a ranking.',
    intro: 'A sample guide to ranking interpretation.', publishedAt: '2026-10-09', readingMinutes: 5, eyebrow: 'Data note', accent: 'sand'
  },
  {
    ...featuredSample,
    slug: 'the-story-inside-the-middle',
    title: 'The overlooked story inside the middle of a dataset',
    seoTitle: 'What the middle of a company dataset reveals',
    metaDescription: 'See why the middle of a company dataset can provide a more representative view than its top-ranked records.',
    excerpt: 'Top positions draw attention, but the centre often gives a more representative picture.',
    intro: 'A sample analysis of dataset distributions.', publishedAt: '2026-09-21', readingMinutes: 8, eyebrow: 'Analysis', accent: 'ink'
  }
]

export function findSampleBlog(slug: string) {
  return sampleBlogs.find((article) => article.slug === slug)
}

export function formatArticleDate(date: string) {
  const value = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00` : date
  const parsedDate = new Date(value)
  if (!Number.isFinite(parsedDate.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(parsedDate)
}
