# CLAUDE.md — PromptStudio

Bu dosya, Claude Code'un proje hakkında bağlam oluşturması için hazırlanmış geliştirici kılavuzudur.

---

## Proje Özeti

**PromptStudio**, Supabase veritabanından beslenen, Tailwind CSS ve Framer Motion ile stillendirilmiş, Google Gemini API'yi kullanan bir React tabanlı AI prompt mühendisliği aracıdır. Kullanıcılar görsel/video/pazarlama promptları oluşturabilir, AI ile geliştirebilir ve Supabase'e kaydedebilir.

---

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| UI | React 18, Tailwind CSS 3, Framer Motion |
| Bundler | Vite 6 |
| Veritabanı | Supabase (PostgreSQL) |
| AI | Google Gemini API (`gemini-2.5-flash-preview-09-2025`) |
| İkonlar | Lucide React |

---

## Geliştirme Ortamı

```bash
npm install          # bağımlılıkları kur
npm run dev          # dev sunucusu (port 5173)
npm run build        # production bundle → dist/
npm run preview      # build çıktısını önizle
```

### Gerekli Ortam Değişkenleri

`.env.local` dosyası oluşturun (`.gitignore`'da zaten var):

```env
VITE_SUPABASE_URL=https://<proje-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_GEMINI_API_KEY=<google-ai-studio-key>
```

`VITE_GEMINI_API_KEY` eksikse tüm AI özellikleri (Sahne Geliştir, Trigger Üret, Analiz, AI Optimize, Magic Idea, Varyasyonlar) sessizce başarısız olur.

---

## Dosya Yapısı

```
PromptStudio/
├── PromptStudioCanvas.js   # Tek büyük React bileşeni (App + hook + yardımcılar)
├── src/main.jsx            # React DOM entry point
├── index.html              # HTML şablonu
├── index.css               # Global stiller (Tailwind + özel CSS sınıfları)
├── tailwind.config.js      # darkMode: 'class', content paths
├── vite.config.js          # .js dosyaları için JSX loader
├── package.json
└── CLAUDE.md               # Bu dosya
```

---

## Mimari

### Bileşen Yapısı

`PromptStudioCanvas.js` tek bir monolitik dosyadır. İçinde:

- **`transformApiData()`** — Supabase'den gelen ham veriyi uygulama formatına dönüştürür
- **`promptReducer()`** — Tüm uygulama state'ini yöneten reducer (18+ action tipi)
- **`usePromptManager()`** — Custom hook; Supabase yüklemesi, Gemini çağrıları, derleme (compile) mantığı
- **`App()`** — Ana render bileşeni; sürükle-bırak, modal'lar, header, footer

### State Yönetimi

`useReducer` ile tek bir state nesnesi. Action tipleri `A` sabitinde tanımlıdır:

```js
const A = {
  SET_STATE, UPDATE_INPUT, SET_FORMAT, SET_CATEGORY_TAB,
  SET_SELECTION, TOGGLE_CARD, SET_MANUAL_INPUT, MOVE_CATEGORY,
  SET_COMPILED_RESULT, SET_FOOTER_TAB, SET_ERROR, CLEAR_ERROR,
  INITIALIZE, ADD_NOTIFICATION, REMOVE_NOTIFICATION,
  TOGGLE_LANGUAGE, SET_PRESETS, SET_HISTORY
}
```

### Stil Sistemi

- **`UI_STYLES`** (satır ~81): Merkezi stil objesi — button, input, card, toggle, skeleton, switcher
- **`index.css`**: Global stiller + aurora/shimmer animasyonları + scrollbar + glassmorphism
- **Dark mode**: Kök `<div>`'e `dark` sınıfı eklenerek aktifleşir (`tailwind.config.js`'de `darkMode: 'class'`)
- Yeni stil eklerken **önce `UI_STYLES`'ı** kullanın; tek seferlik küçük stiller için Tailwind utility'leri yeterlidir

### Veri Akışı

```
Supabase (categories + items + products)
  → transformApiData()
  → useReducer INITIALIZE
  → localizedCategories (useMemo, dil filtresi)
  → availableCategories (useMemo, format/mod filtresi)
  → handleCompile() → compiledResult state
  → Footer paneli (raw / AI sekmeleri)
```

---

## Supabase Tabloları

| Tablo | Anahtar Alanlar |
|---|---|
| `categories` | `category_id`, `group_name_tr/en`, `title_tr/en`, `icon_name`, `show_for`, `order_index`, `is_active`, `is_meta`, `target_output` |
| `items` | `item_id`, `category_id`, `label_tr/en`, `trigger_text`, `meaning_tr/en`, `badge_tr/en`, `is_default`, `sort_priority`, `image_url`, `video_url` |
| `products` | `Product_Id`, `Product_Name_TR`, `Scene_Desc_TR`, `Product_URL`, `Image_URL` |

### Sync Mantığı

`syncToDatabase(action, table, payload)` debounce (1500 ms) ile çalışır:
- `"CREATE_RECORD"` → `supabase.insert()`
- `"update_row"` → `supabase.update().eq(idKey, ...)`

---

## Gemini API Entegrasyonu

`callGemini(payload, loadingKey)` helper'ı:
1. `loadingKey` state'ini `true` yapar (yükleme göstergesi)
2. `debugPayload` state'ini günceller (DevTools'da görülebilir)
3. `VITE_GEMINI_API_KEY` ile `makeGeminiEndpoint()` URL'ini oluşturur
4. JSON yanıtı parse eder; hata durumunda `SET_ERROR` dispatch eder
5. Her zaman `finally`'de loading'i `false` yapar

Yanıt formatı `responseMimeType: "application/json"` ile zorunlu kılınmaktadır.

---

## Bilinen Kısıtlamalar

- **Tek dosya**: `PromptStudioCanvas.js` 2300+ satırdır; IDE performansı için bileşenlere bölünmesi önerilir (mevcut görev kapsamı dışı)
- **Seçici yok**: Reducer büyük state nesnesi üretir; `useMemo` selector pattern yok
- **Yalnızca Türkçe hata mesajları**: `SET_ERROR` içeriği İngilizce kullanıcıya Türkçe gösterir
- **Supabase hata sessizliği**: Ürünler tablosu yüklemesi başarısız olursa uyarısız devam eder

---

## Önemli Sabitler

```js
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";
const DATA_CONFIG.FORMATS = ['image', 'video', 'img2vid'];
// CONFLICT_RULES: AI optimize sırasında çözülecek kural listesi (satır ~58)
```

---

## Dal Stratejisi

- `main` — kararlı production kodu
- `claude/fix-bugs-create-docs-*` — aktif geliştirme dalı

Her değişiklik için açıklayıcı commit mesajı yazın ve feature branch'e push yapın.
