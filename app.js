const config = {
  assetsPath: 'assets',
  categories: [],
};

let treeRoot = { name: 'root', children: {}, images: [], path: '' };
let currentNode = null;
let currentImages = [];
let currentImageIndex = 0;
let categories = [];
let currentPath = [];
let lightboxIndex = 0;

// Manifest yükle
async function loadManifest() {
  try {
    let manifestPath = './scripts/manifest.json';
    
    // GitHub Pages için repo adı ekle
    if (window.location.hostname === 'shqiptarzeko.github.io') {
      manifestPath = '/ulusoy-galerisi/scripts/manifest.json';
    }
    
    const response = await fetch(manifestPath);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    config.categories = data.categories || [];
    categories = data.categories || [];
    
    console.log(`✓ Manifest loaded: ${categories.length} categories`);
    buildTree();
    renderCategoryGrid();
  } catch (err) {
    console.error('✗ Manifest load failed:', err);
    document.body.innerHTML = '<p style="padding:20px;color:red;">Hata: Manifest dosyası yüklenemedi. Klasör yapısını kontrol et.</p>';
  }
}

// Image path normalize
function normalizeImagePath(path) {
  if (window.location.hostname === 'shqiptarzeko.github.io') {
    return '/ulusoy-galerisi/' + path;
  }
  return path;
}

// Build tree
function buildTree() {
  treeRoot = { name: 'root', children: {}, images: [], path: '' };
  config.categories.forEach((c) => {
    const parts = c.name.split('/').filter(Boolean);
    let node = treeRoot;
    let acc = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      acc = acc ? acc + '/' + part : part;
      if (!node.children[part]) {
        node.children[part] = { name: part, children: {}, images: [], path: acc, level: i + 1, parent: node };
      }
      node = node.children[part];
    }
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
  let count = node.images ? node.images.length : 0;
  for (const child of Object.values(node.children)) {
    count += countAllImages(child);
  }
  return count;
}

function getBreadcrumbPath(node) {
  const parts = [];
  let cur = node;
  while (cur && cur !== treeRoot) {
    parts.unshift(cur);
    cur = cur.parent || null;
  }
  return parts;
}

// ── Card factory (DRY) ──

function createCategoryCard(node, onClick) {
  const card = document.createElement('button');
  card.className = 'category-card';

  const firstImage = getFirstImage(node);
  const imageCount = countAllImages(node);

  if (firstImage) {
    const img = document.createElement('img');
    img.src = normalizeImagePath(firstImage);
    img.alt = node.name;
    img.className = 'category-card-image';
    card.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'category-card-image';
    placeholder.style.background = '#e8e4df';
    card.appendChild(placeholder);
  }

  const info = document.createElement('div');
  info.className = 'category-card-info';

  const nameEl = document.createElement('p');
  nameEl.className = 'category-card-name';
  nameEl.textContent = node.name;

  const countEl = document.createElement('p');
  countEl.className = 'category-card-count';
  countEl.textContent = `${imageCount} fotoğraf`;

  info.appendChild(nameEl);
  info.appendChild(countEl);
  card.appendChild(info);

  card.addEventListener('click', onClick);
  return card;
}

// ── Rendering ──

function renderCategoryGrid() {
  document.getElementById('category-grid').hidden = false;
  document.getElementById('gallery-section').hidden = true;
  document.getElementById('breadcrumb').hidden = true;
  const grid = document.getElementById('category-grid');
  grid.innerHTML = '';

  Object.values(treeRoot.children).forEach((child) => {
    grid.appendChild(createCategoryCard(child, () => openNode(child)));
  });
}

function openNode(node) {
  if (node.images && node.images.length) {
    showGallery(node);
  } else if (Object.keys(node.children).length) {
    showSubcategoryGrid(node);
  }
}

function showSubcategoryGrid(node) {
  const grid = document.getElementById('category-grid');
  const section = document.getElementById('gallery-section');
  grid.hidden = false;
  section.hidden = true;
  grid.innerHTML = '';

  Object.values(node.children).forEach((child) => {
    grid.appendChild(createCategoryCard(child, () => openNode(child)));
  });

  updateBreadcrumb(node);
}

function showGallery(node) {
  currentNode = node;
  currentImages = node.images || [];
  currentImageIndex = 0;

  const grid = document.getElementById('category-grid');
  const section = document.getElementById('gallery-section');
  const gallery = document.getElementById('gallery');
  const title = document.getElementById('gallery-title');
  const emptyState = document.getElementById('empty-state');

  grid.hidden = true;
  section.hidden = false;

  title.textContent = node.name;

  if (!currentImages.length) {
    gallery.innerHTML = '';
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  gallery.innerHTML = '';

  currentImages.forEach((src, idx) => {
    const card = document.createElement('a');
    card.href = '#';
    card.className = 'card';
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = normalizeImagePath(src);
    img.alt = `Fotoğraf ${idx + 1}`;
    card.appendChild(img);
    card.addEventListener('click', (e) => {
      e.preventDefault();
      openLightbox(currentImages, idx);
    });
    gallery.appendChild(card);
  });

  updateBreadcrumb(node);
}

function updateBreadcrumb(node) {
  const breadcrumb = document.getElementById('breadcrumb');
  const parts = getBreadcrumbPath(node);

  breadcrumb.innerHTML = '';
  parts.forEach((part, idx) => {
    if (idx > 0) {
      const sep = document.createElement('span');
      sep.className = 'sep';
      sep.textContent = '/';
      breadcrumb.appendChild(sep);
    }

    const btn = document.createElement('button');
    btn.textContent = part.name;
    btn.addEventListener('click', () => openNode(part));
    breadcrumb.appendChild(btn);
  });

  breadcrumb.hidden = parts.length === 0;
}

// ── Lightbox ──

function openLightbox(images, idx) {
  currentImages = images;
  currentImageIndex = idx;

  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lb-img');
  const dl = document.getElementById('lb-download');
  const info = document.getElementById('lb-info');

  img.src = images[idx];
  dl.href = normalizeImagePath(images[idx]);
  dl.download = images[idx].split('/').pop();
  info.textContent = `${idx + 1} / ${images.length}`;

  lb.hidden = false;
  lb.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  const next = new Image();
  next.src = images[(idx + 1) % images.length];
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.hidden = true;
  lb.style.display = 'none';
  document.body.style.overflow = '';
  document.getElementById('lb-img').src = '';

  try {
    if (document.fullscreenElement) document.exitFullscreen();
  } catch (e) {
    // ignore
  }
}

function navLightbox(delta) {
  currentImageIndex = (currentImageIndex + delta + currentImages.length) % currentImages.length;

  const img = document.getElementById('lb-img');
  const dl = document.getElementById('lb-download');
  const info = document.getElementById('lb-info');

  const src = currentImages[currentImageIndex];
  img.src = normalizeImagePath(src);
  dl.href = normalizeImagePath(src);
  dl.download = src.split('/').pop();
  info.textContent = `${currentImageIndex + 1} / ${currentImages.length}`;

  const next = new Image();
  next.src = currentImages[(currentImageIndex + 1) % currentImages.length];
}

function toggleFullscreen() {
  const img = document.getElementById('lb-img');
  if (!document.fullscreenElement) {
    img.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

// ── Event listeners ──

document.addEventListener('click', (e) => {
  if (e.target.id === 'home-btn') {
    document.getElementById('category-grid').hidden = false;
    document.getElementById('gallery-section').hidden = true;
    document.getElementById('breadcrumb').hidden = true;
    document.getElementById('search-input').value = '';
    renderCategoryGrid();
  }
  if (e.target.id === 'lb-close') closeLightbox();
  if (e.target.id === 'lb-prev') navLightbox(-1);
  if (e.target.id === 'lb-next') navLightbox(1);
  if (e.target.id === 'back-to-categories') {
    document.getElementById('category-grid').hidden = false;
    document.getElementById('gallery-section').hidden = true;
    document.getElementById('breadcrumb').hidden = true;
  }
});

document.getElementById('lightbox').addEventListener('click', (e) => {
  if (e.target.id === 'lightbox') closeLightbox();
});

document.getElementById('lb-img').addEventListener('dblclick', () => toggleFullscreen());

window.addEventListener('keydown', (e) => {
  if (document.getElementById('lightbox').hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') navLightbox(-1);
  if (e.key === 'ArrowRight') navLightbox(1);
});

// ── Search ──

const searchInput = document.getElementById('search-input');
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  const grid = document.getElementById('category-grid');

  if (!query) {
    renderCategoryGrid();
    return;
  }

  function matchesSearch(node) {
    if (node.name.toLowerCase().includes(query)) return true;
    for (const child of Object.values(node.children)) {
      if (matchesSearch(child)) return true;
    }
    return false;
  }

  grid.innerHTML = '';

  function collectMatching(node, results) {
    Object.values(node.children).forEach((child) => {
      if (matchesSearch(child)) {
        results.push(child);
      }
      collectMatching(child, results);
    });
  }

  const matches = [];
  collectMatching(treeRoot, matches);

  if (matches.length === 0) {
    grid.innerHTML = '<p class="empty-search">Eşleşen kategori bulunamadı.</p>';
    return;
  }

  matches.forEach((child) => {
    grid.appendChild(createCategoryCard(child, () => openNode(child)));
  });
});

// ── Init ──

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadManifest);
} else {
  loadManifest();
}
