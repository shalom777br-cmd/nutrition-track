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

  const dailyTotals = currentLog ? calculateTotalNutrition(currentLog.items) : null;
  const currentCost = currentLog ? currentLog.totalCost : 0;

  // Monthly aggregated totals
  // Sum everything from the stored logs database
  const totalMonthlyCost = logs.reduce((acc, log) => acc + log.totalCost, 0);
  
  // Aggregate nutrition across all logs
  const aggregatedNutrition: NutritionalMetrics = logs.reduce((acc, log) => {
    const nutrition = calculateTotalNutrition(log.items);
    Object.keys(acc).forEach((key) => {
      const k = key as keyof NutritionalMetrics;
      acc[k] = (acc[k] || 0) + (nutrition[k] || 0);
    });
    return acc;
  }, {
    calories: 0, protein: 0, fat: 0, carbohydrates: 0,
    vitaminA: 0, vitaminB1: 0, vitaminB2: 0, vitaminB6: 0, vitaminB12: 0,
    vitaminC: 0, vitaminD: 0, vitaminE: 0, iron: 0, calcium: 0, zinc: 0, fiber: 0
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
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-6">
      {/* View Toggle Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-500" />
            栄養成分 ＆ コスト集計
          </h3>
          <p className="text-xs text-slate-500">
            推奨摂取量と比較した健康バランスメーター
          </p>
        </div>

        {/* Perspective toggle (Daily RDI vs Monthly 1/30) */}
        <div className="bg-slate-50 border border-slate-100 p-1 rounded-xl flex w-full sm:w-auto">
          <button
            onClick={() => setViewMode("daily")}
            className={`flex-1 sm:flex-none text-xs font-semibold px-4 py-1.5 rounded-lg transition ${
              viewMode === "daily"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-505 hover:text-slate-650"
            }`}
          >
            日別統計
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            className={`flex-1 sm:flex-none text-xs font-semibold px-4 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
              viewMode === "monthly"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-650"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            月間合計/30 (1日平均)
          </button>
        </div>
      </div>

      {/* Monthly Overview Total Box if monthly mode is selected */}
      {viewMode === "monthly" && (
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] font-bold text-emerald-700 tracking-wider block mb-0.5 uppercase">
              登録された月間合計食費 (累積)
            </span>
            <span className="text-xl font-display font-extrabold text-emerald-600 block">
              R$ {totalMonthlyCost.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 font-sans leading-none">
              {(totalMonthlyCost * 28).toLocaleString("ja-JP")} 円 相当
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-700 tracking-wider block mb-0.5 uppercase">
              1日平均費用 (30分割推測)
            </span>
            <span className="text-xl font-display font-extrabold text-slate-800 block">
              R$ {divisorDailyCost.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 font-sans leading-none">
              {(divisorDailyCost * 28).toLocaleString("ja-JP")} 円 / 日 平均
            </span>
          </div>
        </div>
      )}

      {/* Main Stats Display */}
      {!activeMetrics ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <Flame className="w-12 h-12 stroke-[1.2] mx-auto animate-pulse opacity-40 text-emerald-300" />
          <p className="text-xs">
            選択した日付 ({date}) にはまだ食事が記録されていません。
          </p>
          <p className="text-[11px] text-slate-400 px-6 max-w-md mx-auto">
            上の入力からレシートや食事をスキャンすると、ここに対たんぱく質、ビタミン、ミネラルの進捗が表示されます！
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Level Summary: Total Cost + Calories */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-100/50 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium mb-1">
                  {viewMode === "daily" ? "本日の総食費" : "1日平均食費 (月間/30)"}
                </span>
                <span className="text-lg font-display font-extrabold text-slate-800">
                  R$ {activeCost.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {(activeCost * 28).toFixed(0)} 円 換算
                </span>
              </div>
              <div className="bg-emerald-500/10 w-9 h-9 rounded-lg flex items-center justify-center text-emerald-600">
                <Coins className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100/50 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium mb-1">
                  総摂取カロリー
                </span>
                <span className="text-lg font-display font-extrabold text-slate-800">
                  {activeMetrics.calories.toLocaleString()}
                  <span className="text-xs font-medium text-slate-500 ml-0.5">kcal</span>
                </span>
                <span className="text-[10px] text-slate-400 block">
                  目標: {RECOMMENDED_DAILY_INTAKE.calories} kcal
                </span>
              </div>
              <div className="bg-blue-500/10 w-9 h-9 rounded-lg flex items-center justify-center text-blue-600">
                <Flame className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* PFC Major Macronutrients (PFC Balance) Bar */}
          <div>
            <h4 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-emerald-500" />
              三大栄養素 (PFCバランス)
            </h4>
            <div className="space-y-3">
              {/* Protein (P) */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-600">たんぱく質 (Protein)</span>
                  <span className="text-slate-500">
                    {activeMetrics.protein}g / {RECOMMENDED_DAILY_INTAKE.protein}g{" "}
                    <span className="font-bold text-slate-700 ml-1">
                      {Math.round((activeMetrics.protein / RECOMMENDED_DAILY_INTAKE.protein) * 100)}%
                    </span>
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min((activeMetrics.protein / RECOMMENDED_DAILY_INTAKE.protein) * 100, 100)}%` }}
                    className="h-full bg-orange-400 rounded-full"
                  />
                </div>
              </div>

              {/* Fat (F) */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-600">脂質 (Fat)</span>
                  <span className="text-slate-500">
                    {activeMetrics.fat}g / {RECOMMENDED_DAILY_INTAKE.fat}g{" "}
                    <span className="font-bold text-slate-700 ml-1">
                      {Math.round((activeMetrics.fat / RECOMMENDED_DAILY_INTAKE.fat) * 100)}%
                    </span>
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min((activeMetrics.fat / RECOMMENDED_DAILY_INTAKE.fat) * 100, 100)}%` }}
                    className="h-full bg-amber-400 rounded-full"
                  />
                </div>
              </div>

              {/* Carbohydrates (C) */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-600">炭水化物 (Carbohydrates)</span>
                  <span className="text-slate-500">
                    {activeMetrics.carbohydrates}g / {RECOMMENDED_DAILY_INTAKE.carbohydrates}g{" "}
                    <span className="font-bold text-slate-700 ml-1">
                      {Math.round((activeMetrics.carbohydrates / RECOMMENDED_DAILY_INTAKE.carbohydrates) * 100)}%
                    </span>
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min((activeMetrics.carbohydrates / RECOMMENDED_DAILY_INTAKE.carbohydrates) * 100, 100)}%` }}
                    className="h-full bg-teal-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Deficiency alerts module (栄養不足アラート) */}
          {deficiencies.length > 0 ? (
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3.5 space-y-2">
              <div className="flex items-start gap-2 text-amber-800 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p>栄養不足アラート ({deficiencies.length}件)</p>
                  <p className="text-[10px] text-amber-600/90 font-normal">
                    以下の栄養素が成人の1日推奨基準値の70%未満となっています：
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {deficiencies.map((def, defIdx) => (
                  <span
                    key={defIdx}
                    className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] px-2.5 py-0.5 rounded-full font-medium"
                  >
                    {def.label} ({def.pct}%)
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex items-center gap-2 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
              主要ビタミン・ミネラル・繊維バランス良好！
            </div>
          )}

          {/* Detailed Nutrients breakdown list (Vitamins, Minerals, Fiber) */}
          <div className="pt-2">
            <h4 className="text-xs font-semibold text-slate-700 mb-3 block">
              主要ビタミン ＆ ミネラル ＆ 食物繊維
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 bg-slate-50/50 p-4 border border-slate-100 rounded-xl">
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
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-medium text-slate-500">{label}</span>
                        <span className="text-slate-600 font-medium">
                          {actual} / {target}
                          <span className="text-[10px] text-slate-400 ml-0.5">{unit}</span>
                          <span className={`ml-2 text-xs font-bold leading-none ${percentage < 70 ? "text-amber-500" : "text-emerald-500"}`}>
                            {percentage}%
                          </span>
                        </span>
                      </div>
                      <div className="w-full h-1 bg-slate-200/60 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                          className={`h-full rounded-full ${percentage < 70 ? "bg-amber-400" : "bg-emerald-500"}`}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
