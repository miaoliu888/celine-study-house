@echo off
chcp 65001 > nul
title Siven 的蓝兔学习屋
cd /d "%~dp0"

echo.
echo ============================================
echo   Siven 的蓝兔学习屋 — 启动中
echo ============================================
echo.

REM 检查 8731 端口是否已被占用
netstat -an | find "LISTENING" | find ":8731 " > nul
if %errorlevel% == 0 (
  echo 端口 8731 已被占用，直接打开浏览器...
  start "" "http://localhost:8731/"
  goto end
)

echo 正在启动本地服务（端口 8731）...
start "Siven-Server" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"

REM 等 2 秒让服务起来
ping -n 3 127.0.0.1 > nul

echo 正在打开浏览器...
start "" "http://localhost:8731/"

:end
echo.
echo 已打开浏览器。
echo 提示：
echo   - 服务窗口最小化了（标题 "Siven-Server"），不要关
echo   - 关闭学习屋时，请在那个服务窗口里 Ctrl+C
echo.
pause
