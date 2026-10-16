@echo off
title MyZLM MC Website
cd /d "%~dp0"

set WEB_PORT=3000
set MC_HOST=127.0.0.1
set MC_PORT=25565

REM Public IP shown on the page. Empty = 127.0.0.1:25565
set PUBLIC_IP=8.134.162.189:8437

node "%~dp0server.js"
pause
