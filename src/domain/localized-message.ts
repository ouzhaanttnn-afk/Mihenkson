/**
 * Yerelleştirilebilir mesajların saf, JSON-güvenli kurucusu.
 *
 * Bu katman metni çevirmez veya para biçimlendirmez. Böylece domain sonucu
 * oyuncunun o anki sunum tercihine kilitlenmez; UI aynı nesneyi her çizimde
 * güncel dil ve para birimiyle gösterebilir.
 */

import type { LocalizedMessage, LocalizedMessageParam } from './types';

export function localizedMessage(
  key: string,
  params?: Record<string, LocalizedMessageParam>,
): LocalizedMessage {
  return params ? { key, params } : { key };
}
