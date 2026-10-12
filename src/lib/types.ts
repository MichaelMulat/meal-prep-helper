export type MealSlot = 'breakfast' | 'lunch' | 'dinner'

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner']

export const REGIONS = [
  'Africa',
  'East Asia',
  'Latin America',
  'Mediterranean',
  'Middle East',
  'North America',
  'South Asia',
  'Southeast Asia',
] as const

export const FLAVORS = [
  'savory',
  'spicy',
  'sweet',
  'tangy',
  'herby',
  'smoky',
  'umami',
  'fresh',
  'rich',
] as const

export interface Recipe {
  id?: string
  name: string
  region: string
  flavors: string[]
  minutes: number
  meals: MealSlot[]
  ingredients: string[]
}

export interface PantryItem {
  id?: string
  name: string
  quantity: number
  unit: string
  category: string
  expires?: string // YYYY-MM-DD
}

export interface PlanEntry {
  key: string // `${date}|${slot}`
  date: string // YYYY-MM-DD
  slot: MealSlot
  recipeId: string
}

export const PANTRY_CATEGORIES = [
  'Produce',
  'Protein',
  'Dairy & eggs',
  'Grains & pasta',
  'Canned & jarred',
  'Spices & sauces',
  'Frozen',
  'Other',
]
