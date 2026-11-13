// Siteverify Turnstile. Gagal apa pun (jaringan, bukan JSON, action/hostname beda) = ditolak.
export async function cekTurnstile(token, env, ip, aksi, ambil = fetch) {
  const host = new Set((env.TURNSTILE_HOSTNAMES || '').split(',').map((h) => h.trim()).filter(Boolean));
  if (typeof token !== 'string' || !token || token.length > 2048 || !host.size || !env.TURNSTILE_SECRET) return { ok: false, alasan: 'input' };
  let h;
  try {
    const r = await ambil('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, ...(ip ? { remoteip: ip } : {}) }),
    });
    if (!r.ok) throw new Error(`siteverify ${r.status}`);
    h = await r.json();
  } catch {
    return { ok: false, alasan: 'siteverify' };
  }
  if (h.success !== true) return { ok: false, alasan: (h['error-codes'] || []).join(',') || 'gagal' };
  if (h.action !== aksi) return { ok: false, alasan: 'action' };
  if (!host.has(h.hostname)) return { ok: false, alasan: 'hostname' };
  return { ok: true };
}
