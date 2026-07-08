export interface IKVStore {
  /**
   * Retrieves a value by key.
   */
  get<T = any>(key: string): Promise<T | null>;

  /**
   * Stores a value by key, with an optional expiration time (in seconds).
   */
  put<T = any>(key: string, value: T, options?: { expirationTtl?: number }): Promise<void>;

  /**
   * Deletes a value by key.
   */
  delete(key: string): Promise<void>;

  /**
   * Lists keys, optionally filtered by a prefix.
   */
  list(prefix?: string): Promise<string[]>;
}
