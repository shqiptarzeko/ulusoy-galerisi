const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async function main(){
  try{
    const root = path.resolve(__dirname, '..');
    const manifestPath = path.join(root, 'scripts', 'manifest.json');
    if(!fs.existsSync(manifestPath)) throw new Error('Manifest not found: ' + manifestPath);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // Ensure tmp and output dirs
    const tmpDir = path.join(root, '.tmp');
    const outDir = path.join(root, 'output');
    if(!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
    if(!fs.existsSync(outDir)) fs.mkdirSync(outDir);

    // Build simple catalog HTML
    const htmlParts = [];
    htmlParts.push(`<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Katalog</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#222;background:#fff;margin:24px}
  .cover{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh}
  .cover h1{font-size:48px;margin:0}
  .cover p{color:#666}
  .category{page-break-inside:avoid;margin:32px 0}
  .category h2{margin:8px 0 12px;font-size:20px;border-bottom:1px solid #ddd;padding-bottom:6px}
  .thumbs{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .thumb{border:1px solid #eee;padding:6px;display:flex;flex-direction:column;align-items:center}
  .thumb img{max-width:100%;height:260px;object-fit:cover}
  .meta{font-size:12px;color:#555;margin-top:6px}
  footer{position:fixed;left:24px;right:24px;bottom:12px;font-size:11px;color:#999}
  @media print{.cover{height:300px}} 
</style>
</head><body>`);

    htmlParts.push(`<div class=\"cover\"><h1>Galeri Katalog</h1><p>Oluşturuldu: ${new Date().toLocaleString()}</p></div>`);

    (manifest.categories || []).forEach(cat => {
      const name = (cat.name||'').replace(/\\\\/g,'/').replace(/\\/g,'/');
      htmlParts.push(`<section class=\"category\"><h2>${escapeHtml(name)}</h2><div class=\"thumbs\">`);
      (cat.images||[]).forEach(imgPath => {
        // make absolute file URL
        const abs = path.resolve(root, imgPath);
        const fileUrl = fileUrlFromPath(abs);
        htmlParts.push(`<div class=\"thumb\"><img src=\"${fileUrl}\" alt=\"\"><div class=\"meta\">${path.basename(imgPath)}</div></div>`);
      });
      htmlParts.push(`</div></section>`);
    });

    htmlParts.push(`<footer>Galeri Katalog — ${new Date().toLocaleDateString()}</footer></body></html>`);

    const tmpHtml = path.join(tmpDir, 'catalog.html');
    fs.writeFileSync(tmpHtml, htmlParts.join('\n'), 'utf8');
    console.log('Wrote HTML to', tmpHtml);

    // Launch puppeteer to print PDF
    const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
    const page = await browser.newPage();
    const fileUrl = fileUrlFromPath(tmpHtml);
    await page.goto(fileUrl, {waitUntil:'networkidle0'});
    const outPdf = path.join(outDir, 'katalog.pdf');
    await page.pdf({path: outPdf, format: 'A4', printBackground: true, margin: {top: '20mm', bottom: '20mm', left: '16mm', right: '16mm'}});
    await browser.close();
    console.log('PDF generated:', outPdf);
  }catch(err){
    console.error(err);
    process.exit(1);
  }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;'); }
  function fileUrlFromPath(p){
    const resolved = path.resolve(p).replace(/\\/g,'/');
    if(process.platform === 'win32') return 'file:///' + resolved;
    return 'file://' + resolved;
  }
})();
