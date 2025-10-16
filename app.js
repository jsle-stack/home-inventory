// app.js - Functionality

// Firebase connection and data operations
// Admin mode logic
// Search and filter functionality
// Add/Edit/Delete items
// Render items to the page
// Event handling (clicks, form submissions)

// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, set, push, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Import configuration
import { firebaseConfig, ADMIN_PASSCODE } from './config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const itemsRef = ref(database, 'items');

// Application state
let items = {};
let isAdminMode = false;
let editingItemId = null;

// DOM Elements
const searchBar = document.getElementById('searchBar');
const categoryFilter = document.getElementById('categoryFilter');
const adminToggle = document.getElementById('adminToggle');
const addItemBtn = document.getElementById('addItemBtn');
const itemGrid = document.getElementById('itemGrid');
const itemModal = document.getElementById('itemModal');
const itemForm = document.getElementById('itemForm');
const modalTitle = document.getElementById('modalTitle');

// Initialize app
function init() {
    loadItems();
    setupEventListeners();
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
    adminToggle.addEventListener('click', toggleAdminMode);
    addItemBtn.addEventListener('click', openAddItemModal);
    searchBar.addEventListener('input', renderItems);
    categoryFilter.addEventListener('change', renderItems);
    itemForm.addEventListener('submit', saveItem);
    itemModal.addEventListener('click', (e) => {
        if (e.target.id === 'itemModal') closeModal();
    });
}

// Toggle admin mode
function toggleAdminMode() {
    const passcode = prompt('Enter admin passcode:');
    
    if (passcode === ADMIN_PASSCODE) {
        isAdminMode = !isAdminMode;
        document.body.classList.toggle('admin-mode', isAdminMode);
        adminToggle.textContent = isAdminMode ? 'Exit Admin' : 'Admin Mode';
        adminToggle.classList.toggle('active', isAdminMode);
        renderItems();
    } else if (passcode !== null) {
        alert('Incorrect passcode!');
    }
}

// Open modal for adding new item
function openAddItemModal() {
    editingItemId = null;
    modalTitle.textContent = 'Add New Item';
    itemForm.reset();
    itemModal.style.display = 'block';
}

// Open modal for editing existing item
window.editItem = function(id) {
    if (!isAdminMode) return;
    
    editingItemId = id;
    const item = items[id];
    
    modalTitle.textContent = 'Edit Item';
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('qtyBasement').value = item.locations.basement;
    document.getElementById('qtyGarage').value = item.locations.garage;
    document.getElementById('qtyToilet').value = item.locations.toilet;
    document.getElementById('qtyElsewhere').value = item.locations.elsewhere;
    document.getElementById('itemNote').value = item.note || '';
    
    itemModal.style.display = 'block';
};

// Close modal
window.closeModal = function() {
    itemModal.style.display = 'none';
    itemForm.reset();
    editingItemId = null;
};

// Save item (add or update)
function saveItem(e) {
    e.preventDefault();
    
    const itemData = {
        name: document.getElementById('itemName').value,
        category: document.getElementById('itemCategory').value,
        locations: {
            basement: parseInt(document.getElementById('qtyBasement').value) || 0,
            garage: parseInt(document.getElementById('qtyGarage').value) || 0,
            toilet: parseInt(document.getElementById('qtyToilet').value) || 0,
            elsewhere: parseInt(document.getElementById('qtyElsewhere').value) || 0
        },
        note: document.getElementById('itemNote').value,
        lastEdited: getCurrentDate()
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
window.deleteItem = function(id) {
    if (!isAdminMode) return;
    
    if (confirm('Are you sure you want to delete this item?')) {
        remove(ref(database, `items/${id}`));
    }
};

// Update quantity for a specific location
window.updateQuantity = function(id, location, value) {
    if (!isAdminMode) return;
    
    const item = items[id];
    item.locations[location] = parseInt(value) || 0;
    item.lastEdited = getCurrentDate();
    
    set(ref(database, `items/${id}`), item);
};

// Render all items
function renderItems() {
    const searchTerm = searchBar.value.toLowerCase();
    const categoryFilterValue = categoryFilter.value;
    
    const filteredItems = Object.entries(items).filter(([id, item]) => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryFilterValue || item.category === categoryFilterValue;
        return matchesSearch && matchesCategory;
    });

    if (filteredItems.length === 0) {
        itemGrid.innerHTML = `<div class="empty-state">No items found. ${
            isAdminMode ? 'Click "Add Item" to create one.' : ''
        }</div>`;
        return;
    }

    itemGrid.innerHTML = filteredItems.map(([id, item]) => {
        return createItemCard(id, item);
    }).join('');
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
            ${item.note ? `<div class="item-note">Note: ${escapeHtml(item.note)}</div>` : ''}
            <div class="item-footer">
                <span>Last edited: ${item.lastEdited}</span>
                ${isAdminMode ? createItemActions(id) : ''}
            </div>
        </div>
    `;
}

// Create location quantity inputs
function createLocationInputs(id, locations) {
    return Object.entries(locations).map(([location, qty]) => `
        <div class="location">
            <span class="location-name">${location}:</span>
            <input 
                type="number" 
                value="${qty}" 
                min="0" 
                ${isAdminMode ? '' : 'disabled'}
                onchange="updateQuantity('${id}', '${location}', this.value)"
            >
        </div>
    `).join('');
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
    return new Date().toISOString().split('T')[0];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize the app when DOM is ready
init();