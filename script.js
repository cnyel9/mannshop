// --- Variabel Global dan DOM Elements ---
let currentProduct = null;
let isAuthenticated = false;
let userBalance = 0;
let allProducts = [];
let allCategories = {};
let currentView = "categories"; // 'categories', 'products', 'profile'
let currentCategory = null; // null (all), 'Nama Kategori'

const productsGrid = document.getElementById("products-grid");
const noProductsText = document.getElementById("no-products-text");

// Views
const productView = document.getElementById("product-view");
const profileView = document.getElementById("profile-view");
const viewTitle = document.getElementById("view-title");
const logo = document.getElementById("logo");

// Modals
const authModal = document.getElementById("auth-modal");
const productDetailModal = document.getElementById("product-detail-modal");
const orderStatusModal = document.getElementById("order-status-modal");
const notificationContainer = document.getElementById("notification-container");

// Konten Modal
const authContent = document.getElementById("auth-content");
const productDetailContent = document.getElementById("product-detail-content");
const orderStatusContent = document.getElementById("order-status-content");

// Navigasi
const guestNav = document.getElementById("guest-nav");
const userNav = document.getElementById("user-nav");
const navLoginBtn = document.getElementById("nav-login-btn");
const navRegisterBtn = document.getElementById("nav-register-btn");
const navLogoutBtn = document.getElementById("nav-logout-btn");
const navProfileBtn = document.getElementById("nav-profile-btn");
const navHomeBtn = document.getElementById("nav-home-btn"); // Perbaikan: Tombol Home
const userNameDisplay = document.getElementById("user-name-display");

// Perbaikan: Mobile Menu Elements
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mobileMenuCloseBtn = document.getElementById("mobile-menu-close-btn");
const mobileMenu = document.getElementById("mobile-menu");
const mobileMenuOverlay = document.getElementById("mobile-menu-overlay");
const mobileNavContent = document.getElementById("mobile-nav-content");

// Form Otentikasi (Poin 7)
const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const nameField = document.getElementById("name-field");
const usernameField = document.getElementById("username-field");
const emailField = document.getElementById("email-field");
const loginField = document.getElementById("login-field");
const authErrorMessage = document.getElementById("auth-error-message");
const toggleAuthBtn = document.getElementById("toggle-auth-btn");
const toggleAuthText = document.getElementById("toggle-auth-text");

// Search & Navigasi Kategori (Poin 2 & 3)
const searchBarContainer = document.getElementById("search-bar-container");
const searchInput = document.getElementById("search-input");
const backToCategoriesBtn = document.getElementById("back-to-categories-btn");

// Profile (Poin 6)
const profileTabs = document.getElementById("profile-tabs");
const tabContents = document.querySelectorAll(".tab-content");
const profileName = document.getElementById("profile-name");
const profileUsername = document.getElementById("profile-username");
const profileEmail = document.getElementById("profile-email");
const changePasswordForm = document.getElementById("change-password-form");
const passwordFormAlert = document.getElementById("password-form-alert");
const changeEmailForm = document.getElementById("change-email-form");
const emailFormAlert = document.getElementById("email-form-alert");
const transactionListContainer = document.getElementById(
  "transaction-list-container"
);
const transactionLoadingText = document.getElementById(
  "transaction-loading-text"
);

// Templates
const productDetailTemplate = document.getElementById(
  "product-detail-template"
);
const loginPromptTemplate = document.getElementById("login-prompt-template");
const orderStatusTemplate = document.getElementById("order-status-template");

// Gunakan relative path untuk API
const API_BASE_URL = "/api";

// --- Utility Functions ---

/** Menampilkan notifikasi singkat. Tipe: success | error | warning */
function showNotification(message, type = "success") {
  const colorMap = {
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-yellow-500",
  };
  const element = document.createElement("div");
  element.className = `${colorMap[type]} text-white p-3 rounded-lg shadow-xl font-medium transform translate-x-full transition-transform duration-300 ease-out`;
  element.textContent = message;

  notificationContainer.appendChild(element);

  // Animasi masuk
  setTimeout(() => {
    element.classList.remove("translate-x-full");
    element.style.transition = "transform 0.3s ease-out";
    element.classList.add("translate-x-0");
  }, 10);

  // Animasi keluar
  setTimeout(() => {
    element.classList.remove("translate-x-0");
    element.classList.add("translate-x-full");
    element.addEventListener("transitionend", () => element.remove());
  }, 4000); // Notifikasi hilang setelah 4 detik
}

function rupiah(number) {
  if (isNaN(number)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(number);
}

function formatTanggal(dateString) {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return new Date(dateString).toLocaleDateString("id-ID", options);
}

function showModal(id) {
  const modal = document.getElementById(id);
  const content = modal.querySelector('[id$="-content"]'); // Menargetkan auth-content, etc.
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  // Memicu animasi modal
  setTimeout(() => {
    if (content) {
      content.classList.remove("opacity-0", "scale-95");
      content.classList.add("opacity-100", "scale-100");
    }
  }, 10);
}

function closeModal(id) {
  const modal = document.getElementById(id);
  const content = modal.querySelector('[id$="-content"]');

  if (content) {
    content.classList.remove("opacity-100", "scale-100");
    content.classList.add("opacity-0", "scale-95");
  }

  // Tunggu animasi selesai sebelum disembunyikan
  setTimeout(() => {
    modal.classList.remove("flex");
    modal.classList.add("hidden");
  }, 200); // Durasi transisi
}

// Perbaikan: Fungsi untuk toggle mobile menu
function toggleMobileMenu(show) {
  if (show) {
    mobileMenuOverlay.classList.remove("hidden");
    mobileMenu.classList.add("open");
  } else {
    mobileMenuOverlay.classList.add("hidden");
    mobileMenu.classList.remove("open");
  }
}

// --- Navigasi View ---
function showProductListView() {
  currentView = "categories";
  profileView.classList.add("hidden");
  productView.classList.remove("hidden");
  displayCategories(); // Kembali ke tampilan kategori
  toggleMobileMenu(false); // Selalu tutup menu saat pindah view
}

function showProfileView() {
  currentView = "profile";
  productView.classList.add("hidden");
  profileView.classList.remove("hidden");
  searchBarContainer.classList.add("hidden"); // Sembunyikan search bar
  loadProfileData();
  loadTransactionHistory();
  toggleMobileMenu(false); // Selalu tutup menu saat pindah view
}

// --- Otentikasi Logic ---

// Perbaikan: updateAuthUI sekarang juga mengatur mobile menu
function updateAuthUI() {
  mobileNavContent.innerHTML = ""; // Kosongkan menu mobile

  if (isAuthenticated) {
    // Tampilan Desktop
    guestNav.classList.add("hidden");
    guestNav.classList.remove("flex");
    userNav.classList.remove("hidden");
    userNav.classList.add("flex");

    // Tampilan Mobile
    // Perbaikan: Tombol Home ditambahkan
    const homeBtnMobile = document.createElement("button");
    homeBtnMobile.className =
      "w-full text-left p-3 rounded-lg font-medium text-gray-700 hover:bg-gray-100";
    homeBtnMobile.textContent = "Home";
    homeBtnMobile.onclick = showProductListView; // Arahkan ke halaman utama

    const profileBtnMobile = document.createElement("button");
    profileBtnMobile.className =
      "w-full text-left p-3 rounded-lg font-medium text-gray-700 hover:bg-gray-100";
    profileBtnMobile.textContent = "Profile";
    profileBtnMobile.onclick = showProfileView; // Arahkan ke profile view

    const logoutBtnMobile = document.createElement("button");
    logoutBtnMobile.className =
      "w-full text-left p-3 rounded-lg font-medium text-red-500 hover:bg-red-50";
    logoutBtnMobile.textContent = "Logout";
    logoutBtnMobile.onclick = handleLogout; // Panggil fungsi logout

    mobileNavContent.appendChild(homeBtnMobile); // Home dulu
    mobileNavContent.appendChild(profileBtnMobile);
    mobileNavContent.appendChild(logoutBtnMobile);
  } else {
    // Tampilan Desktop
    guestNav.classList.remove("hidden");
    guestNav.classList.add("flex");
    userNav.classList.add("hidden");
    userNav.classList.remove("flex");

    // Tampilan Mobile
    const registerBtnMobile = document.createElement("button");
    registerBtnMobile.className =
      "w-full text-left p-3 rounded-lg font-medium text-gray-700 hover:bg-gray-100";
    registerBtnMobile.textContent = "Daftar";
    registerBtnMobile.onclick = () => {
      toggleAuthMode(true);
      showModal("auth-modal");
      toggleMobileMenu(false);
    };

    const loginBtnMobile = document.createElement("button");
    loginBtnMobile.className =
      "w-full text-left p-3 rounded-lg font-medium bg-primary text-white bg-primary-hover";
    loginBtnMobile.textContent = "Login";
    loginBtnMobile.onclick = () => {
      toggleAuthMode(false);
      showModal("auth-modal");
      toggleMobileMenu(false);
    };

    mobileNavContent.appendChild(registerBtnMobile);
    mobileNavContent.appendChild(loginBtnMobile);
  }
}

async function checkAuthStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/user`, {
      credentials: "include", // Penting untuk mengirim cookie
    });

    if (response.status === 401) {
      isAuthenticated = false;
      return;
    }

    const data = await response.json();

    if (data.success) {
      isAuthenticated = true;
      userBalance = data.data.balance;
      userNameDisplay.textContent = `Halo, ${data.data.name} (${rupiah(
        userBalance
      )})`;
    } else {
      isAuthenticated = false;
    }
  } catch (error) {
    isAuthenticated = false;
    console.error("Cek status auth gagal:", error);
  } finally {
    updateAuthUI();
    loadCategoriesAndProducts(); // Load data setelah status auth diketahui
  }
}

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authErrorMessage.classList.add("hidden");
  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = "Memproses...";

  const isRegister = authTitle.textContent === "Daftar";

  // Poin 7: Ambil data form yang diperbarui
  const name = document.getElementById("auth-name").value;
  const username = document.getElementById("auth-username").value;
  const email = document.getElementById("auth-email").value;
  const loginIdentifier = document.getElementById("auth-login").value;
  const password = document.getElementById("auth-password").value;

  const endpoint = isRegister ? "register" : "login";
  let payload = {};

  if (isRegister) {
    payload = { name, username, email, password };
  } else {
    payload = { loginIdentifier, password };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
    const data = await response.json();

    if (data.success) {
      closeModal("auth-modal");
      showNotification(data.message, "success");
      if (isRegister) {
        toggleAuthMode(false); // Arahkan ke login setelah daftar
      } else {
        await checkAuthStatus(); // Jika login, cek status untuk update UI
      }
    } else {
      authErrorMessage.textContent = data.message;
      authErrorMessage.classList.remove("hidden");
    }
  } catch (error) {
    authErrorMessage.textContent = "Gagal terhubung ke server.";
    authErrorMessage.classList.remove("hidden");
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = isRegister ? "Daftar" : "Login";
  }
});

// Poin 7: Perbarui toggleAuthMode
function toggleAuthMode(isReg) {
  if (isReg === undefined) {
    isReg = authTitle.textContent === "Login";
  }
  if (isReg) {
    // Mode Daftar
    authTitle.textContent = "Daftar";
    authSubmitBtn.textContent = "Daftar";
    nameField.classList.remove("hidden");
    usernameField.classList.remove("hidden");
    emailField.classList.remove("hidden");
    loginField.classList.add("hidden"); // Sembunyikan field login
    document.getElementById("auth-login").required = false;
    document.getElementById("auth-name").required = true;
    document.getElementById("auth-username").required = true;
    document.getElementById("auth-email").required = true;
    toggleAuthText.textContent = "Sudah punya akun?";
    toggleAuthBtn.textContent = "Login sekarang";
  } else {
    // Mode Login
    authTitle.textContent = "Login";
    authSubmitBtn.textContent = "Login";
    nameField.classList.add("hidden");
    usernameField.classList.add("hidden");
    emailField.classList.add("hidden");
    loginField.classList.remove("hidden"); // Tampilkan field login
    document.getElementById("auth-login").required = true;
    document.getElementById("auth-name").required = false;
    document.getElementById("auth-username").required = false;
    document.getElementById("auth-email").required = false;
    toggleAuthText.textContent = "Belum punya akun?";
    toggleAuthBtn.textContent = "Daftar sekarang";
  }
  authErrorMessage.classList.add("hidden");
  authForm.reset();
}

// Perbaikan: Fungsi handle logout
async function handleLogout() {
  try {
    await fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      credentials: "include",
    });
    isAuthenticated = false;
    userBalance = 0;
    updateAuthUI();
    showNotification("Anda telah logout.", "warning");
    showProductListView(); // Kembali ke halaman produk
    toggleMobileMenu(false);
  } catch (error) {
    console.error("Logout gagal:", error);
  }
}

toggleAuthBtn.addEventListener("click", () => toggleAuthMode());
navLoginBtn.addEventListener("click", () => {
  toggleAuthMode(false);
  showModal("auth-modal");
});
navRegisterBtn.addEventListener("click", () => {
  toggleAuthMode(true);
  showModal("auth-modal");
});
navLogoutBtn.addEventListener("click", handleLogout); // Gunakan fungsi handleLogout

// Poin 6: Event listener untuk tombol profile
navProfileBtn.addEventListener("click", showProfileView);
navHomeBtn.addEventListener("click", showProductListView); // Perbaikan: Event listener tombol Home
logo.addEventListener("click", showProductListView);

// Perbaikan: Event listener untuk mobile menu
mobileMenuBtn.addEventListener("click", () => toggleMobileMenu(true));
mobileMenuCloseBtn.addEventListener("click", () => toggleMobileMenu(false));
mobileMenuOverlay.addEventListener("click", () => toggleMobileMenu(false));

// --- Product & Category Logic (Poin 2 & 3) ---

async function loadCategoriesAndProducts() {
  // Tampilkan skeleton loader
  productsGrid
    .querySelectorAll(".product-skeleton")
    .forEach((el) => el.classList.remove("hidden"));
  noProductsText.classList.add("hidden");
  productsGrid.innerHTML = ""; // Kosongkan grid dulu

  try {
    const [catResponse, prodResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/categories`),
      fetch(`${API_BASE_URL}/products`),
    ]);

    const catData = await catResponse.json();
    const prodData = await prodResponse.json();

    if (catData.success) {
      allCategories = catData.data;
    } else {
      showNotification("Gagal memuat kategori.", "error");
    }

    if (prodData.success) {
      allProducts = prodData.data;
    } else {
      showNotification("Gagal memuat produk.", "error");
    }
  } catch (error) {
    showNotification("Gagal memuat data.", "error");
  } finally {
    // Sembunyikan skeleton
    productsGrid.innerHTML = "";
    displayCategories(); // Tampilkan kategori setelah semua data dimuat
  }
}

// Fungsi untuk menampilkan kategori
function displayCategories(searchTerm = "") {
  currentView = "categories";
  currentCategory = null; // Reset
  productsGrid.innerHTML = "";
  viewTitle.textContent = "Kategori Produk";
  searchBarContainer.classList.remove("hidden");
  backToCategoriesBtn.classList.add("hidden");
  searchInput.placeholder = "Cari kategori...";
  searchInput.value = ""; // Bersihkan search input

  const categoryNames = Object.keys(allCategories);
  const filteredCategories = categoryNames.filter((name) =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Tambah card "Semua Produk"
  const allProductCard = createCategoryCard("Semua Produk", allProducts.length);
  allProductCard.addEventListener("click", () => displayProducts(null)); // null = semua produk
  productsGrid.appendChild(allProductCard);

  if (filteredCategories.length > 0) {
    filteredCategories.forEach((name) => {
      const productCount = allCategories[name] ? allCategories[name].length : 0;
      const card = createCategoryCard(name, productCount);
      card.addEventListener("click", () => displayProducts(name));
      productsGrid.appendChild(card);
    });
    noProductsText.classList.add("hidden");
  }

  if (filteredCategories.length === 0 && searchTerm) {
    noProductsText.textContent = `Tidak ada kategori "${searchTerm}" ditemukan.`;
    noProductsText.classList.remove("hidden");
  }
}

// Fungsi untuk membuat card kategori
function createCategoryCard(name, count) {
  const card = document.createElement("div");
  card.className =
    "bg-white rounded-xl card-shadow overflow-hidden transform hover:scale-[1.02] transition duration-300 ease-in-out cursor-pointer";
  card.innerHTML = `
        <div class="p-6 space-y-2 flex justify-between items-center">
            <div>
                <h3 class="text-xl font-bold text-gray-900 truncate">${name}</h3>
                <p class="text-sm text-gray-500">${count} produk</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6 text-primary">
                <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
        </div>
    `;
  return card;
}

// Fungsi untuk menampilkan produk
function displayProducts(categoryName, searchTerm = "") {
  currentView = "products";
  currentCategory = categoryName; // Simpan kategori saat ini
  productsGrid.innerHTML = "";
  searchBarContainer.classList.remove("hidden");
  backToCategoriesBtn.classList.remove("hidden");
  searchInput.placeholder = "Cari produk...";
  if (!searchTerm) searchInput.value = ""; // Bersihkan search jika tidak ada search term

  let productsToShow = [];

  if (categoryName === null) {
    // Tampilkan "Semua Produk"
    viewTitle.textContent = "Semua Produk";
    productsToShow = allProducts;
  } else {
    // Tampilkan produk dalam kategori
    viewTitle.textContent = categoryName;
    const productIds = allCategories[categoryName] || [];
    productsToShow = allProducts.filter((p) => productIds.includes(p.id));
  }

  // Filter berdasarkan pencarian
  if (searchTerm) {
    productsToShow = productsToShow.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Render produk
  if (productsToShow.length > 0) {
    productsToShow.forEach((product) => {
      productsGrid.appendChild(createProductCard(product));
    });
    noProductsText.classList.add("hidden");
  } else {
    if (searchTerm) {
      noProductsText.textContent = `Tidak ada produk "${searchTerm}" ditemukan di kategori ini.`;
    } else {
      noProductsText.textContent = "Tidak ada produk di kategori ini.";
    }
    noProductsText.classList.remove("hidden");
  }
}

// Fungsi untuk membuat card produk (tidak berubah)
function createProductCard(product) {
  const card = document.createElement("div");
  card.className =
    "bg-white rounded-xl card-shadow overflow-hidden transform hover:scale-[1.02] transition duration-300 ease-in-out cursor-pointer";
  card.innerHTML = `
        <div class="p-6 space-y-3">
            <h3 class="text-xl font-bold text-gray-900 truncate">${
              product.name
            }</h3>
            <p class="text-3xl font-extrabold text-primary">${rupiah(
              product.price
            )}</p>
            <div class="flex justify-between text-sm text-gray-600 border-t pt-3">
                <span>Stok: <span class="font-bold ${
                  product.stock > 0 ? "text-green-600" : "text-red-600"
                }">${product.stock}</span></span>
                <span>Terjual: <span class="font-bold">${
                  product.terjual || 0
                }</span></span>
            </div>
            <p class="text-sm text-gray-500 h-10 line-clamp-2">${
              product.desc || "Tidak ada deskripsi."
            }</p>
            <button data-product-id="${
              product.id
            }" class="w-full bg-indigo-500 text-white py-2 rounded-lg font-bold hover:bg-indigo-600 transition duration-150 ease-in-out mt-3 btn-detail ${
    product.stock === 0 ? "opacity-50 cursor-not-allowed" : ""
  }" ${product.stock === 0 ? "disabled" : ""}>
                ${product.stock === 0 ? "Stok Habis" : "Lihat Detail & Order"}
            </button>
        </div>
    `;
  if (product.stock > 0) {
    card
      .querySelector(".btn-detail")
      .addEventListener("click", () => showProductDetail(product.id));
  }
  return card;
}

// Event handler untuk search (Poin 3)
function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  if (currentView === "categories") {
    displayCategories(searchTerm);
  } else if (currentView === "products") {
    displayProducts(currentCategory, searchTerm);
  }
}

// Event listener untuk search dan navigasi kategori
searchInput.addEventListener("input", handleSearch);
backToCategoriesBtn.addEventListener("click", () => displayCategories());

// --- Detail Produk Logic ---

async function showProductDetail(productId) {
  if (isAuthenticated) {
    // Tampilkan template form order
    productDetailContent.innerHTML = "";
    productDetailContent.appendChild(
      productDetailTemplate.content.cloneNode(true)
    );
  } else {
    // Tampilkan template 'harus login'
    productDetailContent.innerHTML = "";
    productDetailContent.appendChild(
      loginPromptTemplate.content.cloneNode(true)
    );
    showModal("product-detail-modal");
    return;
  }

  // Tampilkan modal (mungkin masih kosong)
  showModal("product-detail-modal");

  try {
    const response = await fetch(`${API_BASE_URL}/products/${productId}`);
    const data = await response.json();

    if (data.success) {
      currentProduct = data.data;

      // Isi detail produk
      document.getElementById("detail-product-name").textContent =
        currentProduct.name;
      document.getElementById("detail-product-id").textContent =
        currentProduct.id;
      document.getElementById("detail-product-price").textContent = rupiah(
        currentProduct.price
      );
      document.getElementById("detail-product-terjual").textContent =
        currentProduct.terjual || 0;
      document.getElementById("detail-product-stock").textContent =
        currentProduct.stock;
      document.getElementById("detail-product-desc").textContent =
        currentProduct.desc || "Tidak ada deskripsi.";

      // Setup form order
      const orderForm = document.getElementById("order-form");
      const orderQuantityInput = document.getElementById("order-quantity");

      // Set max quantity sesuai stok
      orderQuantityInput.setAttribute("max", currentProduct.stock);

      updateOrderTotal(); // Hitung total awal

      // Tambahkan listener HANYA setelah elemen dibuat
      orderQuantityInput.addEventListener("input", updateOrderTotal);
      orderForm.addEventListener("submit", handleOrderSubmit);
    } else {
      showNotification("Gagal memuat detail produk.", "error");
      closeModal("product-detail-modal");
    }
  } catch (error) {
    showNotification("Gagal terhubung ke server.", "error");
    closeModal("product-detail-modal");
  }
}

function updateOrderTotal() {
  if (!currentProduct) return;
  const orderQuantityInput = document.getElementById("order-quantity");
  const orderTotalPriceSpan = document.getElementById("order-total-price");
  const orderAlertMessage = document.getElementById("order-alert-message");

  let quantity = parseInt(orderQuantityInput.value);

  // Validasi input
  if (isNaN(quantity) || quantity < 1) {
    quantity = 1;
    orderQuantityInput.value = 1;
  }

  if (quantity > currentProduct.stock) {
    quantity = currentProduct.stock;
    orderQuantityInput.value = currentProduct.stock;
    orderAlertMessage.textContent = `Stok maksimal: ${currentProduct.stock}`;
    orderAlertMessage.classList.remove("hidden");
  } else {
    orderAlertMessage.classList.add("hidden");
  }

  const total = currentProduct.price * quantity;
  orderTotalPriceSpan.textContent = rupiah(total);
}

// --- Order Logic ---

async function handleOrderSubmit(e) {
  e.preventDefault();

  const orderAlertMessage = document.getElementById("order-alert-message");
  const orderQuantityInput = document.getElementById("order-quantity");

  if (!isAuthenticated) return;

  const quantity = parseInt(orderQuantityInput.value);
  if (quantity <= 0 || isNaN(quantity) || quantity > currentProduct.stock) {
    orderAlertMessage.textContent =
      "Jumlah pesanan tidak valid atau melebihi stok.";
    orderAlertMessage.classList.remove("hidden");
    return;
  }

  const submitter = e.submitter;
  const paymentMethod = submitter.getAttribute("data-method");

  // Nonaktifkan tombol
  submitter.disabled = true;
  submitter.textContent = "Memproses...";

  closeModal("product-detail-modal");
  showNotification(
    `Memproses pesanan via ${paymentMethod.toUpperCase()}...`,
    "warning"
  );

  try {
    const response = await fetch(`${API_BASE_URL}/order/${paymentMethod}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: currentProduct.id, quantity }),
      credentials: "include",
    });
    const data = await response.json();

    if (data.success) {
      handleOrderSuccess(data, paymentMethod);
    } else {
      showNotification(data.message || "Pemesanan gagal.", "error");
    }
  } catch (error) {
    showNotification("Gagal terhubung ke server pemesanan.", "error");
  } finally {
    // Balikin tombol (Meskipun modal ditutup, ini untuk jaga-jaga)
    submitter.disabled = false;
    // Poin 4: Hapus emoji
    submitter.textContent =
      paymentMethod === "saldo" ? "Bayar Via Saldo" : "Bayar Via QRIS";
  }
}

function handleOrderSuccess(data, method) {
  orderStatusContent.innerHTML = ""; // Kosongkan dulu
  orderStatusContent.appendChild(orderStatusTemplate.content.cloneNode(true));

  const statusTitle = orderStatusContent.querySelector("#status-title");
  const statusContentDiv = orderStatusContent.querySelector("#status-content");

  if (method === "saldo") {
    // Poin 4: Hapus emoji
    statusTitle.textContent = "Pembelian Saldo Berhasil!";
    const accountsList = data.data.accounts
      .map(
        (acc, index) =>
          `<li class="font-mono bg-gray-100 p-2 rounded-md overflow-x-auto text-sm scroll-hide-scrollbar">${
            index + 1
          }. ${acc}</li>`
      )
      .join("");

    statusContentDiv.innerHTML = `
            <p class="text-lg text-green-600 font-semibold">Transaksi Anda telah selesai.</p>
            <p><strong>Total Bayar:</strong> <span class="text-primary font-bold">${data.data.totalCost}</span> (Via Saldo)</p>
            <p><strong>Reff ID:</strong> <span class="font-mono text-gray-800">${data.data.reffId}</span></p>
            <p class="font-bold text-gray-800 mt-4">Detail Akun (${data.data.accounts.length} pcs):</p>
            <ul class="space-y-2 max-h-40 overflow-y-auto">${accountsList}</ul>
        `;
    checkAuthStatus(); // Update saldo di header
  } else if (method === "qris") {
    // Poin 4: Hapus emoji
    statusTitle.textContent = "Menunggu Pembayaran QRIS";
    statusContentDiv.innerHTML = `
            <p class="text-lg text-indigo-600 font-semibold">Silakan scan kode QR di bawah.</p>
            <p><strong>Total Bayar:</strong> <span class="text-primary font-bold">${data.data.totalCost}</span> (Via QRIS)</p>
            <p><strong>Reff ID:</strong> <span class="font-mono text-gray-800">${data.data.reffId}</span></p>
            <div class="flex justify-center my-4">
                <img src="${data.data.qrLink}" alt="Kode QRIS" class="w-60 h-60 border-4 border-gray-200 rounded-lg">
            </div>
            <p class="text-sm text-center text-gray-500">Setelah pembayaran berhasil, akun akan dikirimkan. (Implementasi nyata memerlukan webhook dari Tokopay).</p>
        `;
  }
  showModal("order-status-modal");

  // Refresh stok di tampilan utama
  loadCategoriesAndProducts();
}

// --- Profile Logic (Poin 6) ---

// Ganti tab di profile
profileTabs.addEventListener("click", (e) => {
  // Cari tombol terdekat, untuk mengatasi klik di dalam tombol
  const button = e.target.closest(".tab-btn");
  if (!button) return;

  // Nonaktifkan semua
  profileTabs
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  tabContents.forEach((content) => content.classList.remove("active"));

  // Aktifkan yang diklik
  button.classList.add("active");
  const tabId = button.getAttribute("data-tab");
  document.getElementById(`tab-${tabId}`).classList.add("active");
});

// Memuat data profile (akun)
async function loadProfileData() {
  profileName.textContent = "Memuat...";
  profileUsername.textContent = "Memuat...";
  profileEmail.textContent = "Memuat...";

  try {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      credentials: "include",
    });
    const data = await response.json();

    if (data.success) {
      profileName.textContent = data.data.name;
      profileUsername.textContent = data.data.username;
      profileEmail.textContent = data.data.email;
    } else {
      showNotification(data.message, "error");
    }
  } catch (error) {
    showNotification("Gagal memuat profile.", "error");
  }
}

// Perbaikan: Memuat riwayat transaksi (Tampilan baru)
async function loadTransactionHistory() {
  transactionLoadingText.textContent = "Memuat riwayat...";
  transactionLoadingText.classList.remove("hidden");
  transactionListContainer.innerHTML = ""; // Kosongkan
  transactionListContainer.appendChild(transactionLoadingText);

  try {
    const response = await fetch(`${API_BASE_URL}/profile/transactions`, {
      credentials: "include",
    });
    const data = await response.json();

    transactionLoadingText.classList.add("hidden");

    if (data.success) {
      if (data.data.length === 0) {
        transactionLoadingText.textContent = "Belum ada riwayat transaksi.";
        transactionLoadingText.classList.remove("hidden");
        return;
      }

      data.data.forEach((tx) => {
        const txElement = document.createElement("div");
        txElement.className =
          "p-4 bg-gray-50 rounded-lg border flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2";

        // Potong akun jika terlalu panjang
        let akunDisplay = "Tidak ada detail akun.";
        if (tx.accounts.length > 0) {
          akunDisplay = tx.accounts.join(", ");
        }

        txElement.innerHTML = `
                    <div class="flex-grow">
                        <p class="font-bold text-gray-800">${
                          tx.productName
                        } (x${tx.quantity})</p>
                        <p class="text-xs text-gray-500">${formatTanggal(
                          tx.createdAt
                        )}</p>
                        ${
                          tx.accounts.length > 0
                            ? `<p class="text-xs font-mono text-gray-600 mt-1" title="${akunDisplay}">Akun: ${akunDisplay.substring(
                                0,
                                50
                              )}${akunDisplay.length > 50 ? "..." : ""}</p>`
                            : ""
                        }
                    </div>
                    <div class="text-left sm:text-right flex-shrink-0 mt-2 sm:mt-0">
                        <p class="text-base text-primary font-bold">${rupiah(
                          tx.totalAmount
                        )}</p>
                    </div>
                `;
        transactionListContainer.appendChild(txElement);
      });
    } else {
      showNotification(data.message, "error");
      transactionLoadingText.textContent = "Gagal memuat riwayat.";
      transactionLoadingText.classList.remove("hidden");
    }
  } catch (error) {
    showNotification("Gagal memuat riwayat transaksi.", "error");
    transactionLoadingText.textContent = "Gagal memuat riwayat.";
    transactionLoadingText.classList.remove("hidden");
  }
}

// Handle form ubah password
changePasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  passwordFormAlert.classList.add("hidden");
  const currentPassword = document.getElementById("current-password").value;
  const newPassword = document.getElementById("new-password").value;

  try {
    const response = await fetch(`${API_BASE_URL}/profile/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
      credentials: "include",
    });
    const data = await response.json();

    if (data.success) {
      passwordFormAlert.textContent = data.message;
      passwordFormAlert.className = "text-sm font-medium text-green-600";
      changePasswordForm.reset();
    } else {
      passwordFormAlert.textContent = data.message;
      passwordFormAlert.className = "text-sm font-medium text-red-600";
    }
    passwordFormAlert.classList.remove("hidden");
  } catch (error) {
    passwordFormAlert.textContent = "Gagal terhubung ke server.";
    passwordFormAlert.className = "text-sm font-medium text-red-600";
    passwordFormAlert.classList.remove("hidden");
  }
});

// Handle form ubah email
changeEmailForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  emailFormAlert.classList.add("hidden");
  const newEmail = document.getElementById("new-email").value;
  const password = document.getElementById("confirm-password-email").value;

  try {
    const response = await fetch(`${API_BASE_URL}/profile/change-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail, password }),
      credentials: "include",
    });
    const data = await response.json();

    if (data.success) {
      emailFormAlert.textContent = data.message;
      emailFormAlert.className = "text-sm font-medium text-green-600";
      changeEmailForm.reset();
      loadProfileData(); // Muat ulang data email di tab akun
    } else {
      emailFormAlert.textContent = data.message;
      emailFormAlert.className = "text-sm font-medium text-red-600";
    }
    emailFormAlert.classList.remove("hidden");
  } catch (error) {
    emailFormAlert.textContent = "Gagal terhubung ke server.";
    emailFormAlert.className = "text-sm font-medium text-red-600";
    emailFormAlert.classList.remove("hidden");
  }
});

// --- Initialization ---

window.addEventListener("DOMContentLoaded", () => {
  // 1. Cek status otentikasi (cookie) dan muat data user
  checkAuthStatus();
  // loadCategoriesAndProducts() dipanggil di dalam checkAuthStatus.finally
});
