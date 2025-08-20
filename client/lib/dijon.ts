// client/lib/dijon.ts
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'https://ai-support-bot.onrender.com';

export async function sendToDijon(userId: string, message: string) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000); // 15s client timeout

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API ${res.status} ${res.statusText}${text ? `: ${text}` : ''}`);
    }

    const data = await res.json().catch(() => null);
    if (!data || typeof data.reply !== 'string') {
      throw new Error('Malformed API response: missing "reply"');
    }
    return data.reply;
  } catch (err: any) {
    const msg = err?.name === 'AbortError'
      ? 'Request timed out. Please try again.'
      : (err?.message ?? 'Network error');
    throw new Error(msg);
  } finally {
    clearTimeout(t);
  }
}
