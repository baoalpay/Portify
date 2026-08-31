// TEFAS fon fiyatı erişimi — TEK DOSYA KURALI
//
// TEFAS'a dokunan TÜM kod bu dosyadadır. TEFAS resmî API sunmaz; burada
// kullanılan uç nokta, tefas.gov.tr sitesinin kendi iç JSON servisidir ve
// habersiz değişebilir (Nisan 2026'da bir kez değişti). Kırıldığında yalnızca
// bu dosya onarılır — ayrıntı için docs/MIMARI.md "TEFAS Bağımlılığı" bölümü.
//
// İhtiyat kuralları (bilinçli tasarım):
// - Fon başına günde EN FAZLA bir ağ isteği; gün içinde kalıcı önbellekten okunur.
// - İstekler arasında en az 10 sn bekleme (TEFAS ~6 istek/dk sınırı koyuyor ve
//   aşınca IP'yi birkaç dakika engelliyor — gözlemlenmiş davranış).
// - Ağ/format hatasında ASLA fırlatmaz; son bilinen fiyatla (stale) döner.
// - Fon listesi 7 gün önbelleklenir; arama yerel listede yapılır, her arama
//   istek atmaz.

import { storage } from './storage';
import { StorageKeys } from './keys';

// ============ UÇ NOKTA (kırılırsa önce burayı güncelle) ============

const TEFAS_ENDPOINT = 'https://www.tefas.gov.tr/api/funds/fonGnlBlgSiraliGetir';

const TEFAS_HEADERS = {
  'Content-Type': 'application/json',
  Accept: '*/*',
  Origin: 'https://www.tefas.gov.tr',
  Referer: 'https://www.tefas.gov.tr/tr/fon-verileri',
  // TEFAS, tanımadığı istemcileri (ör. okhttp) reddedebiliyor; tarayıcı kimliği gönder
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
};

const REQUEST_GAP_MS = 10 * 1000;   // istekler arası zorunlu bekleme
const REQUEST_TIMEOUT_MS = 15 * 1000;
const FUND_LIST_TTL_MS = 7 * 24 * 60 * 60 * 1000; // fon listesi 7 gün taze sayılır

// ============ YARDIMCILAR ============

const todayKey = () => new Date().toISOString().split('T')[0]; // 2026-08-30

// Date -> "yyyyMMdd" (TEFAS'ın beklediği format)
const toTefasDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

// Uçuştaki istek tekilleştirme: aynı anda gelen eş istekler (ör. ekran odağı +
// elle yenileme aynı fonu sorarsa) tek ağ isteğini paylaşır
const inFlight = new Map();
const dedupe = (key, run) => {
  if (inFlight.has(key)) return inFlight.get(key);
  const task = run();
  inFlight.set(key, task);
  task.finally(() => inFlight.delete(key));
  return task;
};

// Basit hız freni: son istekten bu yana 10 sn geçmediyse bekler
let lastRequestAt = 0;
const throttle = async () => {
  const wait = lastRequestAt + REQUEST_GAP_MS - Date.now();
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();
};

// TEFAS'a tek istek. Başarıda resultList dizisi, her türlü hatada null döner.
const requestTefas = async (body) => {
  let timer = null;
  try {
    await throttle();

    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(TEFAS_ENDPOINT, {
      method: 'POST',
      headers: TEFAS_HEADERS,
      body: JSON.stringify({
        fonTipi: 'YAT',
        fonKodu: null,
        aramaMetni: null,
        fonTurKod: null,
        fonGrubu: null,
        sfonTurKod: null,
        fonTurAciklama: null,
        kurucuKod: null,
        basSira: 1,
        bitSira: 100000,
        dil: 'TR',
        sFonTurKod: '',
        fonKod: '',
        fonGrup: '',
        fonUnvanTip: '',
        ...body,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.log('TEFAS yanıtı başarısız, HTTP', response.status);
      return null;
    }
    const data = await response.json();
    if (data?.errorMessage) {
      console.log('TEFAS hata döndürdü:', data.errorMessage);
      return null;
    }
    if (!Array.isArray(data?.resultList)) {
      console.log('TEFAS yanıtı beklenen formatta değil');
      return null;
    }
    return data.resultList;
  } catch (error) {
    console.log('TEFAS isteği başarısız:', error?.message || error);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

// Tek fon için fiyat akışı (dedupe sarmalayıcısının çağırdığı asıl iş)
const fetchFundPriceOnce = async (code) => {
  const cache = await storage.getJSON(StorageKeys.tefasPrices, {});
  const cached = cache[code];

  // Bugün zaten ağdan alındıysa tekrar sorma
  if (cached && cached.fetchedDay === todayKey()) {
    return { price: cached.price, date: cached.date, stale: false };
  }

  // Son 8 günü iste (hafta sonu/tatilde de en az bir iş günü yakalanır)
  const rows = await requestTefas({
    fonKodu: code,
    basTarih: toTefasDate(daysAgo(8)),
    bitTarih: toTefasDate(new Date()),
  });

  if (rows && rows.length > 0) {
    // En güncel kaydı al (liste tarihe göre iner ama garantiye alalım)
    const latest = rows.reduce((a, b) => (a.tarih > b.tarih ? a : b));
    if (typeof latest.fiyat === 'number' && latest.fiyat > 0) {
      cache[code] = {
        price: latest.fiyat,
        date: latest.tarih,
        fetchedDay: todayKey(),
      };
      await storage.setJSON(StorageKeys.tefasPrices, cache);
      return { price: latest.fiyat, date: latest.tarih, stale: false };
    }
  }

  // Ağdan alınamadı: son bilinen fiyata sessizce düş
  if (cached) {
    return { price: cached.price, date: cached.date, stale: true };
  }
  return null;
};

// Fon listesi akışı (dedupe sarmalayıcısının çağırdığı asıl iş)
const fetchFundListOnce = async () => {
  const cached = await storage.getJSON(StorageKeys.tefasFundList, null);
  if (cached && Date.now() - cached.fetchedAt < FUND_LIST_TTL_MS) {
    return cached.funds;
  }

  // Son iş gününü yakalamak için 4 günlük aralık yeterli
  const rows = await requestTefas({
    basTarih: toTefasDate(daysAgo(4)),
    bitTarih: toTefasDate(new Date()),
  });

  if (rows && rows.length > 0) {
    // Aynı fon birden çok günle gelebilir; en güncel kaydı tut
    const byCode = {};
    for (const row of rows) {
      if (!row.fonKodu || !row.fonUnvan) continue;
      if (!byCode[row.fonKodu] || row.tarih > byCode[row.fonKodu].tarih) {
        byCode[row.fonKodu] = row;
      }
    }
    const funds = Object.values(byCode)
      .map((row) => ({ code: row.fonKodu, name: row.fonUnvan }))
      .sort((a, b) => a.code.localeCompare(b.code, 'tr'));

    if (funds.length > 0) {
      await storage.setJSON(StorageKeys.tefasFundList, {
        fetchedAt: Date.now(),
        funds,
      });
      return funds;
    }
  }

  // Ağ yoksa süresi geçmiş önbellek bile olsa onu kullan
  return cached ? cached.funds : null;
};

// ============ DIŞA AÇIK ARAYÜZ ============

export const tefasRepository = {
  // Fon fiyatı getir. Dönen değer:
  //   { price, date, stale } -> stale=true ise ağdan alınamadı, son bilinen fiyat
  //   null                   -> hiç fiyat bilinmiyor (manuel fiyat kullanılmalı)
  // Günde fon başına en fazla bir ağ isteği yapılır; asla fırlatmaz.
  async getFundPrice(fundCode) {
    const code = String(fundCode || '').trim().toUpperCase();
    if (!code) return null;
    return dedupe(`price_${code}`, () => fetchFundPriceOnce(code));
  },

  // Aranabilir fon listesi: [{ code, name }] | null
  // 7 gün önbelleklenir; tek istekle tüm liste gelir. Asla fırlatmaz.
  async getFundList() {
    return dedupe('fund_list', () => fetchFundListOnce());
  },

  // Yerel arama — istek ATMAZ; getFundList'ten dönen liste üzerinde çalışır
  searchFunds(query, funds) {
    if (!funds) return [];
    const q = String(query || '').trim().toLocaleLowerCase('tr');
    if (!q) return [];
    return funds
      .filter(
        (f) =>
          f.code.toLocaleLowerCase('tr').includes(q) ||
          f.name.toLocaleLowerCase('tr').includes(q)
      )
      .slice(0, 8);
  },

  async clearCache() {
    await storage.remove(StorageKeys.tefasPrices);
    await storage.remove(StorageKeys.tefasFundList);
  },
};
