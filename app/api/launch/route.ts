import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Scrape competitor data for a product using Firecrawl
async function scrapeCompetitorData(productName: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) return ''

  try {
    // Search Google for the product and scrape top result
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(productName + ' kopen nederland site:bol.com OR site:coolblue.nl OR site:amazon.nl')}&num=3`

    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        url: searchUrl,
        formats: ['markdown'],
        waitFor: 2000,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return ''
    const data = await res.json()
    return (data?.data?.markdown || data?.markdown || '').slice(0, 3000)
  } catch {
    return ''
  }
}

// Scrape a specific competitor URL
async function scrapeUrl(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) return ''

  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        waitFor: 3000,
        includeTags: ['h1', 'h2', 'p', 'ul', 'li'],
      }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return ''
    const data = await res.json()
    return (data?.data?.markdown || data?.markdown || '').slice(0, 4000)
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  const {
    product,       // { name, cjPrice, retailPrice, margin, image, category, trendScore, winReason }
    competitorUrl, // optional URL to scrape for inspiration
    generate,      // 'all' | 'landing' | 'marketing'
  } = await req.json()

  if (!product?.name) return NextResponse.json({ error: 'Missing product' }, { status: 400 })

  // Scrape competitor data in parallel if URL provided
  const [competitorData, autoData] = await Promise.all([
    competitorUrl ? scrapeUrl(competitorUrl) : Promise.resolve(''),
    generate !== 'marketing' ? scrapeCompetitorData(product.name) : Promise.resolve(''),
  ])

  const competitorContext = [competitorData, autoData].filter(Boolean).join('\n\n').slice(0, 4000)

  const productContext = `
Product: ${product.name}
Categorie: ${product.category || 'Onbekend'}
Inkoopprijs (CJ): $${product.cjPrice}
Verkoopprijs: ${product.retailPrice}
Marge: ${product.margin}
Win reden: ${product.winReason || ''}
Trend score: ${product.trendScore}/10
${competitorContext ? `\nCompetitor data:\n${competitorContext}` : ''}
`.trim()

  // Generate all content in parallel
  const [landingResult, metaResult, tiktokResult, igResult] = await Promise.all([
    // Landing page HTML
    anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `Schrijf een converterende Shopify landingspagina sectie (als HTML met inline Tailwind-achtige classes) voor dit product. Focus op:
- Hero sectie met pakkende headline en subheadline
- 3-4 key benefits in een grid
- Social proof / urgency element
- Duidelijke CTA knop

Schrijf in het Nederlands. Gebruik moderne, strakke HTML. Geen externe CSS nodig — gebruik inline styles of utility classes.

${productContext}

Return ALLEEN de HTML code (geen markdown, geen uitleg).`,
      }],
    }),

    // Meta Ad
    anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Schrijf 3 varianten van Meta/Facebook ads voor:

${productContext}

Format per variant:
**Variant [1/2/3]**
Headline: (max 40 tekens)
Primary text: (max 125 tekens, probleem → oplossing → urgentie)
CTA: (1 woord: Kopen/Bekijken/Ontdekken)

Toon: direct, benefit-first, Nederlands. Doelgroep: 25-45 jaar NL.`,
      }],
    }),

    // TikTok Script
    anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Schrijf een TikTok video script (20-30 sec) voor:

${productContext}

Format:
🎬 HOOK (0-3s): [tekst + visueel]
😤 PROBLEEM (3-8s): [relatable situatie]
✨ INTRO (8-13s): [product intro]
💥 BEWIJS (13-22s): [benefit demo + social proof]
📲 CTA (22-28s): [duidelijke actie]

Toon: casual, authentiek, Nederlands. Schrijf alsof je tegen een vriend praat.`,
      }],
    }),

    // Instagram Caption
    anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Schrijf een Instagram caption voor:

${productContext}

Format:
- Openingszin (aandachtstrekker)
- Korte probleem → oplossing
- 3 benefits als emoji bullets
- CTA
- 8 relevante hashtags (mix NL/EN)

Toon: inspirerend, beknopt, Nederlands.`,
      }],
    }),
  ])

  const getText = (r: Anthropic.Message) => (r.content[0] as { text: string }).text

  return NextResponse.json({
    landingPage: getText(landingResult),
    metaAd: getText(metaResult),
    tiktokScript: getText(tiktokResult),
    instagramCaption: getText(igResult),
    competitorDataFound: !!competitorContext,
  })
}
