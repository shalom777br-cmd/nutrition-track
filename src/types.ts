export interface NutritionalMetrics {
  calories: number;       // kcal
  protein: number;        // g
  fat: number;            // g
  carbohydrates: number;  // g
  // Vitamins
  vitaminA: number;       // mcg (RE/RAE)
  vitaminB1: number;      // mg
  vitaminB2: number;      // mg
  vitaminB6: number;      // mg
  vitaminB12: number;     // mcg
  vitaminC: number;       // mg
  vitaminD: number;       // mcg
  vitaminE: number;       // mg
  // Minerals
  iron: number;           // mg
  calcium: number;        // mg
  magnesium: number;      // mg
  zinc: number;           // mg
  // Fiber
  fiber: number;          // g
}

export interface FoodItem {
  id: string;
  originalName: string;   // Original name as detected (e.g. "pão francês", "frango grelhado")
  japaneseName: string;   // Normalized Japanese translation (e.g. "パン（小麦）", "鶏肉（グリル）")
  source: 'receipt' | 'image' | 'voice' | 'text';
  price: number;          // Estimated/detected price (0 if not verified/free)
  quantity: string;       // Quantity text (e.g., "1 unit", "200g")
  nutrition: NutritionalMetrics;
  multiplier?: number;    // Multiplier for quantity/portions (default to 1)
}

export interface AnalysisResponse {
  items: Omit<FoodItem, 'id'>[];
  advisorFeedback: string; // Dynamic advisor message in Japanese
}

export interface DailyLog {
  id: string;
  date: string;          // YYYY-MM-DD
  items: FoodItem[];
  totalCost: number;     // Combined cost of items on this day
  hasReceipt: boolean;
  hasFoodPhoto: boolean;
  hasVoiceMemo: boolean;
}

export const RECOMMENDED_DAILY_INTAKE: NutritionalMetrics = {
  calories: 2000,
  protein: 60,
  fat: 55,
  carbohydrates: 250,
  // Vitamins
  vitaminA: 800,
  vitaminB1: 1.2,
  vitaminB2: 1.4,
  vitaminB6: 1.3,
  vitaminB12: 2.4,
  vitaminC: 100,
  vitaminD: 5.5,
  vitaminE: 6.0,
  // Minerals
  iron: 7.5,
  calcium: 650,
  magnesium: 320,
  zinc: 10.0,
  // Fiber
  fiber: 20,
};

export const NUTRIENT_UNITS: Record<keyof NutritionalMetrics, string> = {
  calories: 'kcal',
  protein: 'g',
  fat: 'g',
  carbohydrates: 'g',
  vitaminA: 'μg',
  vitaminB1: 'mg',
  vitaminB2: 'mg',
  vitaminB6: 'mg',
  vitaminB12: 'μg',
  vitaminC: 'mg',
  vitaminD: 'μg',
  vitaminE: 'mg',
  calcium: 'mg',
  iron: 'mg',
  magnesium: 'mg',
  zinc: 'mg',
  fiber: 'g',
};

export const NUTRIENT_LABELS: Record<keyof NutritionalMetrics, string> = {
  calories: 'エネルギー (カロリー)',
  protein: 'たんぱく質 (P)',
  fat: '脂質 (F)',
  carbohydrates: '炭水化物 (C)',
  vitaminA: 'ビタミンA',
  vitaminB1: 'ビタミンB1',
  vitaminB2: 'ビタミンB2',
  vitaminB6: 'ビタミンB6',
  vitaminB12: 'ビタミンB12',
  vitaminC: 'ビタミンC',
  vitaminD: 'ビタミンD',
  vitaminE: 'ビタミンE',
  calcium: 'カルシウム',
  iron: '鉄分',
  magnesium: 'マグネシウム',
  zinc: '亜鉛',
  fiber: '食物繊維',
};
