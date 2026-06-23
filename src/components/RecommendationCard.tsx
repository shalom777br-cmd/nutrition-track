import { Sparkles, HelpCircle, HeartPulse, CheckSquare } from "lucide-react";

interface RecommendationCardProps {
  feedback: string;
  isAnalyzing: boolean;
}

export default function RecommendationCard({ feedback, isAnalyzing }: RecommendationCardProps) {
  // Format text into paragraphs or list items safely without external markdown library
  const renderFormattedText = (rawText: string) => {
    if (!rawText) return null;
    
    return rawText.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;
      
      // If line is a bullet point or dashed list
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const itemContent = trimmed.substring(1).trim().replace(/\*\*(.*?)\*\*/g, "$1");
        return (
          <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed my-1">
            <span className="w-1.5 h-1.5 rounded-full bg-clay mt-1.5 shrink-0" />
            <span>{itemContent}</span>
          </li>
        );
      }
      
      // If line is a numbered step (e.g. 1. or 2.)
      const stepMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (stepMatch) {
        return (
          <div key={idx} className="flex gap-2 text-xs text-slate-600 leading-relaxed my-1 pl-1">
            <span className="font-mono font-bold text-clay-text shrink-0">{stepMatch[1]}.</span>
            <span>{stepMatch[2].replace(/\*\*(.*?)\*\*/g, "$1")}</span>
          </div>
        );
      }

      // Handle bold texts inside standard paragraphs
      const parts = trimmed.split(/\*\*(.*?)\*\*/g);
      if (parts.length > 1) {
        return (
          <p key={idx} className="text-xs text-slate-600 leading-relaxed my-1.5">
            {parts.map((p, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-slate-900 font-semibold">{p}</strong> : p)}
          </p>
        );
      }
      
      return (
        <p key={idx} className="text-xs text-slate-600 leading-relaxed my-1.5">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="card bg-white/85 p-5 shadow-sm relative overflow-hidden">
      {/* Decorative accent background ring */}
      <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-sage/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start gap-3.5">
        {/* Advisor Avatar Icon */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-olive to-sage flex items-center justify-center text-white shrink-0 shadow-md shadow-olive/10">
          <HeartPulse className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-display font-bold text-slate-800 text-sm tracking-tight font-serif">
              AI 健康アドバイザー
            </h4>
            <span className="inline-flex items-center gap-1 bg-olive/10 text-olive text-[10px] font-semibold px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" />
              NutriGasto AI
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-sans mb-3">
            USDA, Open Food Facts &amp; TACO データベースに基づく最新栄養アドバイス
          </p>

          {isAnalyzing ? (
            <div className="py-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <div className="w-4 h-4 border-2 border-olive/30 border-t-olive rounded-full animate-spin" />
                食事と栄養素を分析して、アドバイスを生成中...
              </div>
              <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-5/6 bg-slate-100 rounded animate-pulse" />
            </div>
          ) : feedback ? (
            <div className="space-y-1 text-slate-700 pl-0.5 font-sans">
              {renderFormattedText(feedback)}
            </div>
          ) : (
            <div className="py-4 text-center">
              <div className="flex justify-center mb-2">
                <HelpCircle className="w-8 h-8 text-slate-300 stroke-[1.5]" />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                まだ本日の食事が追加されていません。
                上の入力フォームからレシート画像、食事の写真、または音声/テキストメモを追加すると、AIが不足栄養素や改善点を優しくアドバイスします！
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
