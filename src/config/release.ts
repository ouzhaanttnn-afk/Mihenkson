/** Configure only assets/identifiers actually supplied by the owner. */
export const BACKGROUND_MUSIC_URL: string | null = null;

/** One classic Game Center board per UTC calendar month; latest score, descending.
 * Keys are YYYY-MM, values must be real App Store Connect identifiers.
 * Deliberately empty: never submit to a fabricated or rolling-month board.
 */
export const MONTHLY_LEADERBOARD_IDS: Readonly<Record<string, string>> = {};
