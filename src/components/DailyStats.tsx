import { useState } from "react";
import { DailyLog, NutritionalMetrics, RECOMMENDED_DAILY_INTAKE, NUTRIENT_UNITS, NUTRIENT_LABELS } from "../types";
import { calculateTotalNutrition } from "../utils/nutrition";
import { Flame, AlertTriangle, CheckCircle2, TrendingUp, Coins, CalendarCheck, HelpCircle } from "lucide-react";

interface DailyStatsProps {
  currentLog: DailyLog | null;
  logs: DailyLog[];
  date: string;
}

export default function DailyStats({ currentLog, logs, date }: DailyStatsProps) {
  // Toggle between single-day perspective and 30-day aggregate perspective
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");

  const dailyTotals = (currentLog && currentLog.items.length > 0) ? calculateTotalNutrition(currentLog.items) : null;
  const currentCost = currentLog ? currentLog.totalCost : 0;

   // Monthly aggregated totals
  // Sum everything from the stored logs database safely
  const totalMonthlyCost = (logs || []).reduce((acc, log) => acc + (log?.totalCost || 0), 0);
  
  // Aggregate nutrition across all logs safely
  const aggregatedNutrition: NutritionalMetrics = (logs || [])
    .filter((log) => log && Array.isArray(log.items))
    .reduce((acc, log) => {
      const nutrition = calculateTotalNutrition(log.items);
      Object.keys(acc).forEach((key) => {
        const k = key as keyof NutritionalMetrics;
        acc[k] = (acc[k] || 0) + (nutrition[k] || 0);
      });
      return acc;
    }, {
      calories: 0, protein: 0, fat: 0, carbohydrates: 0,
      vitaminA: 0, vitaminB1: 0, vitaminB2: 0, vitaminB6: 0, vitaminB12: 0,
      vitaminC: 0, vitaminD: 0, vitaminE: 0, iron: 0, calcium: 0, magnesium: 0, zinc: 0, fiber: 0
    } as NutritionalMetrics);

  // Divide by 30 for daily estimate
  const monthlyDailyEstimates: NutritionalMetrics = {} as any;
  Object.keys(aggregatedNutrition).forEach((key) => {
    const k = key as keyof NutritionalMetrics;
    monthlyDailyEstimates[k] = parseFloat((aggregatedNutrition[k] / 30).toFixed(1));
  });

  const divisorDailyCost = parseFloat((totalMonthlyCost / 30).toFixed(1));

  // Determine active metrics depending on the toggle
  const activeMetrics = viewMode === "daily" ? dailyTotals : monthlyDailyEstimates;
  const activeCost = viewMode === "daily" ? currentCost : divisorDailyCost;
  const activeLabel = viewMode === "daily" ? `${date} の合計` : "1日あたりの平均推定値 (月間合計 / 30分の一)";

  // Check which nutrients are dangerously deficient (under 70% of recommended)
  const getDeficiencies = (metrics: NutritionalMetrics | null) => {
    if (!metrics) return [];
    const deficientList: { key: keyof NutritionalMetrics; label: string; pct: number }[] = [];
    
    // Check PFC, vitamins, minerals, and dietary fibers
    Object.keys(RECOMMENDED_DAILY_INTAKE).forEach((key) => {
      const k = key as keyof NutritionalMetrics;
      if (k === "calories") return; // Calorie is general
      const actual = metrics[k] || 0;
      const target = RECOMMENDED_DAILY_INTAKE[k];
      const pct = (actual / target) * 100;
      if (pct < 70) {
        deficientList.push({
          key: k,
          label: NUTRIENT_LABELS[k],
          pct: Math.round(pct)
        });
      }
    });
    return deficientList;
  };

  const deficiencies = getDeficiencies(activeMetrics);

  return (
    <div className="card bg-white/85 p-4 shadow-sm space-y-4">
      {/* View Toggle Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-150">
        <div>
          <h3 className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5 font-serif">
            <Coins className="w-4 h-4 text-olive animate-pulse" />
            栄養成分 ＆ コスト集計
          </h3>
          <p className="text-[10px] text-slate-500">
            50歳女性(運動少なめ)の推定平均必要量 (※一部目標量・目安量) との比較
          </p>
        </div>

        {/* Perspective toggle (Daily RDI vs Monthly 1/30) */}
        <div className="bg-sage/10 border border-sage/5 p-0.5 rounded-lg flex w-full sm:w-auto">
          <button
            onClick={() => setViewMode("daily")}
            className={`flex-1 sm:flex-none text-[10px] font-bold px-2.5 py-1 rounded-md transition ${
              viewMode === "daily"
                ? "bg-white text-olive shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            日別統計
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            className={`flex-1 sm:flex-none text-[10px] font-bold px-2.5 py-1 rounded-md transition flex items-center justify-center gap-1 ${
              viewMode === "monthly"
                ? "bg-white text-olive shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <TrendingUp className="w-3 h-3 text-clay" />
            月間合計/30 (1日平均)
          </button>
        </div>
      </div>

      {/* Monthly Overview Total Box if monthly mode is selected */}
      {viewMode === "monthly" && (
        <div className="bg-sage/10 border border-sage/20 rounded-xl p-3 grid grid-cols-2 gap-3">
          <div>
            <span className="text-[9px] font-bold text-olive tracking-wider block mb-0.5 uppercase font-serif">
              登録された月間合計食費 (累積)
            </span>
            <span className="text-base font-display font-extrabold text-clay block font-serif">
              R$ {totalMonthlyCost.toFixed(2)}
            </span>
            <span className="text-[9px] text-slate-500 font-sans leading-none">
              {(totalMonthlyCost * 28).toLocaleString("ja-JP")} 円 相当
            </span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-olive tracking-wider block mb-0.5 uppercase font-serif">
              1日平均費用 (30分割推測)
            </span>
            <span className="text-base font-display font-extrabold text-slate-800 block font-serif">
              R$ {divisorDailyCost.toFixed(2)}
            </span>
            <span className="text-[9px] text-slate-500 font-sans leading-none">
              {(divisorDailyCost * 28).toLocaleString("ja-JP")} 円 / 日 平均
            </span>
          </div>
        </div>
      )}

      {/* Main Stats Display */}
      {!activeMetrics ? (
        <div className="py-8 text-center text-slate-500 space-y-2">
          <Flame className="w-10 h-10 stroke-[1.2] mx-auto animate-pulse opacity-40 text-clay" />
          <p className="text-xs font-semibold">
            選択した日付 ({date}) にはまだ食事が記録されていません。
          </p>
          <p className="text-[10px] text-slate-500 px-4 max-w-md mx-auto leading-relaxed">
            上の入力からレシートや食事をスキャンすると、ここに対たんぱく質、ビタミン、ミネラルの進捗が表示されます！
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Detailed Nutrients breakdown list (Vitamins, Minerals, Fiber) */}
          <div className="pt-1">
            <h4 className="text-[11px] font-bold text-slate-700 mb-2 block font-serif">
              主要ビタミン ＆ ミネラル ＆ 食物繊維
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 bg-slate-50/50 p-2.5 border border-slate-100 rounded-lg">
              {/* Vitamins & Minerals map excluding calories & PFC */}
              {(Object.keys(RECOMMENDED_DAILY_INTAKE) as Array<keyof NutritionalMetrics>)
                .filter((k) => !["calories", "protein", "fat", "carbohydrates"].includes(k))
                .map((key) => {
                  const actual = activeMetrics[key] || 0;
                  const target = RECOMMENDED_DAILY_INTAKE[key];
                  const percentage = Math.round((actual / target) * 100);
                  const unit = NUTRIENT_UNITS[key];
                  const label = NUTRIENT_LABELS[key];

                  return (
                    <div key={key} className="space-y-0.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="font-medium text-slate-500">{label}</span>
                        <span className="text-slate-600 font-medium font-mono">
                          {actual}/{target}
                          <span className="text-[9px] text-slate-400 ml-0.5">{unit}</span>
                          <span className={`ml-1.5 text-[11px] font-extrabold leading-none ${percentage < 70 ? "text-clay-text" : "text-olive"}`}>
                            {percentage}%
                          </span>
                        </span>
                      </div>
                      <div className="w-full h-1 bg-slate-200/60 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                          className={`h-full rounded-full ${percentage < 70 ? "bg-clay" : "bg-olive"}`}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Top Level Summary: Total Cost + Calories */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/60 border border-slate-100 p-2.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[9px] text-slate-500 block font-medium mb-0.5">
                  {viewMode === "daily" ? "本日の総食費" : "1日平均食費 (月間/30)"}
                </span>
                <span className="text-base font-display font-extrabold text-slate-800 font-serif block leading-none mb-1">
                  R$ {activeCost.toFixed(2)}
                </span>
                <span className="text-[9px] text-slate-500 block font-mono leading-none">
                  {(activeCost * 28).toFixed(0)} 円 換算
                </span>
              </div>
              <div className="bg-clay/10 w-8 h-8 rounded-lg flex items-center justify-center text-clay-text shrink-0 ml-1">
                <Coins className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white/60 border border-slate-100 p-2.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[9px] text-slate-500 block font-medium mb-0.5">
                  総摂取カロリー
                </span>
                <span className="text-base font-display font-extrabold text-slate-800 font-serif block leading-none mb-1">
                  {activeMetrics.calories.toLocaleString()}
                  <span className="text-[10px] font-medium text-slate-500 ml-0.5">kcal</span>
                </span>
                <span className="text-[9px] text-slate-550 block leading-none">
                  目標: {RECOMMENDED_DAILY_INTAKE.calories} kcal
                </span>
              </div>
              <div className="bg-olive/10 w-8 h-8 rounded-lg flex items-center justify-center text-olive shrink-0 ml-1">
                <Flame className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* PFC Major Macronutrients (PFC Balance) Bar */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1 font-serif">
              <CalendarCheck className="w-3.5 h-3.5 text-olive" />
              三大栄養素 (PFCバランス)
            </h4>
            <div className="space-y-2">
              {/* Protein (P) */}
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="font-medium text-slate-600">たんぱく質 (Protein)</span>
                  <span className="text-slate-500 font-serif font-mono text-[10px]">
                    {activeMetrics.protein}g/{RECOMMENDED_DAILY_INTAKE.protein}g{" "}
                    <span className="font-bold text-slate-700 ml-1 font-sans">
                      {Math.round((activeMetrics.protein / RECOMMENDED_DAILY_INTAKE.protein) * 100)}%
                    </span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min((activeMetrics.protein / RECOMMENDED_DAILY_INTAKE.protein) * 100, 100)}%` }}
                    className="h-full bg-clay rounded-full"
                  />
                </div>
              </div>

              {/* Fat (F) */}
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="font-medium text-slate-600">脂質 (Fat)</span>
                  <span className="text-slate-500 font-serif font-mono text-[10px]">
                    {activeMetrics.fat}g/{RECOMMENDED_DAILY_INTAKE.fat}g{" "}
                    <span className="font-bold text-slate-700 ml-1 font-sans">
                      {Math.round((activeMetrics.fat / RECOMMENDED_DAILY_INTAKE.fat) * 100)}%
                    </span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min((activeMetrics.fat / RECOMMENDED_DAILY_INTAKE.fat) * 100, 100)}%` }}
                    className="h-full bg-clay-text rounded-full"
                  />
                </div>
              </div>

              {/* Carbohydrates (C) */}
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="font-medium text-slate-600">炭水化物 (Carbohydrates)</span>
                  <span className="text-slate-500 font-serif font-mono text-[10px]">
                    {activeMetrics.carbohydrates}g/{RECOMMENDED_DAILY_INTAKE.carbohydrates}g{" "}
                    <span className="font-bold text-slate-700 ml-1 font-sans">
                      {Math.round((activeMetrics.carbohydrates / RECOMMENDED_DAILY_INTAKE.carbohydrates) * 100)}%
                    </span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min((activeMetrics.carbohydrates / RECOMMENDED_DAILY_INTAKE.carbohydrates) * 100, 100)}%` }}
                    className="h-full bg-sage rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Deficiency alerts module (栄養不足アラート) */}
          {deficiencies.length > 0 ? (
            <div className="bg-clay/10 border border-clay/20 rounded-xl p-2.5 space-y-1">
              <div className="flex items-start gap-1.5 text-clay-text text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-clay shrink-0 mt-0.5" />
                <div>
                  <p className="font-serif">栄養不足アラート ({deficiencies.length}件)</p>
                  <p className="text-[9px] text-clay-text/90 font-normal">
                    以下の栄養素が50歳女性(運動少なめ)の1日推定平均必要量等の70%未満となっています：
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {deficiencies.map((def, defIdx) => (
                  <span
                    key={defIdx}
                    className="inline-flex items-center gap-1 bg-white/80 border border-clay/10 text-clay-text text-[9px] px-2.5 py-0.5 rounded-full font-semibold"
                  >
                    {def.label} ({def.pct}%)
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-sage/15 border border-sage/30 rounded-xl p-2 flex items-center gap-1.5 text-olive text-[11px] font-bold font-serif">
              <CheckCircle2 className="w-3.5 h-3.5 text-olive shrink-0" />
              主要ビタミン・ミネラル・繊維バランス良好！
            </div>
          )}
        </div>
      )}
    </div>
  );
}
