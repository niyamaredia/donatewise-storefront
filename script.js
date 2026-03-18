const itemData = {
  monitor: {
    name: 'Dell Monitor 24"',
    category: 'Electronics',
    price: '$45',
    status: 'Available',
    image: 'images/monitor.jpg',
    description: '24-inch Dell monitor in good working condition. Suitable for office or workstation use.'
  },
  chair: {
    name: 'Office Chair',
    category: 'Furniture',
    price: '$20',
    status: 'Pending Pickup',
    image: 'images/chair.jpg',
    description: 'Gently used office chair in good condition. Suitable for desk or reception use.'
  },
  jacket: {
    name: 'Winter Jacket',
    category: 'Clothing',
    price: '$15',
    status: 'Available',
    image: 'images/jacket.jpg',
    description: 'Warm winter jacket available in good condition.'
  },
  laptop: {
    name: 'Laptop - HP',
    category: 'Electronics',
    price: '$120',
    status: 'Sold',
    image: 'images/laptop.jpg',
    description: 'Used HP laptop previously available in the store.'
  },
  table: {
    name: 'Coffee Table',
    category: 'Furniture',
    price: '$30',
    status: 'Available',
    image: 'images/table.jpg',
    description: 'Simple wooden coffee table suitable for home or office use.'
  },
  shirts: {
    name: 'Men’s Dress Shirts',
    category: 'Clothing',
    price: '$10',
    status: 'Available',
    image: 'images/shirts.jpg',
    description: 'Collection of men’s dress shirts in wearable condition.'
  },
  microwave: {
    name: 'Microwave Oven',
    category: 'Household',
    price: '$35',
    status: 'Pending Pickup',
    image: 'images/microwave.jpg',
    description: 'Microwave oven in working condition, available for pickup.'
  },
  lamp: {
    name: 'Desk Lamp',
    category: 'Office Supplies',
    price: '$8',
    status: 'Sold',
    image: 'images/lamp.jpg',
    description: 'Desk lamp previously listed and sold from inventory.'
  }
};

// Inventory filtering
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-btn");
const itemCards = document.querySelectorAll(".item-card");
let activeCategory = "all";

function filterItems() {
  if (!itemCards.length) return;
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

  itemCards.forEach((card) => {
    const itemName = card.dataset.name.toLowerCase();
    const itemCategory = card.dataset.category.toLowerCase();

    const matchesSearch = itemName.includes(searchTerm);
    const matchesCategory = activeCategory === "all" || itemCategory === activeCategory;

    card.style.display = matchesSearch && matchesCategory ? "flex" : "none";
  });
}

if (searchInput) {
  searchInput.addEventListener("input", filterItems);
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    activeCategory = button.dataset.category.toLowerCase();
    filterItems();
  });
});

// Dynamic item detail page
function loadItemDetails() {
  const params = new URLSearchParams(window.location.search);
  const itemKey = params.get("item");
  if (!itemKey || !itemData[itemKey]) return;

  const item = itemData[itemKey];

  const detailName = document.getElementById("detailName");
  const detailCategory = document.getElementById("detailCategory");
  const detailPrice = document.getElementById("detailPrice");
  const detailStatusText = document.getElementById("detailStatusText");
  const detailStatusBadge = document.getElementById("detailStatusBadge");
  const detailImage = document.getElementById("detailImage");
  const detailDescription = document.getElementById("detailDescription");

  if (detailName) detailName.textContent = item.name;
  if (detailCategory) detailCategory.textContent = item.category;
  if (detailPrice) detailPrice.textContent = item.price;
  if (detailStatusText) detailStatusText.textContent = item.status;
  if (detailDescription) detailDescription.textContent = item.description;
  if (detailImage) {
    detailImage.src = item.image;
    detailImage.alt = item.name;
  }

  if (detailStatusBadge) {
    detailStatusBadge.textContent = item.status;
    detailStatusBadge.className = "status-badge";
    if (item.status === "Available") {
      detailStatusBadge.classList.add("available");
    } else if (item.status === "Pending Pickup") {
      detailStatusBadge.classList.add("pending");
    } else {
      detailStatusBadge.classList.add("sold");
    }
  }
}

loadItemDetails();

// Status update buttons
const statusText = document.getElementById("detailStatusText");
const statusBadge = document.getElementById("detailStatusBadge");
const statusButtons = document.querySelectorAll(".status-action");

statusButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const newStatus = button.dataset.status;
    if (!statusText || !statusBadge) return;

    statusText.textContent = newStatus;
    statusBadge.className = "status-badge";
    statusBadge.textContent = newStatus;

    if (newStatus === "Available") {
      statusBadge.classList.add("available");
    } else if (newStatus === "Pending Pickup") {
      statusBadge.classList.add("pending");
    } else {
      statusBadge.classList.add("sold");
    }
  });
});

// Chat widget
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
    const questionText = button.textContent.trim();
    const answerText = button.dataset.answer;

    const userBubble = document.createElement("div");
    userBubble.className = "user-response";
    userBubble.textContent = questionText;

    const assistantBubble = document.createElement("div");
    assistantBubble.className = "assistant-response";

    chatResponses.appendChild(userBubble);
    chatResponses.appendChild(assistantBubble);

    let i = 0;
    function typeEffect() {
      if (i < answerText.length) {
        assistantBubble.textContent += answerText.charAt(i);
        i++;
        setTimeout(typeEffect, 10);
      }
    }

    typeEffect();
  });
});