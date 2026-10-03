# TestFlight — 1.3.0 compact store tasks

## Türkçe — test edilecekler

Bu build, ana ekrandaki mağaza ve Yetenekler şeridini biraz inceltir. Mağaza büyütme koşulları kısa görevler halinde görünür. Kayıtlar ve oyun ekonomisi değişmez.

1. Dükkan ekranında Dynamic Island altında profil/saat alanını, ince mağaza şeridini ve müşteri düğmesini kontrol edin.
2. Şeritte mağaza adına dokununca Mağaza, Yetenekler'e dokununca yetenek ağacı açılmalı. İşletme → Mağaza yolu da çalışmalı.
3. Sonraki mağaza adı, eksik görevler ve hazır görev sayısı doğru olmalı. Hazır görevler, yardım ve mağaza ayrıntıları kapalı başlamalı.
4. Yatırım bedeli ve yeni günlük gider ayrı görünmeli. Altı görev hazır olsa bile nakit eksikse büyütme kapalı kalmalı. Hazır olduğunda bedel yalnız bir kez düşmeli, doğru kademe açılmalı.
5. Yardımdaki Dükkan ve Toptancı bağlantıları çalışmalı; geri ve alt navigasyon kullanılabilmeli.
6. Türkçe/İngilizce, TL/dolar ve büyük yazı boyutunda metinler taşmamalı. En küçük ekranda ayrıntıların sonuna ulaşılmalı; ödeme düğmesi içeriği örtmemeli.

## English — what to test

This build slightly reduces the vertical padding of the shared home store/Talents rail and presents existing store-upgrade requirements as compact tasks. Saves and the game economy are unchanged.

Check the Dynamic Island safe area, separate store/Talents controls, both store-screen entry points, missing/ready task counts, separate investment and overhead, disabled upgrade when cash is short, single settlement when eligible, real help links, back/navigation, and TR/EN plus currency/text-size switching at 320–430 px widths. Long details must remain reachable in one scrolling region with no footer overlap.
