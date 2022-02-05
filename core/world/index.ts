export interface Time {
  total: number,
  delta: number,
}

export interface RefCell<T> {
  value: T
}

export function ref<T>(x: T): RefCell<T> {
  return {
    value: x
  }
}

export interface Disposable {
  onDelete: () => void
}
