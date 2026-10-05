"use strict";

/*
  pwa.js
  1. Mendaftarkan service worker (sw.js) agar situs bisa dipakai offline.
  2. Menampilkan tombol "Pasang aplikasi" kalau browser mengizinkan.
     (Di iPhone tidak ada tombol ini: pakai Share lalu "Add to Home Screen".)
*/

// Service worker hanya jalan di http(s), bukan di file://
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => console.error("SW gagal:", err));
  });
}

let installPrompt = null;
const installBtn = document.getElementById("install-btn");

// Browser memberi tahu bahwa situs ini bisa dipasang
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();      // tahan dulu, tampilkan lewat tombol kita sendiri
  installPrompt = event;
  if (installBtn) installBtn.hidden = false;
});

if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installBtn.hidden = true;
  });
}

window.addEventListener("appinstalled", () => {
  if (installBtn) installBtn.hidden = true;
});
