const store = new Map<string, string>()

const asyncStorage = {
  async getItem(key: string): Promise<string | null> {
    return store.has(key) ? (store.get(key) ?? null) : null
  },
  async setItem(key: string, value: string): Promise<void> {
    store.set(key, value)
  },
  async removeItem(key: string): Promise<void> {
    store.delete(key)
  },
  async clear(): Promise<void> {
    store.clear()
  },
  async key(index: number): Promise<string | null> {
    return Array.from(store.keys())[index] ?? null
  },
  get length(): number {
    return store.size
  },
}

export default asyncStorage
