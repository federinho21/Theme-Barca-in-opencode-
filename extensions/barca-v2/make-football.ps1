$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$folder = Join-Path $PSScriptRoot 'assets\football'
[void][System.IO.Directory]::CreateDirectory($folder)
$crest = [System.Drawing.Image]::FromFile((Join-Path $PSScriptRoot 'assets\barca-crest.png'))
try {
    for ($frame = 0; $frame -lt 32; $frame++) {
        $phase = $frame / 32.0 * [Math]::PI * 2
        $bitmap = New-Object System.Drawing.Bitmap(128, 96)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddEllipse(-31, -31, 62, 62)
        $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            (New-Object System.Drawing.Point(-30, -30)),
            (New-Object System.Drawing.Point(30, 30)),
            [System.Drawing.ColorTranslator]::FromHtml('#2378C2'),
            [System.Drawing.ColorTranslator]::FromHtml('#06172D'))
        $grana = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#A50044'))
        $gold = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#D9B45D'), 1.2)
        $highlight = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(95, 220, 238, 255), 1.5)
        try {
            $graphics.Clear([System.Drawing.Color]::Transparent)
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.TranslateTransform([single](64 + 10 * [Math]::Sin($phase)), [single](48 - 2 * [Math]::Cos($phase * 2)))
            $graphics.RotateTransform([single](10 * [Math]::Sin($phase)))
            $graphics.FillPath($brush, $path)
            $graphics.SetClip($path)
            $graphics.FillRectangle($grana, -21, -32, 13, 64)
            $graphics.FillRectangle($grana, 8, -32, 13, 64)
            $graphics.DrawArc($gold, -24, -29, 48, 58, 55, 70)
            $graphics.DrawArc($gold, -24, -29, 48, 58, 235, 70)
            $graphics.DrawImage($crest, -19, -20, 38, 40)
            $graphics.ResetClip()
            $graphics.DrawEllipse($gold, -31, -31, 62, 62)
            $graphics.DrawArc($highlight, -28, -28, 56, 56, 205, 70)
            $file = Join-Path $folder ('ball-{0:D2}.png' -f $frame)
            $bitmap.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
        } finally {
            $highlight.Dispose(); $gold.Dispose(); $grana.Dispose(); $brush.Dispose()
            $path.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
        }
    }
    Write-Output 'Generados 32 fotogramas PNG antialias de 128x96 con el escudo real.'
} finally { $crest.Dispose() }
