// ---------- STOCKAGE ----------
const STORAGE_KEY = 'panier_express';
const THEME_KEY = 'panier_theme';
const CATEGORIES_KEY = 'panier_categories';
const BUDGET_KEY = 'panier_budget';

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
let shoppingCheckedItems = new Set();

// ---------- FONCTIONS UTILITAIRES ----------
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    if (m === '"') return '&quot;';
    return m;
  });
}

function generateId() {
  return Date.now() + '-' + Math.random().toString(36).substr(2, 6);
}

// ---------- BUDGET ----------
function loadBudget() {
  const stored = localStorage.getItem(BUDGET_KEY);
  currentBudget = stored !== null ? parseFloat(stored) : 50;
  const input = document.getElementById('budgetInput');
  if (input) input.value = currentBudget;
}

function saveBudget() {
  localStorage.setItem(BUDGET_KEY, currentBudget.toString());
}

function updateBudgetUI(total) {
  const bar = document.getElementById('budgetBar');
  const alert = document.getElementById('budgetAlert');
  if (!bar) return;
  const pct = currentBudget > 0 ? Math.min(100, (total / currentBudget) * 100) : 0;
  bar.style.width = pct + '%';
  bar.classList.toggle('over-budget', total > currentBudget);
  if (alert) {
    alert.classList.toggle('hidden', pct < 80 || total === 0);
  }
}

// ---------- CATÉGORIES ----------
function loadCategories() {
  const stored = localStorage.getItem(CATEGORIES_KEY);
  categories = stored ? JSON.parse(stored) : [...defaultCategoriesList];
  renderCategoryFilter();
  renderCategoryOptions();
}

function saveCategories() {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

function renderCategoryFilter() {
  const select = document.getElementById('categoryFilter');
  if (!select) return;
  select.innerHTML = '<option value="all">📋 Toutes les catégories</option>';
  categories.sort().forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
  select.value = currentFilter;
}

function renderCategoryOptions() {
  const select = document.getElementById('newArticleCategory');
  if (!select) return;
  select.innerHTML = '';
  categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

function addNewCategory() {
  const name = prompt("Nom de la nouvelle catégorie :");
  if (name && name.trim() && !categories.includes(name.trim())) {
    categories.push(name.trim());
    saveCategories();
    renderCategoryFilter();
    renderCategoryOptions();
    renderInventory();
  } else if (name && name.trim()) {
    alert("Cette catégorie existe déjà.");
  }
}

// ---------- MODÈLE INITIAL ----------
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
    articles = JSON.parse(stored).map(a => {
      if (!a.category) a.category = "Autre";
      if (a.order === undefined) a.order = 0;
      return a;
    });
  } else {
    articles = defaultArticles.map(a => ({ ...a }));
  }
  articles.sort((a, b) => (a.order || 0) - (b.order || 0));
  renderInventory();
  updateShoppingList();
}

function getQuantityToBuy(article) {
  if (article.mode === 'target' && article.stockTarget !== null && article.stockTarget > 0) {
    return Math.max(0, article.stockTarget - article.quantityOwned);
  }
  return article.hasStock ? 0 : 1;
}

function getShoppingItems() {
  const items = [];
  for (const a of articles) {
    const qty = getQuantityToBuy(a);
    if (qty > 0) {
      items.push({
        id: a.id,
        name: a.name,
        quantity: qty,
        unit: a.unit,
        pricePerUnit: a.pricePerUnit,
        total: qty * a.pricePerUnit,
        category: a.category,
        checked: shoppingCheckedItems.has(a.id)
      });
    }
  }
  return items;
}

function computeTotal(items) {
  return items.reduce((sum, i) => sum + i.total, 0);
}

// ---------- RENDU INVENTAIRE ----------
function renderInventory() {
  const container = document.getElementById('articlesGrid');
  if (!container) return;

  let filtered = currentFilter !== "all" ? articles.filter(a => a.category === currentFilter) : articles;
  filtered.sort((a, b) => (a.order || 0) - (b.order || 0));

  container.innerHTML = '';
  
  const grouped = {};
  filtered.forEach(a => {
    const cat = a.category || 'Sans catégorie';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(a);
  });

  const listDiv = document.createElement('div');
  listDiv.className = 'inventory-list';

  Object.keys(grouped).sort().forEach(cat => {
    const header = document.createElement('div');
    header.style.cssText = `
      font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
      color: var(--gray-600); opacity: 0.6; padding: 8px 4px 4px;
      letter-spacing: 0.5px; border-bottom: 1px solid var(--gray-200);
      margin-top: 4px;
    `;
    header.textContent = cat;
    listDiv.appendChild(header);

    grouped[cat].forEach(article => {
      const item = createArticleItem(article);
      listDiv.appendChild(item);
    });
  });

  container.appendChild(listDiv);
  document.getElementById('inventoryCount').textContent = articles.length;
}

function createArticleItem(article) {
  const item = document.createElement('div');
  item.className = 'article-item';
  item.dataset.id = article.id;
  item.setAttribute('draggable', isReorderMode ? 'true' : 'false');

  const isBinary = article.mode === 'binary';

  const colName = document.createElement('div');
  colName.className = 'col-name';
  colName.innerHTML = `<span class="article-name" ondblclick="editArticleName('${article.id}')">${escapeHtml(article.name)}</span>`;
  item.appendChild(colName);

  const colQty = document.createElement('div');
  colQty.className = 'col-qty';
  colQty.innerHTML = `<input type="number" step="0.1" value="${article.quantityOwned}" class="qty-input">`;
  item.appendChild(colQty);

  const colPrice = document.createElement('div');
  colPrice.className = 'col-price';
  colPrice.innerHTML = `<input type="number" step="0.01" value="${article.pricePerUnit}" class="price-input"><span style="font-size:0.7rem;opacity:0.6;">€</span>`;
  item.appendChild(colPrice);

  const colUnit = document.createElement('div');
  colUnit.className = 'col-unit';
  colUnit.innerHTML = `<select class="unit-select">
    <option value="pcs" ${article.unit === 'pcs' ? 'selected' : ''}>pièce</option>
    <option value="kg" ${article.unit === 'kg' ? 'selected' : ''}>kg</option>
    <option value="L" ${article.unit === 'L' ? 'selected' : ''}>L</option>
    <option value="pack" ${article.unit === 'pack' ? 'selected' : ''}>paquet</option>
    <option value="roll" ${article.unit === 'roll' ? 'selected' : ''}>rouleau</option>
    <option value="other" ${article.unit === 'other' ? 'selected' : ''}>autre</option>
  </select>`;
  item.appendChild(colUnit);

  const colCat = document.createElement('div');
  colCat.className = 'col-category';
  colCat.innerHTML = `<select class="category-select">
    ${categories.map(c => `<option value="${c}" ${article.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
  </select>`;
  item.appendChild(colCat);

  const colMode = document.createElement('div');
  colMode.className = 'col-mode';
  colMode.innerHTML = `<span class="mode-badge-sm">${isBinary ? '⚖️' : '🎯'}</span>`;
  item.appendChild(colMode);

  const colActions = document.createElement('div');
  colActions.className = 'col-actions';
  colActions.innerHTML = `
    <button class="edit-btn" title="Modifier le nom">✏️</button>
    <button class="duplicate-btn" title="Dupliquer">📋</button>
    <button class="delete-btn" title="Supprimer">✕</button>
  `;
  item.appendChild(colActions);

  const details = document.createElement('div');
  details.className = 'details';
  details.innerHTML = `
    <div class="mode-switch">
      <label><input type="radio" name="mode-${article.id}" value="binary" ${isBinary ? 'checked' : ''}> Mode binaire</label>
      <label><input type="radio" name="mode-${article.id}" value="target" ${!isBinary ? 'checked' : ''}> Stock cible</label>
    </div>
    <div class="stock-target-area">
      <span>📌 Stock souhaité :</span>
      <input type="number" step="0.1" value="${article.stockTarget !== null ? article.stockTarget : ''}" class="target-input" placeholder="-">
      <span>${article.unit}</span>
    </div>
    <div class="has-stock-check">
      <label><input type="checkbox" class="has-stock-checkbox" ${article.hasStock ? 'checked' : ''}> ✅ J'ai encore</label>
    </div>
  `;
  item.appendChild(details);

  const qtyInput = item.querySelector('.qty-input');
  const priceInput = item.querySelector('.price-input');
  const unitSelect = item.querySelector('.unit-select');
  const catSelect = item.querySelector('.category-select');
  const targetInput = item.querySelector('.target-input');
  const hasStockCheck = item.querySelector('.has-stock-checkbox');
  const radioBinary = item.querySelector(`[name="mode-${article.id}"][value="binary"]`);
  const radioTarget = item.querySelector(`[name="mode-${article.id}"][value="target"]`);

  const saveField = () => saveAndRefresh();

  qtyInput.addEventListener('change', () => { article.quantityOwned = parseFloat(qtyInput.value) || 0; saveField(); });
  priceInput.addEventListener('change', () => { article.pricePerUnit = parseFloat(priceInput.value) || 0; saveField(); });
  unitSelect.addEventListener('change', () => { article.unit = unitSelect.value; saveField(); });
  catSelect.addEventListener('change', () => { article.category = catSelect.value; saveField(); });

  radioBinary.addEventListener('change', () => {
    if (radioBinary.checked) { article.mode = 'binary'; article.stockTarget = null; saveField(); }
  });
  radioTarget.addEventListener('change', () => {
    if (radioTarget.checked) { article.mode = 'target'; if (article.stockTarget === null) article.stockTarget = 1; saveField(); }
  });
  if (targetInput) {
    targetInput.addEventListener('change', () => {
      const val = targetInput.value.trim() === '' ? null : parseFloat(targetInput.value);
      article.stockTarget = val;
      saveField();
    });
  }
  if (hasStockCheck) {
    hasStockCheck.addEventListener('change', () => {
      article.hasStock = hasStockCheck.checked;
      saveField();
    });
  }

  const editBtn = item.querySelector('.edit-btn');
  const dupBtn = item.querySelector('.duplicate-btn');
  const delBtn = item.querySelector('.delete-btn');

  editBtn.addEventListener('click', (e) => { e.stopPropagation(); editArticleName(article.id); });
  dupBtn.addEventListener('click', (e) => { e.stopPropagation(); duplicateArticle(article.id); });
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm('Supprimer cet article ?')) {
      articles = articles.filter(a => a.id !== article.id);
      saveAndRefresh();
    }
  });

  item.addEventListener('click', (e) => {
    if (isReorderMode) return;
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
    item.classList.toggle('expanded');
    selectArticle(article.id);
  });

  item.addEventListener('dragstart', (e) => handleDragStart(e, article.id));
  item.addEventListener('dragend', handleDragEnd);
  item.addEventListener('dragover', handleDragOver);
  item.addEventListener('dragleave', handleDragLeave);
  item.addEventListener('drop', (e) => handleDrop(e, article.id));

  return item;
}

// ---------- GESTION LISTE DE COURSES ----------
function updateShoppingList() {
  const container = document.getElementById('shoppingListContent');
  if (!container) return;

  const items = getShoppingItems();
  const total = computeTotal(items);

  document.getElementById('shoppingCount').textContent = items.length;

  if (items.length === 0) {
    container.innerHTML = `<div class="empty-list">✅ Rien à acheter ! Inventaire complet.</div>`;
  } else {
    container.innerHTML = items.map(item => `
      <div class="shopping-item" data-id="${item.id}">
        <div class="item-left">
          <input type="checkbox" class="item-check" ${item.checked ? 'checked' : ''}>
          <span class="item-name ${item.checked ? 'checked' : ''}">${escapeHtml(item.name)}</span>
        </div>
        <div class="item-details">
          <input type="number" step="0.1" value="${item.quantity}" class="item-qty" min="0">
          <span>${item.unit}</span>
          <span>× ${item.pricePerUnit.toFixed(2)} €</span>
          <span class="item-total">${item.total.toFixed(2)} €</span>
          <button class="item-remove" title="Retirer de la liste">✕</button>
        </div>
      </div>
    `).join('');
  }

  const totalElem = document.querySelector('.total-courses');
  if (totalElem) {
    totalElem.textContent = `💰 Total estimé : ${total.toFixed(2)} €`;
    totalElem.classList.remove('within-budget', 'over-budget');
    if (total <= currentBudget) {
      totalElem.classList.add('within-budget');
    } else {
      totalElem.classList.add('over-budget');
    }
  }

  updateBudgetUI(total);

  document.querySelectorAll('.shopping-item').forEach(row => {
    const id = row.dataset.id;
    const check = row.querySelector('.item-check');
    const qtyInput = row.querySelector('.item-qty');
    const removeBtn = row.querySelector('.item-remove');
    const nameSpan = row.querySelector('.item-name');

    check.addEventListener('change', () => {
      if (check.checked) {
        shoppingCheckedItems.add(id);
        nameSpan.classList.add('checked');
      } else {
        shoppingCheckedItems.delete(id);
        nameSpan.classList.remove('checked');
      }
      updateShoppingList();
    });

    qtyInput.addEventListener('change', () => {
      const article = articles.find(a => a.id === id);
      if (!article) return;
      const val = parseFloat(qtyInput.value);
      if (!isNaN(val) && val >= 0) {
        if (article.mode === 'target') {
          article.stockTarget = article.quantityOwned + val;
        } else {
          article.hasStock = val === 0;
        }
        saveAndRefresh();
      }
    });

    removeBtn.addEventListener('click', () => {
      const article = articles.find(a => a.id === id);
      if (!article) return;
      if (article.mode === 'target') {
        article.stockTarget = article.quantityOwned;
      } else {
        article.hasStock = true;
      }
      shoppingCheckedItems.delete(id);
      saveAndRefresh();
    });
  });
}

// ---------- VALIDATION DES ACHATS ----------
function validatePurchases() {
  const items = getShoppingItems();
  const checkedItems = items.filter(i => i.checked);
  
  if (checkedItems.length === 0) {
    alert("Aucun article coché à valider.");
    return;
  }

  if (!confirm(`Valider l'achat de ${checkedItems.length} article(s) ?`)) return;

  checkedItems.forEach(item => {
    const article = articles.find(a => a.id === item.id);
    if (!article) return;
    article.quantityOwned += item.quantity;
    if (article.mode === 'target' && article.stockTarget !== null) {
      article.stockTarget = article.quantityOwned + item.quantity;
    }
    shoppingCheckedItems.delete(item.id);
  });

  saveAndRefresh();
  alert("✅ Achats validés ! Les stocks ont été mis à jour.");
}

// ---------- VIDER LA LISTE DE COURSES ----------
function clearShoppingList() {
  const items = getShoppingItems();
  if (items.length === 0) {
    alert("La liste est déjà vide.");
    return;
  }
  if (!confirm(`Vider la liste de courses (${items.length} article(s)) ?`)) return;
  
  items.forEach(item => {
    const article = articles.find(a => a.id === item.id);
    if (!article) return;
    if (article.mode === 'target') {
      article.stockTarget = article.quantityOwned;
    } else {
      article.hasStock = true;
    }
    shoppingCheckedItems.delete(item.id);
  });
  
  saveAndRefresh();
  alert("🗑️ Liste vidée.");
}

// ---------- AJOUT D'ARTICLE ----------
function addNewArticle() {
  const nameInput = document.getElementById('newArticleName');
  const qtyInput = document.getElementById('newArticleQty');
  const unitSelect = document.getElementById('newArticleUnit');
  const catSelect = document.getElementById('newArticleCategory');
  const priceInput = document.getElementById('newArticlePrice');

  const name = nameInput.value.trim();
  const quantity = parseFloat(qtyInput.value) || 0;
  const price = parseFloat(priceInput.value) || 0;

  if (!name) {
    alert("Veuillez entrer un nom d'article");
    nameInput.focus();
    return;
  }

  if (quantity <= 0) {
    alert("La quantité doit être supérieure à 0");
    qtyInput.focus();
    return;
  }

  const newArticle = {
    id: generateId(),
    name: name,
    unit: unitSelect.value,
    quantityOwned: quantity,
    pricePerUnit: price,
    mode: 'target',
    stockTarget: quantity,
    hasStock: true,
    category: catSelect.value || 'Autre',
    order: articles.length
  };

  articles.push(newArticle);
  saveAndRefresh();

  nameInput.value = '';
  qtyInput.value = '1';
  priceInput.value = '0.00';
  document.getElementById('newArticleTotal').textContent = 'Total : 0.00 €';
  nameInput.focus();
}

// ---------- CALCUL DU TOTAL EN TEMPS RÉEL ----------
function updateAddTotal() {
  const qtyInput = document.getElementById('newArticleQty');
  const priceInput = document.getElementById('newArticlePrice');
  const totalSpan = document.getElementById('newArticleTotal');
  
  if (!qtyInput || !priceInput || !totalSpan) return;
  
  const qty = parseFloat(qtyInput.value) || 0;
  const price = parseFloat(priceInput.value) || 0;
  const total = qty * price;
  
  totalSpan.textContent = `Total : ${total.toFixed(2)} €`;
  
  if (total > 0) {
    totalSpan.style.color = 'var(--primary)';
    totalSpan.style.opacity = '1';
  } else {
    totalSpan.style.color = 'var(--gray-500)';
    totalSpan.style.opacity = '0.6';
  }
}

// ---------- UTILITAIRES ----------
function editArticleName(articleId) {
  const article = articles.find(a => a.id === articleId);
  if (!article) return;
  const newName = prompt("Modifier le nom de l'article :", article.name);
  if (newName && newName.trim() && newName.trim() !== article.name) {
    article.name = newName.trim();
    saveAndRefresh();
  }
}

function duplicateArticle(articleId) {
  const original = articles.find(a => a.id === articleId);
  if (!original) return;
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
}

function selectArticle(articleId) {
  if (isReorderMode) return;
  document.querySelectorAll('.article-item').forEach(el => el.classList.remove('selected'));
  const el = document.querySelector(`.article-item[data-id="${articleId}"]`);
  if (el) el.classList.add('selected');
  selectedArticleId = articleId;
}

// ---------- DRAG & DROP ----------
function handleDragStart(e, id) {
  if (!isReorderMode) return;
  dragSourceId = id;
  e.target.closest('.article-item').classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', id);
}
function handleDragEnd(e) {
  e.target.closest('.article-item')?.classList.remove('dragging');
  document.querySelectorAll('.article-item').forEach(el => el.classList.remove('drag-over'));
  dragSourceId = null;
}
function handleDragOver(e) {
  if (!isReorderMode) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const target = e.target.closest('.article-item');
  if (target && target.dataset.id !== dragSourceId) target.classList.add('drag-over');
}
function handleDragLeave(e) {
  e.target.closest('.article-item')?.classList.remove('drag-over');
}
function handleDrop(e, targetId) {
  if (!isReorderMode) return;
  e.preventDefault();
  e.target.closest('.article-item')?.classList.remove('drag-over');
  if (dragSourceId && targetId && dragSourceId !== targetId) {
    const srcIdx = articles.findIndex(a => a.id === dragSourceId);
    const tgtIdx = articles.findIndex(a => a.id === targetId);
    if (srcIdx !== -1 && tgtIdx !== -1) {
      const [moved] = articles.splice(srcIdx, 1);
      articles.splice(tgtIdx, 0, moved);
      articles.forEach((a, i) => a.order = i);
      saveAndRefresh();
    }
  }
}

function toggleReorderMode() {
  isReorderMode = !isReorderMode;
  document.querySelectorAll('.article-item').forEach(el => {
    el.setAttribute('draggable', isReorderMode ? 'true' : 'false');
  });
  if (isReorderMode) {
    document.querySelector('.inventory-toolbar')?.classList.add('reorder-active');
    document.querySelector('.shopping-toolbar')?.classList.add('reorder-active');
    alert("🔀 Mode réorganisation activé. Glissez-déposez pour réordonner.");
  } else {
    document.querySelector('.inventory-toolbar')?.classList.remove('reorder-active');
    document.querySelector('.shopping-toolbar')?.classList.remove('reorder-active');
    document.querySelectorAll('.article-item').forEach(el => {
      el.classList.remove('dragging', 'drag-over');
    });
    selectedArticleId = null;
  }
}

// ---------- ACTIONS STICKYBAR ----------
function createNewArticle() {
  const input = document.getElementById('newArticleName');
  if (input) { input.value = "Nouvel article"; input.focus(); }
}

function modifySelectedArticle() {
  if (!selectedArticleId) { alert("Aucun article sélectionné."); return; }
  editArticleName(selectedArticleId);
}

function duplicateSelectedArticle() {
  if (!selectedArticleId) { alert("Aucun article sélectionné."); return; }
  duplicateArticle(selectedArticleId);
}

function saveManually() {
  saveToLocal();
  alert("✅ Données sauvegardées.");
}

// ---------- AUTRES ACTIONS ----------
function exportData() {
  const data = JSON.stringify({ articles, categories }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `panier_express_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.articles) articles = data.articles;
      else if (Array.isArray(data)) articles = data;
      else throw new Error();
      if (data.categories) { categories = data.categories; saveCategories(); }
      articles.forEach((a, i) => { if (a.order === undefined) a.order = i; });
      saveAndRefresh();
      alert("✅ Import réussi !");
    } catch { alert("❌ Fichier invalide."); }
  };
  reader.readAsText(file);
}

function resetToDemo() {
  if (!confirm("Remplacer par les articles par défaut ?")) return;
  articles = defaultArticles.map(a => ({ ...a }));
  categories = [...defaultCategoriesList];
  saveCategories();
  shoppingCheckedItems.clear();
  saveAndRefresh();
}

function shareList() {
  const items = getShoppingItems();
  const total = computeTotal(items);
  const lines = items.map(i => `${i.name} : ${i.quantity} ${i.unit} → ${i.total.toFixed(2)}€`);
  const msg = `🛒 Liste courses\n${lines.join('\n')}\n💰 Total : ${total.toFixed(2)}€\n📊 Budget : ${currentBudget.toFixed(2)}€`;
  if (navigator.share) try { navigator.share({ title: 'Courses', text: msg }); } catch(e) {}
  else { navigator.clipboard.writeText(msg); alert("📋 Liste copiée !"); }
}

function copyList() {
  const items = getShoppingItems();
  const total = computeTotal(items);
  const text = items.map(i => `${i.name} : ${i.quantity} ${i.unit} (${i.total.toFixed(2)}€)`).join('\n');
  navigator.clipboard.writeText(`Liste courses\n${text}\nTotal : ${total.toFixed(2)}€\nBudget : ${currentBudget.toFixed(2)}€`);
  alert("📋 Copié !");
}

function printList() {
  const items = getShoppingItems();
  const total = computeTotal(items);
  const w = window.open('', '_blank');
  w.document.write(`
    <html><head><title>Courses</title>
    <style>body{font-family:sans-serif;padding:2rem;}h2{color:#4A6CF7;}li{margin:8px 0;}.total{font-weight:bold;}</style>
    </head><body><h2>🛒 Liste courses</h2><ul>
    ${items.map(i => `<li>${escapeHtml(i.name)} : ${i.quantity} ${i.unit} – ${i.total.toFixed(2)} €</li>`).join('')}
    </ul><div class="total">Total : ${total.toFixed(2)} €</div>
    <div>Budget : ${currentBudget.toFixed(2)} €</div></body></html>
  `);
  w.document.close();
  w.print();
}

function saveAndRefresh() {
  saveToLocal();
  renderInventory();
  updateShoppingList();
}

// ---------- MODE NUIT ----------
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isNight = saved === 'dark' || (saved === null && prefersDark);
  document.body.classList.toggle('dark', isNight);
  updateThemeIcon(isNight);
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

// ---------- SCROLL TO TOP ----------
function initScrollToTop() {
  const btn = document.getElementById('scrollToTopBtn');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('show', window.scrollY > 300);
  });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ---------- FILTRES ----------
function setupFilterListener() {
  const select = document.getElementById('categoryFilter');
  if (select) {
    select.addEventListener('change', () => {
      currentFilter = select.value;
      renderInventory();
    });
  }
}

function setupBudgetListener() {
  const input = document.getElementById('budgetInput');
  if (input) {
    input.addEventListener('change', () => {
      currentBudget = parseFloat(input.value) || 0;
      saveBudget();
      updateShoppingList();
    });
  }
}

// ---------- EVENT LISTENERS ----------
function setupEventListeners() {
  // Ajout rapide
  document.getElementById('addArticleBtn')?.addEventListener('click', addNewArticle);
  
  // Export / Import / Reset
  document.getElementById('exportBtn')?.addEventListener('click', exportData);
  document.getElementById('importBtn')?.addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile')?.addEventListener('change', (e) => {
    if (e.target.files.length) importData(e.target.files[0]);
    e.target.value = '';
  });
  document.getElementById('resetDemoBtn')?.addEventListener('click', resetToDemo);
  
  // Thème et catégories
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
  document.getElementById('addCategoryBtn')?.addEventListener('click', addNewCategory);
  
  // Toggle affichage liste de courses
  document.getElementById('toggleShoppingBtn')?.addEventListener('click', () => {
    const container = document.getElementById('shoppingListContainer');
    const btn = document.getElementById('toggleShoppingBtn');
    const hidden = container.classList.toggle('hidden');
    btn.textContent = hidden ? '▼ Afficher' : '▲ Masquer';
  });
  
  // ---------- STICKYBAR LISTE DE COURSES (avec boutons inventaire) ----------
  document.getElementById('shoppingCreate')?.addEventListener('click', createNewArticle);
  document.getElementById('shoppingModify')?.addEventListener('click', modifySelectedArticle);
  document.getElementById('shoppingDuplicate')?.addEventListener('click', duplicateSelectedArticle);
  document.getElementById('shoppingReorder')?.addEventListener('click', toggleReorderMode);
  document.getElementById('shoppingSave')?.addEventListener('click', saveManually);
  document.getElementById('shoppingValidate')?.addEventListener('click', validatePurchases);
  document.getElementById('shoppingShare')?.addEventListener('click', shareList);
  document.getElementById('shoppingCopy')?.addEventListener('click', copyList);
  document.getElementById('shoppingPrint')?.addEventListener('click', printList);
  document.getElementById('shoppingClear')?.addEventListener('click', clearShoppingList);
  
  // ---------- STICKYBAR INVENTAIRE ----------
  document.getElementById('toolbarCreate')?.addEventListener('click', createNewArticle);
  document.getElementById('toolbarModify')?.addEventListener('click', modifySelectedArticle);
  document.getElementById('toolbarDuplicate')?.addEventListener('click', duplicateSelectedArticle);
  document.getElementById('toolbarReorder')?.addEventListener('click', toggleReorderMode);
  document.getElementById('toolbarSave')?.addEventListener('click', saveManually);
  
  // Filtres
  setupFilterListener();
  setupBudgetListener();
  
  // Mise à jour du total en temps réel
  document.getElementById('newArticleQty')?.addEventListener('input', updateAddTotal);
  document.getElementById('newArticlePrice')?.addEventListener('input', updateAddTotal);
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadBudget();
  loadCategories();
  loadArticles();
  setupEventListeners();
  initScrollToTop();
  document.getElementById('shoppingListContainer')?.classList.remove('hidden');
  updateAddTotal();
});
