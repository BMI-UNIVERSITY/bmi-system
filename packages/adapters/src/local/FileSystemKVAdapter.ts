import { IKVStore, IHealthCheck } from '@bmi/ports';
import fs from 'fs';
import path from 'path';

export class FileSystemKVAdapter implements IKVStore, IHealthCheck {
  private filePath: string;

  constructor(filePath: string = '.local-kv.json') {
    this.filePath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({}), 'utf-8');
    }
  }

  private loadStore(): Record<string, { value: any; expiresAt?: number }> {
    try {
      const data = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  private saveStore(store: Record<string, { value: any; expiresAt?: number }>) {
    fs.writeFileSync(this.filePath, JSON.stringify(store, null, 2), 'utf-8');
  }

  async get<T = any>(key: string): Promise<T | null> {
    const store = this.loadStore();
    const item = store[key];
    if (!item) return null;
    
    if (item.expiresAt && Date.now() > item.expiresAt) {
      delete store[key];
      this.saveStore(store);
      return null;
    }
    return item.value as T;
  }

  async put<T = any>(key: string, value: T, options?: { expirationTtl?: number }): Promise<void> {
    const store = this.loadStore();
    const expiresAt = options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : undefined;
    store[key] = { value, expiresAt };
    this.saveStore(store);
  }

  async delete(key: string): Promise<void> {
    const store = this.loadStore();
    delete store[key];
    this.saveStore(store);
  }

  async list(prefix?: string): Promise<string[]> {
    const store = this.loadStore();
    const keys = Object.keys(store);
    if (prefix) {
      return keys.filter(k => k.startsWith(prefix));
    }
    return keys;
  }

  async health(): Promise<boolean> {
    return true; // We can read/write the file
  }
}
