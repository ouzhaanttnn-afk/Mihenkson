# Fon müziği — köken ve lisans

`tezgah.wav` **bu depoya ait özgün bir eserdir.** Hiçbir kayıttan örnek
alınmamış, hiçbir eserin ezgisi ya da düzenlemesi kullanılmamıştır.

Dosya bir kayıt değil, bir **çıktıdır**: `tools/muzik-uret.py` çalıştırıldığında
bit bit aynısı yeniden üretilir (sentez sabit tohumla, `20260903`, deterministik
çalışır). Kökenin kanıtı da budur — üretici kodun kendisi depoda duruyor.

    python3 tools/muzik-uret.py

Bu yüzden üçüncü taraf bir lisans, atıf zorunluluğu veya telif ödemesi yoktur;
dosya deponun geri kalanıyla aynı koşullara tabidir.

## Neden hazır bir parça indirilmedi

İstek "telifsiz bir Tame Impala parçası" idi. Böyle bir şey yok: o katalog
bütünüyle teliflidir ve hiçbir parçası bir oyuna konulamaz. İnternetten
"telifsiz" diye indirilen dosyaların lisansını doğrulamak da güvenilir değildir.
Parçayı sıfırdan üretmek, tarz isteğini karşılarken telif sorusunu tamamen
ortadan kaldıran tek yoldu.

## Teknik

| | |
|---|---|
| süre | 40,00 s — dikişsiz döngü |
| biçim | WAV · PCM 16 bit · mono · 16 kHz |
| boyut | 1,28 MB |
| tepe / RMS | 0,72 / −16,9 dBFS (fon düzeyi) |

Döngünün dikişsizliği tesadüf değil: bütün gecikme ve yankı hatları dairesel
(`np.roll`) yazıldı, IIR süzgeçler sinyalin iki kopyası üzerinden geçirilerek
periyodik duruma oturtuldu ve her LFO'nun periyodu 40 saniyeyi tam böler.
Ölçülen dikiş sıçraması, parçanın kendi tipik örnek adımının **yarısı kadar**.
