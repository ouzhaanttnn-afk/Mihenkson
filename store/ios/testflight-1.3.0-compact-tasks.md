# TestFlight — 1.3.0 compact store tasks

## Türkçe — test edilecekler

Bu build ana ekrandaki mağaza kartını küçültür ve mağaza büyütme koşullarını kısa görevler halinde gösterir. Kayıtlar ve oyun ekonomisi değişmez.

1. Dükkan ekranında Dynamic Island altında profil/saat alanını, küçük Semt Kuyumcusu kartını ve müşteri düğmesini kontrol edin.
2. Mağaza kartına dokunun. Aynı ekrana İşletme → Mağaza yoluyla da ulaşılmalı.
3. Sonraki mağaza adı, eksik görevler ve hazır görev sayısı doğru olmalı. Hazır görevler, yardım ve mağaza ayrıntıları kapalı başlamalı.
4. Yatırım bedeli ve yeni günlük gider ayrı görünmeli. Altı görev hazır olsa bile nakit eksikse büyütme kapalı kalmalı. Hazır olduğunda bedel yalnız bir kez düşmeli, doğru kademe açılmalı.
5. Yardımdaki Dükkan ve Toptancı bağlantıları çalışmalı; geri ve alt navigasyon kullanılabilmeli.
6. Türkçe/İngilizce, TL/dolar ve büyük yazı boyutunda metinler taşmamalı. En küçük ekranda ayrıntıların sonuna ulaşılmalı; ödeme düğmesi içeriği örtmemeli.

## English — what to test

This build makes the home store tile smaller and presents existing store-upgrade requirements as compact tasks. Saves and the game economy are unchanged.

Check the Dynamic Island safe area, both store-screen entry points, missing/ready task counts, separate investment and overhead, disabled upgrade when cash is short, single settlement when eligible, real help links, back/navigation, and TR/EN plus currency/text-size switching. Long details must remain reachable in one scrolling region with no footer overlap.
