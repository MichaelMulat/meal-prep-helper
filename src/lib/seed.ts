import type { PantryItem, Recipe } from './types'
import { addDays, toISO } from './dates'

export const SEED_RECIPES: Recipe[] = [
  { name: 'Shakshuka', region: 'Middle East', flavors: ['spicy', 'savory'], minutes: 30, meals: ['breakfast', 'lunch'], ingredients: ['eggs', 'canned tomatoes', 'onion', 'bell pepper', 'garlic', 'cumin', 'paprika', 'feta'] },
  { name: 'Overnight oats', region: 'North America', flavors: ['sweet'], minutes: 5, meals: ['breakfast'], ingredients: ['rolled oats', 'milk', 'yogurt', 'honey', 'berries'] },
  { name: 'Huevos rancheros', region: 'Latin America', flavors: ['spicy', 'savory'], minutes: 20, meals: ['breakfast'], ingredients: ['eggs', 'corn tortillas', 'black beans', 'salsa', 'avocado', 'cilantro'] },
  { name: 'Tamagoyaki rice bowl', region: 'East Asia', flavors: ['umami', 'sweet'], minutes: 15, meals: ['breakfast', 'lunch'], ingredients: ['eggs', 'rice', 'soy sauce', 'mirin', 'scallions'] },
  { name: 'Miso soup with tofu', region: 'East Asia', flavors: ['umami'], minutes: 10, meals: ['breakfast', 'lunch'], ingredients: ['miso paste', 'tofu', 'scallions', 'wakame', 'dashi'] },
  { name: 'Greek chickpea salad', region: 'Mediterranean', flavors: ['fresh', 'tangy'], minutes: 15, meals: ['lunch'], ingredients: ['cucumber', 'tomatoes', 'red onion', 'feta', 'chickpeas', 'olives', 'olive oil', 'lemon'] },
  { name: 'Banh mi chicken sandwich', region: 'Southeast Asia', flavors: ['tangy', 'herby', 'spicy'], minutes: 25, meals: ['lunch'], ingredients: ['baguette', 'chicken thighs', 'carrots', 'daikon', 'cilantro', 'jalapeño', 'mayonnaise', 'rice vinegar'] },
  { name: 'Black bean tacos', region: 'Latin America', flavors: ['smoky', 'spicy'], minutes: 20, meals: ['lunch', 'dinner'], ingredients: ['black beans', 'corn tortillas', 'chipotle', 'red cabbage', 'lime', 'avocado', 'cilantro'] },
  { name: 'Caprese panini', region: 'Mediterranean', flavors: ['fresh', 'herby'], minutes: 10, meals: ['lunch'], ingredients: ['ciabatta', 'mozzarella', 'tomatoes', 'basil', 'pesto'] },
  { name: 'Chicken tikka masala', region: 'South Asia', flavors: ['spicy', 'rich'], minutes: 45, meals: ['dinner'], ingredients: ['chicken thighs', 'yogurt', 'garam masala', 'canned tomatoes', 'cream', 'onion', 'garlic', 'ginger', 'rice'] },
  { name: 'Red lentil dal', region: 'South Asia', flavors: ['savory', 'spicy'], minutes: 30, meals: ['lunch', 'dinner'], ingredients: ['red lentils', 'onion', 'garlic', 'ginger', 'turmeric', 'cumin', 'coconut milk', 'rice'] },
  { name: 'Thai green curry', region: 'Southeast Asia', flavors: ['spicy', 'herby', 'rich'], minutes: 30, meals: ['dinner'], ingredients: ['green curry paste', 'coconut milk', 'chicken thighs', 'bell pepper', 'basil', 'fish sauce', 'rice'] },
  { name: 'Pad thai', region: 'Southeast Asia', flavors: ['tangy', 'sweet', 'umami'], minutes: 30, meals: ['dinner'], ingredients: ['rice noodles', 'shrimp', 'eggs', 'tamarind', 'fish sauce', 'peanuts', 'bean sprouts', 'lime'] },
  { name: 'Beef and broccoli stir-fry', region: 'East Asia', flavors: ['umami', 'savory'], minutes: 20, meals: ['dinner'], ingredients: ['flank steak', 'broccoli', 'soy sauce', 'garlic', 'ginger', 'oyster sauce', 'rice'] },
  { name: 'Bibimbap', region: 'East Asia', flavors: ['spicy', 'umami'], minutes: 35, meals: ['lunch', 'dinner'], ingredients: ['rice', 'ground beef', 'spinach', 'carrots', 'eggs', 'gochujang', 'sesame oil', 'zucchini'] },
  { name: 'Pasta aglio e olio', region: 'Mediterranean', flavors: ['savory', 'herby'], minutes: 15, meals: ['dinner'], ingredients: ['spaghetti', 'garlic', 'olive oil', 'chili flakes', 'parsley', 'parmesan'] },
  { name: 'Sheet-pan lemon herb salmon', region: 'North America', flavors: ['fresh', 'herby'], minutes: 25, meals: ['dinner'], ingredients: ['salmon', 'lemon', 'potatoes', 'asparagus', 'dill', 'olive oil'] },
  { name: 'Chili con carne', region: 'North America', flavors: ['smoky', 'spicy', 'rich'], minutes: 60, meals: ['dinner'], ingredients: ['ground beef', 'kidney beans', 'canned tomatoes', 'onion', 'chili powder', 'cumin', 'bell pepper'] },
  { name: 'Moroccan chickpea tagine', region: 'Africa', flavors: ['sweet', 'spicy'], minutes: 40, meals: ['dinner'], ingredients: ['chickpeas', 'carrots', 'onion', 'dried apricots', 'cinnamon', 'cumin', 'canned tomatoes', 'couscous'] },
  { name: 'Jollof rice', region: 'Africa', flavors: ['spicy', 'smoky'], minutes: 50, meals: ['dinner'], ingredients: ['rice', 'canned tomatoes', 'bell pepper', 'onion', 'scotch bonnet', 'chicken stock', 'thyme'] },
  { name: 'Falafel wraps', region: 'Middle East', flavors: ['herby', 'fresh'], minutes: 35, meals: ['lunch', 'dinner'], ingredients: ['chickpeas', 'parsley', 'garlic', 'cumin', 'pita', 'tahini', 'cucumber', 'tomatoes'] },
]

export function seedPantry(): PantryItem[] {
  const inDays = (n: number) => toISO(addDays(new Date(), n))
  return [
    { name: 'eggs', quantity: 12, unit: 'ct', category: 'Dairy & eggs', expires: inDays(10) },
    { name: 'rice', quantity: 2, unit: 'kg', category: 'Grains & pasta' },
    { name: 'onion', quantity: 4, unit: 'ct', category: 'Produce' },
    { name: 'garlic', quantity: 1, unit: 'head', category: 'Produce' },
    { name: 'canned tomatoes', quantity: 3, unit: 'can', category: 'Canned & jarred' },
    { name: 'chickpeas', quantity: 2, unit: 'can', category: 'Canned & jarred' },
    { name: 'olive oil', quantity: 1, unit: 'bottle', category: 'Spices & sauces' },
    { name: 'soy sauce', quantity: 1, unit: 'bottle', category: 'Spices & sauces' },
    { name: 'cumin', quantity: 1, unit: 'jar', category: 'Spices & sauces' },
    { name: 'spinach', quantity: 1, unit: 'bag', category: 'Produce', expires: inDays(2) },
  ]
}
