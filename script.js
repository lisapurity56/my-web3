const PRODUCTS = {
  plain: {
    name: "Plain Yogourt",
    size: "450g",
    price: 2500,
    image: "image/plain yogourt.jpeg",
  },
  coconut: {
    name: "Coconut Yogourt",
    size: "450g",
    price: 3000,
    image: "image/coconut yogourt.jpeg",
  },
  fruit: {
    name: "Fruit Yogourt",
    size: "450g",
    price: 3000,
    image: "image/Joliza Fruit Yogurt Freshness.jpeg",
  },
  fura: {
    name: "Fura Yogourt",
    size: "450g",
    price: 3000,
    image: "image/fura yogourt.jpeg",
  },
  greek: {
    name: "Greek Yogourt",
    size: "450g",
    price: 3500,
    image: "image/greek yogourt.jpeg",
  },
  parfait: {
    name: "Parfait",
    size: "300g",
    price: 3500,
    image: "image/Joliza Berry Granola Parfait.jpeg",
  },
};

const WHATSAPP_LINK = "https://wa.me/2348064948591";
const BUSINESS_EMAIL = "lisapurity56@gmail.com";
const BULK_DISCOUNT_RATE = 0.05;
const EVENT_DISCOUNT_RATE = 0.10;
const BULK_DISCOUNT_THRESHOLD = 10;
const EVENT_DISCOUNT_THRESHOLD = 200;
const PREORDER_NOTICE_DAYS = 2;
const CART_STORAGE_KEY = "joliza-cart-v1";

function whatsappMessageUrl(message) {
  const url = new URL(WHATSAPP_LINK);
  url.searchParams.set("text", message);
  return url.toString();
}

const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const printButton = document.querySelector("#print-button");
const contactForm = document.querySelector(".contact-form");
const inquiryType = document.querySelector("#inquiry-type");
const messageField = document.querySelector("#message");
const formStatus = document.querySelector("#form-status");
const cartPanel = document.querySelector("#cart-panel, #cart-dialog, .cart-panel, .cart-dialog");
const cartBackdrop = document.querySelector("#cart-backdrop");
const cartItems = document.querySelector("#cart-items");
const cartEmpty = document.querySelector("#cart-empty");
const cartSummary = document.querySelector("#cart-summary");
const cartBreakdown = document.querySelector("#cart-breakdown");
const cartCount = document.querySelector("#cart-count");
const cartOpen = document.querySelector("#cart-open");
const cartCheckout = document.querySelector("#cart-checkout");
const checkoutForm = document.querySelector("#checkout-form");
const checkoutStatus = document.querySelector("#checkout-status");
const checkoutDate = document.querySelector("#checkout-date");
const preorderDateField = document.querySelector("#preorder-date-field");
const cartTotal = document.querySelector("#cart-total");
const cartToast = document.querySelector("#cart-toast");
const eventForm = document.querySelector("#event-form");
const eventSummary = document.querySelector("#event-summary");
const eventProduct = document.querySelector("#event-product");
const eventQuantity = document.querySelector("#event-quantity");
const eventStatus = document.querySelector("#event-status");
const reviewForm = document.querySelector("#review-form");
const reviewStatus = document.querySelector("#review-status");
const reviewList = document.querySelector("#review-list");

function loadCart() {
  try {
    const storedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    if (!Array.isArray(storedCart)) throw new TypeError("Saved cart is not a list.");
    return storedCart
      .filter((item) => item && PRODUCTS[item.id] && Number.isInteger(item.quantity) && item.quantity > 0)
      .map(({ id, quantity }) => ({ id, quantity: Math.min(quantity, 99) }));
  } catch (error) {
    console.error("Unable to restore the saved cart.", error);
    return [];
  }
}

let cart = loadCart();
let orderMode = "order";
let focusBeforeCart = null;
let toastTimer;

function persistCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error("Unable to save the cart in this browser.", error);
  }
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function cartCalculations() {
  const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + PRODUCTS[item.id].price * item.quantity, 0);
  const discount = quantity > BULK_DISCOUNT_THRESHOLD
    ? Math.round(subtotal * BULK_DISCOUNT_RATE)
    : 0;
  return { quantity, subtotal, discount, total: subtotal - discount };
}

function renderCart() {
  if (!cartItems) return;
  cartItems.replaceChildren();
  const { quantity, subtotal, discount, total } = cartCalculations();
  if (cartCount) {
    cartCount.textContent = String(quantity);
    cartCount.setAttribute("aria-label", `${quantity} ${quantity === 1 ? "item" : "items"}`);
  }
  cartOpen?.setAttribute("aria-label", `Open cart, ${quantity} ${quantity === 1 ? "item" : "items"}`);
  if (cartEmpty) cartEmpty.hidden = cart.length > 0;
  if (cartSummary) cartSummary.hidden = cart.length === 0;
  if (cartCheckout) cartCheckout.disabled = cart.length === 0;
  if (cartTotal) cartTotal.textContent = formatMoney(total);

  for (const item of cart) {
    const product = PRODUCTS[item.id];
    const row = document.createElement("article");
    row.className = "cart-item";

    const image = document.createElement("img");
    image.className = "cart-item-photo";
    image.src = product.image;
    image.alt = "";
    image.loading = "lazy";
    image.width = 96;
    image.height = 96;

    const details = document.createElement("div");
    details.className = "cart-item-details";
    const title = document.createElement("h3");
    title.textContent = product.name;
    const meta = document.createElement("p");
    meta.className = "cart-item-meta";
    meta.textContent = `${product.size} · ${formatMoney(product.price)} each`;
    const lineTotal = document.createElement("strong");
    lineTotal.className = "cart-item-price";
    lineTotal.textContent = formatMoney(product.price * item.quantity);
    details.append(title, meta, lineTotal);

    const controls = document.createElement("div");
    controls.className = "cart-item-controls";
    const quantityControl = document.createElement("div");
    quantityControl.className = "cart-quantity";
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.textContent = "−";
    decrease.setAttribute("aria-label", `Remove one ${product.name}`);
    decrease.dataset.cartAction = "decrease";
    decrease.dataset.productId = item.id;
    const amount = document.createElement("span");
    amount.textContent = String(item.quantity);
    amount.setAttribute("aria-label", `Quantity ${item.quantity}`);
    const increase = document.createElement("button");
    increase.type = "button";
    increase.textContent = "+";
    increase.setAttribute("aria-label", `Add one ${product.name}`);
    increase.dataset.cartAction = "increase";
    increase.dataset.productId = item.id;
    quantityControl.append(decrease, amount, increase);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "cart-remove";
    remove.textContent = "Remove";
    remove.dataset.cartAction = "remove";
    remove.dataset.productId = item.id;
    controls.append(quantityControl, remove);
    row.append(image, details, controls);
    cartItems.append(row);
  }

  if (cartBreakdown) {
    cartBreakdown.replaceChildren();
    const subtotalRow = document.createElement("p");
    const subtotalValue = document.createElement("strong");
    subtotalValue.textContent = formatMoney(subtotal);
    subtotalRow.append("Subtotal", subtotalValue);
    cartBreakdown.append(subtotalRow);
    if (discount > 0) {
      const discountRow = document.createElement("p");
      discountRow.className = "cart-discount";
      const discountValue = document.createElement("strong");
      discountValue.textContent = `−${formatMoney(discount)}`;
      discountRow.append(`Bulk discount (${Math.round(BULK_DISCOUNT_RATE * 100)}%)`, discountValue);
      cartBreakdown.append(discountRow);
    }
  }

  persistCart();
}

function openCart() {
  if (!cartPanel || cartPanel.classList.contains("is-open")) return;
  focusBeforeCart = document.activeElement;
  if (cartBackdrop) cartBackdrop.hidden = false;
  cartPanel.classList.add("is-open");
  cartPanel.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-is-open");
  cartPanel.querySelector("#cart-close")?.focus();
}

function closeCart() {
  if (!cartPanel?.classList.contains("is-open")) return;
  cartPanel.classList.remove("is-open");
  cartPanel.setAttribute("aria-hidden", "true");
  if (cartBackdrop) cartBackdrop.hidden = true;
  document.body.classList.remove("cart-is-open");
  focusBeforeCart?.focus();
}

function showAddedToast(product) {
  if (!cartToast) return;
  cartToast.replaceChildren();
  const photo = document.createElement("img");
  photo.src = product.image;
  photo.alt = "";
  photo.width = 56;
  photo.height = 56;
  const message = document.createElement("span");
  message.textContent = `${product.name} — Added to cart`;
  cartToast.append(photo, message);
  cartToast.hidden = false;
  cartToast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    cartToast.classList.remove("is-visible");
    cartToast.hidden = true;
  }, 3000);
}

function localDateAfter(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function setOrderMode(mode) {
  orderMode = mode;
  const isPreorder = mode === "preorder";
  if (preorderDateField) preorderDateField.hidden = !isPreorder;
  if (checkoutDate) {
    checkoutDate.required = isPreorder;
    checkoutDate.min = localDateAfter(PREORDER_NOTICE_DAYS);
  }
  if (checkoutForm) checkoutForm.hidden = false;
  if (checkoutStatus) {
    checkoutStatus.hidden = true;
    checkoutStatus.classList.remove("success", "error");
  }
  if (cartCheckout) cartCheckout.hidden = true;
  checkoutForm?.querySelector("#checkout-name")?.focus();
}

function buildCartMessage(details, calculations) {
  const lines = [
    orderMode === "preorder" ? "JOLIZA PRE-ORDER" : "JOLIZA ORDER",
    `Name: ${details.name}`,
    `Phone: ${details.phone}`,
    `Delivery address: ${details.address}`,
  ];
  if (orderMode === "preorder") lines.push(`Preferred date: ${details.delivery_date}`);
  lines.push("", "Items:");
  for (const item of cart) {
    const product = PRODUCTS[item.id];
    lines.push(`- ${product.name} (${product.size}) x ${item.quantity} @ ${formatMoney(product.price)} = ${formatMoney(product.price * item.quantity)}`);
  }
  lines.push(
    "",
    `Subtotal: ${formatMoney(calculations.subtotal)}`,
    `Bulk discount (5%): −${formatMoney(calculations.discount)}`,
    `Total: ${formatMoney(calculations.total)}`,
  );
  if (details.note) lines.push(`Note: ${details.note}`);
  return lines.join("\n");
}

cartOpen?.addEventListener("click", openCart);
document.querySelector("#cart-close")?.addEventListener("click", closeCart);
cartBackdrop?.addEventListener("click", closeCart);

document.addEventListener("keydown", (event) => {
  if (!cartPanel?.classList.contains("is-open")) return;
  if (event.key === "Escape") {
    closeCart();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = [...cartPanel.querySelectorAll(
    'button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), textarea:not([disabled]):not([hidden]), select:not([disabled]):not([hidden]), a[href]',
  )].filter((element) => element.getClientRects().length > 0);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

document.querySelectorAll("[data-add-to-cart]").forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.dataset.addToCart;
    const product = PRODUCTS[id];
    if (!product) return;
    const existing = cart.find((item) => item.id === id);
    if (existing) existing.quantity = Math.min(99, existing.quantity + 1);
    else cart.push({ id, quantity: 1 });
    renderCart();
    showAddedToast(product);
  });
});

cartItems?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cart-action]");
  if (!button) return;
  const item = cart.find((entry) => entry.id === button.dataset.productId);
  if (!item) return;
  if (button.dataset.cartAction === "increase") item.quantity = Math.min(99, item.quantity + 1);
  if (button.dataset.cartAction === "decrease") item.quantity -= 1;
  if (button.dataset.cartAction === "remove" || item.quantity <= 0) {
    cart = cart.filter((entry) => entry.id !== button.dataset.productId);
  }
  renderCart();
});

cartCheckout?.addEventListener("click", () => setOrderMode("order"));
document.querySelector("#preorder-start")?.addEventListener("click", () => {
  if (!cart.length) {
    const hint = document.querySelector("#pre-order .preorder-hint");
    if (hint) hint.textContent = "Please add one or more flavours to your cart before starting a pre-order.";
    document.querySelector("#flavours")?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  openCart();
  setOrderMode("preorder");
});

checkoutForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!checkoutForm.reportValidity()) return;
  const details = Object.fromEntries(new FormData(checkoutForm));
  if (details.phone.replace(/\D/g, "").length < 7) {
    if (checkoutStatus) {
      checkoutStatus.hidden = false;
      checkoutStatus.classList.add("error");
      checkoutStatus.textContent = "Enter a valid phone number so we can reach you.";
    }
    document.querySelector("#checkout-phone")?.focus();
    return;
  }
  if (orderMode === "preorder" && details.delivery_date < localDateAfter(PREORDER_NOTICE_DAYS)) {
    if (checkoutStatus) {
      checkoutStatus.hidden = false;
      checkoutStatus.classList.add("error");
      checkoutStatus.textContent = "Choose a date at least two days from today.";
    }
    checkoutDate?.focus();
    return;
  }

  const message = buildCartMessage(details, cartCalculations());
  const whatsappUrl = whatsappMessageUrl(message);
  cart = [];
  persistCart();
  renderCart();
  checkoutForm.reset();
  if (preorderDateField) preorderDateField.hidden = true;
  checkoutForm.hidden = true;
  if (cartCheckout) cartCheckout.hidden = false;
  if (checkoutStatus) {
    checkoutStatus.hidden = false;
    checkoutStatus.classList.remove("success", "error");
    checkoutStatus.classList.add("success");
    checkoutStatus.textContent = "Thank you! We'll confirm on WhatsApp shortly.";
    checkoutStatus.scrollIntoView({ block: "nearest" });
  }
  window.location.assign(whatsappUrl);
});

renderCart();
