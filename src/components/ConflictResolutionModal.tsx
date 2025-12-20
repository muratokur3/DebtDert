import { useState } from 'react';
import type { Contact } from '../types';

interface Conflict {
  newContact: Partial<Contact>;
  existingContact: Contact;
}

interface Resolution {
  [key: string]: 'update' | 'skip';
}

interface ConflictResolutionModalProps {
  conflicts: Conflict[];
  onResolve: (resolutions: Resolution) => void;
  onCancel: () => void;
}

export const ConflictResolutionModal = ({ conflicts, onResolve, onCancel }: ConflictResolutionModalProps) => {
  const [resolutions, setResolutions] = useState<Resolution>({});

  const handleResolutionChange = (phoneNumber: string, resolution: 'update' | 'skip') => {
    setResolutions(prev => ({ ...prev, [phoneNumber]: resolution }));
  };

  const handleProcess = () => {
    onResolve(resolutions);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface p-6 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col relative">
        <h2 className="text-xl font-bold mb-4 text-text-primary">
          Çakışan Kişileri Yönet
        </h2>

        <div className="overflow-y-auto flex-1 space-y-2 mb-4 pr-2">
          <p className="text-sm text-text-secondary mb-2">
            Bazı kişiler rehberinizde zaten kayıtlı. Her bir kişi için ne yapmak istediğinizi seçin.
          </p>
          {conflicts.map(({ newContact, existingContact }) => (
            <div key={existingContact.phoneNumber} className="p-3 bg-background rounded-lg border border-border">
              <div className="font-medium text-text-primary mb-2">
                {newContact.name} ({newContact.phoneNumber})
              </div>
              <div className="text-sm text-text-secondary mb-2">
                Mevcut kayıt: {existingContact.name}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleResolutionChange(existingContact.phoneNumber, 'update')}
                  className={`px-3 py-1 text-sm font-semibold rounded-md ${resolutions[existingContact.phoneNumber] === 'update' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-700'}`}
                >
                  Güncelle
                </button>
                <button
                  onClick={() => handleResolutionChange(existingContact.phoneNumber, 'skip')}
                  className={`px-3 py-1 text-sm font-semibold rounded-md ${resolutions[existingContact.phoneNumber] === 'skip' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-700'}`}
                >
                  Atla
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-medium border border-border text-text-primary hover:bg-background transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleProcess}
            className="flex-1 py-3 rounded-xl font-semibold bg-primary text-white hover:bg-blue-600 active:scale-95 transition-all"
          >
            İşlemi Tamamla
          </button>
        </div>
      </div>
    </div>
  );
};
