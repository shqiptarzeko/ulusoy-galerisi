const config = {
  assetsPath: 'assets',
  categories: []
}

async function scanCategories() {
  // This script can't read filesystem from browser; we expect the user to place folders under `assets/<category>`
  // We'll attempt to fetch a generated `manifest.json` next to assets if present.
  try {
    const res = await fetch('scripts/manifest.json');
    if (!res.ok) throw new Error('no manifest');
    const data = await res.json();
    // Normalize names to use forward slashes
    config.categories = (data.categories || []).map(c=>({name:(c.name||'').replace(/\\\\/g,'/'), images:c.images.map(i=>i.replace(/\\\\/g,'/'))}))
    buildTreeAndRender();
    // load first available leaf
    const firstLeaf = findFirstLeaf(treeRoot);
    if(firstLeaf) loadCategory(firstLeaf.path);
  } catch (e) {
    // fallback: try a default sample category
    config.categories = [{name:'Örnek',images:[
      'assets/sample1.jpg','assets/sample2.jpg','assets/sample3.jpg'
    ]}]
    buildTreeAndRender();
    loadCategory(config.categories[0].name)
  }
}

// Build a tree from category paths (e.g. "2025/Anaokul/139")
let treeRoot = {name:'root', children:{}, images:[], path:''};
function buildTreeAndRender(){
  treeRoot = {name:'root', children:{}, images:[], path:''};
  config.categories.forEach(c=>{
    const parts = c.name.split('/').filter(Boolean);
    let node = treeRoot;
    let acc = '';
    for(let i=0;i<parts.length;i++){
      const part = parts[i];
      acc = acc ? acc + '/' + part : part;
      if(!node.children[part]) node.children[part] = {name:part, children:{}, images:[], path:acc};
      node = node.children[part];
    }
    // leaf: attach images
    node.images = (c.images||[]).slice();
  });
  renderTopCategories();
  try{document.getElementById('debug-status').textContent = `Kategoriler: ${config.categories.length}, Top-level: ${Object.keys(treeRoot.children).length}`;}catch(e){}
}

function renderTopCategories(){
  const nav = document.getElementById('category-nav');
  nav.innerHTML='';
  Object.values(treeRoot.children).forEach((node,i)=>{
    const b = document.createElement('button');
    b.className='category-btn'+(i===0? ' active':'');
    b.textContent=node.name;
    b.addEventListener('click',()=>{document.querySelectorAll('#category-nav .category-btn').forEach(n=>n.classList.remove('active'));b.classList.add('active');renderSubcategories(node)});
    nav.appendChild(b);
  })
  // render first top-level subcats
  const first = Object.values(treeRoot.children)[0];
  if(first) renderSubcategories(first);
}

function renderSubcategories(node){
  const sub = document.getElementById('subcat-nav');
  sub.innerHTML='';
  // if node has direct images, add a button to load this node
  if(node.images && node.images.length){
    const b = document.createElement('button');
    b.className='category-btn active';
    b.textContent = node.name + ' (Tümü)';
    b.addEventListener('click',()=>{document.querySelectorAll('#subcat-nav .category-btn').forEach(n=>n.classList.remove('active'));b.classList.add('active');loadCategory(node.path)});
    sub.appendChild(b);
  }
  Object.values(node.children).forEach(child=>{
    const b = document.createElement('button');
    b.className='category-btn';
    b.textContent = child.name;
    b.addEventListener('click',()=>{document.querySelectorAll('#subcat-nav .category-btn').forEach(n=>n.classList.remove('active'));b.classList.add('active');
      // if child has further children, drill down and show its children
      if(Object.keys(child.children).length) renderSubcategories(child);
      else loadCategory(child.path);
    });
    sub.appendChild(b);
  })
}

function findFirstLeaf(node){
  if(node.images && node.images.length) return node;
  for(const k of Object.keys(node.children)){
    const res = findFirstLeaf(node.children[k]);
    if(res) return res;
  }
  return null;
}

function loadCategory(path){
  // find node by path
  const parts = path.split('/').filter(Boolean);
  let node = treeRoot;
  for(const p of parts){ if(!node.children[p]) { node = null; break } node = node.children[p] }
  const gallery = document.getElementById('gallery');
  gallery.innerHTML='';
  if(!node || !node.images) return;
  node.images.forEach((src,idx)=>{
    const a = document.createElement('a');
    a.href='#';
    a.className='card';
    a.dataset.index=idx;
    const img = document.createElement('img');
    img.loading='lazy';
    img.src=src;
    img.alt=`${path} ${idx+1}`;
    const c = document.createElement('div');
    c.className='caption';
    c.textContent = path.split('/').pop();
    a.appendChild(img);
    a.appendChild(c);
    a.addEventListener('click',(ev)=>{ev.preventDefault();openLightbox(node.images,idx)});
    gallery.appendChild(a);
  })
}

let current = {images:[],index:0};
function openLightbox(images,index){
  current.images=images;current.index=index;
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lb-img');
  const dl = document.getElementById('lb-download');
  const info = document.getElementById('lb-info');
  img.src = images[index];
  dl.href = images[index];
  dl.download = images[index].split('/').pop();
  info.textContent = `${index+1} / ${images.length} — ${images[index].split('/').pop()}`;
  lb.hidden=false;
  try{ lb.style.display = 'flex'; }catch(e){}
  // preload next image
  const next = new Image(); next.src = images[(index+1)%images.length];
  // prevent background scrolling
  try{ document.body.style.overflow = 'hidden'; }catch(e){}
}
function closeLightbox(){
  const lb = document.getElementById('lightbox');
  lb.hidden=true;
  try{ lb.style.display = 'none'; }catch(e){}
  try{ if(document.fullscreenElement) document.exitFullscreen(); }catch(e){}
  // restore scrolling and clear image to release memory
  try{ document.body.style.overflow = ''; }catch(e){}
  try{ document.getElementById('lb-img').src = ''; }catch(e){}
}
function navLightbox(delta){
  current.index = (current.index+delta+current.images.length)%current.images.length;
  const img = document.getElementById('lb-img');
  const dl = document.getElementById('lb-download');
  const info = document.getElementById('lb-info');
  img.src = current.images[current.index];
  dl.href = current.images[current.index];
  dl.download = current.images[current.index].split('/').pop();
  info.textContent = `${current.index+1} / ${current.images.length} — ${current.images[current.index].split('/').pop()}`;
  // preload next
  const next = new Image(); next.src = current.images[(current.index+1)%current.images.length];
}

function toggleFullscreen(){
  const lb = document.getElementById('lightbox');
  if(!document.fullscreenElement){ lb.requestFullscreen?.(); }
  else { document.exitFullscreen?.(); }
}

// Controls
document.addEventListener('click',e=>{
  if(e.target.id==='lb-close') closeLightbox();
  if(e.target.id==='lb-prev') navLightbox(-1);
  if(e.target.id==='lb-next') navLightbox(1);
  if(e.target.id==='lb-download') { /* anchor handles download */ }
})

document.getElementById('lb-img').addEventListener('dblclick',()=>toggleFullscreen());

// clicking on backdrop (outside image) should close the lightbox
document.getElementById('lightbox').addEventListener('click', (e)=>{
  if(e.target && e.target.id === 'lightbox') closeLightbox();
});

window.addEventListener('keydown',e=>{
  if(document.getElementById('lightbox').hidden) return;
  if(e.key==='Escape') closeLightbox();
  if(e.key==='ArrowLeft') navLightbox(-1);
  if(e.key==='ArrowRight') navLightbox(1);
})

// Start
scanCategories();
