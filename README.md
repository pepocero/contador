# Contadores sin incidentes

Aplicación web ligera para crear y gestionar contadores de tiempo transcurrido desde una fecha y hora. Incluye un reloj visual estilo Flip Clock con animación por unidades y vistas alternativas tipo calculadora digital y Bolder.

## Funcionalidades principales
- Crear múltiples contadores con nombre y fecha/hora de inicio.
- Cálculo preciso del tiempo transcurrido (años, meses, días, horas, minutos, segundos).
- Animación Flip Clock realista y fluida (solo en la vista Flip).
- Vistas alternativas: Calculadora (digital) y Bolder (tipografía personalizada).
- Preferencias de visualización persistentes.
- Instalación como PWA con funcionamiento offline.

## Tecnologías
- HTML, CSS y JavaScript (sin librerías externas pesadas).

## Estructura
- `index.html`: estructura principal.
- `styles.css`: estilos y temas visuales.
- `app.js`: lógica de contadores y animaciones.
- `manifest.json`: metadatos PWA.
- `sw.js`: service worker y caché offline.
- `fonts/`: tipografías locales.
- `icon-*.svg`: íconos de la app.
