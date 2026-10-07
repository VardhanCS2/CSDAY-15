export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user' | string
}

export interface Session {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  stock: number
  image_url: string | null
  owner_id: number
  created_at: string
}

export interface CartItem {
  product_id: number
  name: string
  description: string | null
  price: number
  quantity: number
  total_price: number
}

export interface ShippingAddress {
  full_name: string
  email: string
  phone: string
  address_line: string
  city: string
  postal_code: string
  country: string
}

export interface OrderItem {
  id: number
  product_id: number
  product_name?: string
  quantity: number
  price: number
}

export interface Order {
  id: number
  user_id: number
  customer?: Pick<User, 'name' | 'email'> | null
  total_amount: number
  status: 'Pending' | 'Completed' | 'Cancelled' | string
  created_at: string
  shipping_address?: ShippingAddress | null
  items: OrderItem[]
}

export interface Paginated<T> {
  page: number
  limit: number
  total: number
  items: T[]
}

export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

export interface ProductFilters {
  search?: string
  min_price?: string
  max_price?: string
  stock_available?: boolean
}
