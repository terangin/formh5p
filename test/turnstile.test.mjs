import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cekTurnstile } from '../src/turnstile.js';

const env = { TURNSTILE_SECRET: 'rahasia', TURNSTILE_HOSTNAMES: 'nyalain.kitaterangin.id' };
const balas = (isi, status = 200) => async () => new Response(JSON.stringify(isi), { status });
const sah = { success: true, action: 'mulai-uji', hostname: 'nyalain.kitaterangin.id' };

test('lolos cuma kalau success, action, dan hostname cocok', async () => {
  assert.equal((await cekTurnstile('tok', env, '1.2.3.4', 'mulai-uji', balas(sah))).ok, true);
  assert.equal((await cekTurnstile('tok', env, null, 'mulai-uji', balas({ ...sah, action: 'lain' }))).alasan, 'action');
  assert.equal((await cekTurnstile('tok', env, null, 'mulai-uji', balas({ ...sah, hostname: 'localhost' }))).alasan, 'hostname');
  assert.equal((await cekTurnstile('tok', env, null, 'mulai-uji', balas({ success: false, 'error-codes': ['timeout-or-duplicate'] }))).alasan, 'timeout-or-duplicate');
});

test('gagal = tutup', async () => {
  assert.equal((await cekTurnstile('', env, null, 'mulai-uji', balas(sah))).ok, false);
  assert.equal((await cekTurnstile('tok', { ...env, TURNSTILE_SECRET: '' }, null, 'mulai-uji', balas(sah))).ok, false);
  assert.equal((await cekTurnstile('tok', { ...env, TURNSTILE_HOSTNAMES: '' }, null, 'mulai-uji', balas(sah))).ok, false);
  assert.equal((await cekTurnstile('tok', env, null, 'mulai-uji', balas(sah, 500))).alasan, 'siteverify');
  assert.equal((await cekTurnstile('tok', env, null, 'mulai-uji', async () => { throw new Error('putus'); })).alasan, 'siteverify');
});
