"use strict";

/*
  landing.js
  Mengisi lembar "Deadline terdekat" dan angka statistik di beranda
  dengan data asli dari localStorage.
*/
function renderLanding() {
  const listEl = document.getElementById("sheet-list");
  const noteEl = document.getElementById("sheet-note");

  listEl.replaceChildren(); // kosongkan dulu supaya tidak dobel saat dirender ulang

  const tasks = Store.getTasks();
  const open = tasks.filter((t) => !t.done);

  // ----- Statistik -----
  document.getElementById("stat-open").textContent = open.length;
  document.getElementById("stat-today").textContent = Store.todayStats().count;
  document.getElementById("stat-minutes").textContent = Store.totalMinutes();

  // ----- Lembar catatan -----
  // Kalau belum ada tugas, tampilkan contoh supaya lembar tidak kosong.
  const sample = [
    { title: "Laporan praktikum Basis Data", deadline: null, label: "contoh" },
    { title: "Rangkuman bab 4 Statistika", deadline: null, label: "contoh" },
    { title: "Presentasi kelompok PKN", deadline: null, label: "contoh" }
  ];

  const upcoming = open
    .slice()
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 4);

  const rows = upcoming.length ? upcoming : sample;

  rows.forEach((task) => {
    const li = Utils.el("li");
    li.appendChild(Utils.el("span", "box"));
    li.appendChild(Utils.el("span", "t", task.title));

    let text = task.label;
    let late = false;
    if (task.deadline) {
      const diff = Utils.daysUntil(task.deadline);
      late = diff < 0;
      if (diff < 0) text = "terlambat";
      else if (diff === 0) text = "hari ini";
      else text = `${diff} hari lagi`;
    }
    li.appendChild(Utils.el("span", "d" + (late ? " late" : ""), text));
    listEl.appendChild(li);
  });

  noteEl.textContent = upcoming.length
    ? ""
    : "Ini contoh. Tugasmu akan muncul di sini.";
}

renderLanding();
Store.onSync(renderLanding);
