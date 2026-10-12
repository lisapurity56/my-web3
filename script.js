const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const printButton = document.querySelector("#print-button");
const contactForm = document.querySelector(".contact-form");
const inquiryType = document.querySelector("#inquiry-type");
const messageField = document.querySelector("#message");
const formStatus = document.querySelector("#form-status");

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
    formStatus.textContent = result.message;
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
