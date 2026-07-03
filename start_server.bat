@echo off
cd /d "%~dp0"

echo Sunucu baslatiliyor...
start /B python -m http.server 8000

timeout /t 2 /nobreak > nul

REM Once Edge, sonra Chrome, sonra varsayilan tarayici dene
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --new-window "http://127.0.0.1:8000"
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://127.0.0.1:8000"
) else (
    start http://127.0.0.1:8000
)

echo.
echo Uygulama http://127.0.0.1:8000 adresinde calisiyor.
echo Kapatmak icin bu pencereyi kapatin.
echo.
pause
