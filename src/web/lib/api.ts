export interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field: string; permitted: string; code: string }>;
  warnings?: Array<{ code: string; message: string }>;
  wouldRemove?: unknown[];
  [extra: string]: unknown;
}

export class ApiFailure extends Error {
  constructor(
    readonly status: number,
    readonly error: ApiError,
  ) {
    super(error.message);
  }
}

// The single door to /api. Every screen renders what the server returns and computes no
// derived figure of its own (Constitution II).
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error: ApiError = payload?.error ?? {
      code: 'UNKNOWN',
      message: `Request failed with status ${response.status}.`,
    };
    throw new ApiFailure(response.status, error);
  }

  return payload as T;
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: 'PROJECT_MANAGER' | 'ADMINISTRATOR';
}

export const signIn = (email: string, password: string) =>
  api<SessionUser>('/session', { method: 'POST', body: JSON.stringify({ email, password }) });

export const currentSession = () => api<SessionUser>('/session');

export const signOut = () => api<{ signedOut: boolean }>('/session', { method: 'DELETE' });
