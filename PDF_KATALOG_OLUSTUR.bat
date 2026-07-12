@echo off
chcp 65001 >nul
title Ulusoy PDF Katalog
echo.
echo  =============================================
echo   ULUSOY - PDF KATALOG
echo  =============================================
echo.

cd /d "%~dp0"

REM Sunucu zaten calisiyor mu kontrol et
netstat -an 2>nul | find "8000" >nul 2>&1
if %errorlevel% neq 0 (
  echo  Sunucu baslatiliyor...
  start /B python -m http.server 8000
  timeout /t 2 /nobreak >nul
)

echo  Katalog sayfasi aciliyor...
echo.
echo  =============================================
echo   TARAYICIDE YAPILACAKLAR:
echo.
echo   1. Sayfa tamamen yuklenene kadar bekleyin
echo   2. Sag ustteki "PDF'e Kaydet" butonuna basin
echo   3. Yazici seciminde "PDF olarak kaydet" secin
echo   4. Kaydet butonuna basin
echo  =============================================
echo.

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --new-window "http://127.0.0.1:8000/katalog_print.html"
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://127.0.0.1:8000/katalog_print.html"
) else (
    start http://127.0.0.1:8000/katalog_print.html
)

pause

