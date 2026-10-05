"use strict";

/*
  sw.js (Service Worker)
  Skrip yang berjalan di belakang layar dan bisa mencegat permintaan file.
  Dipakai untuk:
  1. Mode offline: file situs disimpan di cache browser.
  2. Menampilkan notifikasi pengingat (lihat js/reminder.js).

  Strategi cache: NETWORK-FIRST. Selalu coba ambil versi terbaru dari internet,
  dan baru pakai cache kalau sedang offline. Jadi setelah deploy ke Vercel,
  pengguna tidak terjebak di versi lama.

  Alamat halaman ditulis tanpa .html ("/tugas") karena vercel.json memakai
  cleanUrls. Kalau alamat .html dicache, Vercel akan mengalihkannya (redirect)
  dan browser menolak memakai respons redirect untuk membuka halaman.

  Kalau kamu menambah file baru, masukkan ke daftar ASSETS di bawah.
*/
const CACHE = "target-v1";

const ASSETS = [
  "/", "/tugas", "/pomodoro", "/statistik",
  "/css/base.css", "/css/landing.css", "/css/tugas.css", "/css/pomodoro.css", "/css/statistik.css",
  "/js/theme.js", "/js/firebase-config.js", "/js/utils.js", "/js/storage.js", "/js/auth.js",
  "/js/reminder.js", "/js/pwa.js", "/js/landing.js", "/js/tugas.js", "/js/pomodoro.js", "/js/statistik.js",
  "/favicon.png", "/favicon.ico", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"
];

// Saat pertama dipasang: simpan semua file dasar ke cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // Satu per satu: kalau ada 1 file gagal diambil, yang lain tetap tersimpan
      .then((cache) => Promise.all(ASSETS.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

// Saat aktif: hapus cache versi lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Setiap ada permintaan file: internet dulu, cache sebagai cadangan
self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Hanya file dari situs sendiri. Firebase dan Google Fonts dibiarkan lewat.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("/")))
  );
});

// Klik notifikasi: buka (atau fokus ke) aplikasi
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("/tugas");
    })
  );
});
