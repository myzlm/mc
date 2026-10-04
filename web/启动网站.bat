@echo off
title MyZLM MC Website
cd /d "%~dp0"

set WEB_PORT=3000
set MC_HOST=127.0.0.1
set MC_PORT=25565

REM Public IP shown on the page (e.g. your public or LAN IP). Empty = 127.0.0.1:25565
set PUBLIC_IP=

node "%~dp0server.js"
pause
