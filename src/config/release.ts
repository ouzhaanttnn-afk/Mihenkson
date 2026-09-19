/** Configure only assets/identifiers actually supplied by the owner. */
export const BACKGROUND_MUSIC_URL: string | null = null;

/** One classic Game Center board per UTC calendar month; latest score, descending.
 * Keys are YYYY-MM, values must be real App Store Connect identifiers.
 * These IDs were created in App Store Connect for MIHENKAYNAK.
 * Add each future calendar month there before adding its identifier here.
 */
export const MONTHLY_LEADERBOARD_IDS: Readonly<Record<string, string>> = {
  '2026-09': 'com.mihenkaynak.has.2026_09',
  '2026-10': 'com.mihenkaynak.has.2026_10',
  '2026-11': 'com.mihenkaynak.has.2026_11',
  '2026-12': 'com.mihenkaynak.has.2026_12',
};
