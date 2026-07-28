export interface IcsEvent {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD — for Airbnb/VRBO feeds, this is the checkout date
}

export function parseICS(icsText: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  const blocks = icsText.split('BEGIN:VEVENT').slice(1);

  for (const block of blocks) {
    const startMatch = block.match(/DTSTART[^:]*:(\d{8})/);
    const endMatch = block.match(/DTEND[^:]*:(\d{8})/);
    if (startMatch && endMatch) {
      events.push({
        start: formatDate(startMatch[1]),
        end: formatDate(endMatch[1]),
      });
    }
  }

  return events;
}

function formatDate(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}
