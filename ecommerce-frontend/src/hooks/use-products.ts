import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { api, responseData } from '@/api/client'
import type { Paginated, Product, ProductFilters } from '@/types/models'

const PAGE_SIZE = 12

export function useProducts(filters: ProductFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['products', filters],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const response = await api.get('/products/', {
        params: { ...filters, page: pageParam, limit: PAGE_SIZE },
      })
      return responseData<Paginated<Product>>(response)
    },
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined,
  })
}

export function useProduct(productId: string | undefined) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => responseData<Product>(await api.get(`/products/${productId}`)),
    enabled: Boolean(productId),
  })
}