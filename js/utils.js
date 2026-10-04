"use strict";

/*
  utils.js
  Fungsi-fungsi kecil yang dipakai di banyak halaman.
  Dimuat PERTAMA di setiap halaman supaya bisa dipakai file JS lain.
*/
const Utils = {
  // Tanggal hari ini dalam format "YYYY-MM-DD" (sama dengan format <input type="date">)
  todayISO() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  },

  // Selisih hari dari hari ini ke tanggal tertentu. Negatif = sudah lewat.
  daysUntil(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const target = new Date(y, m - 1, d);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((target - today) / 86400000);
  },

  // "2026-10-12" -> "Sen, 12 Okt 2026"
  formatDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
      weekday: "short", day: "numeric", month: "short", year: "numeric"
    });
  },

  // ID unik sederhana untuk setiap tugas
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  // Membuat elemen HTML dengan class dan teks (aman dari injeksi HTML)
  el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
};
