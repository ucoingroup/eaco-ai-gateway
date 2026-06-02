/**
 * EACO AI Gateway - Frontend Application Logic
 */

// ============ Language Switching ============
function initLanguage() {
  const savedLang = localStorage.getItem("eaco-lang") || "en";
  setLanguage(savedLang);

  // Language dropdown toggle
  const langBtn = document.getElementById("lang-btn");
  const langMenu = document.getElementById("lang-menu");
  if (langBtn && langMenu) {
    langBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      langMenu.classList.toggle("open");
    });
    document.addEventListener("click", () => {
      langMenu.classList.remove("open");
    });
  }

  // Language selection items
  document.querySelectorAll(".lang-item").forEach((item) => {
    item.addEventListener("click", () => {
      const lang = item.getAttribute("data-lang");
      setLanguage(lang);
      langMenu.classList.remove("open");
    });
  });
}

// ============ Wallet Connection (Simulated) ============
let connectedWallet = null;

function initWallet() {
  const walletBtn = document.getElementById("wallet-btn");
  const walletBtnMobile = document.getElementById("wallet-btn-mobile");
  const modalOverlay = document.getElementById("wallet-modal");
  const modalClose = document.getElementById("wallet-close");
  const walletInput = document.getElementById("wallet-input");
  const walletConnectBtn = document.getElementById("wallet-connect-btn");
  const walletCancelBtn = document.getElementById("wallet-cancel-btn");

  function openModal() {
    if (connectedWallet) {
      // Already connected - disconnect
      connectedWallet = null;
      updateWalletUI();
      return;
    }
    modalOverlay.classList.add("open");
  }

  function closeModal() {
    modalOverlay.classList.remove("open");
  }

  if (walletBtn) walletBtn.addEventListener("click", openModal);
  if (walletBtnMobile) walletBtnMobile.addEventListener("click", openModal);
  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (walletCancelBtn) walletCancelBtn.addEventListener("click", closeModal);
  if (modalOverlay) modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  if (walletConnectBtn) walletConnectBtn.addEventListener("click", () => {
    const addr = walletInput ? walletInput.value.trim() : "";
    if (addr && addr.length > 5) {
      connectedWallet = addr;
      closeModal();
      updateWalletUI();
    }
  });
}

function updateWalletUI() {
  const walletBtn = document.getElementById("wallet-btn");
  const walletBtnMobile = document.getElementById("wallet-btn-mobile");
  if (connectedWallet) {
    const shortAddr = connectedWallet.slice(0, 6) + "..." + connectedWallet.slice(-4);
    if (walletBtn) {
      walletBtn.innerHTML = `<i class="fas fa-link mr-1"></i> <span data-i18n="wallet_connected">${t("wallet_connected")}</span> ${shortAddr}`;
      walletBtn.classList.add("bg-green-900/30", "border-green-500");
    }
    if (walletBtnMobile) {
      walletBtnMobile.innerHTML = `<i class="fas fa-link"></i> ${shortAddr}`;
    }
  } else {
    if (walletBtn) {
      walletBtn.innerHTML = `<i class="fas fa-wallet mr-1"></i> <span data-i18n="nav_connect_wallet">${t("nav_connect_wallet")}</span>`;
      walletBtn.classList.remove("bg-green-900/30", "border-green-500");
    }
    if (walletBtnMobile) {
      walletBtnMobile.innerHTML = `<i class="fas fa-wallet"></i>`;
    }
  }
}

// ============ Mobile Menu ============
function initMobileMenu() {
  const menuBtn = document.getElementById("mobile-menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const closeBtn = document.getElementById("mobile-menu-close");

  if (menuBtn) menuBtn.addEventListener("click", () => {
    mobileMenu.classList.add("open");
  });

  if (closeBtn) closeBtn.addEventListener("click", () => {
    mobileMenu.classList.remove("open");
  });

  if (mobileMenu) mobileMenu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      mobileMenu.classList.remove("open");
    });
  });
}

// ============ API Playground ============
function initPlayground() {
  const modelSelect = document.getElementById("playground-model");
  const apiKeyInput = document.getElementById("playground-apikey");
  const messageInput = document.getElementById("playground-message");
  const sendBtn = document.getElementById("playground-send");
  const clearBtn = document.getElementById("playground-clear");
  const chatBox = document.getElementById("chat-box");

  if (!modelSelect || !chatBox) return;

  // Load models
  loadModels();

  if (sendBtn) sendBtn.addEventListener("click", sendMessage);
  if (messageInput) messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) sendMessage();
  });
  if (clearBtn) clearBtn.addEventListener("click", () => {
    chatBox.innerHTML = "";
  });
}

async function loadModels() {
  const modelSelect = document.getElementById("playground-model");
  if (!modelSelect) return;

  try {
    const resp = await fetch("/api/v1/models");
    if (resp.ok) {
      const data = await resp.json();
      const models = data.data || [];
      modelSelect.innerHTML = "";
      models.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.id;
        modelSelect.appendChild(opt);
      });
    }
  } catch (err) {
    // Fallback models if API not available
    const fallbackModels = [
      "gpt-4o", "gpt-4o-mini", "claude-sonnet-4-20250514",
      "claude-3.5-haiku", "deepseek-chat", "deepseek-reasoner",
      "gemini-2.0-flash", "gemini-2.5-pro",
      "llama-3.1-70b", "mistral-large"
    ];
    modelSelect.innerHTML = "";
    fallbackModels.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      modelSelect.appendChild(opt);
    });
  }
}

async function sendMessage() {
  const modelSelect = document.getElementById("playground-model");
  const apiKeyInput = document.getElementById("playground-apikey");
  const messageInput = document.getElementById("playground-message");
  const chatBox = document.getElementById("chat-box");
  const sendBtn = document.getElementById("playground-send");

  if (!messageInput || !chatBox) return;

  const message = messageInput.value.trim();
  if (!message) return;

  const model = modelSelect ? modelSelect.value : "gpt-4o";
  const apiKey = apiKeyInput ? apiKeyInput.value.trim() : "";

  // Add user message
  appendMessage("user", message);
  messageInput.value = "";

  // Show typing indicator
  const typingId = showTyping();

  // Disable send button
  if (sendBtn) sendBtn.disabled = true;

  try {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const resp = await fetch("/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: message }],
        stream: false,
      }),
    });

    removeTyping(typingId);

    if (resp.ok) {
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || "No response";
      appendMessage("assistant", content);
    } else {
      const errData = await resp.json().catch(() => ({ error: { message: "Request failed" } }));
      appendMessage("assistant", `❌ Error: ${errData.error?.message || resp.statusText}`);
    }
  } catch (err) {
    removeTyping(typingId);
    // Simulated response for demo
    appendMessage("assistant", `🤖 Demo response (backend not connected):\n\nYou asked about "${message}". This is a simulated EACO AI Gateway response. In production, this would connect to the actual AI model via our decentralized routing system.`);
  }

  if (sendBtn) sendBtn.disabled = false;
}

function appendMessage(role, content) {
  const chatBox = document.getElementById("chat-box");
  if (!chatBox) return;

  const div = document.createElement("div");
  div.className = `chat-message ${role}`;
  div.innerHTML = `<div class="font-semibold text-sm mb-1">${role === "user" ? "👤 You" : "🤖 AI"}</div><div class="text-sm">${escapeHtml(content)}</div>`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showTyping() {
  const chatBox = document.getElementById("chat-box");
  if (!chatBox) return null;

  const div = document.createElement("div");
  div.className = "chat-message assistant";
  div.id = "typing-indicator";
  div.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div.id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function escapeHtml(text) {
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}

// ============ Pricing Table ============
const modelPricing = [
  { id: "gpt-4o", input: 2.50, output: 10.00, eacoInput: 2.00, eacoOutput: 8.00 },
  { id: "gpt-4o-mini", input: 0.15, output: 0.60, eacoInput: 0.12, eacoOutput: 0.48 },
  { id: "claude-sonnet-4-20250514", input: 3.00, output: 15.00, eacoInput: 2.40, eacoOutput: 12.00 },
  { id: "claude-3.5-haiku", input: 0.80, output: 4.00, eacoInput: 0.64, eacoOutput: 3.20 },
  { id: "deepseek-chat", input: 0.14, output: 0.28, eacoInput: 0.11, eacoOutput: 0.22 },
  { id: "deepseek-reasoner", input: 0.55, output: 2.19, eacoInput: 0.44, eacoOutput: 1.75 },
  { id: "gemini-2.0-flash", input: 0.10, output: 0.40, eacoInput: 0.08, eacoOutput: 0.32 },
  { id: "gemini-2.5-pro", input: 1.25, output: 10.00, eacoInput: 1.00, eacoOutput: 8.00 },
  { id: "llama-3.1-70b", input: 0.60, output: 0.80, eacoInput: 0.48, eacoOutput: 0.64 },
  { id: "mistral-large", input: 2.00, output: 6.00, eacoInput: 1.60, eacoOutput: 4.80 },
];

function renderPricingTable() {
  const tbody = document.getElementById("pricing-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  modelPricing.forEach((m) => {
    const savingsInput = ((m.input - m.eacoInput) / m.input * 100).toFixed(0);
    const savingsOutput = ((m.output - m.eacoOutput) / m.output * 100).toFixed(0);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="font-semibold">${m.id}</td>
      <td>$${m.input.toFixed(2)}</td>
      <td>$${m.output.toFixed(2)}</td>
      <td class="savings">$${m.eacoInput.toFixed(2)} / $${m.eacoOutput.toFixed(2)}</td>
      <td class="savings">${savingsInput}% / ${savingsOutput}%</td>
    `;
    tbody.appendChild(row);
  });
}

// ============ Stats Animation ============
function initStats() {
  const targets = [
    { el: "stat-api-calls", value: 12845673, suffix: "" },
    { el: "stat-nodes", value: 256, suffix: "" },
    { el: "stat-cache-rate", value: 94.7, suffix: "%" },
    { el: "stat-cost-savings", value: 78, suffix: "%" },
  ];

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateStats(targets);
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });

  const statsSection = document.getElementById("stats");
  if (statsSection) observer.observe(statsSection);
}

function animateStats(targets) {
  targets.forEach(({ el, value, suffix }) => {
    const element = document.getElementById(el);
    if (!element) return;

    const duration = 2000;
    const start = performance.now();
    const isFloat = !Number.isInteger(value);

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      let current;
      if (isFloat) {
        current = (value * eased).toFixed(1);
      } else {
        current = Math.floor(value * eased);
        if (current > 999999) {
          current = (current / 1000000).toFixed(1) + "M";
        } else if (current > 999) {
          current = (current / 1000).toFixed(1) + "K";
        }
      }

      element.textContent = current + suffix;

      if (progress < 1) requestAnimationFrame(update);
      else {
        // Final value
        if (value > 999999) {
          element.textContent = (value / 1000000).toFixed(1) + "M" + suffix;
        } else if (value > 999) {
          element.textContent = (value / 1000).toFixed(1) + "K" + suffix;
        } else if (isFloat) {
          element.textContent = value.toFixed(1) + suffix;
        } else {
          element.textContent = value + suffix;
        }
      }
    }

    requestAnimationFrame(update);
  });
}

// ============ Scroll Animations ============
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".fade-in").forEach((el) => {
    observer.observe(el);
  });
}

// ============ Smooth Scrolling ============
function initSmoothScroll() {
  document.querySelectorAll("a[href^='#']").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = a.getAttribute("href").slice(1);
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

// ============ Initialize ============
document.addEventListener("DOMContentLoaded", () => {
  initLanguage();
  initWallet();
  initMobileMenu();
  initPlayground();
  renderPricingTable();
  initStats();
  initScrollAnimations();
  initSmoothScroll();
});