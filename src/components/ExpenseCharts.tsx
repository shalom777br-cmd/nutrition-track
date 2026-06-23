import { useState } from "react";
import { DailyLog } from "../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { Coins, Activity, CalendarDays } from "lucide-react";
import { calculateTotalNutrition } from "../utils/nutrition";

interface ExpenseChartsProps {
  logs: DailyLog[];
}

export default function ExpenseCharts({ logs }: ExpenseChartsProps) {
  const [activeTab, setActiveTab] = useState<"expense" | "calories" | "both">("both");

  // Format historical days for the charts
  const chartData = logs
    .map((log) => {
      const totals = calculateTotalNutrition(log.items);
      const parts = log.date.split("-");
      const shortDate = parts.length === 3 ? `${parts[1]}/${parts[2]}` : log.date;
      return {
        date: shortDate,
        fullDate: log.date,
        expense: log.totalCost,
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbohydrates,
        fat: totals.fat,
      };
    })
    .sort((a, b) => a.fullDate.localeCompare(b.fullDate));

  // Custom localized tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="card bg-white/95 backdrop-blur-sm p-3 shadow-lg font-sans text-xs">
          <p className="font-semibold text-slate-700 mb-1.5 flex items-center gap-1 font-serif">
            <CalendarDays className="w-3.5 h-3.5 text-olive" />
            {label} の食事
          </p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => {
              const isCost = entry.name.includes("費用");
              return (
                <p
                  key={index}
                  className="font-medium"
                  style={{ color: entry.stroke || entry.fill || "#374151" }}
                >
                  {entry.name}:{" "}
                  <span className="font-semibold text-slate-900">
                    {isCost
                      ? `R$ ${entry.value.toFixed(2)} (${(entry.value * 28).toFixed(0)}円 換算)`
                      : `${entry.value.toLocaleString()} kcal`}
                  </span>
                </p>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card bg-white/85 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-800 font-serif">
            食費 ＆ 栄養摂取レポート
          </h3>
          <p className="text-xs text-slate-500">
            食事ログから導く、日別の費用と総カロリーの推移グラフ
          </p>
        </div>

        {/* Chart View Toggle Controls */}
        <div className="flex bg-sage/10 border border-sage/5 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("both")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "both"
                ? "bg-white text-olive shadow-xs font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            総合推移
          </button>
          <button
            onClick={() => setActiveTab("expense")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "expense"
                ? "bg-white text-olive shadow-xs font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            食費のみ
          </button>
          <button
            onClick={() => setActiveTab("calories")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "calories"
                ? "bg-white text-olive shadow-xs font-bold relative"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            カロリー
          </button>
        </div>
      </div>

      <div className="h-64 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-slate-400 gap-2 border border-dashed border-slate-200 rounded-xl">
            <Coins className="w-8 h-8 opacity-40 animate-pulse" />
            <p className="text-xs">データがありません。食事を追加してください。</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === "expense" ? (
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="expense" name="食費費用 (R$)" fill="#6B705C" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : activeTab === "calories" ? (
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="calories"
                  name="摂取カロリー"
                  stroke="#CB997E"
                  fillOpacity={0.15}
                  fill="url(#colorCaloriesOnly)"
                />
                <defs>
                  <linearGradient id="colorCaloriesOnly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CB997E" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#CB997E" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
              </AreaChart>
            ) : (
              /* BOTH: Combined area/bar visualization */
              <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#6B705C" fontSize={11} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#CB997E" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <defs>
                  <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CB997E" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#CB997E" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="calories"
                  name="摂取カロリー (kcal)"
                  stroke="#CB997E"
                  strokeWidth={2}
                  fill="url(#colorCalories)"
                />
                <Area
                  yAxisId="left"
                  type="linear"
                  dataKey="expense"
                  name="食費費用 (R$)"
                  stroke="#6B705C"
                  strokeWidth={2.5}
                  fill="none"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-50 text-center">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-0.5">
            1日に使った最高額
          </span>
          <span className="text-sm font-semibold text-slate-700">
            {chartData.length
              ? `R$ ${Math.max(...chartData.map((d) => d.expense)).toFixed(2)}`
              : "R$ 0.00"}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-0.5">
            最高カロリー摂取
          </span>
          <span className="text-sm font-semibold text-slate-700">
            {chartData.length
              ? `${Math.max(...chartData.map((d) => d.calories)).toLocaleString()} kcal`
              : "0 kcal"}
          </span>
        </div>
      </div>
    </div>
  );
}
