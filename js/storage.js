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

  // course disimpan langsung di sesi, jadi statistik tetap benar walau tugasnya dihapus
  addSession(minutes, taskId, course) {
    const sessions = this.getSessions();
    sessions.push({ date: Utils.todayISO(), minutes, taskId: taskId || null, course: course || "" });
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

  // Streak = jumlah hari berturut-turut yang punya minimal 1 sesi fokus.
  // Kalau hari ini belum ada sesi, hitungan mulai dari kemarin
  // (streak belum putus sampai hari ini berakhir).
  streak() {
    const days = new Set(this.getSessions().map((s) => s.date));
    const d = new Date();
    if (!days.has(Utils.toISO(d))) d.setDate(d.getDate() - 1);
    let count = 0;
    while (days.has(Utils.toISO(d))) {
      count += 1;
      d.setDate(d.getDate() - 1);
    }
    return count;
  },

  // Ringkasan 7 hari terakhir (6 hari lalu sampai hari ini)
  weekStats() {
    const names = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const sessions = this.getSessions();
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = Utils.toISO(d);
      const list = sessions.filter((s) => s.date === iso);
      days.push({
        date: iso,
        label: names[d.getDay()],
        minutes: list.reduce((sum, s) => sum + s.minutes, 0),
        count: list.length,
        isToday: i === 0
      });
    }

    // Total menit per mata kuliah dalam 7 hari itu
    const inWeek = new Set(days.map((d) => d.date));
    const perCourse = {};
    sessions.filter((s) => inWeek.has(s.date)).forEach((s) => {
      const name = s.course || "Tanpa mata kuliah";
      perCourse[name] = (perCourse[name] || 0) + s.minutes;
    });

    return {
      days,
      total: days.reduce((sum, d) => sum + d.minutes, 0),
      count: days.reduce((sum, d) => sum + d.count, 0),
      byCourse: Object.entries(perCourse)
        .map(([course, minutes]) => ({ course, minutes }))
        .sort((a, b) => b.minutes - a.minutes)
    };
  },

  totalMinutes() {
    return this.getSessions().reduce((sum, s) => sum + s.minutes, 0);
  }
};
