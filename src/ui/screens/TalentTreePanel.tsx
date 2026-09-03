import { t } from '@i18n/index';
import { TALENT_BY_ID } from '@data/skills';
import { ASSAY_ACCURACY_STEPS, assayTestAccuracy, tatliDilEffect } from '@domain/skill-tree';
import { useGame } from '@state/gameStore';
import { IconBusiness, IconTouchstone } from '@ui/icons';

/**
 * Mekaniğe bağlı yetenek özeti. Kademe satın alma ekonomisi henüz
 * tanımlanmadığından bu panel ilerlemeyi gösterir, ücretsiz güç dağıtmaz.
 */
export function TalentTreePanel() {
  const progress = useGame((state) => state.skillProgress);
  const sweetTalk = TALENT_BY_ID.get('tatli_dil');
  const currentSweetTalk = tatliDilEffect(progress);

  return (
    <div className="talentTree" aria-label={t('Yetenek ağacı')}>
      <article className="talentNode talentNode--active">
        <span className="talentNode__icon" aria-hidden="true"><IconTouchstone size={24} /></span>
        <div className="talentNode__body">
          <div className="talentNode__heading">
            <strong>{t('Ayar Ustalığı')}</strong>
            <span>Kademe {progress.assayAccuracyRank}/3</span>
          </div>
          <p>{t('Mihenk taşı ayar testinin mevcut doğruluğu')} <b>%{Math.round(assayTestAccuracy(progress) * 100)}</b>.</p>
          <div className="talentSteps" aria-label={t('Ayar Ustalığı kademeleri')}>
            {ASSAY_ACCURACY_STEPS.map((accuracy, rank) => (
              <span key={accuracy} className={rank <= progress.assayAccuracyRank ? 'talentStep talentStep--earned' : 'talentStep'}>
                %{Math.round(accuracy * 100)}
              </span>
            ))}
          </div>
        </div>
      </article>

      <article className={`talentNode ${progress.tatliDilLevel > 0 ? 'talentNode--active' : ''}`}>
        <span className="talentNode__icon" aria-hidden="true"><IconBusiness size={24} /></span>
        <div className="talentNode__body">
          <div className="talentNode__heading">
            <strong>{sweetTalk?.name ?? t('Tatlı Dil & Esnaf Nüktesi')}</strong>
            <span>Kademe {progress.tatliDilLevel}/{sweetTalk?.maxLevel ?? 3}</span>
          </div>
          <p>{currentSweetTalk.description}</p>
          <div className="talentLevels">
            {sweetTalk?.effects.map((effect) => (
              <div key={effect.level} className={effect.level <= progress.tatliDilLevel ? 'talentLevel talentLevel--earned' : 'talentLevel'}>
                <b>{effect.level}</b><span>{effect.description}</span>
              </div>
            ))}
          </div>
        </div>
      </article>

      <p className="talentTree__note">{t('Yetenek puanı ve kademe açma kuralları tanımlanana kadar bu ekran ilerlemeyi güvenli biçimde yalnız gösterir.')}</p>
    </div>
  );
}
