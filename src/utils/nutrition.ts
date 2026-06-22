import { FoodItem, DailyLog, NutritionalMetrics, RECOMMENDED_DAILY_INTAKE } from "../types";

export function createEmptyNutritionalMetrics(): NutritionalMetrics {
  return {
    calories: 0,
    protein: 0,
    fat: 0,
    carbohydrates: 0,
    vitaminA: 0,
    vitaminB1: 0,
    vitaminB2: 0,
    vitaminB6: 0,
    vitaminB12: 0,
    vitaminC: 0,
    vitaminD: 0,
    vitaminE: 0,
    iron: 0,
    calcium: 0,
    zinc: 0,
    fiber: 0,
  };
}

// Sum nutrition for a list of food items
export function calculateTotalNutrition(items: FoodItem[]): NutritionalMetrics {
  const totals = createEmptyNutritionalMetrics();
  items.forEach((item) => {
    const m = typeof item.multiplier === "number" ? item.multiplier : 1;
    totals.calories += (item.nutrition.calories || 0) * m;
    totals.protein += (item.nutrition.protein || 0) * m;
    totals.fat += (item.nutrition.fat || 0) * m;
    totals.carbohydrates += (item.nutrition.carbohydrates || 0) * m;
    totals.vitaminA += (item.nutrition.vitaminA || 0) * m;
    totals.vitaminB1 += (item.nutrition.vitaminB1 || 0) * m;
    totals.vitaminB2 += (item.nutrition.vitaminB2 || 0) * m;
    totals.vitaminB6 += (item.nutrition.vitaminB6 || 0) * m;
    totals.vitaminB12 += (item.nutrition.vitaminB12 || 0) * m;
    totals.vitaminC += (item.nutrition.vitaminC || 0) * m;
    totals.vitaminD += (item.nutrition.vitaminD || 0) * m;
    totals.vitaminE += (item.nutrition.vitaminE || 0) * m;
    totals.iron += (item.nutrition.iron || 0) * m;
    totals.calcium += (item.nutrition.calcium || 0) * m;
    totals.zinc += (item.nutrition.zinc || 0) * m;
    totals.fiber += (item.nutrition.fiber || 0) * m;
  });

  // Round values for display clarity
  Object.keys(totals).forEach((key) => {
    const k = key as keyof NutritionalMetrics;
    totals[k] = parseFloat(totals[k].toFixed(1));
  });

  return totals;
}

// Generate pre-populated historical logs so chart looks gorgeous instantly
export function getInitialLogs(): DailyLog[] {
  return [
    {
      id: "log-1",
      date: "2026-06-17",
      totalCost: 0,
      hasReceipt: true,
      hasFoodPhoto: false,
      hasVoiceMemo: false,
      items: [
        {
          id: "item-1a",
          originalName: "Pão francês (2 unidades) com manteiga",
          japaneseName: "フランスパン（バター付き・2個）",
          source: "receipt",
          price: 0,
          quantity: "2個",
          nutrition: {
            calories: 340,
            protein: 9.0,
            fat: 8.5,
            carbohydrates: 56.0,
            vitaminA: 42,
            vitaminB1: 0.12,
            vitaminB2: 0.08,
            vitaminB6: 0.06,
            vitaminB12: 0.0,
            vitaminC: 0.0,
            vitaminD: 0.1,
            vitaminE: 0.6,
            iron: 1.5,
            calcium: 30,
            zinc: 0.8,
            fiber: 2.2
          }
        },
        {
          id: "item-1b",
          originalName: "Café expresso",
          japaneseName: "エスプレッソコーヒー",
          source: "receipt",
          price: 0,
          quantity: "1杯",
          nutrition: {
            calories: 5,
            protein: 0.2,
            fat: 0.1,
            carbohydrates: 0.8,
            vitaminA: 0,
            vitaminB1: 0.01,
            vitaminB2: 0.01,
            vitaminB6: 0.0,
            vitaminB12: 0.0,
            vitaminC: 0.0,
            vitaminD: 0.0,
            vitaminE: 0.0,
            iron: 0.1,
            calcium: 2,
            zinc: 0.05,
            fiber: 0.2
          }
        },
        {
          id: "item-1c",
          originalName: "Prato Feito: Arroz, feijão e frango grelhado",
          japaneseName: "ブラジルご飯プレート：米、フェイジョン、鶏肉グリル",
          source: "receipt",
          price: 0,
          quantity: "1人前",
          nutrition: {
            calories: 680,
            protein: 48.0,
            fat: 16.0,
            carbohydrates: 74.0,
            vitaminA: 78,
            vitaminB1: 0.35,
            vitaminB2: 0.28,
            vitaminB6: 0.62,
            vitaminB12: 0.45,
            vitaminC: 4.5,
            vitaminD: 0.2,
            vitaminE: 1.8,
            iron: 4.8,
            calcium: 95,
            zinc: 3.5,
            fiber: 9.0
          }
        }
      ]
    },
    {
      id: "log-2",
      date: "2026-06-18",
      totalCost: 0,
      hasReceipt: false,
      hasFoodPhoto: true,
      hasVoiceMemo: false,
      items: [
        {
          id: "item-2a",
          originalName: "Tapioca com manteiga e queijo coalho",
          japaneseName: "タピオカクレープ（バターとコアーリョチーズ）",
          source: "image",
          price: 0,
          quantity: "1個",
          nutrition: {
            calories: 420,
            protein: 11.5,
            fat: 15.0,
            carbohydrates: 58.0,
            vitaminA: 120,
            vitaminB1: 0.05,
            vitaminB2: 0.18,
            vitaminB6: 0.04,
            vitaminB12: 0.5,
            vitaminC: 0,
            vitaminD: 0.3,
            vitaminE: 0.8,
            iron: 1.2,
            calcium: 280,
            zinc: 1.1,
            fiber: 0.8
          }
        },
        {
          id: "item-2b",
          originalName: "Salada de frutas com granola",
          japaneseName: "フルーツサラダ（グラノーラ添え）",
          source: "image",
          price: 0,
          quantity: "1カップ",
          nutrition: {
            calories: 240,
            protein: 4.2,
            fat: 3.8,
            carbohydrates: 48.0,
            vitaminA: 190,
            vitaminB1: 0.15,
            vitaminB2: 0.12,
            vitaminB6: 0.22,
            vitaminB12: 0.0,
            vitaminC: 48.0,
            vitaminD: 0.0,
            vitaminE: 1.1,
            iron: 1.8,
            calcium: 45,
            zinc: 0.7,
            fiber: 5.5
          }
        },
        {
          id: "item-2c",
          originalName: "Bife acebolado com arroz e purê de batata",
          japaneseName: "牛赤身肉ステーキ（玉ねぎソース、米、ポテトピュレ）",
          source: "text",
          price: 0,
          quantity: "1人前",
          nutrition: {
            calories: 720,
            protein: 45.0,
            fat: 28.0,
            carbohydrates: 65.0,
            vitaminA: 40,
            vitaminB1: 0.28,
            vitaminB2: 0.32,
            vitaminB6: 0.68,
            vitaminB12: 2.1,
            vitaminC: 6.0,
            vitaminD: 0.4,
            vitaminE: 1.5,
            iron: 5.2,
            calcium: 55,
            zinc: 6.2,
            fiber: 3.4
          }
        }
      ]
    },
    {
      id: "log-3",
      date: "2026-06-19",
      totalCost: 0,
      hasReceipt: true,
      hasFoodPhoto: true,
      hasVoiceMemo: true,
      items: [
        {
          id: "item-3a",
          originalName: "Mamão Papaia (metade)",
          japaneseName: "パパイヤ（ハーフ）",
          source: "image",
          price: 0,
          quantity: "半玉",
          nutrition: {
            calories: 60,
            protein: 0.6,
            fat: 0.1,
            carbohydrates: 15.0,
            vitaminA: 410,
            vitaminB1: 0.04,
            vitaminB2: 0.04,
            vitaminB6: 0.03,
            vitaminB12: 0.0,
            vitaminC: 85.0,
            vitaminD: 0.0,
            vitaminE: 0.4,
            iron: 0.4,
            calcium: 28,
            zinc: 0.1,
            fiber: 2.5
          }
        },
        {
          id: "item-3b",
          originalName: "Açaí na tigela com banana e xarope de guaraná",
          japaneseName: "アサイーボウル（バナナ・ガラナシロップ）",
          source: "voice",
          price: 0,
          quantity: "大鉢一杯",
          nutrition: {
            calories: 380,
            protein: 3.5,
            fat: 9.0,
            carbohydrates: 68.0,
            vitaminA: 150,
            vitaminB1: 0.08,
            vitaminB2: 0.06,
            vitaminB6: 0.15,
            vitaminB12: 0.0,
            vitaminC: 18.0,
            vitaminD: 0.0,
            vitaminE: 2.6,
            iron: 1.6,
            calcium: 62,
            zinc: 0.4,
            fiber: 6.8
          }
        },
        {
          id: "item-3c",
          originalName: "Feijoada tradicional com couve refogada e laranja",
          japaneseName: "フェイジョアーダ（ケール炒め＆オレンジ添え）",
          source: "receipt",
          price: 0,
          quantity: "1.5人前",
          nutrition: {
            calories: 950,
            protein: 58.0,
            fat: 42.0,
            carbohydrates: 85.0,
            vitaminA: 280,
            vitaminB1: 0.72,
            vitaminB2: 0.45,
            vitaminB6: 0.58,
            vitaminB12: 1.8,
            vitaminC: 56.0,
            vitaminD: 0.5,
            vitaminE: 3.2,
            iron: 7.8,
            calcium: 220,
            zinc: 5.8,
            fiber: 18.5
          }
        }
      ]
    },
    {
      id: "log-4",
      date: "2026-06-20",
      totalCost: 0,
      hasReceipt: false,
      hasFoodPhoto: false,
      hasVoiceMemo: true,
      items: [
        {
          id: "item-4a",
          originalName: "Pão de queijo (5 unidades)",
          japaneseName: "ポンデケージョ（5個）",
          source: "voice",
          price: 0,
          quantity: "5個",
          nutrition: {
            calories: 390,
            protein: 8.5,
            fat: 18.0,
            carbohydrates: 45.0,
            vitaminA: 140,
            vitaminB1: 0.02,
            vitaminB2: 0.15,
            vitaminB6: 0.02,
            vitaminB12: 0.4,
            vitaminC: 0.0,
            vitaminD: 0.2,
            vitaminE: 0.5,
            iron: 0.5,
            calcium: 190,
            zinc: 0.6,
            fiber: 0.5
          }
        },
        {
          id: "item-4b",
          originalName: "Filé de salmão grelhado com brocolis ao vapor",
          japaneseName: "鮭のグリルと蒸しブロッコリー",
          source: "text",
          price: 0,
          quantity: "1人前",
          nutrition: {
            calories: 450,
            protein: 36.0,
            fat: 22.0,
            carbohydrates: 12.0,
            vitaminA: 180,
            vitaminB1: 0.32,
            vitaminB2: 0.28,
            vitaminB6: 0.85,
            vitaminB12: 4.2,
            vitaminC: 75.0,
            vitaminD: 10.5,
            vitaminE: 4.8,
            iron: 2.2,
            calcium: 110,
            zinc: 1.8,
            fiber: 4.2
          }
        }
      ]
    }
  ];
}
