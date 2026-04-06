import { NextResponse } from 'next/server'
import { shopifyFetch } from '@/lib/shopify'

export async function GET() {
  try {
    const [shopData, countData] = await Promise.all([
      shopifyFetch('/shop.json'),
      shopifyFetch('/products/count.json'),
    ])
    return NextResponse.json({ shop: shopData.shop, productCount: countData.count })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
