# ⚰️ El Cementerio de Proyectos Abandonados

Memorial interactivo donde los desarrolladores **entierran** sus ideas a medias, repositorios olvidados o proyectos que nunca llegaron a producción. Cada proyecto se guarda en **SQLite** como una lápida digital con su autopsia técnica: stack usado, causa de muerte y nivel de progreso. Otros usuarios pueden dejar **flores** o **resucitar** (adoptar) la idea para terminarla.

🔗 **Demo:** `https://TU-PROYECTO.vercel.app`

## Funcionalidades

- **CRUD completo**: enterrar (crear), ver lápidas (leer), editar y eliminar proyectos.
- **Relación N:M** entre proyectos y tecnologías (`projects` ↔ `project_technologies` ↔ `technologies`).
- **Filtros** por causa de muerte, estado (Abandonado / Resucitado) y búsqueda de texto.
- **Flores virtuales** y **resurrección** de proyectos con el nombre de quien los adopta.
- **Dashboard en tiempo real** con `COUNT`, `SUM`, `AVG` y `GROUP BY` (causas de muerte y tecnologías más enterradas).
- **Persistencia**: la base de datos SQLite completa se guarda en `localStorage` y sobrevive a recargas.
- Diseño responsive (móvil y escritorio).

## Tecnologías

| Capa | Herramienta |
| --- | --- |
| Lenguaje | TypeScript |
| Bundler | Vite |
| Base de datos | SQLite en el navegador con [sql.js](https://github.com/sql-js/sql.js) (WebAssembly) |
| Persistencia | `localStorage` (archivo SQLite serializado en base64) |
| Despliegue | Vercel (conectado a GitHub) |

> Se eligió sql.js porque Vercel es serverless con sistema de archivos de solo lectura, lo que impide usar SQLite nativo.

## Arquitectura (MVC)

```
src/
├── main.ts                      Punto de entrada
├── db/database.ts               Conexión SQLite, esquema, seed, persistencia
├── models/project.ts            Lógica de datos: CRUD, filtros y estadísticas
├── views/projectView.ts         Plantillas HTML (lápidas y dashboard)
├── controllers/projectController.ts  Eventos y coordinación modelo-vista
└── styles/styles.css            Estilos
```

### Modelo de datos

```
projects (id, name, author, epitaph, description, cause, progress, status,
          resurrected_by, flowers, created_at)
technologies (id, name UNIQUE)
project_technologies (project_id → projects, technology_id → technologies)  -- N:M
```

## Cómo ejecutarlo

```bash
git clone https://github.com/TU-USUARIO/cementerio-de-proyectos-abandonados.git
cd cementerio-de-proyectos-abandonados
npm install
npm run dev        # desarrollo en http://localhost:5173
npm run build      # build de producción en /dist
npm run preview    # previsualizar el build
```

## Despliegue en Vercel

1. Importa el repositorio en [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Vite** (build `npm run build`, salida `dist`).
3. Pulsa **Deploy**. Cada `git push` a `main` redespliega automáticamente.

## Autor

Proyecto creativo para el POE de SQLite + GitHub + Vercel.
