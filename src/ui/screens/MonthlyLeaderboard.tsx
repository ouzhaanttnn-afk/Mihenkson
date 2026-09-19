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
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { setResult(null); setFailed(false); setShowAll(false); }, [season.month]);
  const fmt = (n: number) => new Intl.NumberFormat(getLanguage() === 'en' ? 'en-US' : 'tr-TR', {
    minimumFractionDigits: 3, maximumFractionDigits: 3,
  }).format(n);
  const available = rankingConfigured(season.month) && gameCenterSupported();
  const gap = result?.entries.length === 100 ? Math.max(0, (result.entries[99]!.score - wealth.score + 1) / 1000) : null;
  const leading = result?.entries.slice(0, showAll ? 100 : 4) ?? [];
  const ownOutsideLeading = result?.own && !leading.some(entry => entry.rank === result.own?.rank);
  const load = async () => {
    setBusy(true); setFailed(false);
    try { setResult(await refreshRanking(wealth.score, season.month)); }
    catch { setFailed(true); } finally { setBusy(false); }
  };
  // Opening the trophy is the player's explicit Game Center action. Authenticate,
  // submit the latest net worth, then load real players; never render fake rows.
  useEffect(() => { if (available) void load(); }, [available, season.month]);
  const goldBar = <img className="monthlyRanking__gold" src="/assets/realistic/inventory/gold-bar-5g.webp" alt="" />;
  return <section className="monthlyRanking" aria-labelledby={titleId}>
    <h2 id={titleId}>{t('Aylık sıralama')}</h2>
    <div className="monthlyRanking__hero">
      <small>{season.month} · UTC</small>
      <p className="monthlyRanking__score num">{result?.own ? `#${result.own.rank} · ` : ''}{fmt(wealth.grams)} g HAS {goldBar}</p>
      <p>{t('Bu ay artış')}: <strong>{wealth.grams >= season.openingGrams ? '+' : ''}{fmt(wealth.grams - season.openingGrams)} g</strong></p>
    </div>
    {gap !== null && <p className="monthlyRanking__gap">{t('Top 100 farkı')}: <strong>{result?.own && result.own.rank <= 100 ? fmt(0) : fmt(gap)} g</strong></p>}
    {!available && <p>{rankingConfigured() ? t('Game Center için iPhone uygulamasını kullan.') : t('Bu ayın sıralaması henüz açılmadı.')}</p>}
    {failed && <p role="status">{t('Sıralama alınamadı. Game Center hesabını ve bağlantını kontrol et.')}</p>}
    {available && <p>{t('Top 100’e bağlandığında Game Center adın ve HAS servet skorun diğer oyunculara görünür.')}</p>}
    {available && <button className="miniBtn" disabled={busy} onClick={() => void load()}>{busy ? t('Yükleniyor…') : t('Game Center · Top 100')}</button>}
    {result && <ol className="monthlyRanking__list">{leading.map(entry => <li key={entry.rank} className={entry.rank === result.own?.rank ? 'monthlyRanking__own' : ''}>
      <span className="monthlyRanking__rank">{entry.rank}</span><span className="monthlyRanking__name">{entry.name}</span><strong>{fmt(entry.score / 1000)} g</strong>
    </li>)}</ol>}
    {result && !showAll && result.entries.length > 4 && <button className="monthlyRanking__more" onClick={() => setShowAll(true)}>{t('Top 100’ü göster')}</button>}
    {ownOutsideLeading && <div className="monthlyRanking__own monthlyRanking__ownSeparate">
      <span className="monthlyRanking__rank">{result.own!.rank}</span><span className="monthlyRanking__name">{t('Sen')}</span><strong>{fmt(result.own!.score / 1000)} g</strong>
    </div>}
  </section>;
}
