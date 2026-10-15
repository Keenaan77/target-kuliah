"use strict";

/*
  pomodoro.js
  Tampilan halaman Pomodoro: menggambar angka, lingkaran, dan tombol.
  Logika timernya ada di timer.js (dipakai semua halaman), sehingga timer
  tidak mengulang dari awal saat kamu pindah halaman lalu kembali.
*/

const CIRCUMFERENCE = 553; // harus sama dengan stroke-dasharray di CSS

/* ---------- Elemen ---------- */
const timeEl = document.getElementById("time");
const ringEl = document.getElementById("ring");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const skipBtn = document.getElementById("skip-btn");
const modeBtns = document.querySelectorAll("[data-mode]");
const taskSelect = document.getElementById("task-select");
const todayCountEl = document.getElementById("today-count");
const todayMinutesEl = document.getElementById("today-minutes");
const streakEl = document.getElementById("streak");
const inputs = {
  focus: document.getElementById("set-focus"),
  short: document.getElementById("set-short"),
  long: document.getElementById("set-long")
};

/* ---------- Tampilan ---------- */
function render() {
  const s = Timer.state;
  const left = Timer.left();

  timeEl.textContent = Timer.format(left);
  ringEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - left / s.total);
  document.title = `${Timer.format(left)} ${Timer.LABELS[s.mode]} - TARGET`;
  document.body.dataset.mode = s.mode;
  modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === s.mode)));

  // Tombol: Mulai (belum jalan), Jeda (sedang jalan), Lanjut (dijeda di tengah)
  startBtn.textContent = s.running ? "Jeda" : left < s.total ? "Lanjut" : "Mulai";
}

function updateStats() {
  const stats = Store.todayStats();
  todayCountEl.textContent = stats.count;
  todayMinutesEl.textContent = stats.minutes;
  streakEl.textContent = Store.streak();
}

function setStatus(text) {
  statusEl.textContent = text;
}

function statusFor(mode) {
  return mode === "focus" ? "Fokus. Satu hal saja sampai timer berbunyi." : "Istirahat dulu. Jauhi layar sebentar.";
}

/* ---------- Mendengarkan perubahan dari Timer ---------- */
Timer.subscribe((event) => {
  render();
  if (event === "start") setStatus(statusFor(Timer.state.mode));
  if (event === "pause") setStatus("Dijeda.");
  if (event === "finish") setStatus(Timer.message);
  if (event === "finish" || event === "sync") updateStats();
});

/* ---------- Tombol ---------- */
startBtn.addEventListener("click", () => (Timer.state.running ? Timer.pause() : Timer.start()));

resetBtn.addEventListener("click", () => {
  Timer.reset();
  setStatus("Timer di-reset.");
});

skipBtn.addEventListener("click", () => {
  Timer.skip();
  setStatus("Sesi dilewati.");
});

modeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    Timer.setMode(btn.dataset.mode);
    setStatus(`Mode ${Timer.LABELS[btn.dataset.mode].toLowerCase()} dipilih.`);
  });
});

/* ---------- Pengaturan durasi ---------- */
const settings = Timer.settings();

Object.keys(inputs).forEach((key) => {
  inputs[key].value = settings[key];
  inputs[key].addEventListener("change", () => {
    const max = Number(inputs[key].max);
    const value = Math.min(max, Math.max(1, parseInt(inputs[key].value, 10) || settings[key]));
    inputs[key].value = value;
    settings[key] = value;
    Store.write(Timer.SETTINGS_KEY, settings);
    Timer.applySettings(key);
  });
});

/* ---------- Pilihan tugas ---------- */
function fillTaskSelect() {
  const selected = Timer.state.taskId;
  taskSelect.replaceChildren();
  const none = Utils.el("option", "", "Tanpa tugas tertentu");
  none.value = "";
  taskSelect.appendChild(none);

  Store.getTasks()
    .filter((t) => !t.done)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .forEach((t) => {
      const opt = Utils.el("option", "", t.title);
      opt.value = t.id;
      taskSelect.appendChild(opt);
    });

  // Kalau tugas yang tersimpan sudah dihapus atau selesai, value otomatis kembali ke ""
  taskSelect.value = selected;
}

taskSelect.addEventListener("change", () => Timer.setTask(taskSelect.value));

/* ---------- Mulai ---------- */
fillTaskSelect();
updateStats();
render();

// Status awal: sesuaikan dengan kondisi timer yang dipulihkan dari halaman sebelumnya
if (Timer.message) setStatus(Timer.message);                  // habis saat kamu di halaman lain
else if (Timer.state.running) setStatus(statusFor(Timer.state.mode));
else if (Timer.left() < Timer.state.total) setStatus("Dijeda.");

// Setelah data cloud datang: segarkan pilihan tugas dan statistik (timer tidak diganggu)
Store.onSync(() => {
  fillTaskSelect();
  updateStats();
});
