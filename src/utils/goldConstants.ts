
export interface GoldTypeDefinition {
  id: string;
  label: string;
  multiplier: number; // 24 Ayar karşılığı gram çarpanı
  category: 'GRAM' | 'SIKKE' | 'BILEZIK' | 'TAKI';
  defaultCarat?: number;
}

export const GOLD_TYPES: GoldTypeDefinition[] = [
  // GRAMLAR
  { id: 'GRAM_24', label: '24 Ayar Gram', multiplier: 1, category: 'GRAM', defaultCarat: 24 },
  { id: 'GRAM_22', label: '22 Ayar Gram', multiplier: 0.9166, category: 'GRAM', defaultCarat: 22 },
  { id: 'GRAM_18', label: '18 Ayar Gram', multiplier: 0.750, category: 'GRAM', defaultCarat: 18 },
  { id: 'GRAM_14', label: '14 Ayar Gram', multiplier: 0.5833, category: 'GRAM', defaultCarat: 14 },

  // SİKKELER (Adet bazlı)
  { id: 'CEYREK', label: 'Çeyrek Altın', multiplier: 1.6065, category: 'SIKKE', defaultCarat: 22 },
  { id: 'YARIM', label: 'Yarım Altın', multiplier: 3.213, category: 'SIKKE', defaultCarat: 22 },
  { id: 'TAM', label: 'Tam Altın', multiplier: 6.426, category: 'SIKKE', defaultCarat: 22 },
  { id: 'ATA', label: 'Ata Altın', multiplier: 6.608, category: 'SIKKE', defaultCarat: 22 },
  { id: 'CUMHURIYET', label: 'Cumhuriyet Altını', multiplier: 6.608, category: 'SIKKE', defaultCarat: 22 },
  { id: 'GREMSE', label: 'Gremse Altın', multiplier: 16.065, category: 'SIKKE', defaultCarat: 22 },
  { id: 'RESAT', label: 'Reşat Altın', multiplier: 6.608, category: 'SIKKE', defaultCarat: 22 },
  { id: 'BESLI', label: 'Beşi Bir Arada', multiplier: 33.04, category: 'SIKKE', defaultCarat: 22 },

  // BİLEZİKLER
  { id: 'BILEZIK_22', label: '22 Ayar Bilezik', multiplier: 0.9166, category: 'BILEZIK', defaultCarat: 22 },
  { id: 'BILEZIK_14', label: '14 Ayar Bilezik', multiplier: 0.5833, category: 'BILEZIK', defaultCarat: 14 },

  // TAKILAR
  { id: 'TAKI_22', label: '22 Ayar Takı', multiplier: 0.9166, category: 'TAKI', defaultCarat: 22 },
  { id: 'TAKI_14', label: '14 Ayar Takı', multiplier: 0.5833, category: 'TAKI', defaultCarat: 14 },
  { id: 'TAKI_8', label: '8 Ayar Takı', multiplier: 0.3333, category: 'TAKI', defaultCarat: 8 },
];

export const BILEZIK_MODELS = [
  'Ajda',
  'Adana Burması',
  'Trabzon Hasırı',
  'Mega',
  'Şarnel',
  'İşçilikli',
  'Düz/Hediyelik'
];

export const TAKI_TYPES = [
  'Kolye',
  'Küpe',
  'Yüzük',
  'Set',
  'Zincir',
  'Kelepçe'
];

export const getGoldType = (id: string) => GOLD_TYPES.find(t => t.id === id);

export const calculatePureGoldWeight = (typeId: string, amount: number, weightPerUnit?: number) => {
  const type = getGoldType(typeId);
  if (!type) return 0;

  if (type.category === 'SIKKE') {
    return amount * type.multiplier;
  }

  if (type.category === 'BILEZIK' || type.category === 'TAKI') {
    // amount is quantity, weightPerUnit is grams per item
    return amount * (weightPerUnit || 0) * type.multiplier;
  }

  // GRAM category: amount is total weight
  return amount * type.multiplier;
};
