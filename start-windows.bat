@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo 未检测到 Node.js。请先安装 Node.js LTS 版本：https://nodejs.org/
  echo 安装完成后重新双击本文件即可。
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo 首次运行，正在安装依赖（约 1-3 分钟，需要联网）……
  set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
  call npm install
  if errorlevel 1 (
    echo.
    echo 依赖安装失败，请检查网络后重试。
    pause
    exit /b 1
  )
)

echo 正在构建并启动 GameShelf……
call npm start
pause
