/**
 * Starter food library. Macros are per serving and rounded — good enough
 * for calorie tracking, and deliberately opinionated toward everyday
 * Indian and Western staples so the first search a user runs finds
 * something. A real deployment would layer a full database (e.g. Open
 * Food Facts) behind the same `/api/foods` contract.
 */
export interface SeedFood {
  name: string;
  servingLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const SEED_FOODS: SeedFood[] = [
  // Indian staples
  { name: "Roti (whole wheat)", servingLabel: "1 roti", calories: 104, protein: 3, carbs: 20, fat: 2 },
  { name: "Naan", servingLabel: "1 piece", calories: 262, protein: 9, carbs: 45, fat: 5 },
  { name: "Plain paratha", servingLabel: "1 paratha", calories: 210, protein: 5, carbs: 28, fat: 9 },
  { name: "Aloo paratha", servingLabel: "1 paratha", calories: 300, protein: 6, carbs: 40, fat: 13 },
  { name: "Steamed basmati rice", servingLabel: "1 cup", calories: 205, protein: 4, carbs: 45, fat: 0 },
  { name: "Jeera rice", servingLabel: "1 cup", calories: 250, protein: 4, carbs: 45, fat: 6 },
  { name: "Dal tadka", servingLabel: "1 cup", calories: 180, protein: 9, carbs: 25, fat: 5 },
  { name: "Rajma curry", servingLabel: "1 cup", calories: 220, protein: 11, carbs: 32, fat: 5 },
  { name: "Chole (chickpea curry)", servingLabel: "1 cup", calories: 265, protein: 12, carbs: 38, fat: 7 },
  { name: "Palak paneer", servingLabel: "1 cup", calories: 300, protein: 14, carbs: 12, fat: 22 },
  { name: "Paneer butter masala", servingLabel: "1 cup", calories: 380, protein: 15, carbs: 14, fat: 30 },
  { name: "Butter chicken", servingLabel: "1 cup", calories: 420, protein: 30, carbs: 12, fat: 28 },
  { name: "Chicken tikka", servingLabel: "4 pieces", calories: 260, protein: 32, carbs: 5, fat: 12 },
  { name: "Masala dosa", servingLabel: "1 dosa", calories: 390, protein: 8, carbs: 58, fat: 14 },
  { name: "Plain dosa", servingLabel: "1 dosa", calories: 168, protein: 4, carbs: 28, fat: 4 },
  { name: "Idli", servingLabel: "2 idlis", calories: 116, protein: 4, carbs: 24, fat: 1 },
  { name: "Sambar", servingLabel: "1 cup", calories: 140, protein: 7, carbs: 20, fat: 4 },
  { name: "Poha", servingLabel: "1 cup", calories: 250, protein: 5, carbs: 45, fat: 6 },
  { name: "Upma", servingLabel: "1 cup", calories: 230, protein: 6, carbs: 38, fat: 7 },
  { name: "Samosa", servingLabel: "1 piece", calories: 262, protein: 4, carbs: 32, fat: 13 },
  { name: "Curd / plain yogurt", servingLabel: "1 cup", calories: 98, protein: 11, carbs: 12, fat: 1 },
  { name: "Lassi (sweet)", servingLabel: "1 glass", calories: 220, protein: 8, carbs: 34, fat: 5 },
  { name: "Masala chai", servingLabel: "1 cup", calories: 105, protein: 3, carbs: 15, fat: 4 },

  // Proteins
  { name: "Chicken breast, grilled", servingLabel: "100 g", calories: 165, protein: 31, carbs: 0, fat: 4 },
  { name: "Egg, boiled", servingLabel: "1 large", calories: 78, protein: 6, carbs: 1, fat: 5 },
  { name: "Egg omelette (2 eggs)", servingLabel: "1 omelette", calories: 220, protein: 13, carbs: 2, fat: 17 },
  { name: "Paneer", servingLabel: "100 g", calories: 296, protein: 20, carbs: 4, fat: 22 },
  { name: "Tofu, firm", servingLabel: "100 g", calories: 144, protein: 17, carbs: 3, fat: 9 },
  { name: "Salmon, baked", servingLabel: "100 g", calories: 208, protein: 20, carbs: 0, fat: 13 },
  { name: "Tuna, canned in water", servingLabel: "1 can", calories: 128, protein: 29, carbs: 0, fat: 1 },
  { name: "Whey protein shake", servingLabel: "1 scoop", calories: 120, protein: 24, carbs: 3, fat: 1 },
  { name: "Greek yogurt, plain", servingLabel: "170 g", calories: 100, protein: 17, carbs: 6, fat: 1 },

  // Grains & carbs
  { name: "Oats, cooked", servingLabel: "1 cup", calories: 154, protein: 6, carbs: 27, fat: 3 },
  { name: "Whole wheat bread", servingLabel: "1 slice", calories: 81, protein: 4, carbs: 14, fat: 1 },
  { name: "Pasta, cooked", servingLabel: "1 cup", calories: 220, protein: 8, carbs: 43, fat: 1 },
  { name: "Quinoa, cooked", servingLabel: "1 cup", calories: 222, protein: 8, carbs: 39, fat: 4 },
  { name: "Potato, boiled", servingLabel: "1 medium", calories: 130, protein: 3, carbs: 30, fat: 0 },
  { name: "Sweet potato, baked", servingLabel: "1 medium", calories: 112, protein: 2, carbs: 26, fat: 0 },

  // Fruit & veg
  { name: "Banana", servingLabel: "1 medium", calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: "Apple", servingLabel: "1 medium", calories: 95, protein: 0, carbs: 25, fat: 0 },
  { name: "Orange", servingLabel: "1 medium", calories: 62, protein: 1, carbs: 15, fat: 0 },
  { name: "Mango", servingLabel: "1 cup", calories: 99, protein: 1, carbs: 25, fat: 1 },
  { name: "Blueberries", servingLabel: "1 cup", calories: 84, protein: 1, carbs: 21, fat: 0 },
  { name: "Avocado", servingLabel: "1/2 fruit", calories: 160, protein: 2, carbs: 9, fat: 15 },
  { name: "Mixed green salad", servingLabel: "1 bowl", calories: 45, protein: 2, carbs: 8, fat: 0 },
  { name: "Broccoli, steamed", servingLabel: "1 cup", calories: 55, protein: 4, carbs: 11, fat: 1 },

  // Fats, nuts & snacks
  { name: "Almonds", servingLabel: "28 g (23 nuts)", calories: 164, protein: 6, carbs: 6, fat: 14 },
  { name: "Peanut butter", servingLabel: "1 tbsp", calories: 94, protein: 4, carbs: 3, fat: 8 },
  { name: "Olive oil", servingLabel: "1 tbsp", calories: 119, protein: 0, carbs: 0, fat: 14 },
  { name: "Ghee", servingLabel: "1 tsp", calories: 45, protein: 0, carbs: 0, fat: 5 },
  { name: "Dark chocolate", servingLabel: "1 square", calories: 85, protein: 1, carbs: 8, fat: 6 },
  { name: "Potato chips", servingLabel: "1 small bag", calories: 152, protein: 2, carbs: 15, fat: 10 },

  // Drinks & takeaway
  { name: "Coffee with milk", servingLabel: "1 cup", calories: 40, protein: 2, carbs: 4, fat: 2 },
  { name: "Orange juice", servingLabel: "1 glass", calories: 112, protein: 2, carbs: 26, fat: 0 },
  { name: "Cola", servingLabel: "1 can", calories: 140, protein: 0, carbs: 39, fat: 0 },
  { name: "Beer", servingLabel: "1 bottle", calories: 153, protein: 2, carbs: 13, fat: 0 },
  { name: "Cheese pizza", servingLabel: "1 slice", calories: 285, protein: 12, carbs: 36, fat: 10 },
  { name: "Chicken burrito bowl", servingLabel: "1 bowl", calories: 620, protein: 42, carbs: 68, fat: 20 },
  { name: "Cheeseburger", servingLabel: "1 burger", calories: 535, protein: 28, carbs: 41, fat: 28 },
  { name: "Veg sandwich", servingLabel: "1 sandwich", calories: 290, protein: 10, carbs: 40, fat: 10 },
];
