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
  PlusCircle,
  X
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
  const [activeTab, setActiveTab] = useState<"text" | "receipt" | "image" | "voice">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("nutrigasto_active_tab") as any) || "image";
    }
    return "image";
  });
  const [inputText, setInputText] = useState("");
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [receiptPreviews, setReceiptPreviews] = useState<string[]>([]);
  const [foodFiles, setFoodFiles] = useState<File[]>([]);
  const [foodPreviews, setFoodPreviews] = useState<string[]>([]);

  // Sync draft states to localStorage
  useEffect(() => {
    localStorage.setItem("nutrigasto_active_tab", activeTab);
  }, [activeTab]);

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
    const stored = localStorage.getItem("nutrigasto_logs_v2");
    let currentLogs: DailyLog[] = [];
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          currentLogs = parsed;
        }
      } catch (e) {
        console.error("Failed to parse local storage, loading defaults", e);
        currentLogs = [];
      }
    }
    
    // Filter out dummy items or logs that were pre-populated (e.g. IDs starting with "log-1" through "log-4")
    // Keep only user generated logs or empty array so that charts do not show pre-populated dummy data lines
    const cleanedLogs = currentLogs.filter(log => log && typeof log === "object" && Array.isArray(log.items) && !["log-1", "log-2", "log-3", "log-4"].includes(log.id));
    
    setLogs(cleanedLogs);
    localStorage.setItem("nutrigasto_logs_v2", JSON.stringify(cleanedLogs));
  }, []);

  // Save changes to localStorage helper
  const saveLogs = (updatedLogs: DailyLog[]) => {
    setLogs(updatedLogs);
    localStorage.setItem("nutrigasto_logs_v2", JSON.stringify(updatedLogs));
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

  // Helper to compress images on the client side to prevent payload too large (413) errors
  const compressImage = (file: File | Blob, maxWidth = 1280, maxHeight = 1280, quality = 0.8): Promise<Blob | File> => {
    return new Promise((resolve) => {
      if (!file.type || !file.type.startsWith("image/")) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = () => {
          resolve(file);
        };
      };
      reader.onerror = () => {
        resolve(file);
      };
    });
  };

  // --- Voice Memo Recorder Logic ---
  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let recorder: MediaRecorder;
      
      let mimeType = "";
      if (typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          mimeType = "audio/ogg";
        }
      }

      try {
        if (mimeType) {
          recorder = new MediaRecorder(stream, { mimeType });
        } else {
          recorder = new MediaRecorder(stream);
        }
      } catch (e) {
        console.warn("Failed with selected mimeType, falling back to default constructor", e);
        recorder = new MediaRecorder(stream);
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
  const handleReceiptChangeMultiple = (files: FileList) => {
    const fileArray = Array.from(files);
    setReceiptFiles((prev) => [...prev, ...fileArray]);
    const urlArray = fileArray.map((file) => URL.createObjectURL(file));
    setReceiptPreviews((prev) => [...prev, ...urlArray]);
    setApiError(null);
  };

  const handleRemoveReceiptImage = (index: number) => {
    setReceiptFiles((prev) => prev.filter((_, idx) => idx !== index));
    setReceiptPreviews((prev) => {
      const removedUrl = prev[index];
      try {
        URL.revokeObjectURL(removedUrl);
      } catch (e) {
        console.warn(e);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleFoodChangeMultiple = (files: FileList) => {
    const fileArray = Array.from(files);
    setFoodFiles((prev) => [...prev, ...fileArray]);
    const urlArray = fileArray.map((file) => URL.createObjectURL(file));
    setFoodPreviews((prev) => [...prev, ...urlArray]);
    setApiError(null);
  };

  const handleRemoveFoodImage = (index: number) => {
    setFoodFiles((prev) => prev.filter((_, idx) => idx !== index));
    setFoodPreviews((prev) => {
      const removedUrl = prev[index];
      try {
        URL.revokeObjectURL(removedUrl);
      } catch (e) {
        console.warn(e);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  // --- Perform actual AI Analysis calling our full stack backend ---
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setApiError(null);

    try {
      let receiptImagesBase64: string[] = [];
      let foodImagesBase64: string[] = [];
      let audioBase64 = "";
      let audioMime = "";

      if (receiptFiles.length > 0) {
        receiptImagesBase64 = await Promise.all(
          receiptFiles.map(async (file) => {
            const compressed = await compressImage(file);
            return fileToBase64(compressed);
          })
        );
      }
      if (foodFiles.length > 0) {
        foodImagesBase64 = await Promise.all(
          foodFiles.map(async (file) => {
            const compressed = await compressImage(file);
            return fileToBase64(compressed);
          })
        );
      }
      if (audioBlob) {
        audioBase64 = await fileToBase64(audioBlob);
        audioMime = audioBlob.type;
      }

      // Payload must contain at least one valid input
      if (!inputText.trim() && receiptImagesBase64.length === 0 && foodImagesBase64.length === 0 && !audioBase64) {
        throw new Error("いずれかの入力を提供してください（テキスト入力、レシート、食事の写真、または音声メモ）。");
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          receiptImages: receiptImagesBase64,
          foodImages: foodImagesBase64,
          audio: audioBase64,
          audioMimeType: audioMime,
        }),
      });

      const responseText = await response.text();
      let payload: any = null;
      try {
        payload = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse server response as JSON. Response text:", responseText, "Error details:", parseError);
        if (!response.ok) {
          throw new Error(`サーバーエラーが発生しました (ステータスコード: ${response.status})。しばらく時間をおいてから再度お試しください。`);
        }
        throw new Error(`サーバーからの応答を正しく解析できませんでした。ステータス: ${response.status}. 応答の最初の100文字: "${responseText.substring(0, 100)}..."`);
      }

      if (!response.ok) {
        if (payload && payload.stack) {
          console.error("Server-side error stack trace:", payload.stack);
        }
        throw new Error(payload?.error || "Gemini AIの分析処理に失敗しました。");
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
            hasReceipt: updatedLogs[existingIdx].hasReceipt || receiptFiles.length > 0,
            hasFoodPhoto: updatedLogs[existingIdx].hasFoodPhoto || foodFiles.length > 0,
            hasVoiceMemo: updatedLogs[existingIdx].hasVoiceMemo || !!audioBlob,
          };
        } else {
          updatedLogs.push({
            id: `log-${Date.now()}`,
            date: activeDate,
            items: analyzedItems,
            totalCost: analyzedItems.reduce((s, i) => s + (i.price || 0), 0),
            hasReceipt: receiptFiles.length > 0,
            hasFoodPhoto: foodFiles.length > 0,
            hasVoiceMemo: !!audioBlob,
          });
        }

        saveLogs(updatedLogs);
        setAdvisorFeedback(payload.advisorFeedback);

        // Reset input fields on success
        setInputText("");
        setReceiptFiles([]);
        setReceiptPreviews([]);
        setFoodFiles([]);
        setFoodPreviews([]);
        resetRecording();
      } else {
        setAdvisorFeedback(payload.advisorFeedback || "食品項目が検出されませんでした。より具体的なテキストや高解像度の画像を試してください。");
      }

    } catch (err: any) {
      console.error("Analysis failure - Full details:", err);
      if (err.stack) {
        console.error("Analysis failure client stack:", err.stack);
      }
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
          totalCost: filtered.reduce((acc, curr) => acc + (curr.price || 0) * (typeof curr.multiplier === "number" ? curr.multiplier : 1), 0),
        };
      }
      return log;
    }).filter((log) => log.items.length > 0); // remove empty days if needed, or keep them
    saveLogs(updated);
  };

  // --- Handler: Clear All Food Items for Active Date ---
  const handleClearAllFoods = () => {
    const updated = logs.map((log) => {
      if (log.date === activeDate) {
        return {
          ...log,
          items: [],
          totalCost: 0,
        };
      }
      return log;
    }).filter((log) => log.items.length > 0);
    saveLogs(updated);
  };

  // --- Handler: Update Individual Food Item Multiplier ---
  const handleUpdateFoodMultiplier = (itemId: string, multiplier: number) => {
    const updated = logs.map((log) => {
      if (log.date === activeDate) {
        const updatedItems = log.items.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              multiplier: Math.max(0.1, parseFloat(multiplier.toFixed(2))),
            };
          }
          return item;
        });
        return {
          ...log,
          items: updatedItems,
          totalCost: updatedItems.reduce((acc, curr) => acc + (curr.price || 0) * (typeof curr.multiplier === "number" ? curr.multiplier : 1), 0),
        };
      }
      return log;
    });
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
      const updatedItems = [...original, newItem];
      updated[existingIdx] = {
        ...updated[existingIdx],
        items: updatedItems,
        totalCost: updatedItems.reduce((acc, curr) => acc + (curr.price || 0) * (typeof curr.multiplier === "number" ? curr.multiplier : 1), 0),
      };
    } else {
      updated.push({
        id: `log-${Date.now()}`,
        date: activeDate,
        items: [newItem],
        totalCost: (newItem.price || 0) * (typeof newItem.multiplier === "number" ? newItem.multiplier : 1),
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
      setReceiptPreviews(["https://placehold.co/400x500/f8fafc/0f172a?text=Padaria+Estrela%0A%0A2x+Pao+Frances%0A1x+Preto+Cafe%0A1x+Manteiga%0A%0ATOTAL:+R$+8.50"]);
      setReceiptFiles([new File([], "receita_padaria.jpg", { type: "image/jpeg" })]);
    } else if (type === "dinner") {
      setActiveTab("image");
      setInputText("健康のために付け合わせの蒸しブロッコリーを大盛りにしたサケのソテー、夕食メニューです。");
      setFoodPreviews(["https://placehold.co/500x400/f8fafc/10b981?text=Salmon+Grehalo+Photo"]);
      setFoodFiles([new File([], "plate_jantar.jpg", { type: "image/jpeg" })]);
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
      localStorage.setItem("nutrigasto_logs_v2", JSON.stringify(initial));
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


        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8 space-y-8">
        

        {/* TOP PANEL: AI ANALYSIS CONSOLE & OPTIONAL SIMULATORS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* TOP LEFT: AI Multimodal Input Console */}
          <section className="lg:col-span-6 space-y-6">
            {/* Analyzer Console Card */}
            <div className="card bg-white/85 p-4 shadow-sm space-y-3">
              <div>
                <h2 className="font-display text-base font-bold text-slate-800 font-serif">
                  入力
                </h2>
                <p className="text-[11px] text-slate-500 leading-tight">
                  食品の情報が含まれる素材をアップロード・録音してください
                </p>
              </div>

              {/* Analyzer Sources Switch Tabs */}
              <div className="grid grid-cols-4 p-1 bg-sage/10 rounded-xl border border-sage/5">
                <button
                  onClick={() => setActiveTab("image")}
                  className={`flex flex-col items-center gap-1 py-1.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                    activeTab === "image"
                      ? "bg-white text-olive shadow-xs"
                      : "text-[#6B705C] hover:text-slate-800"
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  料理写真
                </button>
                <button
                  onClick={() => setActiveTab("text")}
                  className={`flex flex-col items-center gap-1 py-1.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                    activeTab === "text"
                      ? "bg-white text-olive shadow-xs"
                      : "text-[#6B705C] hover:text-slate-800"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  メモ
                </button>
                <button
                  onClick={() => setActiveTab("receipt")}
                  className={`flex flex-col items-center gap-1 py-1.5 text-[10px] font-bold rounded-lg transition flex-wrap shrink-0 cursor-pointer ${
                    activeTab === "receipt"
                      ? "bg-white text-olive shadow-xs"
                      : "text-[#6B705C] hover:text-slate-800"
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  レシート
                </button>
                <button
                  onClick={() => setActiveTab("voice")}
                  className={`flex flex-col items-center gap-1 py-1.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                    activeTab === "voice"
                      ? "bg-white text-olive shadow-xs"
                      : "text-[#6B705C] hover:text-slate-800"
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  音声メモ
                </button>
              </div>

              {/* Input Panes */}
              <div className="min-h-[90px] flex flex-col justify-center">
                
                {/* 1. TEXT MEMO PANEL */}
                {activeTab === "text" && (
                  <div className="space-y-2 relative">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="食べたもののテキストを自由に入力してください。例：マクドナルドでビッグマック1個とポテトMサイズを食べた"
                      className="w-full h-18 text-xs border border-sage/30 focus:border-olive focus:ring-0 p-2 pr-8 outline-none rounded-xl bg-white/55 placeholder:text-slate-450 leading-relaxed"
                    />
                    {inputText && (
                      <button
                        type="button"
                        onClick={() => setInputText("")}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition p-1 rounded-full hover:bg-slate-100 cursor-pointer"
                        title="テキストを消去"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* 2. RECEIPT OCR PANEL */}
                {activeTab === "receipt" && (
                  <div className="space-y-4">
                    <p className="text-[11px] text-slate-500 leading-normal">
                      ポルトガル語の買い出しレシート、レストランの請求書をスキャンします（複数選択して一括アップロード可能）。金額と食品名を標準化し自動読み込みします。
                    </p>
 
                    {receiptPreviews.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border border-slate-100 p-3 rounded-2xl bg-slate-50/50">
                        {receiptPreviews.map((preview, index) => (
                          <div key={index} className="relative aspect-video sm:aspect-square border border-slate-200 rounded-xl overflow-hidden bg-white group shadow-xs">
                            {preview.includes("placehold.co") ? (
                              <div className="p-3 font-mono text-[9px] text-zinc-600 bg-amber-50/50 whitespace-pre rounded-lg h-full overflow-auto leading-tight">
                                {preview.split("text=")[1] ? decodeURIComponent(preview.split("text=")[1].replace(/\+/g, " ")) : "レシート"}
                              </div>
                            ) : (
                              <img
                                src={preview}
                                alt={`Receipt preview ${index + 1}`}
                                className="w-full h-full object-cover p-1 rounded-xl"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveReceiptImage(index)}
                              className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white transition bubble-shadow"
                              title="削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <span className="absolute bottom-1 left-1.5 text-[9px] bg-slate-950/55 px-1.5 py-0.5 rounded-md text-white font-mono font-bold">
                              #{index + 1}
                            </span>
                          </div>
                        ))}

                        {/* Add more placeholder in the grid */}
                        <label className="flex flex-col items-center justify-center border border-dashed border-sage/40 rounded-xl hover:bg-sage/10 aspect-video sm:aspect-square cursor-pointer transition p-2">
                          <Plus className="w-5 h-5 text-slate-400 mb-1" />
                          <span className="text-[10px] font-semibold text-[#4A453F]">追加する</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => e.target.files && handleReceiptChangeMultiple(e.target.files)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}

                    {receiptPreviews.length === 0 && (
                      <label className="flex flex-col items-center justify-center border border-dashed border-sage/40 rounded-2xl hover:bg-sage/10 p-6 cursor-pointer transition">
                        <Upload className="w-8 h-8 text-slate-400 mb-2.5 animate-bounce" />
                        <span className="text-xs font-semibold text-[#4A453F]">ポルトガル語レシートを添付</span>
                        <span className="text-[10px] text-slate-450 mt-1">複数選択・一括アップロード対応</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => e.target.files && handleReceiptChangeMultiple(e.target.files)}
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
                      お食事やスナックの写真を撮影・アップロードしてください（複数選択して一括アップロード可能）。AIが三大栄養素・ビタミン等を推定分析します。
                    </p>
 
                    {foodPreviews.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border border-slate-100 p-3 rounded-2xl bg-slate-50/50">
                        {foodPreviews.map((preview, index) => (
                          <div key={index} className="relative aspect-video sm:aspect-square border border-slate-200 rounded-xl overflow-hidden bg-white group shadow-xs">
                            <img
                              src={preview}
                              alt={`Meal preview ${index + 1}`}
                              className="w-full h-full object-cover p-1 rounded-xl"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveFoodImage(index)}
                              className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white transition bubble-shadow"
                              title="削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <span className="absolute bottom-1 left-1.5 text-[9px] bg-slate-950/55 px-1.5 py-0.5 rounded-md text-white font-mono font-bold font-serif">
                              #{index + 1}
                            </span>
                          </div>
                        ))}
 
                        {/* Add more placeholder in the grid */}
                        <label className="flex flex-col items-center justify-center border border-dashed border-sage/40 rounded-xl hover:bg-sage/10 aspect-video sm:aspect-square cursor-pointer transition p-2">
                          <Plus className="w-5 h-5 text-slate-400 mb-1" />
                          <span className="text-[10px] font-semibold text-[#4A453F]">追加する</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => e.target.files && handleFoodChangeMultiple(e.target.files)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
 
                    {foodPreviews.length === 0 && (
                      <label className="flex flex-col items-center justify-center border border-dashed border-sage/40 rounded-2xl hover:bg-sage/10 p-6 cursor-pointer transition">
                        <Camera className="w-8 h-8 text-slate-400 mb-2.5 animate-bounce" />
                        <span className="text-xs font-semibold text-[#4A453F]">お食事の写真をアップロード</span>
                        <span className="text-[10px] text-slate-450 mt-1">複数選択・カメラ一括撮影対応</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => e.target.files && handleFoodChangeMultiple(e.target.files)}
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

                    <div className="relative">
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="補足テキスト記述がある場合はこちらに入力（任意）"
                        className="w-full text-xs font-sans p-2 pr-8 border border-slate-200 rounded-xl bg-white outline-none focus:border-olive"
                      />
                      {inputText && (
                        <button
                          type="button"
                          onClick={() => setInputText("")}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition p-1 rounded-full hover:bg-slate-100 cursor-pointer"
                          title="テキストを消去"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* API and Validation Error Alert Box */}
              {apiError && (
                <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 flex justify-between gap-2.5 text-xs text-rose-800 leading-relaxed font-sans relative">
                  <div className="flex gap-2.5">
                    <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-semibold text-rose-900 mb-0.5">アップロード失敗</h5>
                      <p>{apiError}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setApiError(null)}
                    className="text-rose-400 hover:text-rose-700 p-1 rounded-lg transition shrink-0 cursor-pointer"
                    title="エラー表示を閉じる"
                  >
                    <X className="w-4 h-4" />
                  </button>
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
          </section>

          {/* TOP RIGHT: Daily Stats and Portion List */}
          <section className="lg:col-span-6 space-y-6">
            <DailyStats
              currentLog={currentLog}
              logs={logs}
              date={activeDate}
            />
            <PortionList
              items={currentLog ? currentLog.items : []}
              onAddItem={handleAddManualFood}
              onDeleteItem={handleDeleteFood}
              onUpdateMultiplier={handleUpdateFoodMultiplier}
              onClearAllItems={handleClearAllFoods}
            />
          </section>

        </div>

        {/* Section Divider */}
        <hr className="border-sage/20 my-2" />

        {/* BOTTOM PANEL: DASHBOARD STATISTICS & RESULTS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* LEFT DASHBOARD COLUMN: Advisor feedback & Nutrient/Cost targets */}
          <section className="lg:col-span-6 space-y-6">
            <RecommendationCard feedback={advisorFeedback} isAnalyzing={isAnalyzing} />
          </section>

          {/* RIGHT DASHBOARD COLUMN: Registered foods list & dynamic charts */}
          <section className="lg:col-span-6 space-y-6">
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
