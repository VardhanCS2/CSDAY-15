import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Box, RotateCcw } from 'lucide-react'
import { errorMessage } from '@/api/client'
import { useOrderActions, useOrders } from '@/hooks/use-orders'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import type { Order } from '@/types/models'

export function OrdersPage() {
  const location = useLocation()
  const [notice, setNotice] = useState(typeof location.state?.notice === 'string' ? location.state.notice : '')
  const [busyId, setBusyId] = useState<number | null>(null)
  const ordersQuery = useOrders()
  const orders: Order[] = ordersQuery.data || []
  const cancelMutation = useOrderActions()

  async function cancelOrder(orderId: number) {
    setBusyId(orderId)
    try {
      await cancelMutation.mutateAsync({ orderId, action: 'cancel' })
      setNotice(`Order #${orderId} cancelled.`)
    } catch (requestError) { setNotice(errorMessage(requestError)) }
    finally { setBusyId(null) }
  }

  if (ordersQuery.isPending) return <main className="route-loading">Loading your orders...</main>

  return (
    <main className="account-page">
      <div className="account-page-heading"><div><p className="eyebrow"><span className="eyebrow-line" /> Kept track of</p><h1>Your orders</h1></div><Link className="text-link" to="/">Shop the collection <ArrowRight size={15} /></Link></div>
      {notice && <div className="notice" role="status">{notice}</div>}
      {ordersQuery.error && <div className="notice notice-error" role="alert">{errorMessage(ordersQuery.error)}</div>}
      {!orders.length ? <div className="empty-state cart-empty"><span className="empty-icon"><Box size={22} /></span><h2>No orders to show.</h2><p>Your next favorite thing might be just around the corner.</p><Link className="ui-button ui-button-primary ui-button-default" to="/">Browse the collection <ArrowRight size={15} /></Link></div> : (
        <div className="orders-list">{orders.map((order) => <article className="order-card" key={order.id}>
          <div className="order-heading"><div><p className="order-kicker">Order #{String(order.id).padStart(5, '0')}</p><span>{new Date(order.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span></div><span className={`order-status ${order.status?.toLowerCase()}`}>{order.status}</span></div>
          <div className="order-lines">{order.items?.map((item) => <div className="order-line" key={item.id}><span>{item.quantity} × {item.product_name || `Item #${item.product_id}`}</span><span>{formatPrice(item.price * item.quantity)}</span></div>)}</div>
          {order.shipping_address && <div className="order-delivery"><span>Delivery address</span><address>{order.shipping_address.full_name}<br />{order.shipping_address.address_line}<br />{order.shipping_address.city}, {order.shipping_address.postal_code}<br />{order.shipping_address.country}</address></div>}
          <div className="order-footer"><div><span>Total</span><strong>{formatPrice(order.total_amount)}</strong></div>{order.status === 'Pending' && <Button variant="outline" size="sm" disabled={busyId === order.id} onClick={() => cancelOrder(order.id)}><RotateCcw size={14} /> {busyId === order.id ? 'Cancelling...' : 'Cancel order'}</Button>}</div>
        </article>)}</div>
      )}
    </main>
  )
}