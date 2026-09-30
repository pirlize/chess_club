/**
 * Club identity and weekly timetable. Texts that change with the language
 * (tagline, address, schedule labels) live in src/app/i18n/*.json under "club".
 * Also update name/short_name in public/manifest.webmanifest when renaming.
 */
export const CLUB = {
  name: 'Chess Square',
  subtitle: 'Σ.Ο. Αμπελοκήπων · Σ.Ο. Θωμάς Γεωργίου',
  logo: 'brand/chess-square-logo.jpg',
  mark: 'brand/mark-96.png',
  email: 'chesssquareclub@gmail.com',
  facebook: 'https://www.facebook.com/chesssquareclub/',
  website: 'https://chesssquare-club.com/',
  mapsQuery: 'Μακρυνίτσας 3, 115 23 Αθήνα',
  /**
   * Regular week (season 2026–27, from the club's announcement).
   * day: 1 = Monday … 7 = Sunday; label: translation key.
   */
  week: [
    { day: 2, items: [{ label: 'club.schedule.adults', time: '19:00–21:00' }] },
    { day: 3, items: [{ label: 'club.schedule.tournament' }] },
    {
      day: 4,
      items: [
        { label: 'club.schedule.kids', time: '17:00–20:00' },
        { label: 'club.schedule.adults', time: '20:00–22:00' },
      ],
    },
    { day: 5, items: [{ label: 'club.schedule.kids', time: '17:00–20:00' }] },
    { day: 6, items: [{ label: 'club.schedule.tournament' }] },
  ] as { day: number; items: { label: string; time?: string }[] }[],
} as const;
