"""
MİHENKAYNAK — "Tezgâh" fon müziği sentezi.

Parça bu betikle SIFIRDAN üretiliyor; hiçbir kayıttan örnek alınmıyor ve
hiçbir eserin ezgisi/akor dizisi taklit edilmiyor. Telif sorusu bu yüzden
doğmuyor: çıktı bu deponun kendi eseri.

Tarz hedefi: hazy psych-pop dokusu — yavaş tempo, detuned pad, phaser
salınımı, teyp dalgalanması, arkada duran yumuşak groove. SÖZ YOK.

DÖNGÜ DİKİŞSİZ OLMAK ZORUNDA. Her gecikme/yankı DAİRESEL (np.roll) yazıldı
ve bütün LFO periyotları döngü uzunluğunu tam bölüyor; böylece son örnekten
ilk örneğe geçişte ne tık ne de kesilen bir kuyruk kalıyor.
"""
import numpy as np
from scipy.signal import lfilter

# 16 kHz BİLEREK. Ölçüm parçanın enerjisinin %99,8'inin 4 kHz altında
# olduğunu gösteriyor (miks koyu ve filtreli, tarzın gereği). 22,05 kHz'de
# dosya 1,76 MB'tı; 16 kHz'de 1,28 MB ve kaybedilen bant zaten boş.
SR = 16000
BPM = 96.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
BARS = 16
DUR = BARS * BAR              # 40.0 s
N = int(round(DUR * SR))      # 882000
T = np.arange(N) / SR
rng = np.random.default_rng(20260903)


def nota(ad):
    adlar = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
             'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    isim, oktav = ad[:-1], int(ad[-1])
    return 440.0 * (2 ** ((adlar[isim] + (oktav - 4) * 12 - 9) / 12.0))


# Am9 · Fmaj7 · Cmaj7(G bası) · G6 — ikişer ölçü, iki tur.
AKORLAR = [
    (['A3', 'C4', 'E4', 'G4', 'B4'], 'A2'),
    (['F3', 'A3', 'C4', 'E4'],       'F2'),
    (['G3', 'C4', 'E4', 'B4'],       'C3'),
    (['G3', 'B3', 'D4', 'E4'],       'G2'),
]


def _dairesel_filtre(b, a, x):
    """
    IIR'ı DÖNGÜYE SARARAK uygula.

    `lfilter` sıfır durumdan başlar; sonuç döngünün başında filtrenin
    ısınmadığı, sonunda ise ısınmış olduğu bir sinyaldir ve iki uç
    tutmaz. İlk ölçümde dikiş farkı 0,0083'tü ve tek kaynağı buydu.
    Sinyali iki kez yan yana koyup ikinci kopyayı almak, filtreye
    periyodik bir geçmiş verir; iki uç artık aynı durumdan çıkar.
    """
    y = lfilter(b, a, np.concatenate([x, x]))
    return y[x.size:]


def lp(x, kesim):
    a = np.exp(-2.0 * np.pi * kesim / SR)
    return _dairesel_filtre([1 - a], [1, -a], x)


def hp(x, kesim):
    a = np.exp(-2.0 * np.pi * kesim / SR)
    return _dairesel_filtre([a, -a], [1, -a], x)


def gecikme(x, saniye, geri, tekrar=14):
    """Dairesel geri beslemeli gecikme — döngü başına sarar, dikiş bırakmaz."""
    d = int(round(saniye * SR))
    if d <= 0:
        return x.copy()
    out = x.copy()
    kat = geri
    for k in range(1, tekrar + 1):
        out += kat * np.roll(x, d * k)
        kat *= geri
        if abs(kat) < 1e-4:
            break
    return out


def yanki(x):
    """Ucuz Schroeder yankı — dört tarak, hepsi dairesel."""
    out = np.zeros(N)
    for s, g in ((0.0297, 0.72), (0.0371, 0.70), (0.0411, 0.68), (0.0437, 0.66)):
        out += gecikme(lp(x, 3000), s, g, tekrar=20)
    return lp(out / 4.0, 2600)


def zarf(baslangic, sure, atak, sonum, seviye=1.0, kuyruk=0.6):
    e = np.zeros(N)
    b = int(round(baslangic * SR))
    uz = int(round((sure + kuyruk) * SR))
    idx = (np.arange(uz) + b) % N
    tt = np.arange(uz) / SR
    a = np.clip(tt / max(atak, 1e-4), 0.0, 1.0)
    np.add.at(e, idx, seviye * a * np.exp(-tt / max(sonum, 1e-4)))
    return e


def akor_indeksi(t):
    return int((t // (2 * BAR)) % len(AKORLAR))


# ---------------------------------------------------------------------------
# 1) PAD — üç sesli detuned üçgen yığını, yavaş atak
# ---------------------------------------------------------------------------
pad = np.zeros(N)
for i, (sesler, _) in enumerate(AKORLAR * 2):
    bas = i * 2 * BAR
    env = zarf(bas, 2 * BAR, atak=0.9, sonum=3.2, kuyruk=1.2)
    for j, ad in enumerate(sesler):
        f = nota(ad)
        for detune in (-7.0, 0.0, 6.0):
            ff = f * (2 ** (detune / 1200.0))
            faz = rng.uniform(0, 2 * np.pi)
            # üçgene yakın: 1., 3. ve 5. harmonikler azalan genlikle
            s = (np.sin(2 * np.pi * ff * T + faz)
                 + 0.11 * np.sin(2 * np.pi * 3 * ff * T + faz)
                 + 0.04 * np.sin(2 * np.pi * 5 * ff * T + faz))
            pad += env * s * (0.30 / (1 + 0.55 * j))
pad = lp(pad, 1500)

# Phaser: dört kademeli allpass, LFO periyodu 20 s (döngüyü tam böler)
lfo = 0.5 * (1 + np.sin(2 * np.pi * (1.0 / 20.0) * T))
ph = pad.copy()
for kademe in range(4):
    gec = (0.0006 + 0.0022 * lfo) * SR
    idx = np.arange(N) - gec
    i0 = np.floor(idx).astype(int)
    frac = idx - i0
    a = ph[i0 % N]
    b = ph[(i0 + 1) % N]
    ph = -0.62 * ph + (a + (b - a) * frac)
pad = 0.62 * pad + 0.38 * ph

# ---------------------------------------------------------------------------
# 2) BAS — kök notalar, yumuşak, hafif doyumlu
# ---------------------------------------------------------------------------
bas = np.zeros(N)
for i, (_, kok) in enumerate(AKORLAR * 2):
    f = nota(kok)
    for vurus, uz, lvl in ((0.0, 1.6, 1.0), (2.5 * BEAT, 1.0, 0.62)):
        bt = i * 2 * BAR + vurus
        env = zarf(bt, uz, atak=0.012, sonum=0.85, seviye=lvl, kuyruk=0.4)
        bas += env * (np.sin(2 * np.pi * f * T) + 0.18 * np.sin(2 * np.pi * 2 * f * T))
bas = lp(np.tanh(1.4 * bas * 0.5) * 0.62, 900)

# ---------------------------------------------------------------------------
# 3) TUŞ FİGÜRÜ — yumuşak elektro-piyano, sekizlikler, gecikmeli
# ---------------------------------------------------------------------------
tus = np.zeros(N)
desen = [0, 2, 1, 3, 2, 1]        # akor sesleri arasında sakin bir gezinme
adim = 0
t = 0.0
while t < DUR - 1e-9:
    ai = akor_indeksi(t)
    sesler = AKORLAR[ai][0]
    ad = sesler[desen[adim % len(desen)] % len(sesler)]
    f = nota(ad) * 2.0                       # bir oktav yukarı, parlak dursun
    lvl = 0.5 if (adim % 2 == 0) else 0.3
    env = zarf(t, 0.5, atak=0.006, sonum=0.42, seviye=lvl, kuyruk=0.5)
    tus += env * (np.sin(2 * np.pi * f * T)
                  + 0.30 * np.sin(2 * np.pi * 2 * f * T)
                  + 0.16 * np.sin(2 * np.pi * 3 * f * T)
                  + 0.10 * np.sin(2 * np.pi * 4 * f * T)
                  + 0.05 * np.sin(2 * np.pi * 6 * f * T))
    t += BEAT
    adim += 1
tus = lp(tus, 4800) * 0.34
tus = gecikme(tus, 0.75 * BEAT, 0.34)        # noktalı sekizliğe yakın

# ---------------------------------------------------------------------------
# 4) DAVUL — kısık, yıkanmış; groove'u taşır ama öne çıkmaz
# ---------------------------------------------------------------------------
gurultu = rng.normal(0, 1, N)
davul = np.zeros(N)
for bar in range(BARS):
    b0 = bar * BAR
    # tekme: 1 ve 3
    for v in (0.0, 2 * BEAT):
        env = zarf(b0 + v, 0.28, atak=0.002, sonum=0.10, kuyruk=0.2)
        f = 105 * np.exp(-((T - ((b0 + v) % DUR)) % DUR) * 26)
        davul += env * np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.85
    # trampet: 2 ve 4
    for v in (BEAT, 3 * BEAT):
        env = zarf(b0 + v, 0.22, atak=0.001, sonum=0.075, kuyruk=0.25)
        davul += env * hp(gurultu, 900) * 0.20
    # hi-hat: sekizlikler, kısık ama duyulur — parçanın tek "hava" kaynağı
    for k in range(8):
        env = zarf(b0 + k * BEAT / 2, 0.07, atak=0.001, sonum=0.030,
                   seviye=0.42 if k % 2 == 0 else 0.26, kuyruk=0.10)
        davul += env * hp(gurultu, 5200) * 0.16
davul = lp(davul, 8000)

# ---------------------------------------------------------------------------
# 5) MİKS + yankı + teyp dalgalanması + doyum
# ---------------------------------------------------------------------------
def _rms(x):
    return float(np.sqrt(np.mean(x ** 2)))


# Katmanlar TEK TEK ÖLÇÜLÜP dengeleniyor. İlk karışımda pad, toplanan ~120
# osilatör yüzünden diğer her şeyi eziyordu: bandın %90'ı 120-400 Hz'deydi ve
# 1,2 kHz üstünde neredeyse hiçbir şey kalmıyordu — kulağa uğultu gibi gelirdi.
for ad, x in (('pad', pad), ('bas', bas), ('tus', tus), ('davul', davul)):
    print(f'  stem {ad:6}: RMS {_rms(x):.4f}')

# Her katmanı kendi hedef RMS'ine normalize et; miks artık katman sayısına
# değil, kararlaştırılan dengeye bağlı.
def dengele(x, hedef):
    r = _rms(x)
    return x * (hedef / r) if r > 1e-9 else x


pad = dengele(pad, 0.090)
bas = dengele(bas, 0.085)
tus = dengele(tus, 0.070)
davul = dengele(davul, 0.055)

kuru = pad + bas + tus + davul
islak = yanki(0.5 * pad + 0.6 * tus + 0.2 * davul)
miks = kuru + 0.26 * islak

# Teyp: LFO periyotları 40 s'yi tam böler (0.3 Hz = 12/40, 2.7 Hz = 108/40)
wow = 0.0028 * np.sin(2 * np.pi * 0.30 * T) + 0.0012 * np.sin(2 * np.pi * 2.70 * T)
oku = np.arange(N) + wow * SR
i0 = np.floor(oku).astype(int)
frac = oku - i0
miks = miks[i0 % N] + (miks[(i0 + 1) % N] - miks[i0 % N]) * frac

miks = hp(miks, 32)
miks = np.tanh(miks * 1.15) * 0.92
miks = lp(miks, 9200)

tepe = np.max(np.abs(miks))
miks = miks / tepe * 0.72                     # fon müziği: tavana yaslanmaz

# --- Dikiş ölçümü ---
fark = abs(miks[0] - miks[-1])
rms = float(np.sqrt(np.mean(miks ** 2)))
print(f'uzunluk    : {N} örnek / {N / SR:.2f} s')
print(f'tepe       : {np.max(np.abs(miks)):.3f}')
print(f'RMS        : {rms:.4f}  ({20 * np.log10(rms):.1f} dBFS)')
print(f'dikiş farkı: {fark:.6f}  (son örnek ile ilk örnek arası)')
# Dikişteki SIÇRAMA, parçanın kendi örnekten örneğe hareketiyle kıyaslanır:
# tipik adımdan küçükse kulakta tık olmaz.
tipik = float(np.mean(np.abs(np.diff(miks))))
print(f'tipik adım : {tipik:.6f}  → dikiş/tipik = {fark / tipik:.2f}x')
spec = np.abs(np.fft.rfft(miks * np.hanning(N)))
frek = np.fft.rfftfreq(N, 1 / SR)
for lo, hi in ((20, 120), (120, 400), (400, 1200), (1200, 4000), (4000, 11000)):
    m = (frek >= lo) & (frek < hi)
    pay = float(np.sum(spec[m] ** 2) / np.sum(spec ** 2))
    print(f'  {lo:>5}-{hi:<5} Hz : %{pay * 100:5.1f}')

pcm = np.clip(miks, -1, 1)
pcm = (pcm * 32767).astype('<i2')
import wave
with wave.open('tezgah.wav', 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('yazıldı: tezgah.wav')
