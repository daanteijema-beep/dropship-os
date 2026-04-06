import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function firecrawlScrape(url: string, waitFor = 2000): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) return ''
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ url, formats: ['markdown'], waitFor }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return ''
    const data = await res.json()
    return (data?.data?.markdown || data?.markdown || '').slice(0, 2500)
  } catch {
    return ''
  }
}

async function getCJHotProducts(): Promise<string> {
  try {
    const authRes = await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: process.env.CJ_API_KEY! }),
    })
    const authData = await authRes.json()
    if (!authData?.result) return ''
    const token = authData.data.accessToken

    // Fetch hot/trending products — sorted by listedNum (most dropshipped = proven demand)
    const params = new URLSearchParams({ page: '1', size: '30', sortField: 'listedNum', sortType: 'DESC' })
    const res = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/listV2?${params}`, {
      headers: { 'CJ-Access-Token': token },
    })
    const data = await res.json()
    if (!data?.result) return ''

    const content = data.data?.content
    let products = []
    if (Array.isArray(content) && content[0]?.productList) products = content[0].productList
    else if (Array.isArray(content)) products = content
    else if (content?.productList) products = content.productList

    return products
      .slice(0, 20)
      .map((p: { nameEn?: string; name?: string; sellPrice?: string; listedNum?: number; threeCategoryName?: string }) =>
        `${p.nameEn || p.name} | prijs: $${p.sellPrice} | in ${p.listedNum} stores | cat: ${p.threeCategoryName || ''}`
      )
      .join('\n')
  } catch {
    return ''
  }
}

export async function GET() {
  try {
    // Scrape multiple real market signals in parallel
    const [amazonElectronics, amazonHealth, bolGadgets, aliExpressTrending, cjHot] = await Promise.all([
      firecrawlScrape('https://www.amazon.nl/gp/bestsellers/electronics/', 3000),
      firecrawlScrape('https://www.amazon.nl/gp/bestsellers/hpc/', 3000),
      firecrawlScrape('https://www.bol.com/nl/nl/l/alle-gadgets/N/9200000114925480+8299/', 2000),
      firecrawlScrape('https://www.aliexpress.com/w/wholesale-trending-products.html', 3000),
      getCJHotProducts(),
    ])

    const sources: Record<string, string> = {
      'Amazon NL Electronics Bestsellers': amazonElectronics,
      'Amazon NL Health & Care Bestsellers': amazonHealth,
      'Bol.com Gadgets Top': bolGadgets,
      'AliExpress Trending': aliExpressTrending,
      'CJ Dropshipping Meest Gekopieerde Producten': cjHot,
    }

    const sourceSummary = Object.entries(sources)
      .filter(([, v]) => v.length > 50)
      .map(([k, v]) => `### ${k}\n${v}`)
      .join('\n\n')

    const availableSources = Object.entries(sources)
      .filter(([, v]) => v.length > 50)
      .map(([k]) => k)

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      messages: [{
        role: 'user',
        content: `Je bent een dropshipping expert. Analyseer deze echte marktdata en geef de 10 beste dropshipping niches voor Nederland.

${sourceSummary}

Criteria voor een goede niche:
- Producten die je voor €5-30 inkoopt en voor €25-100 verkoopt (60-75% marge)
- Impulsaankoop via TikTok of Meta advertentie
- Oplost een probleem OF heeft wow-factor
- Beschikbaar via CJ Dropshipping
- Niet te mainstream (nog ruimte voor nieuwe spelers)

Baseer je antwoord ALLEEN op wat je ziet in de data hierboven — welke productcategorieën/niches scoren goed op meerdere platforms?

Geef 10 niches als JSON array:
[{
  "name": "korte naam (bijv. 'Massage Guns')",
  "keyword": "CJ zoekwoord in het Engels",
  "why": "1 concrete zin gebaseerd op de data (bijv. 'Staat #3 op Amazon NL health + meest gekopieerd op CJ')",
  "opportunityScore": 8,
  "trend": "rising" | "stable" | "seasonal",
  "avgMargin": "68%",
  "targetAudience": "kort (bijv. '25-45 jaar, sport/wellness)'",
  "priceRange": "€29-€79"
}]

Geef ALLEEN de JSON array terug, geen uitleg eromheen.`,
      }],
    })

    const text = (msg.content[0] as { text: string }).text
    // Strip markdown code blocks if present
    const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
    const niches = JSON.parse(clean)

    return NextResponse.json({
      niches,
      sources: availableSources,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Niches error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
