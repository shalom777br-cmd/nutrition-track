import { useState, FormEvent } from "react";
import { FoodItem, NutritionalMetrics, NUTRIENT_LABELS, NUTRIENT_UNITS } from "../types";
import { Plus, Trash2, ChevronDown, ChevronUp, Layers, HelpCircle, UtensilsCrossed } from "lucide-react";
import { createEmptyNutritionalMetrics } from "../utils/nutrition";

interface PortionListProps {
  items: FoodItem[];
  onAddItem: (item: Omit<FoodItem, "id">) => void;
  onDeleteItem: (id: string) => void;
  onUpdateMultiplier: (id: string, multiplier: number) => void;
}

export default function PortionList({ items, onAddItem, onDeleteItem, onUpdateMultiplier }: PortionListProps) {
  // Expanded item state to reveal full nutrition details per ingredient
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Manual input form state
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [originalName, setOriginalName] = useState("");
  const [japaneseName, setJapaneseName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1人前");
  const [source, setSource] = useState<"text" | "receipt" | "image">("text");

  // Manual nutrition values
  const [calories, setCalories] = useState("200");
  const [protein, setProtein] = useState("15");
  const [fat, setFat] = useState("5");
  const [carbs, setCarbs] = useState("25");
  const [fiber, setFiber] = useState("2");
  const [vitaminC, setVitaminC] = useState("10");
  const [calcium, setCalcium] = useState("50");
  const [iron, setIron] = useState("1.5");

  const toggleExpand = (id: string) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!originalName || !japaneseName) return;

    const customNutrition: NutritionalMetrics = {
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      fat: parseFloat(fat) || 0,
      carbohydrates: parseFloat(carbs) || 0,
      vitaminA: 40, // standard default fallback
      vitaminB1: 0.1,
      vitaminB2: 0.1,
      vitaminB6: 0.1,
      vitaminB12: 0.2,
      vitaminC: parseFloat(vitaminC) || 0,
      vitaminD: 0.1,
      vitaminE: 0.5,
      iron: parseFloat(iron) || 0,
      calcium: parseFloat(calcium) || 0,
      zinc: 0.8,
      fiber: parseFloat(fiber) || 0,
    };

    onAddItem({
      originalName,
      japaneseName,
      price: parseFloat(price) || 0,
      quantity,
      source,
      nutrition: customNutrition,
    });

    // Reset fields
    setOriginalName("");
    setJapaneseName("");
    setPrice("");
    setQuantity("1人前");
    setIsAddingManual(false);
  };

  const getSourceStyle = (src: FoodItem["source"]) => {
    switch (src) {
      case "receipt":
        return "bg-clay/10 text-clay-text ring-clay/10";
      case "image":
        return "bg-sage/20 text-olive ring-sage/10";
      case "voice":
        return "bg-olive/10 text-olive ring-olive/5";
      default:
        return "bg-slate-100 text-slate-700 ring-slate-100";
    }
  };

  const getSourceLabel = (src: FoodItem["source"]) => {
    switch (src) {
      case "receipt":
        return "レシートOCR";
      case "image":
        return "写真解析";
      case "voice":
        return "音声入力";
      default:
        return "手動/メモ";
    }
  };

  return (
    <div className="card bg-white/85 p-4 shadow-sm space-y-4">
      <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
        <div>
          <h3 className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5 font-serif">
            <UtensilsCrossed className="w-4 h-4 text-olive animate-pulse" />
            食品リスト ＆ 内訳表示
          </h3>
          <p className="text-[10px] text-slate-500">
            スキャンされた商品の言語正規化と成分詳細
          </p>
        </div>

        <button
          onClick={() => setIsAddingManual(!isAddingManual)}
          className="flex items-center gap-1 bg-sage/15 hover:bg-sage/25 border border-sage/10 text-olive text-[10px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          手動追加
        </button>
      </div>

      {/* Manual Quick Add Form */}
      {isAddingManual && (
        <form onSubmit={handleSubmit} className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 space-y-4 font-sans text-xs">
          <div className="border-b border-slate-200/60 pb-2 flex justify-between items-center">
            <span className="font-semibold text-slate-700">お好きな食品の追加</span>
            <button
              type="button"
              onClick={() => setIsAddingManual(false)}
              className="text-slate-400 hover:text-slate-650"
            >
              閉じる
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-500 font-medium mb-1">ポルトガル語名 / 元の名前</label>
              <input
                type="text"
                required
                value={originalName}
                onChange={(e) => setOriginalName(e.target.value)}
                placeholder="例: pão francês, frango grelhado..."
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-olive focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-medium mb-1">日本語名 / 正規化翻訳</label>
              <input
                type="text"
                required
                value={japaneseName}
                onChange={(e) => setJapaneseName(e.target.value)}
                placeholder="例: フランスパン, 鶏肉グリル..."
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-olive focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-500 font-medium mb-1">価格 (R$)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-olive focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-medium mb-1">分量</label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1人前, 200g..."
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-medium mb-1">入力ソース</label>
              <select
                value={source}
                onChange={(e: any) => setSource(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none"
              >
                <option value="text">手動メモ</option>
                <option value="receipt">レシート</option>
                <option value="image">食品写真</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-200/60 pt-3">
            <span className="text-[10px] font-bold text-slate-400 block mb-2 uppercase">主な含有栄養素 (推定値)</span>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">カロリー (kcal)</label>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">タンパク質 (g)</label>
                <input
                  type="number"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">脂質 (g)</label>
                <input
                  type="number"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">炭水化物 (g)</label>
                <input
                  type="number"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">食物繊維 (g)</label>
                <input
                  type="number"
                  value={fiber}
                  onChange={(e) => setFiber(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">主なビタミンC (mg)</label>
                <input
                  type="number"
                  value={vitaminC}
                  onChange={(e) => setVitaminC(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">カルシウム (mg)</label>
                <input
                  type="number"
                  value={calcium}
                  onChange={(e) => setCalcium(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">鉄分 (mg)</label>
                <input
                  type="number"
                  value={iron}
                  onChange={(e) => setIron(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-olive hover:bg-opacity-90 text-white font-bold py-2 rounded-xl transition duration-150 font-serif cursor-pointer"
          >
            食材登録を完了
          </button>
        </form>
      )}

      {/* Portioned Items List View */}
      {items.length === 0 ? (
        <div className="py-10 text-center text-slate-400">
          <Layers className="w-10 h-10 mx-auto opacity-30 stroke-[1.2] mb-2 animate-pulse" />
          <p className="text-xs font-medium">登録されている食品・食材はありません</p>
          <p className="text-[10px] mt-1 text-slate-450">レシート画像や音声入力を投げるか、手動で登録してみましょう！</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {[...items].reverse().map((item) => {
            const isExpanded = expandedItemId === item.id;
            return (
              <div
                key={item.id}
                className="group border border-slate-100 rounded-xl bg-slate-50/30 hover:bg-slate-50/80 transition overflow-hidden"
              >
                {/* Header/Collapsible row */}
                <div
                  onClick={() => toggleExpand(item.id)}
                  className="flex items-center justify-between p-3.5 cursor-pointer select-none animate-fadeIn"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-display font-bold text-slate-800 text-sm tracking-tight truncate">
                        {item.japaneseName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium font-mono">
                        ({item.originalName})
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md ${getSourceStyle(item.source)}`}>
                        {getSourceLabel(item.source)}
                      </span>
                      <span className="text-slate-400 text-xs">
                        分量: <span className="font-medium text-slate-600">{item.quantity}</span>
                      </span>
                      {item.price > 0 && (
                        <span className="text-clay-text text-xs font-semibold">
                          R$ {((item.price || 0) * (item.multiplier !== undefined ? item.multiplier : 1)).toFixed(2)}
                          <span className="text-[9px] text-slate-400 font-normal ml-0.5">
                            ({Math.round((item.price || 0) * (item.multiplier !== undefined ? item.multiplier : 1) * 28)}円相当
                            {item.multiplier !== undefined && item.multiplier !== 1 && ` / 基底 R$ ${item.price.toFixed(2)}`})
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Quantity Edit Stepper */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center bg-white border border-slate-200/85 shadow-sm rounded-lg p-0.5 mr-1"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const currentVal = item.multiplier !== undefined ? item.multiplier : 1;
                          onUpdateMultiplier(item.id, Math.max(0.1, currentVal - 0.5));
                        }}
                        className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-500 hover:bg-slate-150 rounded-md transition"
                        title="個数を0.5減らす"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={item.multiplier !== undefined ? item.multiplier : 1}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            onUpdateMultiplier(item.id, val);
                          }
                        }}
                        className="w-10 text-center font-mono font-bold text-xs text-slate-800 focus:outline-none bg-transparent p-0 border-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const currentVal = item.multiplier !== undefined ? item.multiplier : 1;
                          onUpdateMultiplier(item.id, currentVal + 0.5);
                        }}
                        className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-500 hover:bg-slate-150 rounded-md transition"
                        title="個数を0.5増やす"
                      >
                        +
                      </button>
                      <span className="text-[10px] text-slate-450 pr-1.5 pl-0.5 font-semibold">倍</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(item.id);
                      }}
                      className="text-slate-300 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50/50 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="このアイテムを削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-450 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-450 shrink-0" />
                    )}
                  </div>
                </div>

                {/*展开栄養素詳細 */}
                {isExpanded && (
                  <div className="bg-white border-t border-slate-100 p-4 font-sans text-xs space-y-3.5">
                    {/* Calories, Proteins, Fats, Carbs breakdown list */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-slate-50/50 rounded-lg p-2 border border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">カロリー</span>
                        <span className="text-xs font-extrabold text-slate-800">
                          {parseFloat(((item.nutrition.calories || 0) * (item.multiplier !== undefined ? item.multiplier : 1)).toFixed(1))} kcal
                        </span>
                      </div>
                      <div className="bg-orange-50/10 rounded-lg p-2 border border-clay/10">
                        <span className="text-[9px] font-bold text-clay-text block uppercase">たんぱく質</span>
                        <span className="text-xs font-extrabold text-clay">
                          {parseFloat(((item.nutrition.protein || 0) * (item.multiplier !== undefined ? item.multiplier : 1)).toFixed(1))} g
                        </span>
                      </div>
                      <div className="bg-amber-50/10 rounded-lg p-2 border border-clay-text/10">
                        <span className="text-[9px] font-bold text-clay block uppercase">脂質</span>
                        <span className="text-xs font-extrabold text-clay-text">
                          {parseFloat(((item.nutrition.fat || 0) * (item.multiplier !== undefined ? item.multiplier : 1)).toFixed(1))} g
                        </span>
                      </div>
                      <div className="bg-teal-50/10 rounded-lg p-2 border border-sage/10">
                        <span className="text-[9px] font-bold text-olive block uppercase">炭水化物</span>
                        <span className="text-xs font-extrabold text-olive">
                          {parseFloat(((item.nutrition.carbohydrates || 0) * (item.multiplier !== undefined ? item.multiplier : 1)).toFixed(1))} g
                        </span>
                      </div>
                    </div>

                    {/* Detailed vitamins / minerals inside the item */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">含有ビタミン・ミネラル内訳</span>
                        {item.multiplier !== undefined && item.multiplier !== 1 && (
                          <span className="text-[9px] text-[#4A453F] bg-sage/20 px-1.5 py-0.5 rounded font-bold font-mono">
                            合計分量換算済 ({item.multiplier}倍)
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 bg-slate-50/40 p-2.5 rounded-lg">
                        {Object.keys(item.nutrition)
                          .filter((k) => !["calories", "protein", "fat", "carbohydrates"].includes(k))
                          .map((nKey) => {
                            const rawValue = (item.nutrition as any)[nKey] || 0;
                            const value = parseFloat((rawValue * (item.multiplier !== undefined ? item.multiplier : 1)).toFixed(2));
                            const label = NUTRIENT_LABELS[nKey as keyof NutritionalMetrics];
                            const unit = NUTRIENT_UNITS[nKey as keyof NutritionalMetrics];
                            return (
                              <div key={nKey} className="flex justify-between border-b border-dashed border-slate-100 pb-0.5">
                                <span className="text-[10px] text-slate-450">{label}:</span>
                                <span className="font-semibold text-slate-700 font-mono text-[10px]">
                                  {value}
                                  <span className="text-[8px] font-normal text-slate-400 ml-0.5">{unit}</span>
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
