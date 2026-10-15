# Product Requirement Document - TARGET

## Metadata

| Item | Isi |
|---|---|
| Aplikasi | TARGET (Tugas, Atur, Rencanakan, Garap, Eksekusi, Tuntaskan) |
| Pengguna | Mahasiswa |
| Tujuan | Mengelola tugas kuliah |
| Platform | Web (desktop dan smartphone) |

## Masalah

Mahasiswa mudah lupa deadline dan bingung memilih tugas mana yang dikerjakan lebih dulu. Setelah itu, sulit menjaga fokus saat mengerjakannya.

## 7 Fitur Inti

1. Tambah tugas
2. Edit tugas
3. Hapus tugas
4. Tandai selesai
5. Filter data
6. Sortir deadline
7. Simpan otomatis (localStorage)

## Fitur Tambahan (Versi 2)

- Matriks Eisenhower (penting dan mendesak)
- Timer Pomodoro dengan pilihan tugas dan pencatatan sesi
- Landing page dengan deadline terdekat dan statistik
- Jadwal ujian (Kuis, UTS, UAS) dengan hitung mundur
- Statistik mingguan dan streak belajar
- Pengingat deadline lewat notifikasi browser
- Bisa dipasang sebagai aplikasi (PWA) dan dibuka offline
- Mode gelap dan terang
- Timer Pomodoro tetap berjalan saat pindah halaman
- Login Google (Firebase Authentication)
- Database cloud (Firestore) agar data bisa diakses dari perangkat mana pun

## Halaman

| Halaman | Tujuan |
|---|---|
| Beranda | Memperkenalkan aplikasi dan menunjukkan ringkasan |
| Tugas | Mengelola dan memprioritaskan tugas |
| Pomodoro | Fokus mengerjakan tugas |
| Statistik | Melihat waktu fokus dan streak |

## Versi 1 (MVP)

- Tambah, edit, hapus tugas
- Status selesai
- localStorage
- Tampilan responsive

## Di Luar Cakupan

Server buatan sendiri, notifikasi push saat aplikasi tertutup, dan kolaborasi antar pengguna.

## Kriteria Berhasil

- Semua fitur berjalan tanpa error di browser.
- Data tetap ada setelah halaman di-refresh.
- Tampilan nyaman di layar 360 px.
- Aplikasi bisa diakses lewat URL Vercel.
- Setelah login Google, tugas tetap muncul di perangkat lain.
- Pengguna A tidak bisa melihat data pengguna B.
- Statistik 7 hari dan streak sesuai dengan sesi yang tercatat.
- Situs bisa dipasang ke layar utama dan halaman utama tetap terbuka saat offline.
- Tampilan gelap terbaca jelas di semua halaman.
- Timer yang sedang berjalan tidak mengulang dari awal saat pindah halaman.
