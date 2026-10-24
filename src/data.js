export { SUBURBS } from '../shared/suburbs.js'

export const REPORT_TYPES = {
  power: { label: 'Power', icon: 'zap' },
  water: { label: 'Water', icon: 'droplet' },
  road: { label: 'Road / transport', icon: 'bus' },
  other: { label: 'Other', icon: 'pin' },
}

export const SHARE_CATEGORIES = {
  power: { label: 'Charging / power', icon: 'battery' },
  water: { label: 'Water', icon: 'droplet' },
  food: { label: 'Food / cold storage', icon: 'box' },
  transport: { label: 'Transport / lift', icon: 'car' },
  other: { label: 'Other', icon: 'users' },
}

export const OUTLET_GROUPS = [
  { id: 'food', label: 'Food', icon: 'leaf' },
  { id: 'health', label: 'Health', icon: 'health' },
  { id: 'water', label: 'Water', icon: 'droplet' },
  { id: 'transport', label: 'Transport', icon: 'bus' },
]

export const OUTLET_TYPES = {
  spaza: { label: 'Spaza shop', color: '#e08a00', group: 'food' },
  supermarket: { label: 'Supermarket', color: '#2b6cb0', group: 'food' },
  foodbank: { label: 'Food bank / feeding scheme', color: '#2f855a', group: 'food' },
  garden: { label: 'Community garden', color: '#6b8e23', group: 'food' },
  market: { label: 'Fresh produce market', color: '#b83280', group: 'food' },
  clinic: { label: 'Clinic', color: '#c53030', group: 'health' },
  hospital: { label: 'Hospital', color: '#9b2c2c', group: 'health' },
  water: { label: 'Water point', color: '#0987a0', group: 'water' },
  transport: { label: 'Taxi rank / station', color: '#553c9a', group: 'transport' },
}

export { STAPLES } from '../shared/namc.js'

export const BUSINESS_TYPES = {
  spaza: { label: 'Spaza / tuck shop', powerDep: 0.7, cold: true, waterDep: 0.05, hoursOpen: 14 },
  food: { label: 'Street food / kitchen', powerDep: 0.6, cold: true, waterDep: 0.25, hoursOpen: 10 },
  salon: { label: 'Hair / beauty salon', powerDep: 0.9, cold: false, waterDep: 0.5, hoursOpen: 9 },
  tailor: { label: 'Tailor / sewing', powerDep: 0.95, cold: false, waterDep: 0, hoursOpen: 9 },
  workshop: { label: 'Workshop / welding', powerDep: 0.9, cold: false, waterDep: 0.05, hoursOpen: 9 },
  carwash: { label: 'Car wash', powerDep: 0.3, cold: false, waterDep: 0.9, hoursOpen: 10 },
}

export const CHECKLIST_GROUPS = [
  { id: 'water', label: 'Water', icon: 'droplet' },
  { id: 'power', label: 'Power', icon: 'battery' },
  { id: 'food', label: 'Food', icon: 'box' },
  { id: 'safety', label: 'Safety', icon: 'health' },
]

export const CHECKLIST = [
  { id: 'w1', group: 'water', text: 'Store 5L of drinking water per person in clean, covered containers' },
  { id: 'w2', group: 'water', text: 'Fill buckets for washing and flushing when a cut is announced' },
  { id: 'w3', group: 'water', text: 'Know where your nearest borehole, tanker point or neighbour with a tank is' },
  { id: 'p1', group: 'power', text: 'Charge phones and power banks before each scheduled cut' },
  { id: 'p2', group: 'power', text: 'Keep a torch or lantern with spare batteries where you can find it in the dark' },
  { id: 'p3', group: 'power', text: 'Unplug sensitive appliances before power returns, surges can damage them' },
  { id: 'f1', group: 'food', text: 'Keep 3 days of food that needs no fridge or cooking (tinned beans, maize meal, peanut butter)' },
  { id: 'f2', group: 'food', text: 'Keep fridge and freezer doors shut during cuts, and group frozen items together' },
  { id: 'f3', group: 'food', text: 'Save the number of your nearest food bank or feeding scheme' },
  { id: 's1', group: 'safety', text: 'Keep a first-aid kit and a week of chronic medicine, and store medicine that needs cooling in a cool bag' },
  { id: 's2', group: 'safety', text: 'Use a gas or paraffin stove only with good ventilation, never indoors with the door shut' },
  { id: 's3', group: 'safety', text: 'Agree a plan with neighbours to check on elderly people during long outages' },
]
