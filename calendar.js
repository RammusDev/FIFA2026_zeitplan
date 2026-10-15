export const STAGES = {
  group: "Gruppenphase",
  round32: "Sechzehntelfinale",
  round16: "Achtelfinale",
  quarter: "Viertelfinale",
  semi: "Halbfinale",
  third: "Spiel um Platz 3",
  final: "Finale",
};
export function validateMatches(data) {
  if (!Array.isArray(data))
    throw new Error("Die Datenquelle muss eine Liste liefern.");
  const ids = new Set();
  return data.map((m) => {
    if (
      !m ||
      !["id", "round", "team1", "team2", "time"].every(
        (k) => typeof m[k] === "string" && m[k].trim(),
      ) ||
      !STAGES[m.round] ||
      !/(Z|[+-]\d{2}:\d{2})$/.test(m.time) ||
      !Number.isFinite(Date.parse(m.time)) ||
      ids.has(m.id)
    )
      throw new Error("Ungültige oder doppelte Spieldaten.");
    ids.add(m.id);
    return { ...m, group: String(m.group || ""), memo: String(m.memo || "") };
  });
}
export function filterMatches(matches, params) {
  const values = (k) => (params.get(k) || "").split(",").filter(Boolean);
  const stages = values("stage"),
    groups = values("group"),
    teams = values("team");
  return matches
    .filter(
      (m) =>
        (!stages.length && !groups.length && !teams.length) ||
        stages.includes(m.round) ||
        groups.includes(m.group) ||
        teams.includes(m.team1) ||
        teams.includes(m.team2),
    )
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
}
export const escapeICS = (value) =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
export function foldLine(line) {
  let out = "",
    bytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > 75) {
      out += "\r\n ";
      bytes = 1;
    }
    out += char;
    bytes += size;
  }
  return out;
}
const stamp = (value) =>
  new Date(value).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
export function buildICS(matches, now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RammusDev//Matchday Calendar//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Matchday Calendar",
  ];
  for (const m of matches)
    lines.push(
      "BEGIN:VEVENT",
      "UID:" + escapeICS(encodeURIComponent(m.id) + "@matchday.rammusdev"),
      "DTSTAMP:" + stamp(now),
      "DTSTART:" + stamp(m.time),
      "DTEND:" + stamp(Date.parse(m.time) + 7200000),
      "SUMMARY:" + escapeICS("[FIFA2026] " + m.team1 + " vs " + m.team2),
      "DESCRIPTION:" +
        escapeICS(
          (m.demo ? "DEMO – fiktive Begegnung. " : "") +
            STAGES[m.round] +
            ". " +
            m.memo,
        ),
      "END:VEVENT",
    );
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
