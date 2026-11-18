import { execute, lastId, linkTech, persist, query, transaction } from '../db/database';

export const CAUSES = [
  'Falta de tiempo',
  'Pérdida de motivación',
  'Complejidad técnica',
  'Scope creep',
  'Tecnología obsoleta',
  'Bug imposible',
] as const;

export type Status = 'Abandonado' | 'Resucitado';

export interface Project {
  id: number;
  name: string;
  author: string;
  epitaph: string;
  description: string;
  cause: string;
  progress: number;
  status: Status;
  resurrected_by: string | null;
  flowers: number;
  created_at: string;
  techs: string; // lista separada por comas (GROUP_CONCAT)
}

export interface ProjectInput {
  name: string;
  author: string;
  epitaph: string;
  description: string;
  cause: string;
  progress: number;
  techs: string[];
}

export interface Filters {
  q: string;
  cause: string;
  status: string;
}

export interface Stats {
  total: number;
  resurrected: number;
  flowers: number;
  avgProgress: number;
  byCause: Array<{ cause: string; n: number }>;
  topTechs: Array<{ name: string; n: number }>;
}

const SELECT_BASE = `
  SELECT p.*, COALESCE(GROUP_CONCAT(t.name, ','), '') AS techs
  FROM projects p
  LEFT JOIN project_technologies pt ON pt.project_id = p.id
  LEFT JOIN technologies t ON t.id = pt.technology_id`;

/** READ: lista con filtros por causa de muerte, estado y texto. */
export function listProjects(f: Filters): Project[] {
  const like = `%${f.q.trim()}%`;
  return query<Project>(
    `${SELECT_BASE}
     WHERE (? = '' OR p.cause = ?)
       AND (? = '' OR p.status = ?)
       AND (p.name LIKE ? OR p.author LIKE ? OR p.epitaph LIKE ?)
     GROUP BY p.id
     ORDER BY p.created_at DESC, p.id DESC`,
    [f.cause, f.cause, f.status, f.status, like, like, like],
  );
}

export function getProject(id: number): Project | undefined {
  return query<Project>(`${SELECT_BASE} WHERE p.id = ? GROUP BY p.id`, [id])[0];
}

/** CREATE */
export function createProject(d: ProjectInput): number {
  let id = 0;
  transaction(() => {
    execute(
      'INSERT INTO projects (name, author, epitaph, description, cause, progress) VALUES (?,?,?,?,?,?)',
      [d.name, d.author, d.epitaph, d.description, d.cause, d.progress],
    );
    id = lastId();
    d.techs.forEach((t) => linkTech(id, t));
  });
  return id;
}

/** UPDATE */
export function updateProject(id: number, d: ProjectInput): void {
  transaction(() => {
    execute(
      'UPDATE projects SET name=?, author=?, epitaph=?, description=?, cause=?, progress=? WHERE id=?',
      [d.name, d.author, d.epitaph, d.description, d.cause, d.progress, id],
    );
    execute('DELETE FROM project_technologies WHERE project_id = ?', [id]);
    d.techs.forEach((t) => linkTech(id, t));
    execute(
      'DELETE FROM technologies WHERE id NOT IN (SELECT technology_id FROM project_technologies)',
    );
  });
}

/** DELETE (las filas N:M se eliminan en cascada) */
export function deleteProject(id: number): void {
  transaction(() => {
    execute('DELETE FROM projects WHERE id = ?', [id]);
    execute(
      'DELETE FROM technologies WHERE id NOT IN (SELECT technology_id FROM project_technologies)',
    );
  });
}

export function addFlower(id: number): void {
  execute('UPDATE projects SET flowers = flowers + 1 WHERE id = ?', [id]);
  persist();
}

export function resurrect(id: number, by: string): void {
  execute(
    "UPDATE projects SET status = 'Resucitado', resurrected_by = ? WHERE id = ? AND status = 'Abandonado'",
    [by, id],
  );
  persist();
}

/** Dashboard: COUNT, SUM, AVG y GROUP BY. */
export function getStats(): Stats {
  const t = query<{ total: number; resurrected: number; flowers: number; avg: number }>(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(status = 'Resucitado'), 0) AS resurrected,
            COALESCE(SUM(flowers), 0) AS flowers,
            COALESCE(ROUND(AVG(progress)), 0) AS avg
     FROM projects`,
  )[0];
  const byCause = query<{ cause: string; n: number }>(
    'SELECT cause, COUNT(*) AS n FROM projects GROUP BY cause ORDER BY n DESC, cause',
  );
  const topTechs = query<{ name: string; n: number }>(
    `SELECT t.name, COUNT(*) AS n
     FROM technologies t JOIN project_technologies pt ON pt.technology_id = t.id
     GROUP BY t.id ORDER BY n DESC, t.name LIMIT 5`,
  );
  return { total: t.total, resurrected: t.resurrected, flowers: t.flowers, avgProgress: t.avg, byCause, topTechs };
}
