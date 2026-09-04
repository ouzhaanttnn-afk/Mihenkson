/** Müşteri balonunu etkin dil ve para birimiyle gösterir. */

import { localizedDemandSummary } from '@domain/purchase';
import type { CustomerMessage, LocalizedMessageParam } from '@domain/types';
import { t } from '@i18n/index';
import { tl } from '@i18n/money';

function renderParam(param: LocalizedMessageParam): string | number {
  switch (param.kind) {
    case 'raw':
      return param.value;
    case 'translation':
      return t(param.value);
    case 'money':
      return tl(param.value);
    case 'demand':
      return localizedDemandSummary(param.value);
  }
}

export function renderCustomerMessage(message: CustomerMessage): string {
  // Kayıt uyumu: bu yapı eklenmeden önceki kayıtlar düz Türkçe metin
  // taşır. Statik anahtarlar bugün de doğrudan çevrilebilir.
  if (typeof message === 'string') return t(message);

  const params = message.params
    ? Object.fromEntries(
        Object.entries(message.params).map(([name, param]) => [name, renderParam(param)]),
      )
    : undefined;

  return t(message.key, params);
}
