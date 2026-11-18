import './styles/styles.css';
import { initDb } from './db/database';
import { start } from './controllers/projectController';

initDb()
  .then(start)
  .catch((err) => {
    console.error(err);
    const grid = document.getElementById('grid');
    if (grid) grid.innerHTML = '<p class="empty">No se pudo iniciar la base de datos. Recarga la página.</p>';
  });
