/**
 * SaDonTech Hub | app.js
 * Features:
 *  - Product catalogue with add-to-cart
 *  - Cart drawer (quantity adjust, remove)
 *  - Checkout modal with form validation
 *  - Paystack payment integration
 *  - Toast notifications
 *  - Scroll-to-top button
 *  - Sticky navbar shadow on scroll
 *  - Mobile hamburger menu
 */

/* ============================================================
   CONFIGURATION — update these values before going live
   ============================================================ */
const CONFIG = {
  /**
   * Your Paystack PUBLIC key (starts with pk_test_ or pk_live_).
   * Get it from: https://dashboard.paystack.com/#/settings/developer
   * IMPORTANT: Never use your secret key here.
   */
  PAYSTACK_PUBLIC_KEY: "pk_test_0fa8724e837e1fdb5dd3459a344b415e879756ad",

  /**
   * Currency code. GHS = Ghanaian Cedis, NGN = Nigerian Naira, etc.
   * See full list: https://paystack.com/docs/payments/multicurrency/
   */
  CURRENCY: "GHS",

  /**
   * Currency symbol shown in the UI.
   */
  CURRENCY_SYMBOL: "GH₵",

  /**
   * Store name shown in Paystack popup.
   */
  STORE_NAME: "SaDonTech Hub",
};

/* ============================================================
   PRODUCT CATALOGUE
   ============================================================ */
const PRODUCTS = [
  {
    id: 1,
    name: "Hp Notebook",
    price: 3500,
    quantity: 12,
    image: "images/Hp_Notebook.jpg",
    description: "Specs RAM 16GB, ROM 256GB SSD, i5 2.5 MHz, 8th gen, Window 11 OS",
    category: "Computers",
    subcategory: "Laptop computers",
  },
  {
    id: 2,
    name: "Leather Handbag",
    price: 200,
    quantity: 13,
    image: "images/Leather_Handbag.jpg",
    description: "Quality leather material – strong and lasting, for business purposes",
    category: "Fashion",
    subcategory: "Bags",
  },
  {
    id: 3,
    name: "PS 5",
    price: 4800,
    quantity: 7,
    image: "images/product3.png",
    description: "PlayStation 5 – next-gen gaming console, affordable",
    category: "Electronics",
    subcategory: "Others",
  },
  {
    id: 4,
    name: "MacBook Air",
    price: 4500,
    quantity: 3,
    image: "images/product4.png",
    description: "Apple MacBook Air – ultra-thin, ultra-fast",
    category: "Computers",
    subcategory: "Laptop computers",
  },
  {
    id: 5,
    name: "Apple Watch",
    price: 300,
    quantity: 11,
    image: "images/product5.png",
    description: "Apple Watch – health & fitness tracker",
    category: "Electronics",
    subcategory: "Others",
  },
  {
    id: 6,
    name: "Air Pods",
    price: 200,
    quantity: 6,
    image: "images/product6.png",
    description: "Apple AirPods – wireless audio freedom",
    category: "Accessories",
    subcategory: "Airpods",
  },
   {
    id: 7,
    name: "Samsung TV",
    price: 3500,
    quantity: 8,
    image: "images/product1.png",
    description: "65-inch 4K Smart TV with HDR",
    category: "Electronics",
    subcategory: "Televisions",
  },
  {
    id: 8,
    name: "Pixel 4a",
    price: 2200,
    quantity: 2,
    image: "images/product2.png",
    description: "Google Pixel 4a – crisp camera, pure Android",
    category: "Electronics",
    subcategory: "Others",
  },
  {
    id: 9,
    name: "Laptop Stand",
    price: 180,
    quantity: 15,
    image: "images/Laptop_Stand.jpg",
    description: "2 in 1, Ten speed height adjustment stand",
    category: "Accessories",
    subcategory: "Others",
  },
];

const CATEGORY_DATA = [
  { name: "Computers", subcategories: ["Desktops", "Laptop computers"] },
  { name: "Electronics", subcategories: ["Televisions", "Speaks", "Others"] },
  { name: "Accessories", subcategories: ["Headsets", "Airpods", "Storages", "Mouse", "Keyboards", "Cases", "Others"] },
  { name: "Stationeries", subcategories: ["Paper", "Wirters", "Stickys", "Measurements", "Others"] },
  { name: "Fashion", subcategories: ["Bags", "Men Clothes", "Women Clothes", "T-shirts", "FootWears", "Others"] },
  { name: "Services", subcategories: [] },
];

const SALES_TRACK_KEY = "sdon_sales_data";
const RECENTLY_VIEWED_KEY = "sdon_recently_viewed";
const NEWSLETTER_KEY = "sdon_newsletter_emails";

const REVIEWS_KEY = "sdon_customer_reviews";
const ORDER_PROGRESS_DATA = {
  currentStep: 3,
  steps: ["Order placed", "Packed", "In transit", "Out for delivery", "Delivered"],
  note: "Estimated delivery: Tomorrow by 4:00 PM",
};
const SELLER_DASHBOARD_DATA = [
  { title: "Orders today", value: "12" },
  { title: "Pending chats", value: "5" },
  { title: "Items in stock", value: "48" },
];
const FEATURED_DEALS = [
  { id: 1, badge: "Hot deal", title: "Hp Notebook", text: "Powerful everyday laptop with 16GB RAM and a fast SSD.", savings: "Save 10%" },
  { id: 3, badge: "Limited stock", title: "PS 5", text: "Next-gen console for immersive gaming at a competitive price.", savings: "Free delivery" },
  { id: 9, badge: "New arrival", title: "Laptop Stand", text: "Ergonomic and flexible for a better working setup.", savings: "Bundle offer" },
];
const INITIAL_REVIEWS = [
  {
    name: "Ama K.",
    title: "Fast delivery",
    rating: 5,
    quote: "The checkout was easy and the support team replied quickly. I received my device in good condition.",
  },
  {
    name: "Kwame T.",
    title: "Great product quality",
    rating: 5,
    quote: "I bought a laptop stand and it arrived exactly as described. Very easy to shop from here.",
  },
  {
    name: "Nadia S.",
    title: "Helpful seller support",
    rating: 5,
    quote: "I chatted with the seller before ordering and that helped me choose the right accessory confidently.",
  },
];

/* ============================================================
   STATE
   ============================================================ */
let cart = []; // { ...product, qty }
let wishlist = [];
let recentlyViewed = [];
let reviews = [];
let currentProductFilter = { category: null, subcategory: null };
let currentSearchQuery = "";
let currentSortBy = "featured";
let aboutPreviewIndex = 0;
let aboutPreviewTimer = null;

/* ============================================================
   DOM REFERENCES
   ============================================================ */
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const navbar       = $("#navbar");
const cartBtn      = $("#cartBtn");
const cartClose    = $("#cartClose");
const cartDrawer   = $("#cartDrawer");
const cartOverlay  = $("#cartOverlay");
const cartBody     = $("#cartBody");
const cartFooter   = $("#cartFooter");
const cartCount    = $("#cartCount");
const modalOverlay = $("#modalOverlay");
const checkoutModal= $("#checkoutModal");
const modalClose   = $("#modalClose");
const checkoutForm = $("#checkoutForm");
const successModal = $("#successModal");
const successClose = $("#successClose");
const productsGrid = $("#productsGrid");
const categorySidebar = $("#categorySidebar");
const activeFilterLabel = $("#activeFilterLabel");
const salesSummaryValue = $("#salesSummaryValue");
const salesSummaryText = $("#salesSummaryText");
const hamburgerBtn = $("#hamburgerBtn");
const mobileMenu   = $("#mobileMenu");
const productSearch = $("#productSearch");
const productSort   = $("#productSort");
const productModal = $("#productModal");
const productModalOverlay = $("#productModalOverlay");
const productModalBody = $("#productModalBody");
const productModalClose = $("#productModalClose");
const floatingWhatsAppBtn = $("#floatingWhatsAppBtn");
const reviewsGrid = $("#reviewsGrid");
const bestSellersGrid = $("#bestSellersGrid");
const recentlyViewedList = $("#recentlyViewedList");
const recentlyViewedSection = $("#recentlyViewedSection");

function initAboutPopupSlideshow() {
  const stage = document.getElementById("aboutPopStage");
  const image = document.getElementById("aboutPopImage");
  const nameEl = document.getElementById("aboutPopName");
  const priceEl = document.getElementById("aboutPopPrice");
  const badgeEl = document.getElementById("aboutPopBadge");

  if (!stage || !image || !nameEl || !priceEl) return;

  const featuredProducts = PRODUCTS.filter((product) => product && product.image);
  if (!featuredProducts.length) return;

  const showFeaturedProduct = () => {
    const featuredProduct = featuredProducts[aboutPreviewIndex % featuredProducts.length];
    if (!featuredProduct) return;

    stage.classList.remove("is-changing");
    void stage.offsetWidth;
    stage.classList.add("is-changing");

    image.src = featuredProduct.image;
    image.alt = featuredProduct.name;
    image.onerror = () => {
      image.src = "images/heroImage1.PNG";
      image.alt = "Featured product";
    };
    nameEl.textContent = featuredProduct.name;
    priceEl.textContent = `${CONFIG.CURRENCY_SYMBOL} ${formatPrice(featuredProduct.price)}`;
    if (badgeEl) {
      badgeEl.textContent = featuredProduct.category ? `${featuredProduct.category} pick` : "Featured pick";
    }
  };

  showFeaturedProduct();
  if (aboutPreviewTimer) clearInterval(aboutPreviewTimer);
  aboutPreviewTimer = setInterval(() => {
    aboutPreviewIndex += 1;
    showFeaturedProduct();
  }, 4500);
}

/* ============================================================
   INIT
   ============================================================ */
function initApp() {
  if (typeof productsGrid !== 'undefined' && productsGrid) {
    renderCategorySidebar();
    renderProducts();
    renderSalesSummary();
  }
  attachNavEvents();
  attachFloatingWhatsApp();
  attachCartEvents();
  attachModalEvents();
  attachFormEvents();
  attachScrollEvents();
  injectScrollTopBtn();
  attachContactPageEvents();
  attachImagePopHandlers();
  attachShopControls();
  attachProductModalEvents();
  attachReviewForm();
  attachNewsletterForm();
  loadRecentlyViewed();
  loadReviews();
  renderBestSellers();
  renderFeaturedDeals();
  renderExperiencePreview();
  renderReviews();
  renderRecentlyViewed();
  initAboutPopupSlideshow();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

/* ============================================================
   RENDER PRODUCTS
   ============================================================ */
function getQuantityStatus(quantity) {
  if (quantity > 10) return { label: "In Stock", className: "status--high" };
  if (quantity >= 5) return { label: "Limited", className: "status--medium" };
  return { label: "Low Stock", className: "status--low" };
}

function getFilteredProducts() {
  const { category, subcategory } = currentProductFilter;
  const query = currentSearchQuery.trim().toLowerCase();

  return PRODUCTS.filter((product) => {
    const matchesCategory = !category || product.category === category;
    const matchesSubcategory = !subcategory || product.subcategory === subcategory;
    const searchableText = `${product.name} ${product.description} ${product.category} ${product.subcategory}`.toLowerCase();
    const matchesSearch = !query || searchableText.includes(query);
    return matchesCategory && matchesSubcategory && matchesSearch;
  });
}

function getSortedProducts(products) {
  const sortedProducts = [...products];

  switch (currentSortBy) {
    case "price-asc":
      return sortedProducts.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sortedProducts.sort((a, b) => b.price - a.price);
    case "name":
      return sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sortedProducts.sort((a, b) => a.id - b.id);
  }
}

function renderCategorySidebar() {
  if (!categorySidebar) return;

  const markup = `
    <button type="button" class="shop__filter-pill ${!currentProductFilter.category && !currentProductFilter.subcategory ? "active" : ""}" data-category="" data-subcategory="">All products</button>
    ${CATEGORY_DATA.map((category) => {
      const isActiveCategory = currentProductFilter.category === category.name && !currentProductFilter.subcategory;
      const isActiveSubcategory = currentProductFilter.category === category.name && currentProductFilter.subcategory;
      return `
        <details class="shop__category" ${isActiveCategory || isActiveSubcategory ? "open" : ""}>
          <summary class="shop__category-summary">
            <span>${category.name}</span>
            <span class="shop__category-caret">▾</span>
          </summary>
          <div class="shop__subcategory-list">
            <button type="button" class="shop__filter-pill shop__filter-pill--sub ${isActiveCategory ? "active" : ""}" data-category="${category.name}" data-subcategory="">All in ${category.name}</button>
            ${category.subcategories.map((subcategory) => {
              const isActive = currentProductFilter.category === category.name && currentProductFilter.subcategory === subcategory;
              return `<button type="button" class="shop__filter-pill shop__filter-pill--sub ${isActive ? "active" : ""}" data-category="${category.name}" data-subcategory="${subcategory}">${subcategory}</button>`;
            }).join("")}
          </div>
        </details>
      `;
    }).join("")}
  `;

  categorySidebar.innerHTML = markup;
  categorySidebar.querySelectorAll(".shop__filter-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      setProductFilter(btn.dataset.category || null, btn.dataset.subcategory || null);
    });
  });
}

function setProductFilter(category = null, subcategory = null) {
  currentProductFilter = { category, subcategory };
  renderCategorySidebar();
  renderProducts();
  updateFilterLabel();
}

function updateFilterLabel() {
  if (!activeFilterLabel) return;

  if (currentSearchQuery.trim()) {
    const categoryLabel = currentProductFilter.category ? ` in ${currentProductFilter.category}` : "";
    const subLabel = currentProductFilter.subcategory ? ` / ${currentProductFilter.subcategory}` : "";
    activeFilterLabel.textContent = `Showing results for "${currentSearchQuery.trim()}"${categoryLabel}${subLabel}`;
    return;
  }

  if (!currentProductFilter.category && !currentProductFilter.subcategory) {
    activeFilterLabel.textContent = "Showing all products";
    return;
  }

  const subLabel = currentProductFilter.subcategory ? ` / ${currentProductFilter.subcategory}` : "";
  activeFilterLabel.textContent = `Showing ${currentProductFilter.category}${subLabel}`;
}

function attachShopControls() {
  if (productSearch) {
    productSearch.value = currentSearchQuery;
    productSearch.addEventListener("input", (event) => {
      currentSearchQuery = event.target.value;
      renderProducts();
      updateFilterLabel();
    });
  }

  if (productSort) {
    productSort.value = currentSortBy;
    productSort.addEventListener("change", (event) => {
      currentSortBy = event.target.value;
      renderProducts();
      updateFilterLabel();
    });
  }
}

function renderProducts() {
  if (!productsGrid) return;

  const filteredProducts = getSortedProducts(getFilteredProducts());
  if (filteredProducts.length === 0) {
    productsGrid.innerHTML = `
      <div class="shop__empty">
        <h3>No products available</h3>
        <p>Try another category, a different search term, or a different sort option.</p>
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = filteredProducts.map((p) => {
    const status = getQuantityStatus(p.quantity ?? 0);
    const isWishlisted = wishlist.includes(p.id);
    return `
      <div class="product-card" data-id="${p.id}">
        <div class="product-card__img-wrap">
          <img src="${p.image}" alt="${p.name}" loading="lazy" />
        </div>
        <div class="product-card__info">
          <h3 class="product-card__name">${p.name}</h3>
          <p class="product-card__desc">${p.description}</p>
          <div class="product-card__header">
            <div class="product-card__quantity ${status.className}">
              <span class="product-card__quantity-dot"></span>
              ${status.label}
            </div>
            <span class="product-card__price">${CONFIG.CURRENCY_SYMBOL} ${formatPrice(p.price)}</span>
          </div>
          <div class="product-card__actions">
            <button class="product-card__icon-btn ${isWishlisted ? "is-active" : ""}" data-action="wishlist" data-id="${p.id}" aria-label="${isWishlisted ? "Remove from wishlist" : "Add to wishlist"}">♡</button>
            <button class="btn btn--primary add-to-cart-btn" data-id="${p.id}">
              ${isInCart(p.id) ? "Remove from cart" : "ADD TO CART"}
            </button>
            <button class="product-card__icon-btn" data-action="details" data-id="${p.id}" aria-label="View product details">⋯</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  $$(".add-to-cart-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id, 10);
      if (isInCart(id)) {
        removeFromCart(id);
      } else {
        addToCart(id);
      }
      updateProductButtons();
    });
  });

  $$(".product-card__icon-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id, 10);
      if (btn.dataset.action === "wishlist") {
        toggleWishlist(id);
      } else {
        openProductModal(id);
      }
      renderProducts();
    });
  });
}

function isInCart(productId) {
  return cart.some((item) => item.id === productId);
}

function updateProductButtons() {
  $$(".add-to-cart-btn").forEach((btn) => {
    const id = parseInt(btn.dataset.id, 10);
    if (isInCart(id)) {
      btn.textContent = "Remove from cart";
      btn.classList.add("in-cart");
    } else {
      btn.textContent = "ADD TO CART";
      btn.classList.remove("in-cart", "added");
    }
  });
}

function toggleWishlist(productId) {
  if (wishlist.includes(productId)) {
    wishlist = wishlist.filter((id) => id !== productId);
    showToast("Removed from wishlist");
  } else {
    wishlist.push(productId);
    showToast("Added to wishlist");
  }
}

function openProductModal(productId) {
  const product = PRODUCTS.find((item) => item.id === productId);
  if (!product || !productModal || !productModalBody) return;

  addRecentlyViewed(product.id);
  productModalBody.innerHTML = `
    <div class="product-modal__content">
      <img class="product-modal__image" src="${product.image}" alt="${product.name}" />
      <div class="product-modal__info">
        <h3>${product.name}</h3>
        <p class="product-modal__price">${CONFIG.CURRENCY_SYMBOL} ${formatPrice(product.price)}</p>
        <p>${product.description}</p>
        <ul>
          <li>Category: ${product.category}</li>
          <li>Subcategory: ${product.subcategory}</li>
          <li>Stock status: ${getQuantityStatus(product.quantity ?? 0).label}</li>
        </ul>
        <div class="product-modal__actions">
          <button class="btn btn--primary" onclick="addToCart(${product.id}); closeProductModal();">Add to cart</button>
          <button class="btn btn--outline" onclick="toggleWishlist(${product.id}); closeProductModal();">${wishlist.includes(product.id) ? "Remove from wishlist" : "Add to wishlist"}</button>
        </div>
      </div>
    </div>
  `;

  productModal.classList.add("open");
  productModalOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeProductModal() {
  if (!productModal || !productModalOverlay) return;
  productModal.classList.remove("open");
  productModalOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

function loadRecentlyViewed() {
  try {
    const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!stored) {
      recentlyViewed = [];
      return;
    }
    const parsed = JSON.parse(stored);
    recentlyViewed = Array.isArray(parsed) ? parsed.filter((id) => PRODUCTS.some((product) => product.id === id)).slice(0, 4) : [];
  } catch (error) {
    console.warn("Unable to load recently viewed products", error);
    recentlyViewed = [];
  }
}

function saveRecentlyViewed() {
  localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(recentlyViewed));
}

function addRecentlyViewed(productId) {
  if (!productId) return;
  recentlyViewed = [productId, ...recentlyViewed.filter((id) => id !== productId)].slice(0, 4);
  saveRecentlyViewed();
  renderRecentlyViewed();
}

function renderBestSellers() {
  if (!bestSellersGrid) return;

  const highlights = PRODUCTS.slice(0, 3);
  bestSellersGrid.innerHTML = highlights.map((product) => `
    <article class="best-seller-card">
      <img src="${product.image}" alt="${product.name}" />
      <div>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <span>${CONFIG.CURRENCY_SYMBOL} ${formatPrice(product.price)}</span>
      </div>
    </article>
  `).join("");
}

function renderFeaturedDeals() {
  const grid = document.getElementById("featuredDealsGrid");
  if (!grid) return;

  grid.innerHTML = FEATURED_DEALS.map((deal) => `
    <article class="featured-deal-card">
      <span class="featured-deal-card__badge">${deal.badge}</span>
      <h3>${deal.title}</h3>
      <p>${deal.text}</p>
      <div class="featured-deal-card__footer">
        <strong>${deal.savings}</strong>
        <button class="btn btn--outline" type="button" onclick="openProductModal(${deal.id})">View deal</button>
      </div>
    </article>
  `).join("");
}

function renderExperiencePreview() {
  const stepsEl = document.getElementById("orderProgressSteps");
  const fillEl = document.getElementById("orderProgressBarFill");
  const noteEl = document.getElementById("orderProgressNote");
  const statsEl = document.getElementById("sellerDashboardStats");

  if (stepsEl) {
    stepsEl.innerHTML = ORDER_PROGRESS_DATA.steps.map((step, index) => `
      <div class="order-step ${index <= ORDER_PROGRESS_DATA.currentStep ? "is-active" : ""}">
        <span>${index + 1}</span>
        <p>${step}</p>
      </div>
    `).join("");
  }

  if (fillEl) {
    const progressPercent = Math.min(100, (ORDER_PROGRESS_DATA.currentStep / (ORDER_PROGRESS_DATA.steps.length - 1)) * 100);
    fillEl.style.width = `${progressPercent}%`;
  }

  if (noteEl) {
    noteEl.textContent = ORDER_PROGRESS_DATA.note;
  }

  if (statsEl) {
    statsEl.innerHTML = SELLER_DASHBOARD_DATA.map((item) => `
      <div class="dashboard-stat">
        <strong>${item.value}</strong>
        <span>${item.title}</span>
      </div>
    `).join("");
  }
}

function attachNewsletterForm() {
  const form = document.getElementById("newsletterForm");
  const input = document.getElementById("newsletterEmail");
  if (!form || !input) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = input.value.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast("Please enter a valid email address.");
      return;
    }

    let stored = [];
    try {
      const raw = localStorage.getItem(NEWSLETTER_KEY);
      stored = raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.warn("Unable to read newsletter data", error);
    }

    if (!stored.includes(email)) {
      stored.push(email);
      localStorage.setItem(NEWSLETTER_KEY, JSON.stringify(stored));
    }

    form.reset();
    showToast("Thanks for subscribing!");
  });
}

function loadReviews() {
  try {
    const stored = localStorage.getItem(REVIEWS_KEY);
    if (!stored) {
      reviews = INITIAL_REVIEWS.slice();
      return;
    }
    const parsed = JSON.parse(stored);
    reviews = Array.isArray(parsed) && parsed.length ? parsed : INITIAL_REVIEWS.slice();
  } catch (error) {
    console.warn("Unable to load customer reviews", error);
    reviews = INITIAL_REVIEWS.slice();
  }
}

function saveReviews() {
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
}

function attachReviewForm() {
  const form = document.getElementById("reviewForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = document.getElementById("reviewName")?.value.trim() || "";
    const title = document.getElementById("reviewTitle")?.value.trim() || "";
    const rating = Number(document.getElementById("reviewRating")?.value || 5);
    const quote = document.getElementById("reviewMessage")?.value.trim() || "";

    if (!name || !title || !quote) {
      showToast("Please complete all review fields.");
      return;
    }

    reviews = [{ name, title, rating, quote }, ...reviews].slice(0, 8);
    saveReviews();
    renderReviews();
    form.reset();
    showToast("Thanks for sharing your review!");
  });
}

function renderReviews() {
  if (!reviewsGrid) return;

  const visibleReviews = reviews.slice(0, 3);
  const hiddenReviews = reviews.slice(3);
  const hasMore = hiddenReviews.length > 0;

  reviewsGrid.innerHTML = `
    ${visibleReviews.map((review) => {
      const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
      return `
        <article class="review-card">
          <div class="review-card__stars">${stars}</div>
          <h3>${review.title}</h3>
          <p>“${review.quote}”</p>
          <span>${review.name}</span>
        </article>
      `;
    }).join("")}
    ${hasMore ? `
      <div class="review-extra-list" id="reviewExtraList" hidden>
        ${hiddenReviews.map((review) => {
          const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
          return `
            <article class="review-card review-card--extra">
              <div class="review-card__stars">${stars}</div>
              <h3>${review.title}</h3>
              <p>“${review.quote}”</p>
              <span>${review.name}</span>
            </article>
          `;
        }).join("")}
      </div>
    ` : ""}
    ${hasMore ? `<button class="review-toggle" type="button" id="reviewToggleBtn">View more</button>` : ""}
  `;

  const toggleBtn = document.getElementById("reviewToggleBtn");
  const extraList = document.getElementById("reviewExtraList");
  if (toggleBtn && extraList) {
    toggleBtn.addEventListener("click", () => {
      const isExpanded = extraList.hidden;
      extraList.hidden = !isExpanded;
      extraList.classList.toggle("is-open", isExpanded);
      toggleBtn.textContent = isExpanded ? "View less" : "View more";
    });
  }
}

function renderRecentlyViewed() {
  if (!recentlyViewedList || !recentlyViewedSection) return;

  if (!recentlyViewed.length) {
    recentlyViewedSection.style.display = "none";
    return;
  }

  recentlyViewedSection.style.display = "block";
  recentlyViewedList.innerHTML = recentlyViewed.map((id) => {
    const product = PRODUCTS.find((item) => item.id === id);
    if (!product) return "";
    return `
      <button class="recently-viewed__item" type="button" data-id="${product.id}">
        <img src="${product.image}" alt="${product.name}" />
        <span>${product.name}</span>
      </button>
    `;
  }).join("");

  recentlyViewedList.querySelectorAll(".recently-viewed__item").forEach((btn) => {
    btn.addEventListener("click", () => {
      openProductModal(parseInt(btn.dataset.id, 10));
    });
  });
}

function attachProductModalEvents() {
  if (productModalClose) {
    productModalClose.addEventListener("click", closeProductModal);
  }

  if (productModalOverlay) {
    productModalOverlay.addEventListener("click", closeProductModal);
  }
}

/* ============================================================
   CART LOGIC
   ============================================================ */
function addToCart(productId) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return;

  const existing = cart.find((i) => i.id === productId);
  if (existing) {
    return;
  }

  cart.push({ ...product, qty: 1 });
  updateCartUI();
  showToast(`${product.name} added to cart`);
}

function removeFromCart(productId) {
  cart = cart.filter((i) => i.id !== productId);
  updateCartUI();
}

function changeQty(productId, delta) {
  const item = cart.find((i) => i.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(productId);
    return;
  }
  updateCartUI();
}

function getCartTotal() {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function getCartCount() {
  return cart.reduce((sum, i) => sum + i.qty, 0);
}

function openSellerChat() {
  const number = "+233202173740";
  const message = encodeURIComponent("Hello, I would like to chat with the seller before placing my order.");
  const url = `https://wa.me/${number.replace(/[^+\d]/g, "").replace(/^\+/, "")}?text=${message}`;

  showToast("Opening WhatsApp...");

  try {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      window.location.href = url;
    }
  } catch (err) {
    window.location.href = url;
  }
}

/* ============================================================
   CART UI
   ============================================================ */
function updateCartUI() {
  // Badge
  const count = getCartCount();
  cartCount.textContent = count;
  cartCount.style.background = count > 0 ? "" : "";

  // Drawer body
  if (cart.length === 0) {
    cartBody.innerHTML = `
      <div class="cart-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <p>Your cart is empty.<br/>Add some gadgets!</p>
      </div>`;
    cartFooter.innerHTML = "";
    updateProductButtons();
    return;
  }

  cartBody.innerHTML = cart.map((item) => `
    <div class="cart-item" data-id="${item.id}">
      <img class="cart-item__img" src="${item.image}" alt="${item.name}" />
      <div class="cart-item__details">
        <p class="cart-item__name">${item.name}</p>
        <p class="cart-item__price">${CONFIG.CURRENCY_SYMBOL} ${formatPrice(item.price)}</p>
        <div class="cart-item__qty">
          <button class="qty-btn" onclick="changeQty(${item.id}, -1)" aria-label="Decrease quantity">−</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${item.id}, 1)" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button class="cart-item__remove" onclick="removeFromCart(${item.id})" aria-label="Remove ${item.name}">×</button>
    </div>
  `).join("");

  const total = getCartTotal();
  cartFooter.innerHTML = `
    <div class="cart-total-line">
      <span class="cart-total-label">Total</span>
      <span class="cart-total-value">${CONFIG.CURRENCY_SYMBOL} ${formatPrice(total)}</span>
    </div>
    <div class="cart-policy">
      <h3>Delivery & Returns</h3>
      <ul>
        <li><strong>Delivery:</strong> Nationwide delivery with clear updates before dispatch.</li>
        <li><strong>Returns:</strong> Contact us within 24 hours if the item arrives damaged or incorrect.</li>
      </ul>
    </div>
    <div class="cart-estimate">
      <strong>Estimated arrival:</strong> 1–2 days in major cities and 2–4 days nationwide.
    </div>
    <button class="btn btn--outline btn--full cart-seller-btn" onclick="openSellerChat()">
      Chat Seller
    </button>
    <button class="btn btn--primary btn--full" onclick="openCheckout()">
      Proceed to Checkout
    </button>
    <button class="btn btn--outline btn--full" onclick="closeCart()">
      Continue Shopping
    </button>
  `;
  updateProductButtons();
}

/* ============================================================
   CART DRAWER OPEN / CLOSE
   ============================================================ */
function openCart() {
  cartDrawer.classList.add("open");
  cartOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

/* ============================================================
   CHECKOUT MODAL
   ============================================================ */
function openCheckout() {
  if (cart.length === 0) {
    showToast("Your cart is empty!");
    return;
  }
  closeCart();
  populateOrderSummary();
  updateFormTotal();
  modalOverlay.classList.add("open");
  checkoutModal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCheckout() {
  modalOverlay.classList.remove("open");
  checkoutModal.classList.remove("open");
  document.body.style.overflow = "";
}

function populateOrderSummary() {
  const total = getCartTotal();
  const items = cart.map((i) => `
    <div class="order-summary__item">
      <span>${i.name} × ${i.qty}</span>
      <span>${CONFIG.CURRENCY_SYMBOL} ${formatPrice(i.price * i.qty)}</span>
    </div>
  `).join("");

  $("#modalOrderSummary").innerHTML = `
    <p class="order-summary__title">Order Summary</p>
    ${items}
    <hr class="order-summary__divider" />
    <div class="order-summary__total">
      <span>Total</span>
      <span>${CONFIG.CURRENCY_SYMBOL} ${formatPrice(total)}</span>
    </div>
  `;
}

function updateFormTotal() {
  const total = getCartTotal();
  const el = $("#formTotalDisplay");
  if (el) {
    el.innerHTML = `
      <span>Amount to Pay</span>
      <span class="total-amt">${CONFIG.CURRENCY_SYMBOL} ${formatPrice(total)}</span>
    `;
  }
}

/* ============================================================
   SUCCESS MODAL
   ============================================================ */
function openSuccess(reference) {
  recordCheckoutSale(cart);
  closeCheckout();
  $("#successRef").textContent = `Reference: ${reference}`;
  successModal.classList.add("open");
  modalOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeSuccess() {
  successModal.classList.remove("open");
  modalOverlay.classList.remove("open");
  document.body.style.overflow = "";
  // Clear cart
  cart = [];
  updateCartUI();
  checkoutForm.reset();
  clearFormErrors();
}

/* ============================================================
   FORM VALIDATION
   ============================================================ */
function validateForm() {
  let valid = true;
  clearFormErrors();

  const fields = [
    { id: "firstName",  label: "First name" },
    { id: "lastName",   label: "Last name" },
    { id: "email",      label: "Email address" },
    { id: "phone",      label: "Phone number" },
    { id: "address",    label: "Delivery address" },
    { id: "city",       label: "City" },
    { id: "country",    label: "Country" },
  ];

  fields.forEach(({ id, label }) => {
    const input = $(`#${id}`);
    const error = $(`#${id}Error`);
    if (!input || !error) return;

    const value = input.value.trim();

    if (!value) {
      setFieldError(input, error, `${label} is required`);
      valid = false;
      return;
    }

    if (id === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setFieldError(input, error, "Enter a valid email address");
      valid = false;
    }

    if (id === "phone" && !/^[\+\d\s\-\(\)]{7,20}$/.test(value)) {
      setFieldError(input, error, "Enter a valid phone number");
      valid = false;
    }
  });

  return valid;
}

function setFieldError(input, errorEl, message) {
  input.classList.add("error");
  errorEl.textContent = message;
}

function clearFormErrors() {
  $$(".form__group input, .form__group select").forEach((el) => el.classList.remove("error"));
  $$(".field-error").forEach((el) => (el.textContent = ""));
}

/* ============================================================
   PAYSTACK PAYMENT INTEGRATION
   ============================================================ */
function initiatePaystackPayment(formData) {
  const totalInKobo = getCartTotal() * 100; // Paystack accepts amount in the smallest currency unit (pesewas/kobo)

  const handler = PaystackPop.setup({
    key:       CONFIG.PAYSTACK_PUBLIC_KEY,
    email:     formData.email,
    amount:    totalInKobo,
    currency:  CONFIG.CURRENCY,
    ref:       generateReference(),
    firstname: formData.firstName,
    lastname:  formData.lastName,
    phone:     formData.phone,

    metadata: {
      custom_fields: [
        {
          display_name: "Store",
          variable_name: "store",
          value: CONFIG.STORE_NAME,
        },
        {
          display_name: "Delivery Address",
          variable_name: "delivery_address",
          value: `${formData.address}, ${formData.city}`,
        },
        {
          display_name: "Order Items",
          variable_name: "order_items",
          value: cart.map((i) => `${i.name} x${i.qty}`).join(", "),
        },
      ],
    },

    /**
     * onSuccess — called when payment is completed successfully.
     * Here you would typically:
     *  1. Send the reference to your backend to verify the transaction
     *     via Paystack's /transaction/verify/:reference endpoint.
     *  2. Update your database / fulfil the order.
     *  3. Show a confirmation to the user.
     *
     * @param {Object} response - { reference, status, trans, trxref }
     */
    callback: function (response) {
      console.log("Payment successful:", response);
      // TODO: Verify transaction on your backend before fulfilling order.
      // Example backend call:
      //   fetch(`/api/verify-payment/${response.reference}`)
      //     .then(res => res.json())
      //     .then(data => { if (data.status === 'success') fulfillOrder(); });
      openSuccess(response.reference);
      resetPayBtn();
    },

    /**
     * onClose — called when the user dismisses the Paystack popup.
     * Payment was NOT completed.
     */
    onClose: function () {
      console.log("Paystack popup closed by user.");
      showToast("Payment cancelled. You can try again.");
      resetPayBtn();
    },
  });

  handler.openIframe();
}

function generateReference() {
  const timestamp = Date.now();
  const random    = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `SDTH-${timestamp}-${random}`;
}

function resetPayBtn() {
  const btn = $("#paystackBtn");
  btn.classList.remove("loading");
  $("#payBtnText").textContent = "Pay with Paystack";
}

/* ============================================================
   EVENT WIRING
   ============================================================ */
function attachNavEvents() {
  // Hamburger
  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener("click", () => {
      mobileMenu.classList.toggle("open");
    });
  }
  // Close mobile menu on overlay clicks
  document.addEventListener("click", (e) => {
    if (navbar && mobileMenu && !navbar.contains(e.target)) {
      mobileMenu.classList.remove("open");
    }
  });
}

function closeMobileMenu() {
  if (mobileMenu) mobileMenu.classList.remove("open");
}
// Expose to inline handlers in HTML
window.closeMobileMenu = closeMobileMenu;

function attachFloatingWhatsApp() {
  if (floatingWhatsAppBtn) {
    floatingWhatsAppBtn.addEventListener("click", openSellerChat);
  }
}

function attachCartEvents() {
  if (cartBtn) {
    cartBtn.addEventListener("click", () => {
      updateCartUI();
      openCart();
    });
  }
  if (cartClose) cartClose.addEventListener("click", closeCart);
  if (cartOverlay) cartOverlay.addEventListener("click", closeCart);
}

function attachModalEvents() {
  if (modalClose) modalClose.addEventListener("click", closeCheckout);
  if (successClose) successClose.addEventListener("click", closeSuccess);
  // Clicking overlay only closes checkout (not success, to prevent accidental dismiss)
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        if (successModal && successModal.classList.contains("open")) {
          closeSuccess();
        } else {
          closeCheckout();
        }
      }
    });
  }
}

function attachFormEvents() {
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", (e) => {
      e.preventDefault();

      if (!validateForm()) {
        showToast("Please fill in all required fields correctly.");
        return;
      }

      const btn = $("#paystackBtn");
      if (btn) btn.classList.add("loading");
      const payText = $("#payBtnText");
      if (payText) payText.textContent = "Processing";

      const formData = {
        firstName: $("#firstName").value.trim(),
        lastName:  $("#lastName").value.trim(),
        email:     $("#email").value.trim(),
        phone:     $("#phone").value.trim(),
        address:   $("#address").value.trim(),
        city:      $("#city").value.trim(),
        country:   $("#country").value,
      };

      // Short delay for UX, then open Paystack
      setTimeout(() => {
        initiatePaystackPayment(formData);
      }, 500);
    });
  }

  // Live validation — clear error on input (safe to run even if no elements)
  $$(".checkout-form input, .checkout-form select").forEach((el) => {
    el.addEventListener("input", () => {
      el.classList.remove("error");
      const errorEl = $(`#${el.id}Error`);
      if (errorEl) errorEl.textContent = "";
    });
  });
}

function attachScrollEvents() {
  window.addEventListener("scroll", () => {
    // Navbar shadow
    if (window.scrollY > 10) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
    // Scroll-to-top button
    const scrollTopBtn = $("#scrollTopBtn");
    if (scrollTopBtn) {
      if (window.scrollY > 400) {
        scrollTopBtn.classList.add("visible");
      } else {
        scrollTopBtn.classList.remove("visible");
      }
    }
  });
}

/* ============================================================
   SCROLL-TO-TOP BUTTON
   ============================================================ */
function injectScrollTopBtn() {
  const btn = document.createElement("button");
  btn.id = "scrollTopBtn";
  btn.className = "scroll-top";
  btn.setAttribute("aria-label", "Scroll to top");
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>`;
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  document.body.appendChild(btn);
}

/* ============================================================
   TOAST NOTIFICATION
   ============================================================ */
let toastTimer = null;
function showToast(message) {
  let toast = $("#globalToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "globalToast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

/* ============================================================
   HELPERS
   ============================================================ */
function formatPrice(amount) {
  return amount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function loadSalesData() {
  try {
    const raw = localStorage.getItem(SALES_TRACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("Unable to read sales data", error);
    return [];
  }
}

function saveSalesData(entries) {
  localStorage.setItem(SALES_TRACK_KEY, JSON.stringify(entries));
}

function pruneSalesData(entries) {
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  return entries.filter((entry) => new Date(entry.date).getTime() >= sevenDaysAgo);
}

function recordCheckoutSale(items = []) {
  const entries = pruneSalesData(loadSalesData());
  const quantitySold = (items || []).reduce((sum, item) => sum + (item.qty || 1), 0);
  entries.push({ date: new Date().toISOString(), quantity: quantitySold });
  saveSalesData(entries);
  renderSalesSummary();
}

function renderSalesSummary() {
  if (!salesSummaryValue || !salesSummaryText) return;

  const entries = pruneSalesData(loadSalesData());
  const totalQty = entries.reduce((sum, entry) => sum + (entry.quantity || 0), 0);
  const checkoutCount = entries.length;
  salesSummaryValue.textContent = totalQty;
  salesSummaryText.textContent = `from ${checkoutCount} completed checkout${checkoutCount === 1 ? "" : "s"} in the last 7 days`;
}

/* ============================================================
   EXPOSE GLOBALS NEEDED BY INLINE CART HANDLERS
   ============================================================ */
window.changeQty      = changeQty;
window.removeFromCart = removeFromCart;
window.openCheckout   = openCheckout;
window.closeCart      = closeCart;
window.openSellerChat = openSellerChat;
window.toggleWishlist = toggleWishlist;
window.closeProductModal = closeProductModal;
window.openProductModal = openProductModal;

/* ============================================================
   CONTACT PAGE BEHAVIOR
   ============================================================ */
function attachContactPageEvents() {
  // WhatsApp buttons on contact/staff pages — open chat with prefilled message.
  document.querySelectorAll(".whatsapp-btn").forEach((btn) => {
    // improve accessibility
    btn.setAttribute("role", "link");
    btn.setAttribute("aria-label", btn.getAttribute("aria-label") || "Open WhatsApp chat");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      // click animation
      btn.classList.add('is-clicked');
      setTimeout(() => btn.classList.remove('is-clicked'), 220);

      // Debug / UX feedback
      console.log('WhatsApp button clicked', { number: btn.dataset.number });
      showToast('Opening WhatsApp...');

      const number = (btn.dataset.number || "+233202173740").replace(/[^+\d]/g, "");
      const rawNumber = number.replace(/^\+/, "");

      // Try to get the team member name from nearby markup
      let person = "";
      const card = btn.closest('.profile-card');
      if (card) {
        const h = card.querySelector('h3');
        if (h) person = h.textContent.trim();
      }

      const defaultMsg = person ? `Hello ${person}, I would like to get in touch.` : 'Hello, I would like to get in touch.';
      const textParam = encodeURIComponent(defaultMsg);
      const url = `https://wa.me/${rawNumber}?text=${textParam}`;

      // Open in new tab when possible; fallback to same-tab navigation if blocked
      try {
        const win = window.open(url, '_blank');
        if (!win) {
          // Popup blocked — navigate current window
          window.location.href = url;
        }
      } catch (err) {
        window.location.href = url;
      }
    });
  });

  // Contact form: open mailto with the message filled
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = (document.getElementById("contactName") || {}).value || "";
      const email = (document.getElementById("contactEmail") || {}).value || "";
      const phone = (document.getElementById("contactPhone") || {}).value || "";
      const message = (document.getElementById("contactMessage") || {}).value || "";
      const subject = encodeURIComponent(`Contact from website: ${name}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
      // Use mailto: fallback — update recipient as needed
      const recipient = 'saakuu.clement@gmail.com';
      const mailto = `mailto:${recipient}?subject=${subject}&body=${body}`;
      window.location.href = mailto;
      showToast("Opening your email client...");
    });
  }
}

/* ============================================================
   IMAGE POP HANDLERS (mouseenter / touch)
   ============================================================ */
function attachImagePopHandlers() {
  // apply to product images and profile images
  const sel = "img, .product-card__img-wrap img, .profile-card img";
  document.querySelectorAll(sel).forEach((img) => {
    // mark as popable
    img.classList.add("img-popable");

    const addPop = () => img.classList.add("is-pop");
    const removePop = () => img.classList.remove("is-pop");

    img.addEventListener("mouseenter", addPop);
    img.addEventListener("mouseleave", removePop);
    img.addEventListener("focus", addPop);
    img.addEventListener("blur", removePop);

    // Touch support: toggle on touchstart and remove after short timeout
    let touchTimer = null;
    img.addEventListener("touchstart", (e) => {
      addPop();
      clearTimeout(touchTimer);
      touchTimer = setTimeout(removePop, 1200);
    }, { passive: true });
  });
}


