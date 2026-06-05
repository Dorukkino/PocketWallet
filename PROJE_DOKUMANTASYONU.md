# PocketWallet Proje Dokümantasyonu

Bu doküman PocketWallet projesinin teknik yapısını, kaynak kod dosyalarının görevlerini, veri akışını, Supabase bağlantısını, yerel depolama yaklaşımını ve UI/UX kararlarını uçtan uca açıklar. Proje bir Expo SDK 56 / React Native mobil uygulamasıdır ve kullanıcının aylık gelir-gider takibini tek ekranda yönetmesini hedefler.

## 1. Projenin Amacı

PocketWallet, kişisel bütçe yönetimi için tasarlanmış mobil öncelikli bir finans kontrol panelidir. Kullanıcı e-posta ve şifreyle oturum açar, aylık gelirini girer, giderlerini kategori ve tarihle kaydeder, kalan bakiyesini görür, harcama dağılımını grafikle takip eder ve bakiyesini TRY, USD, EUR, GBP para birimlerinde görüntüleyebilir.

Uygulamanın temel problemi şudur: kullanıcının ay içinde parasının nereye gittiğini, hangi kategorilerin baskın olduğunu ve ay sonunda ne kadar bütçe kaldığını sade bir mobil arayüzde göstermek.

## 2. Teknoloji Yığını

- Expo SDK: `~56.0.8`
- React Native: `0.85.3`
- React: `19.2.3`
- TypeScript: `~6.0.3`
- Supabase: Auth ve uzak veritabanı için `@supabase/supabase-js`
- AsyncStorage: Yerel önbellek ve oturum kalıcılığı için `@react-native-async-storage/async-storage`
- Expo Linear Gradient: Arka plan ve kart gradyanları için `expo-linear-gradient`
- Expo Status Bar: Durum çubuğu temasını yönetmek için `expo-status-bar`
- Lucide React Native: Tüm ikon seti için `lucide-react-native`
- React Native SVG: Harcama analiz grafiğini çizmek için `react-native-svg`
- Polyfill paketleri: Supabase'in React Native ortamında düzgün çalışması için `react-native-get-random-values` ve `react-native-url-polyfill`

Expo SDK 56 dokümantasyonuna göre bu SDK React Native 0.85 ve React 19.2.3 ile eşleşir. Projedeki `package.json` bağımlılıkları bu sürüm çizgisiyle uyumludur.

## 3. Çalıştırma ve Geliştirme Komutları

`package.json` içindeki komutlar şunlardır:

- `npm run start`: Expo geliştirme sunucusunu başlatır.
- `npm run android`: Android hedefiyle Expo'yu başlatır.
- `npm run ios`: iOS hedefiyle Expo'yu başlatır.
- `npm run web`: Web hedefiyle Expo'yu başlatır.
- `npm run typecheck`: TypeScript tip kontrolünü `tsc --noEmit` ile çalıştırır.

`package.json` içindeki `main` alanı `index.ts` olarak verilmiş, fakat repo içinde görünen giriş dosyası `App.tsx` dosyasıdır. Expo projelerinde giriş noktası genellikle Expo tarafından çözümlenir; yine de `index.ts` dosyası yoksa ileride başlangıç yapılandırması kontrol edilmelidir.

## 4. Expo Uygulama Yapılandırması

`app.json` uygulamanın Expo meta bilgilerini tanımlar:

- Uygulama adı: `PocketWallet`
- Slug: `pocketwallet`
- Sürüm: `1.0.0`
- Ekran yönü: sadece portre
- Tema: koyu arayüz (`userInterfaceStyle: dark`)
- Deep link scheme: `pocketwallet`
- iOS bundle id: `com.dorukkino.pocketwallet`
- Android package: `com.dorukkino.pocketwallet`
- Android predictive back gesture: kapalı
- Web favicon: `./assets/favicon.png`

`app.json` içinde ikon dosyaları `assets` klasöründen referanslanıyor. İncelenen çalışma ağacında `assets/*` dosyaları görünmedi. Bu dosyalar gerçekten eksikse Expo build sırasında ikon/favikon hatası alınabilir.

## 5. Ortam Değişkenleri

`.env.example` iki public Supabase değişkeni bekler:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

`src/types/env.d.ts` bu iki değişkeni TypeScript tarafında opsiyonel olarak tanımlar. `src/lib/supabase.ts` ise uygulama açılırken bu değerlerin bulunmasını zorunlu tutar; eksikse uygulama `Supabase environment variables are missing.` hatası fırlatır.

## 6. Klasör ve Dosya Yapısı

Projenin uygulama kodu `src` altında toplanır:

```text
App.tsx
app.json
package.json
.env.example
src/
  components/
    BalanceHeader.tsx
    CategoryIcon.tsx
    DonutChart.tsx
    ExpenseForm.tsx
    TransactionList.tsx
  constants/
    categories.ts
  hooks/
    useBudget.ts
    useExchangeRates.ts
  lib/
    currency.ts
    storage.ts
    supabase.ts
  screens/
    AuthScreen.tsx
    BudgetScreen.tsx
  types/
    budget.ts
    env.d.ts
```

Bu yapı oldukça bilinçli ayrılmıştır: ekranlar üst seviye akışı, bileşenler görsel parçaları, hook'lar iş mantığını, `lib` klasörü dış servis/yardımcı fonksiyonları, `types` klasörü ortak tipleri, `constants` klasörü sabit veri setlerini taşır.

## 7. Uygulama Giriş Akışı

`App.tsx` uygulamanın ana kapısıdır. İlk yüklemede Supabase oturumunu kontrol eder:

1. `supabase.auth.getSession()` çağrılır.
2. Mevcut oturum varsa `session` state'ine yazılır.
3. Oturum yüklenirken koyu arka planlı bir `ActivityIndicator` gösterilir.
4. `supabase.auth.onAuthStateChange` ile oturum değişiklikleri dinlenir.
5. Oturum varsa `BudgetScreen`, yoksa `AuthScreen` render edilir.
6. `StatusBar` her durumda `light` olarak ayarlanır.

Bu akış kullanıcının daha önce giriş yaptıysa tekrar login ekranına düşmemesini sağlar. Oturum AsyncStorage üzerinde Supabase tarafından kalıcı tutulur.

## 8. Kimlik Doğrulama Ekranı

`src/screens/AuthScreen.tsx`, giriş ve kayıt işlemlerini tek kart içinde sunar.

Kullanıcı arayüzünde şunlar bulunur:

- PocketWallet logosu yerine kullanılan zümrüt renkli ikon kutusu
- Büyük `PocketWallet` başlığı
- Ürün vaadini anlatan kısa açıklama
- Giriş modunda e-posta ve şifre alanları
- Kayıt modunda ek olarak ad-soyad alanı
- Ana aksiyon butonu: `Giriş Yap` veya `Hesap Oluştur`
- Mod değiştirme linki
- Hata veya başarı mesajı alanı

Kod tarafında `mode` state'i `sign-in` ve `sign-up` arasında geçiş yapar. Kayıt modunda ad-soyad en az 2 karakter olmalıdır. E-posta boş olamaz, şifre en az 6 karakter olmalıdır. Girişte `supabase.auth.signInWithPassword`, kayıtta `supabase.auth.signUp` kullanılır. Kayıt sırasında `full_name` Supabase Auth metadata içine yazılır.

UX açısından ekran kullanıcıyı tek bir kart içinde tutar; mod değişimi aynı yerde gerçekleştiği için navigasyon karmaşası yoktur. KeyboardAvoidingView iOS'ta klavye alanını hesaba katar.

## 9. Ana Bütçe Ekranı

`src/screens/BudgetScreen.tsx`, uygulamanın ana deneyimini oluşturur. Bu ekran bir `Session` prop'u alır ve iki ana hook kullanır:

- `useBudget(session)`: gelir, gider, kategori, ay seçimi ve Supabase senkronizasyonu
- `useExchangeRates()`: güncel döviz kurları, cache ve hata durumu

Ekranın görsel sıralaması şöyledir:

1. Marka üst çubuğu ve çıkış butonu
2. Ay kartı ve ay değiştirme navigasyonu
3. Günlük kur takip başlığı
4. Para birimi seçim alanı
5. Global hata kutusu
6. Kalan bakiye ve özet kartları
7. Yeni gider ekleme formu
8. Harcama analiz grafiği
9. Son işlemler listesi
10. Finansal öneri kartı
11. Ay seçme modalı

Ekran `ScrollView` içindedir ve `RefreshControl` ile aşağı çekerek yenileme destekler. Yenileme sırasında hem bütçe verisi hem döviz kuru yeniden çekilir. `wait(800)` ile yenileme animasyonunun çok hızlı kapanması engellenir.

Çıkış butonu doğrudan çıkış yapmaz; önce `Alert.alert` ile kullanıcıya onay sorar. Onaylanırsa `supabase.auth.signOut()` çağrılır ve `App.tsx` oturum değişimini yakalayarak kullanıcıyı giriş ekranına döndürür.

## 10. Ay Yönetimi

Bütçe ekranı aylık dönem mantığıyla çalışır. Seçili ay `useBudget` içinde `selectedMonthKey` olarak tutulur. Format `YYYY-MM` şeklindedir.

Ay kartı şu bilgileri gösterir:

- Seçili ay etiketi: örneğin `Haziran 2026`
- Ayın tarih aralığı
- Toplam erişilebilir ay sayısı
- Önceki ay butonu
- Sonraki ay butonu
- Ay değiştirme butonu

Ay modalı yıllara göre gruplanmış ayları grid şeklinde sunar. Seçili ay zümrüt arka planla vurgulanır. Kullanıcının hesabının oluşturulduğu ay ilk bütçe ayı gibi davranır; ilk ayın başlangıcı tam ayın 1'i değil, kullanıcının oluşturulma tarihi olabilir.

## 11. Para Birimi ve Kur Takibi

Para birimleri `TRY`, `USD`, `EUR`, `GBP` olarak tanımlıdır. Kullanıcı bütçeyi istediği para biriminde görüntüleyebilir, ancak gelir ve gider girişleri TRY bazlıdır.

`src/lib/currency.ts` şu görevleri yapar:

- Frankfurter API'den TRY bazlı USD/EUR/GBP kurlarını çeker.
- Kurları AsyncStorage içinde `pocketwallet_exchange_rates_v1` anahtarıyla önbelleğe alır.
- API hata verirse fallback veya son kayıtlı kuru stale olarak kullanır.
- TRY tutarını seçili para birimine çevirir.
- Tutarları Türkçe locale ile iki ondalık basamaklı biçimlendirir.

`useExchangeRates` hook'u önce cache'i gösterir, sonra taze veriyi çekmeye çalışır. Başarısız olursa kullanıcıya `Güncel kur alınamadı, son kayıtlı kur gösteriliyor.` mesajı gösterilir.

## 12. Bütçe İş Mantığı

`src/hooks/useBudget.ts`, projenin en yoğun iş mantığı dosyasıdır. Bu hook şunları yönetir:

- Seçili para birimi
- Tüm giderler
- Tüm kategoriler
- Aylık gelirler
- Bütçe başlangıç tarihi
- Seçili ay
- Yerel veri yükleme durumu
- Supabase senkronizasyon durumu
- Kullanıcıya gösterilecek hata mesajı

Hook önce yerel snapshot okur. Kullanıcı oturumu varsa ardından Supabase'den şu verileri çeker:

- `user_settings`: para birimi ve ayarlar
- `expenses`: gider kayıtları
- `expense_categories`: kullanıcıya ait kategoriler

Veriler geldikten sonra state güncellenir. Kategori yoksa varsayılan kategoriler Supabase'e upsert edilir. Ayarlar yoksa `user_settings` satırı oluşturulur.

Yerel snapshot her state değişiminden sonra AsyncStorage'a yazılır. Böylece uygulama çevrimdışı ya da Supabase hatalıyken son bilinen veriyle devam edebilir.

## 13. Bütçe Hesaplamaları

`useBudget` içinde türetilmiş hesaplamalar `useMemo` ile yapılır:

- `selectedPeriod`: seçili ayın başlangıç ve bitiş tarihleri
- `monthOptions`: başlangıç ayından bugüne kadar tüm ay seçenekleri
- `periodExpenses`: yalnızca seçili ay aralığındaki giderler
- `defaultExpenseDate`: gider formuna verilecek varsayılan tarih
- `totalExpense`: seçili ayın toplam gideri
- `remainingBalance`: gelir eksi toplam gider
- `spendRatio`: toplam giderin gelire oranı
- `categoryStats`: her kategori için toplam tutar ve yüzde

Gider filtreleme ISO benzeri `YYYY-MM-DD` tarih string karşılaştırmasıyla yapılır. Bu formatta leksikografik sıralama tarih sıralamasıyla uyumludur.

## 14. Gelir Yönetimi

Gelir aylık tutulur. `monthlyIncomes` objesi ay anahtarını gelir tutarına bağlar:

```text
{
  "2026-06": 45000,
  "2026-07": 52000
}
```

`BalanceHeader` içinde gelir düzenleme alanı vardır. Kullanıcı kalem ikonuna basınca gelir input'u açılır. Geçersiz veya negatif değer girilirse hata gösterilir. Kaydedilen gelir TRY olarak yorumlanır ve seçili para biriminde görüntülenir.

Kodda dikkat edilmesi gereken nokta: `updateIncome` sadece local state'i günceller; Supabase `user_settings.monthly_income` alanı mevcut şemada tek değer gibi görünür ve aylık gelir haritasını doğrudan saklamaz. Yerel snapshot aylık gelirleri korur, fakat bulut tarafındaki aylık gelir kalıcılığı bu haliyle sınırlı olabilir.

## 15. Gider Ekleme

`src/components/ExpenseForm.tsx` yeni gider oluşturur. Form alanları:

- Gider açıklaması
- Tutar
- Tarih
- Kategori seçimi

Tutar girişi TRY olarak kabul edilir. Kullanıcı tutar yazınca USD/EUR/GBP karşılığı küçük bir önizleme olarak gösterilir. Bu önizleme seçili kur setini kullanır.

Submit sırasında kontroller:

- Açıklama boş olamaz.
- Tutar sayı olmalıdır.
- Tutar sıfırdan büyük olmalıdır.

Gider eklendiğinde `useBudget.addExpense` optimistic update yapar: kayıt önce ekranda görünür, sonra Supabase'e insert edilir. Supabase insert başarısız olursa gider yerelde kalır ve `pending` işaretiyle bekliyor olarak gösterilir.

## 16. Kategori Yönetimi

Varsayılan kategoriler `src/constants/categories.ts` içinde tanımlıdır:

- Faturalar
- Eğlence
- Okul
- Mutfak
- Ulaşım
- Giyim
- Diğer

Her kategori şunları taşır:

- `id`
- `name`
- `color`
- `softColor`
- `icon`
- `isDefault`

Kullanıcı yeni kategori ekleyebilir. Kategori modalında kategori adı, renk ve ikon seçilir. Renkler `CATEGORY_COLORS` listesinden gelir. İkonlar `ExpenseForm` içindeki `CATEGORY_ICON_OPTIONS` listesinden seçilir.

Kategori ekleme kontrolleri:

- Ad en az 2 karakter olmalıdır.
- Aynı isimde kategori tekrar eklenemez.
- İsim Türkçe locale'e göre normalize edilir.

Kategori silme kuralları:

- Kategori giderlerde kullanılıyorsa silinemez.
- En az bir kategori kalmalıdır.
- Default id ile başlayan kategoriler kullanıcı oturumu yoksa veya local default ise buluta delete gönderilmeden kaldırılır.
- Supabase delete başarısız olursa kategori geri yüklenir.

## 17. Bakiye Özet Bileşeni

`src/components/BalanceHeader.tsx`, ana finansal durumu gösterir.

Görsel olarak üç ana alan vardır:

- Büyük hero kart: kalan net bakiye
- Toplam gelir kartı
- Toplam gider kartı

Kalan bakiye pozitifse zümrüt, negatifse pembe/kırmızı tonla gösterilir. Para birimi TRY değilse TRY karşılığı ayrıca gösterilir. Hero kartın alt metni normal durumda kur tarihini, negatif bakiye durumunda bütçe aşımı uyarısını gösterir.

Gelir kartında düzenleme yapılabilir. Toplam gider kartı giderin gelire oranını yüzde olarak gösterir.

## 18. Harcama Analiz Grafiği

`src/components/DonutChart.tsx` adı donut olsa da teknik olarak merkezden başlayan pie slice path'leri çizer. Grafik `react-native-svg` ile oluşturulur.

Grafik matematiği:

- Merkez: `60`
- Radius: `50`
- Her kategori için açı: `(kategoriToplamı / toplamGider) * 360`
- `polarToCartesian` açıları SVG koordinatlarına dönüştürür.
- `createPieSlicePath` her dilim için SVG path üretir.

Harcama yoksa boş durum gösterilir: `Henüz harcama yok`. Harcama varsa grafik, toplam tutar, kompakt legend ve detaylı kategori listesi görünür. Detaylı listede her kategori için yüzde, progress bar ve tutar bulunur.

## 19. Son İşlemler Listesi

`src/components/TransactionList.tsx`, seçili ayın giderlerini listeler.

Özellikler:

- Arama kutusu
- `Hepsi` filtresi
- Kategori filtreleri
- Boş durum ekranı
- Gider kartları
- Silme butonu
- Pending durum etiketi

Arama hem gider başlığında hem kategori adında çalışır. Türkçe locale ile küçük harfe dönüştürme yapılır. Her gider satırında kategori ikonu, başlık, kategori adı, tarih, tutar ve silme ikonu vardır.

Para birimi TRY değilse satırda seçili para birimiyle birlikte TRY karşılığı da gösterilir.

## 20. Kategori İkon Sistemi

`src/components/CategoryIcon.tsx`, string ikon adını Lucide ikon bileşenine çevirir. Örneğin:

- `zap`: fatura/enerji hissi
- `gamepad`: eğlence
- `book`: okul
- `utensils`: mutfak
- `car`: ulaşım
- `shirt`: giyim
- `briefcase`: genel/fallback

Bilinmeyen ikon adı gelirse `BriefcaseBusiness` fallback olarak render edilir. Bu sayede veritabanında beklenmeyen ikon string'i olsa bile UI kırılmaz.

## 21. Yerel Depolama

`src/lib/storage.ts` bütçe snapshot'ını AsyncStorage'a yazar ve okur.

Anahtar formatı:

```text
pocketwallet_budget_v1:<userId>
pocketwallet_budget_v1:guest
```

Oturumlu kullanıcı ve misafir/oturumsuz durum ayrı anahtarlarla tutulur. JSON parse hatası olursa bozuk kayıt silinir ve `null` döner.

Snapshot içinde şunlar saklanır:

- Gelir
- Para birimi
- Giderler
- Kategoriler
- Bütçe başlangıç tarihi
- Aylık gelir haritası
- Güncellenme tarihi

Bu yaklaşım hızlı açılış, offline tolerans ve Supabase hatalarında kullanıcı deneyiminin devam etmesini sağlar.

## 22. Supabase Bağlantısı

`src/lib/supabase.ts` Supabase istemcisini oluşturur. React Native için iki önemli import en başta yapılır:

- `react-native-get-random-values`
- `react-native-url-polyfill/auto`

Supabase auth ayarları:

- `storage: AsyncStorage`
- `autoRefreshToken: true`
- `persistSession: true`
- `detectSessionInUrl: false`

Bu ayarlar mobil uygulamada oturumun cihazda kalıcı tutulmasını ve token yenilemenin otomatik yapılmasını sağlar.

## 23. Supabase Veritabanı Şeması

Supabase MCP üzerinden `PocketWallet` projesinin public şeması doğrulandı. RLS tüm tablolarda açık görünüyor.

### `public.user_settings`

Kullanıcı ayarlarını tutar.

- Primary key: `user_id`
- Foreign key: `user_id -> auth.users.id`
- `monthly_income`: numeric, varsayılan `0`, negatif olamaz
- `currency`: text, varsayılan `TRY`, sadece `TRY`, `USD`, `EUR`, `GBP`
- `updated_at`: timestamp

Kod bu tabloyu para birimi ve ilk kullanıcı ayarı için kullanır. Aylık gelirler istemci tarafında `monthlyIncomes` olarak tutulduğu için tablo tarafında daha gelişmiş aylık gelir modeli gerekebilir.

### `public.expenses`

Gider kayıtlarını tutar.

- Primary key: `id`
- Foreign key: `user_id -> auth.users.id`
- `title`: boş olamaz
- `amount`: sıfırdan büyük olmalıdır
- `category`: boş olamaz
- `spent_on`: tarih, varsayılan güncel tarih
- `created_at`: oluşturulma zamanı
- `updated_at`: güncellenme zamanı

Kod giderleri `spent_on` ve `created_at` alanlarına göre tersten sıralayarak çeker.

### `public.expense_categories`

Kullanıcı kategorilerini tutar.

- Primary key: `id`
- Foreign key: `user_id -> auth.users.id`
- `name`: boş olamaz
- `color`: ana renk
- `soft_color`: yarı saydam arka plan rengi
- `icon`: Lucide ikon string'i
- `is_default`: varsayılan kategori mi
- `created_at`
- `updated_at`

Kod kategori yoksa default kategorileri bu tabloya upsert eder.

### `public.users`

Kullanıcı profil bilgisini tutar.

- Primary key: `id`
- Foreign key: `id -> auth.users.id`
- `full_name`
- `email`, unique
- `created_at`
- `updated_at`

İstemci kodu şu anda bu tabloyu doğrudan okumuyor. Kayıt sırasında ad-soyad Auth metadata içine yazılıyor; profil tablosuna yazma muhtemelen Supabase tarafındaki trigger/policy ile sağlanıyor olabilir.

## 24. Tip Sistemi

`src/types/budget.ts` uygulamanın ortak domain tiplerini içerir:

- `CurrencyCode`: desteklenen para birimleri
- `CategoryName`: string alias
- `ExpenseCategory`: kategori modeli
- `Expense`: gider modeli
- `BudgetPeriod`: aylık dönem modeli
- `BudgetSnapshot`: yerel cache modeli
- `CategoryStat`: grafik istatistiği modeli
- `CurrencyOption`: para birimi seçeneği
- `ExchangeRates`: kur seti modeli

Tiplerin sade olması bileşenler arası veri geçişini kolaylaştırır. `CategoryName` string olduğu için kullanıcı tanımlı kategoriler doğal biçimde desteklenir.

## 25. UI Tasarım Dili

PocketWallet görsel olarak koyu, premium ve finans paneli hissi veren bir tasarıma sahiptir.

Ana renkler:

- Arka plan: `#020617`, çok koyu lacivert/siyah
- Kart zemini: `rgba(15, 23, 42, 0.78-0.88)`
- Border: `#1e293b` ve yarı saydam slate tonları
- Ana vurgu: `#34d399`, zümrüt yeşili
- İkincil vurgu: `#5eead4`, turkuaz
- Gider/negatif vurgu: `#fb7185`
- Uyarı: `#fbbf24`
- Metin: `#f8fafc`, `#cbd5e1`, `#94a3b8`, `#64748b`

Arka planda iki glow katmanı vardır:

- Üst sağda yeşil/zümrüt glow
- Alt sol veya alt bölgede mor glow

Bu glow'lar düz koyu arka planı yumuşatır ve uygulamaya derinlik verir. Kartlar yuvarlatılmış köşeler, ince border ve yarı saydam koyu zeminle cam benzeri bir görünüm oluşturur.

## 26. UX Akışı

Kullanıcı deneyimi tek ana ekran mantığına dayanır. Kullanıcı giriş yaptıktan sonra sayfa değiştirmeden her şeyi aynı ekranda yapabilir:

1. Ayı seçer.
2. Para birimini görür veya değiştirir.
3. Geliri düzenler.
4. Gider ekler.
5. Kategorileri yönetir.
6. Harcama dağılımını inceler.
7. İşlemleri arar, filtreler veya siler.
8. Finansal öneriyi okur.

Bu akış küçük ekranlarda hızlı kullanılabilirlik sağlar. Ancak ekran çok fazla işlev taşıdığı için içerik uzundur; bu yüzden ScrollView, küçük kartlar ve aralıklı bölümler kullanılmıştır.

## 27. Boş Durumlar ve Hata Durumları

Uygulama önemli boş ve hata durumlarını kullanıcıya gösterir:

- Giriş/kayıt doğrulama hataları auth kartında gösterilir.
- Supabase veri çekme hatası ana ekranda sarı uyarı kutusu olarak gösterilir.
- Kur API hatası kur başlığının altında uyarı olarak gösterilir.
- Harcama yoksa grafik alanı boş durum mesajı gösterir.
- Filtre sonucu gider yoksa işlem listesi boş durum mesajı gösterir.
- Kategori silinemiyorsa veya duplicate kategori varsa hata mesajı state'e yazılır.
- Gider buluta yazılamazsa yerel kayıt korunur ve işlem `bekliyor` olarak işaretlenir.

Bu yaklaşım kullanıcı verisini kaybetmemeye odaklanır.

## 28. Veri Akışı Özeti

Uygulama açılış akışı:

```text
App.tsx
  -> Supabase session kontrolü
  -> AuthScreen veya BudgetScreen
```

Bütçe ekranı veri akışı:

```text
BudgetScreen
  -> useBudget
      -> AsyncStorage snapshot oku
      -> Supabase user_settings / expenses / expense_categories oku
      -> state güncelle
      -> snapshot yaz
  -> useExchangeRates
      -> cached kur oku
      -> Frankfurter API'den taze kur çek
      -> cache yaz
```

Gider ekleme akışı:

```text
ExpenseForm
  -> onAddExpense
  -> useBudget.addExpense
  -> local state'e hemen ekle
  -> Supabase expenses insert
  -> başarısızsa pending olarak bırak
```

Kategori ekleme akışı:

```text
ExpenseForm modal
  -> onAddCategory
  -> useBudget.addCategory
  -> isim doğrula
  -> duplicate kontrolü
  -> local state'e ekle
  -> Supabase expense_categories insert
```

Kur gösterim akışı:

```text
currency.ts
  -> TRY tutarı al
  -> seçili kura çevir
  -> tr-TR locale ile formatla
```

## 29. Güçlü Yanlar

- Kod okunabilir şekilde katmanlara ayrılmış.
- UI bileşenleri domain hook'larından ayrılmış.
- Supabase ve AsyncStorage birlikte kullanılarak offline tolerans sağlanmış.
- Gider ekleme optimistic çalışıyor.
- Kategori sistemi kullanıcıya esneklik veriyor.
- Çoklu para birimi gösterimi kullanıcıya finansal bağlam kazandırıyor.
- Koyu tema ve güçlü vurgu renkleri tutarlı.
- Modal, filtre, arama, refresh gibi mobil UX parçaları mevcut.

## 30. Dikkat Edilmesi Gereken Noktalar

- `assets` klasöründeki ikon dosyaları repo içinde görünmüyorsa build öncesi eklenmeli.
- `package.json` içindeki `main: index.ts` ile repo içinde görünen dosyalar tutarlı hale getirilmeli.
- `DEFAULT_INCOME` sabiti tanımlı ama mevcut akışta kullanılmıyor.
- `DonutChart` bileşeninin adı donut olmasına rağmen çizim pie chart gibi merkez dolu dilimler üretir.
- Gelir bulut modelinde aylık gelirleri tam karşılayan ayrı bir tablo veya JSON alanı yok gibi görünüyor.
- `updateCurrency` Supabase'e upsert ederken `monthly_income: 0` gönderiyor; bu durum tek alanlı gelir modeli kullanılıyorsa mevcut geliri sıfırlama riski yaratabilir.
- Tarih input'u düz metin olarak alınır; kullanıcı yanlış format yazarsa UI bunu doğrudan kullanır.
- Supabase RLS açık, fakat policy detayları repo içinde yer almıyor. Güvenlik davranışı Supabase panelindeki policy'lere bağlı.

## 31. Genel Değerlendirme

PocketWallet küçük ama işlevsel bir kişisel bütçe uygulamasıdır. Proje, tek ekranlı mobil finans paneli yaklaşımıyla gereksiz navigasyonu azaltır. Kod tarafında ana mantık `useBudget` hook'unda yoğunlaşır; görsel bileşenler ise form, grafik, liste ve bakiye özeti olarak ayrılmıştır. Tasarım dili koyu tema, zümrüt vurgu, yuvarlatılmış kartlar, ikon destekli kategori sistemi ve finans paneli hissi üzerine kuruludur.

Uygulama mevcut haliyle giriş/kayıt, aylık bütçe görüntüleme, gelir düzenleme, gider ekleme/silme, kategori yönetimi, kur takibi, grafik analizi ve işlem filtreleme gibi temel kişisel finans ihtiyaçlarını karşılar. Geliştirme açısından en önemli sonraki adımlar varlık dosyalarının doğrulanması, aylık gelirlerin bulutta doğru modellenmesi, tarih seçiminin gerçek date picker ile güçlendirilmesi ve grafik adlandırmasının/çiziminin netleştirilmesidir.
