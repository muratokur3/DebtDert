import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const termsContent = `
# Kullanım Koşulları

Son Güncelleme: 1 Ocak 2024

Lütfen DebtDert uygulamasını kullanmadan önce bu kullanım koşullarını dikkatlice okuyunuz.

1. Taraflar ve Sözleşmenin Konusu
Bu sözleşme, DebtDert ("Uygulama") hizmetlerini kullanan gerçek veya tüzel kişiler ("Kullanıcı") ile uygulamanın sahibi arasındaki hak ve yükümlülükleri düzenler.

2. Hizmetin Kapsamı
DebtDert, kullanıcıların aralarındaki alacak-verecek hesaplarını dijital ortamda takip etmelerini sağlayan bir araçtır. Uygulama hiçbir şekilde bir banka, ödeme kuruluşu veya tahsilat kurumu değildir. Uygulama üzerinden gerçek para transferi yapılmaz.

3. Kullanıcı Yükümlülükleri
- Kullanıcı, uygulamayı kullanırken girdiği verilerin doğruluğundan sorumludur.
- Kullanıcı, oluşturduğu borç kayıtlarında hileli, yanıltıcı veya hukuka aykırı işlemler yapmamayı kabul eder.
- Kayıtlar tarafların kendi rızasıyla tutulur; uygulama bu kayıtların yasal geçerliliğini garanti etmez.

4. Sorumluluğun Sınırlandırılması
Uygulama, verilerin güvenliğini sağlamak için gerekli tedbirleri (Firebase altyapısı, vb.) alır. Ancak teknik aksaklıklar veya veri kaybı durumlarında uygulamanın doğrudan veya dolaylı maddi/manevi zararlardan sorumluluğu yoktur.

5. Değişiklikler
DebtDert, bu kullanım koşullarını dilediği zaman değiştirme hakkını saklı tutar.

Kabul Beyanı:
Uygulamaya telefon numaranız ile giriş yaparak bu kullanım koşullarını kabul etmiş sayılırsınız.
`;

const privacyContent = `
# Gizlilik Politikası

Son Güncelleme: 1 Ocak 2024

DebtDert olarak kişisel verilerinizin gizliliğine ve güvenliğine önem veriyoruz. Bu politika, hangi verileri nasıl topladığımızı ve kullandığımızı açıklar.

1. Toplanan Veriler
- **Kayıt Bilgileri:** Telefon numarası, ad soyad ve (varsa) profil fotoğrafı.
- **İşlem Verileri:** Uygulama içerisinde oluşturduğunuz borç, alacak ve ödeme kayıtları.
- **Cihaz ve Kullanım Verileri:** Uygulamayı kullanım sıklığınız, IP adresi ve cihaz bilgileri (hata tespiti ve güvenlik amacıyla).

2. Verilerin Kullanım Amacı
- Hesabınızı oluşturmak ve güvenliğini sağlamak (Telefon numarası ile doğrulama).
- Diğer kullanıcılarla eşleşmenizi sağlamak (Rehber senkronizasyonu onayınız halinde).
- Uygulama içi özelliklerin sorunsuz çalışmasını sağlamak.
- Yasal zorunluluklar gerektirdiğinde yetkili mercilere bilgi vermek.

3. Veri Paylaşımı ve Aktarımı
Kişisel verileriniz 3. şahıslara veya reklam şirketlerine SATILMAZ. Sadece uygulamanın altyapısını sağlayan güvenilir iş ortakları (Örn: Google Firebase) ile, güvenli protokoller çerçevesinde paylaşılır.

4. Veri Saklama ve Hesap Silme
Kayıtlarınız, hesabınız aktif olduğu sürece saklanır. Ayarlar > Gizlilik bölümünden "Hesabı Sil" işlemini başlattığınızda;
- Kendi oluşturduğunuz ve sadece size ait veriler tamamen silinir.
- Karşı tarafla ortak olduğunuz borç kayıtları (karşı tarafın mağdur olmaması adına) isminiz gizlenerek (anonimleştirilerek) korunur.

5. Haklarınız (GDPR / KVKK Uyarınca)
Verilerinize erişme, düzeltme, dışa aktarma ve silme hakkına sahipsiniz. Veri talepleriniz için uygulama içindeki "Hesap Verileri Talebi" özelliğini kullanabilirsiniz.
`;

const LegalModal = ({ isOpen, onClose, title, content }: ModalProps & { title: string, content: string }) => {
    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[70] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, y: "100%" }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="relative w-full sm:max-w-2xl bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()} // Prevent backdrop click from closing
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-surface z-10 px-6 py-4 border-b border-border flex items-center justify-between">
                            <h2 className="text-xl font-bold text-text-primary">{title}</h2>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full bg-background text-text-secondary hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="p-6 overflow-y-auto overscroll-contain text-text-primary">
                            <div className="prose dark:prose-invert max-w-none">
                                {content.split('\n').map((line, index) => {
                                    if (line.startsWith('# ')) {
                                        return <h3 key={index} className="text-lg font-bold text-text-primary mt-4 mb-2">{line.replace('# ', '')}</h3>;
                                    } else if (line.startsWith('- ')) {
                                        return <li key={index} className="ml-4 mb-1">{line.replace('- ', '')}</li>;
                                    } else if (line.trim() === '') {
                                        return <br key={index} />;
                                    }
                                    return <p key={index} className="mb-2 leading-relaxed text-sm sm:text-base">{line}</p>;
                                })}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export const TermsOfServiceModal = (props: ModalProps) => (
    <LegalModal {...props} title="Kullanım Koşulları" content={termsContent} />
);

export const PrivacyPolicyModal = (props: ModalProps) => (
    <LegalModal {...props} title="Gizlilik Politikası" content={privacyContent} />
);
