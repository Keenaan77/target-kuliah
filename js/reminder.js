"use strict";

/*
  reminder.js
  Pengingat deadline lewat notifikasi browser (Notification API).

  PENTING: pengingat hanya muncul saat TARGET sedang terbuka (tab browser atau
  aplikasi yang sudah dipasang). Notifikasi saat aplikasi tertutup butuh server
  push (misalnya Firebase Cloud Messaging), yang belum ada di project ini.

  Aturan: tugas yang belum selesai dan deadline-nya besok, hari ini, atau
  sudah lewat akan diingatkan, MAKSIMAL SEKALI per tugas per hari.
*/
const Reminder = {
  KEY: "target.reminder.v1",
  LABELS: { kuis: "Kuis", uts: "UTS", uas: "UAS" },

  state() {
    const s = Store.read(this.KEY, null);
    return s && typeof s === "object" ? { enabled: !!s.enabled, sent: s.sent || {} } : { enabled: false, sent: {} };
  },

  save(state) {
    Store.write(this.KEY, state);
  },

  supported() {
    return "Notification" in window;
  },

  // Aktif = browser mengizinkan DAN pengguna menyalakannya
  enabled() {
    return this.supported() && Notification.permission === "granted" && this.state().enabled;
  },

  async enable() {
    if (!this.supported()) return "unsupported";
    let permission = Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();
    if (permission !== "granted") return permission; // "denied" atau tetap "default"

    const state = this.state();
    state.enabled = true;
    this.save(state);
    await this.notify("Pengingat aktif", "Kamu akan diingatkan saat deadline mendekat.", "test");
    this.check();
    return "granted";
  },

  disable() {
    const state = this.state();
    state.enabled = false;
    this.save(state);
  },

  // Tampilkan notifikasi. Di HP, notifikasi harus lewat service worker.
  async notify(title, body, tag) {
    if (!this.supported() || Notification.permission !== "granted") return;
    const options = { body, tag, icon: "/icons/icon-192.png" };
    try {
      const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
      if (reg) return await reg.showNotification(title, options);
    } catch (err) { /* lanjut ke cara biasa */ }
    try { new Notification(title, options); } catch (err) { /* tidak didukung */ }
  },

  // Cek tugas dan kirim pengingat yang belum dikirim hari ini
  check() {
    if (!this.enabled()) return;

    const today = Utils.todayISO();
    const state = this.state();

    // Buang catatan hari-hari sebelumnya supaya data tidak menumpuk
    const sent = {};
    Object.keys(state.sent).forEach((key) => { if (key.endsWith(":" + today)) sent[key] = true; });

    const items = [];
    Store.getTasks().forEach((task) => {
      if (task.done) return;
      const diff = Utils.daysUntil(task.deadline);
      if (diff > 1) return;
      const key = `${task.id}:${today}`;
      if (sent[key]) return;

      const kind = this.LABELS[task.type] || "Tugas";
      let text;
      if (diff < 0) text = `${kind} terlambat: ${task.title}`;
      else if (diff === 0) text = `${kind} hari ini: ${task.title}`;
      else text = `${kind} besok: ${task.title}`;
      items.push({ key, text });
    });

    if (!items.length) return;

    if (items.length <= 3) {
      items.forEach((item) => this.notify("Pengingat TARGET", item.text, item.key));
    } else {
      this.notify("Pengingat TARGET", `${items.length} tugas butuh perhatian hari ini.`, "summary:" + today);
    }

    items.forEach((item) => { sent[item.key] = true; });
    state.sent = sent;
    this.save(state);
  },

  // Menghubungkan tombol di halaman Tugas (kalau ada)
  initButton() {
    const btn = document.getElementById("reminder-btn");
    const note = document.getElementById("reminder-note");
    if (!btn) return;

    const refresh = () => {
      if (!this.supported()) {
        btn.disabled = true;
        btn.textContent = "Pengingat tidak didukung";
        return;
      }
      const on = this.enabled();
      btn.textContent = on ? "Pengingat: hidup" : "Pengingat: mati";
      btn.setAttribute("aria-pressed", String(on));
      if (note) {
        note.textContent = Notification.permission === "denied"
          ? "Notifikasi diblokir di browser. Klik ikon gembok di address bar, lalu izinkan notifikasi."
          : "Pengingat muncul saat TARGET sedang terbuka (tab browser atau aplikasi terpasang).";
      }
    };

    btn.addEventListener("click", async () => {
      if (this.enabled()) this.disable();
      else await this.enable();
      refresh();
    });
    refresh();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  Reminder.initButton();
  Reminder.check();
  setInterval(() => Reminder.check(), 10 * 60 * 1000); // cek ulang tiap 10 menit
});

// Setelah data cloud datang, daftar tugas bisa berubah: cek lagi
Store.onSync(() => Reminder.check());
