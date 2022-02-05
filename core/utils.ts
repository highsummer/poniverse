export function intersect<T>(a: Set<T>, b: Set<T>) {
  const result = new Set(a)
  a.forEach(x => {
    if (!b.has(x)) {
      result.delete(x)
    }
  })

  return result
}