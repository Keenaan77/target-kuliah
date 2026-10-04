"use strict";

/*
  storage.js
  Satu-satunya file yang menyimpan dan membaca data.

  Cara kerja (local-first):
  - localStorage = salinan cepat di browser. Halaman selalu membaca dari sini,
    jadi tampil instan dan tetap jalan untuk pengunjung tanpa login.
  - Firestore = database cloud. Kalau user login, setiap perubahan juga dikirim
    ke dokumen  users/{uid}  dan setiap halaman dibuka data cloud diambil dulu.

  Halaman lain tidak perlu tahu soal cloud. Mereka cukup memakai
  Store.getTasks(), Store.saveTasks(), dst, lalu Store.onSync(...) untuk
  render ulang setelah data cloud datang.
*/
const Store = {
  TASKS_KEY: "studytask.tasks.v2",
  SESSIONS_KEY: "studytask.sessions.v1",

  user: null,        // user Firebase yang sedang login (null = tamu)
  listeners: [],     // fungsi yang dipanggil setelah sinkronisasi

  /* ----- localStorage (cache lokal) ----- */
  read(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value === null ? fallback : value;
    } catch (err) {
      return fallback;
    }
  },

  write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  },

  clearLocal() {
    localStorage.removeItem(this.TASKS_KEY);
    localStorage.removeItem(this.SESSIONS_KEY);
  },

  /* ----- Cloud (Firestore) ----- */
  onSync(callback) {
    this.listeners.push(callback);
  },

  notify() {
    this.listeners.forEach((cb) => cb());
  },

  // Dipanggil Auth setiap status login berubah
  async setUser(user) {
    this.user = user;
    if (user) await this.pull();
    this.notify();
  },

  docRef() {
    return firebase.firestore().collection("users").doc(this.user.uid);
  },

  // Ambil data dari cloud ke cache lokal
  async pull() {
    try {
      const snap = await this.docRef().get();
      if (snap.exists) {
        const data = snap.data();
        this.write(this.TASKS_KEY, data.tasks || []);
        this.write(this.SESSIONS_KEY, data.sessions || []);
      } else {
        // Akun baru: unggah data tamu yang sudah ada supaya tidak hilang
        await this.push();
      }
    } catch (err) {
      console.error("Gagal mengambil data cloud:", err);
    }
  },

  // Kirim cache lokal ke cloud (hanya kalau sudah login)
  async push() {
    if (!this.user) return;
    try {
      await this.docRef().set({
        tasks: this.getTasks(),
        sessions: this.getSessions(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error("Gagal menyimpan ke cloud:", err);
    }
  },

  /* ----- Tugas ----- */
  getTasks() {
    const tasks = this.read(this.TASKS_KEY, []);
    return Array.isArray(tasks) ? tasks : [];
  },

  saveTasks(tasks) {
    const ok = this.write(this.TASKS_KEY, tasks);
    this.push();
    return ok;
  },

  /* ----- Sesi pomodoro ----- */
  getSessions() {
    const sessions = this.read(this.SESSIONS_KEY, []);
    return Array.isArray(sessions) ? sessions : [];
  },

  addSession(minutes, taskId) {
    const sessions = this.getSessions();
    sessions.push({ date: Utils.todayISO(), minutes, taskId: taskId || null });
    const ok = this.write(this.SESSIONS_KEY, sessions);
    this.push();
    return ok;
  },

  todayStats() {
    const today = this.getSessions().filter((s) => s.date === Utils.todayISO());
    return {
      count: today.length,
      minutes: today.reduce((sum, s) => sum + s.minutes, 0)
    };
  },

  totalMinutes() {
    return this.getSessions().reduce((sum, s) => sum + s.minutes, 0);
  }
};
