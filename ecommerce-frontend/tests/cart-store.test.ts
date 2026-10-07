import { beforeEach, describe, expect, it } from 'vitest'
import { useCartStore } from '@/stores/cart-store'
import type { Product } from '@/types/models'

const product: Product = {
  id: 42,
  name: 'Everyday mug',
  description: 'A sturdy ceramic mug.',
  price: 12.5,
  stock: 8,
  image_url: null,
  owner_id: 3,
  created_at: '2026-01-01T00:00:00Z',
}

describe('Zustand cart store', () => {
  beforeEach(() => useCartStore.getState().clear())

  it('starts with an empty cart', () => {
    expect(useCartStore.getState().items).toEqual([])
  })

  it('adds a product at the requested quantity', () => {
    useCartStore.getState().addItem(product, 2)
    expect(useCartStore.getState().items[0]).toMatchObject({ product_id: 42, quantity: 2, total_price: 25 })
  })

  it('merges an added product with its existing line', () => {
    useCartStore.getState().addItem(product)
    useCartStore.getState().addItem(product, 2)
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].quantity).toBe(3)
  })

  it('updates quantity and recalculates the line total', () => {
    useCartStore.getState().addItem(product)
    useCartStore.getState().setQuantity(product.id, 4)
    expect(useCartStore.getState().items[0]).toMatchObject({ quantity: 4, total_price: 50 })
  })

  it('removes a line when quantity is set below one', () => {
    useCartStore.getState().addItem(product)
    useCartStore.getState().setQuantity(product.id, 0)
    expect(useCartStore.getState().items).toEqual([])
  })

  it('removes a product by identifier', () => {
    useCartStore.getState().addItem(product)
    useCartStore.getState().removeItem(product.id)
    expect(useCartStore.getState().items).toEqual([])
  })

  it('replaces its server-synchronized items', () => {
    const serverItems = [{ product_id: 42, name: product.name, description: product.description, price: product.price, quantity: 2, total_price: 25 }]
    useCartStore.getState().setItems(serverItems)
    expect(useCartStore.getState().items).toEqual(serverItems)
  })

  it('clears the cart', () => {
    useCartStore.getState().addItem(product)
    useCartStore.getState().clear()
    expect(useCartStore.getState().items).toEqual([])
  })
})
