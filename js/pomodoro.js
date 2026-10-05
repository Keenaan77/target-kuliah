"use strict";

/*
  pomodoro.js
  Timer Pomodoro. Poin penting: timer dihitung dari WAKTU SELESAI (endTime),
  bukan dengan mengurangi 1 detik tiap tick. Kalau tab browser sedang di
  background dan interval melambat, waktunya tetap akurat.
*/

const SETTINGS_KEY = "studytask.pomodoro.settings";
const CIRCUMFERENCE = 553; // harus sama dengan stroke-dasharray di CSS

const MODE_LABELS = { focus: "Fokus", short: "Istirahat", long: "Istirahat panjang" };

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
const inputs = {
  focus: document.getElementById("set-focus"),
  short: document.getElementById("set-short"),
  long: document.getElementById("set-long")
};

/* ---------- State ---------- */
let settings = Object.assign({ focus: 25, short: 5, long: 15 }, Store.read(SETTINGS_KEY, {}));
let mode = "focus";
let remaining = settings.focus * 60; // detik tersisa
let running = false;
let endTime = 0;
let timerId = null;
let focusStreak = 0; // jumlah sesi fokus berturut-turut

/* ---------- Tampilan ---------- */
function formatTime(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function updateDisplay() {
  const total = settings[mode] * 60;
  timeEl.textContent = formatTime(remaining);
  ringEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - remaining / total);
  document.title = `${formatTime(remaining)} ${MODE_LABELS[mode]} - TARGET`;
}

function updateStats() {
  const stats = Store.todayStats();
  todayCountEl.textContent = stats.count;
  todayMinutesEl.textContent = stats.minutes;
  document.getElementById("streak").textContent = Store.streak();
}

function setStatus(text) {
  statusEl.textContent = text;
}

/* ---------- Timer ---------- */
function tick() {
  remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
  updateDisplay();
  if (remaining === 0) finishSession();
}

function start() {
  if (running) return;
  running = true;
  endTime = Date.now() + remaining * 1000;
  timerId = setInterval(tick, 250);
  startBtn.textContent = "Jeda";
  setStatus(mode === "focus" ? "Fokus. Satu hal saja sampai timer berbunyi." : "Istirahat dulu. Jauhi layar sebentar.");
}

function pause() {
  if (!running) return;
  running = false;
  clearInterval(timerId);
  tick(); // simpan sisa waktu terbaru
  startBtn.textContent = "Lanjut";
  setStatus("Dijeda.");
}

function setMode(newMode) {
  clearInterval(timerId);
  running = false;
  mode = newMode;
  remaining = settings[mode] * 60;
  document.body.dataset.mode = mode;
  modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  startBtn.textContent = "Mulai";
  updateDisplay();
}

// Dipanggil saat waktu habis
function finishSession() {
  clearInterval(timerId);
  running = false;
  beep();

  // Notifikasi kalau tab sedang di background (hanya jika pengingat dinyalakan)
  if (Reminder.enabled()) {
    Reminder.notify(
      mode === "focus" ? "Sesi fokus selesai" : "Istirahat selesai",
      mode === "focus" ? "Waktunya istirahat sebentar." : "Siap fokus lagi?",
      "pomodoro"
    );
  }

  if (mode === "focus") {
    // Simpan juga nama mata kuliah supaya statistik bisa dikelompokkan
    const chosen = Store.getTasks().find((t) => t.id === taskSelect.value);
    Store.addSession(settings.focus, taskSelect.value, chosen ? chosen.course : "");
    focusStreak += 1;
    updateStats();
    const next = focusStreak % 4 === 0 ? "long" : "short";
    setMode(next);
    setStatus(`Sesi fokus selesai. Waktunya ${MODE_LABELS[next].toLowerCase()}.`);
  } else {
    setMode("focus");
    setStatus("Istirahat selesai. Siap fokus lagi?");
  }
}

// Bunyi "bip" sederhana lewat Web Audio API (tanpa file audio)
function beep() {
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
    /* browser tanpa audio: abaikan */
  }
}

/* ---------- Tombol ---------- */
startBtn.addEventListener("click", () => (running ? pause() : start()));

resetBtn.addEventListener("click", () => {
  setMode(mode);
  setStatus("Timer di-reset.");
});

skipBtn.addEventListener("click", () => {
  // Lewati tidak mencatat sesi, hanya pindah ke mode berikutnya
  setMode(mode === "focus" ? "short" : "focus");
  setStatus("Sesi dilewati.");
});

modeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    setMode(btn.dataset.mode);
    setStatus(`Mode ${MODE_LABELS[mode].toLowerCase()} dipilih.`);
  });
});

/* ---------- Pengaturan durasi ---------- */
Object.keys(inputs).forEach((key) => {
  inputs[key].value = settings[key];
  inputs[key].addEventListener("change", () => {
    const max = Number(inputs[key].max);
    const value = Math.min(max, Math.max(1, parseInt(inputs[key].value, 10) || settings[key]));
    inputs[key].value = value;
    settings[key] = value;
    Store.write(SETTINGS_KEY, settings);
    if (!running && key === mode) setMode(mode);
  });
});

/* ---------- Pilihan tugas ---------- */
function fillTaskSelect() {
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
}

/* ---------- Mulai ---------- */
fillTaskSelect();
updateStats();
setMode("focus");

// Setelah data cloud datang: segarkan pilihan tugas dan statistik (timer tidak diganggu)
Store.onSync(() => {
  const selected = taskSelect.value;
  fillTaskSelect();
  taskSelect.value = selected;
  updateStats();
});
