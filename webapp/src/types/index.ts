export type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface UserPreferences {
  householdSize: number;
  dietaryRestrictions: string[];
  cookingFrequency: 'daily' | 'few_times_week' | 'weekends';
  cuisinePreferences: string[];
  budgetLevel: 'low' | 'medium' | 'high';
  // Спорт и активность — влияют на калорийность и долю белка в плане
  activityLevel: 'none' | 'light' | 'medium' | 'high';
  sports: string[];
  trainingsPerWeek: number;
  // Цель питания и конкретные дни тренировок
  goal?: 'lose_weight' | 'maintain' | 'gain_muscle';
  goalKg?: number;
  activityDays?: WeekDay[];
}

export interface UserData {
  userId: number;
  preferences?: UserPreferences;
  mealPlan?: MealPlan;
  lastActive?: string;
  onboardingDone?: boolean;
  likedDishes?: string[];
  dislikedDishes?: string[];
  referralCode?: string;
  referredBy?: string;
  dailyGoalKcal?: number;
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
