# Guía de Modularización - Bitacorap

## Estructura Actual del Proyecto

```
/workspace/
├── index.html              # Archivo HTML principal (punto de entrada)
├── css/
│   └── styles.css          # Todos los estilos CSS extraídos
├── js/
│   ├── main.js             # Código JavaScript principal (5100+ líneas)
│   ├── ui/                 # Módulo para componentes de interfaz (pendiente)
│   └── utils/              # Funciones utilitarias (pendiente)
├── assets/                 # Recursos estáticos (imágenes, iconos)
├── Bitacorap_v70.html      # Archivo original monolítico (respaldo)
└── README_MODULARIZACION.md # Esta guía
```

## Paso 1: Separación Básica Completada ✅

Hemos separado el código en tres archivos principales:
- **HTML** (`index.html`): 110 KB - Contiene toda la estructura y markup
- **CSS** (`css/styles.css`): 66 KB - Contiene todos los estilos
- **JS** (`js/main.js`): 264 KB - Contiene toda la lógica JavaScript

## Paso 2: Siguiente Nivel de Modularización (Recomendado)

### 2.1 Dividir JavaScript por Funcionalidades

El archivo `main.js` es muy grande (~5100 líneas). Se recomienda dividirlo en módulos:

#### Módulos Sugeridos:

1. **`js/utils/helpers.js`** - Funciones utilitarias generales
   - `getTodayKey()`
   - `escHtml()`
   - `grp()`
   - `isWithdrawn()`
   - Funciones de fecha y formato

2. **`js/utils/storage.js`** - Gestión de datos y localStorage
   - Funciones de guardado/carga
   - Snapshots
   - Backup functions

3. **`js/ui/modals.js`** - Gestión de modales
   - `openModal()`
   - `closeModal()`
   - Renderizado de modales específicos

4. **`js/ui/timer.js`** - Lógica del temporizador
   - Control de tiempo
   - Display
   - Alarmas

5. **`js/ui/ruleta.js`** - Lógica de la ruleta
   - Sorteos
   - Animaciones

6. **`js/ui/tareas.js`** - Gestión de tareas
   - CRUD de tareas
   - Renderizado de lista de tareas

7. **`js/ui/asistencia.js`** - Registro de asistencia
   - Marcado de asistencia
   - Cálculo de estadísticas

8. **`js/ui/grupos.js`** - Gestión de grupos
   - Creación de grupos
   - Asignación de estudiantes

9. **`js/integrations/gdrive.js`** - Integración con Google Drive
   - OAuth
   - Sync de archivos

10. **`js/integrations/google-calendar.js`** - Integración con Calendar

### 2.2 Ejemplo de Cómo Extraer un Módulo

**Paso A:** Identificar funciones relacionadas en `main.js`

**Paso B:** Crear nuevo archivo `js/utils/helpers.js`:
```javascript
// helpers.js - Funciones utilitarias
export function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ... más funciones
```

**Paso C:** En `main.js`, importar el módulo:
```javascript
import { getTodayKey, escHtml } from './utils/helpers.js';
```

**Paso D:** Actualizar `index.html` para usar módulos:
```html
<script type="module" src="js/main.js"></script>
```

## Paso 3: Organizar CSS por Componentes

El archivo `styles.css` también puede dividirse:

```
css/
├── styles.css           # Importa todos los demás (o mantiene lo esencial)
├── variables.css        # Variables CSS (:root)
├── layout.css           # Estructura general, topbar, tabs
├── components/
│   ├── timer.css        # Estilos del temporizador
│   ├── modals.css       # Estilos de modales
│   ├── cards.css        # Tarjetas y paneles
│   ├── buttons.css      # Botones
│   └── forms.css        # Formularios e inputs
└── utilities/
    ├── animations.css   # Keyframes y animaciones
    └── responsive.css   # Media queries
```

## Paso 4: Configurar Build Process (Opcional pero Recomendado)

Para producción, considera usar:

### Opción A: Vite (Recomendado)
```bash
npm create vite@latest . -- --template vanilla
npm install
npm run dev
```

### Opción B: Parcel
```bash
npm install parcel --save-dev
npx parcel index.html
```

### Opción C: Webpack
Configuración más compleja pero mayor control.

## Paso 5: Verificación

Después de cada cambio:
1. Abrir `index.html` en el navegador
2. Probar todas las funcionalidades
3. Verificar consola de errores (F12)
4. Comprobar responsive design

## Comandos Útiles

```bash
# Ver estructura del proyecto
tree -L 3

# Contar líneas de código
wc -l js/*.js css/*.css index.html

# Buscar funciones específicas en main.js
grep -n "function nombreFuncion" js/main.js
```

## Próximos Pasos Inmediatos

1. **Identificar dependencias**: Analizar qué funciones se llaman entre sí
2. **Extraer utilidades primero**: Son las más fáciles de separar
3. **Probar después de cada extracción**: Asegurar que todo sigue funcionando
4. **Documentar exports**: Mantener una lista de funciones exportadas por módulo

## Notas Importantes

- ⚠️ **No eliminar** `Bitacorap_v70.html` hasta tener todo completamente probado
- 📝 Mantener backup después de cada paso significativo
- 🧪 Usar herramientas de desarrollo del navegador para debuggear
- 🔄 Considerar usar Git para versionar cada cambio

