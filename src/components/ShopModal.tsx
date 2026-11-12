import { Award, Camera, Coffee, Coins, Crown, Glasses, Palette, Store, X } from 'lucide-react';
import { SHOP_ITEMS } from '../data/dkvData';

interface ShopModalProps {
  playerCoins: number;
  unlockedItems: Set<string>;
  equippedItem: string | null;
  onClose: () => void;
  onBuyItem: (itemId: string) => void;
  onEquipItem: (itemId: string) => void;
}

function renderShopIcon(iconName: string) {
  switch (iconName) {
    case 'palette':
      return <Palette className="w-5 h-5" />;
    case 'glasses':
      return <Glasses className="w-5 h-5" />;
    case 'camera':
      return <Camera className="w-5 h-5" />;
    case 'crown':
      return <Crown className="w-5 h-5" />;
    case 'coffee':
      return <Coffee className="w-5 h-5" />;
    default:
      return <Award className="w-5 h-5" />;
  }
}

export function ShopModal({
  playerCoins,
  unlockedItems,
  equippedItem,
  onClose,
  onBuyItem,
  onEquipItem,
}: ShopModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65">
      <div className="surface-panel rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border-4 border-white animate-pop">
        <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-t-2xl flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Store className="w-6 h-6" /> Kantin Edublox & Studio Aksesoris
            </h2>
            <p className="text-xs text-amber-100">
              Tukarkan koin dari jawaban benar dengan aksesoris kreatif 3D untuk avatar!
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-xl bg-white text-amber-900 font-display font-bold text-sm inline-flex items-center gap-1.5 tabular-nums">
              <Coins className="w-4 h-4 text-yellow-500" /> {playerCoins} Koin
            </span>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/20 text-white font-bold flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto custom-scroll grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {SHOP_ITEMS.map((item) => {
            const unlocked = unlockedItems.has(item.id);
            const equipped = equippedItem === item.id;
            return (
              <div
                key={item.id}
                className={`rounded-2xl border-2 p-4 flex flex-col justify-between gap-2 ${
                  unlocked ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
                    {renderShopIcon(item.icon)}
                  </div>
                  <h4 className="font-display font-bold text-sm text-slate-900">{item.name}</h4>
                  <p className="text-xs text-slate-600 mt-1">{item.desc}</p>
                </div>
                <div className="pt-2">
                  {unlocked ? (
                    <button
                      onClick={() => onEquipItem(item.id)}
                      className={`w-full py-2 rounded-xl font-bold text-xs cursor-pointer ${
                        equipped ? 'bg-slate-800 text-white' : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {equipped ? 'Sedang Dipakai P1' : 'Pasang ke Avatar P1'}
                    </button>
                  ) : (
                    <button
                      onClick={() => onBuyItem(item.id)}
                      className="btn-blox w-full py-2 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Coins className="w-3.5 h-3.5" /> Buka ({item.price} Koin)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
