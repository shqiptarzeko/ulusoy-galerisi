@echo off
REM Galerim - Başlat
REM Bu dosyayı çalıştırarak siteyi aç

setlocal enabledelayedexpansion

REM Masaüstüne geç
cd /d "%~dp0"

REM Browser'ı aç
timeout /t 1 /nobreak > nul
start http://localhost:8000

REM Server başlat
echo.
echo Sunucu başlatılıyor... http://localhost:8000
echo Browser'da site açıldı. Bu pencereyi kapatmak için Ctrl+C basın.
echo.

python -m http.server 8000

pause
