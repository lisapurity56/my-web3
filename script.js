const PRODUCTS = {
  plain: {
    name: "Plain Yogourt",
    size: "35cl",
    price: 2500,
    image: "image/Gemini_Generated_Image_i75vtmi75vtmi75v.jpeg",
  },
  coconut: {
    name: "Coconut Yogourt",
    size: "35cl",
    price: 1500,
    image: "image/Gemini_Generated_Image_pe4jo1pe4jo1pe4j.jpeg",
  },
  fruit: {
    name: "Fruit Yogourt",
    size: "35cl",
    price: 3000,
    image: "image/fruit yogourt.jpeg",
  },
  fura: {
    name: "Fura Yogourt",
    size: "35cl",
    price: 1800,
    image: "image/Gemini_Generated_Image_m5ara7m5ara7m5ar.jpeg",
  },
  greek: {
    name: "Greek Yogourt",
    size: "350ml",
    price: 4000,
    image: "image/Gemini_Generated_Image_ltn2vvltn2vvltn2.jpeg",
  },
  parfait: {
    name: "Parfait",
    size: "350ml",
    price: 5000,
    image: "image/Joliza Yogourt Parfait with Fresh Berries.png",
  },
};

const BUSINESS_EMAIL = "lisapurity56@gmail.com";
const BULK_DISCOUNT_RATE = 0.05;
const EVENT_DISCOUNT_RATE = 0.10;
const BULK_DISCOUNT_THRESHOLD = 10;
const EVENT_DISCOUNT_THRESHOLD = 200;
const PREORDER_NOTICE_DAYS = 2;
const CART_STORAGE_KEY = "joliza-cart-v1";
const FLAVOURS = ["Vanilla", "Strawberry", "Banana", "Mango", "Coco", "Mixfruit"];
const MAX_FLAVOUR_QUANTITY = 50;
const API_BASE_URL = window.location.port === "5500" ? "http://127.0.0.1:8000" : "";

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
const eventFlavourFieldset = document.querySelector("#event-flavour-fieldset");
const eventFlavourOptions = document.querySelector("#event-flavour-options");
const eventFlavourSummary = document.querySelector("#event-flavour-summary");
const eventFlavourError = document.querySelector("#event-flavour-error");
const eventStatus = document.querySelector("#event-status");
const reviewForm = document.querySelector("#review-form");
const reviewStatus = document.querySelector("#review-status");
const reviewList = document.querySelector("#review-list");

function normaliseFlavourQuantity(value) {
  const quantity = Number(value);
  return Number.isFinite(quantity)
    ? Math.max(0, Math.min(MAX_FLAVOUR_QUANTITY, Math.trunc(quantity)))
    : 0;
}

function selectedEventFlavours() {
  return [...(eventFlavourOptions?.querySelectorAll(".event-flavour-quantity") ?? [])]
    .map((input) => ({
      flavour: input.dataset.flavour,
      quantity: normaliseFlavourQuantity(input.value),
    }))
    .filter(({ quantity }) => quantity > 0);
}

function updateEventFlavourSummary() {
  const selected = selectedEventFlavours();
  const total = selected.reduce((sum, item) => sum + item.quantity, 0);
  for (const input of eventFlavourOptions?.querySelectorAll(".event-flavour-quantity") ?? []) {
    const quantity = normaliseFlavourQuantity(input.value);
    if (input.value && input.value !== String(quantity)) input.value = String(quantity);
    input.closest(".event-flavour-row")?.classList.toggle("is-selected", quantity > 0);
    const controls = input.closest(".event-flavour-controls");
    const decrement = controls?.querySelector('[data-quantity-change="-1"]');
    const increment = controls?.querySelector('[data-quantity-change="1"]');
    if (decrement) decrement.disabled = quantity === 0;
    if (increment) increment.disabled = quantity === MAX_FLAVOUR_QUANTITY;
  }
  if (eventFlavourSummary) {
    eventFlavourSummary.textContent = total
      ? `Selected: ${selected.map(({ flavour, quantity }) => `${quantity} ${flavour}`).join(", ")} (Total: ${total})`
      : "No flavour selected";
  }
  if (total > 0) {
    if (eventFlavourError) eventFlavourError.hidden = true;
    eventFlavourFieldset?.removeAttribute("aria-invalid");
  }
}

if (eventFlavourOptions) {
  for (const flavour of FLAVOURS) {
    const row = document.createElement("div");
    row.className = "event-flavour-row";
    const name = document.createElement("span");
    name.className = "event-flavour-name";
    name.textContent = flavour;

    const controls = document.createElement("div");
    controls.className = "event-flavour-controls";
    const quantityButtons = [];
    const quantity = document.createElement("input");
    quantity.className = "event-flavour-quantity";
    quantity.type = "number";
    quantity.inputMode = "numeric";
    quantity.min = "0";
    quantity.max = String(MAX_FLAVOUR_QUANTITY);
    quantity.step = "1";
    quantity.value = "0";
    quantity.dataset.flavour = flavour;
    quantity.setAttribute("aria-label", `Quantity for ${flavour}`);
    quantity.addEventListener("input", () => {
      const normalised = String(normaliseFlavourQuantity(quantity.value));
      if (quantity.value && quantity.value !== normalised) quantity.value = normalised;
      updateEventFlavourSummary();
    });
    quantity.addEventListener("change", () => {
      quantity.value = String(normaliseFlavourQuantity(quantity.value));
      updateEventFlavourSummary();
    });

    for (const [change, symbol, label] of [
      [-1, "-", `Decrease ${flavour} quantity`],
      [1, "+", `Increase ${flavour} quantity`],
    ]) {
      const button = document.createElement("button");
      button.className = "flavour-quantity-button";
      button.type = "button";
      button.textContent = symbol;
      button.setAttribute("aria-label", label);
      button.dataset.quantityChange = String(change);
      button.addEventListener("click", () => {
        quantity.value = String(normaliseFlavourQuantity(quantity.value) + change);
        updateEventFlavourSummary();
      });
      quantityButtons.push(button);
    }

    controls.append(quantityButtons[0], quantity, quantityButtons[1]);
    row.append(name, controls);
    eventFlavourOptions.append(row);
  }
  updateEventFlavourSummary();
}

async function postInquiry(payload) {
  console.log("Submitting inquiry to /api/inquiries", payload);
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/inquiries`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Could not connect to the inquiry API.", error);
    const url = `${API_BASE_URL || window.location.origin}/api/inquiries`;
    const nextStep = API_BASE_URL
      ? "Start the local backend with `python3 server.py` and retry."
      : "Check that the API service is running and retry.";
    throw new Error(`Cannot reach ${url}. ${nextStep}`);
  }
  const responseText = await response.text();
  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    console.error("Inquiry API returned a non-JSON response.", response.status, responseText);
    throw new Error(`The server returned an unexpected response (HTTP ${response.status}). Check the API URL and server.`);
  }
  console.log("Inquiry API response", response.status, result);
  if (!response.ok) {
    throw new Error(typeof result.error === "string" ? result.error : `The request failed (HTTP ${response.status}).`);
  }
  return result;
}

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!contactForm.reportValidity()) return;

  const submitButton = contactForm.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  if (formStatus) {
    formStatus.hidden = true;
    formStatus.classList.remove("error");
  }

  try {
    const formData = new FormData(contactForm);
    const result = await postInquiry({
      inquiry_type: formData.get("inquiry_type"),
      name: formData.get("name"),
      email: formData.get("email"),
      message: formData.get("message"),
      website: formData.get("website"),
      flavours: [],
    });
    if (formStatus) {
      formStatus.hidden = false;
      formStatus.textContent = result.message;
    }
    contactForm.reset();
  } catch (error) {
    console.error("Unable to submit inquiry.", error);
    if (formStatus) {
      formStatus.hidden = false;
      formStatus.classList.add("error");
      formStatus.textContent = error instanceof Error ? error.message : "Your message couldn't be sent. Please try again.";
    }
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

eventForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const flavours = selectedEventFlavours();
  const totalFlavourQuantity = flavours.reduce((sum, item) => sum + item.quantity, 0);
  if (totalFlavourQuantity < 1) {
    if (eventFlavourError) eventFlavourError.hidden = false;
    eventFlavourFieldset?.setAttribute("aria-invalid", "true");
    eventFlavourOptions?.querySelector(".event-flavour-quantity")?.focus();
    return;
  }
  if (eventFlavourError) eventFlavourError.hidden = true;
  eventFlavourFieldset?.removeAttribute("aria-invalid");
  if (!eventForm.reportValidity()) return;

  const formData = new FormData(eventForm);
  const eventDetails = {
    name: formData.get("name"),
    phone: formData.get("phone"),
    event_type: formData.get("event_type"),
    event_date: formData.get("event_date"),
    location: formData.get("location"),
    guests: Number(formData.get("guests")),
    quantity: Number(formData.get("quantity")),
    flavours,
    note: formData.get("note"),
  };
  const message = [
    `Phone: ${eventDetails.phone}`,
    `Event type: ${eventDetails.event_type}`,
    `Event date: ${eventDetails.event_date}`,
    `Location: ${eventDetails.location}`,
    `Number of guests: ${eventDetails.guests}`,
    `Yogourt servings: ${eventDetails.quantity}`,
    `Flavours: ${eventDetails.flavours.map(({ flavour, quantity }) => `${quantity} ${flavour}`).join(", ")}`,
    eventDetails.note ? `Additional notes: ${eventDetails.note}` : "",
  ].filter(Boolean).join("\n");
  const payload = {
    inquiry_type: "event",
    ...eventDetails,
    email: "",
    message,
  };
  const submitButton = eventForm.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  if (eventStatus) {
    eventStatus.hidden = true;
    eventStatus.classList.remove("error", "success");
  }

  try {
    const result = await postInquiry(payload);
    if (eventStatus) {
      eventStatus.hidden = false;
      eventStatus.classList.add("success");
      eventStatus.textContent = result.message;
    }
    eventForm.reset();
    updateEventFlavourSummary();
  } catch (error) {
    console.error("Unable to submit event inquiry.", error);
    if (eventStatus) {
      eventStatus.hidden = false;
      eventStatus.classList.add("error");
      eventStatus.textContent = error instanceof Error ? error.message : "Your event enquiry couldn't be sent. Please try again.";
    }
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

function setNavigationOpen(isOpen) {
  if (!menuToggle || !siteNav) return;
  siteNav.classList.toggle("open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
}

menuToggle?.addEventListener("click", () => {
  setNavigationOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});
siteNav?.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.closest("a")) setNavigationOpen(false);
});

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

eventForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!eventForm.reportValidity()) return;

  const details = Object.fromEntries(new FormData(eventForm));
  const lines = [
    "JOLIZA EVENT ENQUIRY",
    `Name: ${details.name}`,
    `Phone: ${details.phone}`,
    `Event type: ${details.event_type}`,
    `Event date: ${details.event_date}`,
    `Location: ${details.location}`,
    `Number of guests: ${details.guests}`,
    `Yogourt servings: ${details.quantity}`,
    `Yogourt flavour: ${details.product}`,
  ];
  if (details.note) lines.push(`Anything else: ${details.note}`);

  const whatsappUrl = whatsappMessageUrl(lines.join("\n"));
  if (eventStatus) {
    eventStatus.hidden = false;
    eventStatus.classList.remove("error");
    eventStatus.classList.add("success");
    eventStatus.replaceChildren(
      document.createTextNode("WhatsApp should open with your booking details. If it doesn't, "),
    );
    const whatsappLink = document.createElement("a");
    whatsappLink.href = whatsappUrl;
    whatsappLink.target = "_blank";
    whatsappLink.rel = "noopener noreferrer";
    whatsappLink.textContent = "open WhatsApp";
    eventStatus.append(whatsappLink, document.createTextNode(" and tap Send to complete your enquiry."));
  }
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
});

function showReviewStatus(message, isError = false) {
  if (!reviewStatus) return;
  reviewStatus.hidden = false;
  reviewStatus.classList.toggle("error", isError);
  reviewStatus.textContent = message;
}

async function loadReviews() {
  if (!reviewList) return;
  reviewList.setAttribute("aria-busy", "true");

  try {
    const response = await fetch("/api/reviews", {
      headers: { Accept: "application/json" },
    });
    if (response.status === 404) {
      const errorMessage = document.createElement("p");
      errorMessage.className = "review-message";
      errorMessage.append(
        document.createTextNode("Reviews aren't available on this static preview. "),
      );
      const liveSiteLink = document.createElement("a");
      liveSiteLink.className = "review-preview-link";
      liveSiteLink.href = "https://www.joliza-yogourt.com/#reviews";
      liveSiteLink.textContent = "Open the live website to view and submit reviews.";
      errorMessage.append(liveSiteLink);
      reviewList.replaceChildren(errorMessage);
      return;
    }
    if (!response.ok) throw new Error(`Review request failed (${response.status}).`);

    const reviews = await response.json();
    if (!Array.isArray(reviews) || reviews.some((review) => (
      !review
      || typeof review.name !== "string"
      || !Number.isInteger(review.rating)
      || review.rating < 1
      || review.rating > 5
      || typeof review.comment !== "string"
    ))) {
      throw new TypeError("The reviews response is invalid.");
    }

    reviewList.replaceChildren();
    if (reviews.length === 0) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "review-message";
      emptyMessage.textContent = "No reviews yet. Be the first to share your experience.";
      reviewList.append(emptyMessage);
      return;
    }

    for (const review of reviews) {
      const card = document.createElement("article");
      card.className = "review-card";

      const stars = document.createElement("p");
      stars.className = "review-stars";
      stars.setAttribute("aria-label", `${review.rating} out of 5 stars`);
      stars.textContent = `${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}`;

      const comment = document.createElement("blockquote");
      comment.textContent = review.comment;

      const author = document.createElement("p");
      author.className = "review-author";
      author.textContent = review.name;

      card.append(stars, comment, author);
      reviewList.append(card);
    }
  } catch (error) {
    console.error("Unable to load reviews.", error);
    reviewList.replaceChildren();
    const errorMessage = document.createElement("p");
    errorMessage.className = "review-message review-message-error";
    errorMessage.textContent = "Reviews couldn't be loaded right now. Please try again later.";
    reviewList.append(errorMessage);
  } finally {
    reviewList.setAttribute("aria-busy", "false");
  }
}

reviewForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!reviewForm.reportValidity()) return;

  const formData = new FormData(reviewForm);
  const submitButton = reviewForm.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  if (reviewStatus) {
    reviewStatus.hidden = true;
    reviewStatus.classList.remove("error");
  }

  try {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: formData.get("name"),
        rating: Number(formData.get("rating")),
        comment: formData.get("comment"),
      }),
    });
    const result = await response.json();
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      throw new TypeError("The review response is invalid.");
    }
    if (!response.ok) {
      throw new Error(typeof result.error === "string" ? result.error : "Your review couldn't be submitted.");
    }

    reviewForm.reset();
    showReviewStatus(
      typeof result.message === "string"
        ? result.message
        : "Thanks for sharing your review. It will appear after moderation.",
    );
  } catch (error) {
    console.error("Unable to submit review.", error);
    showReviewStatus(
      error instanceof Error ? error.message : "Your review couldn't be submitted. Please try again.",
      true,
    );
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

cartOpen?.addEventListener("click", openCart);
document.querySelector("#cart-close")?.addEventListener("click", closeCart);
cartBackdrop?.addEventListener("click", closeCart);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuToggle?.getAttribute("aria-expanded") === "true") {
    setNavigationOpen(false);
    menuToggle.focus();
  }
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

checkoutForm?.addEventListener("submit", async (event) => {
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
  const items = cart.map(({ id, quantity }) => ({
    product: PRODUCTS[id].name,
    quantity,
    unit_price: PRODUCTS[id].price,
  }));
  const payload = {
    inquiry_type: orderMode,
    name: details.name,
    email: details.email,
    phone: details.phone,
    address: details.address,
    delivery_date: details.delivery_date,
    note: details.note,
    items,
    flavours: [],
    message,
  };
  const submitButton = checkoutForm.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  if (checkoutStatus) {
    checkoutStatus.hidden = true;
    checkoutStatus.classList.remove("success", "error");
  }

  try {
    const result = await postInquiry(payload);
    cart = [];
    persistCart();
    renderCart();
    checkoutForm.reset();
    if (preorderDateField) preorderDateField.hidden = true;
    checkoutForm.hidden = true;
    if (cartCheckout) cartCheckout.hidden = false;
    if (checkoutStatus) {
      checkoutStatus.hidden = false;
      checkoutStatus.classList.add("success");
      checkoutStatus.textContent = result.message;
      checkoutStatus.scrollIntoView({ block: "nearest" });
    }
  } catch (error) {
    console.error("Unable to submit cart order.", error);
    if (checkoutStatus) {
      checkoutStatus.hidden = false;
      checkoutStatus.classList.add("error");
      checkoutStatus.textContent = error instanceof Error ? error.message : "Your order couldn't be sent. Please try again.";
    }
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

loadReviews();
renderCart();
