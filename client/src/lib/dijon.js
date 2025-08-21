// client/src/lib/dijon.js
const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export async function sendToDijon({ userId, message }) {
  const url = `${API_BASE.replace(/\/+$/, '')}/api/chat`;

  const controller = new AbortController();
  const clientTimeout = setTimeout(() => controller.abort(), 30_000); // keep your 30s client timeout

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId, message }),
      signal: controller.signal,
    });

    // Pull helpful rate-limit headers if present
    const rlLimit = resp.headers.get('ratelimit-limit');
    const rlRemaining = resp.headers.get('ratelimit-remaining');
    const rlReset = resp.headers.get('ratelimit-reset');

    // Success
    if (resp.ok) {
      const data = await resp.json();
      return {
        ok: true,
        reply: data.reply ?? '',
        meta: {
          rateLimit: rlLimit ? Number(rlLimit) : undefined,
          remaining: rlRemaining ? Number(rlRemaining) : undefined,
          resetSeconds: rlReset ? Number(rlReset) : undefined,
          status: resp.status,
        },
      };
    }

    // Friendly handling for common error classes
    let err = '';
    try {
      const data = await resp.json();
      err = data?.detail || data?.error || '';
    } catch {
      err = await resp.text().catch(() => '');
    }

    // 429: Too Many Requests
    if (resp.status === 429) {
      const retryAfter =
        (rlReset && Number(rlReset)) ||
        Number(resp.headers.get('retry-after')) ||
        undefined;
      return {
        ok: false,
        error:
          "You’ve hit the limit. Please wait a bit and try again—I'll be ready.",
        meta: {
          rateLimit: rlLimit ? Number(rlLimit) : undefined,
          remaining: rlRemaining ? Number(rlRemaining) : 0,
          resetSeconds: retryAfter,
          status: resp.status,
        },
      };
    }

    // 504: Timeout
    if (resp.status === 504) {
      return {
        ok: false,
        error:
          "I took too long this time—please try again. If it keeps happening, try a shorter question.",
        meta: { status: resp.status },
      };
    }

    // 502: Upstream AI issue
    if (resp.status === 502) {
      return {
        ok: false,
        error:
          "I hit a snag reaching the AI service. Please try again in a moment.",
        meta: { status: resp.status },
      };
    }

    // Other errors
    return {
      ok: false,
      error: err || 'Something went wrong. Please try again.',
      meta: { status: resp.status },
    };
  } catch (e) {
    if (e.name === 'AbortError') {
      return {
        ok: false,
        error:
          "This is taking longer than usual—please try again. I might have timed out.",
        meta: { aborted: true },
      };
    }
    return {
      ok: false,
      error: 'Network error—please check your connection and try again.',
    };
  } finally {
    clearTimeout(clientTimeout);
  }
}
