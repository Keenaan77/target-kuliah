"use strict";

/*
  statistik.js
  Menghitung dan menggambar statistik 7 hari terakhir dari data sesi Pomodoro.
  Perhitungannya ada di Store.weekStats() dan Store.streak() (storage.js),
  file ini hanya menampilkannya.
*/
const barsEl = document.getElementById("bars");
const coursesEl = document.getElementById("courses");

function render() {
  const week = Store.weekStats();

  document.getElementById("st-streak").textContent = Store.streak();
  document.getElementById("st-total").textContent = week.total;
  document.getElementById("st-avg").textContent = Math.round(week.total / 7);
  document.getElementById("st-count").textContent = week.count;

  renderBars(week);
  renderCourses(week);
}

function renderBars(week) {
  barsEl.replaceChildren();
  const empty = week.total === 0;
  document.getElementById("chart-empty").hidden = !empty;
  barsEl.hidden = empty;
  if (empty) return;

  // Tinggi batang = menit hari itu dibanding hari terbaik (dalam persen dari 160 px)
  const max = Math.max(...week.days.map((d) => d.minutes));

  week.days.forEach((day) => {
    const col = Utils.el("div", "bar-col");
    col.appendChild(Utils.el("span", "bar-val", day.minutes ? String(day.minutes) : ""));

    const bar = Utils.el("div", "bar" + (day.isToday ? " today" : "") + (day.minutes ? "" : " zero"));
    bar.style.height = `${Math.round((day.minutes / max) * 160)}px`;
    bar.title = `${Utils.formatDate(day.date)}: ${day.minutes} menit, ${day.count} sesi`;
    bar.setAttribute("role", "img");
    bar.setAttribute("aria-label", `${day.label}: ${day.minutes} menit`);
    col.appendChild(bar);

    col.appendChild(Utils.el("span", "bar-label" + (day.isToday ? " today" : ""), day.label));
    barsEl.appendChild(col);
  });
}

function renderCourses(week) {
  coursesEl.replaceChildren();
  const empty = week.byCourse.length === 0;
  document.getElementById("course-empty").hidden = !empty;
  coursesEl.hidden = empty;
  if (empty) return;

  const top = week.byCourse[0].minutes;
  week.byCourse.forEach((item) => {
    const row = Utils.el("li", "course-row");

    const head = Utils.el("div", "top");
    head.append(Utils.el("span", "name", item.course), Utils.el("span", "min", `${item.minutes} menit`));

    const track = Utils.el("div", "track");
    const fill = Utils.el("div", "fill");
    fill.style.width = `${Math.round((item.minutes / top) * 100)}%`;
    track.appendChild(fill);

    row.append(head, track);
    coursesEl.appendChild(row);
  });
}

render();
Store.onSync(render); // data cloud datang setelah login: gambar ulang
