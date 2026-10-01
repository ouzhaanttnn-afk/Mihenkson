import { useEffect, useId, useRef, useState } from 'react';
import { t } from '@i18n/index';
import { TALENT_NODES, type TalentId } from '@data/skills';
import { masterySummary, normalizeSkillProgress, talentRank } from '@domain/skill-tree';
import { talentActionBlock, useGame } from '@state/gameStore';
import { IconBusiness, IconTouchstone, IconWorkshop } from '@ui/icons';
import { useModalSurface } from '@ui/useModalSurface';

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
  const s = useGame();
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
  const progress = normalizeSkillProgress(s.skillProgress), summary = masterySummary(progress);
  const node = TALENT_NODES.find(n => n.id === selected) ?? TALENT_NODES[0]!;
  const rank = talentRank(progress, node.id), current = node.effects.find(effect => effect.level === rank);
  const next = node.effects.find(effect => effect.level === rank + 1);
  const block = talentActionBlock(s);
  const resetBlock = talentActionBlock(s, true)
    ?? (progress.mastery.lastResetDay !== null && s.market.day <= progress.mastery.lastResetDay ? 'Bugün yeniden dağıtım yaptın; sonraki oyun gününü bekle.' : null);
  const Icon = selected === 'ayar_ustaligi' ? IconTouchstone : selected === 'tatli_dil' ? IconBusiness : IconWorkshop;
  return <div className="talentTree" aria-label={t('Yetenek ağacı')}>
    <section className="masterySummary" aria-label={t('Ustalık ilerlemesi')}>
      <strong>{t('{n} kullanılabilir puan', { n: summary.available })}</strong>
      <span>{t('Harcanan {harcanan} · Kazanılan {toplam}/6', { harcanan: summary.spent, toplam: summary.earned })}</span>
      <p>{summary.next !== null ? t('{simdi}/{hedef} başarılı iş · Sonraki puana {kalan} iş',
        { simdi: summary.completed, hedef: summary.next, kalan: summary.remaining }) : t('Altı ustalık puanının tamamını kazandın. Uzmanlık dağılımını sen seç.')}</p>
      {summary.next !== null && <progress max={summary.next} value={summary.completed} aria-label={t('Sonraki ustalık puanı')} />}
    </section>
    <div className="talentBranches" role="group" aria-label={t('Uzmanlık dalı')}>
      {TALENT_NODES.map(branch => <button type="button" key={branch.id} aria-pressed={selected === branch.id}
        aria-controls={regionId} onClick={() => { setSelected(branch.id as TalentId); setStatus(''); }}>
        {t(branch.branch)}<small>{t('Kademe {simdi}/{en}', { simdi: talentRank(progress, branch.id), en: branch.maxLevel })}</small>
      </button>)}
    </div>
    <article className="talentNode talentNode--active" id={regionId} aria-label={t(node.name)}>
      <span className="talentNode__icon" aria-hidden="true"><Icon size={24} /></span>
      <div className="talentNode__body">
        <div className="talentNode__heading"><strong>{t(node.name)}</strong>
          <span>{t('Kademe {simdi}/{en}', { simdi: rank, en: node.maxLevel })}</span></div>
        <p><b>{t('Şimdi')}</b> · {t(current?.description ?? node.baseDescription)}</p>
        {next ? <p><b>{t('Sonraki kademe')}</b> · {t(next.description)}</p> : <p>{t('Bu uzmanlığın tüm kademeleri açık.')}</p>}
        <ol className="talentRankList">
          {node.effects.map(effect => <li key={effect.level} className={effect.level <= rank ? 'talentLevel--earned' : ''}>
            <b>{t('Kademe {n}', { n: effect.level })}</b><span>{t(effect.description)}</span>
            <small>{t(effect.level <= rank ? 'Açıldı' : effect.level === rank + 1 ? 'Sıradaki' : 'Önceki kademe gerekli')}</small>
          </li>)}
        </ol>
        <button ref={learnRef} type="button" className="talentLearn" disabled={!next || summary.available < 1 || !!block}
          aria-label={next ? t('{yetenek} kademe {n} öğren', { yetenek: t(node.name), n: rank + 1 }) : t('En yüksek kademe')}
          onClick={() => { setStatusPlace('learn'); setStatus(s.learnSkill(node.id as TalentId, rank)
            ? t('Yetenek öğrenildi. Yeni ziyaret ve işlerde geçerli.')
            : t('İşlem tamamlanamadı; puanların değişmedi. Tekrar dene.')); }}>
          {t(next ? '1 puan ile öğren' : 'En yüksek kademe')}
        </button>
        {block ? <p>{t(block)}</p> : next && summary.available < 1 ? <p>{t('Öğrenmek için 1 ustalık puanı kazan.')}</p> : null}
        {statusPlace === 'learn' && <p role="status" aria-live="polite">{status}</p>}
      </div>
    </article>
    <p className="talentTree__note">{t('Puanlar kendi tamamladığın kârlı müşteri satışları, doğru ve ücretli ekspertizler ve teslim edilmiş kârlı atölye işleriyle kazanılır. Personel satışları, alımlar ve reklamlar sayılmaz.')}</p>
    <p className="talentTree__note">{t('Toplam 6 puan, 9 kademe. XP harcanmaz; para veya reklamla puan alınamaz. Başlamış ziyaretler ve kabul edilmiş işler değişmez.')}</p>
    <section className="talentReset" aria-label={t('Yetenekleri yeniden dağıt')}>
      <p>{t('Yeniden dağıtım ücretsizdir; oyun gününde bir kez. Tüm müşterileri uğurla ve atölye işlerini teslim et.')}</p>
      {resetRevision === null ? <button ref={resetRef} type="button" className="chip" disabled={summary.spent === 0 || !!resetBlock}
        onClick={() => setResetRevision(progress.mastery.revision)}>{t('Yetenekleri yeniden dağıt')}</button>
        : <div role="group" aria-label={t('Yeniden dağıtım onayı')}>
          <p>{t('Kademeler sıfırlanacak, kazanılmış puanların geri gelecek. Onaylıyor musun?')}</p>
          <button ref={confirmRef} type="button" className="chip" disabled={!!resetBlock} onClick={() => {
            setStatusPlace('reset');
            if (s.resetSkills(resetRevision)) { setResetRevision(null); setStatus(t('Yetenekler sıfırlandı; kazanılmış puanların geri geldi.')); }
            else { setResetRevision(null); setStatus(t('İşlem tamamlanamadı; puanların değişmedi. Tekrar dene.')); }
          }}>{t('Yeniden dağıtımı onayla')}</button>
          <button type="button" className="chip" onClick={() => setResetRevision(null)}>{t('Vazgeç')}</button>
        </div>}
      {resetBlock && <p>{t(resetBlock)}</p>}
      {statusPlace === 'reset' && <p role="status" aria-live="polite">{status}</p>}
    </section>
  </div>;
}

export function TalentTreeSheet() {
  const close = () => useGame.getState().setShopTalentTreeOpen(false);
  const titleId = useId();
  const { dialogRef, initialFocusRef } = useModalSurface<HTMLElement>(close);
  return <div className="talentTreeScrim" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialogRef} className="talentTreeSheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <header className="talentTreeSheet__head"><div><span>{t('Uzmanlık')}</span><h2 id={titleId}>{t('Yetenek Ağacı')}</h2></div>
        <button ref={initialFocusRef} type="button" onClick={close} aria-label={t('Yetenek ağacını kapat')}>×</button></header>
      <div className="talentTreeSheet__scroll"><TalentTreePanel /></div>
      <button type="button" className="talentTreeSheet__done" onClick={close}>{t('Dükkana Dön')}</button>
    </section>
  </div>;
}
