/* Sportix Frontend Logic */
const API_BASE = "http://127.0.0.1:8000";
// App State
let products = [];
let cart = JSON.parse(localStorage.getItem("sportix_cart")) || [];
let activeCategory = "all";
let searchQuery = "";
let maxPrice = 250;
let inStockOnly = false;
let sortBy = "default";
let selectedSize = "";
let selectedColor = "";
// DOM Elements
const productsGrid = document.getElementById("products-grid");
const loadingSpinner = document.getElementById("loading-spinner");
const noProducts = document.getElementById("no-products");
const cartBadge = document.getElementById("cart-badge");
const cartDrawer = document.getElementById("cart-drawer");
const cartEmpty = document.getElementById("cart-empty");
const cartItemsList = document.getElementById("cart-items-list");
const drawerFooter = document.getElementById("drawer-footer");
const cartSubtotal = document.getElementById("cart-subtotal");
const themeToggleBtn = document.getElementById("theme-toggle");
const searchInput = document.getElementById("product-search");
const priceSlider = document.getElementById("price-range");
const priceLimitLabel = document.getElementById("price-limit");
const stockFilterCheckbox = document.getElementById("stock-filter");
const sortSelect = document.getElementById("sort-select");
const resetFiltersBtn = document.getElementById("reset-filters");
const clearFiltersBtn = document.getElementById("clear-filters-btn");
// Modals
const detailsModal = document.getElementById("details-modal");
const detailsContent = document.getElementById("details-content");
const checkoutModal = document.getElementById("checkout-modal");
const checkoutForm = document.getElementById("checkout-form");
const checkoutSummaryItems = document.getElementById("checkout-summary-items");
const checkoutSummaryTotal = document.getElementById("checkout-summary-total");
const successModal = document.getElementById("success-modal");
const successOrderId = document.getElementById("success-order-id");
const successOrderTotal = document.getElementById("success-order-total");
const successOrderTime = document.getElementById("success-order-time");
// Emoji Map for Product Visuals
const categoryEmojiMap = {
    "cricket": "🏏",
    "football": "⚽",
    "basketball": "🏀",
    "tennis": "🎾",
    "badminton": "🏸",
    "fitness & gym": "🏋️",
    "running": "👟"
};
// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    fetchProducts();
    updateCartUI();
    registerEventListeners();
});
// Theme Logic
function initTheme() {
    const savedTheme = localStorage.getItem("sportix_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
}
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("sportix_theme", newTheme);
    showToast(`Switched to ${newTheme} mode`);
}
// Fetch products from FastAPI Backend
async function fetchProducts() {
    showLoader(true);
    
    // Construct query parameters
    let url = `${API_BASE}/api/products?`;
    if (activeCategory !== "all") url += `category=${encodeURIComponent(activeCategory)}&`;
    if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
    if (sortBy !== "default") url += `sort_by=${sortBy}&`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to load products");
        products = await response.json();
        
        // Client-side filtering for price range and stock availability
        filterAndRenderProducts();
    } catch (error) {
        console.error("API error:", error);
        productsGrid.innerHTML = `
            <div class="no-products" style="grid-column: 1/-1;">
                <svg viewBox="0 0 24 24" width="48" height="48" stroke="red" stroke-width="1.5" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <h3>Backend Server Offline</h3>
                <p>Could not connect to the Sportix FastAPI backend. Make sure the server is running on port 8000 and the database is initialized.</p>
                <button class="btn btn-secondary btn-sm" onclick="location.reload()">Retry Connection</button>
            </div>
        `;
        showLoader(false);
    }
}
// Client Side Filter & Render
function filterAndRenderProducts() {
    let filtered = products.filter(p => p.price <= maxPrice);
    
    if (inStockOnly) {
        filtered = filtered.filter(p => p.stock > 0);
    }
    
    renderProductGrid(filtered);
}
function renderProductGrid(items) {
    showLoader(false);
    
    if (items.length === 0) {
        noProducts.classList.remove("hidden");
        productsGrid.innerHTML = "";
        return;
    }
    
    noProducts.classList.add("hidden");
    
    productsGrid.innerHTML = items.map(product => {
        const emoji = categoryEmojiMap[product.category.toLowerCase()] || "📦";
        const isOutOfStock = product.stock <= 0;
        
        return `
            <div class="product-card">
                ${product.price < 50 ? '<span class="badge-sale">Sale</span>' : ''}
                ${isOutOfStock ? '<span class="badge-outofstock">Out Of Stock</span>' : ''}
                <div class="product-img-wrap">
                    <span class="product-svg-icon">${emoji}</span>
                </div>
                <div class="product-category">${product.category}</div>
                <h3 class="product-title">${product.name}</h3>
                <div class="product-rating">
                    <span class="star-icon">★</span>
                    <span>${product.rating.toFixed(1)}</span>
                    <span style="color: var(--text-muted); font-size: 0.8rem; margin-left: 0.25rem;">(In Stock: ${product.stock})</span>
                </div>
                <div class="product-footer">
                    <span class="product-price">$${product.price.toFixed(2)}</span>
                    <div class="card-actions">
                        <button class="btn btn-secondary btn-sm view-details-btn" data-id="${product.id}">Details</button>
                        <button class="btn btn-primary btn-sm add-quick-btn" data-id="${product.id}" ${isOutOfStock ? 'disabled' : ''}>
                            🛒
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}
// Product Details Modal
async function openProductDetails(id) {
    try {
        const response = await fetch(`${API_BASE}/api/products/${id}`);
        if (!response.ok) throw new Error("Failed to fetch product details");
        const product = await response.json();
        
        const emoji = categoryEmojiMap[product.category.toLowerCase()] || "📦";
        const isOutOfStock = product.stock <= 0;
        
        const sizesList = product.sizes ? product.sizes.split(",") : [];
        const colorsList = product.colors ? product.colors.split(",") : [];
        
        // Reset selections
        selectedSize = sizesList[0] || "";
        selectedColor = colorsList[0] || "";
        
        detailsContent.innerHTML = `
            <div class="details-img-wrap">
                <span>${emoji}</span>
            </div>
            <div class="details-info-wrap">
                <span class="details-category">${product.category}</span>
                <h2 class="details-title">${product.name}</h2>
                <div class="details-rating">
                    <span class="star-icon">★</span>
                    <span style="font-weight: 600;">${product.rating.toFixed(1)}</span>
                </div>
                <div class="details-price">$${product.price.toFixed(2)}</div>
                <p class="details-description">${product.description}</p>
                
                ${sizesList.length > 0 ? `
                    <div class="option-group">
                        <h4>Available Sizes</h4>
                        <div class="options-list">
                            ${sizesList.map((s, idx) => `
                                <span class="option-item size-option ${idx === 0 ? 'selected' : ''}" data-value="${s}">${s}</span>
                            `).join("")}
                        </div>
                    </div>
                ` : ''}
                
                ${colorsList.length > 0 ? `
                    <div class="option-group">
                        <h4>Available Colors</h4>
                        <div class="options-list">
                            ${colorsList.map((c, idx) => `
                                <span class="option-item color-option ${idx === 0 ? 'selected' : ''}" data-value="${c}">${c}</span>
                            `).join("")}
                        </div>
                    </div>
                ` : ''}
                
                <div class="details-stock-status">
                    Status: ${isOutOfStock ? 
                        '<span class="stock-badge-out">Out of Stock</span>' : 
                        `<span class="stock-badge-in">In Stock (${product.stock} units available)</span>`
                    }
                </div>
                
                <button id="modal-add-to-cart" class="btn btn-primary" ${isOutOfStock ? 'disabled' : ''}>
                    Add Gear to Cart
                </button>
            </div>
        `;
        
        // Size & Color selection listeners
        document.querySelectorAll(".size-option").forEach(el => {
            el.addEventListener("click", (e) => {
                document.querySelectorAll(".size-option").forEach(o => o.classList.remove("selected"));
                e.target.classList.add("selected");
                selectedSize = e.target.dataset.value;
            });
        });
        document.querySelectorAll(".color-option").forEach(el => {
            el.addEventListener("click", (e) => {
                document.querySelectorAll(".color-option").forEach(o => o.classList.remove("selected"));
                e.target.classList.add("selected");
                selectedColor = e.target.dataset.value;
            });
        });
        // Add to Cart from Modal
        document.getElementById("modal-add-to-cart").onclick = () => {
            addToCart(product.id, selectedSize, selectedColor);
            closeAllModals();
        };
        detailsModal.classList.add("active");
    } catch (error) {
        console.error(error);
        showToast("Error loading product details", "danger");
    }
}
// Cart Logic
function addToCart(productId, size = "", color = "") {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Check if item already in cart with same size/color
    const cartIndex = cart.findIndex(item => 
        item.product_id === productId && 
        item.size === size && 
        item.color === color
    );
    
    if (cartIndex > -1) {
        if (cart[cartIndex].quantity >= product.stock) {
            showToast(`Cannot add more. Only ${product.stock} items in stock.`, "danger");
            return;
        }
        cart[cartIndex].quantity += 1;
    } else {
        cart.push({
            product_id: productId,
            name: product.name,
            price: product.price,
            category: product.category,
            size: size,
            color: color,
            quantity: 1,
            max_stock: product.stock
        });
    }
    
    saveCart();
    updateCartUI();
    showToast(`Added "${product.name}" to cart`);
}
function updateCartQuantity(productId, size, color, quantity) {
    const cartIndex = cart.findIndex(item => 
        item.product_id === productId && 
        item.size === size && 
        item.color === color
    );
    
    if (cartIndex === -1) return;
    
    if (quantity <= 0) {
        cart.splice(cartIndex, 1);
    } else {
        const item = cart[cartIndex];
        if (quantity > item.max_stock) {
            showToast(`Sorry, only ${item.max_stock} units available.`, "danger");
            return;
        }
        item.quantity = quantity;
    }
    
    saveCart();
    updateCartUI();
}
function removeFromCart(productId, size, color) {
    cart = cart.filter(item => 
        !(item.product_id === productId && item.size === size && item.color === color)
    );
    saveCart();
    updateCartUI();
    showToast("Item removed from cart");
}
function saveCart() {
    localStorage.setItem("sportix_cart", JSON.stringify(cart));
}
function updateCartUI() {
    // Update badge count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBadge.textContent = totalItems;
    
    if (cart.length === 0) {
        cartEmpty.classList.remove("hidden");
        cartItemsList.innerHTML = "";
        drawerFooter.classList.add("hidden");
        return;
    }
    
    cartEmpty.classList.add("hidden");
    drawerFooter.classList.remove("hidden");
    
    let subtotal = 0;
    
    cartItemsList.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        const emoji = categoryEmojiMap[item.category.toLowerCase()] || "📦";
        
        return `
            <div class="cart-item">
                <div class="cart-item-img">${emoji}</div>
                <div class="cart-item-details">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <div class="cart-item-meta">
                        ${item.size ? `Size: ${item.size} | ` : ''} ${item.color ? `Color: ${item.color}` : ''}
                    </div>
                    <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn qty-minus" data-id="${item.product_id}" data-size="${item.size}" data-color="${item.color}">-</button>
                    <span class="qty-val">${item.quantity}</span>
                    <button class="qty-btn qty-plus" data-id="${item.product_id}" data-size="${item.size}" data-color="${item.color}">+</button>
                </div>
                <button class="icon-btn remove-cart-item" data-id="${item.product_id}" data-size="${item.size}" data-color="${item.color}" style="color: var(--danger);">
                    🗑️
                </button>
            </div>
        `;
    }).join("");
    
    cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
}
// Checkout Process
function openCheckout() {
    if (cart.length === 0) return;
    
    let subtotal = 0;
    checkoutSummaryItems.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        return `
            <div class="summary-item">
                <span>${item.name} (x${item.quantity})</span>
                <span>$${itemTotal.toFixed(2)}</span>
            </div>
        `;
    }).join("");
    
    checkoutSummaryTotal.textContent = `$${subtotal.toFixed(2)}`;
    
    cartDrawer.classList.remove("active");
    checkoutModal.classList.add("active");
}
async function handleCheckoutSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById("submit-order-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Processing Order...";
    
    const orderItems = cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
    }));
    
    const orderPayload = {
        customer_name: document.getElementById("checkout-name").value,
        email: document.getElementById("checkout-email").value,
        address: document.getElementById("checkout-address").value,
        items: orderItems
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/checkout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(orderPayload)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.detail || "Checkout failed");
        }
        
        // Order Successful
        cart = [];
        saveCart();
        updateCartUI();
        
        checkoutModal.classList.remove("active");
        
        // Set success modal contents
        successOrderId.textContent = `#${result.order_id}`;
        successOrderTotal.textContent = `$${result.total_price.toFixed(2)}`;
        successOrderTime.textContent = result.created_at;
        
        successModal.classList.add("active");
        checkoutForm.reset();
    } catch (error) {
        console.error(error);
        showToast(error.message || "An error occurred during checkout", "danger");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Place Order";
    }
}
// Event Listeners Registration
function registerEventListeners() {
    // Theme toggle
    themeToggleBtn.addEventListener("click", toggleTheme);
    
    // Search input
    let searchTimeout;
    searchInput.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchQuery = e.target.value.trim();
            fetchProducts();
        }, 400); // Debounce search
    });
    
    // Category click
    document.querySelectorAll(".category-tab").forEach(tab => {
        tab.addEventListener("click", (e) => {
            document.querySelectorAll(".category-tab").forEach(t => t.classList.remove("active"));
            e.target.classList.add("active");
            activeCategory = e.target.dataset.category;
            fetchProducts();
        });
    });
    // Sidebar Category links (Footer)
    document.querySelectorAll(".category-link").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const category = e.target.dataset.category;
            const tab = document.querySelector(`.category-tab[data-category="${category}"]`);
            if (tab) tab.click();
            document.getElementById("shop-section").scrollIntoView({ behavior: "smooth" });
        });
    });
    // Scroll to shop banner button
    document.querySelector(".scroll-to-shop").addEventListener("click", () => {
        document.getElementById("shop-section").scrollIntoView({ behavior: "smooth" });
    });
    
    // Price Range Slider
    priceSlider.addEventListener("input", (e) => {
        maxPrice = parseFloat(e.target.value);
        priceLimitLabel.textContent = `Max: $${maxPrice}`;
        filterAndRenderProducts();
    });
    
    // Stock Filter Checkbox
    stockFilterCheckbox.addEventListener("change", (e) => {
        inStockOnly = e.target.checked;
        filterAndRenderProducts();
    });
    
    // Sorting Selector
    sortSelect.addEventListener("change", (e) => {
        sortBy = e.target.value;
        fetchProducts();
    });
    
    // Reset Filters button
    resetFiltersBtn.addEventListener("click", resetFilters);
    clearFiltersBtn.addEventListener("click", resetFilters);
    
    // Open/Close Cart Drawer
    document.querySelectorAll(".cart-trigger").forEach(btn => {
        btn.addEventListener("click", () => cartDrawer.classList.add("active"));
    });
    document.querySelectorAll(".close-drawer").forEach(btn => {
        btn.addEventListener("click", () => cartDrawer.classList.remove("active"));
    });
    
    // Close cart when clicking outside drawer content
    cartDrawer.addEventListener("click", (e) => {
        if (e.target === cartDrawer) cartDrawer.classList.remove("active");
    });
    
    // Product grid buttons event delegation (Details and Quick Add)
    productsGrid.addEventListener("click", (e) => {
        const id = parseInt(e.target.dataset.id);
        if (!id) return;
        
        if (e.target.classList.contains("view-details-btn")) {
            openProductDetails(id);
        } else if (e.target.classList.contains("add-quick-btn")) {
            const product = products.find(p => p.id === id);
            const sizes = product && product.sizes ? product.sizes.split(",") : [];
            const colors = product && product.colors ? product.colors.split(",") : [];
            addToCart(id, sizes[0] || "", colors[0] || "");
        }
    });
    
    // Cart quantity adjust and remove delegates
    cartItemsList.addEventListener("click", (e) => {
        const target = e.target;
        const id = parseInt(target.dataset.id);
        if (!id) return;
        
        const size = target.dataset.size || "";
        const color = target.dataset.color || "";
        const item = cart.find(i => i.product_id === id && i.size === size && i.color === color);
        if (!item) return;
        
        if (target.classList.contains("qty-plus")) {
            updateCartQuantity(id, size, color, item.quantity + 1);
        } else if (target.classList.contains("qty-minus")) {
            updateCartQuantity(id, size, color, item.quantity - 1);
        } else if (target.classList.contains("remove-cart-item")) {
            removeFromCart(id, size, color);
        }
    });
    
    // Checkout controls
    document.getElementById("checkout-trigger").addEventListener("click", openCheckout);
    checkoutForm.addEventListener("submit", handleCheckoutSubmit);
    
    // Close modals
    document.querySelectorAll(".close-modal, .modal-overlay").forEach(el => {
        el.addEventListener("click", (e) => {
            if (e.target.classList.contains("close-modal") || e.target.classList.contains("modal-overlay") || e.target.closest(".close-modal")) {
                closeAllModals();
            }
        });
    });
    
    // Success Close button
    document.getElementById("success-close-btn").addEventListener("click", closeAllModals);
}
function resetFilters() {
    priceSlider.value = 250;
    maxPrice = 250;
    priceLimitLabel.textContent = "Max: $250";
    stockFilterCheckbox.checked = false;
    inStockOnly = false;
    sortSelect.value = "default";
    sortBy = "default";
    searchInput.value = "";
    searchQuery = "";
    activeCategory = "all";
    document.querySelectorAll(".category-tab").forEach(t => {
        if (t.dataset.category === "all") t.classList.add("active");
        else t.classList.remove("active");
    });
    fetchProducts();
    showToast("Filters reset successfully");
}
function closeAllModals() {
    detailsModal.classList.remove("active");
    checkoutModal.classList.remove("active");
    successModal.classList.remove("active");
}
// Loader state
function showLoader(show) {
    if (show) {
        loadingSpinner.classList.remove("hidden");
        productsGrid.classList.add("hidden");
    } else {
        loadingSpinner.classList.add("hidden");
        productsGrid.classList.remove("hidden");
    }
}
// Toast alerts helper
function showToast(message, type = "success") {
    const toastContainer = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type === "danger" ? "toast-danger" : ""}`;
    if (type === "danger") {
        toast.style.borderLeftColor = "var(--danger)";
    }
    
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close">✕</button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Close button
    toast.querySelector(".toast-close").onclick = () => toast.remove();
    
    // Auto removal
    setTimeout(() => {
        toast.style.animation = "slideIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28) reverse forwards";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
