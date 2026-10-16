// Données de démonstration. TOUT est fictif : marques inventées, aucun avis,
// aucune note, aucun chiffre de vente. Toute ressemblance avec une marque
// existante serait fortuite : à faire vérifier avant toute diffusion publique.

export type Department = {
  name: string
  handle: string
  priceMin: number
  priceMax: number
  types: string[]
}

export const DEPARTMENTS: Department[] = [
  { name: "Electronics", handle: "electronics", priceMin: 15, priceMax: 600, types: ["Wireless Headphones", "Bluetooth Speaker", "Smart Watch", "Portable Charger", "Desk Lamp", "Webcam", "Action Camera", "E-Reader", "Fitness Tracker", "Home Security Camera", "Soundbar", "Smart Plug"] },
  { name: "Computers", handle: "computers", priceMin: 12, priceMax: 900, types: ["Laptop", "Mechanical Keyboard", "Wireless Mouse", "Monitor", "USB-C Hub", "External SSD", "Laptop Stand", "Docking Station", "Graphics Tablet", "Router", "Webcam Cover Set", "Laptop Sleeve"] },
  { name: "Home & Kitchen", handle: "home-kitchen", priceMin: 8, priceMax: 250, types: ["Electric Kettle", "Chef Knife", "Cast Iron Skillet", "Blender", "Coffee Grinder", "Storage Containers", "Cutting Board", "Dish Rack", "Toaster", "Air Fryer", "Mixing Bowls", "Food Scale"] },
  { name: "Fashion", handle: "fashion", priceMin: 10, priceMax: 180, types: ["Cotton T-Shirt", "Denim Jacket", "Running Shoes", "Wool Scarf", "Leather Belt", "Rain Jacket", "Backpack", "Canvas Sneakers", "Knit Sweater", "Sunglasses", "Wallet", "Cap"] },
  { name: "Books", handle: "books", priceMin: 6, priceMax: 45, types: ["Cookbook", "Travel Guide", "Science Primer", "Mystery Novel", "Gardening Handbook", "History Atlas", "Poetry Anthology", "Programming Guide", "Art Monograph", "Biography", "Puzzle Book", "Children's Storybook"] },
  { name: "Toys & Games", handle: "toys-games", priceMin: 6, priceMax: 120, types: ["Building Blocks Set", "Board Game", "Jigsaw Puzzle", "Plush Animal", "Remote Control Car", "Card Game", "Wooden Train Set", "Science Kit", "Play Dough Set", "Art Easel", "Chess Set", "Kite"] },
  { name: "Sports & Outdoors", handle: "sports-outdoors", priceMin: 8, priceMax: 300, types: ["Yoga Mat", "Camping Tent", "Water Bottle", "Trekking Poles", "Resistance Bands", "Sleeping Bag", "Bike Helmet", "Dumbbell Set", "Hiking Backpack", "Jump Rope", "Headlamp", "Foam Roller"] },
  { name: "Beauty & Personal Care", handle: "beauty-personal-care", priceMin: 5, priceMax: 90, types: ["Face Moisturizer", "Hair Dryer", "Electric Toothbrush", "Body Lotion", "Shaving Kit", "Nail Care Set", "Hair Brush", "Sunscreen", "Lip Balm Set", "Cleansing Oil", "Makeup Bag", "Bath Salts"] },
  { name: "Health & Household", handle: "health-household", priceMin: 4, priceMax: 120, types: ["Humidifier", "Laundry Detergent", "First Aid Kit", "Air Purifier", "Reusable Sponges", "Pill Organizer", "Thermometer", "Hand Soap Refill", "Trash Bags", "Dish Soap", "Cleaning Cloths", "Vitamin Organizer"] },
  { name: "Grocery", handle: "grocery", priceMin: 3, priceMax: 60, types: ["Olive Oil", "Pasta Selection", "Ground Coffee", "Loose Leaf Tea", "Granola", "Honey", "Spice Set", "Dark Chocolate", "Rice Pack", "Trail Mix", "Hot Sauce", "Dried Fruit Box"] },
  { name: "Pet Supplies", handle: "pet-supplies", priceMin: 5, priceMax: 140, types: ["Dog Leash", "Cat Tree", "Pet Bed", "Chew Toy", "Pet Carrier", "Automatic Feeder", "Grooming Brush", "Aquarium Filter", "Bird Feeder", "Cat Scratcher", "Water Fountain", "Training Treats Pouch"] },
  { name: "Automotive", handle: "automotive", priceMin: 6, priceMax: 280, types: ["Phone Mount", "Jump Starter", "Seat Cover", "Tire Inflator", "Dash Camera", "Floor Mats", "Car Vacuum", "Wiper Blades", "Emergency Kit", "Trunk Organizer", "Microfiber Towels", "Sunshade"] },
  { name: "Tools & Home Improvement", handle: "tools-home-improvement", priceMin: 7, priceMax: 350, types: ["Cordless Drill", "Screwdriver Set", "Tape Measure", "Work Gloves", "Stud Finder", "Tool Box", "Laser Level", "Socket Set", "Utility Knife", "LED Work Light", "Paint Roller Kit", "Pliers Set"] },
  { name: "Office Products", handle: "office-products", priceMin: 4, priceMax: 200, types: ["Notebook Set", "Standing Desk Mat", "Desk Organizer", "Gel Pens", "Paper Shredder", "Label Maker", "Whiteboard", "Ergonomic Chair Cushion", "Stapler", "File Folders", "Planner", "Document Scanner"] },
  { name: "Garden & Outdoor", handle: "garden-outdoor", priceMin: 6, priceMax: 260, types: ["Garden Hose", "Pruning Shears", "Planter Box", "Solar Lights", "Watering Can", "Compost Bin", "Patio Chair", "Bird Bath", "Garden Gloves", "Wheelbarrow", "Seed Starter Kit", "Hammock"] },
  { name: "Baby", handle: "baby", priceMin: 6, priceMax: 220, types: ["Baby Monitor", "Stroller Organizer", "Muslin Blankets", "Bottle Set", "Diaper Bag", "Play Mat", "Bath Tub", "High Chair Cover", "Teething Toys", "Nursery Night Light", "Swaddle Set", "Bib Pack"] },
  { name: "Arts & Crafts", handle: "arts-crafts", priceMin: 4, priceMax: 110, types: ["Watercolor Set", "Sketchbook", "Knitting Kit", "Acrylic Paint Set", "Sewing Kit", "Craft Scissors", "Pottery Tools", "Embroidery Hoops", "Colored Pencils", "Glue Gun", "Origami Paper", "Calligraphy Set"] },
  { name: "Musical Instruments", handle: "musical-instruments", priceMin: 9, priceMax: 450, types: ["Acoustic Guitar", "Ukulele", "Electronic Keyboard", "Drum Pad", "Harmonica Set", "Guitar Tuner", "Music Stand", "Cajon", "Violin Starter Kit", "Microphone", "Capo", "Metronome"] },
  { name: "Video Games", handle: "video-games", priceMin: 8, priceMax: 160, types: ["Game Controller", "Headset Stand", "Gaming Chair Cushion", "Charging Dock", "Controller Grips", "Racing Wheel", "Capture Card", "Mouse Pad", "Console Stand", "Memory Card", "Thumbstick Covers", "Cable Organizer"] },
  { name: "Movies & Hobbies", handle: "movies-hobbies", priceMin: 6, priceMax: 140, types: ["Model Kit", "Binoculars", "Telescope", "Photo Album", "Magnifying Lamp", "Puzzle Mat", "Collector Display Case", "Star Map", "Film Poster Frame", "Hobby Tool Set", "Craft Storage Box", "Pocket Microscope"] },
]

export const BRANDS = [
  "Norvik", "Alder & Co", "Brisa", "Quillon", "Tarvane", "Meridale", "Velkor", "Pinnacre",
  "Lowrie", "Sundale", "Fernhollow", "Kestrel Row", "Oakmere", "Ravenly", "Tamsin Lane", "Wexford Hill",
]

export const COLORS = ["Black", "White", "Sand", "Teal", "Terracotta", "Slate", "Forest", "Navy"]

export const VENDORS = [
  { name: "Marketplace Direct", handle: "marketplace-direct" }, // ventes directes de la plateforme
  { name: "Harbor & Pine", handle: "harbor-pine" },
  { name: "Lumen Supply Co", handle: "lumen-supply" },
  { name: "Northfield Goods", handle: "northfield-goods" },
  { name: "Cobalt Market", handle: "cobalt-market" },
  { name: "Juniper Lane", handle: "juniper-lane" },
  { name: "Saffron Street", handle: "saffron-street" },
]

// Générateur pseudo-aléatoire déterministe : même graine, mêmes données.
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
