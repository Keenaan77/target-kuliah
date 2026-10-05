"use strict";

/*
  tugas.js
  Logika halaman Tugas: CRUD, filter, sortir, dan matriks Eisenhower.
  Alurnya: ubah data (tasks) -> simpan -> render() ulang tampilan.
*/

/* ---------- Ambil elemen HTML ---------- */
const form = document.getElementById("task-form");
const idInput = document.getElementById("task-id");
const titleInput = document.getElementById("title");
const typeInput = document.getElementById("type");
const courseInput = document.getElementById("course");
const deadlineInput = document.getElementById("deadline");
const importantInput = document.getElementById("important");
const urgentInput = document.getElementById("urgent");
const errorEl = document.getElementById("error");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const formTitle = document.getElementById("form-title");
const listEl = document.getElementById("task-list");
const matrixEl = document.getElementById("matrix");
const emptyEl = document.getElementById("empty");
const summaryEl = document.getElementById("summary");
const sortEl = document.getElementById("sort");
const filterBtns = document.querySelectorAll("[data-filter]");
const viewBtns = document.querySelectorAll("[data-view]");

/* ---------- State (data yang sedang dipakai) ---------- */
let tasks = Store.getTasks();
let currentFilter = "all";
let currentView = "list";

/* Label jenis ujian (jenis "tugas" tidak diberi label) */
const EXAM_LABELS = { kuis: "Kuis", uts: "UTS", uas: "UAS" };

/* Empat kotak matriks Eisenhower */
const QUADRANTS = [
  { id: "do",   title: "Kerjakan sekarang", hint: "Penting dan mendesak",           important: true,  urgent: true  },
  { id: "plan", title: "Jadwalkan",         hint: "Penting, belum mendesak",        important: true,  urgent: false },
  { id: "fast", title: "Selesaikan cepat",  hint: "Mendesak, kurang penting",       important: false, urgent: true  },
  { id: "skip", title: "Tunda dulu",        hint: "Tidak penting dan tidak mendesak", important: false, urgent: false }
];

/* ---------- Simpan ---------- */
function persist() {
  if (!Store.saveTasks(tasks)) {
    showError("Data tidak bisa disimpan. Cek pengaturan privasi browser kamu.");
  }
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

/* ---------- Form: tambah & edit ---------- */
form.addEventListener("submit", (event) => {
  event.preventDefault(); // cegah halaman reload

  const data = {
    title: titleInput.value.trim(),
    type: typeInput.value,
    course: courseInput.value.trim(),
    deadline: deadlineInput.value,
    important: importantInput.checked,
    urgent: urgentInput.checked
  };

  // Validasi input
  if (!data.title) return showError("Nama tugas wajib diisi.");
  if (!data.deadline) return showError("Pilih tanggal deadline.");
  showError("");

  const editingId = idInput.value;
  if (editingId) {
    const task = tasks.find((t) => t.id === editingId);
    if (task) Object.assign(task, data);
  } else {
    tasks.push({ id: Utils.uid(), done: false, ...data });
  }

  persist();
  resetForm();
  render();
});

cancelBtn.addEventListener("click", resetForm);

function startEdit(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  idInput.value = task.id;
  titleInput.value = task.title;
  typeInput.value = task.type || "tugas";
  courseInput.value = task.course;
  deadlineInput.value = task.deadline;
  importantInput.checked = !!task.important;
  urgentInput.checked = !!task.urgent;
  formTitle.textContent = "Edit tugas";
  submitBtn.textContent = "Simpan perubahan";
  cancelBtn.hidden = false;
  showError("");
  titleInput.focus();
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetForm() {
  form.reset();
  idInput.value = "";
  formTitle.textContent = "Tambah tugas";
  submitBtn.textContent = "Tambah tugas";
  cancelBtn.hidden = true;
  showError("");
}

/* ---------- Aksi: selesai & hapus ---------- */
function toggleDone(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.done = !task.done;
  persist();
  render();
}

function deleteTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task || !confirm(`Hapus tugas "${task.title}"?`)) return;
  tasks = tasks.filter((t) => t.id !== id);
  if (idInput.value === id) resetForm();
  persist();
  render();
}

/* ---------- Filter, sortir, tampilan ---------- */
filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;
    filterBtns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    render();
  });
});

viewBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentView = btn.dataset.view;
    viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    render();
  });
});

sortEl.addEventListener("change", render);

function getVisibleTasks() {
  const dir = sortEl.value === "desc" ? -1 : 1;
  return tasks
    .filter((t) => {
      if (currentFilter === "active") return !t.done;
      if (currentFilter === "done") return t.done;
      if (currentFilter === "exam") return (t.type || "tugas") !== "tugas";
      return true;
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline) * dir);
}

/* ---------- Render ---------- */
function render() {
  const visible = getVisibleTasks();

  listEl.replaceChildren();
  matrixEl.replaceChildren();

  if (currentView === "list") {
    visible.forEach((t) => listEl.appendChild(createTaskItem(t)));
  } else {
    renderMatrix(visible);
  }

  listEl.hidden = currentView !== "list";
  matrixEl.hidden = currentView !== "matrix" || visible.length === 0;

  const messages = {
    all: "Belum ada tugas. Isi form untuk menambahkan tugas pertama.",
    active: "Tidak ada tugas yang belum selesai.",
    done: "Belum ada tugas yang selesai.",
    exam: "Belum ada jadwal ujian. Pilih jenis Kuis, UTS, atau UAS saat menambah tugas."
  };
  emptyEl.textContent = messages[currentFilter];
  emptyEl.hidden = visible.length > 0;

  const remaining = tasks.filter((t) => !t.done).length;
  summaryEl.textContent = tasks.length
    ? `${remaining} dari ${tasks.length} tugas belum selesai.`
    : "Catat tugas kuliahmu, lalu tentukan mana yang dikerjakan duluan.";
}

function renderMatrix(visible) {
  QUADRANTS.forEach((q) => {
    // Tugas masuk kotak sesuai tanda penting/mendesak yang dicentang
    const items = visible.filter((t) => !!t.important === q.important && !!t.urgent === q.urgent);

    const box = Utils.el("section", `quad quad-${q.id}`);
    const head = Utils.el("header");
    head.append(Utils.el("h3", "", q.title), Utils.el("p", "", q.hint));
    box.appendChild(head);

    if (items.length) {
      const ul = Utils.el("ul", "task-list");
      ul.style.border = "0";
      items.forEach((t) => ul.appendChild(createTaskItem(t)));
      box.appendChild(ul);
    } else {
      box.appendChild(Utils.el("p", "none", "Kosong."));
    }
    matrixEl.appendChild(box);
  });
}

function createTaskItem(task) {
  const li = Utils.el("li", "task" + (task.done ? " done" : ""));

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.done;
  checkbox.setAttribute("aria-label", `Tandai selesai: ${task.title}`);
  checkbox.addEventListener("change", () => toggleDone(task.id));

  const body = Utils.el("div", "task-body");
  body.appendChild(Utils.el("div", "task-title", task.title));

  const meta = Utils.el("div", "task-meta");

  const type = task.type || "tugas";
  if (type !== "tugas") meta.appendChild(Utils.el("span", "tag tag-exam", EXAM_LABELS[type] || type));

  // Penanda deadline hanya untuk yang belum selesai.
  // Ujian selalu menampilkan hitung mundur, tugas biasa hanya saat sudah dekat.
  if (!task.done) {
    const diff = Utils.daysUntil(task.deadline);
    if (diff < 0) meta.appendChild(Utils.el("span", "tag tag-late", "Terlambat"));
    else if (type !== "tugas" || diff <= 2) {
      meta.appendChild(Utils.el("span", "tag tag-soon", diff === 0 ? "Hari ini" : `${diff} hari lagi`));
    }
  }
  if (task.important) meta.appendChild(Utils.el("span", "tag tag-imp", "Penting"));
  if (task.urgent) meta.appendChild(Utils.el("span", "tag", "Mendesak"));

  const course = task.course ? `${task.course} • ` : "";
  meta.appendChild(document.createTextNode(` ${course}${Utils.formatDate(task.deadline)}`));
  body.appendChild(meta);

  const actions = Utils.el("div", "task-actions");
  const editBtn = Utils.el("button", "link-btn", "Edit");
  editBtn.type = "button";
  editBtn.addEventListener("click", () => startEdit(task.id));
  const delBtn = Utils.el("button", "link-btn danger", "Hapus");
  delBtn.type = "button";
  delBtn.addEventListener("click", () => deleteTask(task.id));
  actions.append(editBtn, delBtn);

  li.append(checkbox, body, actions);
  return li;
}

render();

// Setelah data cloud selesai diambil (misalnya habis login), muat ulang daftar
Store.onSync(() => {
  tasks = Store.getTasks();
  render();
});
