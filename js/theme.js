"use strict";

/*
  theme.js
  Mode terang/gelap. Dimuat di <head> supaya tema terpasang SEBELUM halaman
  digambar (kalau tidak, layar akan berkedip putih dulu).

  Cara kerja: atribut data-theme="dark" di <html> mengaktifkan variabel warna
  gelap di css/base.css. Pilihan pengguna disimpan di localStorage.
*/
(function () {
  const KEY = "target.theme";

  function preferred() {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (err) { /* abaikan */ }
    if (saved === "dark" || saved === "light") return saved;
    // Belum pernah memilih: ikuti pengaturan perangkat
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0e1322" : "#004aad");
    const btn = document.getElementById("theme-btn");
    if (btn) {
      btn.textContent = theme === "dark" ? "Terang" : "Gelap";
      btn.setAttribute("aria-label", theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap");
    }
  }

  apply(preferred()); // langsung, sebelum halaman tampil

  document.addEventListener("DOMContentLoaded", () => {
    apply(document.documentElement.dataset.theme); // sinkronkan tombol dan meta
    const btn = document.getElementById("theme-btn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      try { localStorage.setItem(KEY, next); } catch (err) { /* abaikan */ }
      apply(next);
    });
  });
})();
