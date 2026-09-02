#!/usr/bin/env python3
"""
MIHENKAYNAK — efekt sentezi.

Sesler KAYIT DEĞİL, ÜRETİLMİŞ dosyalardır; kaynağı bu betiktir. Tınıyı
değiştirmek isteyen buradaki sayıları değiştirip yeniden çalıştırır:

    python3 tools/synth-audio.py

Bağımlılık: numpy + standart `wave`. Kodlayıcı (ffmpeg) gerekmez; çıktı WAV.
Daha küçük dosya isteniyorsa aynı adlarla .ogg/.mp3 konabilir — oynatıcı
uzantıyı `AUDIO_FILES` üstünden okur, kodda başka değişiklik gerekmez.

──────────────────────────────────────────────────────────────────────────────
NYQUIST KORUMASI — sessizce cızırtı üreten hata sınıfı

Örnekleme hızının yarısının (Nyquist) üstündeki her bileşen ALIAS yapar:
geriye katlanır ve duyulmaması gereken bir frekansta cızırtı olarak çıkar.
İlk denemede `coins` sesinin kısmî tonları 26 kHz'e çıkıyordu ve dosya
22 kHz'de yazılıyordu — dört kısmî ton katlanıyordu.

`ton()` artık Nyquist üstü bileşeni ATLAR ve atladığını sayar; aşağıdaki
kontrol, atlama olduysa hata verir. Böylece biri frekansı yükseltirse ses
sessizce bozulmaz, üretim durur.
──────────────────────────────────────────────────────────────────────────────
"""
import os
import wave

import numpy as np

CIKTI = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                     'public', 'assets', 'audio')

atlanan = 0


def zaman(sure, sr):
    return np.arange(int(sr * sure)) / sr


def zarf(n, atak, sr, guc=2.0):
    """Hızlı atak + üstel sönme; metalik seslerde tınıyı sönme eğrisi belirler."""
    a = max(1, int(sr * atak))
    e = np.empty(n)
    e[:a] = np.linspace(0, 1, a)
    e[a:] = np.exp(-np.linspace(0, guc * 6, n - a))
    return e


def ton(x, frek, sr, sonum):
    """Tek kısmî ton. Nyquist üstündeyse üretilmez (bkz. başlık)."""
    global atlanan
    if frek >= sr * 0.5 * 0.95:
        atlanan += 1
        return np.zeros(len(x))
    return np.sin(2 * np.pi * frek * x) * np.exp(-np.linspace(0, sonum, len(x)))


def yaz(ad, x, sr):
    x = np.asarray(x, dtype=np.float64)
    x = x / (np.max(np.abs(x)) or 1.0) * 0.70          # −3 dBFS, kırpma payı
    with wave.open(os.path.join(CIKTI, ad), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    return len(x) / sr, os.path.getsize(os.path.join(CIKTI, ad))


# --- Dokunuş: çok kısa, yumuşak klik ----------------------------------------
def tap(sr):
    x = zaman(0.055, sr)
    g = ton(x, 1250, sr, 0) * .6 + ton(x, 2100, sr, 0) * .25
    g = g + np.random.default_rng(1).normal(0, .12, len(x))
    return g * zarf(len(x), .002, sr, 3.2)


# --- Çeyrek şıngırtısı ------------------------------------------------------
# Metal disk modları HARMONİK DEĞİLDİR; oranlar bilerek uyumsuz. Harmonik seri
# kullanılsaydı "şıngırtı" değil "flüt" duyulurdu. Yüksek kısmî tonlar tınının
# ta kendisi olduğu için bu ses 44,1 kHz'de yazılır — 22 kHz'e sıkıştırmak
# karakterini alır ve alias üretir.
def coin(sr, seed, taban):
    rng = np.random.default_rng(seed)
    x = zaman(0.42, sr)
    g = np.zeros(len(x))
    # Mod sayısı Nyquist'e göre seçildi: 3150 Hz tabanla 5,12 oranı 16 kHz'de
    # kalır, bir üstteki mod (6,78) 21 kHz'i aşıp alias yapardı. Kazançları
    # zaten .17 ve .11 olduğu için tını kaybı duyulmuyor.
    for oran, kazanc in zip([1.0, 2.36, 3.91, 5.12],
                            [1.0, .62, .43, .28]):
        g += kazanc * ton(x, taban * oran * (1 + rng.normal(0, .006)), sr, 9 + oran * 1.6)
    vurus = rng.normal(0, 1, len(x)) * np.exp(-np.linspace(0, 320, len(x)))
    return g * .9 + vurus * .35


def coins(sr):
    """İki çeyrek arka arkaya — tek vuruş 'para' değil 'zil' gibi duyuluyor."""
    a, b = coin(sr, 7, 3150), coin(sr, 19, 2760)
    o = int(sr * 0.075)
    out = np.zeros(len(a) + o)
    out[:len(a)] += a
    out[o:o + len(b)] += b * .8
    return out


def _akor(sr, sure, notalar):
    """notalar: (frekans, gecikme, süre, kazanç)"""
    x = zaman(sure, sr)
    toplam = np.zeros(len(x))
    for frek, gecikme, n_sure, kazanc in notalar:
        xs = zaman(n_sure, sr)
        g = ton(xs, frek, sr, 0) + .35 * ton(xs, 2 * frek, sr, 0) + .12 * ton(xs, 3 * frek, sr, 0)
        g *= zarf(len(xs), .012, sr, 1.5) * kazanc
        o = int(sr * gecikme)
        k = min(len(x) - o, len(g))
        toplam[o:o + k] += g[:k]
    return toplam


# --- Anlaşma tamam: Do → Sol beşlisi, sıcak ---------------------------------
def deal(sr):
    return _akor(sr, 0.55, [(523.25, 0, .34, 1.0), (783.99, .085, .40, .9)])


# --- Seviye atlama: yükselen üçlü -------------------------------------------
def levelup(sr):
    return _akor(sr, 0.85, [(523.25, 0, .5, 1.0), (659.25, .11, .5, 1.0), (783.99, .22, .5, 1.0)])


# --- Ret / yetersiz: alçak, inen, kısa --------------------------------------
def deny(sr):
    x = zaman(0.30, sr)
    faz = np.cumsum(2 * np.pi * np.linspace(340, 190, len(x)) / sr)
    g = np.sign(np.sin(faz)) * .35 + np.sin(faz) * .65        # hafif sert tını
    return g * zarf(len(x), .004, sr, 2.2)


# --- Gün kapanışı: çan ------------------------------------------------------
def chime(sr):
    x = zaman(1.15, sr)
    g = np.zeros(len(x))
    for oran, kazanc in zip([1.0, 2.01, 2.99, 4.18, 5.43], [1.0, .5, .32, .18, .1]):
        g += kazanc * ton(x, 440 * oran, sr, 3.2 + oran * .7)
    return g


# --- Müşteri geldi: kapı zili, iki nota -------------------------------------
def customer(sr):
    x = zaman(0.70, sr)
    out = np.zeros(len(x))
    for frek, gecikme, kazanc in [(1050, 0, 1.0), (840, .14, .85)]:
        xs = zaman(0.6, sr)
        g = (ton(xs, frek, sr, 7) + .3 * ton(xs, 2.7 * frek, sr, 7)) * kazanc
        o = int(sr * gecikme)
        k = min(len(x) - o, len(g))
        out[o:o + k] += g[:k]
    return out


# --- Mihenk taşı / test: taş üstünde sürtme ---------------------------------
# Tonal değil, dar bantlı gürültü — sürtünme sesinin tınısı buradan gelir.
def test(sr):
    n = int(sr * 0.38)
    ham = np.random.default_rng(11).normal(0, 1, n)
    alcak = np.zeros(n)
    a = 0.0
    for i in range(n):                       # tek kutuplu alçak geçiren
        a += (ham[i] - a) * 0.35
        alcak[i] = a
    dar = np.diff(np.concatenate([[0.0], alcak]))   # ardından yüksek geçiren
    return dar * np.minimum(1, np.linspace(0, 3, n)) * np.exp(-np.linspace(0, 3.4, n))


SESLER = [
    ('tap.wav', tap, 22050),
    ('coins.wav', coins, 44100),      # yüksek kısmî tonlar tınının kendisi
    ('deal.wav', deal, 22050),
    ('deny.wav', deny, 22050),
    ('chime.wav', chime, 22050),
    ('customer.wav', customer, 22050),
    ('test.wav', test, 22050),
    ('levelup.wav', levelup, 22050),
]

if __name__ == '__main__':
    os.makedirs(CIKTI, exist_ok=True)
    toplam = 0
    for ad, fn, sr in SESLER:
        atlanan = 0
        sure, boyut = yaz(ad, fn(sr), sr)
        toplam += boyut
        veri = np.frombuffer(open(os.path.join(CIKTI, ad), 'rb').read()[44:], dtype=np.int16).astype(float)
        spektrum = np.abs(np.fft.rfft(veri))
        merkez = float((spektrum * np.fft.rfftfreq(len(veri), 1 / sr)).sum() / spektrum.sum())
        print(f'{ad:13} {sr:5} Hz {sure*1000:6.0f} ms {boyut/1024:6.1f} KB '
              f'ağırlık merkezi {merkez:6.0f} Hz')
        assert atlanan == 0, f'{ad}: {atlanan} kısmî ton Nyquist üstünde — alias olurdu'
    print(f'\ntoplam {toplam/1024:.0f} KB · Nyquist ihlali yok')
