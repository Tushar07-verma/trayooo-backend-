const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { getIsConnected } = require('../config/db');

// Define Mongoose Product Schema
const productSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide product name'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Please provide category'],
      trim: true,
    },
    categoryLabel: {
      type: String,
      default: 'Streetwear',
      trim: true,
    },
    carousel: {
      type: String,
      enum: ['top', 'bottom'],
      default: 'top',
    },
    priceINR: {
      type: Number,
      required: [true, 'Please provide price in INR'],
      min: 0,
    },
    comparePriceINR: {
      type: Number,
      default: 0,
    },
    discountPct: {
      type: Number,
      default: 0,
    },
    tag: {
      type: String,
      default: 'New Drop',
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Please provide image URL'],
    },
    fallbackImage: {
      type: String,
      default: 'images/hero-1.jpg',
    },
    images: {
      type: [String],
      default: [],
    },
    sizes: {
      type: [String],
      default: ['S', 'M', 'L', 'XL'],
    },
    colors: [
      {
        name: { type: String, required: true },
        hex: { type: String, required: true },
        border: { type: Boolean, default: false },
      },
    ],
    desc: {
      type: String,
      default: '',
      trim: true,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const MongooseProduct = mongoose.model('Product', productSchema);

// ============================================================================
// RESILIENT FALLBACK STORAGE
// Enables instant local storage in backend/data/products.json if MongoDB is offline
// ============================================================================
const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'products.json');

const defaultProducts = [
  {
    id: 101,
    name: "T-RAYO Arachnid Heavyweight Hoodie",
    category: "hoodies",
    categoryLabel: "Hoodies",
    carousel: "top",
    priceINR: 4999,
    comparePriceINR: 8064,
    discountPct: 38,
    tag: "Trending",
    image: "images/hero-1.jpg",
    fallbackImage: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&auto=format&fit=crop&q=80",
    images: [
      "images/hero-1.jpg",
      "images/collections/hoodies.png",
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&auto=format&fit=crop&q=80"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "Onyx Black", hex: "#111111" },
      { name: "Pure White", hex: "#FFFFFF", border: true },
      { name: "Vintage Charcoal", hex: "#374151" }
    ],
    desc: "Constructed with 480 GSM French Terry cotton. Features dropped shoulder geometry, high-density arachnid back print, and double-layered heavyweight hood.",
    inStock: true
  },
  {
    id: 102,
    name: "Avant-Garde Washed Charcoal Boxy Fleece",
    category: "sweatshirts",
    categoryLabel: "Sweatshirt",
    carousel: "top",
    priceINR: 3799,
    comparePriceINR: 6127,
    discountPct: 38,
    tag: "New",
    image: "images/hero-2.jpg",
    fallbackImage: "https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=800&auto=format&fit=crop&q=80",
    images: [
      "images/hero-2.jpg",
      "images/collections/sweatshirt.png",
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&auto=format&fit=crop&q=80"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Washed Charcoal", hex: "#374151" },
      { name: "Bone White", hex: "#F5F5F7", border: true },
      { name: "Heather Grey", hex: "#6B7280" }
    ],
    desc: "Enzyme acid-washed charcoal shade with soft brushed fleece interior. Ribbed cuffs and raw-hem detailing for the authentic contemporary look.",
    inStock: true
  },
  {
    id: 103,
    name: "Minimalist Ivory Mockneck Sweatshirt",
    category: "sweatshirts",
    categoryLabel: "Sweatshirt",
    carousel: "top",
    priceINR: 4199,
    comparePriceINR: 6772,
    discountPct: 38,
    tag: "Staff Pick",
    image: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&auto=format&fit=crop&q=80",
    fallbackImage: "images/hero-2.jpg",
    images: [
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&auto=format&fit=crop&q=80",
      "images/hero-2.jpg"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Pure White", hex: "#FFFFFF", border: true },
      { name: "Onyx Black", hex: "#111111" },
      { name: "Oatmeal Melange", hex: "#D6D3D1" }
    ],
    desc: "Structured off-white heavyweight cotton mockneck with drop shoulders and architectural ribbed hem.",
    inStock: true
  },
  {
    id: 104,
    name: "Cyber Acid-Wash Oversized Heavy Tee",
    category: "oversized",
    categoryLabel: "Oversized T-Shirt",
    carousel: "top",
    priceINR: 2499,
    comparePriceINR: 4031,
    discountPct: 38,
    tag: "Hot Drop",
    image: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&auto=format&fit=crop&q=80",
    fallbackImage: "images/hero-1.jpg",
    images: [
      "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&auto=format&fit=crop&q=80",
      "images/collections/oversized.png"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "Acid Black", hex: "#1A1A1A" },
      { name: "Pure White", hex: "#FFFFFF", border: true },
      { name: "Washed Olive", hex: "#4B5548" }
    ],
    desc: "320 GSM combed cotton oversized luxury T-shirt with vintage acid-wash treatment and boxy silhouette.",
    inStock: true
  },
  {
    id: 105,
    name: "Essential Minimalist Boxy Crew Tee",
    category: "tshirts",
    categoryLabel: "T-Shirts",
    carousel: "top",
    priceINR: 1999,
    comparePriceINR: 3998,
    discountPct: 50,
    tag: "Essential",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
    fallbackImage: "images/hero-1.jpg",
    images: [
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
      "images/collections/tshirts.png"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Pure White", hex: "#FFFFFF", border: true },
      { name: "Onyx Black", hex: "#111111" },
      { name: "Charcoal Slate", hex: "#475569" }
    ],
    desc: "280 GSM premium organic cotton crew tee with reinforced collar and tailored relaxed cut.",
    inStock: true
  },
  {
    id: 106,
    name: "Signature Pique Knit Polo T-Shirt",
    category: "polo",
    categoryLabel: "Polo T-Shirts",
    carousel: "top",
    priceINR: 2899,
    comparePriceINR: 4675,
    discountPct: 38,
    tag: "New Arrival",
    image: "https://images.unsplash.com/photo-1625910513413-7a71f0ffc0df?w=800&auto=format&fit=crop&q=80",
    fallbackImage: "images/hero-2.jpg",
    images: [
      "https://images.unsplash.com/photo-1625910513413-7a71f0ffc0df?w=800&auto=format&fit=crop&q=80",
      "images/collections/polo.png"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Jet Black", hex: "#111111" },
      { name: "Crisp White", hex: "#FFFFFF", border: true },
      { name: "Midnight Navy", hex: "#1E293B" }
    ],
    desc: "Refined 260 GSM breathable pique cotton with tailored spread collar and engraved horn buttons.",
    inStock: true
  },
  {
    id: 107,
    name: "Architectural Raw-Hem Sculpted Knit",
    category: "unique",
    categoryLabel: "Unique Design Clothes",
    carousel: "top",
    priceINR: 5499,
    comparePriceINR: 8869,
    discountPct: 38,
    tag: "Atelier Drop",
    image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&auto=format&fit=crop&q=80",
    fallbackImage: "images/hero-3.jpg",
    images: [
      "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&auto=format&fit=crop&q=80"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Chalk White", hex: "#F3F4F6", border: true },
      { name: "Obsidian Black", hex: "#0F172A" },
      { name: "Concrete Grey", hex: "#64748B" }
    ],
    desc: "Bespoke textured knit garment with asymmetrical seams, raw edge hems, and sculpted high neck.",
    inStock: true
  },
  {
    id: 201,
    name: "Tactical Multi-Pocket Tech Utility Parka",
    category: "unique",
    categoryLabel: "Unique Design Clothes",
    carousel: "bottom",
    priceINR: 7499,
    comparePriceINR: 12095,
    discountPct: 38,
    tag: "Best Seller",
    image: "images/hero-3.jpg",
    fallbackImage: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&auto=format&fit=crop&q=80",
    images: [
      "images/hero-3.jpg",
      "images/collections/unique.png"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "Tactical Black", hex: "#111111" },
      { name: "Glacier White", hex: "#F8FAFC", border: true },
      { name: "Desert Sand", hex: "#A8A29E" }
    ],
    desc: "Technical weather-resistant shell featuring Fidlock-inspired magnetic clasps, four exterior bellow cargo pockets, and adjustable cord toggles.",
    inStock: true
  },
  {
    id: 202,
    name: "Neo-Tokyo Graphic Boxy Heavyweight Tee",
    category: "oversized",
    categoryLabel: "Oversized T-Shirt",
    carousel: "bottom",
    priceINR: 2799,
    comparePriceINR: 4499,
    discountPct: 38,
    tag: "Trending Drop",
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80",
    fallbackImage: "images/hero-1.jpg",
    images: [
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80",
      "images/collections/oversized.png"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "Acid Black", hex: "#1A1A1A" },
      { name: "Pure White", hex: "#FFFFFF", border: true }
    ],
    desc: "320 GSM combed cotton oversized luxury tee featuring cyberpunk Japanese typography back typography.",
    inStock: true
  },
  {
    id: 203,
    name: "Shadow Monogram Distressed French Terry Hoodie",
    category: "hoodies",
    categoryLabel: "Hoodies",
    carousel: "bottom",
    priceINR: 5299,
    comparePriceINR: 8499,
    discountPct: 38,
    tag: "Limited Run",
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&auto=format&fit=crop&q=80",
    fallbackImage: "images/hero-1.jpg",
    images: [
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&auto=format&fit=crop&q=80",
      "images/collections/hoodies.png"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Midnight Charcoal", hex: "#1F2937" },
      { name: "Bone White", hex: "#F3F4F6", border: true }
    ],
    desc: "500 GSM loopback French Terry fleece with hand-distressed ribbed edges and tonal atelier monogram.",
    inStock: true
  },
  {
    id: 204,
    name: "Vintage Retro Washed Drop-Shoulder Sweatshirt",
    category: "sweatshirts",
    categoryLabel: "Sweatshirt",
    carousel: "bottom",
    priceINR: 3999,
    comparePriceINR: 6499,
    discountPct: 38,
    tag: "Exclusive",
    image: "https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=800&auto=format&fit=crop&q=80",
    fallbackImage: "images/hero-2.jpg",
    images: [
      "https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=800&auto=format&fit=crop&q=80",
      "images/collections/sweatshirt.png"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Washed Slate", hex: "#475569" },
      { name: "Vintage Tan", hex: "#D6D3D1" }
    ],
    desc: "Pigment dye treated crewneck sweatshirt with exaggerated dropped shoulders and snug elasticated cuffs.",
    inStock: true
  },
  {
    id: 205,
    name: "Obsidian Stealth Ripstop Cargo Utility Shirt",
    category: "tshirts",
    categoryLabel: "T-Shirts",
    carousel: "bottom",
    priceINR: 3499,
    comparePriceINR: 5599,
    discountPct: 38,
    tag: "Techwear",
    image: "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&auto=format&fit=crop&q=80",
    fallbackImage: "images/hero-1.jpg",
    images: [
      "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&auto=format&fit=crop&q=80",
      "images/collections/tshirts.png"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Obsidian Black", hex: "#111111" },
      { name: "Tactical Olive", hex: "#3F4E3F" }
    ],
    desc: "Durable ripstop cotton construction with dual flap utility pockets and gunmetal snap buttons.",
    inStock: true
  },
  {
    id: 206,
    name: "Raw-Edge Heavyweight Waffle Thermal Knit",
    category: "unique",
    categoryLabel: "Unique Design Clothes",
    carousel: "bottom",
    priceINR: 4799,
    comparePriceINR: 7699,
    discountPct: 38,
    tag: "Sculpted",
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80",
    fallbackImage: "images/hero-3.jpg",
    images: [
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80",
      "images/collections/unique.png"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Concrete Grey", hex: "#6B7280" },
      { name: "Onyx Black", hex: "#111111" }
    ],
    desc: "Chunky 380 GSM thermal waffle fabric tailored with raw-cut unfinished hem and ergonomic sleeve paneling.",
    inStock: true
  },
  {
    id: 207,
    name: "Bespoke Cyberpunk Reflective Zip Parka",
    category: "unique",
    categoryLabel: "Unique Design Clothes",
    carousel: "bottom",
    priceINR: 7999,
    comparePriceINR: 12999,
    discountPct: 38,
    tag: "Archive Edition",
    image: "https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop&q=80",
    fallbackImage: "images/hero-3.jpg",
    images: [
      "https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop&q=80",
      "images/collections/unique.png"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "Stealth Black", hex: "#0D0D0D" },
      { name: "Reflective Silver", hex: "#E2E8F0", border: true }
    ],
    desc: "Avant-garde windproof outer garment with 3M reflective line accents, sealed two-way zip, and concealed mask hood.",
    inStock: true
  }
];

const ensureDataFile = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultProducts, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Error initializing product store:', err);
  }
};

const readFallbackProducts = () => {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw || '[]');
    return parsed.length > 0 ? parsed : defaultProducts;
  } catch (e) {
    return defaultProducts;
  }
};

const writeFallbackProducts = (products) => {
  ensureDataFile();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing product store:', e);
  }
};

// Unified Product Model
const UnifiedProduct = {
  isMongoActive: () => getIsConnected(),

  async find(filter = {}) {
    if (UnifiedProduct.isMongoActive()) {
      return await MongooseProduct.find(filter).sort({ createdAt: -1 });
    }
    let prods = readFallbackProducts();
    if (filter.category && filter.category !== 'all') {
      prods = prods.filter(p => p.category === filter.category);
    }
    if (filter.carousel && filter.carousel !== 'all') {
      prods = prods.filter(p => (p.carousel || (p.id >= 201 ? 'bottom' : 'top')) === filter.carousel);
    }
    if (filter.inStock !== undefined) {
      prods = prods.filter(p => p.inStock === filter.inStock);
    }
    return prods;
  },

  async findById(id) {
    if (UnifiedProduct.isMongoActive()) {
      return await MongooseProduct.findOne({ $or: [{ _id: id }, { id: parseInt(id) || 0 }] });
    }
    const prods = readFallbackProducts();
    return prods.find(p => p.id === parseInt(id) || p._id === id || String(p.id) === String(id)) || null;
  },

  async create(data) {
    if (UnifiedProduct.isMongoActive()) {
      return await MongooseProduct.create(data);
    }
    const prods = readFallbackProducts();
    const newId = data.id || (prods.length > 0 ? Math.max(...prods.map(p => p.id || 0)) + 1 : 101);
    const newProduct = {
      _id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      ...data,
      id: newId,
      inStock: data.inStock !== undefined ? data.inStock : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    prods.unshift(newProduct);
    writeFallbackProducts(prods);
    return newProduct;
  },

  async findByIdAndUpdate(id, updates) {
    if (UnifiedProduct.isMongoActive()) {
      return await MongooseProduct.findOneAndUpdate(
        { $or: [{ _id: id }, { id: parseInt(id) || 0 }] },
        updates,
        { new: true }
      );
    }
    const prods = readFallbackProducts();
    const idx = prods.findIndex(p => p.id === parseInt(id) || p._id === id || String(p.id) === String(id));
    if (idx === -1) return null;

    prods[idx] = {
      ...prods[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    writeFallbackProducts(prods);
    return prods[idx];
  },

  async findByIdAndDelete(id) {
    if (UnifiedProduct.isMongoActive()) {
      return await MongooseProduct.findOneAndDelete({ $or: [{ _id: id }, { id: parseInt(id) || 0 }] });
    }
    const prods = readFallbackProducts();
    const idx = prods.findIndex(p => p.id === parseInt(id) || p._id === id || String(p.id) === String(id));
    if (idx === -1) return null;
    const deleted = prods.splice(idx, 1)[0];
    writeFallbackProducts(prods);
    return deleted;
  }
};

module.exports = UnifiedProduct;
