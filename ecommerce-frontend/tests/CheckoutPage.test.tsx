import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { useAuthStore } from '@/stores/auth-store'
import { server } from './mocks/server'
import type { ApiEnvelope, CartItem, Order } from '@/types/models'

const cart: CartItem[] = [{
  product_id: 3,
  name: 'Cotton throw',
  description: null,
  price: 40,
  quantity: 2,
  total_price: 80,
}]

const order: Order = {
  id: 23,
  user_id: 5,
  total_amount: 80,
  status: 'Pending',
  created_at: '2026-01-01T00:00:00Z',
  items: [],
}

function renderCheckout() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<h1>Order history</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillAddress(user: ReturnType<typeof userEvent.setup>) {
  const name = await screen.findByLabelText('Full name')
  const email = await screen.findByLabelText('Email')
  await user.clear(name)
  await user.type(name, 'Sam Lee')
  await user.clear(email)
  await user.type(email, 'sam@example.com')
  await user.type(await screen.findByLabelText('Phone'), '+1 555 010 0150')
  await user.type(await screen.findByLabelText('Street address'), '10 Example Street')
  await user.type(await screen.findByLabelText('City'), 'Example City')
  await user.type(await screen.findByLabelText('Postal code'), '10001')
  await user.type(await screen.findByLabelText('Country'), 'Example Country')
}

describe('checkout workflow', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'test-token',
      user: { id: 5, name: 'Sam Lee', email: 'sam@example.com', role: 'user' },
      loading: false,
    })
    server.use(http.get('/api/cart/', () => HttpResponse.json<ApiEnvelope<CartItem[]>>({
      success: true,
      message: 'ok',
      data: cart,
    })))
  })

  it('shows field validation errors for an incomplete address', async () => {
    const user = userEvent.setup()
    renderCheckout()
    for (const label of ['Full name', 'Email', 'Phone', 'Street address', 'City', 'Postal code', 'Country']) {
      await user.clear(await screen.findByLabelText(label))
    }
    await user.click(await screen.findByRole('button', { name: /place order/i }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: /Full name/ })).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getByRole('textbox', { name: /Street address/ })).toHaveAttribute('aria-invalid', 'true')
  })

  it('submits delivery details, then navigates to order history', async () => {
    const user = userEvent.setup()
    let submittedAddress: unknown
    server.use(http.post('/api/orders/', async ({ request }) => {
      const body = await request.json() as { shipping_address: unknown }
      submittedAddress = body.shipping_address
      return HttpResponse.json<ApiEnvelope<Order>>({ success: true, message: 'ok', data: order })
    }))
    renderCheckout()
    await fillAddress(user)
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByRole('heading', { name: 'Order history' })).toBeInTheDocument()
    expect(submittedAddress).toEqual({
      full_name: 'Sam Lee',
      email: 'sam@example.com',
      phone: '+1 555 010 0150',
      address_line: '10 Example Street',
      city: 'Example City',
      postal_code: '10001',
      country: 'Example Country',
    })
  })

  it('keeps the checkout visible and announces API failures', async () => {
    const user = userEvent.setup()
    server.use(http.post('/api/orders/', () => HttpResponse.json({ detail: 'Not enough stock' }, { status: 400 })))
    renderCheckout()
    await fillAddress(user)
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Not enough stock')
    expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: /place order/i })).toBeEnabled())
  })

  it('does not show stale cart totals from a previous user', async () => {
    server.use(http.get('/api/cart/', () => HttpResponse.json<ApiEnvelope<CartItem[]>>({
      success: true,
      message: 'ok',
      data: [],
    })))
    renderCheckout()
    expect(await screen.findByRole('heading', { name: 'Your bag is empty.' })).toBeInTheDocument()
  })
})
