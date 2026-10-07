import { useEffect, useState, type RefObject } from 'react'

interface ObserverOptions {
  root?: Element | Document | null
  rootMargin?: string
  threshold?: number | number[]
}

export function useIntersectionObserver(targetRef: RefObject<Element | null>, options: ObserverOptions = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const { root, rootMargin, threshold } = options

  useEffect(() => {
    const target = targetRef.current
    if (!target || !('IntersectionObserver' in window)) return undefined

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, { root, rootMargin, threshold })
    observer.observe(target)
    return () => observer.disconnect()
  }, [targetRef, root, rootMargin, threshold])

  return isIntersecting
}