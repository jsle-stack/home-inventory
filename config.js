// config.js - Configuration

// Firebase credentials
// Admin passcode
// Category list
// Location names
// Exports constants for use in app.js

// Firebase Configuration
// TODO: Replace with your actual Firebase config from Firebase Console

export const firebaseConfig = {
  apiKey: "AIzaSyDMRCN-cobIEZpme3LKD6H4lbSfEfIUVOg",
  authDomain: "home-inventory-2025.firebaseapp.com",
  databaseURL: "https://home-inventory-2025-default-rtdb.firebaseio.com",
  projectId: "home-inventory-2025",
  storageBucket: "home-inventory-2025.firebasestorage.app",
  messagingSenderId: "716830800231",
  appId: "1:716830800231:web:cb26ba1064273b3c5ed7c2"
};

// Admin passcode
export const ADMIN_PASSCODE = "12321";

// Available categories for items
export const CATEGORIES = [
    "醬 sauce",
    "清潔產品 cleaning product",
    "罐頭 canned",
    "麵/飯 noodles/rice",
    "醋或水 vinegar/water",
    "袋 bags"
];

// Location names
export const LOCATIONS = ["basement", "garage", "toilet", "elsewhere"];