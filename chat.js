// Fetch the editable FAQ and connect quick replies, local matching, and AI fallback.
const chatPanel = document.querySelector("#chat-panel");
const chatLauncher = document.querySelector("#chat-launcher");
const chatClose = document.querySelector("#chat-close");
const chatMessages = document.querySelector("#chat-messages");
const chatQuickReplies = document.querySelector("#chat-quick-replies");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatSend = document.querySelector("#chat-send");
const PAYMENT_ACCOUNT_NUMBER = "9066908023";
const CHAT_FALLBACK =
  "Sorry, something went wrong. Please use our contact form or WhatsApp at 08064948591.";
const conversation = [];
let faqEntries = [];
let faqLoaded = false;

const faqReady = fetch("/faq.json")
  .then((response) => {
    if (!response.ok) throw new Error("FAQ could not be loaded.");
    return response.json();
  })
  .then((faq) => {
    if (!Array.isArray(faq)) throw new Error("FAQ data is invalid.");
    faqEntries = faq;
    faqLoaded = true;
  })
  .catch((error) => console.error("Chat FAQ unavailable:", error));

function scrollToLatest() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addMessage(text, sender, options = {}) {
  const message = document.createElement("div");
  message.className = `chat-message ${sender}-message`;
  message.textContent = text;

  if (options.payment) {
    const copyButton = document.createElement("button");
    copyButton.className = "chat-copy-button";
    copyButton.type = "button";
    copyButton.textContent = "Copy account number";
    copyButton.setAttribute("aria-label", "Copy account number");
    const status = document.createElement("span");
    status.className = "chat-copy-status";
    status.setAttribute("aria-live", "polite");
    copyButton.addEventListener("click", async () => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(PAYMENT_ACCOUNT_NUMBER);
        } else {
          const temporaryInput = document.createElement("textarea");
          temporaryInput.value = PAYMENT_ACCOUNT_NUMBER;
          temporaryInput.setAttribute("readonly", "");
          temporaryInput.style.position = "fixed";
          temporaryInput.style.opacity = "0";
          document.body.append(temporaryInput);
          temporaryInput.select();
          const copied = document.execCommand("copy");
          temporaryInput.remove();
          if (!copied) throw new Error("Clipboard copy failed.");
        }
        status.textContent = "Copied";
      } catch {
        status.textContent = "Could not copy";
      }
    });
    message.append(copyButton, status);
  }

  chatMessages.append(message);
  scrollToLatest();
}

function normalise(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findFaqAnswer(message) {
  const normalisedMessage = normalise(message);
  return faqEntries.find((entry) =>
    entry.keywords.some((keyword) => normalisedMessage.includes(normalise(keyword))),
  );
}

function setTyping(visible) {
  const existing = chatMessages.querySelector(".chat-typing");
  if (visible && !existing) {
    const typing = document.createElement("p");
    typing.className = "chat-message bot-message chat-typing";
    typing.setAttribute("role", "status");
    typing.textContent = "Joliza is typing…";
    chatMessages.append(typing);
  } else if (!visible && existing) {
    existing.remove();
  }
  scrollToLatest();
}

async function sendMessage(rawMessage) {
  const message = rawMessage.trim();
  if (!message) return;
  if (message.length > 500) {
    addMessage("Please keep your message to 500 characters or fewer.", "bot");
    return;
  }

  chatQuickReplies.hidden = true;
  addMessage(message, "user");
  conversation.push({ role: "user", content: message });
  await faqReady;
  if (!faqLoaded) {
    addMessage(CHAT_FALLBACK, "bot");
    conversation.push({ role: "assistant", content: CHAT_FALLBACK });
    return;
  }
  const faqMatch = findFaqAnswer(message);
  if (faqMatch) {
    addMessage(faqMatch.answer, "bot", { payment: faqMatch.id === "payment" });
    conversation.push({ role: "assistant", content: faqMatch.answer });
    return;
  }

  chatSend.disabled = true;
  setTyping(true);
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(conversation.slice(-6)),
    });
    if (!response.ok) throw new Error("Chat request failed.");
    const payload = await response.json();
    if (typeof payload.reply !== "string" || !payload.reply.trim()) {
      throw new Error("Chat reply was empty.");
    }
    addMessage(payload.reply, "bot");
    conversation.push({ role: "assistant", content: payload.reply });
  } catch {
    addMessage(CHAT_FALLBACK, "bot");
    conversation.push({ role: "assistant", content: CHAT_FALLBACK });
  } finally {
    setTyping(false);
    chatSend.disabled = false;
    chatInput.focus();
  }
}

function openChat() {
  chatPanel.hidden = false;
  chatLauncher.setAttribute("aria-expanded", "true");
  chatLauncher.setAttribute("aria-label", "Close chat");
  chatInput.focus();
}

function closeChat() {
  chatPanel.hidden = true;
  chatLauncher.setAttribute("aria-expanded", "false");
  chatLauncher.setAttribute("aria-label", "Open chat");
  chatLauncher.focus();
}

chatLauncher.addEventListener("click", () => {
  if (chatPanel.hidden) openChat();
  else closeChat();
});
chatClose.addEventListener("click", closeChat);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !chatPanel.hidden) closeChat();
});
chatQuickReplies.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button) sendMessage(button.textContent);
});
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = chatInput.value;
  chatInput.value = "";
  sendMessage(message);
});
