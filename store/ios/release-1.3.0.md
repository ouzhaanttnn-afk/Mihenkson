# Mihenk 1.3.0 — store and beta copy

## Turkish Promotional Text

Yaşayan Dükkân: tanıdık müşteriler, gerçek ilerleme ve bir sonraki mağaza hedefin. Ustalığını geliştir, kasanı koru, semtin güvenilen kuyumcusu ol.

## Turkish What's New

1.3.0 — Yaşayan Dükkân

• Dükkânının bir sonraki hedefi artık ana ekranda: ustalığını ilerlet, mağazanı büyüt.
• Tanıdık müşterilerle geçmiş işlemlerin görünür; her ziyaret daha anlamlı.
• Teslimler, yaklaşan ödemeler ve piyasa gündemi tek bir sade alanda.
• Gün özeti yenilendi: kâr, gider ve işletmendeki gerçek ilerleme bir arada.
• Mağaza kademelerine özel cepheler; daha anlaşılır büyüme koşulları.
• Peşin tedarik de toptancı güvenini artırır. Üst mağazalar için borç almak zorunlu değildir.
• Hızlı stok temininde nakit ve vade ayrımı, atölye risk açıklamaları ve arayüz metinleri iyileştirildi.
• Mevcut kayıtların, personelin ve yeteneklerin korunur.

## English review notes

No sign-in is required for gameplay. Game Center remains optional.

Version 1.3.0 connects the existing shop-management systems through a concise
next-goal panel, one prioritized agenda, verified returning-customer history,
existing mastery progress, four static store facades and a clearer day report.
Main shop > Talents opens the existing skill tree. Business > Store shows all
seven actual upgrade requirements and the cash remaining after investment.
Workshop explains workload separately from calculated job risk. Stock supply
quotes distinguish cash, outstanding principal/fees and due date.

Successful meaningful cash-only and financed wholesale-pool purchases now earn
the same existing +1 supplier-trust increment, capped at 65. The threshold remains
25% of the current total credit limit. Store tiers 2/3/4 require supplier trust
58/62/65; their other requirements, investments, XP and level gates are unchanged.
No previous purchase is replayed, no free upgrade is granted and no invoice is
created for a fully cash purchase. This removes mandatory debt as a growth gate.

Existing saves, all transaction records, skills, staff and validated offline
watermarks remain preserved. Legacy days without a new day-start baseline do
not invent past progress. Day-close persistence is verified before results apply.
Gameplay, pricing RNG, negotiation rights, staff/offline limits, ad eligibility,
Premium entitlements and existing rewarded choices are unchanged. No new IAP,
ad placement, analytics SDK, permission or data category was added. Progress is
stored on the device.

The approved 1.2.1 advertising rules remain: at most two actual fullscreen
presentations per engaged foreground session, only after settled and saved
successful manual visits or continuing a saved day report. First slot requires
five real active minutes and five unique accepted manual trades; second requires
twelve active minutes, five further trades and five active minutes between
presentations. Staff/offline/service/rejected visits do not count, game speed does
not accelerate eligibility, and Premium/unknown entitlement, unavailable consent,
no-fill or failure skips the break. Negotiation and decision dialogs remain
protected. Offline staff shifts are calculated on return, not through continuous
background execution; existing four-hour/16-attempt limits and daily wages are unchanged.

## Turkish What to Test

1. Eski kaydı güncelle: kasa, stok, personel, yetenekler ve İşlem Defteri korunmalı.
2. Ana ekrandaki yakın hedef ve Yetenekler düğmesi; 320–430 px, büyük yazı ve
   iPhone 14 Pro'da dokunuş/ekran geçişleri. Hareket azaltma ve titreşim kapalı.
3. Gerçek bir satış yap; kâr/maliyet ve ustalık ilerleyişini kontrol et. Personel,
   reddedilen ziyaret veya alış ustalık işi sayılmamalı.
4. Tanıdık müşteri tekrar geldiğinde yalnız gerçekten tamamlanan geçmiş işlemi
   gösterilmeli; olmayan alış uydurulmamalı.
5. Anlamlı peşin ve vadeli tedarik +1 güven sağlamalı, 65'te durmalı; küçük veya
   başarısız alım sağlamamalı. Peşin alış borç açmamalı, vade masrafı doğru olmalı.
6. Mağaza yükseltmesinde yedi şart, yatırım sonrası nakit ve yeni günlük gider.
7. Teslim/ödeme gündemi doğru ekrana gitmeli. Terazi bakımı için nakit yeterliyse
   vadesinde gün kapanışında ödeme; nakit yetmezse borç görünür kalmalı.
8. Gün kapanışı, ayrıntılı finans, ertesi gün ve yeniden açma: aynı kasa ve ilerleme.
9. Atölye risk/doluluk, personel ve çevrimdışı rapor; Game Center Top 100.
10. Mevcut reklam/Premium/izin/no-fill korumaları değişmemeli. Gerçek reklamlara
    tekrar tekrar tıklamayın. Sorunda cihaz/iOS, oyun günü ve ekran görüntüsü ekleyin.
