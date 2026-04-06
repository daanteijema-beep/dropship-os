import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Scrape Google Trends trending searches in NL
async function getTrendingSearches(): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) return ''

  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        url: 'https://trends.google.com/trending?geo=NL&hours=48',
        formats: ['markdown'],
        waitFor: 4000,
      }),
      signal: AbortSignal.timeout(25000),
    })
    if (!res.ok) return ''
    const data = await res.json()
    return (data?.data?.markdown || data?.markdown || '').slice(0, 3000)
  } catch {
    return ''
  }
}

// Get CJ top categories
async function getCJCategories(): Promise<string[]> {
  try {
    const authRes = await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: process.env.CJ_API_KEY! }),
    })
    const authData = await authRes.json()
    if (!authData?.result) return []
    const token = authData.data.accessToken

    const catRes = await fetch('https://developers.cjdropshipping.com/api2.0/v1/product/getCategory', {
      headers: { 'CJ-Access-Token': token },
    })
    const catData = await catRes.json()
    if (!catData?.result) return []

    // Extract first-level category names
    const cats = catData.data || []
    return cats.slice(0, 30).map((c: { categoryName?: string; categoryNameEn?: string }) =>
      c.categoryNameEn || c.categoryName || ''
    ).filter(Boolean)
  } catch {
    return []
  }
}

export async function GET() {
  try {
    // Parallel: trending searches + CJ categories
    const [trendingRaw, cjCategories] = await Promise.all([
      getTrendingSearches(),
      getCJCategories(),
    ])

    // Claude analyzes all signals and suggests the best niches
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Je bent een dropshipping niche expert. Analyseer de volgende data en geef de beste niches voor dropshipping in Nederland.

${trendingRaw ? `Google Trends trending zoekterm NL (afgelopen 48 uur):\n${trendingRaw}\n` : ''}
${cjCategories.length ? `Beschikbare CJ Dropshipping categorieën:\n${cjCategories.join(', ')}\n` : ''}

Criteria voor een goede dropshipping niche:
- Impulsaankoop mogelijk (niet te duur, max €100)
- Hoge perceived value (marge 60-75%)
- Makkelijk te adverteren op TikTok/Meta
- Oplost een duidelijk probleem OF is een trending gadget/lifestyle item
- Beschikbaar via CJ Dropshipping
- Groeiende trend (liefst niet seizoensgebonden)

Geef 10 concrete niches met elk:
- name: korte niche naam (bijv. "Red Light Therapy", "Posture Correctors")
- keyword: het beste CJ zoekwoord voor deze niche
- why: 1 zin waarom dit nu kansrijk is
- opportunityScore: 1-10 (10 = hoogste kans)
- trend: "rising" | "stable" | "seasonal"
- avgMargin: geschatte marge % (bijv. "65%")
- targetAudience: korte omschrijving doelgroep

Antwoord ALLEEN als JSON array:
[{"name":"...","keyword":"...","why":"...","opportunityScore":8,"trend":"rising","avgMargin":"68%","targetAudience":"..."}]`,
      }],
    })

    const text = (msg.content[0] as { text: string }).text
    const niches = JSON.parse(text)

    return NextResponse.json({
      niches,
      dataSource: {
        googleTrends: !!trendingRaw,
        cjCategories: cjCategories.length > 0,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Niches error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
