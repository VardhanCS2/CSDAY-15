import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { CheckCircle2, ClipboardList, ImagePlus, PackagePlus, Pencil, RefreshCw, ShieldCheck, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessage, responseData } from '@/api/client'
import { useOrderActions, useOrders } from '@/hooks/use-orders'
import { ProductImage } from '@/components/ProductImage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatPrice } from '@/lib/utils'
import { productSchema } from '@/lib/validation'
import { useAuth } from '@/hooks/useAuth'
import type { Order, Paginated, Product } from '@/types/models'
import type { z } from 'zod'

type ProductForm = { name: string; description: string; price: string; stock: string; image: File | null }
type ProductSection = 'orders' | 'products'
type ProductValues = z.infer<typeof productSchema>
interface SaveProductVariables { product: Product | null; data: ProductValues; image: File | null }
interface SaveProductContext {
  productsKey: readonly ['admin', 'products']
  previousList: Paginated<Product> | undefined
  productId?: number
  previousProduct?: Product
}
interface DeleteProductContext {
  productsKey: readonly ['admin', 'products']
  previousList: Paginated<Product> | undefined
}
const emptyProduct: ProductForm = { name: '', description: '', price: '', stock: '', image: null }

export function AdminPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [section, setSection] = useState<ProductSection>('orders')
  const [saving, setSaving] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyProduct)
  const [error, setError] = useState('')
  const [busyOrder, setBusyOrder] = useState<number | null>(null)
  const ordersQuery = useOrders({ admin: true })
  const productsQuery = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: async () => responseData<Paginated<Product>>(await api.get('/products/', { params: { page: 1, limit: 100 } })),
  })
  const orders = ordersQuery.data || []
  const products = productsQuery.data?.items || []
  const loading = ordersQuery.isPending || productsQuery.isPending
  const orderMutation = useOrderActions({ admin: true })

  const saveProductMutation = useMutation<unknown, Error, SaveProductVariables, SaveProductContext>({
    mutationFn: async ({ product, data, image }) => {
      if (product) {
        return api.put(`/products/${product.id}`, {
          name: data.name,
          description: data.description || null,
          price: data.price,
          stock: data.stock,
        })
      }
      const payload = new FormData()
      payload.append('name', data.name)
      payload.append('description', data.description)
      payload.append('price', String(data.price))
      payload.append('stock', String(data.stock))
      if (image) payload.append('image', image)
      return api.post('/products/', payload)
    },
    onMutate: async ({ product, data }) => {
      const productsKey = ['admin', 'products'] as const
      if (!product) return { productsKey, previousList: queryClient.getQueryData<Paginated<Product>>(productsKey) }
      await queryClient.cancelQueries({ queryKey: productsKey })
      await queryClient.cancelQueries({ queryKey: ['product', product.id] })
      const previousList = queryClient.getQueryData<Paginated<Product>>(productsKey)
      const previousProduct = queryClient.getQueryData<Product>(['product', product.id])
      const optimisticProduct = { ...product, ...data }
      queryClient.setQueryData<Paginated<Product>>(productsKey, (current) => current && ({
        ...current,
        items: current.items.map((item) => item.id === product.id ? optimisticProduct : item),
      }))
      queryClient.setQueryData(['product', product.id], optimisticProduct)
      return { productsKey, previousList, productId: product.id, previousProduct }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousList) queryClient.setQueryData(context.productsKey, context.previousList)
      if (context?.previousProduct && context.productId) queryClient.setQueryData(['product', context.productId], context.previousProduct)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
  const deleteProductMutation = useMutation<unknown, Error, number, DeleteProductContext>({
    mutationFn: (productId: number) => api.delete(`/products/${productId}`),
    onMutate: async (productId) => {
      const productsKey = ['admin', 'products'] as const
      await queryClient.cancelQueries({ queryKey: productsKey })
      const previousList = queryClient.getQueryData<Paginated<Product>>(productsKey)
      queryClient.setQueryData<Paginated<Product>>(productsKey, (current) => current && ({
        ...current,
        total: Math.max(0, current.total - 1),
        items: current.items.filter((item) => item.id !== productId),
      }))
      return { productsKey, previousList }
    },
    onError: (_error, _productId, context) => {
      if (context?.previousList) queryClient.setQueryData(context.productsKey, context.previousList)
    },
    onSettled: (_data, _error, productId) => {
      queryClient.removeQueries({ queryKey: ['product', productId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  function changeSection(value: ProductSection) {
    setError('')
    setFormOpen(false)
    setSection(value)
  }

  function beginCreate() {
    setFormOpen(true)
    setEditingProduct(null)
    setForm(emptyProduct)
    setError('')
  }

  function beginEdit(product: Product) {
    setFormOpen(true)
    setEditingProduct(product)
    setForm({ name: product.name, description: product.description || '', price: String(product.price), stock: String(product.stock), image: null })
    setError('')
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = productSchema.safeParse(form)
    if (!parsed.success) {
      const issues = Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message]))
      setError(Object.values(issues)[0])
      toast.error(Object.values(issues)[0])
      return
    }

    setSaving(true)
    setError('')
    try {
      if (editingProduct) {
        await saveProductMutation.mutateAsync({ product: editingProduct, data: parsed.data, image: form.image })
        toast.success('Product updated successfully.')
      } else {
        await saveProductMutation.mutateAsync({ product: null, data: parsed.data, image: form.image })
        toast.success('Product created successfully.')
      }
      setEditingProduct(null)
      setForm(emptyProduct)
      setFormOpen(false)
    } catch (requestError) {
      const message = errorMessage(requestError)
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Remove “${product.name}” from the catalog?`)) return
    setError('')
    try {
      await deleteProductMutation.mutateAsync(product.id)
      toast.success('Product removed successfully.')
    } catch (requestError) {
      const message = errorMessage(requestError)
      setError(message)
      toast.error(message)
    }
  }

  async function cancelOrder(order: Order) {
    setBusyOrder(order.id)
    setError('')
    try {
      await orderMutation.mutateAsync({ orderId: order.id, action: 'cancel' })
      toast.success(`Order #${order.id} cancelled.`)
    } catch (requestError) {
      const message = errorMessage(requestError)
      setError(message)
      toast.error(message)
    } finally {
      setBusyOrder(null)
    }
  }

  async function completeOrder(order: Order) {
    setBusyOrder(order.id)
    setError('')
    try {
      await orderMutation.mutateAsync({ orderId: order.id, action: 'complete' })
      toast.success(`Order #${order.id} marked completed.`)
    } catch (requestError) {
      const message = errorMessage(requestError)
      setError(message)
      toast.error(message)
    } finally {
      setBusyOrder(null)
    }
  }

  const pendingCount = orders.filter((order) => order.status === 'Pending').length
  const orderRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)

  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div><p className="eyebrow"><span className="eyebrow-line" /> Store management</p><h1>Admin dashboard</h1><p className="admin-welcome">Signed in as {user?.name} · administrator</p></div>
        <span className="admin-role-mark"><ShieldCheck size={17} /> Admin access</span>
      </div>

      <div className="admin-metrics">
        <div><span>All orders</span><strong>{orders.length}</strong><small>Across every customer</small></div>
        <div><span>Pending</span><strong>{pendingCount}</strong><small>Awaiting fulfillment</small></div>
        <div><span>Order value</span><strong>{formatPrice(orderRevenue)}</strong><small>Recorded order totals</small></div>
        <div><span>Catalog</span><strong>{products.length}</strong><small>Products currently listed</small></div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-tabs" role="tablist" aria-label="Admin sections">
          <button role="tab" aria-selected={section === 'orders'} className={section === 'orders' ? 'selected' : ''} onClick={() => changeSection('orders')}><ClipboardList size={15} /> All orders</button>
          <button role="tab" aria-selected={section === 'products'} className={section === 'products' ? 'selected' : ''} onClick={() => changeSection('products')}><PackagePlus size={15} /> Products</button>
        </div>
        <div className="admin-actions">
          {section === 'products' && <Button size="sm" onClick={beginCreate}><PackagePlus size={14} /> Add product</Button>}
          <Button variant="outline" size="sm" aria-label="Refresh admin data" title="Refresh" onClick={() => { ordersQuery.refetch(); productsQuery.refetch() }}><RefreshCw size={14} /> Refresh</Button>
        </div>
      </div>

      {(error || (ordersQuery.error && errorMessage(ordersQuery.error)) || (productsQuery.error && errorMessage(productsQuery.error))) && <div className="notice notice-error" role="alert">{error || errorMessage(ordersQuery.error || productsQuery.error)}</div>}

      {section === 'products' && formOpen && (
        <form className="admin-product-form" onSubmit={saveProduct}>
          <div className="admin-form-title"><div><p className="eyebrow">Catalog item</p><h2>{editingProduct ? `Edit ${editingProduct.name}` : 'New product'}</h2></div><button className="icon-button" type="button" aria-label="Close product form" onClick={() => { setFormOpen(false); setEditingProduct(null); setForm(emptyProduct) }}><X size={17} /></button></div>
          <div className="admin-form-grid">
            <label className="form-field"><span>Name</span><Input value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} required maxLength={100} /></label>
            <label className="form-field"><span>Price</span><Input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm((value) => ({ ...value, price: event.target.value }))} required /></label>
            <label className="form-field"><span>Stock</span><Input type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm((value) => ({ ...value, stock: event.target.value }))} required /></label>
            <label className="form-field admin-description"><span>Description</span><Input value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} /></label>
            {!editingProduct && <label className="form-field admin-image-field"><span>Product image</span><span className="file-input-wrap"><ImagePlus size={15} /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setForm((value) => ({ ...value, image: event.target.files?.[0] || null }))} /><small>{form.image?.name || 'Choose JPG, PNG, or WEBP'}</small></span></label>}
          </div>
          <div className="admin-form-actions"><Button type="button" variant="outline" onClick={beginCreate}>Clear</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingProduct ? 'Save changes' : 'Create product'}</Button></div>
        </form>
      )}

      {loading ? <div className="route-loading admin-loading">Loading {section}...</div> : section === 'orders' ? (
        <section className="admin-table-wrap" aria-label="All customer orders">
          {orders.length ? <table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Action</th></tr></thead><tbody>
            {orders.map((order) => <tr key={order.id}><td className="admin-order-id">#{String(order.id).padStart(5, '0')}</td><td><div className="admin-customer-cell"><strong>{order.customer?.name || `Customer #${order.user_id}`}</strong>{order.customer?.email && <small>{order.customer.email}</small>}{order.shipping_address && <small>Ship to {order.shipping_address.address_line}, {order.shipping_address.city}</small>}</div></td><td>{order.items?.map((item) => `${item.quantity} × ${item.product_name || `Product #${item.product_id}`}`).join(', ') || 'No items'}</td><td>{formatPrice(order.total_amount)}</td><td><Badge className={`admin-status ${order.status?.toLowerCase()}`}>{order.status}</Badge></td><td>{new Date(order.created_at).toLocaleDateString()}</td><td>{order.status === 'Pending' ? <div className="admin-order-actions"><Button className="complete-order-button" variant="outline" size="sm" disabled={busyOrder === order.id} onClick={() => completeOrder(order)}><CheckCircle2 size={13} /> {busyOrder === order.id ? 'Updating...' : 'Complete'}</Button><Button variant="outline" size="sm" disabled={busyOrder === order.id} onClick={() => cancelOrder(order)}>{busyOrder === order.id ? 'Updating...' : 'Cancel'}</Button></div> : <span className="admin-muted">—</span>}</td></tr>)}
          </tbody></table> : <div className="admin-empty">There are no orders yet.</div>}
        </section>
      ) : (
        <section className="admin-table-wrap" aria-label="Product catalog management">
          {products.length ? <table className="admin-table"><thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Owner</th><th>Actions</th></tr></thead><tbody>
            {products.map((product) => <tr key={product.id}><td><div className="admin-product-cell"><ProductImage product={product} className="admin-product-thumbnail" /><div><strong>{product.name}</strong><small>{product.description || 'No description'}</small></div></div></td><td>{formatPrice(product.price)}</td><td>{product.stock}</td><td>#{product.owner_id}</td><td><div className="admin-row-actions"><Button variant="outline" size="sm" aria-label={`Edit ${product.name}`} title="Edit product" onClick={() => beginEdit(product)}><Pencil size={14} /></Button><Button variant="outline" size="sm" aria-label={`Delete ${product.name}`} title="Delete product" onClick={() => deleteProduct(product)}><Trash2 size={14} /></Button></div></td></tr>)}
          </tbody></table> : <div className="admin-empty">No products in the catalog yet.</div>}
        </section>
      )}
    </main>
  )
}