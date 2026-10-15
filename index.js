import { validateMatches, filterMatches, buildICS } from "./calendar.js";
import { CONFIG } from "./config.js";
export default {
  async fetch(req, env = {}) {
    if (req.method !== "GET")
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "GET" },
      });
    try {
      const response = await fetch(env.DATA_URL || CONFIG.dataUrl, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error("upstream");
      const matches = validateMatches(await response.json());
      return new Response(
        buildICS(filterMatches(matches, new URL(req.url).searchParams)),
        {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'attachment; filename="matchday.ics"',
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    } catch {
      return new Response(
        "Spieldaten derzeit nicht verfügbar. Bitte später erneut versuchen.",
        {
          status: 502,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    }
  },
};
