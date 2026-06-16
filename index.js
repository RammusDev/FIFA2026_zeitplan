export default {
  async fetch(req) {
    const url = new URL(req.url);

    // =========================
    // 🎛 Query params
    // =========================
    const stages = url.searchParams.get("stage")?.split(",").filter(Boolean) || [];
    const groups = url.searchParams.get("group")?.split(",").filter(Boolean) || [];
    const teams = url.searchParams.get("team")?.split(",").filter(Boolean) || [];

    // =========================
    // 📡 Fetch from Google Apps Script
    // =========================
    const API_URL =
      "https://script.google.com/macros/s/AKfycbwRUJ_Qe_gr2_ZP8IjpEBpfKBD9TXBVkubfBizmS2x-0ULMIfXqatIEtaOd8Hb0skgIcg/exec";

    const res = await fetch(API_URL);

    if (!res.ok) {
      return new Response("Failed to fetch match data", { status: 500 });
    }

    const data = await res.json();
    const matches = data || [];

    // =========================
    // 🎯 FILTER LOGIC (UNION)
    // =========================
    const resultMap = new Map();

    // 🟡 Stage filter
    if (stages.length > 0) {
      matches
        .filter(m => stages.includes(m.round))
        .forEach(m => resultMap.set(m.id, m));
    }

    // 🟢 Group filter
    if (groups.length > 0) {
      matches
        .filter(m => groups.includes(m.group))
        .forEach(m => resultMap.set(m.id, m));
    }

    // 🔵 Team filter
    if (teams.length > 0) {
      matches
        .filter(m =>
          teams.includes(m.team1) ||
          teams.includes(m.team2)
        )
        .forEach(m => resultMap.set(m.id, m));
    }

    // =========================
    // 🎯 FINAL RESULT
    // =========================
    let filtered = Array.from(resultMap.values());

    // 如果沒選任何 filter → 回全部
    if (
      stages.length === 0 &&
      groups.length === 0 &&
      teams.length === 0
    ) {
      filtered = matches;
    }

    // ⭐ sort by time
    filtered.sort((a, b) => new Date(a.time) - new Date(b.time));

  // =========================
  // 📅 Build ICS
  // =========================
  let ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\n";

  filtered.forEach(m => {

    const dtStart = toICS(m.time);
    const dtEnd = toICS(new Date(new Date(m.time).getTime() + 120 * 60 * 1000));

    ics += `BEGIN:VEVENT\r\n`;
    ics += `UID:${m.id}\r\n`;
    ics += `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z\r\n`;
    ics += `SUMMARY:[FIFA2026]${m.round} ${m.team1} vs ${m.team2}\r\n`;
    ics += `DTSTART:${dtStart}\r\n`;
    ics += `DTEND:${dtEnd}\r\n`;
    ics += `DESCRIPTION:${m.memo || ""}\r\n`;
    ics += `END:VEVENT\r\n`;
  });

  ics += "END:VCALENDAR";

    // =========================
    // 📤 RESPONSE
    // =========================
    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Content-Disposition": 'attachment; filename="fifa.ics"'
      }
    });
  }
};

// =========================
// 🧠 helpers
// =========================
function toICS(isoString) {
  return new Date(isoString)
    .toISOString()
    .replace(/[-:]/g, "")
    .split(".")[0] + "Z";
}
// function escapeICS(str = "") {
//   return String(str)
//     .replace(/\\/g, "\\\\")
//     .replace(/,/g, "\\,")
//     .replace(/;/g, "\\;")
//     .replace(/\n/g, "\\n");
// }