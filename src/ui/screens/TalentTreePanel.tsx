import { useEffect, useId, useRef, useState } from 'react';
import { t } from '@i18n/index';
import { TALENT_NODES, type TalentEffect, type TalentId } from '@data/skills';
import { masterySummary, normalizeSkillProgress, talentRank } from '@domain/skill-tree';
import { talentActionBlock, useGame } from '@state/gameStore';
import { IconTouchstone } from '@ui/icons';
import { useModalSurface } from '@ui/useModalSurface';

const TALENT_TITLES: Record<TalentId, string> = {
  ayar_ustaligi: 'Ayar', tatli_dil: 'Tatlı Dil', usta_eli: 'Usta Eli',
};

/** Only presentation: values continue to come from the canonical catalogue. */
function effectText(effect: TalentEffect): string {
  if (effect.assayAccuracy !== undefined) return t('Mihenk taşı yanlış ayarı %{oran} olasılıkla yakalar.',
    { oran: Math.round(effect.assayAccuracy * 100) });
  if (effect.workshopRiskReduction !== undefined) return t('Yeni kendi atölye işlerinde risk en fazla {n} yüzde puan azalır.',
    { n: Math.round(effect.workshopRiskReduction * 100) });
  return effect.patienceLossTolerated
    ? t('Yeni müşterilere +{n} sabır; yüksek kârlı tekliflerde daha az sabır kaybı.', { n: effect.patienceBonus })
    : t('Yeni müşteriler +{n} sabırla gelir.', { n: effect.patienceBonus });
}

function effectValue(effect: TalentEffect): string {
  if (effect.assayAccuracy !== undefined) return t('%{oran} ayar tespiti', { oran: Math.round(effect.assayAccuracy * 100) });
  if (effect.workshopRiskReduction !== undefined) return t('−{n} yüzde puan risk', { n: Math.round(effect.workshopRiskReduction * 100) });
  return effect.patienceLossTolerated
    ? t('+{n} sabır · yüksek kârda daha az sabır kaybı', { n: effect.patienceBonus })
    : t('+{n} sabır', { n: effect.patienceBonus });
}

export function TalentShortcut() {
  const progress = useGame(s => s.skillProgress);
  const open = useGame(s => s.shopTalentTreeOpen);
  const summary = masterySummary(progress);
  return <button type="button" className="shopTalentButton" aria-haspopup="dialog" aria-expanded={open}
    onClick={() => useGame.getState().setShopTalentTreeOpen(true)}>
    <span><IconTouchstone size={18} /> {t('Yetenek Ağacı')}</span>
    <small>{summary.available > 0 ? t('{n} puan hazır', { n: summary.available })
      : summary.next !== null ? t('Sonraki puana {n} iş', { n: summary.remaining }) : t('Ustalık tamamlandı')}</small>
    <span aria-hidden="true">›</span>
  </button>;
}

export function TalentTreePanel({ initialBranch = 'ayar_ustaligi' }: { initialBranch?: TalentId }) {
  const skillProgress = useGame(s => s.skillProgress);
  const day = useGame(s => s.market.day);
  const block = useGame(talentActionBlock);
  const resetActionBlock = useGame(s => talentActionBlock(s, true));
  useGame(s => s.preferences.language);
  const [selected, setSelected] = useState<TalentId>(initialBranch);
  const [resetRevision, setResetRevision] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [statusPlace, setStatusPlace] = useState<'learn' | 'reset'>('learn');
  const confirmRef = useRef<HTMLButtonElement>(null);
  const resetRef = useRef<HTMLButtonElement>(null);
  const learnRef = useRef<HTMLButtonElement>(null);
  const resetWasOpen = useRef(false);
  useEffect(() => {
    if (resetRevision !== null) { confirmRef.current?.focus(); resetWasOpen.current = true; }
    else if (resetWasOpen.current) {
      if (resetRef.current && !resetRef.current.disabled) resetRef.current.focus();
      else learnRef.current?.focus();
      resetWasOpen.current = false;
    }
  }, [resetRevision]);
  const regionId = useId();
  const progress = normalizeSkillProgress(skillProgress), summary = masterySummary(progress);
  const node = TALENT_NODES.find(n => n.id === selected) ?? TALENT_NODES[0]!;
  const title = t(TALENT_TITLES[node.id as TalentId]);
  const rank = talentRank(progress, node.id), current = node.effects.find(effect => effect.level === rank);
  const next = node.effects.find(effect => effect.level === rank + 1);
  const resetBlock = resetActionBlock
    ?? (progress.mastery.lastResetDay !== null && day <= progress.mastery.lastResetDay ? 'Bugün yeniden dağıtım yaptın; sonraki oyun gününü bekle.' : null);
  const preview = next ?? current;
  return <div className="talentTree" aria-label={t('Yetenek ağacı')}>
    <section className="masterySummary" aria-label={t('Ustalık ilerlemesi')}>
      <strong>{t('{n} kullanılabilir puan', { n: summary.available })}</strong>
      <span>{t('6 puan · 9 kademe')}</span>
      <p>{summary.next !== null ? t('Sonraki puana {n} iş', { n: summary.remaining }) : t('Ustalık tamamlandı')}</p>
      {summary.next !== null && <progress max={summary.next} value={summary.completed}
        aria-label={t('Sonraki ustalık puanı')}
        aria-valuetext={t('{simdi}/{hedef} başarılı iş', { simdi: summary.completed, hedef: summary.next })} />}
    </section>
    <div className="talentBranches" role="group" aria-label={t('Uzmanlık dalı')}>
      {TALENT_NODES.map(branch => <button type="button" key={branch.id} aria-pressed={selected === branch.id}
        aria-controls={regionId} onClick={() => { setSelected(branch.id as TalentId); setStatus(''); }}>
        {t(TALENT_TITLES[branch.id as TalentId])}<small>{t('Kademe {simdi}/{en}', { simdi: talentRank(progress, branch.id), en: branch.maxLevel })}</small>
      </button>)}
    </div>
    <article className="talentNode talentNode--active" id={regionId} aria-label={title}>
      <div className="talentNode__body">
        <div className="talentNode__heading"><h3>{title}</h3>
          <span>{t('Kademe {simdi}/{en}', { simdi: rank, en: node.maxLevel })}</span></div>
        <p className="talentNode__effectLabel">{next ? t('Kademe {n} öğrenince', { n: next.level }) : t('Şimdi')}</p>
        <p className="talentNode__effect">{preview ? effectText(preview) : t(node.baseDescription)}</p>
        <button ref={learnRef} type="button" className="talentLearn" disabled={!next || summary.available < 1 || !!block}
          aria-label={next ? t('{yetenek} kademe {n} öğren', { yetenek: title, n: rank + 1 }) : t('En yüksek kademe')}
          onClick={() => { setStatusPlace('learn'); setStatus(useGame.getState().learnSkill(node.id as TalentId, rank)
            ? t('Yetenek öğrenildi. Yeni ziyaret ve işlerde geçerli.')
            : t('İşlem tamamlanamadı; puanların değişmedi. Tekrar dene.')); }}>
          {t(next ? '1 puan ile öğren' : 'En yüksek kademe')}
        </button>
        {block ? <p>{t(block)}</p> : next && summary.available < 1 ? <p>{t('Öğrenmek için 1 ustalık puanı kazan.')}</p> : null}
        {statusPlace === 'learn' && <p role="status" aria-live="polite">{status}</p>}
        <details className="talentDetails">
          <summary>{t('Tüm kademeler')}</summary>
          <ol className="talentRankList">
            {node.effects.map(effect => <li key={effect.level} className={effect.level <= rank ? 'talentLevel--earned' : ''}>
              <b>{t('Kademe {n}', { n: effect.level })}</b><span>{effectValue(effect)}</span>
              <small>{t(effect.level <= rank ? 'Açıldı' : effect.level === rank + 1 ? 'Sıradaki' : 'Önceki kademe gerekli')}</small>
            </li>)}
          </ol>
        </details>
      </div>
    </article>
    <details className="talentDetails talentRules">
      <summary>{t('Puanlar nasıl kazanılır?')}</summary>
      <p>{t('Yaptığın kârlı satışlar, doğru ücretli ekspertizler ve teslim ettiğin kârlı atölye işleri puan kazandırır.')}</p>
      <p>{t('Personel satışları, alımlar ve reklamlar sayılmaz.')}</p>
      <p>{t('Harcanan {harcanan} · Kazanılan {toplam}/6', { harcanan: summary.spent, toplam: summary.earned })}</p>
      <p>{t('Her kademe 1 puan. XP harcanmaz; puan satın alınamaz. Yeni ziyaret ve işlerde geçerli.')}</p>
    </details>
    <details className="talentDetails talentReset">
      <summary>{t('Yeniden dağıtım')}</summary>
      <p>{t('Ücretsiz; oyun gününde bir kez. Önce müşterileri uğurla ve işleri teslim et.')}</p>
      {resetRevision === null ? <button ref={resetRef} type="button" className="chip" disabled={summary.spent === 0 || !!resetBlock}
        onClick={() => setResetRevision(progress.mastery.revision)}>{t('Yetenekleri yeniden dağıt')}</button>
        : <div role="group" aria-label={t('Yeniden dağıtım onayı')}>
          <p>{t('Kademeler sıfırlanacak, kazanılmış puanların geri gelecek. Onaylıyor musun?')}</p>
          <button ref={confirmRef} type="button" className="chip" disabled={!!resetBlock} onClick={() => {
            setStatusPlace('reset');
            if (useGame.getState().resetSkills(resetRevision)) { setResetRevision(null); setStatus(t('Yetenekler sıfırlandı; kazanılmış puanların geri geldi.')); }
            else { setResetRevision(null); setStatus(t('İşlem tamamlanamadı; puanların değişmedi. Tekrar dene.')); }
          }}>{t('Yeniden dağıtımı onayla')}</button>
          <button type="button" className="chip" onClick={() => setResetRevision(null)}>{t('Vazgeç')}</button>
        </div>}
      {resetBlock && <p>{t(resetBlock)}</p>}
      {statusPlace === 'reset' && <p role="status" aria-live="polite">{status}</p>}
    </details>
  </div>;
}

export function TalentTreeSheet() {
  const close = () => useGame.getState().setShopTalentTreeOpen(false);
  const titleId = useId();
  const { dialogRef, initialFocusRef } = useModalSurface<HTMLElement>(close);
  return <div className="talentTreeScrim" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialogRef} className="talentTreeSheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <header className="talentTreeSheet__head"><h2 id={titleId}>{t('Yetenek Ağacı')}</h2>
        <button ref={initialFocusRef} type="button" onClick={close} aria-label={t('Yetenek ağacını kapat')}>×</button></header>
      <div className="talentTreeSheet__scroll"><TalentTreePanel /></div>
      <button type="button" className="talentTreeSheet__done" onClick={close}>{t('Dükkana Dön')}</button>
    </section>
  </div>;
}
