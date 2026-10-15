# Setup Login Google dan Database Cloud (Firebase)

Backend TARGET memakai **Firebase** milik Google: Authentication untuk login Google dan Firestore sebagai database cloud. Gratis untuk skala project kuliah (paket Spark) dan tidak perlu server sendiri.

Selama langkah ini belum dikerjakan, aplikasi tetap jalan dalam **mode lokal** (tanpa login), dan di navigasi tampil tulisan "Mode lokal".

## 1. Buat project Firebase

1. Buka **console.firebase.google.com**, login dengan akun Google.
2. Klik **Create a project** (atau *Add project*), beri nama misalnya `target-kuliah`.
3. Google Analytics boleh dimatikan, lalu klik **Create project**.

## 2. Daftarkan aplikasi web

1. Di halaman project, klik ikon web **`</>`**.
2. Isi nama aplikasi (misal `target-web`). **Jangan** centang Firebase Hosting, karena hosting-nya pakai Vercel.
3. Klik **Register app**. Muncul kode berisi `firebaseConfig`. Salin nilai `apiKey`, `authDomain`, `projectId`, dan `appId`.
4. Buka `js/firebase-config.js` di VS Code, lalu ganti semua nilai `ISI_...` dengan nilai tadi:

```js
const FIREBASE_CONFIG = {
  apiKey: "AIza....",
  authDomain: "target-kuliah.firebaseapp.com",
  projectId: "target-kuliah",
  appId: "1:1234567890:web:abcdef"
};
```

> Config ini aman di-commit ke GitHub. Berbeda dengan API key rahasia, config web Firebase memang tampil di sisi browser. Keamanan datanya dijaga oleh **Rules** (langkah 4) dan **Authorized domains** (langkah 5).

## 3. Aktifkan login Google

1. Menu kiri: **Build → Authentication → Get started**.
2. Tab **Sign-in method**, pilih **Google**, lalu **Enable**.
3. Pilih *Project support email* (email kamu), lalu **Save**.

## 4. Buat database Firestore dan pasang Rules

1. Menu kiri: **Build → Firestore Database → Create database**.
2. Pilih lokasi (misalnya `asia-southeast2` Jakarta), lalu pilih **Start in production mode**, kemudian **Create**.
3. Buka tab **Rules**, hapus isinya, tempel isi file `firestore.rules` dari project ini, lalu klik **Publish**.

Rules ini memastikan setiap pengguna hanya bisa membaca dan menulis data miliknya sendiri.

## 5. Daftarkan domain yang boleh login

1. **Authentication → Settings → Authorized domains → Add domain**.
2. Tambahkan:
   - `127.0.0.1` (untuk Live Server di laptop)
   - domain Vercel kamu, misalnya `target-kuliah.vercel.app`
3. `localhost` biasanya sudah ada.

Tanpa langkah ini, tombol login akan menampilkan error `auth/unauthorized-domain`.

## 6. Coba di laptop

1. Jalankan lewat **Live Server** (klik kanan `index.html` → *Open with Live Server*). Login **tidak bisa** dari file yang dibuka langsung (`file://`).
2. Klik **Masuk dengan Google**, pilih akun, lalu tambah satu tugas.
3. Cek di Firebase Console → Firestore Database → koleksi `users`. Harus muncul satu dokumen berisi tugasmu.
4. Buka di browser lain atau perangkat lain, login dengan akun yang sama, dan tugas yang sama akan muncul.

## 7. Deploy

Push ke GitHub seperti biasa. Vercel otomatis deploy ulang.

```bash
git add .
git commit -m "day 3: tambah login google dan database cloud"
git push
```

Pastikan domain Vercel sudah ditambahkan di langkah 5.

## Troubleshooting

| Masalah | Solusi |
|---|---|
| Tulisan "Mode lokal" masih muncul | `js/firebase-config.js` belum diisi (masih ada `ISI_`), atau file belum tersimpan. |
| `auth/unauthorized-domain` | Tambahkan domain ke Authorized domains (langkah 5). |
| Popup login tidak muncul | Izinkan popup di browser, atau buka lewat Live Server, bukan `file://`. |
| `Missing or insufficient permissions` di Console | Rules belum dipublish, atau Firestore belum dibuat (langkah 4). |
| Tugas tidak muncul di perangkat lain | Pastikan login dengan akun Google yang sama, lalu refresh. |
| Tombol login tidak ada sama sekali | Cek Console (`F12`). Kalau script Firebase gagal dimuat, periksa koneksi internet. |

## Cara kerja sinkronisasi

- Data tersimpan di dua tempat: `localStorage` (cepat, selalu tersedia) dan Firestore (cloud, kalau login).
- Saat halaman dibuka dan sudah login, data cloud diambil dan menggantikan data lokal.
- Saat login pertama kali dengan akun baru, tugas yang sudah kamu buat sebagai tamu otomatis diunggah.
- Kalau akun sudah punya data di cloud, tugas dari cloud yang dipakai dan tugas tamu di browser itu tidak digabung. Pengecualian: sesi fokus digabung, jadi tidak ada sesi yang hilang.
- Saat **Keluar**, data lokal dihapus supaya tidak terbaca orang lain yang memakai perangkat yang sama.

## Batasan

- Satu akun menyimpan semua data dalam satu dokumen Firestore (batas 1 MB). Cukup untuk ribuan tugas, tapi bukan untuk pemakaian skala besar.
- Kalau dua perangkat mengedit bersamaan, perubahan terakhir yang menang.
