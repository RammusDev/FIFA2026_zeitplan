export default {
  async fetch(req) {
    const url = new URL(req.url);
    const team = url.searchParams.get("team");

    const ics = generateICS(team);

    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8"
      }
    });
  }
};

// ===== MOCK DATA（之後換成 worldcup.json）=====
const matches = [
  { uid: "1", home: "Spain", away: "Germany", time: "20260615T160000Z" },
  { uid: "2", home: "Japan", away: "Spain", time: "20260620T160000Z" },
  { uid: "3", home: "France", away: "Brazil", time: "20260625T160000Z" }
];

function generateICS(team) {
  let filtered = matches;

  if (team) {
    filtered = matches.filter(m =>
      m.home.toLowerCase() === team.toLowerCase() ||
      m.away.toLowerCase() === team.toLowerCase()
    );
  }

  let ics =
`BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
PRODID:-//FIFA//WorldCup//EN
`;

  for (const m of filtered) {
    ics +=
`BEGIN:VEVENT
UID:${m.uid}
SUMMARY:${m.home} vs ${m.away}
DTSTART:${m.time}
DTEND:${m.time}
END:VEVENT
`;
  }

  ics += "END:VCALENDAR";

  return ics;
}