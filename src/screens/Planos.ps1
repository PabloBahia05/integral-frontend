# Planos.ps1  (DOMUS2) - archivo aparte de Dimensiones.ps1: no modifica medidas del módulo.
# Al ejecutarlo aparece una pantalla con 3 botones:
#  - "DOMUS2": abre el panel DOMUS2 (ModuloActivo.ps1, el mismo que abría el icono) y "Dimensiones": abre Dimensiones.ps1.
#    Los dos tienen que estar en la misma carpeta que este archivo (o cargá las rutas en $rutaDomus / $rutaDimensiones).
#  - "Cargar imágenes": elegís una o varias imágenes y se adjuntan al dibujo activo de AutoCAD, en fila, a la derecha de todo lo dibujado.
#  - "Planos de CAD": ventana con la imagen de referencia (la abrís vos, para leer las medidas) y los datos del mueble: ancho, alto,
#    profundidad, espesor, zócalo, cajones y puertas. Genera frente, lateral y planta con cotas en el dibujo activo
#    (capa DOMUS2_PLANO, a la derecha de todo lo dibujado, una sola marca de deshacer).
#    En esa ventana, "Leer cotas de la foto" lee las cotas anotadas en la imagen de referencia y completa los campos (ancho, alto, profundidad...).
# Todo es local, salvo "Leer cotas de la foto": esa manda la imagen de referencia a la API de Claude (internet + clave ANTHROPIC_API_KEY). Unidades del dibujo: cm.
# Registro: %TEMP%\DOMUS2.log (el mismo de Dimensiones.ps1 y del panel DOMUS2).

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

# ======================= CONFIGURACIÓN =======================
# "Cargar imágenes": ancho (cm) con el que se inserta cada imagen en el dibujo (el alto sale de su proporción) y separación entre ellas.
$anchoImagen = 30.0
$separacionImagen = 10.0
# Las imágenes bajadas de Google Drive se guardan acá (el dibujo guarda un enlace a la imagen, no una copia: no borres esta carpeta).
$carpetaDescargas = Join-Path ([Environment]::GetFolderPath("MyDocuments")) "DOMUS2_imagenes"
# "Planos de CAD": espesor del fondo (trasera), luz entre frentes, tamaño del texto de las cotas y separación entre vistas (cm)
$espesorFondo = 0.3
$luzFrente = 0.3
$altoTextoPlano = 2.0
$separacionVistas = 60.0
# "Leer cotas de la foto": modelo de Claude con visión. La clave NO va en este archivo: se lee de la variable de entorno ANTHROPIC_API_KEY.
$modeloClaude = "claude-sonnet-5-5"
# Ruta de Dimensiones.ps1 (por defecto, la misma carpeta que este archivo)
$carpeta = $PSScriptRoot
if (-not $carpeta) { try { $carpeta = Split-Path -Parent $MyInvocation.MyCommand.Path } catch { $carpeta = "" } }
$rutaDimensiones = ""
$rutaDomus = ""
if ($carpeta) {
    $rutaDimensiones = Join-Path $carpeta "Dimensiones.ps1"
    $rutaDomus = Join-Path $carpeta "ModuloActivo.ps1"
}
# ==============================================================

$script:rutaLog = Join-Path $env:TEMP "DOMUS2.log"
function Log-Domus($texto) {
    try {
        if ((Test-Path $script:rutaLog) -and ((Get-Item $script:rutaLog).Length -gt 300000)) { Remove-Item $script:rutaLog -Force }
        Add-Content -Path $script:rutaLog -Value ((Get-Date).ToString("yyyy-MM-dd HH:mm:ss.fff") + "  " + $texto)
    } catch { }
}

$colorFondo = [System.Drawing.Color]::FromArgb(204, 230, 250)
$colorAzul  = [System.Drawing.Color]::FromArgb(10, 58, 92)

function Obtener-Doc {
    $acad = [Runtime.InteropServices.Marshal]::GetActiveObject("AutoCAD.Application")
    $doc = $acad.ActiveDocument
    if ($doc -eq $null) { throw "no hay dibujo activo en AutoCAD" }
    return $doc
}

# ---- Pantalla previa --------------------------------------------------------
function Texto-Dibujo {
    try { return "Dibujo activo: " + (Obtener-Doc).Name } catch { return "AutoCAD no está abierto o no tiene un dibujo activo." }
}

# Carpeta de Google Drive para escritorio si está instalado ("" si no se encuentra): ahí abre el selector de archivos.
function Carpeta-Drive {
    $cands = New-Object System.Collections.ArrayList
    foreach ($n in @("Google Drive", "Mi unidad", "My Drive")) { [void]$cands.Add((Join-Path $env:USERPROFILE $n)) }
    try {
        foreach ($d in [System.IO.DriveInfo]::GetDrives()) {
            if (-not $d.IsReady) { continue }
            foreach ($n in @("Mi unidad", "My Drive")) { [void]$cands.Add((Join-Path $d.RootDirectory.FullName $n)) }
        }
    } catch { }
    foreach ($c in $cands) { if (Test-Path $c) { return $c } }
    return ""
}

# Adjunta imágenes (lista de rutas) al dibujo activo (espacio modelo), en fila a la derecha de todo lo dibujado.
# Una sola marca de deshacer. Devuelve el texto para mostrar.
function Adjuntar-Imagenes($rutas) {
    try { $doc = Obtener-Doc } catch { return "No se cargó nada: " + $_.Exception.Message }
    $marca = $false
    $n = 0
    $fallas = @()
    try {
        $doc.StartUndoMark()
        $marca = $true
        $emx = $doc.GetVariable("EXTMAX")
        $emn = $doc.GetVariable("EXTMIN")
        $x = [double]$emx[0] + $separacionImagen
        $y = [double]$emn[1]
        foreach ($ruta in $rutas) {
            $nombre = [System.IO.Path]::GetFileName($ruta)
            try {
                $img = [System.Drawing.Image]::FromFile($ruta)
                $pw = [double]$img.Width
                $img.Dispose()
                $pt = [double[]]@($x, $y, 0.0)
                [void]$doc.ModelSpace.AddRaster($ruta, $pt, ($anchoImagen / $pw), 0.0)
                $x += $anchoImagen + $separacionImagen
                $n++
                Log-Domus ("Planos: imagen cargada " + $ruta)
            } catch {
                $fallas += ($nombre + ": " + $_.Exception.Message)
                Log-Domus ("Planos: falló al cargar la imagen " + $ruta + ": " + $_.Exception.Message)
            }
        }
    } catch {
        return "No se cargó nada: " + $_.Exception.Message
    } finally {
        if ($marca) { try { $doc.EndUndoMark() } catch { } }
    }
    $txt = $n.ToString() + " imagen(es) cargada(s) en " + $doc.Name + "."
    if ($fallas.Count -gt 0) { $txt += " No se pudo cargar: " + ($fallas -join "; ") }
    return $txt
}

# Imágenes de la PC (si tenés Google Drive para escritorio, el selector abre en tu carpeta de Drive)
function Cargar-Imagenes($owner) {
    $dlg = New-Object System.Windows.Forms.OpenFileDialog
    $dlg.Title = "Cargar imágenes"
    $dlg.Filter = "Imágenes|*.png;*.jpg;*.jpeg;*.bmp;*.tif;*.tiff;*.gif|Todos los archivos|*.*"
    $dlg.Multiselect = $true
    $dd = Carpeta-Drive
    if ($dd) { $dlg.InitialDirectory = $dd }
    if ($dlg.ShowDialog($owner) -ne [System.Windows.Forms.DialogResult]::OK) { return "" }
    return (Adjuntar-Imagenes @($dlg.FileNames))
}

# ---- Google Drive por enlace -------------------------------------------------
# Sirve para archivos compartidos como "Cualquier persona con el enlace". No usa API ni inicia sesión: los archivos privados no se pueden bajar.
function Id-Drive($texto) {
    $t = $texto.Trim()
    $m = [regex]::Match($t, '/d/([A-Za-z0-9_-]{10,})')
    if ($m.Success) { return $m.Groups[1].Value }
    $m = [regex]::Match($t, '[?&]id=([A-Za-z0-9_-]{10,})')
    if ($m.Success) { return $m.Groups[1].Value }
    return $null
}

# Baja el archivo a $carpetaDescargas, comprueba que sea una imagen (por los primeros bytes) y devuelve la ruta
function Bajar-De-Drive($id) {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    if (-not (Test-Path $carpetaDescargas)) { [void](New-Item -ItemType Directory -Path $carpetaDescargas -Force) }
    $tmp = Join-Path $carpetaDescargas ($id + ".tmp")
    try {
        Invoke-WebRequest -Uri ("https://drive.google.com/uc?export=download&id=" + $id) -OutFile $tmp -UseBasicParsing -TimeoutSec 90
    } catch {
        throw ("no se pudo bajar el archivo (" + $_.Exception.Message + ")")
    }
    $h = New-Object byte[] 12
    $nl = 0
    $fs = [System.IO.File]::OpenRead($tmp)
    try { $nl = $fs.Read($h, 0, 12) } finally { $fs.Close() }
    $ext = ""
    if (($nl -ge 4) -and ($h[0] -eq 0x89) -and ($h[1] -eq 0x50) -and ($h[2] -eq 0x4E) -and ($h[3] -eq 0x47)) { $ext = ".png" }
    elseif (($nl -ge 3) -and ($h[0] -eq 0xFF) -and ($h[1] -eq 0xD8) -and ($h[2] -eq 0xFF)) { $ext = ".jpg" }
    elseif (($nl -ge 4) -and ($h[0] -eq 0x47) -and ($h[1] -eq 0x49) -and ($h[2] -eq 0x46) -and ($h[3] -eq 0x38)) { $ext = ".gif" }
    elseif (($nl -ge 2) -and ($h[0] -eq 0x42) -and ($h[1] -eq 0x4D)) { $ext = ".bmp" }
    elseif (($nl -ge 4) -and ((($h[0] -eq 0x49) -and ($h[1] -eq 0x49) -and ($h[2] -eq 0x2A) -and ($h[3] -eq 0x00)) -or (($h[0] -eq 0x4D) -and ($h[1] -eq 0x4D) -and ($h[2] -eq 0x00) -and ($h[3] -eq 0x2A)))) { $ext = ".tif" }
    if (-not $ext) {
        Remove-Item $tmp -Force -ErrorAction SilentlyContinue
        throw "no es una imagen (png, jpg, gif, bmp, tif) o no es público: en Drive, Compartir > Cualquier persona con el enlace"
    }
    $dest = Join-Path $carpetaDescargas ($id + $ext)
    Move-Item -Path $tmp -Destination $dest -Force
    Log-Domus ("Planos: imagen bajada de Drive " + $dest)
    return $dest
}

# Ventana para pegar uno o más enlaces de Drive (uno por línea). Devuelve la lista, o $null si cancelás.
function Pedir-Enlaces($owner) {
    $f = New-Object System.Windows.Forms.Form
    $f.Text = "Imágenes desde Google Drive"
    $f.StartPosition = "CenterParent"
    $f.FormBorderStyle = "FixedDialog"
    $f.MaximizeBox = $false
    $f.MinimizeBox = $false
    $f.ClientSize = New-Object System.Drawing.Size(460, 220)
    $l = New-Object System.Windows.Forms.Label
    $l.Text = "Pegá el enlace de cada imagen (uno por línea). En Drive: clic derecho en la imagen > Compartir > Cualquier persona con el enlace > Copiar enlace."
    $l.Location = New-Object System.Drawing.Point(10, 10)
    $l.Size = New-Object System.Drawing.Size(440, 48)
    $f.Controls.Add($l)
    $t = New-Object System.Windows.Forms.TextBox
    $t.Multiline = $true
    $t.ScrollBars = "Vertical"
    $t.AcceptsReturn = $true
    $t.Location = New-Object System.Drawing.Point(10, 62)
    $t.Size = New-Object System.Drawing.Size(440, 110)
    $f.Controls.Add($t)
    $ok = New-Object System.Windows.Forms.Button
    $ok.Text = "Bajar"
    $ok.Location = New-Object System.Drawing.Point(294, 184)
    $ok.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $f.Controls.Add($ok)
    $no = New-Object System.Windows.Forms.Button
    $no.Text = "Cancelar"
    $no.Location = New-Object System.Drawing.Point(375, 184)
    $no.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
    $f.Controls.Add($no)
    $f.CancelButton = $no
    $r = $f.ShowDialog($owner)
    $lineas = @($t.Text -split "[\r\n]+" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    $f.Dispose()
    if ($r -ne [System.Windows.Forms.DialogResult]::OK) { return $null }
    return , $lineas
}

# Baja las imágenes de los enlaces y las adjunta al dibujo activo
function Cargar-Desde-Drive($owner) {
    $lineas = Pedir-Enlaces $owner
    if (($lineas -eq $null) -or ($lineas.Count -eq 0)) { return "" }
    $lblLauncher.Text = "Bajando de Google Drive..."
    $owner.Cursor = [System.Windows.Forms.Cursors]::WaitCursor
    [System.Windows.Forms.Application]::DoEvents()
    $rutas = @()
    $fallas = @()
    try {
        foreach ($l in $lineas) {
            $id = Id-Drive $l
            if (-not $id) { $fallas += ("enlace no reconocido: " + $l); continue }
            try { $rutas += (Bajar-De-Drive $id) } catch { $fallas += ($l + " -> " + $_.Exception.Message) }
        }
    } finally { $owner.Cursor = [System.Windows.Forms.Cursors]::Default }
    if ($rutas.Count -eq 0) { return "No se bajó ninguna imagen: " + ($fallas -join "; ") }
    $txt = Adjuntar-Imagenes $rutas
    if ($fallas.Count -gt 0) { $txt += " No se pudo bajar: " + ($fallas -join "; ") }
    return $txt
}

# ---- Planos de CAD ------------------------------------------------------------
function Pt($x, $y) { return , ([double[]]@([double]$x, [double]$y, 0.0)) }

# Devuelve el texto del problema, o "" si las medidas sirven
function Validar-Medidas($W, $A, $P, $e, $z, $nc, $np, $hc) {
    if (($nc + $np) -lt 1) { return "Poné al menos un cajón o una puerta." }
    if (($W - 2 * $e) -lt 10) { return "El ancho es muy chico para ese espesor." }
    if (($A - $z - 2 * $e) -lt 10) { return "El alto es muy chico para ese zócalo y espesor." }
    if ($P -lt 10) { return "La profundidad es muy chica." }
    if (($nc -gt 0) -and ($np -gt 0)) {
        if ($hc -lt 5) { return "El alto del frente de cajón es muy chico." }
        if (($A - $z - $nc * $hc) -lt 10) { return "Los cajones ocupan casi todo el alto: no queda lugar para las puertas." }
    }
    return ""
}

# Arma las 3 vistas (frente, lateral, planta) como datos: rectángulos, cotas interiores y nombre. Todo en cm.
function Armar-Vistas($W, $A, $P, $e, $z, $nc, $np, $hc) {
    $ef = $espesorFondo
    $lz = $luzFrente
    $HA = $A - $z
    # --- Frente: zócalo, frentes de cajón (arriba) y puertas (abajo)
    $fr = New-Object System.Collections.ArrayList
    $cf = New-Object System.Collections.ArrayList
    if ($z -gt 0) {
        [void]$fr.Add(@{ x = $e; y = 0.0; ancho = ($W - 2 * $e); alto = $z; nombre = "Zócalo" })
        [void]$cf.Add(@{ x1 = 0.0; y1 = 0.0; x2 = 0.0; y2 = $z; offset = 20.0 })
    }
    $altoCaj = 0.0
    if ($nc -gt 0) { if ($np -gt 0) { $altoCaj = $hc } else { $altoCaj = $HA / $nc } }
    for ($i = 0; $i -lt $nc; $i++) {
        $y1 = $A - ($i + 1) * $altoCaj
        [void]$fr.Add(@{ x = ($lz / 2); y = ($y1 + $lz / 2); ancho = ($W - $lz); alto = ($altoCaj - $lz); nombre = ("Frente cajón " + ($i + 1)) })
        [void]$cf.Add(@{ x1 = 0.0; y1 = $y1; x2 = 0.0; y2 = ($y1 + $altoCaj); offset = 20.0 })
    }
    if ($np -gt 0) {
        $zy0 = $z
        $zy1 = $A - $nc * $altoCaj
        $wd = $W / $np
        for ($i = 0; $i -lt $np; $i++) {
            [void]$fr.Add(@{ x = ($i * $wd + $lz / 2); y = ($zy0 + $lz / 2); ancho = ($wd - $lz); alto = ($zy1 - $zy0 - $lz); nombre = ("Puerta " + ($i + 1)) })
        }
        [void]$cf.Add(@{ x1 = 0.0; y1 = $zy0; x2 = 0.0; y2 = $zy1; offset = 20.0 })
    }
    $vFrente = @{ nombre = "Frente"; rectangulos = $fr; lineas = @(); cotas = $cf }
    # --- Lateral (eje horizontal = profundidad, vertical = alto): lateral con la posición de base, tapa, fondo y zócalo
    $lt = New-Object System.Collections.ArrayList
    $cl = New-Object System.Collections.ArrayList
    [void]$lt.Add(@{ x = 0.0; y = $z; ancho = $P; alto = $HA; nombre = "Lateral" })
    [void]$lt.Add(@{ x = 0.0; y = $z; ancho = ($P - $ef); alto = $e; nombre = "Base" })
    [void]$lt.Add(@{ x = 0.0; y = ($A - $e); ancho = ($P - $ef); alto = $e; nombre = "Tapa" })
    [void]$lt.Add(@{ x = ($P - $ef); y = $z; ancho = $ef; alto = $HA; nombre = "" })
    if ($z -gt 0) {
        [void]$lt.Add(@{ x = ([Math]::Min(5.0, $P / 4)); y = 0.0; ancho = $e; alto = $z; nombre = "" })
        [void]$cl.Add(@{ x1 = 0.0; y1 = 0.0; x2 = 0.0; y2 = $z; offset = 20.0 })
    }
    $vLateral = @{ nombre = "Lateral"; rectangulos = $lt; lineas = @(); cotas = $cl }
    # --- Planta (eje horizontal = ancho, vertical = profundidad)
    $pl = New-Object System.Collections.ArrayList
    [void]$pl.Add(@{ x = 0.0; y = 0.0; ancho = $W; alto = $P; nombre = "Tapa" })
    [void]$pl.Add(@{ x = 0.0; y = 0.0; ancho = $e; alto = $P; nombre = "" })
    [void]$pl.Add(@{ x = ($W - $e); y = 0.0; ancho = $e; alto = $P; nombre = "" })
    [void]$pl.Add(@{ x = $e; y = ($P - $ef); ancho = ($W - 2 * $e); alto = $ef; nombre = "" })
    $cp = New-Object System.Collections.ArrayList
    [void]$cp.Add(@{ x1 = 0.0; y1 = $P; x2 = $e; y2 = $P; offset = 10.0 })
    $vPlanta = @{ nombre = "Planta"; rectangulos = $pl; lineas = @(); cotas = $cp }
    return , @($vFrente, $vLateral, $vPlanta)
}

# Dibuja las vistas una al lado de la otra, a la derecha de todo lo dibujado. Cada vista lleva cota de ancho y alto totales.
function Dibujar-Vistas($doc, $vistas) {
    $ms = $doc.ModelSpace
    $capa = "DOMUS2_PLANO"
    try { $null = $doc.Layers.Item($capa) } catch { [void]$doc.Layers.Add($capa) }
    $emx = $doc.GetVariable("EXTMAX")
    $emn = $doc.GetVariable("EXTMIN")
    $x0 = [double]$emx[0] + $separacionVistas
    $y0 = [double]$emn[1]
    $nEnt = 0
    foreach ($v in $vistas) {
        $minx = [double]::MaxValue; $miny = [double]::MaxValue; $maxx = [double]::MinValue; $maxy = [double]::MinValue
        foreach ($r in $v.rectangulos) {
            $rx = [double]$r.x; $ry = [double]$r.y; $rw = [double]$r.ancho; $rh = [double]$r.alto
            if ($rx -lt $minx) { $minx = $rx }
            if ($ry -lt $miny) { $miny = $ry }
            if (($rx + $rw) -gt $maxx) { $maxx = $rx + $rw }
            if (($ry + $rh) -gt $maxy) { $maxy = $ry + $rh }
        }
        if ($minx -eq [double]::MaxValue) { continue }
        $dx = $x0 - $minx
        $dy = $y0 - $miny
        foreach ($r in $v.rectangulos) {
            $rx = [double]$r.x + $dx; $ry = [double]$r.y + $dy; $rw = [double]$r.ancho; $rh = [double]$r.alto
            $pts = [double[]]@($rx, $ry, ($rx + $rw), $ry, ($rx + $rw), ($ry + $rh), $rx, ($ry + $rh))
            $pol = $ms.AddLightWeightPolyline($pts)
            $pol.Closed = $true
            $pol.Layer = $capa
            $nEnt++
            if (([string]$r.nombre) -and ($rw -ge 8.0) -and ($rh -ge 3.0)) {
                $alto = [Math]::Min($altoTextoPlano, [Math]::Min($rw, $rh) / 4.0)
                $tx = $ms.AddText([string]$r.nombre, (Pt ($rx + 0.5) ($ry + 0.5)), $alto)
                $tx.Layer = $capa
                $nEnt++
            }
        }
        $cotas = New-Object System.Collections.ArrayList
        foreach ($k in $v.cotas) {
            $ax = [double]$k.x1 + $dx; $ay = [double]$k.y1 + $dy; $bx = [double]$k.x2 + $dx; $by = [double]$k.y2 + $dy
            $off = 8.0
            if ($k.offset -ne $null) { $off = [double]$k.offset }
            $lg = [Math]::Sqrt(($bx - $ax) * ($bx - $ax) + ($by - $ay) * ($by - $ay))
            if ($lg -lt 0.01) { continue }
            $tpx = ($ax + $bx) / 2 + (-($by - $ay) / $lg) * $off
            $tpy = ($ay + $by) / 2 + (($bx - $ax) / $lg) * $off
            [void]$cotas.Add(@($ax, $ay, $bx, $by, $tpx, $tpy))
        }
        [void]$cotas.Add(@($x0, $y0, ($x0 + $maxx - $minx), $y0, (($x0 * 2 + $maxx - $minx) / 2), ($y0 - 10.0)))
        [void]$cotas.Add(@($x0, $y0, $x0, ($y0 + $maxy - $miny), ($x0 - 10.0), (($y0 * 2 + $maxy - $miny) / 2)))
        foreach ($c in $cotas) {
            $dm = $ms.AddDimAligned((Pt $c[0] $c[1]), (Pt $c[2] $c[3]), (Pt $c[4] $c[5]))
            $dm.Layer = $capa
            try { $dm.TextHeight = $altoTextoPlano; $dm.ArrowheadSize = $altoTextoPlano * 0.75 } catch { }
            $nEnt++
        }
        $tt = $ms.AddText([string]$v.nombre, (Pt $x0 ($y0 + $maxy - $miny + 6.0)), 3.0)
        $tt.Layer = $capa
        $nEnt++
        $x0 = $x0 + ($maxx - $minx) + $separacionVistas
    }
    return $nEnt
}

# ---- Leer cotas de la foto (API de Claude) ------------------------------------
# Clave de la API: variable de entorno ANTHROPIC_API_KEY (proceso, usuario o equipo). Se lee del registro en cada clic: no hace falta reiniciar nada.
function Clave-Api {
    foreach ($ambito in @("Process", "User", "Machine")) {
        $v = [Environment]::GetEnvironmentVariable("ANTHROPIC_API_KEY", $ambito)
        if ($v -and $v.Trim()) { return $v.Trim() }
    }
    return ""
}

# Reduce la imagen (lado mayor 1568 px) y la devuelve en JPEG base64
function Imagen-A-Base64($img) {
    $w = [double]$img.Width
    $h = [double]$img.Height
    $esc = [Math]::Min(1.0, 1568.0 / [Math]::Max($w, $h))
    $nw = [int][Math]::Max(1, [Math]::Round($w * $esc))
    $nh = [int][Math]::Max(1, [Math]::Round($h * $esc))
    $bmp = New-Object System.Drawing.Bitmap($nw, $nh)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    try {
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.Clear([System.Drawing.Color]::White)
        $g.DrawImage($img, 0, 0, $nw, $nh)
    } finally { $g.Dispose() }
    $codec = $null
    foreach ($c in [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()) { if ($c.MimeType -eq "image/jpeg") { $codec = $c } }
    $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]90)
    $ms = New-Object System.IO.MemoryStream
    try {
        $bmp.Save($ms, $codec, $ep)
        return [Convert]::ToBase64String($ms.ToArray())
    } finally { $ms.Dispose(); $bmp.Dispose() }
}

# Manda la imagen a Claude y devuelve el objeto con las medidas leídas (propiedades en $null si no las encontró)
function Leer-Cotas-Foto($img, $clave) {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $b64 = Imagen-A-Base64 $img
    $prompt = @"
Esta foto muestra el lugar donde se va a fabricar un mueble (por ejemplo una bajo mesada). Tiene cotas anotadas encima, en cm: números en etiquetas blancas y flechas de colores que indican qué distancia mide cada número. Las medidas pueden venir con coma decimal.

Leé las cotas y devolvé las medidas del MUEBLE a fabricar:
- ancho: ancho total del frente
- alto: alto total del mueble, zócalo incluido
- profundidad
- espesor: espesor del tablero, solo si hay una cota que lo indique
- zocalo: alto del zócalo, solo si hay una cota que lo indique
- cajones y puertas: cantidades, solo si están escritas explícitamente
- alto_frente_cajon: solo si hay una cota que lo indique

Reglas: usá las flechas y la posición de cada número para decidir qué mide. No inventes: si una medida no está en la foto, poné null. Si a una cota le falta la coma decimal y el valor sería imposible para un mueble (por ejemplo 797 como alto sería 79,7), corregila con sentido común. Ignorá las cotas que no sean del mueble.

Respondé SOLO con un objeto JSON, sin texto antes ni después ni bloques de código, con estas claves: ancho, alto, profundidad, espesor, zocalo, cajones, puertas, alto_frente_cajon (números en cm con punto decimal, o null) y lectura (texto corto en español, máximo 250 caracteres, que diga qué número de la foto usaste para cada medida y cuáles ignoraste).
"@
    $cuerpo = @{
        model = $modeloClaude
        max_tokens = 700
        messages = @(
            @{
                role = "user"
                content = @(
                    @{ type = "image"; source = @{ type = "base64"; media_type = "image/jpeg"; data = $b64 } },
                    @{ type = "text"; text = $prompt }
                )
            }
        )
    }
    $json = ConvertTo-Json -InputObject $cuerpo -Depth 10 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $cab = @{ "x-api-key" = $clave; "anthropic-version" = "2023-06-01" }
    try {
        $resp = Invoke-RestMethod -Uri "https://api.anthropic.com/v1/messages" -Method Post -Headers $cab -ContentType "application/json; charset=utf-8" -Body $bytes -TimeoutSec 90
    } catch {
        $det = ""
        try { $det = $_.ErrorDetails.Message } catch { }
        if ($det) { throw ("la API respondió con error: " + $det) }
        throw $_.Exception.Message
    }
    $texto = ""
    foreach ($blq in $resp.content) { if ($blq.type -eq "text") { $texto += [string]$blq.text } }
    Log-Domus ("Planos: respuesta de Claude al leer cotas: " + $texto)
    $i = $texto.IndexOf("{")
    $j = $texto.LastIndexOf("}")
    if (($i -lt 0) -or ($j -le $i)) { throw "la respuesta no trae las medidas en el formato esperado" }
    return ($texto.Substring($i, $j - $i + 1) | ConvertFrom-Json)
}

# Pone el valor en el campo si es un número dentro del rango del campo. Devuelve $true si lo cargó.
function Poner-Valor($num, $valor) {
    if ($valor -eq $null) { return $false }
    $d = 0.0
    $ok = [double]::TryParse(([string]$valor).Replace(",", "."), [System.Globalization.NumberStyles]::Float, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$d)
    if (-not $ok) { return $false }
    $d = [Math]::Round($d, [int]$num.DecimalPlaces)
    if (($d -lt [double]$num.Minimum) -or ($d -gt [double]$num.Maximum)) { return $false }
    $num.Value = [decimal]$d
    return $true
}

function Nuevo-Campo($form, $texto, $y, $min, $max, $def, $dec) {
    $l = New-Object System.Windows.Forms.Label
    $l.Text = $texto
    $l.Location = New-Object System.Drawing.Point(470, ($y + 4))
    $l.Size = New-Object System.Drawing.Size(150, 22)
    $form.Controls.Add($l)
    $n = New-Object System.Windows.Forms.NumericUpDown
    $n.DecimalPlaces = $dec
    $n.Minimum = $min
    $n.Maximum = $max
    $n.Value = $def
    $n.Location = New-Object System.Drawing.Point(630, $y)
    $n.Size = New-Object System.Drawing.Size(110, 24)
    $form.Controls.Add($n)
    return $n
}

$formPlanos = New-Object System.Windows.Forms.Form
$formPlanos.Text = "Planos de CAD"
$formPlanos.StartPosition = "CenterScreen"
$formPlanos.FormBorderStyle = "FixedDialog"
$formPlanos.MaximizeBox = $false
$formPlanos.MinimizeBox = $false
$formPlanos.TopMost = $true
$formPlanos.BackColor = $colorFondo
$formPlanos.ClientSize = New-Object System.Drawing.Size(760, 500)

$btnAbrirRef = New-Object System.Windows.Forms.Button
$btnAbrirRef.Text = "Abrir imagen de referencia"
$btnAbrirRef.Location = New-Object System.Drawing.Point(10, 10)
$btnAbrirRef.Size = New-Object System.Drawing.Size(210, 28)
$formPlanos.Controls.Add($btnAbrirRef)

$btnRefDrive = New-Object System.Windows.Forms.Button
$btnRefDrive.Text = "Desde enlace de Drive"
$btnRefDrive.Location = New-Object System.Drawing.Point(230, 10)
$btnRefDrive.Size = New-Object System.Drawing.Size(220, 28)
$formPlanos.Controls.Add($btnRefDrive)

$pbRef = New-Object System.Windows.Forms.PictureBox
$pbRef.Location = New-Object System.Drawing.Point(10, 44)
$pbRef.Size = New-Object System.Drawing.Size(440, 446)
$pbRef.BorderStyle = "FixedSingle"
$pbRef.BackColor = [System.Drawing.Color]::White
$pbRef.SizeMode = "Zoom"
$formPlanos.Controls.Add($pbRef)

$numPAncho = Nuevo-Campo $formPlanos "Ancho (cm)" 14 10 500 80 1
$numPAlto = Nuevo-Campo $formPlanos "Alto (cm)" 52 10 500 72 1
$numPProf = Nuevo-Campo $formPlanos "Profundidad (cm)" 90 10 200 50 1
$numPEsp = Nuevo-Campo $formPlanos "Espesor (cm)" 128 0.3 6 1.8 1
$numPZoc = Nuevo-Campo $formPlanos "Alto de zócalo (cm)" 166 0 60 10 1
$numPCaj = Nuevo-Campo $formPlanos "Cajones" 204 0 6 0 0
$numPPue = Nuevo-Campo $formPlanos "Puertas" 242 0 4 2 0
$numPHCaj = Nuevo-Campo $formPlanos "Alto frente cajón (cm)" 280 5 100 18 1

$btnDibujarPl = New-Object System.Windows.Forms.Button
$btnDibujarPl.Text = "Dibujar planos"
$btnLeerCotas = New-Object System.Windows.Forms.Button
$btnLeerCotas.Text = "Leer cotas de la foto"
$btnLeerCotas.Location = New-Object System.Drawing.Point(470, 318)
$btnLeerCotas.Size = New-Object System.Drawing.Size(270, 36)
$btnLeerCotas.FlatStyle = "Flat"
$btnLeerCotas.BackColor = [System.Drawing.Color]::FromArgb(40, 110, 70)
$btnLeerCotas.ForeColor = [System.Drawing.Color]::White
$btnLeerCotas.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$formPlanos.Controls.Add($btnLeerCotas)

$btnDibujarPl.Location = New-Object System.Drawing.Point(470, 362)
$btnDibujarPl.Size = New-Object System.Drawing.Size(270, 44)
$btnDibujarPl.FlatStyle = "Flat"
$btnDibujarPl.BackColor = $colorAzul
$btnDibujarPl.ForeColor = [System.Drawing.Color]::White
$btnDibujarPl.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$formPlanos.Controls.Add($btnDibujarPl)

$lblPl = New-Object System.Windows.Forms.Label
$lblPl.Location = New-Object System.Drawing.Point(470, 412)
$lblPl.Size = New-Object System.Drawing.Size(270, 84)
$lblPl.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$lblPl.Text = "Abrí la imagen de referencia y tocá ""Leer cotas de la foto"" para completar las medidas (o cargalas a mano), y dibujá. Si no hay cajones, las puertas ocupan todo el frente."
$formPlanos.Controls.Add($lblPl)

$btnAbrirRef.Add_Click({
    $dlg = New-Object System.Windows.Forms.OpenFileDialog
    $dlg.Title = "Imagen de referencia"
    $dlg.Filter = "Imágenes|*.png;*.jpg;*.jpeg;*.bmp;*.tif;*.tiff;*.gif|Todos los archivos|*.*"
    $dd = Carpeta-Drive
    if ($dd) { $dlg.InitialDirectory = $dd }
    if ($dlg.ShowDialog($formPlanos) -ne [System.Windows.Forms.DialogResult]::OK) { return }
    try {
        $tmp = [System.Drawing.Image]::FromFile($dlg.FileName)
        $bmp = New-Object System.Drawing.Bitmap($tmp)
        $tmp.Dispose()
        if ($pbRef.Image -ne $null) { $pbRef.Image.Dispose() }
        $pbRef.Image = $bmp
    } catch { $lblPl.Text = "No se pudo abrir la imagen: " + $_.Exception.Message }
})

$btnRefDrive.Add_Click({
    try {
        $lineas = Pedir-Enlaces $formPlanos
        if (($lineas -eq $null) -or ($lineas.Count -eq 0)) { return }
        $id = Id-Drive $lineas[0]
        if (-not $id) { $lblPl.Text = "Enlace no reconocido: " + $lineas[0]; return }
        $lblPl.Text = "Bajando de Google Drive..."
        [System.Windows.Forms.Application]::DoEvents()
        $ruta = Bajar-De-Drive $id
        $tmp = [System.Drawing.Image]::FromFile($ruta)
        $bmp = New-Object System.Drawing.Bitmap($tmp)
        $tmp.Dispose()
        if ($pbRef.Image -ne $null) { $pbRef.Image.Dispose() }
        $pbRef.Image = $bmp
        $lblPl.Text = "Imagen de referencia cargada desde Drive."
    } catch { $lblPl.Text = "No se pudo bajar la imagen: " + $_.Exception.Message }
})

$btnLeerCotas.Add_Click({
    if ($pbRef.Image -eq $null) { $lblPl.Text = "Primero abrí la imagen de referencia."; return }
    $clave = Clave-Api
    if (-not $clave) {
        $lblPl.Text = "Falta la clave de la API de Claude. Creala en console.anthropic.com y en Git Bash corré: setx ANTHROPIC_API_KEY ""sk-ant-..."" (no hace falta reiniciar)."
        return
    }
    $btnLeerCotas.Enabled = $false
    $formPlanos.Cursor = [System.Windows.Forms.Cursors]::WaitCursor
    $lblPl.Text = "Leyendo las cotas de la foto..."
    [System.Windows.Forms.Application]::DoEvents()
    try {
        $obj = Leer-Cotas-Foto $pbRef.Image $clave
        $campos = @(
            @("ancho", $numPAncho, "Ancho"), @("alto", $numPAlto, "Alto"), @("profundidad", $numPProf, "Prof."),
            @("espesor", $numPEsp, "Espesor"), @("zocalo", $numPZoc, "Zócalo"), @("cajones", $numPCaj, "Cajones"),
            @("puertas", $numPPue, "Puertas"), @("alto_frente_cajon", $numPHCaj, "Frente cajón")
        )
        $cargados = @()
        foreach ($c in $campos) {
            $v = $obj.($c[0])
            if (Poner-Valor $c[1] $v) { $cargados += ($c[2] + " " + $c[1].Value) }
        }
        $lec = ""
        if ($obj.lectura) { $lec = [string]$obj.lectura }
        if ($cargados.Count -gt 0) {
            $lblPl.Text = "Cargué: " + ($cargados -join ", ") + ". " + $lec + " Revisá los valores antes de dibujar."
        } else {
            $lblPl.Text = "No encontré cotas que pueda usar en la foto. " + $lec
        }
        Log-Domus ("Planos: cotas leídas de la foto: " + ($cargados -join "; "))
    } catch {
        Log-Domus ("Planos: falló al leer las cotas de la foto: " + $_.Exception.Message)
        $lblPl.Text = "No se pudo leer la foto: " + $_.Exception.Message
    } finally {
        $formPlanos.Cursor = [System.Windows.Forms.Cursors]::Default
        $btnLeerCotas.Enabled = $true
    }
})

$btnDibujarPl.Add_Click({
    $W = [double]$numPAncho.Value; $A = [double]$numPAlto.Value; $P = [double]$numPProf.Value; $e = [double]$numPEsp.Value
    $z = [double]$numPZoc.Value; $nc = [int]$numPCaj.Value; $np = [int]$numPPue.Value; $hc = [double]$numPHCaj.Value
    $err = Validar-Medidas $W $A $P $e $z $nc $np $hc
    if ($err) { $lblPl.Text = $err; return }
    try { $doc = Obtener-Doc } catch { $lblPl.Text = "No se dibujó nada: " + $_.Exception.Message; return }
    $marca = $false
    try {
        $doc.StartUndoMark()
        $marca = $true
        $vistas = Armar-Vistas $W $A $P $e $z $nc $np $hc
        $n = Dibujar-Vistas $doc $vistas
        Log-Domus ("Planos: planos dibujados " + $W + " x " + $A + " x " + $P + " (" + $n + " objetos)")
        $lblPl.Text = "Listo: frente, lateral y planta dibujados en la capa DOMUS2_PLANO (" + $n + " objetos), a la derecha de lo dibujado. Guardá el dibujo."
    } catch {
        Log-Domus ("Planos: falló al dibujar los planos: " + $_.Exception.Message)
        $lblPl.Text = "No se terminó de dibujar: " + $_.Exception.Message + " (podés deshacer con U)."
    } finally {
        if ($marca) { try { $doc.EndUndoMark() } catch { } }
    }
})

# Muestra y anota cualquier error que ocurra dentro de un botón (si no, PowerShell lo traga y parece que "no hace nada").
function Avisar-Error($donde, $er) {
    $m = $er.Exception.Message
    Log-Domus ("Planos: error en " + $donde + ": " + $m)
    try { [void][System.Windows.Forms.MessageBox]::Show($launcher, ("Error en " + $donde + ":`r`n" + $m), "DOMUS2", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning) } catch { }
}

# Abre otro script de esta carpeta igual que Lanzar.vbs (WScript.Shell, powershell oculto, -STA -NoProfile -ExecutionPolicy Bypass),
# pero mandando los errores a un archivo para poder mostrarlos. Espera unos segundos y devuelve el texto para mostrar.
function Abrir-Script($ruta, $nombre) {
    if ((-not $ruta) -or (-not (Test-Path $ruta))) { return "No encontré " + $nombre + " (" + $ruta + "). Ponelo en la misma carpeta que este archivo." }
    $archErr = Join-Path $env:TEMP "DOMUS2_error.txt"
    try { if (Test-Path $archErr) { Remove-Item $archErr -Force -ErrorAction SilentlyContinue } } catch { }
    $cmd = 'cmd.exe /c powershell.exe -STA -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $ruta + '" 2> "' + $archErr + '"'
    Log-Domus ("Planos: lanzando " + $cmd)
    $sh = New-Object -ComObject WScript.Shell
    [void]$sh.Run($cmd, 0, $false)
    for ($i = 0; $i -lt 10; $i++) {
        Start-Sleep -Milliseconds 250
        [System.Windows.Forms.Application]::DoEvents()
    }
    $txt = ""
    if (Test-Path $archErr) { try { $txt = (Get-Content -Path $archErr -Raw -ErrorAction Stop) } catch { } }
    if ($txt -and $txt.Trim()) {
        if ($txt.Length -gt 400) { $txt = $txt.Substring(0, 400) }
        Log-Domus ("Planos: " + $nombre + " dio error: " + $txt)
        return $nombre + " dio este error: " + $txt.Trim()
    }
    return "Se abrió " + $nombre + "."
}

# Abre otro script. Esta pantalla se queda abierta (no se minimiza); si falló, muestra el motivo en un cuadro de mensaje.
function Abrir-Y-Minimizar($ruta, $nombre) {
    Log-Domus ("Planos: clic en " + $nombre + " (ruta: " + $ruta + ")")
    $lblLauncher.Text = "Abriendo " + $nombre + "..."
    [System.Windows.Forms.Application]::DoEvents()
    $r = Abrir-Script $ruta $nombre
    $lblLauncher.Text = $r
    if ($r -notlike "Se abrió*") {
        [void][System.Windows.Forms.MessageBox]::Show($launcher, $r, "DOMUS2", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
    }
}

$launcher = New-Object System.Windows.Forms.Form
$launcher.Text = "DOMUS2"
$launcher.StartPosition = "CenterScreen"
$launcher.FormBorderStyle = "FixedDialog"
$launcher.MaximizeBox = $false
$launcher.MinimizeBox = $true
$launcher.ShowInTaskbar = $true
$launcher.TopMost = $false
$launcher.BackColor = $colorFondo
$launcher.ClientSize = New-Object System.Drawing.Size(320, 410)

$lblDibujo = New-Object System.Windows.Forms.Label
$lblDibujo.Location = New-Object System.Drawing.Point(10, 10)
$lblDibujo.Size = New-Object System.Drawing.Size(300, 36)
$lblDibujo.Text = Texto-Dibujo
$launcher.Controls.Add($lblDibujo)

$btnDomus = New-Object System.Windows.Forms.Button
$btnDomus.Text = "DOMUS2"
$btnDomus.Location = New-Object System.Drawing.Point(10, 54)
$btnDomus.Size = New-Object System.Drawing.Size(300, 52)
$btnDomus.FlatStyle = "Flat"
$btnDomus.BackColor = $colorAzul
$btnDomus.ForeColor = [System.Drawing.Color]::White
$btnDomus.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$launcher.Controls.Add($btnDomus)

$btnIrDim = New-Object System.Windows.Forms.Button
$btnIrDim.Text = "Dimensiones"
$btnIrDim.Location = New-Object System.Drawing.Point(10, 114)
$btnIrDim.Size = New-Object System.Drawing.Size(300, 52)
$btnIrDim.FlatStyle = "Flat"
$btnIrDim.BackColor = [System.Drawing.Color]::FromArgb(60, 70, 80)
$btnIrDim.ForeColor = [System.Drawing.Color]::White
$btnIrDim.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$launcher.Controls.Add($btnIrDim)

$btnImg = New-Object System.Windows.Forms.Button
$btnImg.Text = "Cargar imágenes"
$btnImg.Location = New-Object System.Drawing.Point(10, 174)
$btnImg.Size = New-Object System.Drawing.Size(300, 52)
$btnImg.FlatStyle = "Flat"
$btnImg.BackColor = [System.Drawing.Color]::FromArgb(90, 90, 90)
$btnImg.ForeColor = [System.Drawing.Color]::White
$btnImg.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$launcher.Controls.Add($btnImg)

$btnDrive = New-Object System.Windows.Forms.Button
$btnDrive.Text = "Imágenes de Google Drive"
$btnDrive.Location = New-Object System.Drawing.Point(10, 234)
$btnDrive.Size = New-Object System.Drawing.Size(300, 52)
$btnDrive.FlatStyle = "Flat"
$btnDrive.BackColor = [System.Drawing.Color]::FromArgb(90, 90, 90)
$btnDrive.ForeColor = [System.Drawing.Color]::White
$btnDrive.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$launcher.Controls.Add($btnDrive)

$btnPlanos = New-Object System.Windows.Forms.Button
$btnPlanos.Text = "Planos de CAD"
$btnPlanos.Location = New-Object System.Drawing.Point(10, 294)
$btnPlanos.Size = New-Object System.Drawing.Size(300, 52)
$btnPlanos.FlatStyle = "Flat"
$btnPlanos.BackColor = [System.Drawing.Color]::FromArgb(40, 110, 70)
$btnPlanos.ForeColor = [System.Drawing.Color]::White
$btnPlanos.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$launcher.Controls.Add($btnPlanos)

$lblLauncher = New-Object System.Windows.Forms.Label
$lblLauncher.Location = New-Object System.Drawing.Point(10, 354)
$lblLauncher.Size = New-Object System.Drawing.Size(300, 48)
$lblLauncher.Text = ""
$launcher.Controls.Add($lblLauncher)

$btnDomus.Add_Click({
    try { Abrir-Y-Minimizar $rutaDomus "ModuloActivo.ps1 (DOMUS2)" } catch { Avisar-Error "el botón DOMUS2" $_ }
})
$btnIrDim.Add_Click({
    try { Abrir-Y-Minimizar $rutaDimensiones "Dimensiones.ps1" } catch { Avisar-Error "el botón Dimensiones" $_ }
})
$btnImg.Add_Click({
    try {
        $lblLauncher.Text = ""
        $r = Cargar-Imagenes $launcher
        if ($r) { $lblLauncher.Text = $r }
        $lblDibujo.Text = Texto-Dibujo
    } catch { Avisar-Error "el botón Cargar imágenes" $_ }
})
$btnDrive.Add_Click({
    try {
        $lblLauncher.Text = ""
        $r = Cargar-Desde-Drive $launcher
        if ($r) { $lblLauncher.Text = $r }
        $lblDibujo.Text = Texto-Dibujo
    } catch { Avisar-Error "el botón Imágenes de Google Drive" $_ }
})
$btnPlanos.Add_Click({
    try {
        [void]$formPlanos.ShowDialog($launcher)
        $lblDibujo.Text = Texto-Dibujo
    } catch { Avisar-Error "el botón Planos de CAD" $_ }
})
$launcher.Add_Activated({ $lblDibujo.Text = Texto-Dibujo })

[void]$launcher.ShowDialog()
