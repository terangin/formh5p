import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periksa, MAKS_BYTE } from '../src/simpan.js';

const sah = { id: '3f2b6c1e-8a4d-4e2f-9b1c-0d5e6f7a8b9c', form: 'ut-tp', mulai: '2026-11-13T10:00:00.000Z', diubah: '2026-11-13T10:05:00.000Z', persetujuan: '2026-11-13T10:00:05.000Z' };
const cek = (o) => periksa(JSON.stringify(o));

test('kiriman sah lolos, data disimpan utuh', () => {
  const r = cek(sah);
  assert.equal(r.ok, true);
  assert.equal(r.baris.selesai, null);
  assert.deepEqual(JSON.parse(r.baris.data), sah);
});

test('yang ditolak', () => {
  assert.equal(cek({ ...sah, id: '1' }).galat, 'id');
  assert.equal(cek({ ...sah, form: 'lain' }).galat, 'form');
  assert.equal(cek({ ...sah, mulai: 'kemarin' }).galat, 'waktu');
  assert.equal(cek({ ...sah, selesai: 'besok' }).galat, 'selesai');
  assert.equal(cek({ ...sah, persetujuan: null }).galat, 'belum setuju');
  assert.equal(periksa('[1]').galat, 'bukan objek');
  assert.equal(periksa('{').galat, 'bukan json');
  assert.equal(periksa('x'.repeat(MAKS_BYTE + 1)).galat, 'kebesaran');
});
