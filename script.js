<<<<<<< HEAD
=======
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

>>>>>>> 1c703e1 (Add product images and update page layout, styles, and script)
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
