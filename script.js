const container = document.getElementById("itemsContainer");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-btn");
const emptyState = document.getElementById("emptyState");

let items = [];
let activeCategory = "all";

// 🔗 POWER AUTOMATE URL
const FLOW_URL = "https://7d40a9c57127e2e0af34e868fdebb9.f5.environment.api.powerplatform.com/powerautomate/automations/direct/workflows/3cd62793afa3492dba9367bcc479774d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=c7jvqBTY6xPFAUEobOsD7C2yU_tlOD0XGTWZbgZl0JU";

async function loadItems() {
  try {
    const res = await fetch(FLOW_URL);
    const data = await res.json();

    items = data.value || [];
    displayItems(items);

  } catch (error) {
    console.error(error);
  }
}

function displayItems(list) {
  container.innerHTML = "";

  if (list.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  } else {
    emptyState.classList.add("hidden");
  }

  list.forEach(item => {
    const title = item.Title || "Item";
    const price = item.Price || "$0";
    const category = (item.Category || "").toLowerCase();
    const status = item.Status || "Available";
    const condition = item.Condition || "Good";

    const image = getImage(title);

    const card = document.createElement("div");
    card.className = "card fade-in";

    card.innerHTML = `
      <img src="${image}">
      <div class="card-content">
        <h3>${title}</h3>
        <span class="badge ${getStatusClass(status)}">${status}</span>
        <p>${category}</p>
        <p><strong>${price}</strong></p>
        <p>Condition: ${condition}</p>
        <a href="item.html" class="btn-primary">View Details</a>
      </div>
    `;

    card.dataset.name = title.toLowerCase();
    card.dataset.category = category;

    container.appendChild(card);
  });
}

// IMAGE FIX
function getImage(title) {
  title = title.toLowerCase();

  if (title.includes("chair")) return "images/chair.jpg";
  if (title.includes("jacket")) return "images/jacket.jpg";
  if (title.includes("laptop")) return "images/laptop.jpg";
  if (title.includes("table")) return "images/table.jpg";
  if (title.includes("monitor")) return "images/monitor.jpg";

  return "images/default.jpg"; // fallback
}

function getStatusClass(status) {
  if (status === "Available") return "available";
  if (status === "Pending Pickup") return "pending";
  return "sold";
}

// FILTER + SEARCH
function filterItems() {
  const search = searchInput.value.toLowerCase();

  const filtered = items.filter(item => {
    const name = item.Title.toLowerCase();
    const category = (item.Category || "").toLowerCase();

    return (
      name.includes(search) &&
      (activeCategory === "all" || category === activeCategory)
    );
  });

  displayItems(filtered);
}

searchInput.addEventListener("input", filterItems);

filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    activeCategory = btn.dataset.category;
    filterItems();
  });
});

// INIT
loadItems();
