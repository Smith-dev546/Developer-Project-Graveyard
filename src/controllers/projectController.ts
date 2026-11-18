import {
  CAUSES, Filters, ProjectInput, addFlower, createProject, deleteProject,
  getProject, getStats, listProjects, resurrect, updateProject,
} from '../models/project';
import { esc, renderGrid, renderStats } from '../views/projectView';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const filters: Filters = { q: '', cause: '', status: '' };
let toastTimer: number | undefined;

function toast(msg: string): void {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 2600);
}

function refresh(): void {
  $('stats').innerHTML = renderStats(getStats());
  const list = listProjects(filters);
  const filtered = !!(filters.q || filters.cause || filters.status);
  $('grid').innerHTML = renderGrid(list, filtered);
  $('count').textContent = `${list.length} ${list.length === 1 ? 'lápida' : 'lápidas'}`;
}

function openForm(id?: number): void {
  const p = id ? getProject(id) : undefined;
  $('form-title').textContent = p ? 'Editar lápida' : 'Enterrar un proyecto';
  $('form-submit').textContent = p ? 'Guardar cambios' : 'Guardar lápida';
  $<HTMLInputElement>('p-id').value = p ? String(p.id) : '';
  $<HTMLInputElement>('p-name').value = p?.name ?? '';
  $<HTMLInputElement>('p-author').value = p?.author ?? '';
  $<HTMLInputElement>('p-epitaph').value = p?.epitaph ?? '';
  $<HTMLTextAreaElement>('p-desc').value = p?.description ?? '';
  $<HTMLSelectElement>('p-cause').value = p?.cause ?? CAUSES[0];
  $<HTMLInputElement>('p-progress').value = String(p?.progress ?? 50);
  $('p-progress-out').textContent = String(p?.progress ?? 50);
  $<HTMLInputElement>('p-techs').value = p?.techs.split(',').join(', ') ?? '';
  $('form-error').hidden = true;
  $<HTMLDialogElement>('dlg-form').showModal();
}

function readForm(): ProjectInput | string {
  const name = $<HTMLInputElement>('p-name').value.trim();
  const author = $<HTMLInputElement>('p-author').value.trim();
  if (!name) return 'Escribe el nombre del proyecto.';
  if (!author) return 'Escribe tu nombre o usuario.';
  const techs = [...new Set($<HTMLInputElement>('p-techs').value.split(',').map((t) => t.trim()).filter(Boolean))].slice(0, 12);
  return {
    name, author,
    epitaph: $<HTMLInputElement>('p-epitaph').value.trim(),
    description: $<HTMLTextAreaElement>('p-desc').value.trim(),
    cause: $<HTMLSelectElement>('p-cause').value,
    progress: Math.min(100, Math.max(0, Number($<HTMLInputElement>('p-progress').value) || 0)),
    techs,
  };
}

function onGridClick(e: Event): void {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
  const card = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
  if (!btn || !card) return;
  const id = Number(card.dataset.id);
  const p = getProject(id);
  if (!p) return;

  switch (btn.dataset.action) {
    case 'flower':
      addFlower(id);
      refresh();
      toast(`Dejaste una flor en ${p.name}.`);
      break;
    case 'resurrect':
      $<HTMLInputElement>('r-id').value = String(id);
      $('res-text').innerHTML = `Vas a adoptar <strong>${esc(p.name)}</strong> para terminarlo. Quedará marcado como Resucitado con tu nombre.`;
      $<HTMLInputElement>('r-name').value = '';
      $<HTMLDialogElement>('dlg-res').showModal();
      break;
    case 'edit':
      openForm(id);
      break;
    case 'delete':
      if (confirm(`¿Eliminar la lápida de "${p.name}"? Esta acción no se puede deshacer.`)) {
        deleteProject(id);
        refresh();
        toast('Lápida eliminada.');
      }
      break;
  }
}

export function start(): void {
  const options = CAUSES.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  $('f-cause').innerHTML = `<option value="">Todas las causas</option>${options}`;
  $('p-cause').innerHTML = options;

  $('btn-new').addEventListener('click', () => openForm());
  $('grid').addEventListener('click', onGridClick);
  $('f-q').addEventListener('input', (e) => { filters.q = (e.target as HTMLInputElement).value; refresh(); });
  $('f-cause').addEventListener('change', (e) => { filters.cause = (e.target as HTMLSelectElement).value; refresh(); });
  $('f-status').addEventListener('change', (e) => { filters.status = (e.target as HTMLSelectElement).value; refresh(); });
  $('p-progress').addEventListener('input', (e) => { $('p-progress-out').textContent = (e.target as HTMLInputElement).value; });

  document.querySelectorAll<HTMLElement>('[data-close]').forEach((b) =>
    b.addEventListener('click', () => $<HTMLDialogElement>(b.dataset.close!).close()),
  );

  $('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = readForm();
    if (typeof data === 'string') {
      const err = $('form-error');
      err.textContent = data;
      err.hidden = false;
      return;
    }
    const id = Number($<HTMLInputElement>('p-id').value);
    if (id) updateProject(id, data); else createProject(data);
    $<HTMLDialogElement>('dlg-form').close();
    refresh();
    toast(id ? 'Lápida actualizada.' : 'Proyecto enterrado. Descanse en paz.');
  });

  $('res-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $<HTMLInputElement>('r-name').value.trim();
    if (!name) return;
    resurrect(Number($<HTMLInputElement>('r-id').value), name);
    $<HTMLDialogElement>('dlg-res').close();
    refresh();
    toast('¡Proyecto resucitado! Ahora termínalo.');
  });

  refresh();
}
