import type { Project, Stats } from '../models/project';

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function renderStats(s: Stats): string {
  const max = Math.max(1, ...s.byCause.map((c) => c.n));
  const causes = s.byCause.length
    ? s.byCause
        .map(
          (c) => `<li><span>${esc(c.cause)}</span><i style="--w:${(c.n / max) * 100}%"></i><b>${c.n}</b></li>`,
        )
        .join('')
    : '<li class="muted">Sin datos todavía</li>';
  const techs = s.topTechs.length
    ? s.topTechs.map((t) => `<li><span>${esc(t.name)}</span><b>${t.n}</b></li>`).join('')
    : '<li class="muted">Sin datos todavía</li>';

  return `
    <div class="kpi"><b>${s.total}</b><span>proyectos enterrados</span></div>
    <div class="kpi"><b>${s.resurrected}</b><span>resucitados</span></div>
    <div class="kpi"><b>${s.flowers}</b><span>flores dejadas</span></div>
    <div class="kpi"><b>${s.avgProgress}%</b><span>progreso promedio</span></div>
    <div class="panel"><h3>Causas de muerte</h3><ul class="bars">${causes}</ul></div>
    <div class="panel"><h3>Tecnologías más enterradas</h3><ul class="rank">${techs}</ul></div>`;
}

function renderCard(p: Project): string {
  const alive = p.status === 'Resucitado';
  const techs = p.techs ? p.techs.split(',').map((t) => `<li>${esc(t)}</li>`).join('') : '';
  const year = p.created_at.slice(0, 10);
  return `
  <article class="tomb ${alive ? 'alive' : ''}" data-id="${p.id}">
    <div class="stone">
      <p class="rip">${alive ? 'Resucitado' : 'Descanse en paz'}</p>
      <h3>${esc(p.name)}</h3>
      ${p.epitaph ? `<p class="epitaph">“${esc(p.epitaph)}”</p>` : ''}
      <p class="meta">Por ${esc(p.author)} · enterrado el ${year}</p>
    </div>
    <div class="autopsy">
      <p><strong>Causa de muerte:</strong> ${esc(p.cause)}</p>
      ${p.description ? `<p>${esc(p.description)}</p>` : ''}
      <div class="progress" role="img" aria-label="Progreso ${p.progress}%"><i style="width:${p.progress}%"></i></div>
      <p class="muted">Llegó al ${p.progress}% antes de morir</p>
      ${techs ? `<ul class="chips">${techs}</ul>` : ''}
      ${alive ? `<p class="adopt">Adoptado por ${esc(p.resurrected_by ?? 'alguien valiente')}</p>` : ''}
    </div>
    <div class="tomb-actions">
      <button class="btn" data-action="flower" aria-label="Dejar una flor en ${esc(p.name)}">Dejar flor (${p.flowers})</button>
      ${alive ? '' : '<button class="btn" data-action="resurrect">Resucitar</button>'}
      <button class="btn ghost" data-action="edit">Editar</button>
      <button class="btn ghost danger" data-action="delete">Eliminar</button>
    </div>
  </article>`;
}

export function renderGrid(list: Project[], filtered: boolean): string {
  if (list.length === 0) {
    return `<p class="empty">${
      filtered
        ? 'Ninguna lápida coincide con estos filtros. Prueba con otra causa o limpia la búsqueda.'
        : 'El cementerio está vacío. Entierra tu primer proyecto con el botón de arriba.'
    }</p>`;
  }
  return list.map(renderCard).join('');
}
