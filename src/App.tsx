import { useState, useEffect, useRef } from "react";
import {
  Upload,
  Camera,
  FileText,
  Mic,
  Square,
  Trash2,
  Plus,
  Sparkles,
  HeartPulse,
  Activity,
  Coins,
  Calendar,
  AlertTriangle,
  Play,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  FileAudio,
  PlusCircle
} from "lucide-react";
import { DailyLog, FoodItem, RECOMMENDED_DAILY_INTAKE } from "./types";
import { getInitialLogs, calculateTotalNutrition } from "./utils/nutrition";
import ExpenseCharts from "./components/ExpenseCharts";
import DailyStats from "./components/DailyStats";
import PortionList from "./components/PortionList";
import RecommendationCard from "./components/RecommendationCard";

export default function App() {
  // --- Persistent Storage State ---
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [activeDate, setActiveDate] = useState<string>("2026-06-21"); // Current date based on metadata

  // --- Input Panel State ---
  const [activeTab, setActiveTab] = useState<"text" | "receipt" | "image" | "voice">("text");
  const [inputText, setInputText] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [foodFile, setFoodFile] = useState<File | null>(null);
  const [foodPreview, setFoodPreview] = useState<string | null>(null);

  // --- Voice Memo State ---
  const [audioState, setAudioState] = useState<"idle" | "recording" | "playback_ready">("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --- Analysis Status State ---
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [advisorFeedback, setAdvisorFeedback] = useState<string>("");

  // Initialize and load from LocalStorage
  useEffect(() => {
    const stored = localStorage.getItem("nutrigasto_logs_v1");
    if (stored) {
      try {
        setLogs(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse local storage, loading defaults", e);
        const initial = getInitialLogs();
        setLogs(initial);
        localStorage.setItem("nutrigasto_logs_v1", JSON.stringify(initial));
      }
    } else {
      const initial = getInitialLogs();
      setLogs(initial);
      localStorage.setItem("nutrigasto_logs_v1", JSON.stringify(initial));
    }
  }, []);

  // Save changes to localStorage helper
  const saveLogs = (updatedLogs: DailyLog[]) => {
    setLogs(updatedLogs);
    localStorage.setItem("nutrigasto_logs_v1", JSON.stringify(updatedLogs));
  };

  const currentLog = logs.find((l) => l.date === activeDate) || null;

  // Helper to convert files or blobs to Base64 data strings for the API
  const fileToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // --- Voice Memo Recorder Logic ---
  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      } catch (e) {
        recorder = new MediaRecorder(stream); // Fallback for browsers/Safari
      }

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mime });
        setAudioBlob(blob);
        setRecordedAudioUrl(URL.createObjectURL(blob));
        setAudioState("playback_ready");
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setAudioState("recording");
      setApiError(null);
    } catch (err) {
      console.error("Microphone access failed:", err);
      setApiError("マイクへのアクセスが許可されていません。ブラウザ設定を確認してください。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && audioState === "recording") {
      mediaRecorderRef.current.stop();
      // release microphone tracks
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setRecordedAudioUrl(null);
    setAudioState("idle");
  };

  // --- Handlers: File selection previews ---
  const handleReceiptChange = (file: File) => {
    setReceiptFile(file);
    const url = URL.createObjectURL(file);
    setReceiptPreview(url);
    setApiError(null);
  };

  const handleFoodChange = (file: File) => {
    setFoodFile(file);
    const url = URL.createObjectURL(file);
    setFoodPreview(url);
    setApiError(null);
  };

  // --- Perform actual AI Analysis calling our full stack backend ---
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setApiError(null);

    try {
      let receiptBase64 = "";
      let foodBase64 = "";
      let audioBase64 = "";
      let audioMime = "";

      if (receiptFile) {
        receiptBase64 = await fileToBase64(receiptFile);
      }
      if (foodFile) {
        foodBase64 = await fileToBase64(foodFile);
      }
      if (audioBlob) {
        audioBase64 = await fileToBase64(audioBlob);
        audioMime = audioBlob.type;
      }

      // Payload must contain at least one valid input
      if (!inputText.trim() && !receiptBase64 && !foodBase64 && !audioBase64) {
        throw new Error("いずれかの入力を提供してください（テキスト入力、レシート、食事の写真、または音声メモ）。");
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          receiptImage: receiptBase64,
          foodImage: foodBase64,
          audio: audioBase64,
          audioMimeType: audioMime,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Gemini AIの分析処理に失敗しました。");
      }

      if (payload.items && payload.items.length > 0) {
        // Append randomized IDs to products
        const analyzedItems: FoodItem[] = payload.items.map((item: any) => ({
          ...item,
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        }));

        // Merge back into active date logs
        const updatedLogs = [...logs];
        const existingIdx = updatedLogs.findIndex((l) => l.date === activeDate);

        if (existingIdx >= 0) {
          const originalList = updatedLogs[existingIdx].items;
          updatedLogs[existingIdx] = {
            ...updatedLogs[existingIdx],
            items: [...originalList, ...analyzedItems],
            totalCost: updatedLogs[existingIdx].totalCost + analyzedItems.reduce((s, i) => s + (i.price || 0), 0),
            hasReceipt: updatedLogs[existingIdx].hasReceipt || !!receiptFile,
            hasFoodPhoto: updatedLogs[existingIdx].hasFoodPhoto || !!foodFile,
            hasVoiceMemo: updatedLogs[existingIdx].hasVoiceMemo || !!audioBlob,
          };
        } else {
          updatedLogs.push({
            id: `log-${Date.now()}`,
            date: activeDate,
            items: analyzedItems,
            totalCost: analyzedItems.reduce((s, i) => s + (i.price || 0), 0),
            hasReceipt: !!receiptFile,
            hasFoodPhoto: !!foodFile,
            hasVoiceMemo: !!audioBlob,
          });
        }

        saveLogs(updatedLogs);
        setAdvisorFeedback(payload.advisorFeedback);

        // Reset input fields on success
        setInputText("");
        setReceiptFile(null);
        setReceiptPreview(null);
        setFoodFile(null);
        setFoodPreview(null);
        resetRecording();
      } else {
        setAdvisorFeedback(payload.advisorFeedback || "食品項目が検出されませんでした。より具体的なテキストや高解像度の画像を試してください。");
      }

    } catch (err: any) {
      console.error("Analysis failure:", err);
      setApiError(err.message || "予期せぬエラーが発生しました。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Handler: Delete Individual Food Item ---
  const handleDeleteFood = (itemId: string) => {
    const updated = logs.map((log) => {
      if (log.date === activeDate) {
        const filtered = log.items.filter((item) => item.id !== itemId);
        return {
          ...log,
          items: filtered,
          totalCost: filtered.reduce((acc, curr) => acc + (curr.price || 0), 0),
        };
      }
      return log;
    }).filter((log) => log.items.length > 0); // remove empty days if needed, or keep them
    saveLogs(updated);
  };

  // --- Handler: Add manually input food ---
  const handleAddManualFood = (rawItem: Omit<FoodItem, "id">) => {
    const newItem: FoodItem = {
      ...rawItem,
      id: `item-manual-${Date.now()}`,
    };

    const updated = [...logs];
    const existingIdx = updated.findIndex((l) => l.date === activeDate);

    if (existingIdx >= 0) {
      const original = updated[existingIdx].items;
      updated[existingIdx] = {
        ...updated[existingIdx],
        items: [...original, newItem],
        totalCost: updated[existingIdx].totalCost + (newItem.price || 0),
      };
    } else {
      updated.push({
        id: `log-${Date.now()}`,
        date: activeDate,
        items: [newItem],
        totalCost: newItem.price || 0,
        hasReceipt: newItem.source === "receipt",
        hasFoodPhoto: newItem.source === "image",
        hasVoiceMemo: false,
      });
    }
    saveLogs(updated);
  };

  // --- Simulator trigger: Inject beautiful realistic samples for testing ---
  const loadExampleData = (type: "padaria" | "dinner" | "voice") => {
    setApiError(null);
    if (type === "padaria") {
      setActiveTab("receipt");
      setInputText("毎朝通うサンパウロの老舗パン屋「Padaria Estrela」で購入した朝食。");
      // Load interactive dummy receipt view placeholder
      setReceiptPreview("https://placehold.co/400x500/f8fafc/0f172a?text=Padaria+Estrela%0A%0A2x+Pao+Frances%0A1x+Preto+Cafe%0A1x+Manteiga%0A%0ATOTAL:+R$+8.50");
      setReceiptFile(new File([], "receita_padaria.jpg", { type: "image/jpeg" }));
    } else if (type === "dinner") {
      setActiveTab("image");
      setInputText("健康のために付け合わせの蒸しブロッコリーを大盛りにしたサケのソテー、夕食メニューです。");
      setFoodPreview("https://placehold.co/500x400/f8fafc/10b981?text=Salmon+Grehalo+Photo");
      setFoodFile(new File([], "plate_jantar.jpg", { type: "image/jpeg" }));
    } else {
      setActiveTab("voice");
      setInputText("Hoje eu comi um pão de queijo com café e um filé de frango grelhado com feijão no almoço.");
      // Set mock audio state
      setAudioState("playback_ready");
      setAudioBlob(new Blob([], { type: "audio/webm" }));
      setRecordedAudioUrl("#");
    }
  };

  // Reset all local storage log records back to pre-populated dataset
  const handleResetDefaults = () => {
    if (window.confirm("これまでの記録をリセットし、初期サンプル食事ログを再読み込みしますか？")) {
      const initial = getInitialLogs();
      setLogs(initial);
      localStorage.setItem("nutrigasto_logs_v1", JSON.stringify(initial));
      setAdvisorFeedback("");
      setApiError(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4F0] text-[#4A453F] font-sans selection:bg-clay/10">
      
      {/* Visual Header Grid Panel */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-sage/20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-olive to-sage flex items-center justify-center text-white shrink-0 shadow-md shadow-olive/10">
              <HeartPulse className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-extrabold text-xl tracking-tight text-[#4A453F] font-serif">
                  NutriGasto AI
                </h1>
                <span className="bg-clay/10 text-clay-text text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  HEALTH MVP
                </span>
              </div>
              <p className="text-xs text-[#6B705C]">
                ポルトガル語レシート・食事画像・音声メモ自動栄養＆食費集計アプリ
              </p>
            </div>
          </div>

          {/* Quick Date Control Grid */}
          <div className="flex items-center gap-3.5 flex-wrap w-full md:w-auto">
            <div className="flex items-center gap-2 bg-white/70 border border-sage/20 p-1.5 rounded-xl w-full sm:w-auto justify-between sm:justify-start shadow-xs">
              <span className="text-xs font-semibold text-slate-500 pl-2">対象日：</span>
              <select
                value={activeDate}
                onChange={(e) => {
                  setActiveDate(e.target.value);
                  setApiError(null);
                }}
                className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-3 py-1.5 text-slate-700 outline-none focus:border-olive"
              >
                <option value="2026-06-21">2026/06/21 (本日)</option>
                <option value="2026-06-20">2026/06/20 (昨日)</option>
                <option value="2026-06-19">2026/06/19 (一昨日)</option>
                <option value="2026-06-18">2026/06/18</option>
                <option value="2026-06-17">2026/06/17</option>
                <option value="2026-06-16">2026/06/16</option>
              </select>
            </div>

            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 font-medium text-xs bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 transition duration-150 shrink-0 cursor-pointer"
              title="データをデフォルトにリセット"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              リセット
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* LEFT PANEL: INPUT FORM & SIMULATOR WIDGET (grid level: 5/12) */}
          <section className="lg:col-span-5 space-y-6">
            
            {/* Analyzer Console Card */}
            <div className="card bg-white/85 p-6 shadow-sm space-y-5">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-800 font-serif">
                  AIマルチモーダル解析入力
                </h2>
                <p className="text-xs text-slate-500">
                  食品の情報が含まれる素材をアップロード・録音してください
                </p>
              </div>

              {/* Analyzer Sources Switch Tabs */}
              <div className="grid grid-cols-4 p-1 bg-sage/10 rounded-xl border border-sage/5">
                <button
                  onClick={() => setActiveTab("text")}
                  className={`flex flex-col items-center gap-1.5 py-2.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                    activeTab === "text"
                      ? "bg-white text-olive shadow-xs"
                      : "text-[#6B705C] hover:text-slate-800"
                  }`}
                >
                  <FileText className="w-4.5 h-4.5" />
                  メモ
                </button>
                <button
                  onClick={() => setActiveTab("receipt")}
                  className={`flex flex-col items-center gap-1.5 py-2.5 text-[10px] font-bold rounded-lg transition flex-wrap shrink-0 cursor-pointer ${
                    activeTab === "receipt"
                      ? "bg-white text-olive shadow-xs"
                      : "text-[#6B705C] hover:text-slate-800"
                  }`}
                >
                  <Upload className="w-4.5 h-4.5" />
                  レシート
                </button>
                <button
                  onClick={() => setActiveTab("image")}
                  className={`flex flex-col items-center gap-1.5 py-2.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                    activeTab === "image"
                      ? "bg-white text-olive shadow-xs"
                      : "text-[#6B705C] hover:text-slate-800"
                  }`}
                >
                  <Camera className="w-4.5 h-4.5" />
                  料理写真
                </button>
                <button
                  onClick={() => setActiveTab("voice")}
                  className={`flex flex-col items-center gap-1.5 py-2.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                    activeTab === "voice"
                      ? "bg-white text-olive shadow-xs"
                      : "text-[#6B705C] hover:text-slate-800"
                  }`}
                >
                  <Mic className="w-4.5 h-4.5" />
                  音声メモ
                </button>
              </div>

              {/* Input Panes */}
              <div className="min-h-[140px] flex flex-col justify-center">
                
                {/* 1. TEXT MEMO PANEL */}
                {activeTab === "text" && (
                  <div className="space-y-4">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="食べたもののテキストを自由に入力してください。例：マクドナルドでビッグマック1個とポテトMサイズを食べた、または frango grelhado (鶏胸グリル) と arroz (米) を200gずつ食べた"
                      className="w-full h-32 text-xs border border-sage/30 focus:border-olive focus:ring-0 p-3 outline-none rounded-xl bg-white/55 placeholder:text-slate-450 leading-relaxed"
                    />
                  </div>
                )}

                {/* 2. RECEIPT OCR PANEL */}
                {activeTab === "receipt" && (
                  <div className="space-y-4">
                    <p className="text-[11px] text-slate-500 leading-normal">
                      ポルトガル語の買い出しレシート、レストランの請求書をスキャンします。金額と食品名を標準化し自動読み込みします。
                    </p>

                    {receiptPreview ? (
                      <div className="relative border border-slate-100 rounded-2xl overflow-hidden bg-slate-50">
                        {receiptPreview.includes("placehold.co") ? (
                          <div className="p-4 font-mono text-[10px] text-zinc-600 bg-amber-50/50 whitespace-pre rounded-lg max-h-[160px] overflow-auto">
                            {receiptPreview.split("text=")[1] ? decodeURIComponent(receiptPreview.split("text=")[1].replace(/\+/g, " ")) : "レシートプレビュー"}
                          </div>
                        ) : (
                          <img
                            src={receiptPreview}
                            alt="Receipt preview"
                            className="w-full max-h-[160px] object-contain mx-auto p-2"
                          />
                        )}
                        <button
                          onClick={() => {
                            setReceiptFile(null);
                            setReceiptPreview(null);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white transition"
                          title="画像を削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border border-dashed border-sage/40 rounded-2xl hover:bg-sage/10 p-6 cursor-pointer transition">
                        <Upload className="w-8 h-8 text-slate-400 mb-2.5" />
                        <span className="text-xs font-semibold text-[#4A453F]">ポルトガル語レシートを添付</span>
                        <span className="text-[10px] text-slate-450 mt-1">PNG, JPG, WEBP formats</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleReceiptChange(e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* 3. MEAL IMAGE PANEL */}
                {activeTab === "image" && (
                  <div className="space-y-4">
                    <p className="text-[11px] text-slate-500 leading-normal">
                      お皿に乗った食事やスナックの写真を撮影・アップロードしてください。AIが三大栄養素・ビタミン等を推定分析します。
                    </p>

                    {foodPreview ? (
                      <div className="relative border border-slate-100 rounded-2xl overflow-hidden bg-slate-50">
                        {foodPreview.includes("placehold.co") ? (
                          <div className="p-4 text-center text-xs font-semibold text-teal-600 bg-teal-50/20 py-10">
                            {foodPreview.split("text=")[1] ? decodeURIComponent(foodPreview.split("text=")[1].replace(/\+/g, " ")) : "食事プレビュー"}
                          </div>
                        ) : (
                          <img
                            src={foodPreview}
                            alt="Food preview"
                            className="w-full max-h-[160px] object-contain mx-auto p-2"
                          />
                        )}
                        <button
                          onClick={() => {
                            setFoodFile(null);
                            setFoodPreview(null);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white transition"
                          title="画像を削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border border-dashed border-sage/40 rounded-2xl hover:bg-sage/10 p-6 cursor-pointer transition">
                        <Camera className="w-8 h-8 text-slate-400 mb-2.5" />
                        <span className="text-xs font-semibold text-[#4A453F]">お食事の写真をアップロード</span>
                        <span className="text-[10px] text-slate-450 mt-1">または直接カメラ撮影</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleFoodChange(e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* 4. VOICE MEMO PANEL */}
                {activeTab === "voice" && (
                  <div className="space-y-4">
                    <p className="text-[11px] text-slate-500 leading-normal">
                      ブラジルの食材、または食べたものの説明をポルトガル語、日本語、英語で録音できます。
                    </p>

                    <div className="flex flex-col items-center justify-center bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4">
                      {audioState === "idle" && (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="flex items-center justify-center w-12 h-12 rounded-full bg-olive hover:bg-opacity-90 text-white transition shadow-md shadow-olive/10 active:scale-95 cursor-pointer"
                        >
                          <Mic className="w-5 h-5" />
                        </button>
                      )}

                      {audioState === "recording" && (
                        <div className="flex flex-col items-center space-y-2">
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-500 hover:bg-rose-600 text-white transition shadow-lg relative animate-pulse active:scale-95"
                          >
                            <Square className="w-4 h-4" />
                            {/* Pulse glowing effect around recording */}
                            <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-25 pointer-events-none" />
                          </button>
                          <span className="text-[10px] text-rose-600 font-semibold uppercase tracking-wider animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            録音中です...
                          </span>
                        </div>
                      )}

                      {audioState === "playback_ready" && recordedAudioUrl && (
                        <div className="w-full space-y-3">
                          <div className="flex items-center justify-between bg-white border border-slate-200/60 px-3 py-2 rounded-xl">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                              <FileAudio className="w-4 h-4 text-olive" />
                              録音完了ボイス.webm
                            </span>
                            <button
                              type="button"
                              onClick={resetRecording}
                              className="text-slate-400 hover:text-rose-500 text-xs font-medium"
                            >
                              再録音
                            </button>
                          </div>
                          
                          {recordedAudioUrl !== "#" && (
                            <audio src={recordedAudioUrl} controls className="w-full h-8 max-w-full outline-none focus:outline-none" />
                          )}
                        </div>
                      )}

                      <span className="text-[10px] text-slate-400">
                        {audioState === "idle"
                          ? "ボタンを押して発話を開始"
                          : audioState === "recording"
                          ? "録音を停止するには丸いスクエアを押してください"
                          : "録音ボイスの音声を確認できます"}
                      </span>
                    </div>

                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="補足テキスト記述がある場合はこちらに入力（任意）"
                      className="w-full text-xs font-sans p-2 border border-slate-200 rounded-xl bg-white outline-none focus:border-olive"
                    />
                  </div>
                )}
              </div>

              {/* API and Validation Error Alert Box */}
              {apiError && (
                <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 flex gap-2.5 text-xs text-rose-800 leading-relaxed font-sans">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-rose-900 mb-0.5">アップロード失敗</h5>
                    <p>{apiError}</p>
                    <p className="text-[10px] text-rose-600/80 mt-1">
                      ※AI StudioのSecretsに有効な <strong>GEMINI_API_KEY</strong> が設定されていることを確認してください。未登録の場合は、右側の「手動追加」ボタンから栄養素を入力してシミュレーションできます。
                    </p>
                  </div>
                </div>
              )}

              {/* Master AI Trigger CTA (Auto OCR, normalization, target database maps) */}
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className={`w-full flex items-center justify-center gap-2 font-display text-xs font-bold py-3 px-4 rounded-2xl transition duration-200 transform active:scale-[0.99] cursor-pointer ${
                  isAnalyzing
                    ? "bg-slate-150 text-slate-400 cursor-not-allowed"
                    : "bg-[#6B705C] hover:bg-opacity-95 text-white shadow-md shadow-olive/10 font-serif"
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    Gemini AI でOCR ＆ 栄養解析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4.5 h-4.5" />
                    AIでお皿・レシート・音声を一括分析
                  </>
                )}
              </button>
            </div>

            {/* Quick Experience Simulator Panel (Human-centric helper) */}
            <div className="card bg-white/85 p-5 shadow-sm space-y-4">
              <div>
                <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wide font-serif">
                  模擬インプット・シミュレーター
                </h4>
                <p className="text-[10px] text-slate-500">
                  動作確認用のポルトガル語入力サンプルをロードして、AIのレスポンス（日本語への食品名正規化、PFC算出）を確認できます。
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  onClick={() => loadExampleData("padaria")}
                  className="w-full text-left bg-white/70 hover:bg-sage/15 border border-sage/10 rounded-2xl p-3 flex items-center gap-3 transition cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0 text-xs">
                    🍞
                  </div>
                  <div className="flex-1 min-w-0 font-sans text-xs">
                    <div className="font-semibold text-slate-700">🥖 朝食：パン屋（Padaria）レシート</div>
                    <div className="text-[10px] text-slate-500 truncate">pão francês (フランスパン), café (コーヒー)...</div>
                  </div>
                </button>

                <button
                  onClick={() => loadExampleData("dinner")}
                  className="w-full text-left bg-white/70 hover:bg-sage/15 border border-sage/10 rounded-2xl p-3 flex items-center gap-3 transition cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 text-xs">
                    🥩
                  </div>
                  <div className="flex-1 min-w-0 font-sans text-xs">
                    <div className="font-semibold text-slate-700">🥗 夕食：サーモンステーキと温野菜</div>
                    <div className="text-[10px] text-slate-500 truncate">filé de salmão (サケのソテー) などの写真...</div>
                  </div>
                </button>

                <button
                  onClick={() => loadExampleData("voice")}
                  className="w-full text-left bg-white/70 hover:bg-sage/15 border border-sage/10 rounded-2xl p-3 flex items-center gap-3 transition cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0 text-xs">
                    🎙️
                  </div>
                  <div className="flex-1 min-w-0 font-sans text-xs">
                    <div className="font-semibold text-slate-700">🎤 ボイス：ポルトガル語音声入力</div>
                    <div className="text-[10px] text-slate-500 truncate">pão de queijo (ポンデケージョ) やお昼ご飯の話...</div>
                  </div>
                </button>
              </div>
            </div>

          </section>

          {/* RIGHT PANEL: ANALYTICS, CHART REPORTS & ITEM LIST (grid level: 7/12) */}
          <section className="lg:col-span-7 space-y-6">
            
            {/* AI Advisor Response & Deficiency warnings first */}
            <RecommendationCard feedback={advisorFeedback} isAnalyzing={isAnalyzing} />

            {/* General Target & Expense stats (Daily or Monthly average 1/30) */}
            <DailyStats
              currentLog={currentLog}
              logs={logs}
              date={activeDate}
            />

            {/* Food items breakdown list with expandables, delete, quick manual-add */}
            <PortionList
              items={currentLog ? currentLog.items : []}
              onAddItem={handleAddManualFood}
              onDeleteItem={handleDeleteFood}
            />

            {/* Daily/Weekly Recharts expenses graph */}
            <ExpenseCharts logs={logs} />

          </section>

        </div>
      </main>

      {/* Aesthetic Footer status bar */}
      <footer className="bg-white/85 border-t border-sage/20 text-center py-6 mt-12 text-xs text-slate-500 font-sans">
        <p className="font-medium text-[#4A453F] font-serif">
          NutriGasto AI — ポルトガル語レシート ＆ 栄養PFC自動管理アシスタント
        </p>
        <p className="text-[10px] mt-1 text-slate-500">
          Built securely on Google AI Studio Server-side Gemini API
        </p>
      </footer>

    </div>
  );
}
