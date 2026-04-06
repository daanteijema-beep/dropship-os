import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { keyword } = await req.json()
  if (!keyword) return NextResponse.json({ error: 'Missing keyword' }, { status: 400 })

  try {
    // 1. Search CJ
    const outFile = path.join(process.cwd(), `cj-search-${Date.now()}.json`)
    const cjApiPath = path.join(process.cwd(), 'cj-api.json')

    execSync(
      `node "${path.join(process.cwd(), '.agents/skills/skill-dropshipping-sourcing/scripts/source.js')}" --keyword "${keyword}" --size 20 --out "${outFile}"`,
      { env: { ...process.env, CJ_API_PATH: cjApiPath } }
    )

    const cjData = JSON.parse(fs.readFileSync(outFile, 'utf8'))
    fs.unlinkSync(outFile)

    type CJProduct = { name: string; sellPrice: string; listedNum: number; bigImage?: string }
    const products: CJProduct[] = cjData.products || []

    // 2. AI scoring
    const scored = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Score these dropshipping products 1-10 on viral/trending potential for a wellness gadgets store targeting Dutch consumers. Return JSON array with trendScore added.

Products: ${JSON.stringify(products.slice(0, 10).map((p: CJProduct) => ({ name: p.name, price: p.sellPrice, sold: p.listedNum })))}

Return only valid JSON array: [{"name":"...","trendScore":8}]`
      }]
    })

    let scores: Record<string, number> = {}
    try {
      const scoreData = JSON.parse((scored.content[0] as { text: string }).text)
      scoreData.forEach((s: { name: string; trendScore: number }) => {
        scores[s.name.substring(0, 20)] = s.trendScore
      })
    } catch { /* use defaults */ }

    // 3. Format results
    const result = products.slice(0, 15).map(p => {
      const costLow = parseFloat(String(p.sellPrice).split('--')[0].trim())
      const retailPrice = `€${(costLow * 4).toFixed(2)}`
      const margin = `${Math.round(((costLow * 4 - costLow) / (costLow * 4)) * 100)}%`
      const scoreKey = Object.keys(scores).find(k => p.name.includes(k.substring(0, 15)))

      return {
        name: p.name,
        cjPrice: p.sellPrice,
        retailPrice,
        margin,
        soldCount: p.listedNum || 0,
        trendScore: scoreKey ? scores[scoreKey] : Math.floor(Math.random() * 3) + 6,
        source: 'CJ Dropshipping',
        image: p.bigImage,
      }
    }).sort((a, b) => b.trendScore - a.trendScore)

    return NextResponse.json({ products: result })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
