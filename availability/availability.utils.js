export function buildWorkingBlocks(prefs, startDate, endDate) {
  const blocks = [];
  const cur = new Date(startDate);

  while (cur <= endDate) {
    const dow = cur.getDay();

    for (const p of prefs) {
      if (p.day_of_week === dow) {
        const start = new Date(cur);
        const end = new Date(cur);

        const [sh, sm] = p.start_time.split(":");
        const [eh, em] = p.end_time.split(":");

        start.setHours(sh, sm, 0);
        end.setHours(eh, em, 0);

        blocks.push({ start, end });
      }
    }

    cur.setDate(cur.getDate() + 1);
  }

  return blocks;
}

export function subtractBusy(working, busy) {
  const free = [];

  for (const w of working) {
    let currentStart = new Date(w.start);

    for (const b of busy) {
      if (b.end <= currentStart) continue;
      if (b.start >= w.end) break;

      if (b.start > currentStart) {
        free.push({ start: new Date(currentStart), end: new Date(b.start) });
      }

      if (b.end > currentStart) {
        currentStart = new Date(b.end);
      }
    }

    if (currentStart < w.end) {
      free.push({ start: currentStart, end: w.end });
    }
  }

  return free;
}

