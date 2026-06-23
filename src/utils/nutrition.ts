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
    magnesium: 0,
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
    totals.magnesium += (item.nutrition.magnesium || 0) * m;
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

// Generate pre-populated historical logs - Now returns empty array as requested to remove dummy elements
export function getInitialLogs(): DailyLog[] {
  return [];
}
