import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api, errorMessage, responseData } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cartQueryKey, useCart } from '@/hooks/use-cart'
import { useAuth } from '@/hooks/useAuth'
import { checkoutSchema, type CheckoutValues } from '@/lib/validation'
import { formatPrice } from '@/lib/utils'
import type { Order } from '@/types/models'

const fields: Array<{ name: keyof CheckoutValues; label: string; autoComplete: string }> = [
  { name: 'full_name', label: 'Full name', autoComplete: 'name' },
  { name: 'email', label: 'Email', autoComplete: 'email' },
  { name: 'phone', label: 'Phone', autoComplete: 'tel' },
  { name: 'address_line', label: 'Street address', autoComplete: 'street-address' },
  { name: 'city', label: 'City', autoComplete: 'address-level2' },
  { name: 'postal_code', label: 'Postal code', autoComplete: 'postal-code' },
  { name: 'country', label: 'Country', autoComplete: 'country-name' },
]

export function CheckoutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const cartQuery = useCart()
  const items = cartQuery.data ?? []
  const subtotal = items.reduce((sum, item) => sum + Number(item.total_price || item.price * item.quantity), 0)
  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      full_name: user?.name ?? '',
      email: user?.email ?? '',
      phone: '',
      address_line: '',
      city: '',
      postal_code: '',
      country: '',
    },
  })
  const { errors: formErrors } = form.formState
  const orderMutation = useMutation({
    mutationFn: async (address: CheckoutValues) =>
      responseData<Order>(await api.post('/orders/', { shipping_address: address })),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cartQueryKey(user?.id) }),
        queryClient.invalidateQueries({ queryKey: ['orders', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ])
      toast.success('Your order has been placed.')
      navigate('/orders')
    },
    onError: (error: unknown) => toast.error(errorMessage(error)),
  })

  if (cartQuery.isPending) return <main className="route-loading">Loading your bag...</main>
  if (cartQuery.isError) return <main className="account-page"><div className="notice notice-error" role="alert">{errorMessage(cartQuery.error)}</div></main>
  if (!items.length) return <main className="account-page"><div className="empty-state cart-empty"><h1>Your bag is empty.</h1><p>Add something to your bag before checking out.</p><Link className="text-link" to="/">Return to the collection</Link></div></main>

  return (
    <main className="account-page checkout-page">
      <Link className="back-link" to="/cart"><ArrowLeft size={15} /> Back to your bag</Link>
      <div className="account-page-heading"><div><p className="eyebrow"><span className="eyebrow-line" /> Almost yours</p><h1>Checkout</h1></div></div>
      <div className="cart-layout">
        <form className="admin-product-form checkout-form" onSubmit={form.handleSubmit((values) => orderMutation.mutate(values))} noValidate>
          <div className="admin-form-title"><div><h2>Delivery details</h2><p className="summary-note">Where should we send your order?</p></div></div>
          <div className="admin-form-grid checkout-fields">
            {fields.map(({ name, label, autoComplete }) => {
              const error = formErrors[name]
              return (
                <label className="form-field" key={name}>
                  <span>{label}</span>
                  <Input autoComplete={autoComplete} aria-invalid={Boolean(error)} {...form.register(name)} />
                  {error?.message && <small className="field-error">{error.message}</small>}
                </label>
              )
            })}
          </div>
          <p className="summary-note"><LockKeyhole size={14} /> Your address is stored with this order so you can review it later.</p>
          {orderMutation.isError && <p className="form-message error-text" role="alert">{errorMessage(orderMutation.error)}</p>}
          <Button type="submit" disabled={orderMutation.isPending || cartQuery.isFetching}>{orderMutation.isPending ? 'Placing order...' : 'Place order'}<ArrowRight size={15} /></Button>
        </form>
        <aside className="order-summary">
          <p className="eyebrow">Order summary</p>
          {items.map((item) => <div className="summary-row" key={item.product_id}><span>{item.name} × {item.quantity}</span><b>{formatPrice(item.total_price || item.price * item.quantity)}</b></div>)}
          <div className="summary-total"><span>Total</span><b>{formatPrice(subtotal)}</b></div>
          <p className="summary-note">Payment arrangements are confirmed by the store after your order is placed.</p>
        </aside>
      </div>
    </main>
  )
}
