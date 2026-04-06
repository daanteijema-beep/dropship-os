import { NextResponse } from 'next/server'
import { shopifyFetch } from '@/lib/shopify'

export async function GET() {
  try {
    const data = await shopifyFetch('/products.json?limit=250')
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
