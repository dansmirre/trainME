const STORAGE_KEY = "flex-periodization-training-log-v1";
const PASSWORD_KEY = "training-log-server-password";
const API_URL = "api.php";
const SESSIONS = ["Тяжелая", "Средняя", "Легкая"];

const plan = {
  "Тяжелая": [
    ["приседания со штангой", ["3*6", "4*4", "5*3", "2-3*20"]],
    ["Армейский жим гантелей", ["3*8", "4*6", "5*4", "2-3*20"]],
    ["Тяга штанги обратным хватом", ["3*6", "4*4", "5*4", "2-3*20"]],
    ["жим лежа на скамье", ["3*6", "4*4", "5*2", "2-3*20"]],
    ["румынская тяга штанга", ["3*6", "4*4", "5*4", "2-3*20"]],
    ["штанга на бицепс", ["3*6", "4*6", "5*3", "2-3*20"]],
  ],
  "Средняя": [
    ["жим ног в платформе", ["3*8", "3*10", "4*12", "2-3*20"]],
    ["тяга штанги в смитте на дельты", ["3*8", "3*10", "4*12", "2-3*20"]],
    ["подтягивания обр хватом", ["3*10", "3*12", "4*12", "2-3*20"]],
    ["жим наклонной скамье в смитте", ["3*8", "3*10", "4*12", "2-3*20"]],
    ["румынская тяга гантели", ["3*8", "3*10", "4*12", "2-3*20"]],
    ["французкий жим", ["3*8", "3*10", "4*12", "2-3*20"]],
  ],
  "Легкая": [
    ["разгибание/сгибание ног в тренажере суперсет", ["2*20", "3*20", "4*15", "2-3*20"]],
    ["отведение рук с нижнего блока", ["2*20", "3*20", "4*15", "2-3*20"]],
    ["тяга вертикального блока к груди/сведение в кроссовере суперсет", ["2*20", "3*20", "4*15", "2-3*20"]],
    ["поднятие ног перекладина", ["2*max", "3*max", "4*max", "2-3*20"]],
    ["протяжка у блока", ["2*20", "3*20", "4*15", "2-3*20"]],
  ],
};

const state = {
  view: "dashboard",
  session: "Тяжелая",
  cycleWeek: 1,
  historyFilter: "all",
  editingId: null,
  entries: loadLocalEntries(),
  serverOnline: false,
  syncing: false,
};

const els = {
  dashboardView: document.querySelector("#dashboardView"),
  entryView: document.querySelector("#entryView"),
  homeBtn: document.querySelector("#homeBtn"),
  inlineHomeBtn: document.querySelector("#inlineHomeBtn"),
  entryTitle: document.querySelector("#entryTitle"),
  openSessionButtons: document.querySelectorAll("[data-open-session]"),
  form: document.querySelector("#entryForm"),
  date: document.querySelector("#date"),
  week: document.querySelector("#week"),
  exercise: document.querySelector("#exercise"),
  plan: document.querySelector("#plan"),
  weight: document.querySelector("#weight"),
  reps: document.querySelector("#reps"),
  rpe: document.querySelector("#rpe"),
  rir: document.querySelector("#rir"),
  notes: document.querySelector("#notes"),
  tabs: document.querySelectorAll(".tab"),
  cycleFilter: document.querySelector("#cycleFilter"),
  planList: document.querySelector("#planList"),
  entriesList: document.querySelector("#entriesList"),
  categoryEntriesList: document.querySelector("#categoryEntriesList"),
  sessionStats: document.querySelector("#sessionStats"),
  segments: document.querySelectorAll(".segment"),
  clearFormBtn: document.querySelector("#clearFormBtn"),
  exportJsonBtn: document.querySelector("#exportJsonBtn"),
  importJsonBtn: document.querySelector("#importJsonBtn"),
  importFile: document.querySelector("#importFile"),
  exportCsvBtn: document.querySelector("#exportCsvBtn"),
  storageStatus: document.querySelector("#storageStatus"),
  metricEntries: document.querySelector("#metricEntries"),
  metricVolume: document.querySelector("#metricVolume"),
  metricRpe: document.querySelector("#metricRpe"),
  metricLast: document.querySelector("#metricLast"),
};

init();

function init() {
  els.date.value = new Date().toISOString().slice(0, 10);
  els.week.value = currentIsoWeek(new Date());
  renderExerciseOptions();
  bindEvents();
  render();
  syncFromServer();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      setStatus("Браузерный режим");
    });
  }
}

function bindEvents() {
  els.homeBtn.addEventListener("click", showDashboard);
  els.inlineHomeBtn.addEventListener("click", showDashboard);

  els.openSessionButtons.forEach((button) => {
    button.addEventListener("click", () => showEntry(button.dataset.openSession));
  });

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.session = tab.dataset.session;
      state.editingId = null;
      renderExerciseOptions();
      render();
    });
  });

  els.segments.forEach((segment) => {
    segment.addEventListener("click", () => {
      state.historyFilter = segment.dataset.filter;
      renderEntries();
      bindEntryButtons(els.entriesList);
    });
  });

  els.cycleFilter.addEventListener("change", () => {
    state.cycleWeek = Number(els.cycleFilter.value);
    updatePlanField();
    renderPlan();
  });

  els.exercise.addEventListener("change", updatePlanField);
  els.form.addEventListener("submit", saveEntry);
  els.clearFormBtn.addEventListener("click", resetForm);
  els.exportJsonBtn.addEventListener("click", exportJson);
  els.importJsonBtn.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", importJson);
  els.exportCsvBtn.addEventListener("click", exportCsv);
}

function showDashboard() {
  state.view = "dashboard";
  state.editingId = null;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showEntry(session) {
  state.view = "entry";
  state.session = session;
  state.editingId = null;
  renderExerciseOptions();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function render() {
  els.dashboardView.classList.toggle("active-view", state.view === "dashboard");
  els.entryView.classList.toggle("active-view", state.view === "entry");
  els.homeBtn.classList.toggle("hidden", state.view === "dashboard");
  els.entryTitle.textContent = `${state.session} тренировка`;

  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.session === state.session));
  els.segments.forEach((segment) =>
    segment.classList.toggle("active", segment.dataset.filter === state.historyFilter),
  );
  els.cycleFilter.value = String(state.cycleWeek);
  updatePlanField();
  renderPlan();
  renderEntries();
  renderCategoryEntries();
  renderSessionStats();
  renderMetrics();
}

function renderExerciseOptions() {
  els.exercise.innerHTML = "";
  for (const [name] of plan[state.session]) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    els.exercise.append(option);
  }
}

function renderPlan() {
  const rows = plan[state.session].map(([exercise, weeks]) => ({
    exercise,
    target: weeks[state.cycleWeek - 1],
  }));

  els.planList.innerHTML = rows
    .map(
      (row) => `
        <article class="plan-item">
          <div>
            <strong>${escapeHtml(row.exercise)}</strong>
            <span>${escapeHtml(state.session)}</span>
          </div>
          <span class="pill">${escapeHtml(row.target)}</span>
        </article>
      `,
    )
    .join("");
}

function renderEntries() {
  const entries = sortedEntries().filter((entry) => state.historyFilter === "all" || entry.session === state.historyFilter);
  els.entriesList.innerHTML = renderEntryCards(entries.slice(0, 8), "dashboard");
}

function renderCategoryEntries() {
  const entries = sortedEntries().filter((entry) => entry.session === state.session);
  els.categoryEntriesList.innerHTML = renderEntryCards(entries, "category");
}

function renderEntryCards(entries, context) {
  if (!entries.length) {
    return `<div class="empty-state">Записей пока нет</div>`;
  }

  return entries
    .map((entry) => {
      const volume = getVolume(entry);
      return `
        <article class="entry-item">
          <div class="entry-main">
            <strong>${escapeHtml(entry.exercise)}</strong>
            <div class="entry-meta">
              <span class="pill ${sessionClass(entry.session)}">${escapeHtml(entry.session)}</span>
              <span>${formatDate(entry.date)}</span>
              <span>неделя ${escapeHtml(entry.week)}</span>
              <span>${escapeHtml(entry.plan)}</span>
              <span>${entry.weight || 0} кг</span>
              <span>${entry.reps || 0} повт.</span>
              <span>${volume} объем</span>
              ${entry.rpe ? `<span>RPE ${escapeHtml(entry.rpe)}</span>` : ""}
              ${entry.rir ? `<span>RIR ${escapeHtml(entry.rir)}</span>` : ""}
            </div>
            ${entry.notes ? `<div class="entry-meta">${escapeHtml(entry.notes)}</div>` : ""}
          </div>
          <div class="entry-actions">
            <button class="small-btn" type="button" data-edit="${entry.id}" data-context="${context}" title="Править" aria-label="Править">✎</button>
            <button class="small-btn" type="button" data-delete="${entry.id}" data-context="${context}" title="Удалить" aria-label="Удалить">×</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function bindEntryButtons(container) {
  container.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => editEntry(button.dataset.edit));
  });
  container.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteEntry(button.dataset.delete));
  });
}

function renderSessionStats() {
  els.sessionStats.innerHTML = SESSIONS.map((session) => {
    const entries = state.entries.filter((entry) => entry.session === session);
    const volume = entries.reduce((sum, entry) => sum + getVolume(entry), 0);
    const last = sortedEntries(entries)[0];
    return `
      <button class="stat-row" type="button" data-open-session="${session}">
        <span class="pill ${sessionClass(session)}">${session}</span>
        <strong>${entries.length}</strong>
        <span>${Math.round(volume)} объем</span>
        <span>${last ? formatShortDate(last.date) : "-"}</span>
      </button>
    `;
  }).join("");

  els.sessionStats.querySelectorAll("[data-open-session]").forEach((button) => {
    button.addEventListener("click", () => showEntry(button.dataset.openSession));
  });

  bindEntryButtons(els.entriesList);
  bindEntryButtons(els.categoryEntriesList);
}

function renderMetrics() {
  const totalVolume = state.entries.reduce((sum, entry) => sum + getVolume(entry), 0);
  const rpeValues = state.entries.map((entry) => Number(entry.rpe)).filter(Boolean);
  const last = sortedEntries()[0];

  els.metricEntries.textContent = String(state.entries.length);
  els.metricVolume.textContent = String(Math.round(totalVolume));
  els.metricRpe.textContent = rpeValues.length
    ? (rpeValues.reduce((sum, value) => sum + value, 0) / rpeValues.length).toFixed(1)
    : "-";
  els.metricLast.textContent = last ? formatShortDate(last.date) : "-";
}

async function saveEntry(event) {
  event.preventDefault();
  const entry = {
    id: state.editingId ?? crypto.randomUUID(),
    date: els.date.value,
    week: els.week.value,
    cycleWeek: state.cycleWeek,
    session: state.session,
    exercise: els.exercise.value,
    plan: els.plan.value,
    weight: numberOrEmpty(els.weight.value),
    reps: numberOrEmpty(els.reps.value),
    rpe: numberOrEmpty(els.rpe.value),
    rir: numberOrEmpty(els.rir.value),
    notes: els.notes.value.trim(),
    createdAt: state.editingId
      ? state.entries.find((item) => item.id === state.editingId)?.createdAt ?? Date.now()
      : Date.now(),
    updatedAt: Date.now(),
  };

  state.entries = state.editingId
    ? state.entries.map((item) => (item.id === state.editingId ? entry : item))
    : [...state.entries, entry];
  state.editingId = null;
  persistLocal();
  resetInputsAfterSave();
  render();
  await syncMutation({ action: "upsert", entry });
}

function editEntry(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;

  state.editingId = id;
  state.session = entry.session;
  state.cycleWeek = Number(entry.cycleWeek) || 1;
  state.view = "entry";
  renderExerciseOptions();

  els.date.value = entry.date;
  els.week.value = entry.week;
  els.exercise.value = entry.exercise;
  els.weight.value = entry.weight;
  els.reps.value = entry.reps;
  els.rpe.value = entry.rpe;
  els.rir.value = entry.rir;
  els.notes.value = entry.notes;
  render();
  els.weight.focus();
}

async function deleteEntry(id) {
  state.entries = state.entries.filter((entry) => entry.id !== id);
  if (state.editingId === id) state.editingId = null;
  persistLocal();
  render();
  await syncMutation({ action: "delete", id });
}

function resetForm() {
  state.editingId = null;
  els.form.reset();
  els.date.value = new Date().toISOString().slice(0, 10);
  els.week.value = currentIsoWeek(new Date());
  renderExerciseOptions();
  render();
}

function resetInputsAfterSave() {
  els.weight.value = "";
  els.reps.value = "";
  els.rpe.value = "";
  els.rir.value = "";
  els.notes.value = "";
}

function updatePlanField() {
  const item = plan[state.session].find(([exercise]) => exercise === els.exercise.value);
  els.plan.value = item ? item[1][state.cycleWeek - 1] : "";
}

async function syncFromServer() {
  setStatus("Синхронизация...");
  try {
    const serverEntries = await fetchServerEntries();
    const merged = mergeEntries(serverEntries, state.entries);
    const serverChanged = JSON.stringify(sortedEntries(serverEntries)) !== JSON.stringify(sortedEntries(merged));
    state.entries = merged;
    state.serverOnline = true;
    persistLocal();
    render();
    if (serverChanged) {
      await syncMutation({ action: "replace", entries: state.entries }, false);
    }
    setStatus("Сервер подключен");
  } catch (error) {
    state.serverOnline = false;
    setStatus("Оффлайн: локальная копия");
  }
}

async function syncMutation(payload, renderAfter = true) {
  try {
    const result = await requestApi({
      method: "POST",
      body: JSON.stringify(payload),
    });
    state.entries = result.entries || state.entries;
    state.serverOnline = true;
    persistLocal();
    if (renderAfter) render();
    setStatus("Сохранено на сервере");
  } catch (error) {
    state.serverOnline = false;
    setStatus("Не отправлено: сохранено локально");
  }
}

async function fetchServerEntries() {
  const result = await requestApi({ method: "GET" });
  return Array.isArray(result.entries) ? result.entries : [];
}

async function requestApi(options) {
  const headers = {
    "Accept": "application/json",
    "X-Training-Log-Password": getServerPassword(),
  };
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  let response = await fetch(`${API_URL}?ts=${Date.now()}`, {
    ...options,
    cache: "no-store",
    headers,
  });

  if (response.status === 401) {
    sessionStorage.removeItem(PASSWORD_KEY);
    headers["X-Training-Log-Password"] = getServerPassword(true);
    response = await fetch(`${API_URL}?ts=${Date.now()}`, {
      ...options,
      cache: "no-store",
      headers,
    });
  }

  if (!response.ok) {
    throw new Error(`Server error ${response.status}`);
  }

  return response.json();
}

function getServerPassword(forcePrompt = false) {
  const saved = sessionStorage.getItem(PASSWORD_KEY);
  if (saved && !forcePrompt) return saved;

  const password = window.prompt("Введите пароль сервера для журнала тренировок") || "";
  sessionStorage.setItem(PASSWORD_KEY, password);
  return password;
}

function mergeEntries(serverEntries, localEntries) {
  const merged = new Map();
  for (const entry of [...serverEntries, ...localEntries]) {
    if (!entry?.id) continue;
    const previous = merged.get(entry.id);
    if (!previous || Number(entry.updatedAt || 0) >= Number(previous.updatedAt || 0)) {
      merged.set(entry.id, entry);
    }
  }
  return [...merged.values()];
}

function sortedEntries(entries = state.entries) {
  return [...entries].sort((a, b) => `${b.date}-${b.createdAt}`.localeCompare(`${a.date}-${a.createdAt}`));
}

function getVolume(entry) {
  return (Number(entry.weight) || 0) * (Number(entry.reps) || 0);
}

function loadLocalEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function persistLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

function setStatus(text) {
  els.storageStatus.textContent = text;
}

function exportJson() {
  downloadFile(
    `training-log-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), entries: state.entries }, null, 2),
    "application/json",
  );
}

async function importJson() {
  const file = els.importFile.files?.[0];
  if (!file) return;
  const payload = JSON.parse(await file.text());
  const imported = Array.isArray(payload) ? payload : payload.entries;
  if (!Array.isArray(imported)) return;

  state.entries = mergeEntries(state.entries, imported);
  persistLocal();
  els.importFile.value = "";
  render();
  await syncMutation({ action: "replace", entries: state.entries });
}

function exportCsv() {
  const headers = ["Дата", "Неделя", "Неделя цикла", "Тренировка", "Упражнение", "План", "Вес", "Повторы", "Объем", "RPE", "RIR", "Заметки"];
  const rows = state.entries.map((entry) => [
    entry.date,
    entry.week,
    entry.cycleWeek,
    entry.session,
    entry.exercise,
    entry.plan,
    entry.weight,
    entry.reps,
    getVolume(entry),
    entry.rpe,
    entry.rir,
    entry.notes,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  downloadFile(`training-log-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function numberOrEmpty(value) {
  return value === "" ? "" : Number(value);
}

function currentIsoWeek(date) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  return Math.ceil(((copy - yearStart) / 86400000 + 1) / 7);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T00:00:00`));
}

function sessionClass(session) {
  if (session === "Тяжелая") return "heavy";
  if (session === "Средняя") return "medium";
  return "light";
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
