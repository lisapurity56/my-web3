// Fetch the editable FAQ and connect quick replies, local matching, and AI fallback.
const chatPanel = document.querySelector("#chat-panel");
const chatLauncher = document.querySelector("#chat-launcher");
const chatBack = document.querySelector("#chat-back");
const chatClose = document.querySelector("#chat-close");
const chatMessages = document.querySelector("#chat-messages");
const chatQuickReplies = document.querySelector("#chat-quick-replies");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatSend = document.querySelector("#chat-send");
const initialGreeting = chatMessages.firstElementChild;
const PAYMENT_ACCOUNT_NUMBER = "9066908023";
const CHAT_FALLBACK =
  "Sorry, something went wrong. Please use our contact form or WhatsApp at 08064948591.";
const conversation = [];
const screenHistory = [];
let faqEntries = [];
let faqLoaded = false;
let currentScreen = "options";
let screenRevision = 0;

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

function captureScreen() {
  return {
    messages: [...chatMessages.childNodes],
    options: [...chatQuickReplies.childNodes],
    optionsHidden: chatQuickReplies.hidden,
    conversation: [...conversation],
    screen: currentScreen,
    isMainOptions: currentScreen === "options" && screenHistory.length === 0,
  };
}

function enterAnswerScreen() {
  if (currentScreen !== "answer") {
    screenHistory.push(captureScreen());
    currentScreen = "answer";
  }
  chatQuickReplies.hidden = true;
  chatBack.hidden = false;
}

function resetToOptions() {
  screenRevision += 1;
  screenHistory.length = 0;
  currentScreen = "options";
  conversation.length = 0;
  chatMessages.replaceChildren(initialGreeting);
  chatQuickReplies.hidden = false;
  chatBack.hidden = true;
  chatInput.value = "";
  chatSend.disabled = false;
  setTyping(false);
  scrollToLatest();
}

function goBackOneStep() {
  if (currentScreen === "options" && screenHistory.length === 0) return;

  screenRevision += 1;
  setTyping(false);
  chatSend.disabled = false;
  const previousScreen = screenHistory.pop();
  if (!previousScreen) {
    resetToOptions();
    return;
  }

  chatMessages.replaceChildren(...previousScreen.messages);
  chatQuickReplies.replaceChildren(...previousScreen.options);
  chatQuickReplies.hidden = previousScreen.optionsHidden;
  conversation.splice(0, conversation.length, ...previousScreen.conversation);
  currentScreen = previousScreen.screen;
  chatBack.hidden = previousScreen.isMainOptions;
  chatInput.value = "";
  scrollToLatest();
  const firstOption = chatQuickReplies.hidden
    ? null
    : chatQuickReplies.querySelector("button");
  (firstOption ?? chatInput).focus();
}

function addMessage(text, sender, options = {}) {
  if (sender === "bot") enterAnswerScreen();

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

  if (sender === "bot") {
    const backButton = document.createElement("button");
    backButton.className = "chat-answer-back";
    backButton.type = "button";
    backButton.textContent = "← Back to options";
    backButton.addEventListener("click", goBackOneStep);
    message.append(backButton);
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

  enterAnswerScreen();
  const requestRevision = screenRevision;
  addMessage(message, "user");
  conversation.push({ role: "user", content: message });
  await faqReady;
  if (requestRevision !== screenRevision) return;
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
    if (requestRevision !== screenRevision) return;
    if (!response.ok) throw new Error("Chat request failed.");
    const payload = await response.json();
    if (requestRevision !== screenRevision) return;
    if (typeof payload.reply !== "string" || !payload.reply.trim()) {
      throw new Error("Chat reply was empty.");
    }
    addMessage(payload.reply, "bot");
    conversation.push({ role: "assistant", content: payload.reply });
  } catch {
    if (requestRevision === screenRevision) {
      addMessage(CHAT_FALLBACK, "bot");
      conversation.push({ role: "assistant", content: CHAT_FALLBACK });
    }
  } finally {
    if (requestRevision === screenRevision) {
      setTyping(false);
      chatSend.disabled = false;
      chatInput.focus();
    }
  }
}

function openChat() {
  resetToOptions();
  chatPanel.hidden = false;
  chatLauncher.setAttribute("aria-expanded", "true");
  chatLauncher.setAttribute("aria-label", "Close chat");
  chatInput.focus();
}

function closeChat() {
  resetToOptions();
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
chatBack.addEventListener("click", goBackOneStep);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !chatPanel.hidden) {
    event.preventDefault();
    if (!chatBack.hidden) goBackOneStep();
    else closeChat();
  }
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
