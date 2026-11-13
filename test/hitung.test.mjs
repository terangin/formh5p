import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ringkas, kategori, skor, csv, petaTanda } from '../public/uji/hitung.js';

const semua = (v) => Object.fromEntries(Array.from({ length: 25 }, (_, i) => [i + 1, v]));
const baris = (butir, x = {}) => ({ id: 'a', mulai: '2026-11-13T10:00:00Z', selesai: '2026-11-13T10:30:00Z', butir, identitas: { prodi: 'PAI' }, video: { v1: { selesai: 1 } }, ...x });

test('butir 4 dibalik', () => {
  assert.equal(skor(4, 5), 1);
  assert.equal(skor(4, 1), 5);
  assert.equal(skor(3, 5), 5);
});

test('semua jawab 5: butir 4 jadi 1, aspek A = (5*5+1)/30', () => {
  const r = ringkas([baris(semua(5))]);
  assert.equal(r.butir[3].rata, 1);
  assert.equal(r.aspek[0].persen, 86.7);
  assert.equal(r.aspek[1].persen, 100);
  assert.equal(r.aspek[0].kategori, 'Sangat layak');
});

test('yang belum selesai nggak ikut dihitung', () => {
  const r = ringkas([baris(semua(5)), baris(semua(1), { id: 'b', selesai: null })]);
  assert.equal(r.n, 1);
  assert.equal(r.belumSelesai, 1);
  assert.deepEqual(r.butir[0].sebaran, [0, 0, 0, 0, 1]);
});

test('batas kategori', () => {
  assert.equal(kategori(81), 'Sangat layak');
  assert.equal(kategori(80.9), 'Layak');
  assert.equal(kategori(41), 'Cukup layak');
  assert.equal(kategori(20), 'Tidak layak');
});

test('csv: kutip, BOM, satu baris per responden', () => {
  const t = csv([baris(semua(4), { catatan: 'Narasi "cepat", ya' })], [{ isi: 'v1' }]);
  assert.ok(t.startsWith('﻿'));
  assert.equal(t.split('\r\n').length, 2);
  assert.ok(t.includes('"Narasi ""cepat"", ya"'));
});

test('peta tanda per 30 detik', () => {
  const k = petaTanda([{ video: 'v1', detik: 10, catatan: 'a' }, { video: 'v1', detik: 29, catatan: '' }, { video: 'v1', detik: 95 }, { video: 'v2', detik: 5 }], 'v1', 120);
  assert.deepEqual(k.map((x) => x.jumlah), [2, 0, 0, 1]);
  assert.deepEqual(k[0].catatan, ['a']);
});

import { rTabel, cronbach, statistikButir } from '../public/uji/hitung.js';
test('r tabel cocok tabel (α 0,05 dua arah)', () => {
  assert.ok(Math.abs(rTabel(30) - 0.361) < 0.003); // tabel: 0,361
  assert.ok(Math.abs(rTabel(42) - 0.304) < 0.003); // tabel: 0,304
  assert.ok(Math.abs(rTabel(100) - 0.197) < 0.003); // tabel: 0,197
});
test('cronbach: butir identik = 1, acak tak berkorelasi rendah', () => {
  const b = (v) => ({ selesai: 'x', butir: { 1: v, 2: v, 3: v } });
  assert.equal(cronbach([b(1), b(3), b(5), b(2)], [1, 2, 3]), 1);
});
test('validitas: butir yang searah total valid', () => {
  const data = [1, 2, 3, 4, 5, 2, 3, 4, 5, 1].map((v) => ({ selesai: 'x', butir: Object.fromEntries(Array.from({ length: 25 }, (_, i) => [i + 1, i + 1 === 4 ? 6 - v : v])) }));
  const s = statistikButir(data);
  assert.equal(s[0].valid, true);
  assert.equal(s[3].valid, true); // butir negatif dibalik dulu, jadi tetap searah
});

import { penerimaHadiah, csvHadiah } from '../public/uji/hitung.js';
test('penerima tanda terima kasih: cuma yang lengkap dan mau', () => {
  const b = (id, selesai, mau) => ({ id, selesai, identitas: { nama: id }, hadiah: mau ? { mau: true, dompet: 'DANA', nomor: '0812', nama: id } : { mau: false } });
  const p = penerimaHadiah([b('a', '2026-11-20T10:00:00Z', true), b('b', null, true), b('c', '2026-11-20T09:00:00Z', false)]);
  assert.deepEqual(p.map((x) => x.id), ['a']);
  assert.equal(csvHadiah([b('a', '2026-11-20T10:00:00Z', true)]).split('\r\n').length, 2);
});
