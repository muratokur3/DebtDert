DebtDert - Borç ve Ödeme Manifestosu (Debt Logic)

1. Borç Yaşam Döngüsü (Lifecycle)

1.1. Oluşturma (Creation)

Görünürlük: Borcu giren kişi (Creator), kaydı anında "Hesap Defterim"de görür ve bakiyesine yansır.

Karşı Taraf: Karşı taraf (Receiver), kaydı sadece "Gelen İstekler" kutusunda görür. Onaylayana kadar bakiyesine yansımaz.

Zorunlu Alanlar: Tutar, Para Birimi, Karşı Taraf (Telefon), Borç Tipi (Alacak/Verecek).

1.2. Onay Mekanizması (Approval)

Onay (ACTIVE): Karşı taraf onaylarsa borç resmileşir. İki tarafın da bakiyesinde görünür.

Red (REJECTED): Karşı taraf reddederse, Creator'a bildirim gider. Kayıt "İptal Edildi" statüsüne geçer (Silinmez, tarihçede kalır).

1.3. Ödeme Süreci (Payments)

Kim Ödeme Ekleyebilir?

Alacaklı (Lender): Ödeme eklerse işlem anında onaylanır ve bakiye düşer.

Borçlu (Borrower): Ödeme eklerse bu bir "Ödeme Bildirimi"dir. Alacaklı onaylayana kadar bakiye düşmez (Güvenlik Kuralı).

Kısmi Ödeme: Borçlar parça parça ödenebilir.

remainingAmount asla originalAmounttan büyük olamaz.

remainingAmount 0 olduğunda statü otomatik PAID (Kapandı) olur.

2. Silme ve Arşivleme (Deletion)

Çöp Kutusu (Soft Delete): Hiçbir finansal veri veritabanından tamamen silinmez (Hard Delete yok). isDeleted: true işareti alarak Çöp Kutusuna gider.

Kim Silebilir?

PENDING durumunda: Sadece oluşturan (Creator) silebilir.

ACTIVE durumunda: Silme işlemi yapılamaz. Sadece "Borç Kapatıldı" (Ödendi) yapılabilir veya "İptal" edilebilir (Karşı tarafın onayı gerekebilir - Opsiyonel).

REJECTED durumunda: Oluşturan kişi arşivleyebilir.

3. Taksitlendirme (Installments)

Borç girilirken "Taksitli" seçeneği seçilirse;

Ana borç tek bir kayıt (Debt) olarak tutulur.

Altına installments array'i eklenir.

Ödeme yapıldıkça, vadesi en yakın olan taksitten düşülür.