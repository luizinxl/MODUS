const PLUGGY_BASE = 'https://api.pluggy.ai';

let cachedApiKey: string | null = null;
let cachedApiKeyExpiresAt = 0;

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, baseDelayMs = 500): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      if (typeof status === 'number' && status >= 400 && status < 500) throw err;
      if (attempt < maxAttempts) {
        const jitter = 1 + (Math.random() * 0.2 - 0.1);
        const delay = baseDelayMs * Math.pow(2, attempt - 1) * jitter;
        console.warn(`[pluggy] tentativa ${attempt}/${maxAttempts} falhou, retry em ${Math.round(delay)}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

export async function getPluggyApiKey(): Promise<string> {
  const now = Date.now();
  if (cachedApiKey && now < cachedApiKeyExpiresAt - 60_000) {
    return cachedApiKey;
  }

  const clientId = Deno.env.get('PLUGGY_CLIENT_ID');
  const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('PLUGGY_CLIENT_ID/SECRET nao configurados nos secrets do Supabase');
  }

  return withRetry(async () => {
    const res = await fetch(`${PLUGGY_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
    });
    if (!res.ok) {
      const err: Error & { status?: number } = new Error(
        `Falha ao autenticar na Pluggy: ${res.status}`
      );
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    cachedApiKey = data.apiKey as string;
    // token da Pluggy dura ~1h — renova aos 30 min para segurança
    cachedApiKeyExpiresAt = now + 30 * 60 * 1000;
    return cachedApiKey!;
  });
}

export async function pluggyFetch(
  path: string,
  apiKey: string,
  init: RequestInit = {},
): Promise<Record<string, unknown>> {
  return withRetry(async () => {
    const res = await fetch(`${PLUGGY_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      const err: Error & { status?: number } = new Error(
        `Pluggy ${path} erro ${res.status}: ${body}`
      );
      err.status = res.status;
      throw err;
    }
    return res.json();
  });
}

/** Busca todas as paginas de um endpoint paginado do Pluggy */
export async function pluggyFetchAll(
  path: string,
  apiKey: string,
  pageSize = 500,
): Promise<Record<string, unknown>[]> {
  const allResults: Record<string, unknown>[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const sep = path.includes('?') ? '&' : '?';
    const data = await pluggyFetch(`${path}${sep}pageSize=${pageSize}&page=${page}`, apiKey);
    const results = (data.results as Record<string, unknown>[]) ?? [];
    allResults.push(...results);
    totalPages = (data.totalPages as number) ?? 1;
    page++;
  }

  return allResults;
}

export { PLUGGY_BASE };
