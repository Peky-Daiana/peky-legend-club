# PEKY LEGEND CLUB · Firebase conectado

## Estado del proyecto
- Proyecto Firebase: `juegos-peky` (Spark).
- `firebase-config.js` preconfigurado con los datos públicos de la app web mostrados en la consola.
- Acceso con Google (ventana emergente), correo+contraseña y modo invitado.
- 9 deportes, música y fotos del juego anterior sin cambios.
- Firestore: reglas en `firestore.rules`; **compara con las reglas publicadas**.

## Publicar en GitHub Pages
1. Crea un repositorio público, por ejemplo `peky-legend-club`, en la cuenta `rubenpoma13-gif`.
2. Sube los archivos de **esta carpeta** al nivel raíz: `index.html`, `firebase-config.js`, `cloud.js`, `assets/`, etc. La carpeta `assets` debe mantener sus subcarpetas.
3. Repositorio → Settings → Pages → Deploy from a branch → `main` / `(root)` → Save.
4. Abre `https://rubenpoma13-gif.github.io/peky-legend-club/`.
5. En Firebase → Authentication → Settings → Authorized domains confirma `rubenpoma13-gif.github.io`.
6. En el juego pulsa **MI JUGADOR → Continuar con Google**, elige una cuenta y comprueba que aparece `☁ EN LÍNEA`.
7. Cambia apodo, número y color; juega una partida; verifica los documentos en Firestore `players` y `rankings`.
8. Verifica un segundo dispositivo con la misma cuenta.

## Precauciones
- La configuración web en `firebase-config.js` no es una clave privada, pero **nunca subas tokens de administrador ni cuentas de servicio**.
- El archivo `firestore.rules` es para revisión y cambios futuros. Al subirlo a GitHub NO se publica automáticamente en Firebase.
- Los récords del navegador son manipulables: las reglas limitan quién escribe, no garantizan resultados legítimos.
- Google popup puede ser bloqueado por navegadores internos de WhatsApp o TikTok; abre el enlace en Chrome/Edge.
- Se necesita acceso a Internet para la autenticación y el ranking online.
- Prueba el dominio GitHub Pages real: una prueba local no confirma el acceso Google real.
- Para publicar fotos o MP3, asegúrate de tener permiso.

## Respaldo
El botón **Descargar respaldo local** descarga solo datos de ese dispositivo; no todos los usuarios. Para respaldos de Firestore usa el procedimiento administrativo en `README_CONFIGURAR_FIREBASE.md`.
