@echo off
echo Building UniVerse GateKeeper for Production...
echo.

echo 1. Installing Dependencies...
call npm install --prefix server
call npm install --prefix client

echo.
echo 2. Building Frontend...
call npm run build --prefix client

echo.
echo 3. Starting Production Server (Port 5000)...
echo Visit http://localhost:5000 in your browser.
echo.
npm start --prefix server

pause
