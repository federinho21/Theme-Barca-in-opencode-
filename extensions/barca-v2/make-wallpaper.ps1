$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assets = Join-Path $PSScriptRoot 'assets'
[void][System.IO.Directory]::CreateDirectory($assets)
$download = 'C:\Users\Usuario\AppData\Local\Temp\opencode\terminal-barca-setup\barca-crest.png'
$crestPath = Join-Path $assets 'barca-crest.png'
if (-not (Test-Path $crestPath)) { Copy-Item -LiteralPath $download -Destination $crestPath }
$source = [System.Drawing.Image]::FromFile($crestPath)
$small = New-Object System.Drawing.Bitmap(160, 160)
$smallGraphics = [System.Drawing.Graphics]::FromImage($small)
$wallpaper = New-Object System.Drawing.Bitmap(1920, 1080)
$graphics = [System.Drawing.Graphics]::FromImage($wallpaper)
$attributes = New-Object System.Drawing.Imaging.ImageAttributes
try {
    # Downsample then enlarge with interpolation for a lightly softened crest.
    $smallGraphics.Clear([System.Drawing.Color]::Transparent)
    $smallGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $smallGraphics.DrawImage($source, 0, 0, 160, 160)
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#080F20'))
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBilinear
    $matrix = New-Object System.Drawing.Imaging.ColorMatrix
    $matrix.Matrix33 = 0.13
    $attributes.SetColorMatrix($matrix)
    $destination = New-Object System.Drawing.Rectangle(650, 230, 620, 620)
    $graphics.DrawImage($small, $destination, 0, 0, 160, 160, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
    $output = Join-Path $assets 'barca-wallpaper.png'
    $wallpaper.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "Wallpaper creado: $output (1920x1080, escudo al 13%)."
} finally {
    $attributes.Dispose()
    $graphics.Dispose()
    $wallpaper.Dispose()
    $smallGraphics.Dispose()
    $small.Dispose()
    $source.Dispose()
}
