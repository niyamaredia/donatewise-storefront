const msalConfig = {
  auth: {
    clientId: "07e940a2-e4a5-4cbd-a59e-99554b722377",
    authority: "https://login.microsoftonline.com/4bdbaab1-f9e6-46f2-939c-a3df7cf52b8e",
    redirectUri: "https://niyamaredia.github.io/donatewise-storefront/"
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false
  }
};

const loginRequest = {
  scopes: ["User.Read", "Sites.Read.All"]
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

const siteHost = "donatewise.sharepoint.com";
const sitePath = "/sites/DonateWiseTeam";
const listName = "StorefrontListings";

let storefrontItems = [];

function getStatusClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("sold")) return "sold";
  if (normalized.includes("pending")) return "pending";
  return "available";
}

function getImageFromTitle(title, category) {
  const safeTitle = encodeURIComponent(String(title || "Item"));
  const safeCategory = encodeURIComponent(String(category || ""));
  return `data:image/svg+xml;utf8,
    <svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='%23dbeafe'/>
          <stop offset='100%' stop-color='%23ede9fe'/>
        </linearGradient>
      </defs>
      <rect width='600' height='400' fill='url(%23g)'/>
      <circle cx='300' cy='150' r='54' fill='%23ffffff' opacity='0.9'/>
      <text x='300' y='165' text-anchor='middle' font-size='42' font-family='Arial, sans-serif' fill='%23334155'>📦</text>
      <text x='300' y='255' text-anchor='middle' font-size='30' font-weight='700' font-family='Arial, sans-serif' fill='%23111827'>${safeTitle}</text>
      <text x='300' y='292' text-anchor='middle' font-size='18' font-family='Arial, sans-serif' fill='%23667085'>${safeCategory}</text>
    </svg>`;
}

function formatCurrency(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return `$${value ?? 0}`;
  return `$${number.toFixed(2)}`;
}

function formatSyncTime() {
  const now = new Date();
  return `Last synced ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function updateSyncStatus(text) {
  const syncText = document.getElementById("syncText");
  if (syncText) syncText.textContent = text;

  const dashboardSyncText = document.getElementById("dashboardSyncText");
  if (dashboardSyncText) dashboardSyncText.textContent = text;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function ensureAuthenticated() {
  await msalInstance.initialize();

  const redirectResponse = await msalInstance.handleRedirectPromise();
  if (redirectResponse && redirectResponse.account) {
    msalInstance.setActiveAccount(redirectResponse.account);
  }

  let account = msalInstance.getActiveAccount();
  if (!account) {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      account = accounts[0];
      msalInstance.setActiveAccount(account);
    }
  }

  return account;
}

async function acquireAccessToken() {
  let account = await ensureAuthenticated();

  if (!account) {
    window.location.href = "index.html";
    throw new Error("No signed-in account found.");
  }

  try {
    const tokenResponse = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account
    });
    return tokenResponse.accessToken;
  } catch (error) {
    const tokenResponse = await msalInstance.acquireTokenPopup(loginRequest);
    return tokenResponse.accessToken;
  }
}

async function loadStorefrontItemsFromGraph() {
  const accessToken = await acquireAccessToken();

  const siteResponse = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteHost}:${sitePath}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!siteResponse.ok) {
    throw new Error("Could not find SharePoint site.");
  }

  const siteData = await siteResponse.json();
  const siteId = siteData.id;

  const listResponse = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/lists?$filter=displayName eq '${listName}'`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!listResponse.ok) {
    throw new Error("Could not find SharePoint list.");
  }

  const listData = await listResponse.json();
  if (!listData.value || listData.value.length === 0) {
    throw new Error("StorefrontListings list not found.");
  }

  const listId = listData.value[0].id;

  const itemsResponse = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?expand=fields($select=ItemName,Category,Price,Status,Condition)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!itemsResponse.ok) {
    throw new Error("Could not load list items.");
  }

  const itemsData = await itemsResponse.json();

  return (itemsData.value || []).map((item, index) => {
    const fields = item.fields || {};
    return {
      key: `${String(fields.ItemName || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
      title: fields.ItemName || "Untitled Item",
      category: fields.Category || "Uncategorized",
      price: fields.Price || 0,
      status: fields.Status || "Available",
      condition: fields.Condition || "Good",
      image: getImageFromTitle(fields.ItemName || "Item", fields.Category || "")
    };
  });
}

function renderInventory(items) {
  const container = document.getElementById("inventoryGrid");
  if (!container) return;

  container.innerHTML = "";

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No storefront listings are available right now.</p>
      </div>
    `;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "item-card";
    card.dataset.name = String(item.title).toLowerCase();
    card.dataset.category = String(item.category).toLowerCase();

    card.innerHTML = `
      <img src="${item.image}" class="item-image" alt="${escapeHtml(item.title)}">
      <div class="item-content">
        <div class="item-top-row">
          <h3>${escapeHtml(item.title)}</h3>
          <span class="status-badge ${getStatusClass(item.status)}">${escapeHtml(item.status)}</span>
        </div>
        <p class="item-category">${escapeHtml(item.category)}</p>
        <p class="item-price">${formatCurrency(item.price)}</p>
        <p class="item-category">Condition: ${escapeHtml(item.condition)}</p>
        <div class="item-actions">
          <span class="card-link">Live SharePoint Item</span>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

function setupFiltering() {
  const searchInput = document.getElementById("searchInput");
  const filterButtons = document.querySelectorAll(".filter-btn");
  let activeCategory = "all";

  function applyFilters() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

    const filteredItems = storefrontItems.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm);
      const matchesCategory =
        activeCategory === "all" || item.category.toLowerCase() === activeCategory;

      return matchesSearch && matchesCategory;
    });

    renderInventory(filteredItems);
  }

  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      activeCategory = button.dataset.category.toLowerCase();
      applyFilters();
    });
  });
}

async function loadItemsFromSharePoint() {
  const container = document.getElementById("inventoryGrid");
  if (!container) return;

  try {
    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading live inventory...</p>
      </div>
    `;

    updateSyncStatus("Authenticating...");
    storefrontItems = await loadStorefrontItemsFromGraph();

    renderInventory(storefrontItems);
    setupFiltering();
    updateSyncStatus(formatSyncTime());
  } catch (error) {
    console.error("Error loading SharePoint items:", error);
    container.innerHTML = `
      <div class="empty-state">
        <p>Could not load SharePoint data right now.</p>
      </div>
    `;
    updateSyncStatus("Sync failed");
  }
}

async function loadDashboardFromSharePoint() {
  const totalEl = document.getElementById("statTotal");
  const availableEl = document.getElementById("statAvailable");
  const pendingEl = document.getElementById("statPending");
  const soldEl = document.getElementById("statSold");
  const tableBody = document.getElementById("dashboardTableBody");

  if (!totalEl || !availableEl || !pendingEl || !soldEl || !tableBody) return;

  try {
    const items = storefrontItems.length ? storefrontItems : await loadStorefrontItemsFromGraph();

    const total = items.length;
    const available = items.filter(item => item.status.toLowerCase().includes("available")).length;
    const pending = items.filter(item => item.status.toLowerCase().includes("pending")).length;
    const sold = items.filter(item => item.status.toLowerCase().includes("sold")).length;

    totalEl.textContent = total;
    availableEl.textContent = available;
    pendingEl.textContent = pending;
    soldEl.textContent = sold;

    tableBody.innerHTML = "";

    items.slice(0, 10).forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td><span class="status-badge ${getStatusClass(item.status)}">${escapeHtml(item.status)}</span></td>
        <td>${escapeHtml(item.condition)}</td>
      `;
      tableBody.appendChild(row);
    });

    updateSyncStatus(formatSyncTime());
  } catch (error) {
    console.error("Dashboard load error:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="4">Could not load live dashboard data.</td>
      </tr>
    `;
    updateSyncStatus("Sync failed");
  }
}

function setupChatWidget() {
  const chatToggle = document.getElementById("chatToggle");
  const chatBox = document.getElementById("chatBox");
  const chatClose = document.getElementById("chatClose");
  const quickQuestions = document.querySelectorAll(".quick-question");
  const chatResponses = document.getElementById("chatResponses");

  if (chatToggle && chatBox) {
    chatToggle.addEventListener("click", () => {
      chatBox.classList.toggle("hidden");
    });
  }

  if (chatClose && chatBox) {
    chatClose.addEventListener("click", () => {
      chatBox.classList.add("hidden");
    });
  }

  quickQuestions.forEach((button) => {
    button.addEventListener("click", () => {
      if (!chatResponses) return;

      const userBubble = document.createElement("div");
      userBubble.className = "user-response";
      userBubble.textContent = button.textContent.trim();

      const assistantBubble = document.createElement("div");
      assistantBubble.className = "assistant-response";
      assistantBubble.textContent = button.dataset.answer;

      chatResponses.appendChild(userBubble);
      chatResponses.appendChild(assistantBubble);
    });
  });
}

function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
    await msalInstance.logoutPopup({
      account,
      postLogoutRedirectUri: "https://niyamaredia.github.io/donatewise-storefront/index.html"
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  setupChatWidget();
  setupLogout();
  await loadItemsFromSharePoint();
  await loadDashboardFromSharePoint();
});
