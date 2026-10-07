import type { ImgHTMLAttributes } from 'react'
import type { Product } from '@/types/models'

const productImages = [
  'photo-1505740420928-5e560c06d30e',
  'photo-1548036328-c9fa89d128fa',
  'photo-1602143407151-7111542de6e8',
  'photo-1523275335684-37898b6baf30',
  'photo-1570222094114-d054a817e56b',
  'photo-1603006905003-be475563bc59',
  'photo-1503602642458-232111445657',
]

interface ProductImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'onError'> {
  product: Pick<Product, 'id' | 'name' | 'image_url'>
}

export function ProductImage({ product, className = '', loading = 'lazy', fetchPriority, sizes = '(max-width: 700px) 90vw, (max-width: 1100px) 45vw, 32vw' }: ProductImageProps) {
  const remoteImage = typeof product.image_url === 'string' && /^https?:\/\//.test(product.image_url)
    ? product.image_url
    : null
  const storedPath = typeof product.image_url === 'string' && !remoteImage
    ? product.image_url.replace(/^\/?app\//, '').replace(/^\//, '')
    : null
  const imageId = productImages[Math.abs(Number(product.id) || 0) % productImages.length]
  const fallbackImage = `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=640&q=75`
  const fallbackSrcSet = [320, 640, 900]
    .map((width) => `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=${width}&q=75 ${width}w`)
    .join(', ')
  const imageUrl = remoteImage || (storedPath ? `/api/${storedPath}` : fallbackImage)

  return (
    <img
      className={className}
      src={imageUrl}
      srcSet={!remoteImage && !storedPath ? fallbackSrcSet : undefined}
      sizes={sizes}
      alt={product.name}
      width="900"
      height="1012"
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      onError={(event) => { event.currentTarget.src = fallbackImage }}
    />
  )
}