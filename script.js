const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const printButton = document.querySelector("#print-button");
const contactForm = document.querySelector(".contact-form");
const inquiryType = document.querySelector("#inquiry-type");
const messageField = document.querySelector("#message");
const formStatus = document.querySelector("#form-status");
const cartDialog = document.querySelector("#cart-dialog");
const cartItems = document.querySelector("#cart-items");
const cartEmpty = document.querySelector("#cart-empty");
const cartCount = document.querySelector("#cart-count");
const cartCheckout = document.querySelector("#cart-checkout");
const cart = [];

function renderCart() {
  cartItems.replaceChildren();
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  cartCount.textContent = String(itemCount);
  cartCount.setAttribute("aria-label", `${itemCount} ${itemCount === 1 ? "item" : "items"}`);
  cartEmpty.hidden = cart.length > 0;
  cartCheckout.disabled = cart.length === 0;

  cart.forEach((item, index) => {
    const row = document.createElement("article");
    row.className = "cart-item";

    const details = document.createElement("div");
    details.className = "cart-item-details";
    const title = document.createElement("h3");
    title.textContent = item.product;
    const preferenceLabel = document.createElement("label");
    preferenceLabel.htmlFor = `cart-preference-${index}`;
    preferenceLabel.textContent = "Preference or note";
    const preference = document.createElement("input");
    preference.id = `cart-preference-${index}`;
    preference.type = "text";
    preference.maxLength = 250;
    preference.placeholder = "Optional";
    preference.value = item.preference;
    preference.dataset.cartPreference = String(index);
    details.append(title, preferenceLabel, preference);

    const quantity = document.createElement("div");
    quantity.className = "cart-quantity";
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.textContent = "−";
    decrease.setAttribute("aria-label", `Remove one ${item.product}`);
    decrease.dataset.cartAction = "decrease";
    decrease.dataset.cartIndex = String(index);
    const amount = document.createElement("span");
    amount.textContent = String(item.quantity);
    amount.setAttribute("aria-label", `Quantity ${item.quantity}`);
    const increase = document.createElement("button");
    increase.type = "button";
    increase.textContent = "+";
    increase.setAttribute("aria-label", `Add one ${item.product}`);
    increase.dataset.cartAction = "increase";
    increase.dataset.cartIndex = String(index);
    quantity.append(decrease, amount, increase);
    row.append(details, quantity);
    cartItems.append(row);
  });
}

function openCart() {
  if (!cartDialog.open) cartDialog.showModal();
}

document.querySelector("#cart-open")?.addEventListener("click", openCart);
document.querySelector("#cart-close")?.addEventListener("click", () => cartDialog.close());

document.querySelectorAll("[data-add-to-cart]").forEach((button) => {
  button.addEventListener("click", () => {
    const product = button.dataset.addToCart;
    const existing = cart.find((item) => item.product === product);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ product, quantity: 1, preference: "" });
    }
    renderCart();
    openCart();
  });
});

cartItems?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cart-action]");
  if (!button) return;
  const index = Number(button.dataset.cartIndex);
  const item = cart[index];
  if (!item) return;
  if (button.dataset.cartAction === "increase") {
    item.quantity += 1;
  } else if (button.dataset.cartAction === "decrease") {
    item.quantity -= 1;
    if (item.quantity === 0) cart.splice(index, 1);
  }
  renderCart();
});

cartItems?.addEventListener("input", (event) => {
  const input = event.target.closest("[data-cart-preference]");
  if (!input) return;
  const item = cart[Number(input.dataset.cartPreference)];
  if (item) item.preference = input.value;
});

cartCheckout?.addEventListener("click", () => {
  inquiryType.value = "order";
  messageField.value = [
    "I'd like to place an order:",
    ...cart.map((item) =>
      `- ${item.product} × ${item.quantity}${item.preference ? ` (Preference: ${item.preference})` : ""}`,
    ),
    "",
    "Please confirm the price and availability.",
  ].join("\n");
  cartDialog.close();
  document.querySelector("#contact").scrollIntoView({ behavior: "smooth" });
  document.querySelector("#name").focus({ preventScroll: true });
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

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = contactForm.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.textContent = "Sending…";
  formStatus.hidden = false;
  formStatus.textContent = "Sending your message…";
  formStatus.classList.remove("error");

  try {
    const response = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(contactForm))),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "We couldn't send your message. Please try again.");
    }
    contactForm.reset();
    cart.splice(0, cart.length);
    renderCart();
    formStatus.textContent =
      result.notification_sent === true
        ? `${result.message} Email notification sent.`
        : result.message;
  } catch (error) {
    formStatus.textContent =
      error instanceof TypeError
        ? "We couldn't reach the server. Please try again in a moment."
        : error.message;
    formStatus.classList.add("error");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalButtonText;
  }
});
