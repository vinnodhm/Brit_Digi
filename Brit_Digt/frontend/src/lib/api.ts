import { Product, CreateOrderPayload, GeneratePdfPayload } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error ?? `API error ${res.status}`);
  }

  return data.data as T;
}

// Products
export const fetchProducts = (): Promise<Product[]> =>
  apiFetch<Product[]>('/products');

export const fetchProduct = (id: string): Promise<Product> =>
  apiFetch<Product>(`/products/${id}`);

// Orders
export const createOrder = (payload: CreateOrderPayload) =>
  apiFetch<{ orderId: string; totalPrice: number; status: string }>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// PDF Generation
export const generatePdf = (payload: GeneratePdfPayload) =>
  apiFetch<{ pdfUrl: string; filename: string; message: string }>('/generate-pdf', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
