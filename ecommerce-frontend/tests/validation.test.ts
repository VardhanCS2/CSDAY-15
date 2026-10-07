import { describe, expect, it } from 'vitest'
import { checkoutSchema, loginSchema, productSchema, registerSchema } from '@/lib/validation'

describe('login validation', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse({ email: 'shop@example.com', password: 'password' }).success).toBe(true)
  })

  it('trims surrounding whitespace from email', () => {
    expect(loginSchema.parse({ email: ' shop@example.com ', password: 'password' }).email).toBe('shop@example.com')
  })

  it('rejects malformed email addresses', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'password' }).success).toBe(false)
  })

  it('requires a non-empty password', () => {
    expect(loginSchema.safeParse({ email: 'shop@example.com', password: '' }).success).toBe(false)
  })
})

describe('registration validation', () => {
  it('accepts a complete registration', () => {
    expect(registerSchema.safeParse({ name: 'Sam Lee', email: 'sam@example.com', password: 'safe-pass9!' }).success).toBe(true)
  })

  it('rejects a too-short name', () => {
    expect(registerSchema.safeParse({ name: 'S', email: 'sam@example.com', password: 'safe-pass9!' }).success).toBe(false)
  })

  it('requires a digit and a special character in the password', () => {
    expect(registerSchema.safeParse({ name: 'Sam Lee', email: 'sam@example.com', password: 'safe-pass!' }).success).toBe(false)
    expect(registerSchema.safeParse({ name: 'Sam Lee', email: 'sam@example.com', password: 'safepass9' }).success).toBe(false)
  })
})

describe('product form validation', () => {
  it('converts a valid price to a number', () => {
    expect(productSchema.parse({ name: 'Cup', description: '', price: '12.50', stock: '4' }).price).toBe(12.5)
  })

  it('rejects prices with excess precision', () => {
    expect(productSchema.safeParse({ name: 'Cup', description: '', price: '12.501', stock: '4' }).success).toBe(false)
  })

  it('rejects negative prices and stock', () => {
    expect(productSchema.safeParse({ name: 'Cup', description: '', price: '-1', stock: '4' }).success).toBe(false)
    expect(productSchema.safeParse({ name: 'Cup', description: '', price: '1', stock: '-1' }).success).toBe(false)
  })

  it('rejects fractional stock', () => {
    expect(productSchema.safeParse({ name: 'Cup', description: '', price: '1', stock: '1.5' }).success).toBe(false)
  })
})

describe('checkout validation', () => {
  const address = {
    full_name: 'Sam Lee',
    email: 'sam@example.com',
    phone: '+1 555 010 0150',
    address_line: '10 Example Street',
    city: 'Example City',
    postal_code: '10001',
    country: 'Example Country',
  }

  it('accepts a complete delivery address', () => {
    expect(checkoutSchema.parse(address)).toEqual(address)
  })

  it('rejects missing delivery fields', () => {
    expect(checkoutSchema.safeParse({ ...address, address_line: '' }).success).toBe(false)
  })

  it('rejects an invalid checkout email', () => {
    expect(checkoutSchema.safeParse({ ...address, email: 'invalid' }).success).toBe(false)
  })

  it('rejects phone numbers without digits', () => {
    expect(checkoutSchema.safeParse({ ...address, phone: 'telephone' }).success).toBe(false)
  })
})
