export async function shopifyFetch(path: string, options: RequestInit = {}) {
  const token = process.env.SHOPIFY_ACCESS_TOKEN!
  const domain = process.env.SHOPIFY_STORE_DOMAIN!
  const res = await fetch(`https://${domain}/admin/api/2026-04${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
      ...options.headers,
    },
  })
  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`)
  return res.json()
}

export async function importProductToShopify(product: {
  title: string
  description: string
  price: string
  images: string[]
  vendor?: string
}) {
  return shopifyFetch('/products.json', {
    method: 'POST',
    body: JSON.stringify({
      product: {
        title: product.title,
        body_html: product.description,
        vendor: product.vendor || 'Dropship',
        status: 'draft',
        images: product.images.map(src => ({ src })),
        variants: [{ price: product.price, inventory_management: 'shopify' }],
      },
    }),
  })
}
