/* ===== LaNature Hotel — Constants ===== */

export const ADMIN_USER = 'admin';
export const ADMIN_PASS = 'lanature123';

export interface MenuItem {
  id: number;
  name: string;
  category: 'starters' | 'main' | 'beverages' | 'desserts';
  price: number;
  desc: string;
  img: string;
  veg: boolean;
}

export interface CartItem extends MenuItem {
  qty: number;
}

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: number;
  customer: string;
  locationType: string;
  locationNumber: string;
  items: OrderItem[];
  total: number;
  status: 'new' | 'preparing' | 'ready' | 'delivered';
  paymentMethod: 'online' | 'cash' | null;
  time: string;
}

export const CAT_LABELS: Record<string, string> = {
  starters: '🥘 Starters',
  main: '🍛 Main Course',
  beverages: '🥤 Beverages',
  desserts: '🍮 Desserts',
};

export const DEFAULT_MENU_DATA: MenuItem[] = [
  // Starters
  { id: 1, name: "Paneer Tikka", category: "starters", price: 220, desc: "Creamy marinated cottage cheese, grilled in tandoor", img: "/images/paneer-tikka.png", veg: true },
  { id: 2, name: "Veg Spring Rolls", category: "starters", price: 180, desc: "Crispy rolls with fresh vegetables", img: "/images/spring-rolls.png", veg: true },
  { id: 3, name: "Chicken Seekh Kebab", category: "starters", price: 280, desc: "Minced chicken with aromatic spices", img: "/images/seekh-kebab.png", veg: false },
  // Main Course
  { id: 4, name: "Dal Makhani", category: "main", price: 240, desc: "Slow-cooked black lentils in rich gravy", img: "/images/dal-makhani.png", veg: true },
  { id: 5, name: "Butter Chicken", category: "main", price: 320, desc: "Tender chicken in tomato-butter sauce", img: "/images/butter-chicken.png", veg: false },
  { id: 6, name: "Paneer Butter Masala", category: "main", price: 260, desc: "Cottage cheese in creamy tomato gravy", img: "/images/paneer-butter-masala.png", veg: true },
  { id: 7, name: "Biryani (Veg)", category: "main", price: 280, desc: "Fragrant basmati rice with vegetables", img: "/images/veg-biryani.png", veg: true },
  { id: 8, name: "Biryani (Chicken)", category: "main", price: 340, desc: "Aromatic rice with tender chicken", img: "/images/chicken-biryani.png", veg: false },
  // Beverages
  { id: 9, name: "Fresh Lime Soda", category: "beverages", price: 80, desc: "Refreshing citrus drink with soda", img: "/images/mango-lassi.png", veg: true },
  { id: 10, name: "Mango Lassi", category: "beverages", price: 120, desc: "Cool yogurt drink with fresh mango", img: "/images/mango-lassi.png", veg: true },
  { id: 11, name: "Masala Chai", category: "beverages", price: 60, desc: "Aromatic Indian spiced tea", img: "/images/dal-makhani.png", veg: true },
  { id: 12, name: "Cold Coffee", category: "beverages", price: 140, desc: "Chilled coffee with ice cream", img: "/images/mango-lassi.png", veg: true },
  // Desserts
  { id: 13, name: "Gulab Jamun", category: "desserts", price: 110, desc: "Soft milk dumplings in sugar syrup", img: "/images/gulab-jamun.png", veg: true },
  { id: 14, name: "Ice Cream (2 scoops)", category: "desserts", price: 130, desc: "Choice of vanilla / chocolate / mango", img: "/images/ice-cream.png", veg: true },
  { id: 15, name: "Rasgulla", category: "desserts", price: 100, desc: "Spongy cottage cheese balls in syrup", img: "/images/rasgulla.png", veg: true },
];

export const GALLERY_ITEMS = [
  { src: "/images/gallery-pool-aerial.jpg", alt: "Pool & Hotel Night View", label: "Pool & Resort" },
  { src: "/images/gallery-entrance.jpg", alt: "Grand Entrance", label: "Grand Entrance" },
  { src: "/images/gallery-poolside.jpg", alt: "Poolside Night", label: "Poolside Evening" },
  { src: "/images/gallery-lounge.jpg", alt: "Luxury Lounge", label: "Luxury Lounge" },
  { src: "/images/gallery-cottages.jpg", alt: "Luxury Cottages", label: "Luxury Cottages" },
  { src: "/images/gallery-pool-palm.jpg", alt: "Palm Pool Retreat", label: "Palm Pool Retreat" },
  { src: "/images/gallery-dining-garden.png", alt: "Garden Dining Hall", label: "Garden Dining Hall" },
  { src: "/images/gallery-outdoor-seating.jpg", alt: "Green Outdoor Seating", label: "Green Outdoor Seating" },
];

export const FEATURES = [
  { icon: "🍽", title: "Fine Dining", desc: "Savor exquisite Indian and international cuisine crafted by award-winning chefs using the freshest ingredients." },
  { icon: "🏊", title: "Infinity Pool", desc: "Relax by our stunning infinity pool with panoramic views of lush green landscapes and sunset skies." },
  { icon: "💆", title: "Luxury Spa", desc: "Rejuvenate body and soul with our Ayurvedic spa treatments, aromatherapy, and wellness programs." },
  { icon: "🛏", title: "Premium Rooms", desc: "Elegantly designed suites with modern amenities, plush bedding, and breathtaking natural views." },
];
