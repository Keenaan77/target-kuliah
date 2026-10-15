"use strict";

/*
  dev-server.js
  Server kecil untuk mencoba TARGET di laptop dengan alamat bersih
  (/tugas, /pomodoro, /statistik), persis seperti di Vercel.

  Kenapa perlu? Live Server tidak mengerti alamat tanpa ".html". Server ini
  meniru aturan "cleanUrls" dari vercel.json:
    /tugas        -> membuka tugas.html
    /tugas.html   -> dialihkan (redirect) ke /tugas
    /             -> membuka index.html

  Cara pakai (butuh Node.js, tanpa instal apa pun):
    node dev-server.js          lalu buka http://localhost:3000
    node dev-server.js 4000     kalau port 3000 sedang dipakai

  Hentikan dengan Ctrl + C. Ini hanya alat untuk di laptop, Vercel tidak memakainya.
*/
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.argv[2]) || 3000;

// Jenis file -> Content-Type yang dikirim ke browser
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".md": "text/plain; charset=utf-8"
};

const server = http.createServer((req, res) => {
  let pathname = decodeURIComponent(req.url.split("?")[0]);

  // Alamat ".html" dialihkan ke versi bersihnya (sama seperti Vercel)
  if (pathname.endsWith(".html")) {
    const clean = pathname.replace(/index\.html$/, "").replace(/\.html$/, "") || "/";
    res.writeHead(308, { Location: clean });
    return res.end();
  }

  // Tentukan file yang dibuka
  if (pathname.endsWith("/")) pathname += "index.html";
  else if (!path.extname(pathname)) pathname += ".html";

  // Keamanan: jangan izinkan keluar dari folder project (../)
  const file = path.join(ROOT, path.normalize(pathname));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("404 - Halaman tidak ditemukan");
    }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store" // perubahan kode langsung terlihat saat refresh
    });
    res.end(data);
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(`Port ${PORT} sedang dipakai. Coba port lain: node dev-server.js ${PORT + 1}`);
  } else {
    console.log("Server gagal jalan:", err.message);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log("TARGET berjalan di:");
  console.log(`  http://localhost:${PORT}`);
  console.log("Tekan Ctrl + C untuk berhenti.");
});
