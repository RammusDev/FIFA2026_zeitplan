import {
  STAGES,
  validateMatches,
  filterMatches,
  buildICS,
} from "./calendar.js";
import { CONFIG } from "./config.js";
const $ = (id) => document.getElementById(id);
let matches = [],
  filtered = [],
  controller,
  downloadUrl;
function option(parent, key, value, label) {
  const el = document.createElement("label");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.dataset.key = key;
  input.value = value;
  el.append(input, document.createTextNode(label));
  $(parent).append(el);
}
Object.entries(STAGES).forEach(([key, label]) =>
  option("stages", "stage", key, label),
);
for (const group of "ABCDEFGHIJKL") option("groups", "group", group, group);
function params() {
  const p = new URLSearchParams();
  for (const key of ["stage", "group", "team"]) {
    const v = [
      ...document.querySelectorAll('input[data-key="' + key + '"]:checked'),
    ].map((e) => e.value);
    if (v.length) p.set(key, v.join(","));
  }
  return p;
}
function render() {
  filtered = filterMatches(matches, params());
  $("count").textContent = filtered.length + " Spiele";
  $("matches").replaceChildren();
  for (const m of filtered) {
    const li = document.createElement("li");
    const stage = document.createElement("small");
    stage.textContent =
      ($("source").value === "demo" ? "DEMO · " : "") +
      STAGES[m.round] +
      (m.group ? " · Gruppe " + m.group : "");
    const teams = document.createElement("strong");
    teams.textContent = m.team1 + "  –  " + m.team2;
    const time = document.createElement("time");
    time.dateTime = m.time;
    time.textContent =
      new Intl.DateTimeFormat("de-DE", {
        timeZone: $("timezone").value,
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(m.time)) +
      " · " +
      $("timezone").value;
    li.append(stage, teams, time);
    $("matches").append(li);
  }
  $("download").disabled = !filtered.length;
  $("status").textContent = filtered.length
    ? $("source").value === "demo"
      ? "Fiktive Beispieldaten. Du kannst filtern und einen Demo-Kalender herunterladen."
      : "Externe Daten geladen. Termine bitte beim Veranstalter prüfen."
    : "Keine Spiele für diese Auswahl. Filter zurücksetzen oder andere Teams wählen.";
  $("status").dataset.error = "false";
  const live = $("source").value === "live" && filtered.length > 0;
  $("subscribe").hidden = !live;
  $("copy").hidden = !live;
  const url = new URL(CONFIG.feedUrl);
  url.search = params().toString();
  $("subscribe").href = url.href.replace(/^https:/, "webcal:");
  $("copy").dataset.url = url.href;
  $("feedback").textContent = "";
}
async function load() {
  controller?.abort();
  controller = new AbortController();
  const request = controller;
  $("download").disabled = true;
  $("subscribe").hidden = true;
  $("copy").hidden = true;
  $("matches").replaceChildren();
  $("count").textContent = "Lädt…";
  $("status").textContent = "Spieldaten werden geladen…";
  $("status").dataset.error = "false";
  matches = [];
  filtered = [];
  $("sourceHint").textContent =
    $("source").value === "demo"
      ? "Beispieldaten – keine offiziellen Begegnungen oder Termine."
      : "Externe Quelle über Google Apps Script; Verfügbarkeit und Aktualität können variieren.";
  try {
    const response = await fetch(
      $("source").value === "demo" ? "sample-matches.json" : CONFIG.dataUrl,
      { signal: AbortSignal.any([request.signal, AbortSignal.timeout(12000)]) },
    );
    if (!response.ok) throw new Error("Quelle nicht erreichbar");
    const data = validateMatches(await response.json());
    if (controller !== request) return;
    matches = data;
    const selectedTeams = [
      ...document.querySelectorAll("input[data-key=team]:checked"),
    ].map((e) => e.value);
    $("teams").replaceChildren();
    [...new Set(matches.flatMap((m) => [m.team1, m.team2]))]
      .sort()
      .forEach((t) => option("teams", "team", t, t));
    document
      .querySelectorAll("input[data-key=team]")
      .forEach((e) => (e.checked = selectedTeams.includes(e.value)));
    render();
  } catch (e) {
    if (controller !== request) return;
    $("count").textContent = "Nicht verfügbar";
    $("status").dataset.error = "true";
    $("status").textContent =
      "Daten konnten nicht geladen werden. Bitte zur Portfolio-Demo wechseln oder die Quelle erneut auswählen.";
  }
}
document.addEventListener("change", (e) => {
  if (e.target.id === "source") load();
  else if (e.target.matches("input[data-key],#timezone")) {
    if (matches.length) render();
  }
});
$("reset").onclick = () => {
  document
    .querySelectorAll("input[data-key]")
    .forEach((e) => (e.checked = false));
  if (matches.length) render();
};
$("download").onclick = () => {
  if (!filtered.length) return;
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = URL.createObjectURL(
    new Blob([buildICS(filtered)], { type: "text/calendar;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download =
    $("source").value === "demo" ? "matchday-DEMO.ics" : "matchday.ics";
  a.click();
  $("feedback").textContent =
    "Kalenderdatei erstellt. Zum Import in deiner Kalender-App öffnen.";
};
$("copy").onclick = async () => {
  try {
    await navigator.clipboard.writeText($("copy").dataset.url);
    $("feedback").textContent =
      "Feed-Link kopiert. Aktualisierungen hängen von deiner Kalender-App ab.";
  } catch {
    $("feedback").textContent =
      "Kopieren nicht möglich. Feed: " + $("copy").dataset.url;
  }
};
load();
