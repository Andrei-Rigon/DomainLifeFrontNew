const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

// Token da API (header X-API-Key). Em desenvolvimento o proxy do Vite já injeta a chave
// (veja vite.config.ts), então esta variável só é necessária quando VITE_API_URL aponta
// direto para a API. Atenção: variáveis VITE_* ficam visíveis no JavaScript do navegador.
const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  return API_KEY ? { 'X-API-Key': API_KEY } : {};
}

async function toApiError(response: Response, path: string): Promise<ApiError> {
  const body = await response.json().catch(() => null);
  const message = body?.message ?? `Erro ${response.status} ao chamar ${path}`;
  return new ApiError(response.status, Array.isArray(message) ? message.join(', ') : message);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
  });

  if (!response.ok) {
    throw await toApiError(response, path);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Monta ?a=1&b=2 ignorando valores vazios. */
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** Baixa um arquivo da API (com o token) e abre o "salvar como" do navegador. */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const response = await fetch(`${BASE_URL}${path}`, { headers: authHeaders() });
  if (!response.ok) throw await toApiError(response, path);

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
