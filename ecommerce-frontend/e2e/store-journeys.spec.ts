import { expect, test, type Page, type Route } from '@playwright/test'
import type { CartItem, Order, Product, ShippingAddress, User } from '../src/types/models'

interface StoreApiOptions {
  products?: Product[]
  cart?: CartItem[]
  orders?: Order[]
  loginFailure?: boolean
  catalogFailure?: boolean
}

const shippingAddress: ShippingAddress = {
  full_name: 'Taylor Guest',
  email: 'shopper@example.com',
  phone: '+1 555 010 0150',
  address_line: '10 Example Street',
  city: 'Example City',
  postal_code: '10001',
  country: 'Example Country',
}

function product(id: number, name: string, price: number, stock = 6): Product {
  return {
    id,
    name,
    description: `${name}, made for everyday use.`,
    price,
    stock,
    image_url: null,
    owner_id: 1,
    created_at: '2026-01-01T00:00:00Z',
  }
}

function order(id: number, status: Order['status'] = 'Pending'): Order {
  return {
    id,
    user_id: 11,
    customer: { name: 'Taylor Guest', email: 'shopper@example.com' },
    total_amount: 24,
    status,
    created_at: '2026-01-01T00:00:00Z',
    shipping_address: shippingAddress,
    items: [{ id: 1, product_id: 4, product_name: 'Linen market tote', quantity: 1, price: 24 }],
  }
}

const initialProducts = [
  product(4, 'Linen market tote', 24),
  product(5, 'Everyday mug', 12.5),
  product(6, 'Stoneware serving plate', 36),
]

function envelope<T>(data: T) {
  return { success: true, message: 'ok', data }
}

function multipartField(body: string, name: string): string {
  const marker = `name="${name}"\r\n\r\n`
  const start = body.indexOf(marker)
  if (start < 0) return ''
  const valueStart = start + marker.length
  const valueEnd = body.indexOf('\r\n', valueStart)
  return body.slice(valueStart, valueEnd < 0 ? undefined : valueEnd)
}

async function mockStoreApi(page: Page, options: StoreApiOptions = {}) {
  let products = [...(options.products ?? initialProducts)]
  let cart = [...(options.cart ?? [])]
  let orders = [...(options.orders ?? [])]
  let activeUser: User | null = null
  let nextOrderId = Math.max(80, ...orders.map((entry) => entry.id)) + 1

  await page.route('https://images.unsplash.com/**', (route) => route.abort())
  await page.route('**/api/**', async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api/, '')
    const method = request.method()

    if (path === '/auth/login' && method === 'POST') {
      if (options.loginFailure) {
        await route.fulfill({ status: 401, json: { detail: 'Invalid email or password.' } })
        return
      }
      const body = request.postDataJSON() as { email: string }
      const isAdmin = body.email.startsWith('admin')
      activeUser = {
        id: 11,
        name: isAdmin ? 'Store Admin' : 'Taylor Guest',
        email: body.email,
        role: isAdmin ? 'admin' : 'user',
      }
      await route.fulfill({ json: envelope({ access_token: 'test-access', refresh_token: 'test-refresh', token_type: 'bearer' }) })
      return
    }
    if (path === '/auth/register' && method === 'POST') {
      await route.fulfill({ json: envelope({ created: true }) })
      return
    }
    if (path === '/auth/me' && method === 'GET') {
      await route.fulfill({ json: envelope(activeUser) })
      return
    }
    if (path === '/products/' && method === 'GET') {
      if (options.catalogFailure) {
        await route.fulfill({ status: 503, json: { detail: 'Catalog unavailable.' } })
        return
      }
      const search = url.searchParams.get('search')?.toLowerCase() ?? ''
      const minPrice = Number(url.searchParams.get('min_price') ?? 0)
      const maxPrice = Number(url.searchParams.get('max_price') ?? Infinity)
      const stockAvailable = url.searchParams.get('stock_available')
      const matching = products.filter((entry) =>
        entry.name.toLowerCase().includes(search)
        && entry.price >= minPrice
        && entry.price <= maxPrice
        && (stockAvailable === null || (entry.stock > 0) === (stockAvailable === 'true')),
      )
      const pageNumber = Number(url.searchParams.get('page') ?? 1)
      const limit = Number(url.searchParams.get('limit') ?? 12)
      await route.fulfill({
        json: envelope({
          page: pageNumber,
          limit,
          total: matching.length,
          items: matching.slice((pageNumber - 1) * limit, pageNumber * limit),
        }),
      })
      return
    }
    const productMatch = path.match(/^\/products\/(\d+)$/)
    if (productMatch && method === 'GET') {
      const found = products.find((entry) => entry.id === Number(productMatch[1]))
      await route.fulfill(found ? { json: envelope(found) } : { status: 404, json: { detail: 'Product not found.' } })
      return
    }
    if (path === '/cart/' && method === 'GET') {
      await route.fulfill({ json: envelope(cart) })
      return
    }
    if (path === '/cart/add' && method === 'POST') {
      const productId = Number(url.searchParams.get('product_identifier'))
      const quantity = Number(url.searchParams.get('quantity') ?? 1)
      const selected = products.find((entry) => entry.id === productId)
      if (!selected) {
        await route.fulfill({ status: 404, json: { detail: 'Product not found.' } })
        return
      }
      const existing = cart.find((entry) => entry.product_id === productId)
      cart = existing
        ? cart.map((entry) => entry.product_id === productId
          ? { ...entry, quantity: entry.quantity + quantity, total_price: entry.price * (entry.quantity + quantity) }
          : entry)
        : [...cart, {
          product_id: selected.id,
          name: selected.name,
          description: selected.description,
          price: selected.price,
          quantity,
          total_price: selected.price * quantity,
        }]
      await route.fulfill({ json: envelope({ [String(productId)]: quantity }) })
      return
    }
    if (path === '/cart/edit' && method === 'PUT') {
      const productId = Number(url.searchParams.get('product_id'))
      const quantity = Number(url.searchParams.get('quantity'))
      cart = quantity === 0
        ? cart.filter((entry) => entry.product_id !== productId)
        : cart.map((entry) => entry.product_id === productId
          ? { ...entry, quantity, total_price: entry.price * quantity }
          : entry)
      await route.fulfill({ json: envelope(cart) })
      return
    }
    const removeMatch = path.match(/^\/cart\/remove\/(\d+)$/)
    if (removeMatch && method === 'DELETE') {
      cart = cart.filter((entry) => entry.product_id !== Number(removeMatch[1]))
      await route.fulfill({ json: envelope(cart) })
      return
    }
    if (path === '/orders/' && method === 'POST') {
      const body = request.postDataJSON() as { shipping_address: ShippingAddress }
      const placed = order(nextOrderId++)
      placed.shipping_address = body.shipping_address
      placed.items = cart.map((entry, index) => ({
        id: index + 1,
        product_id: entry.product_id,
        product_name: entry.name,
        quantity: entry.quantity,
        price: entry.price,
      }))
      placed.total_amount = cart.reduce((total, entry) => total + entry.price * entry.quantity, 0)
      orders = [placed, ...orders]
      cart = []
      await route.fulfill({ json: envelope(placed) })
      return
    }
    if (path === '/orders/' && method === 'GET') {
      await route.fulfill({ json: envelope(orders) })
      return
    }
    if (path === '/orders/admin/all' && method === 'GET') {
      await route.fulfill({ json: envelope(orders) })
      return
    }
    const orderActionMatch = path.match(/^\/orders\/(\d+)\/(cancel|complete)$/)
    if (orderActionMatch && method === 'PATCH') {
      const orderId = Number(orderActionMatch[1])
      const status = orderActionMatch[2] === 'cancel' ? 'Cancelled' : 'Completed'
      orders = orders.map((entry) => entry.id === orderId ? { ...entry, status } : entry)
      await route.fulfill({ json: envelope(orders.find((entry) => entry.id === orderId) ?? null) })
      return
    }
    if (path === '/products/' && method === 'POST') {
      const body = request.postData() ?? ''
      const created = product(
        Math.max(0, ...products.map((entry) => entry.id)) + 1,
        multipartField(body, 'name'),
        Number(multipartField(body, 'price')),
        Number(multipartField(body, 'stock')),
      )
      created.description = multipartField(body, 'description')
      products = [...products, created]
      await route.fulfill({ json: envelope(created) })
      return
    }
    const productWriteMatch = path.match(/^\/products\/(\d+)$/)
    if (productWriteMatch && method === 'PUT') {
      const productId = Number(productWriteMatch[1])
      const body = request.postDataJSON() as Pick<Product, 'name' | 'description' | 'price' | 'stock'>
      products = products.map((entry) => entry.id === productId ? { ...entry, ...body } : entry)
      await route.fulfill({ json: envelope(products.find((entry) => entry.id === productId) ?? null) })
      return
    }
    if (productWriteMatch && method === 'DELETE') {
      products = products.filter((entry) => entry.id !== Number(productWriteMatch[1]))
      await route.fulfill({ json: envelope(null) })
      return
    }

    await route.fulfill({ status: 404, json: { detail: `Unmocked test endpoint: ${method} ${path}` } })
  })
}

async function signIn(page: Page, email = 'shopper@example.com') {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill('test-password9!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.locator('.site-header')).toBeVisible()
}

async function fillDeliveryAddress(page: Page) {
  await page.getByLabel('Phone').fill(shippingAddress.phone)
  await page.getByLabel('Street address').fill(shippingAddress.address_line)
  await page.getByLabel('City').fill(shippingAddress.city)
  await page.getByLabel('Postal code').fill(shippingAddress.postal_code)
  await page.getByLabel('Country').fill(shippingAddress.country)
}

test('shows the collection and opens a product detail', async ({ page }) => {
  await mockStoreApi(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Everyday things/ })).toBeVisible()
  await expect(page.locator('.product-card')).toHaveCount(3)
  await page.getByRole('link', { name: 'View Linen market tote' }).click()
  await expect(page.getByRole('heading', { name: 'Linen market tote' })).toBeVisible()
  await expect(page.getByText('CG-0004')).toBeVisible()
})

test('searches the catalog using the API query', async ({ page }) => {
  await mockStoreApi(page)
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Search products' }).fill('mug')
  await expect(page.locator('.product-card')).toHaveCount(1)
  await expect(page.getByRole('link', { name: 'Everyday mug', exact: true })).toBeVisible()
})

test('sorts products by ascending price', async ({ page }) => {
  await mockStoreApi(page)
  await page.goto('/')
  await page.getByLabel('Sort products').selectOption('price-low')
  await expect(page.locator('.product-card .product-name').first()).toHaveText('Everyday mug')
  await expect(page.locator('.product-card .product-name').last()).toHaveText('Stoneware serving plate')
})

test('redirects unauthenticated shoppers back to their protected cart after sign-in', async ({ page }) => {
  await mockStoreApi(page)
  await page.goto('/cart')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Email address').fill('shopper@example.com')
  await page.getByLabel('Password').fill('test-password9!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.getByRole('heading', { level: 1, name: /^Your bag/ })).toBeVisible()
})

test('validates required sign-in details before sending a request', async ({ page }) => {
  await mockStoreApi(page)
  await page.goto('/login')
  await page.getByLabel('Email address').fill('not-an-email')
  await page.getByLabel('Password').fill('short')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.locator('.field-error').filter({ hasText: 'Enter a valid email address.' })).toBeVisible()
  await expect(page.locator('.field-error').filter({ hasText: 'Password must contain at least 8 characters.' })).toBeVisible()
})

test('announces authentication API errors without navigating away', async ({ page }) => {
  await mockStoreApi(page, { loginFailure: true })
  await page.goto('/login')
  await page.getByLabel('Email address').fill('shopper@example.com')
  await page.getByLabel('Password').fill('test-password9!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password.')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('signs in a customer and exposes customer navigation', async ({ page }) => {
  await mockStoreApi(page)
  await signIn(page)
  await expect(page.getByText('Hi, Taylor')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Your orders' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0)
})

test('registers a new account through the registration and sign-in flow', async ({ page }) => {
  await mockStoreApi(page)
  await page.goto('/register')
  await page.getByLabel('Your name').fill('Taylor Guest')
  await page.getByLabel('Email address').fill('new-shopper@example.com')
  await page.getByLabel('Password').fill('new-password9!')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('Hi, Taylor')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Everyday things/ })).toBeVisible()
})

test('changes product quantity and adds that quantity to the server cart', async ({ page }) => {
  await mockStoreApi(page)
  await signIn(page)
  await page.goto('/product/4')
  await expect(page.getByRole('heading', { name: 'Linen market tote' })).toBeVisible()
  await page.getByRole('button', { name: 'Increase quantity' }).click()
  await expect(page.getByText('2', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Add to bag' }).click()
  await expect(page.getByRole('link', { name: 'Shopping bag, 2 items' })).toBeVisible()
})

test('updates cart quantities and recalculates line and subtotal amounts', async ({ page }) => {
  const cart: CartItem[] = [{
    product_id: 4, name: 'Linen market tote', description: 'A daily carryall.',
    price: 24, quantity: 1, total_price: 24,
  }]
  await mockStoreApi(page, { cart })
  await signIn(page)
  await page.goto('/cart')
  await page.getByRole('button', { name: 'Increase Linen market tote quantity' }).click()
  await expect(page.locator('.cart-item-controls strong')).toHaveText('₹48.00')
  await expect(page.locator('.summary-total b')).toHaveText('₹48.00')
})

test('removes cart items and displays the empty-cart state', async ({ page }) => {
  const cart: CartItem[] = [{
    product_id: 4, name: 'Linen market tote', description: 'A daily carryall.',
    price: 24, quantity: 1, total_price: 24,
  }]
  await mockStoreApi(page, { cart })
  await signIn(page)
  await page.goto('/cart')
  await page.getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByText('Your bag is taking a breather.')).toBeVisible()
})

test('validates checkout address fields and does not create an invalid order', async ({ page }) => {
  const cart: CartItem[] = [{
    product_id: 4, name: 'Linen market tote', description: 'A daily carryall.',
    price: 24, quantity: 1, total_price: 24,
  }]
  await mockStoreApi(page, { cart })
  await signIn(page)
  await page.goto('/checkout')
  await page.getByRole('button', { name: /Place order/ }).click()
  await expect(page.getByText('Enter a valid phone number.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible()
})

test('places an order with validated delivery details and shows it in order history', async ({ page }) => {
  const cart: CartItem[] = [{
    product_id: 4, name: 'Linen market tote', description: 'A daily carryall.',
    price: 24, quantity: 1, total_price: 24,
  }]
  await mockStoreApi(page, { cart })
  await signIn(page)
  await page.goto('/checkout')
  await fillDeliveryAddress(page)
  await page.getByRole('button', { name: /Place order/ }).click()
  await expect(page.getByRole('heading', { name: 'Your orders' })).toBeVisible()
  await expect(page.getByText('Order #00081')).toBeVisible()
  await expect(page.getByText('10 Example Street')).toBeVisible()
  await expect(page.locator('.order-card .order-footer strong')).toHaveText('₹24.00')
})

test('shows previous order details and lets a customer cancel a pending order', async ({ page }) => {
  await mockStoreApi(page, { orders: [order(81)] })
  await signIn(page)
  await page.goto('/orders')
  await expect(page.getByText('Order #00081')).toBeVisible()
  await expect(page.getByText('10 Example Street')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel order' }).click()
  await expect(page.getByText('Cancelled', { exact: true })).toBeVisible()
})

test('prevents customer accounts from entering the admin dashboard', async ({ page }) => {
  await mockStoreApi(page)
  await signIn(page)
  await page.goto('/admin')
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: /Everyday things/ })).toBeVisible()
})

test('lets administrators complete pending orders', async ({ page }) => {
  await mockStoreApi(page, { orders: [order(81)] })
  await signIn(page, 'admin@example.com')
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible()
  await expect(page.getByText('Taylor Guest')).toBeVisible()
  await page.getByRole('button', { name: 'Complete', exact: true }).click()
  await expect(page.getByText('Completed', { exact: true })).toBeVisible()
})

test('lets administrators cancel pending orders', async ({ page }) => {
  await mockStoreApi(page, { orders: [order(81)] })
  await signIn(page, 'admin@example.com')
  await page.goto('/admin')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByText('Cancelled', { exact: true })).toBeVisible()
})

test('creates a catalog product from the admin dashboard', async ({ page }) => {
  await mockStoreApi(page)
  await signIn(page, 'admin@example.com')
  await page.goto('/admin')
  await page.getByRole('tab', { name: /Products/ }).click()
  await page.getByRole('button', { name: /Add product/ }).click()
  await page.getByLabel('Name').fill('New ceramic bowl')
  await page.getByLabel('Price').fill('19.50')
  await page.getByLabel('Stock').fill('8')
  await page.getByLabel('Description').fill('A hand-finished serving bowl.')
  await page.getByRole('button', { name: 'Create product' }).click()
  await expect(page.getByText('New ceramic bowl')).toBeVisible()
})

test('edits and removes a catalog product', async ({ page }) => {
  await mockStoreApi(page)
  await signIn(page, 'admin@example.com')
  await page.goto('/admin')
  await page.getByRole('tab', { name: /Products/ }).click()
  await page.getByRole('button', { name: 'Edit Linen market tote' }).click()
  await page.getByLabel('Name').fill('Updated linen tote')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Updated linen tote')).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete Updated linen tote' }).click()
  await expect(page.getByText('Updated linen tote')).toHaveCount(0)
})

test('toggles dark mode and restores the saved preference after reload', async ({ page }) => {
  await mockStoreApi(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
