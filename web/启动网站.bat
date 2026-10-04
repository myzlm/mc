@echo off
title MyZLM MC Website
cd /d "%~dp0"

set WEB_PORT=3000
set MC_HOST=127.0.0.1
set MC_PORT=25565

REM 填写对外展示的 IP 或域名（例如公网 IP 或内网 IP），留空则显示 127.0.0.1:25565
set PUBLIC_IP=

node "%~dp0server.js"
pause
