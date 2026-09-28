// National urban average food prices, July 2026.
// Source: NAMC "Food Basket Price Monthly", Issue 129 (August 2026), Table 2, built from Stats SA data.
// https://www.namc.co.za/wp-content/uploads/2026/08/Food-Basket-Price-Monthly-Report-August-2026-BZ.pdf
// price = rand per unit for July 2026, yoy = change vs July 2025 (%), mom = change vs June 2026 (%).

export const NAMC = {
  period: 'July 2026',
  issue: 'NAMC Food Basket Price Monthly, Issue 129',
  issueNo: 129,
  url: 'https://www.namc.co.za/output/food-basket-price-monthly/',
  basketTotal: 1353.75,
  basketYoy: 0.19,
  basketMom: -0.62,
  items: [
    { id: 'baked-beans', category: 'Beans', label: 'Baked beans, tinned 410g', price: 15.23, yoy: -4.09, mom: -1.42 },
    { id: 'dried-beans', category: 'Beans', label: 'Dried beans 500g', price: 31.92, yoy: -8.12, mom: -0.87 },
    { id: 'peanut-butter', category: 'Beans', label: 'Peanut butter 400g', price: 49.6, yoy: 2.37, mom: -0.66 },
    { id: 'tea', category: 'Coffee & tea', label: 'Ceylon/black tea 250g', price: 66.34, yoy: 6.43, mom: -0.38 },
    { id: 'coffee', category: 'Coffee & tea', label: 'Instant coffee 250g', price: 77.81, yoy: 4.54, mom: 0.87 },
    { id: 'cheese', category: 'Dairy & eggs', label: 'Cheddar cheese per kg', price: 163.1, yoy: 3.02, mom: 0 },
    { id: 'eggs', category: 'Dairy & eggs', label: 'Eggs, 1.5 dozen', price: 61.15, yoy: -5.71, mom: 0.03 },
    { id: 'milk', category: 'Dairy & eggs', label: 'Full cream long-life milk 1L', price: 20.93, yoy: 4.39, mom: 0.82 },
    { id: 'margarine', category: 'Fats & oils', label: 'Brick margarine 500g', price: 31.23, yoy: -0.95, mom: -3.88 },
    { id: 'oil', category: 'Fats & oils', label: 'Sunflower oil 750ml', price: 37.97, yoy: 3.77, mom: 0.53 },
    { id: 'apples', category: 'Fruit', label: 'Apples per kg', price: 25.55, yoy: -8.23, mom: -0.08 },
    { id: 'bananas', category: 'Fruit', label: 'Bananas per kg', price: 17.74, yoy: 9.78, mom: -3.06 },
    { id: 'oranges', category: 'Fruit', label: 'Oranges per kg', price: 20.73, yoy: -1.1, mom: -7.17 },
    { id: 'mince', category: 'Meat & fish', label: 'Beef mince per kg', price: 122.64, yoy: -3.27, mom: -0.41 },
    { id: 'offal', category: 'Meat & fish', label: 'Beef offal per kg', price: 60.22, yoy: 5.98, mom: -2.45 },
    { id: 'giblets', category: 'Meat & fish', label: 'Chicken giblets per kg', price: 48.34, yoy: 0.5, mom: 3.05 },
    { id: 'fish', category: 'Meat & fish', label: 'Fish (excl. tuna) 400g', price: 29.76, yoy: 4.57, mom: 2.09 },
    { id: 'chicken', category: 'Meat & fish', label: 'Frozen chicken portions 2kg', price: 101.89, yoy: 4.11, mom: -0.43 },
    { id: 'polony', category: 'Meat & fish', label: 'Polony 1kg', price: 58.71, yoy: 0.38, mom: -4.46 },
    { id: 'bread', category: 'Bread & cereals', label: 'Brown bread 700g', price: 17.72, yoy: 1.84, mom: -0.11 },
    { id: 'whitebread', category: 'Bread & cereals', label: 'White bread 700g', price: 19.61, yoy: 3.54, mom: -0.76 },
    { id: 'rice', category: 'Bread & cereals', label: 'Rice 2kg', price: 37.84, yoy: -12.75, mom: 0.85 },
    { id: 'maize', category: 'Bread & cereals', label: 'Maize meal 5kg', price: 65.09, yoy: -12.42, mom: -3.3 },
    { id: 'cabbage', category: 'Vegetables', label: 'Cabbage, each', price: 22.84, yoy: -1.38, mom: 0.22 },
    { id: 'onions', category: 'Vegetables', label: 'Onions per kg', price: 28.47, yoy: 3.91, mom: 2.08 },
    { id: 'potatoes', category: 'Vegetables', label: 'Potatoes per kg', price: 18.12, yoy: -12.46, mom: 0.78 },
    { id: 'tomatoes', category: 'Vegetables', label: 'Tomatoes per kg', price: 35.39, yoy: 15.31, mom: -2.53 },
    { id: 'sugar', category: 'Sugar', label: 'White sugar 2.5kg', price: 67.81, yoy: 1.86, mom: 0.67 },
  ],
}

// Staples people can report prices for. `ref` is the national average for the same pack size.
// Eggs are reported per dozen, so the reference is the 1.5-dozen price divided by 1.5.
const STAPLE_DEFS = [
  { id: 'bread', label: 'Brown bread (700g)', from: 'bread' },
  { id: 'whitebread', label: 'White bread (700g)', from: 'whitebread' },
  { id: 'maize', label: 'Maize meal (5kg)', from: 'maize' },
  { id: 'rice', label: 'Rice (2kg)', from: 'rice' },
  { id: 'sugar', label: 'White sugar (2.5kg)', from: 'sugar' },
  { id: 'oil', label: 'Cooking oil (750ml)', from: 'oil' },
  { id: 'milk', label: 'Long-life milk (1L)', from: 'milk' },
  { id: 'eggs', label: 'Eggs (dozen)', from: 'eggs', div: 1.5 },
  { id: 'beans', label: 'Dried beans (500g)', from: 'dried-beans' },
  { id: 'potatoes', label: 'Potatoes (per kg)', from: 'potatoes' },
  { id: 'onions', label: 'Onions (per kg)', from: 'onions' },
  { id: 'tomatoes', label: 'Tomatoes (per kg)', from: 'tomatoes' },
]

// Reference prices for the staples from any snapshot's items (bundled or freshly imported).
export function staplesFrom(items) {
  return STAPLE_DEFS.map(({ id, label, from, div = 1 }) => {
    const found = items.find((i) => i.id === from)
    return { id, label, ref: Math.round((found.price / div) * 100) / 100 }
  })
}

export const STAPLES = staplesFrom(NAMC.items)
