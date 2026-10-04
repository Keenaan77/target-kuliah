"use strict";

/*
  auth.js
  Login dan logout dengan akun Google lewat Firebase Authentication,
  plus tampilan tombol di navigasi.

  Alurnya:
  1. Halaman dibuka -> Auth.init() menyalakan Firebase.
  2. Firebase memberi tahu apakah ada user yang login (onAuthStateChanged).
  3. Kalau ada, Store mengambil data dari cloud (lihat storage.js).
*/
const Auth = {
  user: null,
  configured: false,

  init() {
    // Aplikasi hanya memakai Firebase kalau library termuat DAN config sudah diisi
    this.configured =
      typeof firebase !== "undefined" &&
      typeof FIREBASE_CONFIG !== "undefined" &&
      !String(FIREBASE_CONFIG.apiKey).startsWith("ISI_");

    this.renderBox();
    if (!this.configured) return;

    firebase.initializeApp(FIREBASE_CONFIG);
    firebase.auth().onAuthStateChanged(async (user) => {
      this.user = user;
      this.renderBox();
      await Store.setUser(user); // ambil data cloud (kalau login), lalu render ulang halaman
    });
  },

  async signIn() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await firebase.auth().signInWithPopup(provider);
    } catch (err) {
      // Pengguna menutup popup bukan error yang perlu ditampilkan
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") return;
      const hints = {
        "auth/unauthorized-domain": "Domain ini belum didaftarkan di Firebase (Authentication > Settings > Authorized domains).",
        "auth/popup-blocked": "Popup diblokir browser. Izinkan popup untuk situs ini lalu coba lagi."
      };
      alert("Login gagal. " + (hints[err.code] || err.message));
    }
  },

  async signOut() {
    await firebase.auth().signOut();
    Store.clearLocal(); // hapus cache supaya data akun ini tidak terbaca orang berikutnya
    location.reload();
  },

  // Menggambar area login di navigasi (<div id="auth-box">)
  renderBox() {
    const box = document.getElementById("auth-box");
    if (!box) return;
    box.replaceChildren();

    if (!this.configured) {
      box.appendChild(Utils.el("span", "auth-note", "Mode lokal"));
      return;
    }

    if (this.user) {
      if (this.user.photoURL) {
        const img = document.createElement("img");
        img.className = "auth-photo";
        img.src = this.user.photoURL;
        img.alt = "";
        img.referrerPolicy = "no-referrer"; // foto Google kadang gagal tampil tanpa ini
        box.appendChild(img);
      }
      const firstName = (this.user.displayName || this.user.email || "Pengguna").split(" ")[0];
      box.appendChild(Utils.el("span", "auth-name", firstName));
      const out = Utils.el("button", "btn btn-sm", "Keluar");
      out.type = "button";
      out.addEventListener("click", () => this.signOut());
      box.appendChild(out);
    } else {
      const btn = Utils.el("button", "btn btn-sm btn-hl", "Masuk dengan Google");
      btn.type = "button";
      btn.addEventListener("click", () => this.signIn());
      box.appendChild(btn);
    }
  }
};

// Tunggu sampai semua script halaman selesai dimuat, baru nyalakan Firebase
document.addEventListener("DOMContentLoaded", () => Auth.init());
