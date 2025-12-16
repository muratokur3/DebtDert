DebtDert - Kimlik ve Rehber Manifestosu (Identity)

1. Kişi Tanımlama ve Görünüm (Smart Display Name)

Sistemde bir kişinin isminin nasıl görüneceği şu katı hiyerarşiye bağlıdır:

Kişisel Rehber İsmi (Private Contact Name):

Eğer ben o numarayı rehberime "Tesisatçı Ali" diye kaydettiysem, her yerde (borç listesinde, detayda) öyle görürüm.

Sistem İsmi (Public Display Name):

Rehberimde yoksa ama kişi DebtDert üyesi ise, onun kendi profilinde belirlediği isim ("Ali Yılmaz") görünür.

Manuel İsim (Shadow Name):

Üye değilse ve rehberimde yoksa, borcu ilk oluştururken girdiğim isim ("Ali") görünür.

Ham Numara:

Hiçbiri yoksa +90 555... görünür.

2. Rehber Mimarisi (Contact Architecture)

Depolama: Rehber verisi asla users dökümanı içinde saklanmaz.

Path: users/{userId}/contacts/{contactId} (Alt Koleksiyon).

Otomatik Kayıt: Kullanıcı "Hızlı İşlem"den veya "Yeni Borç" ekranından yeni bir numara ile işlem yaparsa, sistem bu numarayı ve ismi otomatik olarak contacts koleksiyonuna kaydeder.

3. Gölge Kullanıcı ve Veri Sahiplenme (Data Claiming)

Gölge Kullanıcı (Shadow User): Sisteme henüz kayıt olmamış ama üzerine borç yazılmış telefon numarasıdır.

Sahiplenme (Claiming):

Bir kullanıcı kayıt olduğunda (Register), sistem debts tablosunu tarar.

Kullanıcının telefon numarasına (+90...) yazılmış ama uidsi boş olan kayıtları bulur.

Bu kayıtları yeni kullanıcının uidsi ile günceller.

Böylece kullanıcı ilk girişinde geçmiş borçlarını görür.

4. Profil Kuralları

Kullanıcı telefon numarasını değiştiremez (Kimliktir).

E-posta adresini değiştirebilir (Sadece iletişim içindir).

Profil fotoğrafı yükleyebilir (Firebase Storage).