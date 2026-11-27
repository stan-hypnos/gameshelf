const {
  app,
  BrowserWindow,
  ipcMain,
  protocol,
  net,
  dialog,
  shell,
  Menu,
  nativeImage,
  nativeTheme,
} = require('electron')
const path = require('path')
const fs = require('fs')
const { pathToFileURL } = require('url')

const baidu = require('./baidu.cjs')

app.setName('GameShelf')
nativeTheme.themeSource = 'dark'

// 自动化测试时使用隔离的数据目录（正常运行不会触发）
if (process.env.GS_E2E_USER_DATA) {
  app.setPath('userData', process.env.GS_E2E_USER_DATA)
}

const DIST = path.join(__dirname, '..', 'dist')
const RENDERER_URL = 'app://gameshelf/index.html'

let mainWindow = null
let baiduPageWindow = null

// ---------- 自定义 app:// 协议：让 IndexedDB 等按安全来源正常工作 ----------
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
])

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function coversDir() {
  return path.join(app.getPath('userData'), 'covers')
}

function safeJoin(root, rel) {
  const target = path.resolve(root, '.' + path.sep + rel.replace(/^[\/\\]+/, ''))
  if (!target.startsWith(path.resolve(root) + path.sep) && target !== path.resolve(root)) return null
  return target
}

function registerAppProtocol() {
  protocol.handle('app', async (req) => {
    const url = new URL(req.url)
    let rel = decodeURIComponent(url.pathname)
    if (!rel || rel === '/') rel = '/index.html'
    if (rel === '/index.html') rel = '/index.html'

    if (rel.startsWith('/covers/')) {
      const file = safeJoin(coversDir(), rel.replace('/covers/', ''))
      if (!file || !fs.existsSync(file)) return new Response('Not Found', { status: 404 })
      const ext = path.extname(file).toLowerCase()
      const res = await net.fetch(pathToFileURL(file).toString())
      const headers = new Headers(res.headers)
      headers.set(
        'Content-Type',
        ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg',
      )
      return new Response(res.body, { status: res.status, headers })
    }

    const file = safeJoin(DIST, rel)
    if (!file || !fs.existsSync(file)) {
      // SPA 兜底
      const index = path.join(DIST, 'index.html')
      if (fs.existsSync(index)) return net.fetch(pathToFileURL(index).toString())
      return new Response('Not Found', { status: 404 })
    }
    const res = await net.fetch(pathToFileURL(file).toString())
    const ext = path.extname(file).toLowerCase()
    if (MIME[ext]) {
      const headers = new Headers(res.headers)
      headers.set('Content-Type', MIME[ext])
      return new Response(res.body, { status: res.status, headers })
    }
    return res
  })
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 980,
    minHeight: 660,
    show: false,
    backgroundColor: '#0a0a0c',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 18, y: 20 },
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  })

  win.once('ready-to-show', () => win.show())
  win.loadURL(process.env.VITE_DEV_SERVER_URL || RENDERER_URL)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.on('closed', () => {
    mainWindow = null
  })
  return win
}

// ---------- 封面：百度搜索 ----------
ipcMain.handle('cover:search', async (_e, { keyword, page }) => {
  return baidu.searchBaiduImages(keyword, page)
})

ipcMain.handle('image:proxy', async (_e, url) => {
  const dataUrl = await baidu.proxyThumb(url)
  return { dataUrl }
})

ipcMain.handle('cover:saveFromUrl', async (_e, url) => {
  try {
    const file = await baidu.downloadAndSaveCover(url, coversDir())
    return { file }
  } catch (e) {
    return { error: String((e && e.message) || e) }
  }
})

ipcMain.handle('cover:saveDataUrl', async (_e, dataUrl) => {
  try {
    const file = await baidu.saveDataUrlCover(dataUrl, coversDir())
    return { file }
  } catch (e) {
    return { error: String((e && e.message) || e) }
  }
})

ipcMain.handle('cover:upload', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: '选择本地封面图片',
    properties: ['openFile'],
    filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'] }],
  })
  if (res.canceled || !res.filePaths.length) return { canceled: true }
  try {
    const buf = fs.readFileSync(res.filePaths[0])
    const jpeg = await baidu.normalizeImage(buf)
    const file = baidu.saveCoverBuffer(jpeg, coversDir())
    return { file }
  } catch (e) {
    return { error: '图片读取失败：' + String((e && e.message) || e) }
  }
})

ipcMain.handle('cover:delete', async (_e, file) => {
  try {
    if (typeof file !== 'string' || !/^[a-zA-Z0-9._-]+$/.test(file)) return { ok: false }
    const p = path.join(coversDir(), file)
    if (fs.existsSync(p)) fs.unlinkSync(p)
    return { ok: true }
  } catch {
    return { ok: false }
  }
})

ipcMain.handle('cover:readMany', async (_e, files) => {
  const out = {}
  for (const f of Array.isArray(files) ? files : []) {
    if (typeof f !== 'string' || !/^[a-zA-Z0-9._-]+$/.test(f)) continue
    try {
      const p = path.join(coversDir(), f)
      if (!fs.existsSync(p)) continue
      const buf = fs.readFileSync(p)
      const ext = path.extname(f).toLowerCase()
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
      out[f] = `data:${mime};base64,${buf.toString('base64')}`
    } catch {
      /* 忽略单张失败 */
    }
  }
  return out
})

// ---------- 百度图片网页窗口（真实页面 + 右键设为封面） ----------
function openBaiduPage(keyword) {
  const kw = String(keyword || '').trim()
  if (baiduPageWindow && !baiduPageWindow.isDestroyed()) {
    baiduPageWindow.focus()
    baiduPageWindow.loadURL(
      `https://image.baidu.com/search/index?tn=baiduimage&word=${encodeURIComponent(kw)}`
    )
    return
  }
  const win = new BrowserWindow({
    width: 1240,
    height: 860,
    title: `百度图片 - ${kw}`,
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      images: true,
    },
  })
  baiduPageWindow = win
  let loadToken = 0
  win.on('closed', () => {
    baiduPageWindow = null
  })
  win.webContents.on('did-start-loading', () => {
    loadToken += 1
  })
  win.webContents.on('did-finish-load', () => {
    const token = loadToken
    if (process.env.GS_DEBUG_BAIDU) console.log('[baidupage] loaded token', token)
    injectBaiduBanner(win, kw)
    armBaiduPicker(win, token, () => loadToken)
  })
  win.loadURL(
    `https://image.baidu.com/search/index?tn=baiduimage&word=${encodeURIComponent(kw)}`
  )
}

function injectBaiduBanner(win, kw) {
  const bannerText = `右键点击图片 → 设为当前游戏封面（${kw}）`
  win.webContents
    .executeJavaScript(
      `(function(){
        window.__gsBaiduPage = true;
        var old = document.getElementById('__gs_banner');
        if (old) old.remove();
        var bar = document.createElement('div');
        bar.id = '__gs_banner';
        bar.textContent = ${JSON.stringify(bannerText)};
        bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:10px;z-index:2147483647;' +
          'background:rgba(17,17,20,.92);color:#f3e6c8;border:1px solid rgba(233,196,106,.5);' +
          'padding:8px 16px;border-radius:999px;font:13px/1.4 -apple-system,"PingFang SC",sans-serif;' +
          'box-shadow:0 6px 24px rgba(0,0,0,.35);pointer-events:none;';
        document.documentElement.appendChild(bar);
        setTimeout(function(){ if (bar && bar.parentNode) bar.parentNode.removeChild(bar); }, 9000);
      })();`,
      true
    )
    .catch(() => {})
}

// 在页面里挂一个“等右键”的 Promise，主进程直接拿到被点中的图片地址，
// 不依赖 preload 通道，百度页面自己的右键逻辑也阻止不了（捕获阶段先处理）。
function armBaiduPicker(win, token, getToken) {
  if (win.isDestroyed()) return
  win.webContents
    .executeJavaScript(
      `new Promise(function(resolve){
        function onContext(e) {
          var img = e.target && e.target.closest ? e.target.closest('img') : null;
          if (!img) return;
          var src = img.currentSrc || img.src || img.getAttribute('data-imgurl') || '';
          if (!src || src.indexOf('data:') === 0) return;
          e.preventDefault();
          e.stopPropagation();
          window.removeEventListener('contextmenu', onContext, true);
          resolve(src);
        }
        window.addEventListener('contextmenu', onContext, true);
      })`,
      true
    )
    .then(async (src) => {
      if (process.env.GS_DEBUG_BAIDU) console.log('[baidupage] pick src', String(src).slice(0, 120), 'token ok', getToken() === token)
      if (!src || win.isDestroyed() || getToken() !== token) return
      await handleBaiduPick(win, src)
      armBaiduPicker(win, token, getToken)
    })
    .catch(() => {})
}

async function handleBaiduPick(win, url) {
  try {
    const file = await baidu.downloadAndSaveCover(url, coversDir())
    if (process.env.GS_DEBUG_BAIDU) console.log('[baidupage] saved', file)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('cover:picked', { file })
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
    toastInBaiduWindow(win, '已设为游戏封面 ✓', 'background:#e9c46a;color:#141414')
  } catch (e) {
    if (process.env.GS_DEBUG_BAIDU) console.log('[baidupage] save error', e && e.message)
    toastInBaiduWindow(win, '封面保存失败，换一张试试', 'background:#3a1a1d;color:#f0b1ab')
  }
}

function toastInBaiduWindow(win, text, style) {
  if (win.isDestroyed()) return
  win.webContents
    .executeJavaScript(
      `(function(){
        var b = document.createElement('div');
        b.textContent = ${JSON.stringify(text)};
        b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:32px;z-index:2147483647;' +
          ${JSON.stringify(style)} + ';padding:10px 20px;border-radius:10px;' +
          'font:600 14px -apple-system,"PingFang SC",sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3);';
        document.documentElement.appendChild(b);
        setTimeout(function(){ b.remove() }, 1800);
      })();`,
      true
    )
    .catch(() => {})
}

ipcMain.handle('cover:openBaiduPage', async (_e, keyword) => {
  if (process.env.GS_DEBUG_BAIDU) console.log('[baidupage] open', keyword)
  openBaiduPage(keyword)
  return { ok: true }
})

// ---------- 文件导入导出 ----------
ipcMain.handle('file:export', async (_e, { defaultName, content, encoding, filters }) => {
  const buf =
    encoding === 'base64'
      ? Buffer.from(String(content), 'base64')
      : Buffer.from(String(content), 'utf8')

  // 自动化测试：跳过系统保存对话框，直接写入指定目录
  if (process.env.GS_E2E_EXPORT_DIR) {
    const dir = process.env.GS_E2E_EXPORT_DIR
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, defaultName || 'export')
    fs.writeFileSync(file, buf)
    return { path: file }
  }

  const res = await dialog.showSaveDialog(mainWindow, {
    title: '保存文件',
    defaultPath: path.join(app.getPath('downloads'), defaultName || 'gameshelf-export'),
    filters: filters || [{ name: '所有文件', extensions: ['*'] }],
  })
  if (res.canceled || !res.filePath) return { canceled: true }
  try {
    fs.writeFileSync(res.filePath, buf)
    return { path: res.filePath }
  } catch (e) {
    return { error: String((e && e.message) || e) }
  }
})

ipcMain.handle('file:importJson', async () => {
  // 自动化测试：直接读取指定文件
  if (process.env.GS_E2E_IMPORT_FILE) {
    try {
      const file = process.env.GS_E2E_IMPORT_FILE
      return { path: file, text: fs.readFileSync(file, 'utf8') }
    } catch (e) {
      return { error: '文件读取失败：' + String((e && e.message) || e) }
    }
  }
  const res = await dialog.showOpenDialog(mainWindow, {
    title: '选择 JSON 备份文件',
    properties: ['openFile'],
    filters: [{ name: 'JSON 备份', extensions: ['json'] }],
  })
  if (res.canceled || !res.filePaths.length) return { canceled: true }
  try {
    const text = fs.readFileSync(res.filePaths[0], 'utf8')
    return { path: res.filePaths[0], text }
  } catch (e) {
    return { error: '文件读取失败：' + String((e && e.message) || e) }
  }
})

ipcMain.handle('app:info', async () => {
  const dir = app.getPath('userData')
  let coverCount = 0
  try {
    coverCount = fs.readdirSync(coversDir()).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f)).length
  } catch {}
  return {
    userData: dir,
    coversDir: coversDir(),
    coverCount,
    version: app.getVersion(),
    platform: process.platform,
  }
})

ipcMain.handle('app:openPath', async (_e, p) => {
  const target = p === 'covers' ? coversDir() : app.getPath('userData')
  fs.mkdirSync(target, { recursive: true })
  return shell.openPath(target)
})

// ---------- 应用生命周期 ----------
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    registerAppProtocol()
    fs.mkdirSync(coversDir(), { recursive: true })
    Menu.setApplicationMenu(buildMenu())
    mainWindow = createMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow()
    })
  })

  app.on('window-all-closed', () => {
    baidu.disposeEngine()
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => baidu.disposeEngine())
}

function buildMenu() {
  if (process.platform !== 'darwin') return null
  return Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        { type: 'separator' },
        { role: 'reload', label: '重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
      ],
    },
  ])
}
