// ── State ──
const config = { assetsPath: 'assets', categories: [] };

let treeRoot      = { name: 'root', children: {}, images: [], path: '' };
let currentNode   = null;
let currentImages = [];
let currentImageIndex = 0;
let categories    = [];

// Shopping list
let shoppingList   = [];
let pendingProduct = '';

// ── Utils ──
function el(id)     { return document.getElementById(id); }
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Path ──
function normPath(p) {
  // Her path segmentini ayrı ayrı encode et (/ ve . karakterlerini koru)
  const encoded = p.split('/').map(seg => encodeURIComponent(seg).replace(/%2B/g, '+')).join('/');
  if (window.location.hostname === 'shqiptarzeko.github.io') return '/ulusoy-galerisi/' + encoded;
  return encoded;
}

// ── Manifest ──
async function loadManifest() {
  try {
    let manifestPath = './scripts/manifest.json';
    if (window.location.hostname === 'shqiptarzeko.github.io') {
      manifestPath = '/ulusoy-galerisi/scripts/manifest.json';
    }
    const response = await fetch(manifestPath);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    const allCats = (data.categories || []).filter(c => !c.name.startsWith('TEST'));
    config.categories = allCats;
    categories = allCats;
    buildTree();
    renderCategoryGrid();
  } catch (err) {
    document.body.innerHTML = '<p style="padding:20px;color:red;">Hata: ' + err.message + '</p>';
  }
}

// ── Tree ──
function buildTree() {
  treeRoot = { name: 'root', children: {}, images: [], path: '' };
  config.categories.forEach(c => {
    const parts = c.name.split('/').filter(Boolean);
    let node = treeRoot;
    let acc  = '';
    parts.forEach(part => {
      acc = acc ? acc + '/' + part : part;
      if (!node.children[part]) {
        node.children[part] = { name: part, children: {}, images: [], path: acc, parent: node };
      }
      node = node.children[part];
    });
    node.images = (c.images || []).slice();
  });
}

// ── Helpers ──
function getFirstImage(node) {
  if (node.images && node.images.length) return node.images[0];
  for (const child of Object.values(node.children)) {
    const img = getFirstImage(child);
    if (img) return img;
  }
  return null;
}

function countAllImages(node) {
  let n = node.images ? node.images.length : 0;
  for (const child of Object.values(node.children)) n += countAllImages(child);
  return n;
}

function getBreadcrumbPath(node) {
  const parts = [];
  let cur = node;
  while (cur && cur !== treeRoot) { parts.unshift(cur); cur = cur.parent || null; }
  return parts;
}

// ── Card ──
function createCategoryCard(node, onClick) {
  const card     = document.createElement('div');
  card.className = 'category-card';

  const firstImage = getFirstImage(node);
  const imageCount = countAllImages(node);
  const isLeaf     = node.images && node.images.length > 0;
  const is2025     = node.name === '2025';

  // Görsel
  if (firstImage) {
    const img     = document.createElement('img');
    img.src       = normPath(firstImage);
    img.alt       = node.name;
    img.className = 'category-card-image';
    card.appendChild(img);
  } else {
    const ph      = document.createElement('div');
    ph.className  = 'category-card-image';
    ph.style.background = '#e8e4df';
    card.appendChild(ph);
  }

  // Alt bilgi
  const info     = document.createElement('div');
  info.className = 'category-card-info';

  const nameEl      = document.createElement('p');
  nameEl.className  = 'category-card-name';
  nameEl.textContent = is2025 ? '2025 Koleksiyonu' : node.name;

  const countEl      = document.createElement('p');
  countEl.className  = 'category-card-count';
  countEl.textContent = is2025
    ? '🛒 Ürünleri Görmek İçin Tıklayın'
    : (imageCount + ' fotoğraf');

  info.appendChild(nameEl);
  info.appendChild(countEl);
  card.appendChild(info);

  // Listeye Ekle — sadece leaf ürün kartlarında
  if (isLeaf) {
    const addBtn      = document.createElement('button');
    addBtn.className  = 'add-to-list-btn';
    addBtn.textContent = '+ Listeye Ekle';
    addBtn.addEventListener('click', e => {
      e.stopPropagation();
      openQtyModal(node.name);
    });
    card.appendChild(addBtn);
  }

  card.addEventListener('click', onClick);
  return card;
}

// ── Render ──
function renderCategoryGrid() {
  el('category-grid').hidden   = false;
  el('gallery-section').hidden = true;
  el('breadcrumb').hidden      = true;
  const grid = el('category-grid');
  grid.innerHTML = '';
  Object.values(treeRoot.children).forEach(child => {
    grid.appendChild(createCategoryCard(child, () => openNode(child)));
  });
}

function openNode(node) {
  if (node.images && node.images.length) {
    currentNode = node;
    openLightbox(node.images, 0);
  } else if (Object.keys(node.children).length) {
    showSubcategoryGrid(node);
  }
}

function showSubcategoryGrid(node) {
  const grid = el('category-grid');
  grid.hidden = false;
  el('gallery-section').hidden = true;
  grid.innerHTML = '';
  Object.values(node.children).forEach(child => {
    grid.appendChild(createCategoryCard(child, () => openNode(child)));
  });
  updateBreadcrumb(node);
}

function showGallery(node) {
  currentNode   = node;
  currentImages = node.images || [];

  el('category-grid').hidden   = true;
  el('gallery-section').hidden = false;
  el('gallery-title').textContent = node.name;

  const gallery = el('gallery');
  const empty   = el('empty-state');

  if (!currentImages.length) {
    gallery.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden      = true;
  gallery.innerHTML = '';

  currentImages.forEach((src, idx) => {
    const card     = document.createElement('div');
    card.className = 'card';

    const img    = document.createElement('img');
    img.loading  = idx === 0 ? 'eager' : 'lazy';
    img.src      = normPath(src);
    img.alt      = 'Fotoğraf ' + (idx + 1);
    card.appendChild(img);

    // Kapak rozeti + Listeye Ekle — sadece 1. fotoğrafta
    if (idx === 0) {
      const badge      = document.createElement('span');
      badge.className  = 'cover-badge';
      badge.textContent = 'Kapak';
      card.appendChild(badge);

      const addBtn      = document.createElement('button');
      addBtn.className  = 'add-to-list-btn';
      addBtn.textContent = '+ Listeye Ekle';
      addBtn.addEventListener('click', e => {
        e.stopPropagation();
        openQtyModal(node.name);
      });
      card.appendChild(addBtn);
    }

    card.addEventListener('click', () => openLightbox(currentImages, idx));
    gallery.appendChild(card);
  });

  updateBreadcrumb(node);
}

function updateBreadcrumb(node) {
  const bc    = el('breadcrumb');
  const parts = getBreadcrumbPath(node);
  bc.innerHTML = '';
  parts.forEach((part, idx) => {
    if (idx > 0) {
      const sep     = document.createElement('span');
      sep.className = 'sep';
      sep.textContent = '/';
      bc.appendChild(sep);
    }
    const btn = document.createElement('button');
    btn.textContent = part.name;
    btn.addEventListener('click', () => openNode(part));
    bc.appendChild(btn);
  });
  bc.hidden = parts.length === 0;
}

// ── Lightbox ──
function openLightbox(images, idx) {
  currentImages     = images;
  currentImageIndex = idx;

  el('lb-img').src           = normPath(images[idx]);
  el('lb-download').href     = normPath(images[idx]);
  el('lb-download').download = images[idx].split('/').pop();
  el('lb-info').textContent  = (idx + 1) + ' / ' + images.length;

  // Ürün adını Listeye Ekle butonuna bağla
  const addBtn = el('lb-add-btn');
  if (addBtn && currentNode) {
    addBtn.onclick = e => { e.stopPropagation(); openQtyModal(currentNode.name); };
  }

  const lb = el('lightbox');
  lb.hidden        = false;
  lb.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  new Image().src = images[(idx + 1) % images.length];
}

function closeLightbox() {
  const lb = el('lightbox');
  lb.hidden        = true;
  lb.style.display = 'none';
  document.body.style.overflow = '';
  el('lb-img').src = '';
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch(e) {}
}

function navLightbox(delta) {
  currentImageIndex = (currentImageIndex + delta + currentImages.length) % currentImages.length;
  const src = currentImages[currentImageIndex];
  el('lb-img').src           = normPath(src);
  el('lb-download').href     = normPath(src);
  el('lb-download').download = src.split('/').pop();
  el('lb-info').textContent  = (currentImageIndex + 1) + ' / ' + currentImages.length;
  new Image().src = currentImages[(currentImageIndex + 1) % currentImages.length];
}

// ── Shopping List ──
function openQtyModal(productName) {
  pendingProduct = productName;
  el('qty-modal-product').textContent = productName;
  el('qty-input').value = '';
  el('qty-modal-overlay').hidden = false;
  setTimeout(() => el('qty-input').focus(), 80);
}

function closeQtyModal() {
  el('qty-modal-overlay').hidden = true;
  pendingProduct = '';
}

function confirmAddToList() {
  const raw = el('qty-input').value.trim();
  if (!raw) { el('qty-input').focus(); return; }
  const qty = parseInt(raw, 10);
  if (isNaN(qty) || qty <= 0) { el('qty-input').focus(); return; }
  const name     = pendingProduct;
  const existing = shoppingList.find(i => i.name === name);
  if (existing) { existing.qty += qty; } else { shoppingList.push({ name, qty }); }
  closeQtyModal();
  renderListPanel();
  showToast('✓ "' + name + '" listeye eklendi!');
}

function removeFromList(name) {
  shoppingList = shoppingList.filter(i => i.name !== name);
  renderListPanel();
}

function clearList() {
  shoppingList = [];
  renderListPanel();
}

function renderListPanel() {
  const total = shoppingList.reduce((s, i) => s + i.qty, 0);
  el('list-count').textContent = total || 0;

  const itemsEl = el('list-items');
  if (!shoppingList.length) {
    itemsEl.innerHTML = '<p class="list-empty-msg">Henüz ürün eklenmedi.</p>';
  } else {
    itemsEl.innerHTML = '';
    shoppingList.forEach(item => {
      const row     = document.createElement('div');
      row.className = 'list-item';
      row.innerHTML =
        '<span class="list-item-name">'  + escHtml(item.name) + '</span>' +
        '<span class="list-item-qty">'   + item.qty + ' adet</span>' +
        '<button class="list-item-remove" data-name="' + escHtml(item.name) + '">🗑</button>';
      itemsEl.appendChild(row);
    });
  }
  el('whatsapp-btn').disabled = shoppingList.length === 0;
}

function toggleListPanel() {
  const panel   = el('list-panel');
  const overlay = el('list-overlay');
  const isOpen  = panel.classList.contains('open');
  if (isOpen) {
    panel.classList.remove('open');
    setTimeout(() => { panel.hidden = true; overlay.hidden = true; }, 300);
  } else {
    panel.hidden   = false;
    overlay.hidden = false;
    requestAnimationFrame(() => panel.classList.add('open'));
  }
}

function sendWhatsApp() {
  if (!shoppingList.length) return;
  const total = shoppingList.reduce((s, i) => s + i.qty, 0);
  const lines = shoppingList.map(i => '• ' + i.name + ' — ' + i.qty + ' adet').join('\n');
  const msg   = '🛒 *Ulusoy Sipariş Listesi*\n\n' + lines + '\n\n📦 Toplam: ' + shoppingList.length + ' ürün çeşidi, ' + total + ' adet';
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

function showToast(msg) {
  let t = el('list-toast');
  if (!t) {
    t    = document.createElement('div');
    t.id = 'list-toast';
    t.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%) translateY(20px);background:#6b5344;color:#fff;padding:12px 24px;border-radius:30px;font-size:14px;font-weight:600;z-index:200;box-shadow:0 4px 16px rgba(0,0,0,.3);opacity:0;transition:opacity 300ms,transform 300ms;pointer-events:none';
    document.body.appendChild(t);
  }
  t.textContent     = msg;
  t.style.opacity   = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._tid);
  t._tid = setTimeout(() => {
    t.style.opacity   = '0';
    t.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2500);
}

// ── Events ──
function initApp() {

  // Arama
  el('search-input').addEventListener('input', e => {
    const q    = e.target.value.toLowerCase().trim();
    const grid = el('category-grid');
    if (!q) { renderCategoryGrid(); return; }

    function matches(node) {
      if (node.name.toLowerCase().includes(q)) return true;
      return Object.values(node.children).some(matches);
    }
    function collect(node, out) {
      Object.values(node.children).forEach(child => {
        if (matches(child)) out.push(child);
        collect(child, out);
      });
    }
    const results = [];
    collect(treeRoot, results);
    grid.innerHTML = results.length === 0
      ? '<p class="empty-search">Eşleşen kategori bulunamadı.</p>'
      : '';
    results.forEach(child => grid.appendChild(createCategoryCard(child, () => openNode(child))));
  });

  // Qty input klavye
  el('qty-input').addEventListener('keydown', e => {
    if (e.key === 'Enter')  confirmAddToList();
    if (e.key === 'Escape') closeQtyModal();
  });

  // Lightbox çift tıklama tam ekran
  el('lb-img').addEventListener('dblclick', () => {
    if (!document.fullscreenElement) el('lb-img').requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  });

  // Klavye kısayolları
  window.addEventListener('keydown', e => {
    if (el('lightbox').hidden) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  navLightbox(-1);
    if (e.key === 'ArrowRight') navLightbox(1);
  });

  // Global tıklama delegasyonu
  document.addEventListener('click', e => {
    const id  = e.target.id;
    const cls = e.target.className;

    if (id === 'home-btn') {
      el('category-grid').hidden   = false;
      el('gallery-section').hidden = true;
      el('breadcrumb').hidden      = true;
      el('search-input').value     = '';
      renderCategoryGrid();
    }
    if (id === 'back-to-categories') {
      el('gallery-section').hidden = true;
      const parent = currentNode ? currentNode.parent : null;
      if (parent && parent !== treeRoot) showSubcategoryGrid(parent);
      else renderCategoryGrid();
    }
    if (id === 'lb-close')  closeLightbox();
    if (id === 'lb-prev')   navLightbox(-1);
    if (id === 'lb-next')   navLightbox(1);
    if (id === 'lightbox')  closeLightbox();

    if (id === 'list-toggle-btn')  toggleListPanel();
    if (id === 'list-panel-close') toggleListPanel();
    if (id === 'list-overlay')     toggleListPanel();
    if (id === 'clear-list-btn')   clearList();
    if (id === 'whatsapp-btn')     sendWhatsApp();
    if (id === 'qty-confirm-btn')  confirmAddToList();
    if (id === 'qty-cancel-btn')   closeQtyModal();
    if (id === 'qty-modal-overlay') closeQtyModal();

    if (e.target.classList.contains('list-item-remove')) {
      removeFromList(e.target.dataset.name);
    }
  });

  // Manifest yükle
  loadManifest();
}

// DOM hazır olup olmadığına bak, her iki durumda da çalış
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
