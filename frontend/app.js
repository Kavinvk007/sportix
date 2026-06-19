/* Sportix Frontend Logic */
const API_BASE = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') ? "http://127.0.0.1:8000" : "";

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

// Auth State
let currentUser = null;
let token = localStorage.getItem("sportix_token") || null;
let wishlist = [];
let addresses = [];

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

// Auth Views & Forms
const homeView = document.getElementById("home-view");
const authView = document.getElementById("auth-view");
const dashboardView = document.getElementById("dashboard-view");
const adminView = document.getElementById("admin-view");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const loginFormContainer = document.getElementById("login-form-container");
const registerFormContainer = document.getElementById("register-form-container");
const goToRegisterBtn = document.getElementById("go-to-register");
const goToLoginBtn = document.getElementById("go-to-login");

// Navbar Profile Elements
const profileNavContainer = document.getElementById("profile-nav-container");
const navSigninBtn = document.getElementById("nav-signin-btn");
const navProfileActive = document.getElementById("nav-profile-active");
const navAvatar = document.getElementById("nav-avatar");
const navUsername = document.getElementById("nav-username");
const profileDropdown = document.getElementById("profile-dropdown");
const logoutBtn = document.getElementById("logout-btn");
const dropdownFullName = document.getElementById("dropdown-full-name");
const dropdownEmail = document.getElementById("dropdown-email");

// Dashboard Elements
const dashboardUserName = document.getElementById("dashboard-user-name");
const dashboardUserEmail = document.getElementById("dashboard-user-email");
const dashboardUserSince = document.getElementById("dashboard-user-since");
const dashboardAvatar = document.getElementById("dashboard-avatar");
const statWishlistCount = document.getElementById("stat-wishlist-count");
const statOrdersCount = document.getElementById("stat-orders-count");
const statDefaultAddress = document.getElementById("stat-default-address");
const notificationsList = document.getElementById("notifications-list");
const wishlistGrid = document.getElementById("wishlist-grid");
const ordersListContainer = document.getElementById("orders-list-container");
const addressesGrid = document.getElementById("addresses-grid");

// Address form Elements
const addressFormModal = document.getElementById("address-form-modal");
const addressForm = document.getElementById("address-form");
const addressFormTitle = document.getElementById("address-form-title");
const addressIdInput = document.getElementById("address-id");
const addressLabelInput = document.getElementById("address-label");
const addressFullnameInput = document.getElementById("address-fullname");
const addressLineInput = document.getElementById("address-line");
const addressCityInput = document.getElementById("address-city");
const addressStateInput = document.getElementById("address-state");
const addressZipInput = document.getElementById("address-zip");
const addressCountryInput = document.getElementById("address-country");
const addressDefaultInput = document.getElementById("address-default");
const cancelAddressBtn = document.getElementById("cancel-address-btn");
const addAddressBtn = document.getElementById("add-address-btn");

// Payments form Elements
const savedCardsList = document.getElementById("saved-cards-list");
const savedUpiList = document.getElementById("saved-upi-list");
const cardFormModal = document.getElementById("card-form-modal");
const upiFormModal = document.getElementById("upi-form-modal");
const addCardBtn = document.getElementById("add-card-btn");
const addUpiBtn = document.getElementById("add-upi-btn");
const cardForm = document.getElementById("card-form");
const upiForm = document.getElementById("upi-form");
const cancelCardBtn = document.getElementById("cancel-card-btn");
const cancelUpiBtn = document.getElementById("cancel-upi-btn");

// Security settings Elements
const changePasswordForm = document.getElementById("change-password-form");
const activeSessionsList = document.getElementById("active-sessions-list");
const securityActivityLog = document.getElementById("security-activity-log");

// Preferences settings Elements
const prefThemeCheckbox = document.getElementById("pref-theme-checkbox");
const prefNotifyOrders = document.getElementById("pref-notify-orders");
const prefNotifyOffers = document.getElementById("pref-notify-offers");
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
// Initialize Application
document.addEventListener("DOMContentLoaded", async () => {
    initTheme();
    await checkAuth();
    fetchProducts();
    updateCartUI();
    registerEventListeners();
    registerAuthListeners();
    initPromoSection();
});
// Theme Logic
function initTheme() {
    const savedTheme = localStorage.getItem("sportix_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    if (prefThemeCheckbox) {
        prefThemeCheckbox.checked = (savedTheme === "dark");
    }
}
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("sportix_theme", newTheme);
    if (prefThemeCheckbox) {
        prefThemeCheckbox.checked = (newTheme === "dark");
    }
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
        const isWishlisted = wishlist.some(w => w.product_id === product.id);

        return `
            <div class="product-card">
                ${product.price < 50 ? '<span class="badge-sale">Sale</span>' : ''}
                ${isOutOfStock ? '<span class="badge-outofstock">Out Of Stock</span>' : ''}
                <div class="product-img-wrap">
                    <img src="${product.image_url}" alt="${product.name}" class="product-image" loading="lazy" />
                    <button class="product-wishlist-btn ${isWishlisted ? 'wishlisted' : ''}" data-id="${product.id}" aria-label="${isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}" title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
                        ${isWishlisted ? '❤️' : '🤍'}
                    </button>
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
        const [response, reviewsResponse] = await Promise.all([
            fetch(`${API_BASE}/api/products/${id}`),
            fetch(`${API_BASE}/api/products/${id}/reviews`)
        ]);
        if (!response.ok) throw new Error("Failed to fetch product details");
        const product = await response.json();
        const reviews = reviewsResponse.ok ? await reviewsResponse.json() : [];

        const emoji = categoryEmojiMap[product.category.toLowerCase()] || "📦";
        const isOutOfStock = product.stock <= 0;

        const sizesList = product.sizes ? product.sizes.split(",") : [];
        const colorsList = product.colors ? product.colors.split(",") : [];

        // Mock Gallery Images
        const galleryImages = [
            product.image_url,
            product.image_url,
            product.image_url
        ];

        // Mock Related Products
        const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);

        // Reset selections
        selectedSize = sizesList[0] || "";
        selectedColor = colorsList[0] || "";

        detailsContent.innerHTML = `
            <div class="product-gallery" style="display: flex; gap: 1rem;">
                <div class="gallery-thumbnails" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 400px; overflow-y: auto;">
                    ${galleryImages.map((img, i) => `
                        <img src="${img}" class="thumb-img ${i === 0 ? 'active' : ''}" style="width: 60px; height: 60px; object-fit: contain; cursor: pointer; border: 1px solid var(--border); border-radius: 6px; padding: 0.25rem; opacity: ${i === 0 ? '1' : '0.6'}; transition: all 0.2s;" onclick="document.getElementById('main-gallery-img').src='${img}'; document.querySelectorAll('.thumb-img').forEach(t=>t.style.opacity='0.6'); this.style.opacity='1';">
                    `).join('')}
                </div>
                <div class="details-img-wrap" style="flex: 1; border: 1px solid var(--border); border-radius: 12px; display: flex; align-items: center; justify-content: center; padding: 2rem; background: var(--bg-tertiary);">
                    <img id="main-gallery-img" src="${product.image_url}" alt="${product.name}" class="product-image" style="max-height: 400px; width: 100%; object-fit: contain;" />
                </div>
            </div>
            
            <div class="details-info-wrap" style="flex: 1; display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <span class="details-category" style="color: var(--accent); font-weight: 600; font-size: 0.9rem; text-transform: uppercase;">${product.category}</span>
                        <h2 class="details-title" style="font-size: 1.8rem; margin: 0.5rem 0;">${product.name}</h2>
                    </div>
                    <button class="icon-btn product-wishlist-btn" data-id="${product.id}" style="border: 1px solid var(--border); border-radius: 50%; padding: 0.5rem;">🤍</button>
                </div>
                
                <div class="details-rating" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: #fbbf24;">
                    <span class="star-icon">★★★★☆</span>
                    <span style="font-weight: 600; color: var(--text-primary);">${product.rating.toFixed(1)}</span>
                    <a href="#reviews-section" style="color: var(--accent); font-size: 0.9rem; margin-left: 0.5rem; text-decoration: none;">(128 Reviews)</a>
                </div>
                
                <div class="details-price" style="font-size: 2rem; font-weight: 700; color: #00f0ff; margin-bottom: 1rem;">$${product.price.toFixed(2)}</div>
                
                <p class="details-description" style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.5rem;">${product.description}</p>
                
                ${sizesList.length > 0 ? `
                    <div class="option-group" style="margin-bottom: 1rem;">
                        <h4 style="margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">Available Sizes</h4>
                        <div class="options-list" style="display: flex; gap: 0.5rem;">
                            ${sizesList.map((s, idx) => `
                                <span class="option-item size-option ${idx === 0 ? 'selected' : ''}" data-value="${s}">${s}</span>
                            `).join("")}
                        </div>
                    </div>
                ` : ''}
                
                ${colorsList.length > 0 ? `
                    <div class="option-group" style="margin-bottom: 1.5rem;">
                        <h4 style="margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">Available Colors</h4>
                        <div class="options-list" style="display: flex; gap: 0.5rem;">
                            ${colorsList.map((c, idx) => `
                                <span class="option-item color-option ${idx === 0 ? 'selected' : ''}" data-value="${c}">${c}</span>
                            `).join("")}
                        </div>
                    </div>
                ` : ''}
                
                <div class="delivery-check" style="margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border);">
                    <h4 style="margin-bottom: 0.5rem; font-size: 0.9rem;">Check Delivery Options</h4>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" id="pincode-input" placeholder="Enter Pincode" style="flex:1; background: var(--bg-tertiary); border: 1px solid var(--border); color: var(--text-primary); padding: 0.5rem; border-radius: 6px; font-size: 0.9rem; outline: none;">
                        <button class="btn btn-secondary btn-sm" onclick="checkPincode()">Check</button>
                    </div>
                    <p id="pincode-result" style="font-size: 0.85rem; margin-top: 0.5rem; display: none;"></p>
                </div>

                <div class="details-stock-status" style="margin-bottom: 1.5rem;">
                    Status: ${isOutOfStock ?
                '<span class="stock-badge-out" style="color: var(--danger); font-weight: 600;">Out of Stock</span>' :
                `<span class="stock-badge-in" style="color: var(--success); font-weight: 600;">In Stock (${product.stock} units available)</span>`
            }
                </div>
                
                <div class="action-buttons" style="display: flex; gap: 1rem; margin-top: auto;">
                    <button id="modal-add-to-cart" class="btn btn-secondary" style="flex: 1;" ${isOutOfStock ? 'disabled' : ''}>Add to Cart</button>
                    <button id="modal-buy-now" class="btn btn-primary" style="flex: 1;" ${isOutOfStock ? 'disabled' : ''}>Buy Now</button>
                </div>
            </div>
            
            <!-- Specifications Tab -->
            <div style="grid-column: 1 / -1; margin-top: 3rem; border-top: 1px solid var(--border); padding-top: 2rem;">
                <h3 style="margin-bottom: 1rem;">Product Specifications</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; color: var(--text-secondary);">
                    <div><strong>Brand:</strong> Sportix Elite</div>
                    <div><strong>Material:</strong> Premium Synthetic</div>
                    <div><strong>Weight:</strong> 450g</div>
                    <div><strong>Warranty:</strong> 1 Year Manufacturer</div>
                </div>
            </div>

            <!-- Frequently Bought Together -->
            <div style="grid-column: 1 / -1; margin-top: 2rem; border-top: 1px solid var(--border); padding-top: 2rem;">
                <h3 style="margin-bottom: 1rem;">Frequently Bought Together</h3>
                <div style="display: flex; align-items: center; gap: 1rem; background: var(--bg-secondary); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border); flex-wrap: wrap;">
                    <img src="${product.image_url}" style="width: 80px; height: 80px; object-fit: contain; background: var(--bg-tertiary); border-radius: 8px;">
                    <span style="font-size: 1.5rem; color: var(--text-secondary);">+</span>
                    <img src="${related.length > 0 ? related[0].image_url : 'assets/images/user_avatar.png'}" style="width: 80px; height: 80px; object-fit: contain; background: var(--bg-tertiary); border-radius: 8px;">
                    <div style="margin-left: auto; text-align: right; flex-grow: 1;">
                        <p style="color: var(--text-secondary); margin-bottom: 0.5rem;">Total Price:</p>
                        <strong style="font-size: 1.5rem; color: #00f0ff;">$${(product.price + (related.length > 0 ? related[0].price : 20)).toFixed(2)}</strong>
                        <br>
                        <button class="btn btn-secondary btn-sm" style="margin-top: 0.5rem;" onclick="showToast('Added bundle to cart')">Add Both to Cart</button>
                    </div>
                </div>
            </div>

            <!-- Reviews Section -->
            <div id="reviews-section" style="grid-column: 1 / -1; margin-top: 2rem; border-top: 1px solid var(--border); padding-top: 2rem;">
                <h3 style="margin-bottom: 1rem;">Customer Reviews</h3>
                
                ${token ? `
                <div class="review-form" style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 1.5rem;">
                    <h4 style="margin-bottom: 1rem;">Write a Review</h4>
                    <form id="submit-review-form" onsubmit="handleReviewSubmit(event, ${product.id})">
                        <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                            <label>Rating:</label>
                            <select id="review-rating" style="background: var(--bg-tertiary); border: 1px solid var(--border); color: var(--text-primary); border-radius: 4px; padding: 0.2rem;">
                                <option value="5">5 Stars</option>
                                <option value="4">4 Stars</option>
                                <option value="3">3 Stars</option>
                                <option value="2">2 Stars</option>
                                <option value="1">1 Star</option>
                            </select>
                        </div>
                        <textarea id="review-comment" placeholder="What did you think about this product?" style="width: 100%; background: var(--bg-tertiary); border: 1px solid var(--border); color: var(--text-primary); border-radius: 8px; padding: 0.8rem; margin-bottom: 1rem; min-height: 80px;" required></textarea>
                        <button type="submit" class="btn btn-secondary">Submit Review</button>
                    </form>
                </div>
                ` : `
                <div style="margin-bottom: 1.5rem; color: var(--text-secondary);">
                    <a href="#" onclick="closeAllModals(); openAuthView('login'); return false;" style="color: var(--accent);">Log in</a> to write a review.
                </div>
                `}

                <div id="reviews-list" style="display: flex; flex-direction: column; gap: 1rem;">
                    ${reviews.length === 0 ? '<p style="color: var(--text-secondary);">No reviews yet. Be the first to review!</p>' : reviews.map(r => `
                    <div style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <strong style="color: var(--text-primary);">${r.user_name || 'Anonymous'}</strong>
                            <span style="color: #fbbf24;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
                        </div>
                        <p style="color: var(--text-secondary); font-size: 0.9rem;">${r.comment || ''}</p>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">${r.created_at}</span>
                    </div>
                    `).join('')}
                </div>
            </div>

            <!-- Related Products -->
            <div style="grid-column: 1 / -1; margin-top: 2rem; border-top: 1px solid var(--border); padding-top: 2rem;">
                <h3 style="margin-bottom: 1rem;">Similar Products</h3>
                <div style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1rem;">
                    ${related.map(r => `
                        <div style="min-width: 200px; max-width: 200px; background: var(--bg-secondary); padding: 1rem; border-radius: 12px; border: 1px solid var(--border); cursor: pointer;" onclick="openProductDetails(${r.id})">
                            <img src="${r.image_url}" style="width: 100%; height: 120px; object-fit: contain; margin-bottom: 1rem;">
                            <h5 style="font-size: 1rem; margin-bottom: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.name}</h5>
                            <span style="color: #00f0ff; font-weight: 700;">$${r.price.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        detailsContent.style.display = 'grid';
        detailsContent.style.gridTemplateColumns = '1fr 1fr';
        detailsContent.style.gap = '2rem';
        if (window.innerWidth < 768) {
            detailsContent.style.gridTemplateColumns = '1fr';
        }

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
            cartDrawer.classList.add("active");
        };

        // Buy Now from Modal
        document.getElementById("modal-buy-now").onclick = () => {
            addToCart(product.id, selectedSize, selectedColor);
            closeAllModals();
            openCheckout();
        };

        detailsModal.classList.add("active");
    } catch (error) {
        console.error(error);
        showToast("Error loading product details", "danger");
    }
}

// Global Pincode Mock
window.checkPincode = function () {
    const p = document.getElementById("pincode-input").value;
    const res = document.getElementById("pincode-result");
    res.style.display = "block";
    if (p.length >= 5) {
        res.style.color = "var(--success)";
        res.innerText = "✓ Delivery available to this location within 3-4 days.";
    } else {
        res.style.color = "var(--danger)";
        res.innerText = "✗ Invalid Pincode or out of delivery area.";
    }
};
// Cart Logic
async function handleReviewSubmit(e, productId) {
    e.preventDefault();
    const rating = parseInt(document.getElementById("review-rating").value);
    const comment = document.getElementById("review-comment").value;
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Submitting...";

    try {
        const res = await fetch(`${API_BASE}/api/products/${productId}/reviews`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ rating, comment })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to submit review");

        showToast("Review added successfully! ⭐");
        // Reload product details to show new review
        openProductDetails(productId);
    } catch (err) {
        showToast(err.message, "danger");
        btn.disabled = false;
        btn.textContent = "Submit Review";
    }
}

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
            image_url: product.image_url,
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
                <div class="cart-item-img">
                    <img src="${item.image_url}" alt="${item.name}" style="width:100%; height:100%; object-fit:contain;" />
                </div>
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
let appliedCouponDiscount = 0;
let stripe;
let elements;

async function initStripe() {
    if (!stripe) {
        // Initialize Stripe with the same mock public key
        stripe = Stripe("pk_test_TYooMQauvdEDq54NiTphI7jx");
    }

    const orderItems = cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
    }));

    try {
        const response = await fetch(`${API_BASE}/api/create-payment-intent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                items: orderItems,
                coupon_code: appliedCouponDiscount > 0 ? document.getElementById("coupon-input").value.toUpperCase() : null
            })
        });

        const { clientSecret } = await response.json();

        const appearance = {
            theme: document.documentElement.getAttribute("data-theme") === "dark" ? 'night' : 'stripe',
            variables: {
                colorPrimary: '#00ffaa',
            },
        };

        elements = stripe.elements({ appearance, clientSecret });
        const paymentElement = elements.create("payment");
        paymentElement.mount("#payment-element");
    } catch (e) {
        document.getElementById("payment-element").innerHTML = "Failed to load secure payment gateway.";
        console.error(e);
    }
}

function openCheckout() {
    if (cart.length === 0) return;

    let subtotal = 0;
    checkoutSummaryItems.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        return `
            <div class="summary-item" style="display: flex; gap: 0.75rem; margin-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.75rem;">
                <img src="${item.image_url}" style="width: 50px; height: 50px; object-fit: contain; background: var(--bg-tertiary); border-radius: 6px;">
                <div style="flex: 1;">
                    <p style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.25rem;">${item.name} (x${item.quantity})</p>
                    <p style="font-size: 0.8rem; color: var(--text-secondary);">${item.size ? `Size: ${item.size} | ` : ''} ${item.color ? `Color: ${item.color}` : ''}</p>
                </div>
                <div style="font-weight: 700; color: #00f0ff;">$${itemTotal.toFixed(2)}</div>
            </div>
        `;
    }).join("");

    // Apply dummy calculations
    const shipping = subtotal > 150 ? 0 : 10;
    const gst = subtotal * 0.18;
    const total = subtotal + shipping + gst - appliedCouponDiscount;

    document.getElementById("checkout-subtotal-val").textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById("checkout-shipping-val").textContent = shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`;
    document.getElementById("checkout-gst-val").textContent = `$${gst.toFixed(2)}`;

    if (appliedCouponDiscount > 0) {
        document.getElementById("coupon-row").style.display = "flex";
        document.getElementById("checkout-discount-val").textContent = `-$${appliedCouponDiscount.toFixed(2)}`;
    } else {
        document.getElementById("coupon-row").style.display = "none";
    }

    document.getElementById("checkout-final-total").textContent = `$${total.toFixed(2)}`;

    cartDrawer.classList.remove("active");
    checkoutModal.classList.add("active");

    // Initialize Stripe Payment Element
    initStripe();

    // Coupon listener
    const applyCouponBtn = document.getElementById("apply-coupon-btn");
    if (applyCouponBtn) {
        applyCouponBtn.onclick = async () => {
            const code = document.getElementById("coupon-input").value.toUpperCase();
            if (!code) return;
            try {
                const res = await fetch(`${API_BASE}/api/cart/apply-coupon`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code })
                });
                if (!res.ok) {
                    showToast("Invalid or expired Coupon Code", "danger");
                    appliedCouponDiscount = 0;
                    openCheckout();
                    return;
                }
                const data = await res.json();
                appliedCouponDiscount = subtotal * (data.discount_percentage / 100);
                showToast(`Coupon Applied: ${data.discount_percentage}% Off`);
                openCheckout();
            } catch (e) {
                showToast("Error applying coupon", "danger");
            }
        };
    }

    // Address Selection Logic
    const addressSelection = document.getElementById("checkout-address-selection");
    const addressSelect = document.getElementById("checkout-saved-address");
    const manualAddress = document.getElementById("checkout-manual-address");

    if (token && currentUser) {
        addressSelection.classList.remove("hidden");
        // Populate options
        addressSelect.innerHTML = `<option value="new">Enter New Address</option>`;
        if (addresses && addresses.length > 0) {
            addresses.forEach(addr => {
                const opt = document.createElement("option");
                opt.value = addr.id;
                opt.textContent = `${addr.label} - ${addr.address_line}, ${addr.city}`;
                if (addr.is_default) opt.selected = true;
                addressSelect.appendChild(opt);
            });
            // Initially hide manual if a saved address is selected
            if (addressSelect.value !== "new") {
                manualAddress.classList.add("hidden");
                // Remove required attributes from manual fields so form can submit
                document.getElementById("checkout-name").removeAttribute("required");
                document.getElementById("checkout-email").removeAttribute("required");
                document.getElementById("checkout-address").removeAttribute("required");
                document.getElementById("checkout-city").removeAttribute("required");
                document.getElementById("checkout-zip").removeAttribute("required");
            }
        }

        addressSelect.onchange = (e) => {
            if (e.target.value === "new") {
                manualAddress.classList.remove("hidden");
                document.getElementById("checkout-name").setAttribute("required", "true");
                document.getElementById("checkout-email").setAttribute("required", "true");
                document.getElementById("checkout-address").setAttribute("required", "true");
                document.getElementById("checkout-city").setAttribute("required", "true");
                document.getElementById("checkout-zip").setAttribute("required", "true");
            } else {
                manualAddress.classList.add("hidden");
                document.getElementById("checkout-name").removeAttribute("required");
                document.getElementById("checkout-email").removeAttribute("required");
                document.getElementById("checkout-address").removeAttribute("required");
                document.getElementById("checkout-city").removeAttribute("required");
                document.getElementById("checkout-zip").removeAttribute("required");
            }
        };
    } else {
        addressSelection.classList.add("hidden");
        manualAddress.classList.remove("hidden");
    }
}

async function handleCheckoutSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById("submit-order-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Processing Secure Payment...";

    // First, confirm payment with Stripe
    const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
            // We use a dummy return_url since we handle success on page
            return_url: window.location.href,
        },
        redirect: 'if_required' // Prevent redirect to keep it SPA
    });

    if (error) {
        const messageContainer = document.getElementById("payment-message");
        messageContainer.classList.remove("hidden");
        messageContainer.textContent = error.message;
        submitBtn.disabled = false;
        submitBtn.textContent = "Place Secure Order";
        return;
    }

    // Payment Successful, proceed to backend checkout
    try {
        const orderItems = cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity
        }));

        const addressSelect = document.getElementById("checkout-saved-address");
        let custName, custEmail, custAddress;

        if (token && currentUser && addressSelect && addressSelect.value !== "new") {
            const addrId = parseInt(addressSelect.value);
            const addr = addresses.find(a => a.id === addrId);
            if (addr) {
                custName = addr.full_name;
                custEmail = currentUser.email;
                custAddress = `${addr.address_line}, ${addr.city}, ${addr.state} ${addr.zip_code}`;
            }
        }

        if (!custName) {
            custName = document.getElementById("checkout-name").value;
            custEmail = document.getElementById("checkout-email").value;
            custAddress = document.getElementById("checkout-address").value + ", " + document.getElementById("checkout-city").value + " - " + document.getElementById("checkout-zip").value;
        }

        const orderPayload = {
            customer_name: custName,
            email: custEmail,
            address: custAddress,
            items: orderItems,
            coupon_code: appliedCouponDiscount > 0 ? document.getElementById("coupon-input").value.toUpperCase() : null
        };

        const reqHeaders = { "Content-Type": "application/json" };
        if (token) reqHeaders["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE}/api/checkout`, {
            method: "POST",
            headers: reqHeaders,
            body: JSON.stringify(orderPayload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Checkout failed");
        }

        // Order Successful
        cart = [];
        appliedCouponDiscount = 0;
        saveCart();
        updateCartUI();

        checkoutModal.classList.remove("active");

        // Set success modal contents
        successOrderId.textContent = `#${result.order_id}`;
        const finalFrontendTotal = document.getElementById("checkout-final-total").textContent;
        successOrderTotal.textContent = finalFrontendTotal;
        successOrderTime.textContent = new Date().toLocaleString();

        // Est delivery = +3 days
        const d = new Date();
        d.setDate(d.getDate() + 3);
        document.getElementById("success-est-delivery").textContent = d.toDateString();

        successModal.classList.add("active");
        checkoutForm.reset();

        // Refresh orders list if logged in
        if (token) loadOrders();
    } catch (error) {
        console.error(error);
        showToast(error.message || "An error occurred during checkout", "danger");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Place Secure Order";
    }
}

// Event Listeners Registration
function registerEventListeners() {
        // Theme toggle
        themeToggleBtn.addEventListener("click", toggleTheme);

        // Home navigation
        const homeNavBtn = document.getElementById("home-nav-btn");
        if (homeNavBtn) {
            homeNavBtn.addEventListener("click", (e) => {
                e.preventDefault();
                showView("home");
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        }
        const mainLogoBtn = document.getElementById("main-logo-btn");
        if (mainLogoBtn) {
            mainLogoBtn.addEventListener("click", (e) => {
                e.preventDefault();
                showView("home");
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        }

        // Search input — debounce on typing
        let searchTimeout;
        searchInput.addEventListener("input", (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchQuery = e.target.value.trim();
                fetchProducts();
            }, 400);
        });

        // Search — submit button click
        const searchSubmitBtn = document.getElementById("search-submit-btn");
        if (searchSubmitBtn) {
            searchSubmitBtn.addEventListener("click", () => {
                searchQuery = searchInput.value.trim();
                fetchProducts();
                showView("home");
                document.getElementById("shop-section").scrollIntoView({ behavior: "smooth" });
            });
        }
        // Search — Enter key
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                searchQuery = searchInput.value.trim();
                fetchProducts();
                showView("home");
                document.getElementById("shop-section").scrollIntoView({ behavior: "smooth" });
            }
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
            const btn = e.target.closest("button");
            if (!btn || !btn.dataset.id) return;

            const id = parseInt(btn.dataset.id);
            if (btn.classList.contains("view-details-btn")) {
                openProductDetails(id);
            } else if (btn.classList.contains("add-quick-btn")) {
                const product = products.find(p => p.id === id);
                const sizes = product && product.sizes ? product.sizes.split(",") : [];
                const colors = product && product.colors ? product.colors.split(",") : [];
                addToCart(id, sizes[0] || "", colors[0] || "");
            } else if (btn.classList.contains("product-wishlist-btn")) {
                toggleWishlist(id);
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

        // Promo category cards — click to filter shop by category
        document.querySelectorAll(".promo-card[data-category]").forEach(card => {
            card.addEventListener("click", () => {
                const category = card.dataset.category;
                activeCategory = category;
                document.querySelectorAll(".category-tab").forEach(t => {
                    t.classList.toggle("active", t.dataset.category === category);
                });
                fetchProducts();
                const shopSection = document.getElementById("shop-section");
                if (shopSection) shopSection.scrollIntoView({ behavior: "smooth" });
            });
        });
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

    // ============================================
    // AUTH & SESSION MANAGEMENT
    // ============================================

    async function checkAuth() {
        if (!token) {
            updateNavForGuest();
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/api/auth/me`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Invalid token");
            currentUser = await res.json();
            updateNavForUser();
        } catch (e) {
            token = null;
            currentUser = null;
            localStorage.removeItem("sportix_token");
            updateNavForGuest();
        }
    }

    function updateNavForGuest() {
        if (navSigninBtn) navSigninBtn.classList.remove("hidden");
        if (navProfileActive) navProfileActive.classList.add("hidden");
    }

    function updateNavForUser() {
        if (!currentUser) return;
        if (navSigninBtn) navSigninBtn.classList.add("hidden");
        if (navProfileActive) navProfileActive.classList.remove("hidden");
        if (navAvatar) navAvatar.src = currentUser.profile_picture || "assets/images/user_avatar.png";
        if (navUsername) navUsername.textContent = currentUser.full_name.split(" ")[0];
        if (dropdownFullName) dropdownFullName.textContent = currentUser.full_name;
        if (dropdownEmail) dropdownEmail.textContent = currentUser.email;

        const adminPanelBtn = document.getElementById("admin-panel-btn");
        if (adminPanelBtn) {
            if (currentUser.is_admin) adminPanelBtn.classList.remove("hidden");
            else adminPanelBtn.classList.add("hidden");
        }
    }

    function showView(view) {
        // view = "home" | "auth" | "dashboard" | "admin"
        homeView.classList.add("hidden");
        authView.classList.add("hidden");
        dashboardView.classList.add("hidden");
        if (adminView) adminView.classList.add("hidden");

        if (view === "home") homeView.classList.remove("hidden");
        else if (view === "auth") authView.classList.remove("hidden");
        else if (view === "dashboard") dashboardView.classList.remove("hidden");
        else if (view === "admin") {
            if (adminView) adminView.classList.remove("hidden");
            loadAdminDashboard();
        }
    }

    function openAuthView(tab = "login") {
        showView("auth");
        if (tab === "login") {
            loginFormContainer.classList.remove("hidden");
            registerFormContainer.classList.add("hidden");
        } else {
            loginFormContainer.classList.add("hidden");
            registerFormContainer.classList.remove("hidden");
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;
        const btn = e.target.querySelector("button[type=submit]");
        btn.disabled = true;
        btn.textContent = "Signing in...";
        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || "Invalid email or password");
            token = data.token;
            currentUser = data.user;
            localStorage.setItem("sportix_token", token);
            updateNavForUser();
            showToast(`Welcome back, ${currentUser.full_name.split(" ")[0]}! 🎉`);
            showView("home");
            e.target.reset();
        } catch (err) {
            showToast(err.message, "danger");
        } finally {
            btn.disabled = false;
            btn.textContent = "Sign In";
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        const full_name = document.getElementById("register-name").value;
        const email = document.getElementById("register-email").value;
        const phone_number = document.getElementById("register-phone").value || null;
        const password = document.getElementById("register-password").value;
        if (password.length < 6) {
            showToast("Password must be at least 6 characters.", "danger");
            return;
        }
        const btn = e.target.querySelector("button[type=submit]");
        btn.disabled = true;
        btn.textContent = "Creating account...";
        try {
            const res = await fetch(`${API_BASE}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ full_name, email, password, phone_number })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Registration failed");
            token = data.token;
            currentUser = data.user;
            localStorage.setItem("sportix_token", token);
            updateNavForUser();
            showToast(`Account created! Welcome, ${currentUser.full_name.split(" ")[0]}! 🏆`);
            showView("home");
            e.target.reset();
        } catch (err) {
            showToast(err.message, "danger");
        } finally {
            btn.disabled = false;
            btn.textContent = "Create Account";
        }
    }

    function logout() {
        token = null;
        currentUser = null;
        wishlist = [];
        addresses = [];
        localStorage.removeItem("sportix_token");
        updateNavForGuest();
        showView("home");
        if (profileDropdown) profileDropdown.style.display = "none";
        showToast("Logged out successfully. See you again! 👋");
    }

    // ============================================
    // DASHBOARD LOGIC
    // ============================================

    async function openDashboard(tab = "overview") {
        if (!currentUser) { openAuthView("login"); return; }
        showView("dashboard");
        populateDashboardHeader();
        switchDashTab(tab);
        await loadDashboardData();
    }

    function populateDashboardHeader() {
        if (!currentUser) return;
        if (dashboardUserName) dashboardUserName.textContent = currentUser.full_name;
        if (dashboardUserEmail) dashboardUserEmail.textContent = currentUser.email;
        if (dashboardUserSince) dashboardUserSince.textContent = currentUser.member_since;
        if (dashboardAvatar) dashboardAvatar.src = currentUser.profile_picture || "assets/images/user_avatar.png";
        const profileNameInput = document.getElementById("profile-name");
        const profileEmailInput = document.getElementById("profile-email");
        const profilePhoneInput = document.getElementById("profile-phone");
        if (profileNameInput) profileNameInput.value = currentUser.full_name;
        if (profileEmailInput) profileEmailInput.value = currentUser.email;
        if (profilePhoneInput) profilePhoneInput.value = currentUser.phone_number || "";
    }

    async function loadDashboardData() {
        await Promise.all([
            loadWishlist(),
            loadOrders(),
            loadAddresses(),
            loadNotifications(),
            loadPreferences()
        ]);
    }

    function switchDashTab(tab) {
        document.querySelectorAll(".dash-tab-btn").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.tab === tab);
        });
        document.querySelectorAll(".dash-tab-panel").forEach(panel => {
            panel.classList.add("hidden");
        });
        const pane = document.getElementById(`pane-${tab}`);
        if (pane) pane.classList.remove("hidden");

        // Lazy-load data per tab
        if (tab === "security") loadSecuritySessions();
    }

    // ============================================
    // NOTIFICATIONS
    // ============================================

    async function loadNotifications() {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/notifications`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) return;
            const notifs = await res.json();
            renderNotifications(notifs);
        } catch (e) { console.error("Notifications load error:", e); }
    }

    function renderNotifications(notifs) {
        if (!notificationsList) return;
        if (!notifs || notifs.length === 0) {
            notificationsList.innerHTML = `<p class="text-muted">No new notifications.</p>`;
            return;
        }
        notificationsList.innerHTML = notifs.slice(0, 10).map(n => `
        <div class="notification-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}">
            <div class="notif-dot"></div>
            <div class="notif-body">
                <h4 class="notif-title">${n.title}</h4>
                <p class="notif-msg">${n.message}</p>
                <span class="notif-time">${new Date(n.created_at).toLocaleString()}</span>
            </div>
            ${!n.is_read ? `<button class="btn btn-secondary btn-sm mark-read-btn" data-id="${n.id}">Mark Read</button>` : ''}
        </div>
    `).join("");

        notificationsList.querySelectorAll(".mark-read-btn").forEach(btn => {
            btn.addEventListener("click", () => markNotificationRead(btn.dataset.id));
        });
    }

    async function markNotificationRead(id) {
        try {
            await fetch(`${API_BASE}/api/notifications/${id}/read`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            await loadNotifications();
        } catch (e) { }
    }

    // ============================================
    // WISHLIST
    // ============================================

    async function loadWishlist() {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/wishlist`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) return;
            wishlist = await res.json();
            renderWishlist();
            if (statWishlistCount) statWishlistCount.textContent = wishlist.length;
        } catch (e) { console.error("Wishlist error:", e); }
    }

    function renderWishlist() {
        if (!wishlistGrid) return;
        if (!wishlist || wishlist.length === 0) {
            wishlistGrid.innerHTML = `<p class="text-muted">Your wishlist is empty. Explore products and add gear you love!</p>`;
            return;
        }
        wishlistGrid.innerHTML = wishlist.map(item => `
        <div class="wishlist-item card-glass">
            <div class="wishlist-img-wrap">
                <img src="${item.image_url}" alt="${item.name}" />
            </div>
            <div class="wishlist-info">
                <span class="product-category">${item.category}</span>
                <h4>${item.name}</h4>
                <div class="wishlist-price">$${item.price.toFixed(2)}</div>
                <div class="wishlist-actions">
                    <button class="btn btn-primary btn-sm" onclick="addToCartFromWishlist(${item.product_id})">🛒 Add to Cart</button>
                    <button class="btn btn-secondary btn-sm remove-wish-btn" data-id="${item.product_id}">🗑️ Remove</button>
                </div>
            </div>
        </div>
    `).join("");

        wishlistGrid.querySelectorAll(".remove-wish-btn").forEach(btn => {
            btn.addEventListener("click", () => removeFromWishlist(btn.dataset.id));
        });
    }

    async function toggleWishlist(productId) {
        if (!token) { openAuthView("login"); showToast("Please sign in to use wishlist", "danger"); return; }
        const exists = wishlist.find(w => w.product_id === productId);
        try {
            if (exists) {
                await fetch(`${API_BASE}/api/wishlist/${productId}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                wishlist = wishlist.filter(w => w.product_id !== productId);
                showToast("Removed from wishlist");
            } else {
                await fetch(`${API_BASE}/api/wishlist/${productId}`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                await loadWishlist();
                showToast("Added to wishlist ❤️");
            }
            if (statWishlistCount) statWishlistCount.textContent = wishlist.length;
            filterAndRenderProducts(); // Update heart icon states
        } catch (e) { showToast("Wishlist error", "danger"); }
    }

    async function removeFromWishlist(productId) {
        if (!token) return;
        try {
            await fetch(`${API_BASE}/api/wishlist/${productId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            wishlist = wishlist.filter(w => w.product_id !== parseInt(productId));
            renderWishlist();
            if (statWishlistCount) statWishlistCount.textContent = wishlist.length;
            showToast("Removed from wishlist");
            filterAndRenderProducts(); // Update heart icon states
        } catch (e) { showToast("Error removing item", "danger"); }
    }

    function addToCartFromWishlist(productId) {
        const item = wishlist.find(w => w.product_id === productId);
        if (!item) return;
        // Try to find in products list
        const prod = products.find(p => p.id === productId);
        if (prod) {
            addToCart(productId);
        } else {
            // Fetch product then add
            fetch(`${API_BASE}/api/products/${productId}`)
                .then(r => r.json())
                .then(p => {
                    products.push(p);
                    addToCart(productId);
                }).catch(() => showToast("Could not add to cart", "danger"));
        }
    }

    // ============================================
    // ORDERS
    // ============================================

    async function loadOrders() {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/orders`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) return;
            const orders = await res.json();
            renderOrders(orders);
            if (statOrdersCount) statOrdersCount.textContent = orders.length;
        } catch (e) { console.error("Orders error:", e); }
    }

    function renderOrders(orders) {
        if (!ordersListContainer) return;
        if (!orders || orders.length === 0) {
            ordersListContainer.innerHTML = `<p class="text-muted">No orders yet. Place your first order to see it here!</p>`;
            return;
        }
        ordersListContainer.innerHTML = orders.map(order => `
        <div class="order-card card-glass">
            <div class="order-header">
                <div>
                    <h4>Order <span class="accent-text">#${order.order_id}</span></h4>
                    <span class="order-date">${order.created_at}</span>
                </div>
                <div class="order-status-badges">
                    <span class="status-badge status-${order.order_status.toLowerCase().replace(/ /g, '-')}">${order.order_status}</span>
                    <span class="status-badge payment-${order.payment_status.toLowerCase()}">${order.payment_status}</span>
                </div>
            </div>
            <div class="order-items-preview">
                ${order.items.map(i => `
                    <div class="order-item-row">
                        <img src="${i.image_url}" alt="${i.name}" class="order-thumb" />
                        <div>
                            <p class="order-item-name">${i.name}</p>
                            <span class="order-item-qty">x${i.quantity} — $${i.price.toFixed(2)}</span>
                        </div>
                    </div>
                `).join("")}
            </div>
            <div class="order-footer">
                <div class="order-total"><strong>Total: $${order.total_price.toFixed(2)}</strong></div>
                <div class="order-actions">
                    <button class="btn btn-secondary btn-sm" onclick="trackOrder(${order.order_id})">📍 Track</button>
                    <button class="btn btn-secondary btn-sm" onclick="viewInvoice(${order.order_id})">🧾 Invoice</button>
                    ${["Pending", "Processing"].includes(order.order_status) ? `<button class="btn btn-sm" style="background:var(--danger);color:#fff;" onclick="cancelOrder(${order.order_id})">✕ Cancel</button>` : ""}
                </div>
            </div>
        </div>
    `).join("");
    }

    async function trackOrder(orderId) {
        try {
            const res = await fetch(`${API_BASE}/api/orders/${orderId}/track`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            showTrackingModal(data);
        } catch (e) { showToast("Failed to load tracking", "danger"); }
    }

    function showTrackingModal(data) {
        const existing = document.getElementById("tracking-modal");
        if (existing) existing.remove();

        const statusColors = {
            "Pending": "#f59e0b", "Processing": "#3b82f6", "Shipped": "#8b5cf6",
            "Out For Delivery": "#06b6d4", "Delivered": "#10b981", "Cancelled": "#ef4444"
        };

        const modal = document.createElement("div");
        modal.id = "tracking-modal";
        modal.className = "modal-overlay active";
        modal.innerHTML = `
        <div class="modal card-glass" style="max-width:520px;padding:2rem;position:relative;">
            <button onclick="this.closest('.modal-overlay').remove()" class="icon-btn close-modal" style="position:absolute;top:1rem;right:1rem;">✕</button>
            <h3 style="margin-bottom:1.5rem;">Order #${data.order_id} — <span style="color:${statusColors[data.current_status] || 'var(--accent)'};">${data.current_status}</span></h3>
            <div class="tracking-timeline">
                ${data.events.map(ev => `
                    <div class="track-step ${ev.completed ? 'completed' : 'pending'}">
                        <div class="track-dot"></div>
                        <div class="track-info">
                            <strong>${ev.status}</strong>
                            <p>${ev.desc}</p>
                            <span class="track-time">${ev.time}</span>
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
        document.body.appendChild(modal);
        modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
    }

    async function viewInvoice(orderId) {
        try {
            showToast("Generating invoice...", "info");
            const res = await fetch(`${API_BASE}/api/orders/${orderId}/invoice`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to generate invoice");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `invoice_${orderId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) { showToast(e.message, "danger"); }
    }

    async function cancelOrder(orderId) {
        if (!confirm("Are you sure you want to cancel this order? Stock will be restored.")) return;
        try {
            const res = await fetch(`${API_BASE}/api/orders/${orderId}/cancel`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Cancellation failed");
            showToast("Order cancelled successfully. Refund initiated.");
            await loadOrders();
        } catch (e) { showToast(e.message, "danger"); }
    }

    // ============================================
    // ADDRESSES
    // ============================================

    async function loadAddresses() {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/addresses`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) return;
            addresses = await res.json();
            renderAddresses();
            const def = addresses.find(a => a.is_default);
            if (statDefaultAddress) {
                statDefaultAddress.textContent = def
                    ? `${def.label}: ${def.address_line}, ${def.city}`
                    : "No default address set.";
            }
        } catch (e) { console.error("Address error:", e); }
    }

    function renderAddresses() {
        if (!addressesGrid) return;
        if (!addresses || addresses.length === 0) {
            addressesGrid.innerHTML = `<p class="text-muted">No addresses saved. Add your first address to speed up checkout!</p>`;
            return;
        }
        addressesGrid.innerHTML = addresses.map(addr => `
        <div class="address-card card-glass ${addr.is_default ? 'default-addr' : ''}">
            <div class="addr-header">
                <span class="addr-label">${addr.label}</span>
                ${addr.is_default ? '<span class="addr-default-badge">Default</span>' : ''}
            </div>
            <p class="addr-name"><strong>${addr.full_name}</strong></p>
            <p class="addr-line">${addr.address_line}</p>
            <p class="addr-line">${addr.city}, ${addr.state} ${addr.zip_code}</p>
            <p class="addr-line">${addr.country}</p>
            <div class="addr-actions">
                ${!addr.is_default ? `<button class="btn btn-secondary btn-sm" onclick="setDefaultAddress(${addr.id})">Set Default</button>` : ""}
                <button class="btn btn-secondary btn-sm" onclick="editAddress(${addr.id})">✏️ Edit</button>
                <button class="btn btn-sm" style="background:var(--danger);color:#fff;" onclick="deleteAddress(${addr.id})">🗑️ Delete</button>
            </div>
        </div>
    `).join("");
    }

    function showAddressForm(editing = false) {
        if (!addressFormModal) return;
        addressFormModal.classList.remove("hidden");
        if (addressFormTitle) addressFormTitle.textContent = editing ? "Edit Address" : "Add New Address";
        if (!editing) {
            if (addressForm) addressForm.reset();
            if (addressIdInput) addressIdInput.value = "";
        }
        addressFormModal.scrollIntoView({ behavior: "smooth" });
    }

    function editAddress(id) {
        const addr = addresses.find(a => a.id === id);
        if (!addr) return;
        addressIdInput.value = addr.id;
        addressLabelInput.value = addr.label;
        addressFullnameInput.value = addr.full_name;
        addressLineInput.value = addr.address_line;
        addressCityInput.value = addr.city;
        addressStateInput.value = addr.state;
        addressZipInput.value = addr.zip_code;
        addressCountryInput.value = addr.country;
        addressDefaultInput.checked = addr.is_default;
        showAddressForm(true);
    }

    async function handleAddressSubmit(e) {
        e.preventDefault();
        const id = addressIdInput.value;
        const payload = {
            label: addressLabelInput.value,
            full_name: addressFullnameInput.value,
            address_line: addressLineInput.value,
            city: addressCityInput.value,
            state: addressStateInput.value,
            zip_code: addressZipInput.value,
            country: addressCountryInput.value || "United States",
            is_default: addressDefaultInput.checked
        };
        const isEdit = !!id;
        const url = isEdit ? `${API_BASE}/api/addresses/${id}` : `${API_BASE}/api/addresses`;
        const method = isEdit ? "PUT" : "POST";
        try {
            const res = await fetch(url, {
                method,
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Failed to save address"); }
            showToast(isEdit ? "Address updated!" : "Address added successfully!");
            addressFormModal.classList.add("hidden");
            await loadAddresses();
        } catch (err) { showToast(err.message, "danger"); }
    }

    async function deleteAddress(id) {
        if (!confirm("Delete this address?")) return;
        try {
            await fetch(`${API_BASE}/api/addresses/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            showToast("Address deleted");
            await loadAddresses();
        } catch (e) { showToast("Error deleting address", "danger"); }
    }

    async function setDefaultAddress(id) {
        try {
            await fetch(`${API_BASE}/api/addresses/${id}/default`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            showToast("Default address updated!");
            await loadAddresses();
        } catch (e) { showToast("Error setting default", "danger"); }
    }

    // ============================================
    // PROFILE UPDATE & PASSWORD CHANGE
    // ============================================

    async function handleProfileUpdate(e) {
        e.preventDefault();
        const payload = {
            full_name: document.getElementById("profile-name").value,
            email: document.getElementById("profile-email").value,
            phone_number: document.getElementById("profile-phone").value || null
        };
        const btn = e.target.querySelector("button[type=submit]");
        btn.disabled = true; btn.textContent = "Saving...";
        try {
            const res = await fetch(`${API_BASE}/api/auth/profile`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Update failed");
            currentUser = data.user;
            updateNavForUser();
            populateDashboardHeader();
            showToast("Profile updated successfully! ✅");
        } catch (err) { showToast(err.message, "danger"); }
        finally { btn.disabled = false; btn.textContent = "Save Profile Details"; }
    }

    async function handleChangePassword(e) {
        e.preventDefault();
        const old_password = document.getElementById("old-password").value;
        const new_password = document.getElementById("new-password").value;
        if (new_password.length < 6) { showToast("New password must be at least 6 characters.", "danger"); return; }
        const btn = e.target.querySelector("button[type=submit]");
        btn.disabled = true; btn.textContent = "Changing...";
        try {
            const res = await fetch(`${API_BASE}/api/auth/change-password`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ old_password, new_password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Password change failed");
            showToast("Password changed successfully! 🔒");
            e.target.reset();
        } catch (err) { showToast(err.message, "danger"); }
        finally { btn.disabled = false; btn.textContent = "Change Password"; }
    }

    // ============================================
    // SECURITY SESSIONS
    // ============================================

    async function loadSecuritySessions() {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/auth/sessions`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) return;
            const data = await res.json();
            renderSessions(data);
        } catch (e) { }
    }

    function renderSessions(data) {
        if (activeSessionsList && data.active_sessions) {
            activeSessionsList.innerHTML = data.active_sessions.map(s => `
            <div class="session-item card-glass" style="padding:0.85rem 1rem;border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <p style="font-weight:600;margin:0;">${s.device}</p>
                    <p style="color:var(--text-muted);font-size:0.82rem;margin:0.2rem 0 0;">${s.ip} · ${s.location} · ${s.last_active}</p>
                </div>
                ${s.id === 1 ? '<span style="color:var(--accent);font-size:0.8rem;font-weight:600;">Current</span>' : ''}
            </div>
        `).join("");
        }
        if (securityActivityLog && data.login_activity) {
            securityActivityLog.innerHTML = data.login_activity.map(a => `
            <div style="padding:0.6rem 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <span style="font-size:0.9rem;">${a.device}</span>
                    <span style="font-size:0.8rem;color:var(--text-muted);margin-left:0.75rem;">${a.date}</span>
                </div>
                <span style="color:${a.status === 'Success' ? 'var(--success)' : 'var(--danger)'};font-size:0.85rem;font-weight:600;">${a.status}</span>
            </div>
        `).join("");
        }
    }

    // ============================================
    // PREFERENCES
    // ============================================

    async function loadPreferences() {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/preferences`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) return;
            const pref = await res.json();
            if (prefThemeCheckbox) prefThemeCheckbox.checked = (pref.theme === "dark");
            if (prefNotifyOrders) prefNotifyOrders.checked = pref.notify_orders;
            if (prefNotifyOffers) prefNotifyOffers.checked = pref.notify_offers;
            // Apply theme
            document.documentElement.setAttribute("data-theme", pref.theme);
            localStorage.setItem("sportix_theme", pref.theme);
        } catch (e) { }
    }

    async function savePreferences() {
        if (!token) return;
        const payload = {
            theme: prefThemeCheckbox.checked ? "dark" : "light",
            notify_orders: prefNotifyOrders ? prefNotifyOrders.checked : true,
            notify_offers: prefNotifyOffers ? prefNotifyOffers.checked : false
        };
        try {
            await fetch(`${API_BASE}/api/preferences`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            showToast("Preferences saved!");
        } catch (e) { showToast("Failed to save preferences", "danger"); }
    }

    // ============================================
    // PAYMENTS (Simulated, localStorage)
    // ============================================

    let savedCards = JSON.parse(localStorage.getItem("sportix_cards") || "[]");
    let savedUpis = JSON.parse(localStorage.getItem("sportix_upis") || "[]");

    function renderPayments() {
        if (savedCardsList) {
            savedCardsList.innerHTML = savedCards.length === 0
                ? `<p class="text-muted">No saved cards.</p>`
                : savedCards.map((c, i) => `
            <div class="payment-card-item card-glass">
                <div class="payment-card-visual">
                    <span>💳</span>
                    <div>
                        <strong>${c.holder}</strong>
                        <p>•••• •••• •••• ${c.last4} &nbsp;|&nbsp; Exp: ${c.exp}</p>
                    </div>
                </div>
                <button class="btn btn-sm" style="background:var(--danger);color:#fff;" onclick="removeCard(${i})">Remove</button>
            </div>`).join("");
        }
        if (savedUpiList) {
            savedUpiList.innerHTML = savedUpis.length === 0
                ? `<p class="text-muted">No UPI accounts saved.</p>`
                : savedUpis.map((u, i) => `
            <div class="payment-card-item card-glass">
                <div class="payment-card-visual">
                    <span>📱</span>
                    <div>
                        <strong>${u.name}</strong>
                        <p>${u.vpa}</p>
                    </div>
                </div>
                <button class="btn btn-sm" style="background:var(--danger);color:#fff;" onclick="removeUpi(${i})">Remove</button>
            </div>`).join("");
        }
    }

    function removeCard(i) {
        savedCards.splice(i, 1);
        localStorage.setItem("sportix_cards", JSON.stringify(savedCards));
        renderPayments();
        showToast("Card removed");
    }
    function removeUpi(i) {
        savedUpis.splice(i, 1);
        localStorage.setItem("sportix_upis", JSON.stringify(savedUpis));
        renderPayments();
        showToast("UPI account removed");
    }

    function handleCardFormSubmit(e) {
        e.preventDefault();
        const num = document.getElementById("card-num").value.replace(/\s/g, "");
        if (num.length < 8) { showToast("Invalid card number", "danger"); return; }
        savedCards.push({
            holder: document.getElementById("card-holder").value,
            last4: num.slice(-4),
            exp: document.getElementById("card-exp").value
        });
        localStorage.setItem("sportix_cards", JSON.stringify(savedCards));
        cardFormModal.classList.add("hidden");
        cardForm.reset();
        renderPayments();
        showToast("Card saved! (Simulated)");
    }

    function handleUpiFormSubmit(e) {
        e.preventDefault();
        savedUpis.push({
            vpa: document.getElementById("upi-vpa").value,
            name: document.getElementById("upi-name").value
        });
        localStorage.setItem("sportix_upis", JSON.stringify(savedUpis));
        upiFormModal.classList.add("hidden");
        upiForm.reset();
        renderPayments();
        showToast("UPI account saved! (Simulated)");
    }

    // ============================================
    // REGISTER ALL AUTH/DASHBOARD EVENT LISTENERS
    // ============================================

    function registerAuthListeners() {
        // Nav sign-in button
        if (navSigninBtn) navSigninBtn.addEventListener("click", () => openAuthView("login"));

        // Go to register / go to login links
        if (goToRegisterBtn) goToRegisterBtn.addEventListener("click", e => { e.preventDefault(); openAuthView("register"); });
        if (goToLoginBtn) goToLoginBtn.addEventListener("click", e => { e.preventDefault(); openAuthView("login"); });

        // Login/Register form submissions
        if (loginForm) loginForm.addEventListener("submit", handleLogin);
        if (registerForm) registerForm.addEventListener("submit", handleRegister);

        // Logout
        if (logoutBtn) logoutBtn.addEventListener("click", logout);

        // Profile dropdown toggle
        if (navProfileActive) {
            navProfileActive.addEventListener("click", e => {
                e.stopPropagation();
                if (profileDropdown) {
                    profileDropdown.classList.toggle("open");
                }
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener("click", () => {
            if (profileDropdown) profileDropdown.classList.remove("open");
        });

        // Dropdown items -> open dashboard at tab
        document.querySelectorAll(".dropdown-item[data-tab]").forEach(btn => {
            btn.addEventListener("click", () => {
                if (profileDropdown) profileDropdown.classList.remove("open");
                openDashboard(btn.dataset.tab);
            });
        });

        // Dashboard sidebar tab buttons
        document.querySelectorAll(".dash-tab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                switchDashTab(btn.dataset.tab);
                if (btn.dataset.tab === "payments") renderPayments();
            });
        });

        // pane-jump buttons (overview -> other tabs)
        document.querySelectorAll(".pane-jump-btn").forEach(btn => {
            btn.addEventListener("click", () => switchDashTab(btn.dataset.tab));
        });

        // Back to shop from dashboard
        const backToShopBtns = document.querySelectorAll(".back-to-shop");
        backToShopBtns.forEach(btn => btn.addEventListener("click", () => showView("home")));

        // Logo click → home
        const logoEl = document.querySelector(".logo");
        if (logoEl) {
            logoEl.addEventListener("click", e => {
                e.preventDefault();
                showView("home");
            });
        }

        // Profile update form
        const profileUpdateForm = document.getElementById("profile-update-form");
        if (profileUpdateForm) profileUpdateForm.addEventListener("submit", handleProfileUpdate);

        // Change password form
        if (changePasswordForm) changePasswordForm.addEventListener("submit", handleChangePassword);

        // Address form
        if (addAddressBtn) addAddressBtn.addEventListener("click", () => showAddressForm(false));
        if (cancelAddressBtn) cancelAddressBtn.addEventListener("click", () => addressFormModal.classList.add("hidden"));
        if (addressForm) addressForm.addEventListener("submit", handleAddressSubmit);

        // Payment forms
        if (addCardBtn) addCardBtn.addEventListener("click", () => { cardFormModal.classList.remove("hidden"); upiFormModal.classList.add("hidden"); });
        if (addUpiBtn) addUpiBtn.addEventListener("click", () => { upiFormModal.classList.remove("hidden"); cardFormModal.classList.add("hidden"); });
        if (cancelCardBtn) cancelCardBtn.addEventListener("click", () => cardFormModal.classList.add("hidden"));
        if (cancelUpiBtn) cancelUpiBtn.addEventListener("click", () => upiFormModal.classList.add("hidden"));
        if (cardForm) cardForm.addEventListener("submit", handleCardFormSubmit);
        if (upiForm) upiForm.addEventListener("submit", handleUpiFormSubmit);

        // Preferences toggles → auto-save on change
        if (prefThemeCheckbox) {
            prefThemeCheckbox.addEventListener("change", () => {
                const newTheme = prefThemeCheckbox.checked ? "dark" : "light";
                document.documentElement.setAttribute("data-theme", newTheme);
                localStorage.setItem("sportix_theme", newTheme);
                if (token) savePreferences();
            });
        }
        if (prefNotifyOrders) prefNotifyOrders.addEventListener("change", () => { if (token) savePreferences(); });
        if (prefNotifyOffers) prefNotifyOffers.addEventListener("change", () => { if (token) savePreferences(); });
    }

    // ============================================
    // PROMO SECTION LOGIC
    // ============================================

    function initPromoSection() {
        // 1. Carousel Logic
        const carouselInner = document.getElementById('carousel-inner');
        const indicators = document.querySelectorAll('.carousel-indicators .indicator');
        if (carouselInner && indicators.length > 0) {
            let currentSlide = 0;
            const totalSlides = indicators.length;
            let slideInterval;

            function goToSlide(index) {
                currentSlide = index;
                carouselInner.style.transform = `translateX(-${currentSlide * 100}%)`;
                indicators.forEach((ind, i) => {
                    ind.style.background = i === currentSlide ? 'var(--accent)' : 'var(--text-secondary)';
                    ind.style.transform = i === currentSlide ? 'scale(1.2)' : 'scale(1)';
                });
            }

            function nextSlide() {
                goToSlide((currentSlide + 1) % totalSlides);
            }

            function startSlideShow() {
                slideInterval = setInterval(nextSlide, 5000);
            }

            function stopSlideShow() {
                clearInterval(slideInterval);
            }

            indicators.forEach((ind, i) => {
                ind.addEventListener('click', () => {
                    stopSlideShow();
                    goToSlide(i);
                    startSlideShow();
                });
            });

            // Initialize active state colors
            goToSlide(0);
            startSlideShow();

            // Pause on hover
            const carousel = document.getElementById('promo-carousel');
            if (carousel) {
                carousel.addEventListener('mouseenter', stopSlideShow);
                carousel.addEventListener('mouseleave', startSlideShow);
            }
        }

        // 2. Countdown Timer Logic
        const hoursEl = document.getElementById('cd-hours');
        const minsEl = document.getElementById('cd-mins');
        const secsEl = document.getElementById('cd-secs');

        if (hoursEl && minsEl && secsEl) {
            // Set a target time (e.g., 5 hours from now) for demo purposes
            let targetTime = new Date().getTime() + (5 * 60 * 60 * 1000) + (23 * 60 * 1000) + (15 * 1000); // 5h 23m 15s

            function updateCountdown() {
                const now = new Date().getTime();
                const distance = targetTime - now;

                if (distance < 0) {
                    // Reset timer for demo loop
                    targetTime = new Date().getTime() + (5 * 60 * 60 * 1000) + (23 * 60 * 1000) + (15 * 1000);
                    return;
                }

                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                hoursEl.innerText = hours.toString().padStart(2, '0');
                minsEl.innerText = minutes.toString().padStart(2, '0');
                secsEl.innerText = seconds.toString().padStart(2, '0');
            }

            updateCountdown();
            setInterval(updateCountdown, 1000);
        }
    }

    // Initialize promo section on load — handled in main DOMContentLoaded

    // ==========================================
    // ADMIN DASHBOARD LOGIC
    // ==========================================

    const adminTabBtns = document.querySelectorAll(".admin-tab-btn");
    const adminTabPanels = document.querySelectorAll(".admin-tab-panel");

    adminTabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            adminTabBtns.forEach(b => b.classList.remove("active"));
            adminTabPanels.forEach(p => p.classList.add("hidden"));
            btn.classList.add("active");
            const target = btn.dataset.tab;
            document.getElementById("pane-" + target).classList.remove("hidden");

            if (target === "admin-overview") loadAdminDashboard();
            if (target === "admin-products") loadAdminProducts();
            if (target === "admin-orders") loadAdminOrders();
            if (target === "admin-users") loadAdminUsers();
            if (target === "admin-reviews") loadAdminReviews();
        });
    });

    let adminChartInstance = null;

    async function loadAdminDashboard() {
        try {
            const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to load metrics");
            const data = await res.json();

            document.getElementById("admin-stat-products").textContent = data.metrics.total_products;
            document.getElementById("admin-stat-orders").textContent = data.metrics.total_orders;
            document.getElementById("admin-stat-users").textContent = data.metrics.total_users;
            document.getElementById("admin-stat-revenue").textContent = "$" + data.metrics.total_revenue.toFixed(2);

            // Render Chart
            const ctx = document.getElementById("admin-revenue-chart");
            if (ctx) {
                if (adminChartInstance) adminChartInstance.destroy();

                // Mock data for chart, ideally would come from API
                const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
                const revenueData = [1200, 1900, 3000, 5000, 2000, 3000, data.metrics.total_revenue];

                adminChartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Revenue ($)',
                            data: revenueData,
                            borderColor: '#00ffaa',
                            backgroundColor: 'rgba(0, 255, 170, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                                ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                            },
                            x: {
                                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                                ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                            }
                        },
                        plugins: {
                            legend: { labels: { color: 'rgba(255, 255, 255, 0.7)' } }
                        }
                    }
                });
            }

            const recentBox = document.getElementById("admin-recent-activities");
            if (data.recent_activities.length === 0) {
                recentBox.innerHTML = "<p>No recent activities.</p>";
            } else {
                recentBox.innerHTML = data.recent_activities.map(act => `
                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; display: flex; justify-content: space-between;">
                    <span>${act.message}</span>
                    <span style="color: var(--text-muted); font-size: 0.9rem;">${act.time}</span>
                </div>
            `).join("");
            }
        } catch (err) {
            console.error(err);
            showToast("Error loading dashboard", "danger");
        }
    }

    async function loadAdminProducts() {
        try {
            const res = await fetch(`${API_BASE}/api/products`);
            const data = await res.json();

            const list = document.getElementById("admin-products-list");
            list.innerHTML = `
            <table style="width:100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="border-bottom: 1px solid var(--border);">
                        <th style="padding: 1rem;">ID</th>
                        <th style="padding: 1rem;">Name</th>
                        <th style="padding: 1rem;">Price</th>
                        <th style="padding: 1rem;">Stock</th>
                        <th style="padding: 1rem;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(p => `
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 1rem;">${p.id}</td>
                            <td style="padding: 1rem;">${p.name}</td>
                            <td style="padding: 1rem;">$${p.price.toFixed(2)}</td>
                            <td style="padding: 1rem;">${p.stock}</td>
                            <td style="padding: 1rem; display:flex; gap:0.5rem;">
                                <button class="btn btn-secondary btn-sm" onclick='editAdminProduct(${JSON.stringify(p).replace(/'/g, "&#39;")})'>Edit</button>
                                <button class="btn btn-secondary btn-sm" style="color: var(--danger); border-color: var(--danger);" onclick="deleteAdminProduct(${p.id})">Delete</button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;
        } catch (err) {
            showToast("Error loading products", "danger");
        }
    }

    function showAdminProductForm() {
        document.getElementById("admin-product-id").value = "";
        document.getElementById("admin-product-name").value = "";
        document.getElementById("admin-product-desc").value = "";
        document.getElementById("admin-product-price").value = "";
        document.getElementById("admin-product-stock").value = "";
        document.getElementById("admin-product-category").value = "";
        document.getElementById("admin-product-image").value = "";
        document.getElementById("admin-product-sizes").value = "";
        document.getElementById("admin-product-colors").value = "";
        document.getElementById("admin-product-form-title").textContent = "Add Product";
        document.getElementById("admin-product-modal").classList.remove("hidden");
    }

    function editAdminProduct(p) {
        document.getElementById("admin-product-id").value = p.id;
        document.getElementById("admin-product-name").value = p.name;
        document.getElementById("admin-product-desc").value = p.description || "";
        document.getElementById("admin-product-price").value = p.price;
        document.getElementById("admin-product-stock").value = p.stock;
        document.getElementById("admin-product-category").value = p.category;
        document.getElementById("admin-product-image").value = p.image_url || "";
        document.getElementById("admin-product-sizes").value = p.sizes || "";
        document.getElementById("admin-product-colors").value = p.colors || "";
        document.getElementById("admin-product-form-title").textContent = "Edit Product";
        document.getElementById("admin-product-modal").classList.remove("hidden");
    }

    document.getElementById("admin-product-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("admin-product-id").value;
        const payload = {
            name: document.getElementById("admin-product-name").value,
            description: document.getElementById("admin-product-desc").value,
            price: parseFloat(document.getElementById("admin-product-price").value),
            stock: parseInt(document.getElementById("admin-product-stock").value),
            category: document.getElementById("admin-product-category").value,
            image_url: document.getElementById("admin-product-image").value,
            sizes: document.getElementById("admin-product-sizes").value,
            colors: document.getElementById("admin-product-colors").value
        };

        try {
            let res;
            if (id) {
                res = await fetch(`${API_BASE}/api/admin/products/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch(`${API_BASE}/api/admin/products`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });
            }
            if (!res.ok) throw new Error("Operation failed");
            showToast(`Product ${id ? 'updated' : 'added'} successfully`);
            document.getElementById("admin-product-modal").classList.add("hidden");
            loadAdminProducts();
            fetchProducts(); // Refresh main store
        } catch (err) {
            showToast(err.message, "danger");
        }
    });

    async function deleteAdminProduct(id) {
        if (!confirm("Are you sure you want to delete this product?")) return;
        try {
            const res = await fetch(`${API_BASE}/api/admin/products/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to delete");
            showToast("Product deleted");
            loadAdminProducts();
            fetchProducts();
        } catch (err) {
            showToast(err.message, "danger");
        }
    }

    async function loadAdminOrders() {
        try {
            const res = await fetch(`${API_BASE}/api/admin/orders`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to load orders");
            const data = await res.json();

            const list = document.getElementById("admin-orders-list");
            list.innerHTML = `
            <table style="width:100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="border-bottom: 1px solid var(--border);">
                        <th style="padding: 1rem;">ID</th>
                        <th style="padding: 1rem;">Customer</th>
                        <th style="padding: 1rem;">Total</th>
                        <th style="padding: 1rem;">Date</th>
                        <th style="padding: 1rem;">Status</th>
                        <th style="padding: 1rem;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(o => `
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 1rem;">${o.order_id}</td>
                            <td style="padding: 1rem;">${o.customer_name}</td>
                            <td style="padding: 1rem;">$${o.total_price.toFixed(2)}</td>
                            <td style="padding: 1rem;">${o.created_at}</td>
                            <td style="padding: 1rem;">
                                <select onchange="updateAdminOrderStatus(${o.order_id}, this.value)" style="background:var(--bg-tertiary); border:1px solid var(--border); color:var(--text-primary); padding:0.3rem;">
                                    <option value="Pending" ${o.order_status === 'Pending' ? 'selected' : ''}>Pending</option>
                                    <option value="Processing" ${o.order_status === 'Processing' ? 'selected' : ''}>Processing</option>
                                    <option value="Shipped" ${o.order_status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                                    <option value="Out For Delivery" ${o.order_status === 'Out For Delivery' ? 'selected' : ''}>Out For Delivery</option>
                                    <option value="Delivered" ${o.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                                </select>
                            </td>
                            <td style="padding: 1rem;">
                                <button class="btn btn-secondary btn-sm" onclick="showToast('Feature coming soon')">View</button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;
        } catch (err) {
            showToast("Error loading orders", "danger");
        }
    }

    async function updateAdminOrderStatus(id, status) {
        try {
            const res = await fetch(`${API_BASE}/api/admin/orders/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ order_status: status })
            });
            if (!res.ok) throw new Error("Failed to update status");
            showToast(`Order #${id} status updated to ${status}`);
        } catch (err) {
            showToast(err.message, "danger");
        }
    }

    async function loadAdminUsers() {
        try {
            const res = await fetch(`${API_BASE}/api/admin/users`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to load users");
            const data = await res.json();

            const list = document.getElementById("admin-users-list");
            list.innerHTML = `
            <table style="width:100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="border-bottom: 1px solid var(--border);">
                        <th style="padding: 1rem;">ID</th>
                        <th style="padding: 1rem;">Name</th>
                        <th style="padding: 1rem;">Email</th>
                        <th style="padding: 1rem;">Role</th>
                        <th style="padding: 1rem;">Joined</th>
                        <th style="padding: 1rem;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(u => `
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 1rem;">${u.id}</td>
                            <td style="padding: 1rem;">${u.full_name}</td>
                            <td style="padding: 1rem;">${u.email}</td>
                            <td style="padding: 1rem;">${u.is_admin ? 'Admin' : 'User'}</td>
                            <td style="padding: 1rem;">${u.member_since}</td>
                            <td style="padding: 1rem;">
                                ${!u.is_admin ? `<button class="btn btn-secondary btn-sm" style="color: var(--danger); border-color: var(--danger);" onclick="deleteAdminUser(${u.id})">Delete</button>` : ''}
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;
        } catch (err) {
            showToast("Error loading users", "danger");
        }
    }

    async function deleteAdminUser(id) {
        if (!confirm("Delete this user permanently?")) return;
        try {
            const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to delete user");
            showToast("User deleted");
            loadAdminUsers();
        } catch (err) {
            showToast(err.message, "danger");
        }
    }

    async function loadAdminReviews() {
        try {
            const res = await fetch(`${API_BASE}/api/admin/reviews`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to load reviews");
            const data = await res.json();

            const list = document.getElementById("admin-reviews-list");
            list.innerHTML = `
            <table style="width:100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="border-bottom: 1px solid var(--border);">
                        <th style="padding: 1rem;">Product</th>
                        <th style="padding: 1rem;">User</th>
                        <th style="padding: 1rem;">Rating</th>
                        <th style="padding: 1rem;">Comment</th>
                        <th style="padding: 1rem;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(r => `
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 1rem;">${r.product_name}</td>
                            <td style="padding: 1rem;">${r.user_name}</td>
                            <td style="padding: 1rem; color: #fbbf24;">${'★'.repeat(r.rating)}</td>
                            <td style="padding: 1rem; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.comment || ''}</td>
                            <td style="padding: 1rem;">
                                <button class="btn btn-secondary btn-sm" style="color: var(--danger); border-color: var(--danger);" onclick="deleteAdminReview(${r.id})">Delete</button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;
        } catch (err) {
            showToast("Error loading reviews", "danger");
        }
    }

    async function deleteAdminReview(id) {
        if (!confirm("Delete this review permanently?")) return;
        try {
            const res = await fetch(`${API_BASE}/api/admin/reviews/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to delete review");
            showToast("Review deleted");
            loadAdminReviews();
        } catch (err) {
            showToast(err.message, "danger");
        }
    }
