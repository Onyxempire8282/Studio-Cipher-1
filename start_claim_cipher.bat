@echo off
echo Starting Claim Cipher Application Server...
echo.
cd /d "%~dp0claim_cipher_app"
echo Access your application at: http://localhost:5500
echo Press Ctrl+C to stop the server
echo.
python -m http.server 5500
pause
