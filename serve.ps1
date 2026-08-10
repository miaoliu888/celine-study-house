$ErrorActionPreference = 'Stop'
$port = 8731
$root = 'D:\6-6-minimax\siven-study-house'
Add-Type -AssemblyName System.Net.Http
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "[serve] http://localhost:$port  (root: $root)"
Write-Host "[serve] Ctrl+C to stop"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.ico'  = 'image/x-icon'
  '.md'   = 'text/markdown; charset=utf-8'
  '.txt'  = 'text/plain; charset=utf-8'
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response
  $relPath = [Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
  if (-not $relPath) { $relPath = 'index.html' }
  $full = Join-Path $root $relPath
  if (Test-Path $full -PathType Leaf) {
    $bytes = [System.IO.File]::ReadAllBytes($full)
    $ext = [System.IO.Path]::GetExtension($full).ToLower()
    $res.ContentType = $mime[$ext]
    if ($ext -eq '.html') { $res.Headers.Add('Cache-Control', 'no-store') }
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $res.StatusCode = 404
    $msg = [System.Text.Encoding]::UTF8.GetBytes("Not Found: $relPath")
    $res.ContentType = 'text/plain; charset=utf-8'
    $res.ContentLength64 = $msg.Length
    $res.OutputStream.Write($msg, 0, $msg.Length)
  }
  $res.Close()
}
