export interface UserPreferences {
  householdSize: number;
  dietaryRestrictions: string[];
  cookingFrequency: 'daily' | 'few_times_week' | 'weekends';
  cuisinePreferences: string[];
  budgetLevel: 'low' | 'medium' | 'high';
}

export interface Meal {
  name: string;
  emoji?: string;
  cookTime?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  ingredients?: string[];
  instructions?: string[];
}

export interface DayPlan {
  day: string;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
}

export interface ShoppingList {
  produce: string[];
  dairy: string[];
  meat: string[];
  pantry: string[];
}

export interface MealPlan {
  days: DayPlan[];
  shoppingList: ShoppingList;
  weeklyStats?: {
    avgCalories: number;
    totalMeals: number;
  };
}

export interface UserData {
  userId: number;
  preferences?: UserPreferences;
  mealPlan?: MealPlan;
  subscription?: {
    plan: 'free' | 'premium';
    expiresAt?: Date;
  };
}
