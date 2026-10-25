# Barça para OpenCode V2

Personalización local, no oficial: fondo azul noche, acentos azulgrana y dorados.
Los errores y los diffs conservan colores semánticos distintos.

- Tema: `~/.config/opencode/themes/barca.json` (modo oscuro).
- Inicio: `Visca el Barça`, con dos pequeñas bandas de color.
- Pie del prompt: `FCB · Més que un club`.
- `/barca-toggle`: oculta/muestra los textos, sin cambiar el tema.
- Mini pelota azulgrana con el escudo real del Barça, dibujada con PNG
  antialias y mostrada como imagen SIXEL, no bloques de terminal. Es un diseño
  personalizado, no un balón oficial. Sustituye el indicador mientras trabaja:
  movimiento suave a 10 fps en 6 columnas por 2 filas (la pelota ocupa unos
  24 px). Mantiene `esc interrumpir`. Requiere SIXEL (Windows Terminal 1.25+);
  en terminales sin soporte la imagen puede no mostrarse correctamente. Al
  terminar se restaura el pie y se detiene el temporizador.
  `make-football.ps1` genera los 32 sprites en `assets/football`.
- Marca de agua discreta en el pie: `FK GUTI CREATED`.
- `/barca-motion`: pausa/reanuda la pelota, sin ocultar la firma.
- La decoración no accede a red ni instala dependencias; en reposo, al
  pausarla, ocultarla o descargar el plugin se detiene su temporizador.

## Windows Terminal y fondo

Windows Terminal 1.25.2733.0, distribución portátil oficial de Microsoft:
`%LOCALAPPDATA%\Programs\WindowsTerminal-Barca\WindowsTerminal.exe`.
Su configuración está en `settings\settings.json` junto al ejecutable.
Esta distribución no se actualiza automáticamente y no reemplaza CMD.

El perfil `OpenCode Barca` abre `launch-opencode.cmd` y continúa la última
conversación de OpenCode. Los accesos directos se llaman `OpenCode Barca`.

El fondo `assets/barca-wallpaper.png` es una imagen azul noche de 1920x1080
con el escudo suavizado y precompuesto al 13% de opacidad. Se genera con
`make-wallpaper.ps1`. La opacidad del archivo completo en Terminal es 0.35
para mezclarlo con el fondo acrílico; la atenuación del escudo ya está incluida.

Origen del escudo (marca de FC Barcelona, uso decorativo personal):
https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/500px-FC_Barcelona_%28crest%29.svg.png

El fondo base del tema es `transparent` para no tapar el wallpaper. Los
paneles principales y campos de entrada no tienen relleno; las selecciones
conservan su fondo y los diálogos son opacos para facilitar la lectura.
En otra terminal se verá su propio color de fondo. Para restaurar el fondo
sólido, cambia `base.background.base` en `themes/barca.json` a `#080F20`.

### Aspecto glass

El perfil `OpenCode Barca` tiene `useAcrylic: true` y `opacity: 65`.
Es una aproximación: Windows Terminal desenfoca el escritorio detrás de la
ventana, no el escudo debajo de cada panel. Se ha quitado el relleno de los
paneles en lugar de usar alfa parcial, que no garantiza translucidez visible
en una terminal. ANSI no ofrece cristal con desenfoque independiente por
celda. Windows puede desactivar el acrílico
si se deshabilitan sus efectos de transparencia o se activa ahorro de energía.

Para volver al aspecto previo: `useAcrylic: false`, `opacity: 100` y
`backgroundImageOpacity: 1` en el perfil de Terminal; restaura los colores de
`background.raised` a `#101C34`, `#172744`, `#223758` y usa esos mismos
colores para `background.formfield`. En `@dialog.background.base`, usa
`$background.raised.base`; el borde anterior era `#334A70`.

En `cli.json` Rainbow está activado con `palette: "barca"` y
`scope: "accents"`: anima solo acentos y bordes entre azul y grana, sin
recolorear el texto normal, errores o diffs. No pinta fondos para conservar
el escudo y los paneles transparentes. Sus ajustes se guardan por separado
de la configuración original de Rainbow.

`/rainbow-toggle` pausa/reanuda el efecto de color; `/rainbow-settings`
permite ajustar su velocidad. El reinicio de ajustes respeta el preset Barça.

El tema anterior al cambio era `matrix`. Puedes volver a él desde `/themes`.
Para quitar la decoración, elimina `./extensions/barca-v2` de `plugins` en
`cli.json`. No es necesario borrar los archivos.

Ejecuta `/reload` si la interfaz no recoge los cambios automáticamente.
