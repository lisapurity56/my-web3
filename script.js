const PRODUCTS = {
  plain: {
    name: "Plain Yogourt",
    size: "450g",
    price: 2500,
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&h=400&q=65",
  },
  coconut: {
    name: "Coconut Yogourt",
    size: "450g",
    price: 3000,
    image: "https://images.unsplash.com/photo-1571212515416-fef01fc43637?auto=format&fit=crop&w=400&h=400&q=65",
  },
  fruit: {
    name: "Fruit Yogourt",
    size: "450g",
    price: 3000,
    image: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=400&h=400&q=65",
  },
  fura: {
    name: "Fura Yogourt",
    size: "450g",
    price: 3000,
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&h=400&q=65",
  },
  greek: {
    name: "Greek Yogourt",
    size: "450g",
    price: 3500,
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&h=400&q=65",
  },
  parfait: {
    name: "Parfait",
    size: "300g",
    price: 3500,
    image: "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=400&h=400&q=65",
  },
};

const WHATSAPP_NUMBER = "2348064948591";
const BUSINESS_EMAIL = "lisapurity56@gmail.com";
const BULK_DISCOUNT_RATE = 0.05;
const EVENT_DISCOUNT_RATE = 0.10;
const BULK_DISCOUNT_THRESHOLD = 10;
const EVENT_DISCOUNT_THRESHOLD = 200;
const PREORDER_NOTICE_DAYS = 2;
const CART_STORAGE_KEY = "joliza-cart-v1";

const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const printButton = document.querySelector("#print-button");
const contactForm = document.querySelector(".contact-form");
const inquiryType = document.querySelector("#inquiry-type");
const messageField = document.querySelector("#message");
const formStatus = document.querySelector("#form-status");
const cartPanel = document.querySelector("#cart-panel");
const cartBackdrop = document.querySelector("#cart-backdrop");
const cartItems = document.querySelector("#cart-items");
const cartEmpty = document.querySelector("#cart-empty");
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
      .filter((item) => PRODUCTS[item.id] && Number.isInteger(item.quantity) && item.quantity > 0)
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
  const subtotal = cart.reduce(
    (sum, item) => sum + PRODUCTS[item.id].price * item.quantity,
    0,
  );
  const discount = quantity > BULK_DISCOUNT_THRESHOLD
    ? Math.round(subtotal * BULK_DISCOUNT_RATE)
    : 0;
  return { quantity, subtotal, discount, total: subtotal - discount };
}

function renderCart() {
  if (!cartItems) return;
  cartItems.replaceChildren();
  const { quantity, subtotal, discount, total } = cartCalculations();
  cartCount.textContent = String(quantity);
  cartCount.setAttribute("aria-label", `${quantity} ${quantity === 1 ? "item" : "items"}`);
  cartOpen.setAttribute("aria-label", `Open cart, ${quantity} ${quantity === 1 ? "item" : "items"}`);
  cartEmpty.hidden = cart.length > 0;
  cartCheckout.disabled = cart.length === 0;
  cartTotal.textContent = formatMoney(total);

  cart.forEach((item) => {
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
  });

  const totals = document.createElement("div");
  totals.className = "cart-breakdown";
  const subtotalRow = document.createElement("p");
  subtotalRow.innerHTML = `<span>Subtotal</span><strong>${formatMoney(subtotal)}</strong>`;
  const discountRow = document.createElement("p");
  discountRow.className = "cart-discount";
  discountRow.innerHTML = `<span>Bulk discount (${Math.round(BULK_DISCOUNT_RATE * 100)}%)</span><strong>−${formatMoney(discount)}</strong>`;
  const totalRow = document.createElement("p");
  totalRow.className = "cart-total-row";
  totalRow.innerHTML = `<span>Total</span><strong>${formatMoney(total)}</strong>`;
  totals.append(subtotalRow, discountRow, totalRow);
  cartItems.append(totals);

  const discountMessage = document.querySelector("#discount-message");
  if (discountMessage) {
    discountMessage.textContent = quantity > BULK_DISCOUNT_THRESHOLD
      ? "Your 5% bulk discount has been applied."
      : `Add ${BULK_DISCOUNT_THRESHOLD + 1 - quantity} more ${BULK_DISCOUNT_THRESHOLD + 1 - quantity === 1 ? "item" : "items"} to unlock your 5% discount.`;
    discountMessage.hidden = quantity === 0;
  }
  persistCart();
}

function openCart() {
  if (!cartPanel.classList.contains("is-open")) {
    focusBeforeCart = document.activeElement;
    cartBackdrop.hidden = false;
    cartPanel.classList.add("is-open");
    cartPanel.setAttribute("aria-hidden", "false");
    document.body.classList.add("cart-is-open");
    cartPanel.querySelector("#cart-close").focus();
  }
}

function closeCart() {
  if (!cartPanel.classList.contains("is-open")) return;
  cartPanel.classList.remove("is-open");
  cartPanel.setAttribute("aria-hidden", "true");
  cartBackdrop.hidden = true;
  document.body.classList.remove("cart-is-open");
  if (focusBeforeCart instanceof HTMLElement) focusBeforeCart.focus();
}

function showAddedToast(product) {
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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setOrderMode(mode) {
  orderMode = mode;
  const isPreorder = mode === "preorder";
  preorderDateField.hidden = !isPreorder;
  checkoutDate.required = isPreorder;
  checkoutDate.min = localDateAfter(PREORDER_NOTICE_DAYS);
  checkoutForm.hidden = false;
  checkoutStatus.hidden = true;
  checkoutStatus.classList.remove("success", "error");
  cartCheckout.hidden = true;
  checkoutForm.querySelector("#checkout-name").focus();
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
  if (!cartPanel.classList.contains("is-open")) return;
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
    document.querySelector("#pre-order .preorder-hint").textContent =
      "Please add one or more flavours to your cart before starting a pre-order.";
    document.querySelector("#flavours").scrollIntoView({ behavior: "smooth" });
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
    checkoutStatus.hidden = false;
    checkoutStatus.classList.add("error");
    checkoutStatus.textContent = "Enter a valid phone number so we can reach you.";
    document.querySelector("#checkout-phone").focus();
    return;
  }
  if (orderMode === "preorder" && details.delivery_date < localDateAfter(PREORDER_NOTICE_DAYS)) {
    checkoutStatus.hidden = false;
    checkoutStatus.classList.add("error");
    checkoutStatus.textContent = "Choose a date at least two days from today.";
    checkoutDate.focus();
    return;
  }

  const calculations = cartCalculations();
  const message = buildCartMessage(details, calculations);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
  cart = [];
  persistCart();
  renderCart();
  checkoutForm.reset();
  preorderDateField.hidden = true;
  checkoutForm.hidden = true;
  cartCheckout.hidden = false;
  checkoutStatus.hidden = false;
  checkoutStatus.classList.remove("success", "error");
  checkoutStatus.classList.add("success");
  checkoutStatus.textContent = "Thank you! We'll confirm on WhatsApp shortly.";
  checkoutStatus.scrollIntoView({ block: "nearest" });
});

menuToggle?.addEventListener("click", () => {
  const isOpen = siteNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
});

siteNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    siteNav.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

printButton?.addEventListener("click", () => window.print());

document.querySelectorAll("[data-inquiry-type]").forEach((link) => {
  link.addEventListener("click", () => {
    inquiryType.value = link.dataset.inquiryType;
    if (link.dataset.product && !messageField.value.trim()) {
      messageField.value = `I'm interested in: ${link.dataset.product}.`;
    }
  });
});

["input", "change"].forEach((eventName) => {
  contactForm?.addEventListener(eventName, (event) => {
    const field = event.target;
    if (!field.id) return;
    const error = contactForm.querySelector(`#${field.id}-error`);
    if (!error || !field.hasAttribute("aria-invalid")) return;
    field.removeAttribute("aria-invalid");
    error.hidden = true;
    error.textContent = "";
  });
});

contactForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (contactForm.querySelector("#website").value.trim()) return;

  const details = Object.fromEntries(new FormData(contactForm));
  formStatus.hidden = true;
  formStatus.classList.remove("error");
  const fields = [
    {
      input: inquiryType,
      error: contactForm.querySelector("#inquiry-type-error"),
      invalid: !details.inquiry_type?.trim(),
      message: "Please choose a topic.",
    },
    {
      input: contactForm.querySelector("#name"),
      error: contactForm.querySelector("#name-error"),
      invalid: !details.name?.trim(),
      message: "Please enter your name.",
    },
    {
      input: contactForm.querySelector("#email"),
      error: contactForm.querySelector("#email-error"),
      invalid: Boolean(details.email?.trim()) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim()),
      message: "Enter a valid email address or leave this field blank.",
    },
    {
      input: messageField,
      error: contactForm.querySelector("#message-error"),
      invalid: !details.message?.trim(),
      message: "Please enter a message.",
    },
  ];
  let firstInvalidField = null;
  for (const field of fields) {
    field.input.setAttribute("aria-invalid", String(field.invalid));
    field.error.textContent = field.invalid ? field.message : "";
    field.error.hidden = !field.invalid;
    if (field.invalid && !firstInvalidField) firstInvalidField = field.input;
  }
  if (firstInvalidField) {
    firstInvalidField.focus();
    return;
  }

  const message = [
    "JOLIZA MESSAGE",
    `Topic: ${inquiryType.options[inquiryType.selectedIndex].text}`,
    `Name: ${details.name.trim()}`,
    ...(details.email.trim() ? [`Email: ${details.email.trim()}`] : []),
    `Message: ${details.message.trim()}`,
  ].join("\n");
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
  contactForm.reset();
  formStatus.hidden = false;
  formStatus.classList.remove("error");
  formStatus.textContent = "Thank you! We'll reply on WhatsApp shortly.";
  for (const field of fields) {
    field.input.removeAttribute("aria-invalid");
    field.error.hidden = true;
    field.error.textContent = "";
  }
});

function updateEventSummary() {
  if (!eventSummary || !eventProduct || !eventQuantity) return;
  const quantity = Number(eventQuantity.value);
  const product = PRODUCTS[eventProduct.value];
  if (!product || !Number.isInteger(quantity) || quantity < 1) {
    eventSummary.textContent = "Select a flavour and enter the number of servings to see an estimate.";
    return;
  }
  const subtotal = product.price * quantity;
  const discount = quantity > EVENT_DISCOUNT_THRESHOLD
    ? Math.round(subtotal * EVENT_DISCOUNT_RATE)
    : 0;
  eventSummary.textContent = quantity > EVENT_DISCOUNT_THRESHOLD
    ? `Estimated total: ${formatMoney(subtotal - discount)} · Includes 10% event discount (−${formatMoney(discount)}).`
    : `Estimated total: ${formatMoney(subtotal)} · Add ${EVENT_DISCOUNT_THRESHOLD + 1 - quantity} ${EVENT_DISCOUNT_THRESHOLD + 1 - quantity === 1 ? "serving" : "servings"} to unlock 10% off.`;
}

if (eventProduct) {
  for (const [id, product] of Object.entries(PRODUCTS)) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = `${product.name} (${product.size}) — ${formatMoney(product.price)}`;
    eventProduct.append(option);
  }
  eventProduct.addEventListener("change", updateEventSummary);
  eventQuantity?.addEventListener("input", updateEventSummary);
  updateEventSummary();
}

eventForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const details = Object.fromEntries(new FormData(eventForm));
  eventStatus.hidden = true;
  eventStatus.classList.remove("success", "error");
  if (!details.name.trim() || !details.phone.trim() || !details.event_date) {
    eventStatus.hidden = false;
    eventStatus.classList.add("error");
    eventStatus.textContent = "Please enter your name, phone number, and event date before continuing.";
    document.querySelector(!details.name.trim() ? "#event-name" : !details.phone.trim() ? "#event-phone" : "#event-date").focus();
    return;
  }
  if (!eventForm.reportValidity()) return;
  const phoneDigits = details.phone.replace(/\D/g, "").length;
  if (phoneDigits < 7) {
    eventStatus.hidden = false;
    eventStatus.classList.add("error");
    eventStatus.textContent = "Enter a valid phone number so we can reach you.";
    document.querySelector("#event-phone").focus();
    return;
  }
  if (details.event_date < localDateAfter(0)) {
    eventStatus.hidden = false;
    eventStatus.classList.add("error");
    eventStatus.textContent = "Choose an event date that is today or later.";
    document.querySelector("#event-date").focus();
    return;
  }
  const product = PRODUCTS[details.product];
  const quantity = Number(details.quantity);
  const subtotal = quantity * product.price;
  const discount = quantity > EVENT_DISCOUNT_THRESHOLD
    ? Math.round(subtotal * EVENT_DISCOUNT_RATE)
    : 0;
  const message = [
    "JOLIZA EVENT BOOKING",
    `Name: ${details.name}`,
    `Phone: ${details.phone}`,
    `Event: ${details.event_type}`,
    `Date: ${details.event_date}`,
    `Location: ${details.location}`,
    `Guests: ${details.guests}`,
    `Yogourt: ${product.name} (${product.size}) x ${quantity} @ ${formatMoney(product.price)}`,
    `Subtotal: ${formatMoney(subtotal)}`,
    `Event discount (10%): −${formatMoney(discount)}`,
    `Total: ${formatMoney(subtotal - discount)}`,
    ...(details.note ? [`Note: ${details.note}`] : []),
  ].join("\n");
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
  eventForm.reset();
  updateEventSummary();
  eventStatus.hidden = false;
  eventStatus.classList.add("success");
  eventStatus.textContent = "Thank you! We'll confirm on WhatsApp shortly.";
});

async function loadReviews() {
  if (!reviewList) return;
  try {
    const response = await fetch("/api/reviews");
    if (!response.ok) throw new Error("Reviews couldn't be loaded.");
    const reviews = await response.json();
    reviewList.replaceChildren();
    if (!reviews.length) {
      const empty = document.createElement("p");
      empty.className = "review-message";
      empty.textContent = "Be the first to share a Joliza moment.";
      reviewList.append(empty);
      return;
    }
    for (const review of reviews) {
      const card = document.createElement("article");
      card.className = "review-card";
      const rating = document.createElement("p");
      rating.className = "review-stars";
      rating.textContent = `${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}`;
      rating.setAttribute("aria-label", `${review.rating} out of 5 stars`);
      const comment = document.createElement("blockquote");
      comment.textContent = review.comment;
      const author = document.createElement("p");
      author.className = "review-author";
      author.textContent = review.name;
      card.append(rating, comment, author);
      reviewList.append(card);
    }
  } catch (error) {
    console.error("Unable to load reviews.", error);
    const unavailable = document.createElement("p");
    unavailable.className = "review-message review-message-error";
    unavailable.textContent = "We can't load reviews just now. Please check back shortly.";
    reviewList.replaceChildren(unavailable);
  } finally {
    reviewList.setAttribute("aria-busy", "false");
  }
}

function updateReviewRating() {
  const selectedRating = Number(reviewForm?.querySelector('input[name="rating"]:checked')?.value || 0);
  reviewForm?.querySelectorAll(".rating-options label").forEach((label) => {
    const rating = Number(label.querySelector('input[name="rating"]').value);
    label.classList.toggle("is-selected", rating <= selectedRating);
  });
}

reviewForm?.querySelectorAll('input[name="rating"]').forEach((input) => {
  input.addEventListener("change", updateReviewRating);
});
updateReviewRating();

reviewForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!reviewForm.reportValidity()) return;
  const submitButton = reviewForm.querySelector('button[type="submit"]');
  const originalText = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.textContent = "Submitting…";
  reviewStatus.hidden = true;
  reviewStatus.classList.remove("error");
  try {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(reviewForm))),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "We couldn't submit your review.");
    reviewForm.reset();
    updateReviewRating();
    reviewStatus.hidden = false;
    reviewStatus.textContent = result.message;
  } catch (error) {
    reviewStatus.hidden = false;
    reviewStatus.classList.add("error");
    reviewStatus.textContent = error instanceof TypeError
      ? "We couldn't reach the server. Please try again."
      : error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  }
});

const eventDate = document.querySelector("#event-date");
if (eventDate) eventDate.min = localDateAfter(0);

renderCart();
loadReviews();
