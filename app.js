// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  set,
  push,
  remove,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Import configuration
import { firebaseConfig, ADMIN_PASSCODE } from "./config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
const itemsRef = ref(database, "items");

// Sign in anonymously
signInAnonymously(auth).catch((error) => {
  console.error("Auth error:", error);
  alert("Failed to connect. Please refresh the page.");
});

// Application state
let items = {};
let isAdminMode = false;
let editingItemId = null;

// DOM Elements
const searchBar = document.getElementById("searchBar");
const categoryFilter = document.getElementById("categoryFilter");
const sortFilter = document.getElementById("sortFilter");
const adminToggle = document.getElementById("adminToggle");
const addItemBtn = document.getElementById("addItemBtn");
const itemGrid = document.getElementById("itemGrid");
const itemModal = document.getElementById("itemModal");
const itemForm = document.getElementById("itemForm");
const modalTitle = document.getElementById("modalTitle");

// Initialize app
function init() {
  setupEventListeners();

  // Wait for authentication before loading items
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in, now load items
      loadItems();
    }
  });
}

// Load items from Firebase
function loadItems() {
  onValue(itemsRef, (snapshot) => {
    items = snapshot.val() || {};
    renderItems();
  });
}

// Setup all event listeners
function setupEventListeners() {
  adminToggle.addEventListener("click", toggleAdminMode);
  addItemBtn.addEventListener("click", openAddItemModal);
  searchBar.addEventListener("input", renderItems);
  categoryFilter.addEventListener("change", renderItems);
  sortFilter.addEventListener("change", renderItems);
  itemForm.addEventListener("submit", saveItem);
  itemModal.addEventListener("click", (e) => {
    if (e.target.id === "itemModal") closeModal();
  });
}

// Toggle admin mode - NO PASSCODE NEEDED TO EXIT
function toggleAdminMode() {
  // If already in admin mode, just exit without asking for passcode
  if (isAdminMode) {
    isAdminMode = false;
    document.body.classList.remove("admin-mode");
    adminToggle.textContent = "Admin Mode";
    adminToggle.classList.remove("active");
    renderItems();
    return;
  }

  // Entering admin mode - ask for passcode
  const passcode = prompt("Enter admin passcode:");

  if (passcode === ADMIN_PASSCODE) {
    isAdminMode = true;
    document.body.classList.add("admin-mode");
    adminToggle.textContent = "Exit Admin";
    adminToggle.classList.add("active");
    renderItems();
  } else if (passcode !== null) {
    alert("Incorrect passcode!");
  }
}

// Open modal for adding new item
function openAddItemModal() {
  editingItemId = null;
  modalTitle.textContent = "Add New Item";
  itemForm.reset();
  itemModal.style.display = "block";
}

// Open modal for editing existing item
window.editItem = function (id) {
  if (!isAdminMode) return;

  editingItemId = id;
  const item = items[id];

  modalTitle.textContent = "Edit Item";
  document.getElementById("itemName").value = item.name;
  document.getElementById("itemCategory").value = item.category;
  document.getElementById("qtyBasement").value = item.locations.basement;
  document.getElementById("qtyGarage").value = item.locations.garage;
  document.getElementById("qtyToilet").value = item.locations.toilet;
  document.getElementById("qtyElsewhere").value = item.locations.elsewhere;
  document.getElementById("itemNote").value = item.note || "";

  itemModal.style.display = "block";
};

// Close modal
window.closeModal = function () {
  itemModal.style.display = "none";
  itemForm.reset();
  editingItemId = null;
};

// Save item (add or update)
function saveItem(e) {
  e.preventDefault();

  const itemData = {
    name: document.getElementById("itemName").value,
    category: document.getElementById("itemCategory").value,
    locations: {
      basement: parseInt(document.getElementById("qtyBasement").value) || 0,
      garage: parseInt(document.getElementById("qtyGarage").value) || 0,
      toilet: parseInt(document.getElementById("qtyToilet").value) || 0,
      elsewhere: parseInt(document.getElementById("qtyElsewhere").value) || 0,
    },
    note: document.getElementById("itemNote").value,
    lastEdited: getCurrentDate(),
  };

  if (editingItemId) {
    // Update existing item
    set(ref(database, `items/${editingItemId}`), itemData);
  } else {
    // Add new item
    push(itemsRef, itemData);
  }

  closeModal();
}

// Delete item
window.deleteItem = function (id) {
  if (!isAdminMode) return;

  if (confirm("Are you sure you want to delete this item?")) {
    remove(ref(database, `items/${id}`));
  }
};

// Update quantity for a specific location
window.updateQuantity = function (id, location, value) {
  if (!isAdminMode) return;

  const item = items[id];
  item.locations[location] = parseInt(value) || 0;
  item.lastEdited = getCurrentDate();

  set(ref(database, `items/${id}`), item);
};

// Adjust quantity by increment (for +/- buttons)
window.adjustQuantity = function (id, location, change) {
  if (!isAdminMode) return;

  const item = items[id];
  const currentQty = item.locations[location] || 0;
  const newQty = Math.max(0, currentQty + change); // Don't go below 0

  item.locations[location] = newQty;
  item.lastEdited = getCurrentDate();

  set(ref(database, `items/${id}`), item);
};

// Render all items
function renderItems() {
  const searchTerm = searchBar.value.toLowerCase();
  const categoryFilterValue = categoryFilter.value;
  const sortValue = sortFilter.value;

  let filteredItems = Object.entries(items).filter(([id, item]) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm);
    const matchesCategory =
      !categoryFilterValue || item.category === categoryFilterValue;
    return matchesSearch && matchesCategory;
  });

  // Sort items based on selected option
  filteredItems.sort(([idA, itemA], [idB, itemB]) => {
    switch (sortValue) {
      case "date-desc":
        // Most recent first
        return (itemB.lastEdited || "").localeCompare(itemA.lastEdited || "");
      case "date-asc":
        // Oldest first
        return (itemA.lastEdited || "").localeCompare(itemB.lastEdited || "");
      case "qty-desc":
        return (
          calculateTotal(itemB.locations) - calculateTotal(itemA.locations)
        );
      case "qty-asc":
        return (
          calculateTotal(itemA.locations) - calculateTotal(itemB.locations)
        );
      default:
        return 0;
    }
  });

  if (filteredItems.length === 0) {
    itemGrid.innerHTML = `<div class="empty-state">No items found. ${
      isAdminMode ? 'Click "Add Item" to create one.' : ""
    }</div>`;
    return;
  }

  itemGrid.innerHTML = filteredItems
    .map(([id, item]) => {
      return createItemCard(id, item);
    })
    .join("");
}

// Create HTML for a single item card
function createItemCard(id, item) {
  const total = calculateTotal(item.locations);

  return `
        <div class="item-card">
            <div class="item-header">
                <div class="item-name">${escapeHtml(item.name)}</div>
                <div class="item-category">${escapeHtml(item.category)}</div>
            </div>
            <div class="item-total">Total Quantity: <strong>${total}</strong></div>
            <div class="locations">
                ${createLocationInputs(id, item.locations)}
            </div>
            ${
              item.note
                ? `<div class="item-note">Note: ${escapeHtml(item.note)}</div>`
                : ""
            }
            <div class="item-footer">
                <span>Last edited: ${item.lastEdited}</span>
                ${isAdminMode ? createItemActions(id) : ""}
            </div>
        </div>
    `;
}

// Create location quantity inputs with +/- buttons
function createLocationInputs(id, locations) {
  return Object.entries(locations)
    .map(
      ([location, qty]) => `
        <div class="location">
            <span class="location-name">${location}</span>
            <div class="quantity-control">
                <button 
                    class="quantity-btn" 
                    onclick="adjustQuantity('${id}', '${location}', -1)"
                    ${!isAdminMode ? "disabled" : ""}
                    ${qty <= 0 ? "disabled" : ""}
                >−</button>
                <span class="quantity-display">${qty}</span>
                <button 
                    class="quantity-btn" 
                    onclick="adjustQuantity('${id}', '${location}', 1)"
                    ${!isAdminMode ? "disabled" : ""}
                >+</button>
            </div>
        </div>
    `
    )
    .join("");
}

// Create action buttons for admin mode
function createItemActions(id) {
  return `
        <div class="item-actions">
            <button onclick="editItem('${id}')">Edit</button>
            <button class="delete-btn" onclick="deleteItem('${id}')">Delete</button>
        </div>
    `;
}

// Helper Functions

function calculateTotal(locations) {
  return Object.values(locations).reduce((sum, qty) => sum + qty, 0);
}

function getCurrentDate() {
  return new Date().toISOString().split("T")[0];
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Initialize the app when DOM is ready
init();
