export interface AuthProvider {
  getAccessToken(): Promise<string | null>;
  requireAccessToken(): Promise<string>;
  onAuthRequired(): void;
}

export interface StorageProvider {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
