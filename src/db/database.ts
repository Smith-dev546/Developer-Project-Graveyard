import initSqlJs, { Database, SqlValue } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

const STORAGE_KEY = 'cementerio-proyectos:sqlite:v1';
let db: Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  author       TEXT    NOT NULL,
  epitaph      TEXT    NOT NULL DEFAULT '',
  description  TEXT    NOT NULL DEFAULT '',
  cause        TEXT    NOT NULL,
  progress     INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status       TEXT    NOT NULL DEFAULT 'Abandonado' CHECK (status IN ('Abandonado','Resucitado')),
  resurrected_by TEXT,
  flowers      INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS technologies (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE
);
CREATE TABLE IF NOT EXISTS project_technologies (
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  technology_id INTEGER NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, technology_id)
);
`;

const SEED: Array<[string, string, string, string, string, number, string[], number]> = [
  ['Tinder para Mascotas', 'lucia.dev', 'Hizo match con el scope creep', 'App de adopción con deslizamiento de perfiles. El backend nunca pasó del login.', 'Scope creep', 35, ['React Native', 'Firebase', 'Node'], 12],
  ['PixelBank', 'marcos_r', 'Sus transacciones quedaron pendientes', 'Banco ficticio para enseñar finanzas a niños. Se murió la motivación en la pasarela de pagos.', 'Pérdida de motivación', 60, ['Vue', 'Express', 'PostgreSQL'], 8],
  ['Chat-o-Matic', 'ana.codes', 'Murió esperando un websocket', 'Chat en tiempo real con salas temáticas. Un bug de reconexión nunca se resolvió.', 'Bug imposible', 80, ['Socket.io', 'Node', 'Redis'], 21],
  ['Blog en jQuery 4', 'dev_veterano', 'Nació viejo, murió más viejo', 'Reescritura de un blog personal con una librería que ya nadie soportaba.', 'Tecnología obsoleta', 20, ['jQuery', 'PHP', 'MySQL'], 3],
  ['Mapa de Pupusas', 'sv_coder', 'Se quedó sin sal', 'Mapa colaborativo de pupuserías con reseñas. Faltó tiempo después del semestre.', 'Falta de tiempo', 45, ['Leaflet', 'TypeScript', 'SQLite'], 15],
  ['IA Que Escribe Tesis', 'rafa_ml', 'Prometió demasiado', 'Modelo que redactaba tesis completas. La complejidad del entrenamiento lo superó.', 'Complejidad técnica', 15, ['Python', 'PyTorch', 'FastAPI'], 6],
];

export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/** Guarda la base de datos completa (archivo SQLite) en localStorage. */
export function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, bytesToB64(db.export()));
  } catch (e) {
    console.warn('No se pudo guardar en localStorage', e);
  }
}

export async function initDb(): Promise<void> {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const saved = localStorage.getItem(STORAGE_KEY);
  let fresh = !saved;
  try {
    db = saved ? new SQL.Database(b64ToBytes(saved)) : new SQL.Database();
  } catch {
    db = new SQL.Database();
    fresh = true;
  }
  db.run('PRAGMA foreign_keys = ON;');
  db.run(SCHEMA);
  if (fresh) seed();
  persist();
}

function seed(): void {
  transaction(() => {
    for (const [name, author, epitaph, desc, cause, progress, techs, flowers] of SEED) {
      execute(
        'INSERT INTO projects (name, author, epitaph, description, cause, progress, flowers) VALUES (?,?,?,?,?,?,?)',
        [name, author, epitaph, desc, cause, progress, flowers],
      );
      const id = lastId();
      for (const t of techs) linkTech(id, t);
    }
  });
}

export function linkTech(projectId: number, tech: string): void {
  execute('INSERT OR IGNORE INTO technologies (name) VALUES (?)', [tech]);
  execute(
    'INSERT OR IGNORE INTO project_technologies (project_id, technology_id) SELECT ?, id FROM technologies WHERE name = ?',
    [projectId, tech],
  );
}

export function query<T>(sql: string, params: SqlValue[] = []): T[] {
  const st = db.prepare(sql);
  st.bind(params);
  const rows: T[] = [];
  while (st.step()) rows.push(st.getAsObject() as T);
  st.free();
  return rows;
}

export function execute(sql: string, params: SqlValue[] = []): void {
  db.run(sql, params);
}

export function lastId(): number {
  return query<{ id: number }>('SELECT last_insert_rowid() AS id')[0].id;
}

/** Ejecuta varias sentencias de forma atómica y persiste el resultado. */
export function transaction(fn: () => void): void {
  db.run('BEGIN');
  try {
    fn();
    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
  persist();
}
