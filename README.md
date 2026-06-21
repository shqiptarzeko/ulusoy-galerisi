# Galerim — Sade & Şık

Basit, dikey fotoğraf odaklı masaüstü galerisi.

Kullanım:
- Kategorileri `scripts/manifest.json` içine ekleyin.
- Fotoğrafları `assets/<kategori>/` altına koyun ve `scripts/manifest.json`'daki yolları güncelleyin.
- Yerel olarak test etmek için basit bir HTTP sunucusu kullanın (ör. `python -m http.server`).
Import etme (PowerShell):

1. Fotoğraflarınızın klasör yapısı şu şekilde olsun: `Dikey Format Fotolar\KategoriA`, `Dikey Format Fotolar\KategoriB`, ...
2. Workspace kökünde PowerShell açın ve aşağıdaki komutu çalıştırın (varsayılan kaynak klasörunuz farklıysa onu belirtin):

```powershell
.\scripts\import_images.ps1 -Source "C:\Users\tikky\Desktop\Dikey Format Fotolar"
```

Bu betik `assets/<Kategori>/` altına fotoğrafları kopyalar ve `scripts/manifest.json` dosyasını günceller.

 Not: Dosya yollarında boşluk varsa tırnak içinde yazın.

PDF Katalog Oluşturma
---------------------

Otomatik PDF katalog oluşturmak için bir Node/Puppeteer tabanlı araç ekledim.

1. Node.js yüklü olduğundan emin olun (v16+ önerilir).
2. Proje kökünde bağımlılıkları yükleyin:

```bash
npm install
```

3. PDF oluşturun:

```bash
npm run generate-pdf
```

Oluşan dosya `output/katalog.pdf` içinde olacak. Eğer Puppeteer kurulumu zor olursa, script `.tmp/catalog.html` dosyasını yazıyor — bunu tarayıcıda açıp elle `Print → Save as PDF` yapabilirsiniz.

Dosyalar eklenen:
- `package.json` — Puppeteer ve `generate-pdf` script
- `scripts/generate_catalog.js` — manifest'i okuyup `.tmp/catalog.html` üretir ve PDF'e çevirir
- `templates/catalog_template.html` — manuel düzenleme için şablon (isteğe bağlı)

