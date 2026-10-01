/** Journal pagination changes only the rendered window, never the stored history. */
export const JOURNAL_PAGE_SIZE = 50;

export interface JournalWindow<T> {
  entries: T[];
  page: number;
  pageCount: number;
  total: number;
}

/** Latest first; allocation and traversal stay bounded by one visible page. */
export function journalWindow<T>(
  history: readonly T[],
  requestedPage: number,
): JournalWindow<T> {
  const total = history.length;
  const pageCount = Math.max(1, Math.ceil(total / JOURNAL_PAGE_SIZE));
  const page = Math.min(pageCount - 1, Math.max(0,
    Number.isFinite(requestedPage) ? Math.trunc(requestedPage) : 0));
  const end = total - page * JOURNAL_PAGE_SIZE;
  const start = Math.max(0, end - JOURNAL_PAGE_SIZE);

  return { entries: history.slice(start, end).reverse(), page, pageCount, total };
}
