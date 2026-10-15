"use strict";

/*
  timer.js
  Inti timer Pomodoro, dimuat di SEMUA halaman.

  Kenapa dipisah dari pomodoro.js? Setiap pindah halaman, browser memuat ulang
  seluruh JavaScript dari nol, jadi variabel di dalam pomodoro.js ikut hilang
  dan timer mengulang dari awal. Solusinya: status timer disimpan di
  localStorage, dan setiap halaman memulihkannya saat dibuka.

  Yang disimpan adalah WAKTU SELESAI (endTime), bukan sisa detik. Jadi saat
  kamu kembali ke halaman Pomodoro, sisa waktu tinggal dihitung ulang:
  endTime dikurangi waktu sekarang.

  Kalau timer habis saat kamu sedang di halaman lain, sesi tetap dicatat dan
  notifikasi tetap dikirim oleh file ini.
*/
const Timer = {
  KEY: "target.timer.v1",
  SETTINGS_KEY: "studytask.pomodoro.settings",
  LABELS: { focus: "Fokus", short: "Istirahat", long: "Istirahat panjang" },

  state: null,       // { mode, running, endTime, remaining, total, cycle, taskId }
  listeners: [],     // fungsi yang dipanggil saat timer berubah
  intervalId: null,
  message: "",       // pesan terakhir saat sesi selesai

  /* ----- Pengaturan dan status dasar ----- */
  settings() {
    return Object.assign({ focus: 25, short: 5, long: 15 }, Store.read(this.SETTINGS_KEY, {}));
  },

  // Status awal untuk satu mode (timer belum jalan)
  fresh(mode, cycle, taskId) {
    const total = this.settings()[mode] * 60;
    return { mode, running: false, endTime: 0, remaining: total, total, cycle: cycle || 0, taskId: taskId || "" };
  },

  init() {
    this.state = this.restore();
    if (this.state.running) {
      if (Date.now() >= this.state.endTime) this.finish(); // habis saat kamu di halaman lain
      else this.run();
    }
    // Kalau timer diubah dari tab lain, ikuti
    window.addEventListener("storage", (event) => {
      if (event.key !== this.KEY) return;
      this.state = this.restore();
      clearInterval(this.intervalId);
      this.intervalId = null;
      if (this.state.running) this.run();
      this.emit("sync");
    });
  },

  // Baca status dari localStorage, dan buang kalau isinya tidak valid
  restore() {
    const saved = Store.read(this.KEY, null);
    const ok = saved && this.LABELS[saved.mode] && Number.isFinite(saved.remaining) && Number.isFinite(saved.total) && saved.total > 0;
    return ok ? Object.assign(this.fresh("focus"), saved) : this.fresh("focus");
  },

  save() {
    Store.write(this.KEY, this.state);
  },

  subscribe(callback) {
    this.listeners.push(callback);
  },

  emit(event) {
    this.listeners.forEach((cb) => cb(event));
  },

  /* ----- Membaca sisa waktu ----- */
  left() {
    const s = this.state;
    return s.running ? Math.max(0, Math.round((s.endTime - Date.now()) / 1000)) : s.remaining;
  },

  format(totalSeconds) {
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const s = String(totalSeconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  },

  /* ----- Kontrol ----- */
  start() {
    if (this.state.running) return;
    this.state.running = true;
    this.state.endTime = Date.now() + this.state.remaining * 1000;
    this.save();
    this.run();
    this.emit("start");
  },

  pause() {
    if (!this.state.running) return;
    this.state.remaining = this.left();
    this.state.running = false;
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.save();
    this.emit("pause");
  },

  setMode(mode) {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.state = this.fresh(mode, this.state.cycle, this.state.taskId);
    this.save();
    this.emit("mode");
  },

  reset() {
    this.setMode(this.state.mode);
  },

  // Lewati tidak mencatat sesi, hanya pindah ke mode berikutnya
  skip() {
    this.setMode(this.state.mode === "focus" ? "short" : "focus");
  },

  setTask(taskId) {
    this.state.taskId = taskId || "";
    this.save();
  },

  // Dipanggil saat durasi diubah di pengaturan
  applySettings(changedMode) {
    if (!this.state.running && changedMode === this.state.mode) this.setMode(this.state.mode);
  },

  /* ----- Berjalan dan selesai ----- */
  run() {
    clearInterval(this.intervalId);
    this.intervalId = setInterval(() => this.tick(), 250);
    this.tick();
  },

  tick() {
    if (!this.state.running) return;
    if (this.left() <= 0) this.finish();
    else this.emit("tick");
  },

  finish() {
    // Tab lain mungkin sudah menangani ini. Cek dulu supaya sesi tidak tercatat dobel.
    const stored = Store.read(this.KEY, null);
    if (stored && (!stored.running || stored.endTime !== this.state.endTime)) {
      this.state = this.restore();
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.emit("sync");
      return;
    }

    clearInterval(this.intervalId);
    this.intervalId = null;

    const s = this.state;
    const wasFocus = s.mode === "focus";
    let cycle = s.cycle;

    if (wasFocus) {
      const task = Store.getTasks().find((t) => t.id === s.taskId);
      Store.addSession(Math.round(s.total / 60), s.taskId, task ? task.course : "");
      cycle += 1;
    }

    // Setiap 4 sesi fokus berturut-turut: istirahat panjang
    const next = wasFocus ? (cycle % 4 === 0 ? "long" : "short") : "focus";
    this.state = this.fresh(next, cycle, s.taskId);
    this.save();

    this.message = wasFocus
      ? `Sesi fokus selesai. Waktunya ${this.LABELS[next].toLowerCase()}.`
      : "Istirahat selesai. Siap fokus lagi?";

    this.beep();
    if (typeof Reminder !== "undefined" && Reminder.enabled()) {
      Reminder.notify(wasFocus ? "Sesi fokus selesai" : "Istirahat selesai", wasFocus ? "Waktunya istirahat sebentar." : "Siap fokus lagi?", "pomodoro");
    }
    this.emit("finish");
  },

  // Bunyi "bip" sederhana lewat Web Audio API (tanpa file audio)
  beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25, 0.5].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime + delay;
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
      });
    } catch (err) {
      /* browser memblokir audio sebelum ada interaksi: abaikan */
    }
  },

  /* ----- Penanda kecil di navigasi (halaman selain Pomodoro) ----- */
  renderChip() {
    const el = document.getElementById("mini-timer");
    if (!el) return;
    // Di halaman Pomodoro sudah ada timer besar
    if (document.getElementById("time")) { el.hidden = true; return; }

    const s = this.state;
    const idle = !s.running && s.remaining === s.total;
    el.hidden = idle;
    if (idle) return;
    el.dataset.mode = s.mode;
    el.textContent = `${this.LABELS[s.mode]} ${this.format(this.left())}${s.running ? "" : " (jeda)"}`;
  }
};

Timer.init();
Timer.subscribe(() => Timer.renderChip());
document.addEventListener("DOMContentLoaded", () => Timer.renderChip());
