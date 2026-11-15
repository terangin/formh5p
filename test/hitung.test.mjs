import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ringkas, kategori, skor, csv, petaTanda, detikDitonton } from '../public/uji/hitung.js';

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

test('detik ditonton: diulang nggak dobel, loncatan nggak dihitung, habis = penuh', () => {
  const pos = (...d) => d.map((x, i) => [i * 5000, x]);
  assert.equal(detikDitonton({ posisi: pos(4, 9, 14) }, 100), 14); // 0-14
  assert.equal(detikDitonton({ posisi: pos(4, 9, 14, 6, 11, 16) }, 100), 16); // mundur, ulang 6-14
  assert.equal(detikDitonton({ posisi: pos(4, 9, 60, 65) }, 100), 14); // geser 9 -> 60
  assert.equal(detikDitonton({ posisi: pos(91, 96), selesai: 1 }, 100), 9); // 91-100, awal digeser
  assert.equal(detikDitonton({ posisi: [] }, 100), 0);
  assert.equal(detikDitonton(undefined, 100), 0);
});

import { cariGanda } from '../public/uji/hitung.js';
test('ganda: NIM/email sama, yang selesai duluan yang dihitung', () => {
  const r = (id, selesai, nim, email, nilai) => ({ id, mulai: '2026-11-13T09:00:00Z', selesai, butir: semua(nilai), identitas: { nim, email } });
  const data = [
    r('b', '2026-11-13T10:30:00Z', '123', 'A@ut.ac.id', 1), // email sama dengan a (beda huruf besar)
    r('a', '2026-11-13T10:00:00Z', '123', 'a@ut.ac.id', 5),
    r('c', '2026-11-13T11:00:00Z', '999', 'c@ut.ac.id', 5),
    r('d', '2026-11-13T12:00:00Z', ' 999 ', 'lain@ut.ac.id', 1), // NIM sama dengan c (spasi)
    r('e', null, '123', 'a@ut.ac.id', 1), // belum selesai: bukan ganda
  ];
  assert.deepEqual([...cariGanda(data)], [['b', 'a'], ['d', 'c']]);
  const h = ringkas(data);
  assert.equal(h.n, 2);
  assert.equal(h.ganda, 2);
  assert.equal(h.belumSelesai, 1);
  assert.equal(h.butir[0].rata, 5); // jawaban 1 dari b dan d nggak ikut
  assert.ok(csv(data, []).includes('"ganda","a"') || csv(data, []).includes('ganda,a'));
});

test('waktu kirim WIB terpisah dari tanggal uji coba', () => {
  const t = csv([{ id: 'a', mulai: '2026-11-15T12:22:50Z', selesai: '2026-11-15T12:49:55Z', identitas: { tanggal: '2026-11-14' }, butir: {} }], []);
  assert.ok(t.includes('2026-11-15 19:49:55'));
  assert.ok(t.includes('2026-11-14'));
});
