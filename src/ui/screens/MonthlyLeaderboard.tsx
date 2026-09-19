import { useEffect, useId, useState } from 'react';
import { useGame } from '@state/gameStore';
import { rankingWealth, seasonFor } from '@domain/ranking';
import { gameCenterSupported, rankingConfigured, refreshRanking, type RankingResult } from '@ui/game-center';
import { getLanguage, t } from '@i18n/index';

export function MonthlyLeaderboard() {
  const titleId = useId();
  const s = useGame();
  const wealth = rankingWealth(s);
  const season = seasonFor(s.rankingSeason, wealth.grams);
  const [result, setResult] = useState<RankingResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setResult(null); setFailed(false); }, [season.month]);
  const fmt = (n: number) => new Intl.NumberFormat(getLanguage() === 'en' ? 'en-US' : 'tr-TR', {
    minimumFractionDigits: 3, maximumFractionDigits: 3,
  }).format(n);
  const available = rankingConfigured(season.month) && gameCenterSupported();
  const gap = result?.entries.length === 100 ? Math.max(0, (result.entries[99]!.score - wealth.score + 1) / 1000) : null;
  return <section className="monthlyRanking" aria-labelledby={titleId}>
    <h2 id={titleId}>{t('Aylık sıralama')}</h2>
    <small>{season.month} · UTC</small>
    <p className="monthlyRanking__score num">{result?.own ? `#${result.own.rank} · ` : ''}{fmt(wealth.grams)} g HAS</p>
    <p>{t('Bu ay artış')}: <strong>{wealth.grams >= season.openingGrams ? '+' : ''}{fmt(wealth.grams - season.openingGrams)} g</strong></p>
    {gap !== null && <p>{t('Top 100 farkı')}: {result?.own && result.own.rank <= 100 ? fmt(0) : fmt(gap)} g</p>}
    {!available && <p>{rankingConfigured() ? t('Game Center için iPhone uygulamasını kullan.') : t('Bu ayın sıralaması henüz açılmadı.')}</p>}
    {failed && <p role="status">{t('Sıralama alınamadı. Game Center hesabını ve bağlantını kontrol et.')}</p>}
    {available && <p>{t('Top 100’e bağlandığında Game Center adın ve HAS servet skorun diğer oyunculara görünür.')}</p>}
    {available && <button className="miniBtn" disabled={busy} onClick={async () => {
      setBusy(true); setFailed(false);
      try { setResult(await refreshRanking(wealth.score, season.month)); }
      catch { setFailed(true); } finally { setBusy(false); }
    }}>{busy ? t('Yükleniyor…') : t('Game Center · Top 100')}</button>}
    {result && <ol className="monthlyRanking__list">{result.entries.map(entry => <li key={entry.rank}>
      <span>#{entry.rank} {entry.name}</span><strong>{fmt(entry.score / 1000)} g</strong>
    </li>)}</ol>}
  </section>;
}
