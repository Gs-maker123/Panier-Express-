// ---------- STOCKAGE ----------
const STORAGE_KEY = 'panier_express_plus';
const THEME_KEY = 'panier_night_mode';
const CATEGORIES_KEY = 'panier_categories';
const BUDGET_KEY = 'panier_budget';

// Catégories par défaut
const defaultCategoriesList = [
  "Produits laitiers",
  "Produits d'entretien",
  "Viandes",
  "Surgelés",
  "Conserves",
  "Céréales",
  "Légumes frais",
  "Féculents",
  "Fruits frais",
  "Charcuterie",
  "Salle de bain"
];

let articles = [];
let categories = [...defaultCategoriesList];
let currentFilter = "all";
let currentBudget = 50;
let selectedArticleId = null;
let isReorderMode = false;
let dragSourceId = null;

// ---------- Gestion du budget ----------
function loadBudget() {
  const stored = localStorage.getItem(BUDGET_KEY);
  if (stored !== null) {
    currentBudget = parseFloat(stored);
  } else {
    currentBudget = 50;
  }
  const budgetInput = document.getElementById('budgetInput');
  if (budgetInput) budgetInput.value = currentBudget;
}

function saveBudget() {
  localStorage.setItem(BUDGET_KEY, currentBudget.toString());
}

function applyBudgetColorToTotal() {
  const totalElem = document.querySelector('.total-courses');
  if (!totalElem) return;
  const totalText = totalElem.textContent;
  const totalMatch = totalText.match(/[\d,.]+/);
  if (totalMatch) {
    const total = parseFloat(totalMatch[0].replace(',', '.'));
    totalElem.classList.remove('within-budget', 'over-budget');
    if (total <= currentBudget) {
      totalElem.classList.add('within-budget');
    } else {
      totalElem.classList.add('over-budget');
    }
  }
}

// ---------- Gestion catégories ----------
function loadCategories() {
  const stored = localStorage.getItem(CATEGORIES_KEY);
  if (stored) {
    categories = JSON.parse(stored);
  } else {
    categories = [...defaultCategoriesList];
  }
  renderCategoryFilter();
  renderCategoryOptions();
}

function saveCategories() {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

function renderCategoryFilter() {
  const filterSelect = document.getElementById('categoryFilter');
  if (!filterSelect) return;
  filterSelect.innerHTML = '<option value="all">📋 Toutes les catégories</option>';
  categories.sort().forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    filterSelect.appendChild(option);
  });
  filterSelect.value = currentFilter;
}

function renderCategoryOptions() {
  const newCatSelect = document.getElementById('newArticleCategory');
  if (newCatSelect) {
    newCatSelect.innerHTML = '';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      newCatSelect.appendChild(option);
    });
  }
}

function addNewCategory() {
  let newCat = prompt("Nom de la nouvelle catégorie :");
  if (newCat && newCat.trim() !== "") {
    newCat = newCat.trim();
    if (!categories.includes(newCat)) {
      categories.push(newCat);
      saveCategories();
      renderCategoryFilter();
      renderCategoryOptions();
      renderInventory();
    } else {
      alert("Cette catégorie existe déjà.");
    }
  }
}

// ---------- Modèle initial ----------
const defaultArticles = [
  { id: '1', name: 'Lait', unit: 'L', quantityOwned: 0.5, pricePerUnit: 1.20, mode: 'target', stockTarget: 1, hasStock: true, category: 'Produits laitiers', order: 0 },
  { id: '2', name: 'Pain', unit: 'pcs', quantityOwned: 0, pricePerUnit: 1.10, mode: 'binary', stockTarget: null, hasStock: false, category: 'Céréales', order: 1 },
  { id: '3', name: 'Œufs', unit: 'pcs', quantityOwned: 2, pricePerUnit: 0.25, mode: 'target', stockTarget: 6, hasStock: true, category: 'Produits laitiers', order: 2 },
  { id: '4', name: 'Beurre', unit: 'pcs', quantityOwned: 0, pricePerUnit: 2.10, mode: 'binary', stockTarget: null, hasStock: false, category: 'Produits laitiers', order: 3 },
  { id: '5', name: 'Café', unit: 'pack', quantityOwned: 1, pricePerUnit: 4.50, mode: 'target', stockTarget: 2, hasStock: true, category: 'Céréales', order: 4 },
  { id: '6', name: 'Lessive', unit: 'L', quantityOwned: 0.2, pricePerUnit: 6.90, mode: 'target', stockTarget: 1, hasStock: true, category: 'Produits d\'entretien', order: 5 },
  { id: '7', name: 'Papier toilette', unit: 'roll', quantityOwned: 1, pricePerUnit: 1.80, mode: 'target', stockTarget: 6, hasStock: true, category: 'Salle de bain', order: 6 },
  { id: '8', name: 'Pommes', unit: 'kg', quantityOwned: 0, pricePerUnit: 2.50, mode: 'binary', stockTarget: null, hasStock: false, category: 'Fruits frais', order: 7 }
];

function saveToLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
}

function loadArticles() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    articles = JSON.parse(stored);
    articles = articles.map(a => {
      if (!a.category) a.category = "Autre";
      if (a.order === undefined) a.order = 0;
      return a;
    });
  } else {
    articles = defaultArticles.map(a => ({ ...a }));
  }
  // Trier par order
  articles.sort((a, b) => (a.order || 0) - (b.order || 0));
  renderInventory();
  updateShoppingListDisplay();
}

function generateId() {
  return Date.now() + '-' + Math.random().toString(36).substr(2, 6);
}

function getQuantityToBuy(article) {
  if (article.mode === 'target' && article.stockTarget !== null && article.stockTarget > 0) {
    const need = article.stockTarget - article.quantityOwned;
    return need > 0 ? need : 0;
  } else {
    return article.hasStock ? 0 : 1;
  }
}

function getShoppingList() {
  const list = [];
  for (let a of articles) {
    const qty = getQuantityToBuy(a);
    if (qty > 0) {
      list.push({
        id: a.id,
        name: a.name,
        quantity: qty,
        unit: a.unit,
        pricePerUnit: a.pricePerUnit,
        total: qty * a.pricePerUnit,
        category: a.category
      });
    }
  }
  return list;
}

function computeTotal(list) {
  return list.reduce((sum, item) => sum + item.total, 0);
}

function editArticleName(articleId) {
  const article = articles.find(a => a.id === articleId);
  if (!article) return;
  const card = document.querySelector(`.article-card[data-id="${articleId}"]`);
  const nameSpan = card.querySelector('.article-name');
  const input = document.createElement('input');
  input.type = 'text';
  input.value = article.name;
  input.classList.add('edit-name-input');
  const parent = nameSpan.parentNode;
  parent.replaceChild(input, nameSpan);
  input.focus();
  input.select();
  const saveNewName = () => {
    const newName = input.value.trim();
    if (newName && newName !== article.name) {
      article.name = newName;
      saveAndRefresh();
    } else {
      const newSpan = document.createElement('span');
      newSpan.className = 'article-name';
      newSpan.textContent = article.name;
      parent.replaceChild(newSpan, input);
    }
  };
  input.addEventListener('blur', saveNewName);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    }
  });
}

function selectArticle(articleId) {
  document.querySelectorAll('.article-card').forEach(card => {
    card.classList.remove('selected');
  });
  const selectedCard = document.querySelector(`.article-card[data-id="${articleId}"]`);
  if (selectedCard) {
    selectedCard.classList.add('selected');
  }
  selectedArticleId = articleId;
}

// Gestion du drag & drop pour réorganisation
function handleDragStart(e, id) {
  if (!isReorderMode) return;
  dragSourceId = id;
  e.target.closest('.article-card').classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', id);
}
function handleDragEnd(e) {
  e.target.closest('.article-card')?.classList.remove('dragging');
  document.querySelectorAll('.article-card').forEach(card => {
    card.classList.remove('drag-over');
  });
  dragSourceId = null;
}
function handleDragOver(e) {
  if (!isReorderMode) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const targetCard = e.target.closest('.article-card');
  if (targetCard && targetCard.dataset.id !== dragSourceId) {
    targetCard.classList.add('drag-over');
  }
}
function handleDragLeave(e) {
  const targetCard = e.target.closest('.article-card');
  if (targetCard) targetCard.classList.remove('drag-over');
}
function handleDrop(e, targetId) {
  if (!isReorderMode) return;
  e.preventDefault();
  const targetCard = e.target.closest('.article-card');
  targetCard?.classList.remove('drag-over');
  if (dragSourceId && targetId && dragSourceId !== targetId) {
    const sourceIndex = articles.findIndex(a => a.id === dragSourceId);
    const targetIndex = articles.findIndex(a => a.id === targetId);
    if (sourceIndex !== -1 && targetIndex !== -1) {
      const [moved] = articles.splice(sourceIndex, 1);
      articles.splice(targetIndex, 0, moved);
      // Mettre à jour les orders
      articles.forEach((a, idx) => a.order = idx);
      saveAndRefresh();
    }
  }
}

function toggleReorderMode() {
  isReorderMode = !isReorderMode;
  const toolbar = document.querySelector('.action-toolbar');
  if (isReorderMode) {
    toolbar.classList.add('reorder-active');
    document.querySelectorAll('.article-card').forEach(card => {
      card.setAttribute('draggable', 'true');
    });
    alert("Mode réorganisation activé. Glissez-déposez les articles pour les réordonner. Cliquez à nouveau sur 🔀 pour désactiver.");
  } else {
    toolbar.classList.remove('reorder-active');
    document.querySelectorAll('.article-card').forEach(card => {
      card.setAttribute('draggable', 'false');
      card.classList.remove('dragging', 'drag-over');
    });
  }
}

function renderInventory() {
  const grid = document.getElementById('articlesGrid');
  if (!grid) return;

  let filteredArticles = articles;
  if (currentFilter !== "all") {
    filteredArticles = articles.filter(a => a.category === currentFilter);
  }

  grid.innerHTML = '';
  filteredArticles.forEach(article => {
    const card = document.createElement('div');
    card.className = 'article-card';
    card.dataset.id = article.id;
    card.setAttribute('draggable', isReorderMode ? 'true' : 'false');

    // Gestion drag & drop
    card.addEventListener('dragstart', (e) => handleDragStart(e, article.id));
    card.addEventListener('dragend', handleDragEnd);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('dragleave', handleDragLeave);
    card.addEventListener('drop', (e) => handleDrop(e, article.id));

    const isBinary = article.mode === 'binary';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'card-header';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'article-name';
    nameSpan.textContent = article.name;
    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️';
    editBtn.className = 'edit-name-btn';
    editBtn.title = 'Modifier le nom';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      editArticleName(article.id);
    });
    const modeBadge = document.createElement('span');
    modeBadge.className = 'mode-badge';
    modeBadge.textContent = isBinary ? '⚖️ Mode binaire' : '🎯 Stock cible';
    headerDiv.appendChild(nameSpan);
    headerDiv.appendChild(editBtn);
    headerDiv.appendChild(modeBadge);

    const fieldsDiv = document.createElement('div');
    fieldsDiv.className = 'row-fields';
    fieldsDiv.innerHTML = `
      <div class="field">
        <label>Qté possédée</label>
        <input type="number" step="0.1" value="${article.quantityOwned}" class="qty-owned">
      </div>
      <div class="field">
        <label>Unité</label>
        <select class="unit-select">
          <option value="pcs" ${article.unit === 'pcs' ? 'selected' : ''}>pièce(s)</option>
          <option value="kg" ${article.unit === 'kg' ? 'selected' : ''}>kg</option>
          <option value="L" ${article.unit === 'L' ? 'selected' : ''}>L</option>
          <option value="pack" ${article.unit === 'pack' ? 'selected' : ''}>paquet(s)</option>
          <option value="roll" ${article.unit === 'roll' ? 'selected' : ''}>rouleau(x)</option>
          <option value="other" ${article.unit === 'other' ? 'selected' : ''}>autre</option>
        </select>
      </div>
      <div class="field">
        <label>Prix unitaire (€)</label>
        <input type="number" step="0.01" value="${article.pricePerUnit}" class="price-unit">
      </div>
    `;

    const catDiv = document.createElement('div');
    catDiv.className = 'field';
    catDiv.innerHTML = `
      <label>Catégorie</label>
      <select class="category-select">
        ${categories.map(cat => `<option value="${cat}" ${article.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
      </select>
    `;
    fieldsDiv.appendChild(catDiv);

    const modeSwitch = document.createElement('div');
    modeSwitch.className = 'mode-switch';
    modeSwitch.innerHTML = `
      <label><input type="radio" name="mode-${article.id}" value="binary" ${isBinary ? 'checked' : ''}> Mode binaire</label>
      <label><input type="radio" name="mode-${article.id}" value="target" ${!isBinary ? 'checked' : ''}> Stock souhaité</label>
    `;

    const dynamicZone = document.createElement('div');
    if (isBinary) {
      dynamicZone.innerHTML = `<div style="margin:12px 0"><label><input type="checkbox" class="has-stock-check" ${article.hasStock ? 'checked' : ''}> ✅ J'ai encore cet article</label></div>`;
    } else {
      dynamicZone.innerHTML = `<div class="stock-target-area"><span>📌 Stock souhaité :</span><input type="number" step="0.1" value="${article.stockTarget ?? 1}" class="stock-target-input"> ${article.unit}</div>`;
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️ Supprimer';
    deleteBtn.className = 'delete-btn';

    card.appendChild(headerDiv);
    card.appendChild(fieldsDiv);
    card.appendChild(modeSwitch);
    card.appendChild(dynamicZone);
    card.appendChild(deleteBtn);
    grid.appendChild(card);

    // Événements
    const qtyInput = card.querySelector('.qty-owned');
    const unitSelect = card.querySelector('.unit-select');
    const priceInput = card.querySelector('.price-unit');
    const catSelect = card.querySelector('.category-select');
    const radioBinary = card.querySelector(`input[value="binary"]`);
    const radioTarget = card.querySelector(`input[value="target"]`);

    qtyInput.addEventListener('change', (e) => {
      article.quantityOwned = parseFloat(e.target.value) || 0;
      saveAndRefresh();
    });
    unitSelect.addEventListener('change', (e) => {
      article.unit = e.target.value;
      saveAndRefresh();
    });
    priceInput.addEventListener('change', (e) => {
      article.pricePerUnit = parseFloat(e.target.value) || 0;
      saveAndRefresh();
    });
    catSelect.addEventListener('change', (e) => {
      article.category = e.target.value;
      saveAndRefresh();
    });
    radioBinary.addEventListener('change', () => {
      if (radioBinary.checked) {
        article.mode = 'binary';
        article.stockTarget = null;
        saveAndRefresh();
      }
    });
    radioTarget.addEventListener('change', () => {
      if (radioTarget.checked) {
        article.mode = 'target';
        if (article.stockTarget === null) article.stockTarget = 1;
        saveAndRefresh();
      }
    });
    if (isBinary) {
      const chk = card.querySelector('.has-stock-check');
      chk.addEventListener('change', (e) => {
        article.hasStock = e.target.checked;
        saveAndRefresh();
      });
    } else {
      const targetInput = card.querySelector('.stock-target-input');
      targetInput.addEventListener('change', (e) => {
        article.stockTarget = parseFloat(e.target.value) || 0;
        saveAndRefresh();
      });
    }
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Supprimer cet article ?')) {
        articles = articles.filter(a => a.id !== article.id);
        saveAndRefresh();
      }
    });

    card.addEventListener('click', (e) => {
      if (isReorderMode) return; // désactive sélection en mode réorganisation
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.closest('.edit-name-btn')) return;
      selectArticle(article.id);
    });
  });
}

function saveAndRefresh() {
  saveToLocal();
  renderInventory();
  updateShoppingListDisplay();
}

function updateShoppingListDisplay() {
  const container = document.getElementById('shoppingListContent');
  if (!container) return;
  const items = getShoppingList();
  const total = computeTotal(items);
  if (items.length === 0) {
    container.innerHTML = `<div class="empty-list">✅ Rien à acheter !</div>`;
  } else {
    container.innerHTML = `
      <div>
        ${items.map(item => `
          <div class="shopping-item">
            <span class="item-name">${escapeHtml(item.name)}</span>
            <span>${item.quantity} ${item.unit} × ${item.pricePerUnit.toFixed(2)} €</span>
            <span class="item-total">${item.total.toFixed(2)} €</span>
          </div>
        `).join('')}
      </div>
      <div class="total-courses">💰 Total estimé : ${total.toFixed(2)} €</div>
    `;
  }
  applyBudgetColorToTotal();
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// ---------- Actions de la toolbar ----------
function createNewArticle() {
  const nameInput = document.getElementById('newArticleName');
  if (nameInput) {
    nameInput.value = "Nouvel article";
    nameInput.focus();
  } else {
    alert("Utilisez le champ d'ajout ci-dessus");
  }
}

function modifySelectedArticle() {
  if (!selectedArticleId) {
    alert("Aucun article sélectionné. Cliquez sur un article d'abord.");
    return;
  }
  editArticleName(selectedArticleId);
}

function duplicateSelectedArticle() {
  if (!selectedArticleId) {
    alert("Aucun article sélectionné.");
    return;
  }
  const original = articles.find(a => a.id === selectedArticleId);
  if (original) {
    const newOrder = Math.max(...articles.map(a => a.order || 0)) + 1;
    const newArticle = {
      ...original,
      id: generateId(),
      name: original.name + " (copie)",
      quantityOwned: 0,
      hasStock: false,
      stockTarget: original.stockTarget,
      order: newOrder
    };
    articles.push(newArticle);
    saveAndRefresh();
    alert("Article dupliqué !");
  }
}

function saveManually() {
  saveToLocal();
  alert("Données sauvegardées manuellement.");
}

// ---------- Autres actions ----------
function addNewArticle() {
  const nameInput = document.getElementById('newArticleName');
  const unitSelect = document.getElementById('newArticleUnit');
  const catSelect = document.getElementById('newArticleCategory');
  const name = nameInput.value.trim();
  if (!name) {
    alert("Veuillez entrer un nom d'article");
    return;
  }
  const newOrder = articles.length;
  const newArticle = {
    id: generateId(),
    name: name,
    unit: unitSelect.value,
    quantityOwned: 0,
    pricePerUnit: 0.00,
    mode: 'binary',
    stockTarget: null,
    hasStock: false,
    category: catSelect.value,
    order: newOrder
  };
  articles.push(newArticle);
  saveAndRefresh();
  nameInput.value = '';
}

function exportData() {
  const dataStr = JSON.stringify({ articles, categories });
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `panier_export_${new Date().toISOString().slice(0,19)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported.articles && Array.isArray(imported.articles)) {
        articles = imported.articles;
      } else if (Array.isArray(imported)) {
        articles = imported;
      } else {
        throw new Error();
      }
      if (imported.categories && Array.isArray(imported.categories)) {
        categories = imported.categories;
        saveCategories();
        renderCategoryFilter();
        renderCategoryOptions();
      }
      // Assurer order
      articles.forEach((a, idx) => { if (a.order === undefined) a.order = idx; });
      articles.sort((a,b) => (a.order||0) - (b.order||0));
      saveAndRefresh();
      alert('Import réussi !');
    } catch (err) {
      alert('Fichier JSON invalide');
    }
  };
  reader.readAsText(file);
}

function resetToDemo() {
  if (confirm('Remplacer par les articles par défaut ?')) {
    articles = defaultArticles.map(a => ({ ...a }));
    categories = [...defaultCategoriesList];
    saveCategories();
    renderCategoryFilter();
    renderCategoryOptions();
    saveAndRefresh();
  }
}

async function shareList() {
  const items = getShoppingList();
  const total = computeTotal(items);
  const lines = items.map(i => `${i.name} : ${i.quantity} ${i.unit} → ${i.total.toFixed(2)} €`);
  const message = `📋 Liste courses\n${lines.join('\n')}\n🧾 Total : ${total.toFixed(2)} €\n💰 Budget : ${currentBudget.toFixed(2)} €`;
  if (navigator.share) try { await navigator.share({ title: 'Courses', text: message }); } catch(e) {}
  else { navigator.clipboard.writeText(message); alert('Liste copiée'); }
}

function copyList() {
  const items = getShoppingList();
  const total = computeTotal(items);
  const text = items.map(i => `${i.name} : ${i.quantity} ${i.unit} (${i.total.toFixed(2)}€)`).join('\n');
  navigator.clipboard.writeText(`Liste courses\n${text}\nTotal : ${total.toFixed(2)}€\nBudget : ${currentBudget.toFixed(2)}€`);
  alert('Copié !');
}

function printList() {
  const items = getShoppingList();
  const total = computeTotal(items);
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Courses</title><style>body{font-family:sans-serif;padding:2rem;}h2{color:#0066cc;}li{margin:8px 0;}.total{font-weight:bold;}</style></head><body><h2>🛒 Liste courses</h2><ul>${items.map(i => `<li>${i.name} : ${i.quantity} ${i.unit} – ${i.total.toFixed(2)} €</li>`).join('')}</ul><div class="total">Total : ${total.toFixed(2)} €</div><div>Budget : ${currentBudget.toFixed(2)} €</div></body></html>`);
  w.document.close();
  w.print();
}

// ---------- Mode nuit ----------
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isNight = saved === 'dark' || (saved === null && prefersDark);
  if (isNight) { document.body.classList.add('dark'); updateThemeIcon(true); }
  else { document.body.classList.remove('dark'); updateThemeIcon(false); }
}
function updateThemeIcon(isNight) {
  const btn = document.getElementById('themeToggle');
  if (btn) { btn.textContent = isNight ? '☀️' : '🌙'; btn.title = isNight ? 'Mode jour' : 'Mode nuit'; }
}
function toggleTheme() {
  const isNight = document.body.classList.toggle('dark');
  localStorage.setItem(THEME_KEY, isNight ? 'dark' : 'light');
  updateThemeIcon(isNight);
}

// ---------- Scroll to top ----------
function initScrollToTop() {
  const scrollBtn = document.getElementById('scrollToTopBtn');
  if (!scrollBtn) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      scrollBtn.classList.add('show');
    } else {
      scrollBtn.classList.remove('show');
    }
  });
  scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ---------- Filtre ----------
function setupFilterListener() {
  const filterSelect = document.getElementById('categoryFilter');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      currentFilter = e.target.value;
      renderInventory();
    });
  }
}

function setupBudgetListener() {
  const budgetInput = document.getElementById('budgetInput');
  if (budgetInput) {
    budgetInput.addEventListener('change', (e) => {
      let val = parseFloat(e.target.value);
      if (isNaN(val)) val = 0;
      currentBudget = val;
      saveBudget();
      applyBudgetColorToTotal();
    });
  }
}

// ---------- Event listeners ----------
function setupEventListeners() {
  document.getElementById('addArticleBtn')?.addEventListener('click', addNewArticle);
  document.getElementById('exportBtn')?.addEventListener('click', exportData);
  const importBtn = document.getElementById('importBtn');
  const fileInput = document.getElementById('importFile');
  importBtn?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', (e) => {
    if (e.target.files.length) importData(e.target.files[0]);
    fileInput.value = '';
  });
  document.getElementById('resetDemoBtn')?.addEventListener('click', resetToDemo);
  document.getElementById('shareListBtn')?.addEventListener('click', shareList);
  document.getElementById('copyListBtn')?.addEventListener('click', copyList);
  document.getElementById('printListBtn')?.addEventListener('click', printList);
  const toggleBtn = document.getElementById('toggleShoppingBtn');
  const shoppingContainer = document.getElementById('shoppingListContainer');
  toggleBtn?.addEventListener('click', () => {
    const hidden = shoppingContainer.classList.toggle('hidden');
    toggleBtn.textContent = hidden ? '▼ Afficher' : '▲ Masquer';
  });
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
  document.getElementById('addCategoryBtn')?.addEventListener('click', addNewCategory);
  
  // Toolbar actions
  document.getElementById('toolbarCreate')?.addEventListener('click', createNewArticle);
  document.getElementById('toolbarModify')?.addEventListener('click', modifySelectedArticle);
  document.getElementById('toolbarDuplicate')?.addEventListener('click', duplicateSelectedArticle);
  document.getElementById('toolbarReorder')?.addEventListener('click', toggleReorderMode);
  document.getElementById('toolbarSave')?.addEventListener('click', saveManually);
  
  setupFilterListener();
  setupBudgetListener();
}

// ---------- Initialisation ----------
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadBudget();
  loadCategories();
  loadArticles();
  setupEventListeners();
  initScrollToTop();
  document.getElementById('shoppingListContainer')?.classList.remove('hidden');
});
