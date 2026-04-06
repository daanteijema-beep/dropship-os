import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const prompts: Record<string, string> = {
  'Meta Ad': `Schrijf een korte Meta/Facebook ad voor: {product}

Format:
- Headline (max 40 tekens)
- Primary text (max 125 tekens, pakkend, probleem → oplossing)
- CTA

Doelgroep: Nederlandse consumenten, 25-45 jaar. Toon: direct, urgent, benefit-focused.`,

  'TikTok Script': `Schrijf een TikTok video script (15-30 sec) voor: {product}

Format:
- Hook (eerste 2 seconden - pakkend!)
- Problem (5 sec)
- Product intro (5 sec)
- Proof/benefit (10 sec)
- CTA (3 sec)

Toon: casual, authentiek, Nederlands`,

  'Instagram Caption': `Schrijf een Instagram caption voor: {product}

Format:
- Opening zin (stopper)
- 3-4 benefits in bullets
- CTA
- 5-8 relevante hashtags

Toon: inspirerend, beknopt, Nederlands`,

  'Product Beschrijving': `Schrijf een Shopify productbeschrijving voor: {product}

Inclusieff:
- Pakkende intro (1-2 zinnen)
- 5 bullet points met benefits
- Wie het voor is
- Call-to-action

Toon: overtuigend, helder, Nederlands`,
}

export async function POST(req: NextRequest) {
  const { product, format } = await req.json()
  const prompt = (prompts[format] || prompts['Meta Ad']).replace('{product}', product)

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })

  return NextResponse.json({ content: (msg.content[0] as { text: string }).text })
}
