# PEKY LEGEND Club — Firebase Spark + GitHub Pages

## 1. Crear el proyecto, gratis

1. Abre https://console.firebase.google.com/ con tu propia cuenta de Google.
2. `Crear proyecto` → nombre sugerido `peky-legend-club` → elige el plan **Spark (sin costo, sin tarjeta)**. Puedes desactivar Analytics.
3. En **Configuración del proyecto** (rueda dentada) → **Tus apps** → icono `</>` (web) → registra `PEKY LEGEND Web`.
4. El archivo `firebase-config.js` de este paquete ya contiene los datos públicos de tu proyecto `juegos-peky` que compartiste en la captura; comprueba que sean correctos en la consola Firebase. **Son la configuración pública de la app web, NO una contraseña ni clave privada.** Nunca publiques la clave de una cuenta de servicio.

## 2. Activar inicio de sesión y registros

5. Firebase → **Authentication → Sign-in method** → habilita **Google y Correo electrónico / Contraseña**. Deja Teléfono desactivado.
6. Firebase → **Authentication → Settings → Authorized domains**: agrega `TUUSUARIO.github.io` si no aparece (dominio exacto). Si usas dominio propio, agrégalo también.
7. Firebase → **Firestore Database → Crear base de datos**, selecciona edición Standard y modo producción, elige una región apropiada y confirma. No uses modo prueba con permisos amplios.
8. Firestore → pestaña **Rules**: copia todo el contenido de `firestore.rules` y haz clic en `Publicar`. Sin estas reglas los registros online NO deben ponerse en producción.
9. Sube los archivos a un repositorio público de GitHub (incluye `index.html`, `assets/`, `firebase-config.js`, `cloud.js`). En **Settings → Pages → Deploy from a branch → main / root**.
10. Abre la URL de GitHub Pages: arriba debe aparecer `☁ EN LÍNEA` al iniciar sesión. Si queda en Invitado, revisa Firebase config, dominios y consola del navegador.

## 3. Cómo entran los amigos

- Entran al enlace; pueden jugar como invitados sin crear cuenta.
- En `MI JUGADOR` personalizan **apodo, camiseta y número**.
- Pueden pulsar `Continuar con Google`, `Crear cuenta` con correo y contraseña o `Entrar` para recuperar su progreso.
- En `RANKING` ven las mejores puntuaciones de la **misma prueba, dificultad, duración y objetivo**.
- Contraseñas: las maneja Firebase Authentication; ni GitHub ni el HTML reciben tus contraseñas.

## 4. Seguridad, respaldo y costos

- **Spark es gratuito dentro de sus cuotas**: consulta límites actualizados en https://firebase.google.com/pricing . Si agotas la cuota, algunos servicios pueden suspenderse hasta que se renueve; no hay cobro automático mientras permanezcas en Spark.
- `Mi jugador → Descargar respaldo local` guarda JSON del jugador y sus records de ese navegador. **No respalda todas las cuentas Firebase**.
- Para copia global de la base de datos, utiliza el script opcional `tools/backup.mjs` desde una computadora de administrador con Node.js y credenciales de servicio obtenidas de Firebase, **nunca subidas a GitHub**. Se necesitan permisos de propietario del proyecto.
- Los scores se generan en el navegador. Las reglas restringen escritura al propietario y límites de valores, pero **no garantizan antifraude**: un usuario técnico puede manipular su propio marcador. Para rankings competitivos con premios se necesita validación en servidor.
- La música y fotografías incluidas deben tener permisos adecuados antes de publicación pública.

## 5. Backup administrativo opcional

En un computador privado:

```bash
cd tools
npm install
# configura GOOGLE_APPLICATION_CREDENTIALS apuntando a un archivo JSON privado FUERA del repositorio
node backup.mjs
```

Genera una exportación JSON en `backups/` en ese computador. No subir archivos de credenciales.

## Controles

Básquet/triples: A/D mover, mantener X y soltar; slalom: espacio o salto; natación/carrera/ciclismo: mantener X y W/S para carril; rescate: WASD y X para impulso; fútbol: A/D para apuntar y mantener X para patear; voleibol: pulsa X en zona verde.
