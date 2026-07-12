'use strict';
const fs   = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');

function esc(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function toFileUrl(relPath) {
  return 'file:///' + path.resolve(ROOT, relPath).replace(/\\/g,'/');
}

(async () => {
  /* 1. Manifest yükle */
  const manifestPath = path.join(ROOT, 'scripts', 'manifest.json');
  if (!fs.existsSync(manifestPath)) { console.error('❌ Manifest bulunamadı:', manifestPath); process.exit(1); }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const allCats  = (manifest.categories || []).filter(c => !c.name.startsWith('TEST'));
  console.log(`📦 ${allCats.length} ürün bulundu.`);

  /* 2. Kategorilere grupla */
  const groups = new Map();
  for (const cat of allCats) {
    const parts   = cat.name.replace(/\\/g,'/').split('/').filter(Boolean);
    const mainCat = parts.length >= 2 ? parts[1] : parts[0];
    const rawName = parts.length >= 3 ? parts[2] : '';
    if (!cat.images || cat.images.length === 0) continue;
    const m = rawName.match(/^(\d+)\s*(.*)$/);
    if (!groups.has(mainCat)) groups.set(mainCat, []);
    groups.get(mainCat).push({
      code:       m ? m[1] : rawName,
      variant:    m ? m[2].toUpperCase() : rawName.toUpperCase(),
      firstImage: cat.images[0]
    });
  }

  /* 3. Kategorileri sırala */
  const CAT_ORDER = ['ANAOKUL','İLKOKUL','SIRT','OMUZ','SPOR'];
  const sorted = [...groups.entries()].sort(([a],[b]) => {
    const ai = CAT_ORDER.findIndex(o => a.toUpperCase().includes(o));
    const bi = CAT_ORDER.findIndex(o => b.toUpperCase().includes(o));
    return (ai<0?99:ai)-(bi<0?99:bi);
  });

  const COLORS = [
    {bg:'#b71c1c',bg2:'#e53935'},
    {bg:'#1565c0',bg2:'#1e88e5'},
    {bg:'#1b5e20',bg2:'#43a047'},
    {bg:'#4a148c',bg2:'#8e24aa'},
    {bg:'#e65100',bg2:'#fb8c00'},
    {bg:'#004d40',bg2:'#00897b'},
  ];

  /* 4. HTML oluştur */
  const htmlParts = [];
  htmlParts.push(`<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>Ulusoy Ürün Kataloğu 2025</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,Helvetica,sans-serif;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.cover{width:210mm;height:297mm;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(160deg,#0d1b2a 0%,#1a2744 50%,#0f3460 100%);
  position:relative;overflow:hidden;page-break-after:always;}
.cover-topbar{position:absolute;top:0;left:0;right:0;height:7px;
  background:linear-gradient(90deg,#FFD700,#FFA000,#FFD700);}
.cover-inner{text-align:center;color:#fff;}
.cover-brand{font-size:82px;font-weight:900;letter-spacing:18px;color:#FFD700;line-height:1;margin-bottom:8px;
  text-shadow:0 2px 20px rgba(255,215,0,0.3);}
.cover-year{font-size:20px;letter-spacing:12px;color:#90a4ae;margin-bottom:36px;}
.cover-line{width:70px;height:2px;background:#FFD700;margin:0 auto 36px;}
.cover-title{font-size:16px;letter-spacing:8px;color:#cfd8dc;
  border:1px solid rgba(255,255,255,0.18);padding:14px 44px;display:inline-block;}
.cover-footer{position:absolute;bottom:44px;font-size:11px;color:#546e7a;letter-spacing:2px;}
.cover-watermark{position:absolute;font-size:260px;font-weight:900;
  color:rgba(255,255,255,0.025);letter-spacing:20px;
  top:50%;left:50%;transform:translate(-50%,-50%);white-space:nowrap;}
.cat-header{page-break-before:always;page-break-after:avoid;padding:24px 16mm 22px;color:#fff;}
.cat-name{font-size:26px;font-weight:900;letter-spacing:2px;text-shadow:0 1px 4px rgba(0,0,0,0.2);}
.cat-count{font-size:12px;opacity:0.75;margin-top:6px;letter-spacing:1px;}
.products-section{display:grid;grid-template-columns:repeat(3,1fr);gap:13px;padding:14px 16mm 12px;}
.product-card{border:1px solid #e0e0e0;border-radius:9px;overflow:hidden;
  page-break-inside:avoid;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,0.07);}
.product-card img{width:100%;height:188px;object-fit:cover;display:block;background:#f0f0f0;}
.product-info{padding:9px 11px 11px;}
.p-code{font-size:21px;font-weight:900;color:#111;display:block;line-height:1.1;}
.p-var{font-size:9.5px;color:#888;letter-spacing:0.9px;display:block;margin-top:3px;text-transform:uppercase;}
@page{size:A4;margin:0;}
</style>
</head>
<body>`);

  /* Kapak */
  const bugun = new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'});
  htmlParts.push(`
<div class="cover">
  <div class="cover-topbar"></div>
  <div class="cover-watermark">U</div>
  <div class="cover-inner">
    <div class="cover-brand">ULUSOY</div>
    <div class="cover-year">2025</div>
    <div class="cover-line"></div>
    <div class="cover-title">ÜRÜN KATALOĞU</div>
  </div>
  <div class="cover-footer">${bugun} &nbsp;|&nbsp; ${allCats.length} Ürün &nbsp;|&nbsp; ${sorted.length} Kategori</div>
</div>`);

  /* Kategori bölümleri */
  sorted.forEach(([catName, products], idx) => {
    const clr = COLORS[idx % COLORS.length];
    htmlParts.push(`
<div class="cat-header" style="background:linear-gradient(135deg,${clr.bg},${clr.bg2})">
  <div class="cat-name">${esc(catName)}</div>
  <div class="cat-count">${products.length} ÜRÜN</div>
</div>
<div class="products-section">`);
    products.forEach(p => {
      htmlParts.push(`  <div class="product-card">
    <img src="${toFileUrl(p.firstImage)}" alt="${esc(p.code+' '+p.variant)}" loading="eager">
    <div class="product-info">
      <span class="p-code">${esc(p.code)}</span>
      <span class="p-var">${esc(p.variant)}</span>
    </div>
  </div>`);
    });
    htmlParts.push(`</div>`);
  });
  htmlParts.push(`</body></html>`);

  /* 5. Geçici HTML yaz */
  const tmpDir = path.join(ROOT,'.tmp');
  const outDir = path.join(ROOT,'output');
  fs.mkdirSync(tmpDir,{recursive:true});
  fs.mkdirSync(outDir,{recursive:true});
  const tmpHtml = path.join(tmpDir,'catalog.html');
  fs.writeFileSync(tmpHtml, htmlParts.join('\n'), 'utf8');
  console.log('✅ HTML hazırlandı:', tmpHtml);

  /* 6. Puppeteer ile PDF üret */
  console.log('🖨️  PDF oluşturuluyor, lütfen bekleyin...');
  const browser = await puppeteer.launch({
    headless:'new',
    args:['--no-sandbox','--disable-setuid-sandbox','--allow-file-access-from-files','--disable-web-security','--font-render-hinting=none']
  });
  try {
    const page = await browser.newPage();
    await page.goto('file:///'+tmpHtml.replace(/\\/g,'/'), {waitUntil:'networkidle0', timeout:120000});
    await page.evaluate(() =>
      Promise.all(Array.from(document.querySelectorAll('img')).map(img =>
        img.complete ? Promise.resolve() : new Promise(r=>{img.onload=r;img.onerror=r;})
      ))
    );
    await new Promise(r=>setTimeout(r,1500));
    const outPdf = path.join(outDir,'ulusoy_katalog_2025.pdf');
    await page.pdf({path:outPdf, format:'A4', printBackground:true, margin:{top:0,bottom:0,left:0,right:0}});
    console.log('\n✅ PDF başarıyla oluşturuldu!');
    console.log('📄 Konum:', outPdf);
  } finally {
    await browser.close();
  }
})().catch(err => { console.error('❌ Hata:', err.message); process.exit(1); });

