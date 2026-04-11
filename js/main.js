// =========================================
// REGISTRO DE TAREAS — MÓDULO COMPLETO
// =========================================

let tareaFiltroActual = 'todas';
let tareaDetalleId    = null;
let tipoTareaActual   = 'individual';
let numGruposTarea    = 3;

function tareasDelGrupo() {
  const g = grp(); if (!g.tareas) g.tareas = []; return g.tareas;
}

function estadoTarea(t) {
  const hoy = getTodayKey();
  if (t.entregada) return 'entregado';
  if (t.fechaEntrega && t.fechaEntrega < hoy) return 'vencido';
  return 'pendiente';
}

function activeCountT() {
  const g = grp(); return g.students.filter((_, i) => !isWithdrawn(i)).length;
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ---- Abrir modal nueva tarea ---- */
function abrirModalNuevaTarea() {
  tipoTareaActual = 'individual';
  numGruposTarea  = Math.max(2, Math.ceil(activeCountT() / 4));
  document.getElementById('mnt-title').textContent         = '📝 Nueva Tarea';
  document.getElementById('mnt-edit-id').value             = '';
  document.getElementById('mnt-consigna').value            = '';
  document.getElementById('mnt-fecha-asig').value          = currentMasterDate;
  document.getElementById('mnt-fecha-entrega').value       = '';
  document.getElementById('mnt-btn-delete').style.display  = 'none';
  document.getElementById('mnt-num-grupos').textContent    = numGruposTarea;
  _aplicarTipoUI('individual');
  document.getElementById('mnt-grp-builder').innerHTML     = '';
  openModal('mNuevaTarea');
}

function seleccionarTipoTarea(tipo) {
  tipoTareaActual = tipo; _aplicarTipoUI(tipo);
  if (tipo === 'grupal') renderGruposBuilder();
}

function _aplicarTipoUI(tipo) {
  const bInd = document.getElementById('btn-tipo-ind');
  const bGrp = document.getElementById('btn-tipo-grp');
  const zona  = document.getElementById('zona-grupal');
  bInd.className = 'grp-tipo-btn' + (tipo === 'individual' ? ' active-ind' : '');
  bGrp.className = 'grp-tipo-btn' + (tipo === 'grupal'    ? ' active-grp' : '');
  zona.style.display = tipo === 'grupal' ? 'block' : 'none';
}

function cambiarCantGrupos(delta) {
  const max = activeCountT();
  numGruposTarea = Math.min(max, Math.max(2, numGruposTarea + delta));
  document.getElementById('mnt-num-grupos').textContent = numGruposTarea;
  renderGruposBuilder();
}

function renderGruposBuilder(grupos) {
  const wrap = document.getElementById('mnt-grp-builder'); if (!wrap) return;
  const data = grupos || Array.from({ length: numGruposTarea }, (_, i) => ({ nombre: `Grupo ${i + 1}`, integrantes: '' }));
  numGruposTarea = data.length;
  document.getElementById('mnt-num-grupos').textContent = numGruposTarea;
  const CL = ['#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6'];
  wrap.innerHTML = data.map((gd, idx) => {
    const miembros = (gd.integrantes||'').split('\n').map(m=>m.trim()).filter(Boolean);
    const tagsHtml = miembros.length
      ? `<div class="gb-member-tags" id="gb-tags-${idx}">${miembros.map(m=>`<span class="gb-member-tag">${escHtml(m)}<button class="gb-tag-remove" title="Quitar" onclick="gbRemoveStudent(${idx},'${m.replace(/'/g,"\\'")}')" type="button">×</button></span>`).join('')}</div>`
      : `<div class="gb-member-tags" id="gb-tags-${idx}"></div>`;
    return `
    <div class="grp-builder-card">
      <div class="grp-builder-title-row">
        <div class="grp-builder-num" style="background:${CL[idx%CL.length]};">${idx+1}</div>
        <input class="grp-builder-name-inp" id="gb-nombre-${idx}" placeholder="Nombre del grupo" value="${escHtml(gd.nombre||`Grupo ${idx+1}`)}">
      </div>
      <!-- Buscador rápido de estudiantes -->
      <div class="gb-search-wrap" id="gb-swrap-${idx}">
        <span class="gb-search-icon">🔍</span>
        <input class="gb-search-inp" id="gb-search-${idx}" type="text"
          placeholder="Buscar alumno del grado/sección..."
          autocomplete="off"
          oninput="gbSearchStudents(${idx}, this.value)"
          onfocus="gbSearchStudents(${idx}, this.value)"
          onblur="setTimeout(()=>gbHideDropdown(${idx}),180)">
        <div class="gb-search-dropdown" id="gb-drop-${idx}" style="display:none;"></div>
      </div>
      <!-- Tags de integrantes -->
      ${tagsHtml}
      <div class="gb-member-count" id="gb-count-${idx}">${miembros.length} integrante${miembros.length!==1?'s':''}</div>
      <!-- Textarea oculto que guarda los datos reales -->
      <textarea class="grp-builder-members" id="gb-miembros-${idx}" style="display:none;">${escHtml(gd.integrantes||'')}</textarea>
    </div>`;
  }).join('');
}

/* ── Helpers búsqueda rápida en grupo builder ── */

function _gbGetAllStudents() {
  // Devuelve lista de estudiantes del grupo actual (activos)
  const g = grp(); if (!g) return [];
  return g.students
    .map((s, i) => ({ name: s, i }))
    .filter(x => !isWithdrawn(x.i));
}

function _gbGetGroupMembers(idx) {
  const ta = document.getElementById(`gb-miembros-${idx}`);
  if (!ta) return [];
  return ta.value.split('\n').map(m=>m.trim()).filter(Boolean);
}

function _gbGetAllMembers() {
  // Todos los integrantes ya asignados en todos los grupos
  const all = [];
  for (let i = 0; i < numGruposTarea; i++) {
    _gbGetGroupMembers(i).forEach(m => all.push(m));
  }
  return all;
}

function gbSearchStudents(idx, query) {
  const drop = document.getElementById(`gb-drop-${idx}`); if (!drop) return;
  const q = query.trim().toLowerCase();
  const allStudents = _gbGetAllStudents();
  const currentMembers = _gbGetGroupMembers(idx);
  const allAssigned = _gbGetAllMembers();

  let filtered = allStudents;
  if (q) filtered = allStudents.filter(s => s.name.toLowerCase().includes(q));

  if (!filtered.length) {
    drop.innerHTML = `<div class="gb-search-empty">Sin coincidencias</div>`;
    drop.style.display = 'block'; return;
  }
  drop.innerHTML = filtered.map(s => {
    const inThisGroup = currentMembers.includes(s.name);
    const inOther = !inThisGroup && allAssigned.includes(s.name);
    const cls = inThisGroup ? 'ya-en-grupo' : '';
    const label = inThisGroup ? ' ✓' : (inOther ? ' (otro grupo)' : '');
    return `<div class="gb-search-item ${cls}" onmousedown="gbAddStudent(${idx},'${s.name.replace(/'/g,"\\'")}')">`+
      `<span class="gb-si-dot"></span>${escHtml(s.name)}${label}</div>`;
  }).join('');
  drop.style.display = 'block';
}

function gbHideDropdown(idx) {
  const drop = document.getElementById(`gb-drop-${idx}`);
  if (drop) drop.style.display = 'none';
}

function gbAddStudent(idx, name) {
  const ta = document.getElementById(`gb-miembros-${idx}`); if (!ta) return;
  const current = _gbGetGroupMembers(idx);
  if (current.includes(name)) { toast('⚠️ Ya está en este grupo', 'var(--yellow)'); return; }
  current.push(name);
  ta.value = current.join('\n');
  gbRefreshTags(idx);
  // limpiar búsqueda
  const inp = document.getElementById(`gb-search-${idx}`);
  if (inp) inp.value = '';
  gbHideDropdown(idx);
  toast(`✅ ${name} agregado al grupo`, 'var(--accent)');
}

function gbRemoveStudent(idx, name) {
  const ta = document.getElementById(`gb-miembros-${idx}`); if (!ta) return;
  const current = _gbGetGroupMembers(idx).filter(m => m !== name);
  ta.value = current.join('\n');
  gbRefreshTags(idx);
}

function gbRefreshTags(idx) {
  const tagsEl = document.getElementById(`gb-tags-${idx}`);
  const countEl = document.getElementById(`gb-count-${idx}`);
  const members = _gbGetGroupMembers(idx);
  if (tagsEl) {
    tagsEl.innerHTML = members.map(m =>
      `<span class="gb-member-tag">${escHtml(m)}<button class="gb-tag-remove" title="Quitar" onclick="gbRemoveStudent(${idx},'${m.replace(/'/g,"\\'")}')">×</button></span>`
    ).join('');
  }
  if (countEl) countEl.textContent = `${members.length} integrante${members.length!==1?'s':''}`;
}

function autoDistribuirGrupos() {
  const g = grp();
  let activos = g.students.map((s,i)=>({s,i})).filter(x=>!isWithdrawn(x.i)&&!isAbsent(x.i));
  for (let i=activos.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[activos[i],activos[j]]=[activos[j],activos[i]];}
  const grupos = Array.from({length:numGruposTarea},(_,i)=>({nombre:`Grupo ${i+1}`,integrantes:''}));
  activos.forEach((a,i)=>{const g=grupos[i%numGruposTarea];g.integrantes+=(g.integrantes?'\n':'')+a.s;});
  renderGruposBuilder(grupos);
  toast('🔀 Alumnos distribuidos aleatoriamente', 'var(--primary)');
}

function leerGruposDelBuilder() {
  const grupos=[]; for(let i=0;i<numGruposTarea;i++){const ne=document.getElementById(`gb-nombre-${i}`);const me=document.getElementById(`gb-miembros-${i}`);if(!ne)break;grupos.push({nombre:ne.value.trim()||`Grupo ${i+1}`,integrantes:me?me.value.trim():''});}
  return grupos;
}

function guardarTarea() {
  const g=grp();
  const consigna=document.getElementById('mnt-consigna').value.trim();
  const fechaAsig=document.getElementById('mnt-fecha-asig').value;
  const fechaEnt=document.getElementById('mnt-fecha-entrega').value;
  const editId=document.getElementById('mnt-edit-id').value;
  if(!consigna){toast('⚠️ Escribe la consigna de la tarea','var(--red)');return;}
  if(!fechaEnt){toast('⚠️ Indica la fecha de entrega','var(--red)');return;}
  if(fechaEnt<fechaAsig){toast('⚠️ La entrega no puede ser antes de la asignación','var(--red)');return;}
  if(!g.tareas)g.tareas=[];
  let grupos=[];
  if(tipoTareaActual==='grupal'){grupos=leerGruposDelBuilder();if(!grupos.length){toast('⚠️ Agrega al menos un grupo','var(--red)');return;}}
  if(editId){const idx=g.tareas.findIndex(t=>t.id===editId);if(idx>-1)g.tareas[idx]={...g.tareas[idx],consigna,fechaAsig,fechaEntrega:fechaEnt,tipo:tipoTareaActual,grupos};toast('✏️ Tarea actualizada');}
  else{g.tareas.push({id:'tr_'+Date.now(),consigna,fechaAsig,fechaEntrega:fechaEnt,tipo:tipoTareaActual,grupos,entregada:false,fechaCreacion:currentMasterDate});toast('✅ Tarea registrada');}
  save();closeModal('mNuevaTarea');if(tareaDetalleId){tareaDetalleId=null;closeModal('mDetalleTarea');}renderTareas();
}

function eliminarTarea() {
  const editId=document.getElementById('mnt-edit-id').value; if(!editId)return;
  if(!confirm('¿Eliminar esta tarea permanentemente?'))return;
  const g=grp();g.tareas=(g.tareas||[]).filter(t=>t.id!==editId);
  save();closeModal('mNuevaTarea');closeModal('mDetalleTarea');tareaDetalleId=null;renderTareas();toast('🗑 Tarea eliminada','var(--red)');
}

function abrirEditarTarea(id) {
  const g=grp();const t=(g.tareas||[]).find(x=>x.id===id);if(!t)return;
  tipoTareaActual=t.tipo||'individual';
  numGruposTarea=(t.grupos&&t.grupos.length)||Math.max(2,Math.ceil(activeCountT()/4));
  document.getElementById('mnt-title').textContent='✏️ Editar Tarea';
  document.getElementById('mnt-edit-id').value=t.id;
  document.getElementById('mnt-consigna').value=t.consigna||'';
  document.getElementById('mnt-fecha-asig').value=t.fechaAsig||currentMasterDate;
  document.getElementById('mnt-fecha-entrega').value=t.fechaEntrega||'';
  document.getElementById('mnt-btn-delete').style.display='inline-flex';
  document.getElementById('mnt-num-grupos').textContent=numGruposTarea;
  _aplicarTipoUI(tipoTareaActual);
  if(tipoTareaActual==='grupal'&&t.grupos&&t.grupos.length)renderGruposBuilder(t.grupos);
  else document.getElementById('mnt-grp-builder').innerHTML='';
  openModal('mNuevaTarea');
}

function editarTareaDesdeDetalle() {
  if(!tareaDetalleId)return;closeModal('mDetalleTarea');abrirEditarTarea(tareaDetalleId);
}

function toggleEntregada(id) {
  const g=grp();const t=(g.tareas||[]).find(x=>x.id===id);if(!t)return;
  t.entregada=!t.entregada;save();renderTareas();toast(t.entregada?'✅ Marcada como entregada':'⏳ Marcada como pendiente');
}

function verDetalleTarea(id) {
  const g=grp();const t=(g.tareas||[]).find(x=>x.id===id);if(!t)return;
  tareaDetalleId=id;
  const estado=estadoTarea(t);
  const CL=['#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6'];
  const badgeTipo=t.tipo==='grupal'?'<span class="tarea-badge tb-grupal">👥 Grupal</span>':'<span class="tarea-badge tb-individual">👤 Individual</span>';
  const badgeEst=estado==='entregado'?'<span class="tarea-badge tb-entregado">✅ Entregada</span>':estado==='vencido'?'<span class="tarea-badge tb-vencido">🔴 Vencida</span>':'<span class="tarea-badge tb-pendiente">⏳ Pendiente</span>';
  document.getElementById('mdt-titulo').textContent='📝 '+(t.consigna.substring(0,50)+(t.consigna.length>50?'…':''));
  let gruposHtml='';
  if(t.tipo==='grupal'&&t.grupos&&t.grupos.length){
    gruposHtml=`<div style="font-size:0.75rem;font-weight:800;color:var(--accent);text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 8px;">👥 Grupos de trabajo</div><div class="tarea-grupos-wrap">`+
    t.grupos.map((gr,gi)=>{const miembros=(gr.integrantes||'').split('\n').map(m=>m.trim()).filter(Boolean);
      return `<div class="tarea-grupo-card"><div class="tg-nombre"><div style="width:20px;height:20px;border-radius:5px;background:${CL[gi%CL.length]};display:inline-flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:900;color:#fff;">${gi+1}</div> ${escHtml(gr.nombre)}</div>
      <div class="tg-integrantes">${miembros.length?miembros.map(m=>`<div class="tg-integrante">👤 ${escHtml(m)}</div>`).join(''):'<span style="color:var(--muted);font-style:italic;">Sin integrantes</span>'}</div></div>`;
    }).join('')+'</div>';
  }
  document.getElementById('mdt-body').innerHTML=`
    <div class="tarea-meta">${badgeTipo}${badgeEst}
      <span class="tarea-fecha">Asignada: ${formatCustomDate(t.fechaAsig||t.fechaCreacion)}</span>
      <span class="tarea-fecha">Entrega: ${t.fechaEntrega?formatCustomDate(t.fechaEntrega):'—'}</span>
    </div>
    <div class="tarea-consigna">${escHtml(t.consigna)}</div>
    ${gruposHtml}
    <div style="margin-top:16px;text-align:right;">
      <button class="btn btn-sm ${t.entregada?'btn-secondary':'btn-success'}" onclick="toggleEntregada('${t.id}');verDetalleTarea('${t.id}')">
        ${t.entregada?'⏳ Marcar Pendiente':'✅ Marcar Entregada'}</button>
    </div>`;
  openModal('mDetalleTarea');
}

function filtrarTareas(filtro,btn) {
  document.querySelectorAll('.tarea-filter-chip').forEach(c=>c.classList.remove('active'));
  if(btn)btn.classList.add('active');tareaFiltroActual=filtro;renderTareas();
}

function renderTareas() {
  if(gIdx===null)return;
  const g=grp();const list=g.tareas||[];const el=document.getElementById('tareas-lista');if(!el)return;
  const total=list.length,ind=list.filter(t=>t.tipo==='individual').length,grpC=list.filter(t=>t.tipo==='grupal').length;
  const pend=list.filter(t=>estadoTarea(t)==='pendiente').length,done=list.filter(t=>t.entregada).length;
  const setS=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  setS('ts-total',total);setS('ts-ind',ind);setS('ts-grp',grpC);setS('ts-pend',pend);setS('ts-done',done);
  let visible=[...list];
  if(tareaFiltroActual!=='todas')visible=list.filter(t=>tareaFiltroActual==='individual'?t.tipo==='individual':tareaFiltroActual==='grupal'?t.tipo==='grupal':estadoTarea(t)===tareaFiltroActual);
  visible.sort((a,b)=>(b.fechaEntrega||'')>(a.fechaEntrega||'')?1:-1);
  if(!visible.length){el.innerHTML=`<div class="tarea-empty"><div style="font-size:2.8rem;margin-bottom:10px;">📝</div><div style="font-size:0.9rem;font-weight:700;">No hay tareas que coincidan con el filtro.</div><div style="font-size:0.78rem;margin-top:6px;color:var(--muted);">Pulsa «Nueva Tarea» para registrar la primera.</div></div>`;return;}
  const CL=['#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6'];
  el.innerHTML=visible.map(t=>{
    const estado=estadoTarea(t);
    const badgeTipo=t.tipo==='grupal'?'<span class="tarea-badge tb-grupal">👥 Grupal</span>':'<span class="tarea-badge tb-individual">👤 Individual</span>';
    const badgeEst=estado==='entregado'?'<span class="tarea-badge tb-entregado">✅ Entregada</span>':estado==='vencido'?'<span class="tarea-badge tb-vencido">🔴 Vencida</span>':'<span class="tarea-badge tb-pendiente">⏳ Pendiente</span>';
    let gruposPreview='';
    if(t.tipo==='grupal'&&t.grupos&&t.grupos.length){
      const preview=t.grupos.slice(0,3);const resto=t.grupos.length-3;
      gruposPreview=`<div class="tarea-grupos-wrap" style="margin-top:8px;">`+
      preview.map((gr,gi)=>{const miembros=(gr.integrantes||'').split('\n').filter(Boolean);
        return `<div class="tarea-grupo-card"><div class="tg-nombre"><div style="width:18px;height:18px;border-radius:4px;background:${CL[gi%CL.length]};display:inline-flex;align-items:center;justify-content:center;font-size:0.58rem;font-weight:900;color:#fff;">${gi+1}</div> ${escHtml(gr.nombre)}</div>
        <div class="tg-integrantes" style="font-size:0.68rem;">${miembros.slice(0,3).map(m=>`<div class="tg-integrante">👤 ${escHtml(m)}</div>`).join('')}${miembros.length>3?`<div style="color:var(--muted);font-size:0.65rem;">+${miembros.length-3} más</div>`:''}</div></div>`;
      }).join('')+(resto>0?`<div class="tarea-grupo-card" style="align-items:center;justify-content:center;display:flex;flex-direction:column;color:var(--muted);font-size:0.75rem;font-weight:800;min-height:70px;">+${resto} grupo${resto>1?'s':''} más</div>`:'')+`</div>`;
    }
    return `<div class="tarea-card" id="tcard-${t.id}">
      <div class="tarea-card-header"><div class="tarea-titulo">${escHtml(t.consigna.substring(0,120))}${t.consigna.length>120?'…':''}</div></div>
      <div class="tarea-meta">${badgeTipo}${badgeEst}
        <span class="tarea-fecha">📅 Asig: ${t.fechaAsig?formatShortDate(t.fechaAsig):'—'}</span>
        <span class="tarea-fecha">⏰ Entrega: ${t.fechaEntrega?formatShortDate(t.fechaEntrega):'—'}</span>
        ${t.tipo==='grupal'?`<span class="tarea-badge" style="background:rgba(16,185,129,0.1);color:var(--accent);">👥 ${t.grupos?t.grupos.length:0} grupos</span>`:''}
      </div>
      ${gruposPreview}
      <div class="tarea-actions" style="margin-top:10px;">
        <button class="btn btn-secondary btn-sm" onclick="verDetalleTarea('${t.id}')">🔍 Ver detalle</button>
        <button class="btn btn-secondary btn-sm" onclick="abrirEditarTarea('${t.id}')">✏️ Editar</button>
        <button class="btn btn-sm ${t.entregada?'btn-secondary':'btn-success'}" onclick="toggleEntregada('${t.id}')">${t.entregada?'⏳ Desmarcar':'✅ Entregada'}</button>
        <button class="btn btn-danger btn-sm" onclick="confirmarEliminarTarea('${t.id}')">🗑 Eliminar</button>
      </div>
    </div>`;
  }).join('');
}

function confirmarEliminarTarea(id) {
  if(!confirm('¿Eliminar esta tarea permanentemente?'))return;
  const g=grp();g.tareas=(g.tareas||[]).filter(t=>t.id!==id);save();renderTareas();toast('🗑 Tarea eliminada','var(--red)');
}

// =========================================
// DATA, BACKUP & INITS
// =========================================
let D = JSON.parse(localStorage.getItem('pd4') || '{"groups":[]}'); 
if(!D.sala) D.sala = {}; 
if(!D.settings) D.settings = { apiKey: "" }; // NUEVO: Configuración de API
let gIdx = null;
let currentSortTeams = null;
// Bandera de control Drive — declarada aquí para que save() pueda leerla antes de que el módulo Drive cargue
let _gdriveBlocked = false;

// save() base — con espejo automático, UI de backups y sync a Drive
const save = () => {
  localStorage.setItem('pd4', JSON.stringify(D));
  try { localStorage.setItem('pd4_mirror', JSON.stringify(D)); } catch(e){}
  refreshBackupStatusUI();
  // Solo sincronizar con Drive si no hay una operación de control activa
  if (typeof gdriveSyncDebounced === 'function' && !_gdriveBlocked) gdriveSyncDebounced();
};
const grp = () => D.groups[gIdx];
const isWithdrawn = (i) => grp().withdrawn && grp().withdrawn.includes(i);

const C = ['#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#14b8a6','#f97316','#3b82f6','#6366f1'];
const clr = i => C[i % C.length];
const ini = n => n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);

// FECHAS ROBUSTAS (Evita bugs de UTC al usar currentMasterDate)
const getTodayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
let currentMasterDate = getTodayKey();

const todayKey = () => getTodayKey();
const todayStr = () => new Date().toLocaleDateString('es-PE',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
const timeStr = () => new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });

function formatCustomDate(dKey) {
  const [y, m, d] = dKey.split('-');
  return new Date(y, m-1, d).toLocaleDateString('es-PE',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
}

function formatShortDate(dKey) {
  const [y, m, d] = dKey.split('-');
  return new Date(y, m-1, d).toLocaleDateString('es-PE',{weekday:'short', day:'numeric', month:'short'}).toUpperCase();
}

function toast(msg, color='var(--green)') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.background = color; t.style.display = 'block';
  t.style.color = color === 'var(--green)' ? '#000' : '#fff';
  clearTimeout(t._t); t._t = setTimeout(()=>t.style.display='none', 2800);
}
const openModal = id => document.getElementById(id).classList.add('open');
const closeModal = id => document.getElementById(id).classList.remove('open');

// =========================================
// CONFIGURACIÓN (API KEY)
// =========================================
function openSettingsModal() {
  document.getElementById('cfg-api-key').value = D.settings.apiKey || '';
  const clientIdEl = document.getElementById('cfg-gdrive-client-id');
  if (clientIdEl) clientIdEl.value = D.settings.gdriveClientId || '';
  const fileIdEl = document.getElementById('cfg-gdrive-file-id');
  if (fileIdEl) fileIdEl.value = localStorage.getItem('gdrive_file_id') || '';
  openModal('mSettings');
}

function saveSettings() {
  if(!D.settings) D.settings = {};
  D.settings.apiKey = document.getElementById('cfg-api-key').value.trim();
  const clientIdEl = document.getElementById('cfg-gdrive-client-id');
  if (clientIdEl) D.settings.gdriveClientId = clientIdEl.value.trim();
  // Guardar File ID manual en localStorage para que gdriveRestore lo use
  const fileIdEl = document.getElementById('cfg-gdrive-file-id');
  if (fileIdEl && fileIdEl.value.trim()) {
    gdriveFileId = fileIdEl.value.trim();
    localStorage.setItem('gdrive_file_id', gdriveFileId);
  }
  save();
  gdriveRefreshSetupNote();
  toast('✅ Configuración guardada', 'var(--accent)');
  closeModal('mSettings');
}

// === HELPER: VERIFICADOR DE AUSENCIA ===
function isAbsent(i, dKey = currentMasterDate) {
  const g = grp();
  if(!g || !g.attendance || !g.attendance[dKey]) return false; 
  return g.attendance[dKey][i] === 'a';
}

// === BACKUP ROBUSTO — SISTEMA MULTICAPA ===
// Capa 1: localStorage principal (pd4)
// Capa 2: localStorage espejo  (pd4_mirror) — escrito en cada save()
// Capa 3: Snapshots automáticos con timestamps (pd4_snap_0..4) — 5 puntos de restauración
// Capa 4: Exportación manual JSON

const SNAP_COUNT = 5;
const SNAP_INTERVAL_MS = 10 * 60 * 1000; // snapshot cada 10 min
let _lastSnapKey = '';

/* Guarda snapshot rotativo con timestamp */
function pushSnapshot(label = 'auto') {
  try {
    const payload = JSON.stringify({ ts: Date.now(), label, data: D });
    // rotar: leer índice actual
    let idx = parseInt(localStorage.getItem('pd4_snap_idx') || '0');
    localStorage.setItem(`pd4_snap_${idx}`, payload);
    localStorage.setItem('pd4_snap_idx', String((idx + 1) % SNAP_COUNT));
  } catch(e) { console.warn('Snapshot error', e); }
}

/* Inicia el guardado automático periódico */
function startAutoSnapshot() {
  setInterval(() => {
    pushSnapshot('auto');
    refreshBackupStatusUI();
  }, SNAP_INTERVAL_MS);
}

// save() integrado con espejo y UI — definido arriba junto a la inicialización de D

/* Detectar cierre/recarga para disparar snapshot de emergencia */
window.addEventListener('beforeunload', () => {
  pushSnapshot('cierre');
});

/* Recuperar datos al inicio: principal → espejo → snapshot más reciente */
function recoverDataOnLoad() {
  let recovered = null;
  let source = '';

  // Primario
  try {
    const raw = localStorage.getItem('pd4');
    if (raw) { const p = JSON.parse(raw); if (p && p.groups) { recovered = p; source = 'principal'; } }
  } catch(e){}

  // Si el primario falló, intentar espejo
  if (!recovered) {
    try {
      const raw = localStorage.getItem('pd4_mirror');
      if (raw) { const p = JSON.parse(raw); if (p && p.groups) { recovered = p; source = 'espejo'; } }
    } catch(e){}
  }

  // Si aún nada, buscar el snapshot más reciente
  if (!recovered) {
    let bestTs = 0;
    for (let i = 0; i < SNAP_COUNT; i++) {
      try {
        const snap = JSON.parse(localStorage.getItem(`pd4_snap_${i}`) || 'null');
        if (snap && snap.data && snap.data.groups && snap.ts > bestTs) {
          bestTs = snap.ts; recovered = snap.data; source = `snapshot (${new Date(snap.ts).toLocaleTimeString('es-PE')})`;
        }
      } catch(e){}
    }
  }

  if (recovered && source !== 'principal') {
    D = recovered;
    if (!D.sala) D.sala = {};
    if (!D.settings) D.settings = { apiKey: '' };
    localStorage.setItem('pd4', JSON.stringify(D));
    setTimeout(() => toast(`♻️ Datos recuperados desde ${source}`, 'var(--yellow)'), 800);
  }
}

/* Renderiza la lista de snapshots en el panel */
function refreshBackupStatusUI() {
  // Barra de estado
  const dot = document.getElementById('backup-status-dot');
  const txt = document.getElementById('backup-status-text');
  if (!dot || !txt) return;

  const now = new Date();
  const fmt = d => d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  dot.style.background = 'var(--accent)';
  txt.textContent = `Autoguardado activo · ${D.groups.length} grupo(s) · ${fmt(now)}`;

  // Lista de snapshots
  const el = document.getElementById('snapshots-list');
  if (!el) return;
  const snaps = [];
  for (let i = 0; i < SNAP_COUNT; i++) {
    try {
      const snap = JSON.parse(localStorage.getItem(`pd4_snap_${i}`) || 'null');
      if (snap && snap.ts) snaps.push({ ...snap, _i: i });
    } catch(e){}
  }
  snaps.sort((a, b) => b.ts - a.ts);

  if (!snaps.length) {
    el.innerHTML = '<div style="font-size:0.72rem;color:var(--muted);padding:6px 0;">Sin puntos de restauración aún — se crean automáticamente.</div>';
    return;
  }

  el.innerHTML = snaps.map(s => {
    const d = new Date(s.ts);
    const dateStr = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
    const timeStr = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const label = s.label === 'cierre' ? '🔴 Al cerrar' : s.label === 'auto' ? '🔵 Automático' : '⭐ Manual';
    const groups = s.data && s.data.groups ? s.data.groups.length : '?';
    return `<div style="display:flex;align-items:center;gap:8px;background:var(--surface2);border-radius:7px;padding:7px 10px;margin-bottom:5px;border:1px solid var(--border);">
      <div style="flex:1;min-width:0;">
        <div style="font-size:0.72rem;font-weight:800;color:var(--text);">${label} · ${dateStr} ${timeStr}</div>
        <div style="font-size:0.65rem;color:var(--muted);">${groups} grupo(s) guardados</div>
      </div>
      <button onclick="restoreSnapshot(${s._i})" style="background:rgba(14,165,233,0.15);border:1px solid var(--primary);color:var(--primary-light);border-radius:6px;padding:4px 10px;font-size:0.68rem;font-weight:800;cursor:pointer;font-family:'Poppins',sans-serif;white-space:nowrap;">↩ Restaurar</button>
    </div>`;
  }).join('');
}

/* Restaurar un snapshot específico */
function restoreSnapshot(idx) {
  try {
    const snap = JSON.parse(localStorage.getItem(`pd4_snap_${idx}`) || 'null');
    if (!snap || !snap.data || !snap.data.groups) { toast('⚠️ Snapshot inválido', 'var(--red)'); return; }
    const d = new Date(snap.ts);
    const timeStr = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
    if (!confirm(`¿Restaurar al punto del ${dateStr} a las ${timeStr}?\n\nSe reemplazarán los datos actuales.`)) return;
    // Guardar estado actual como snapshot antes de restaurar
    pushSnapshot('pre-restauración');
    D = snap.data;
    if (!D.sala) D.sala = {};
    if (!D.settings) D.settings = { apiKey: '' };
    localStorage.setItem('pd4', JSON.stringify(D));
    localStorage.setItem('pd4_mirror', JSON.stringify(D));
    renderHome();
    refreshBackupStatusUI();
    toast(`♻️ Restaurado al ${dateStr} ${timeStr}`, 'var(--accent)');
  } catch(e) { toast('⚠️ Error al restaurar', 'var(--red)'); }
}

function exportarDatos() {
  pushSnapshot('manual-export');
  const data = localStorage.getItem('pd4') || '{"groups":[]}';
  const blob = new Blob([data], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bitacora_Profe_Backup_${todayKey()}.json`;
  a.click();
  toast('💾 Backup exportado con éxito');
}

function importarDatos(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed && parsed.groups) {
        // Guardar estado actual como snapshot de seguridad antes de importar
        pushSnapshot('pre-importación');
        localStorage.setItem('pd4', JSON.stringify(parsed));
        localStorage.setItem('pd4_mirror', JSON.stringify(parsed));
        D = parsed;
        if (!D.sala) D.sala = {};
        if (!D.settings) D.settings = { apiKey: "" };
        renderHome();
        refreshBackupStatusUI();
        toast('📂 Datos importados correctamente');
      } else {
        toast('⚠️ Archivo inválido', 'var(--red)');
      }
    } catch (err) {
      toast('⚠️ Error al leer el archivo', 'var(--red)');
    }
    document.getElementById('import-file').value = ''; 
  };
  reader.readAsText(file);
}

// =========================================
// NAVEGADOR MASTER FECHAS
// =========================================
function setMasterDate(dKey) {
  if(!dKey) return;
  currentMasterDate = dKey;
  updateMasterDateUI();
  
  if (document.getElementById('sala-view').style.display === 'block') {
    renderSalaPlan();
  } else if (gIdx !== null) {
    renderPortfolio(); 
  } else {
    renderHome();
  }
}

function changeMasterDay(dir) {
  const d = new Date(currentMasterDate + 'T12:00:00');
  d.setDate(d.getDate() + dir);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  setMasterDate(`${y}-${m}-${dd}`);
}

function setMasterDateHoy() {
  setMasterDate(todayKey());
}

function updateMasterDateUI() {
  const isToday = currentMasterDate === todayKey();
  const dateObj = new Date(currentMasterDate + 'T12:00:00');
  const dateStr = dateObj.toLocaleDateString('es-PE', {weekday:'short', day:'2-digit', month:'short'}).toUpperCase();

  const dDisplay = document.getElementById('master-date-display');
  const dPicker = document.getElementById('master-date-picker');
  const btnHoy = document.getElementById('btn-master-hoy');
  if(dDisplay) {
    dDisplay.textContent = dateStr; dPicker.value = currentMasterDate; btnHoy.style.display = isToday ? 'none' : 'inline-flex';
  }

  const hDisplay = document.getElementById('home-date-display');
  const hPicker = document.getElementById('home-date-picker');
  const hBtnHoy = document.getElementById('btn-home-hoy');
  if(hDisplay) {
    hDisplay.textContent = dateStr; hPicker.value = currentMasterDate; hBtnHoy.style.display = isToday ? 'none' : 'inline-flex';
  }

  const sDisplay = document.getElementById('sala-date-display');
  const sPicker = document.getElementById('sala-date-picker');
  const sBtnHoy = document.getElementById('btn-sala-hoy');
  if(sDisplay) {
    sDisplay.textContent = dateStr; sPicker.value = currentMasterDate; sBtnHoy.style.display = isToday ? 'none' : 'inline-flex';
  }
}

// HOME DASHBOARD REDESIGNED
function renderHome() {
  const groupsCountEl = document.getElementById('home-groups-count');
  if (groupsCountEl) groupsCountEl.textContent = D.groups.length;

  const jsDay = new Date(currentMasterDate + 'T12:00:00').getDay();
  let classesTodayCount = 0;
  let eventsTodayCount = (D.sala && D.sala[currentMasterDate]) ? D.sala[currentMasterDate].length : 0;

  const el = document.getElementById('home-list');
  
  if(!D.groups.length) {
    el.innerHTML = `<div class="empty" style="grid-column: 1 / -1; background:var(--surface); border-radius:var(--radius); border:1px dashed var(--border); padding:50px;"><div class="empty-icon">👨‍🏫</div><div class="empty-msg">Aún no tienes grupos.<br>¡Crea tu primer grupo para comenzar!</div></div>`;
  } else {
    el.innerHTML = D.groups.map((g,i) => {
      const hasClassToday = (g.classDays || []).includes(jsDay);
      if (hasClassToday) classesTodayCount++;
      const activeClass = hasClassToday ? 'has-class' : '';
      const activeCount = g.students.length - (g.withdrawn?.length || 0);

      return `
      <div class="gc ${activeClass}" draggable="true" data-index="${i}"
           ondragstart="handleDragStart(event, ${i})" ondragover="handleDragOver(event)"
           ondragenter="handleDragEnter(event)" ondragleave="handleDragLeave(event)"
           ondrop="handleDrop(event, ${i})" ondragend="handleDragEnd(event)"
           onclick="openGroup(${i})">

        <!-- Menú 3 puntos -->
        <button class="gc-menu-btn" title="Opciones del grupo"
          onclick="event.stopPropagation(); toggleGcMenu(${i})">⋯</button>
        <div class="gc-dropdown" id="gc-dd-${i}">
          <button class="gc-dd-item" onclick="event.stopPropagation(); closeAllGcMenus(); openEditNameFromHome(${i})">✏️ Editar Grupo</button>
          <button class="gc-dd-item" onclick="event.stopPropagation(); closeAllGcMenus(); openManageFromHome(${i})">👥 Gestionar Alumnos</button>
        </div>

        <div class="gc-icon-wrap">👥</div>
        <div class="gc-name" title="${g.name}">${g.name}</div>
        <div class="gc-meta">${g.grade||''} ${g.section?'· Sec. '+g.section:''}</div>
        <div class="gc-students"><span style="color:${hasClassToday ? 'var(--green)' : 'var(--primary)'};">●</span> ${activeCount} alumnos activos</div>
      </div>
    `}).join('');
  }

  const classesEl = document.getElementById('home-classes-today');
  if (classesEl) classesEl.textContent = classesTodayCount;
  const eventsEl = document.getElementById('home-events-today');
  if (eventsEl) eventsEl.textContent = eventsTodayCount;
}

let draggedGroupIdx = null;
function handleDragStart(e, i) { draggedGroupIdx = i; e.dataTransfer.effectAllowed = 'move'; setTimeout(() => e.target.classList.add('dragging'), 0); }
function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; return false; }
function handleDragEnter(e) { e.preventDefault(); const t = e.target.closest('.gc'); if (t && t.dataset.index != draggedGroupIdx) t.classList.add('drag-over'); }
function handleDragLeave(e) { const t = e.target.closest('.gc'); if (t) t.classList.remove('drag-over'); }
function handleDrop(e, targetIdx) {
  e.stopPropagation(); const t = e.target.closest('.gc'); if (t) t.classList.remove('drag-over');
  if (draggedGroupIdx !== null && draggedGroupIdx !== targetIdx) {
    const draggedItem = D.groups.splice(draggedGroupIdx, 1)[0];
    D.groups.splice(targetIdx, 0, draggedItem);
    save(); renderHome();
  }
  return false;
}
function handleDragEnd(e) { e.target.classList.remove('dragging'); document.querySelectorAll('.gc').forEach(el => el.classList.remove('drag-over')); draggedGroupIdx = null; }

// ── Menú 3 puntos en boxes del home ──
function toggleGcMenu(i) {
  const dd = document.getElementById('gc-dd-' + i);
  if (!dd) return;
  const wasOpen = dd.classList.contains('open');
  closeAllGcMenus();
  if (!wasOpen) dd.classList.add('open');
}
function closeAllGcMenus() {
  document.querySelectorAll('.gc-dropdown').forEach(d => d.classList.remove('open'));
}
// Cerrar al hacer clic fuera
document.addEventListener('click', function(e) {
  if (!e.target.closest('.gc-menu-btn') && !e.target.closest('.gc-dropdown')) closeAllGcMenus();
});

function openEditNameFromHome(i) {
  // Carga los datos del grupo sin entrar al portfolio
  const g = D.groups[i];
  document.getElementById('edit-name').value = g.name;
  document.querySelectorAll('.eg-day').forEach(cb => {
    cb.checked = (g.classDays || []).includes(parseInt(cb.value));
  });
  // Guardamos el índice en un hidden para que saveName sepa a quién editar
  document.getElementById('edit-group-hidden-idx').value = i;
  openModal('mEditName');
}

function openManageFromHome(i) {
  if (i === undefined || i === null || !D.groups[i]) return;
  // Abre gestión de alumnos sin entrar al portfolio
  gIdx = i;
  openManage();
  // Al cerrar el modal, resetear gIdx si no estamos en el portfolio
  const modal = document.getElementById('mManage');
  if (modal) modal.dataset.fromHome = '1';
}

function openGroup(i) {
  gIdx = i;
  document.getElementById('home').style.display = 'none';
  document.getElementById('sala-view').style.display = 'none';
  document.getElementById('ai-view').style.display = 'none';
  const misEst = document.getElementById('mis-estudiantes-view');
  if (misEst) misEst.style.display = 'none';
  document.getElementById('portfolio').style.display = 'block';
  
  const g = grp();
  if(!g.classDays) { g.classDays = [1,2,3,4,5]; save(); }
  if(!g.withdrawn) { g.withdrawn = []; save(); }
  if(!g.emotions) { g.emotions = {}; save(); }

  // Limpiar secciones que NO se renderizan en renderPortfolio()
  // para que nunca muestren datos de otro grupo
  const flush = (id) => { const el = document.getElementById(id); if(el) el.innerHTML = ''; };
  flush('tareas-lista');
  flush('anec-list-todas');
  flush('anec-list-alumno');
  flush('anec-list-tutoria');
  flush('anec-stat-row');

  updateMasterDateUI(); renderPortfolio(); showTab('asistencia'); 
}

function goHome() {
  document.getElementById('home').style.display = 'block';
  document.getElementById('portfolio').style.display = 'none';
  document.getElementById('sala-view').style.display = 'none';
  document.getElementById('ai-view').style.display = 'none';
  const misEst = document.getElementById('mis-estudiantes-view');
  if (misEst) misEst.style.display = 'none';
  const reunionV = document.getElementById('reunion-padres-view');
  if (reunionV) reunionV.style.display = 'none';
  const reunionD = document.getElementById('reunion-detalle-view');
  if (reunionD) reunionD.style.display = 'none';
  reunionDetalleId = null;
  gIdx = null; renderHome();
}

// =========================================
// SALA DE DOCENTE (AGENDA GLOBAL)
// =========================================
function openSala() {
  document.getElementById('home').style.display = 'none';
  document.getElementById('portfolio').style.display = 'none';
  document.getElementById('ai-view').style.display = 'none';
  document.getElementById('sala-view').style.display = 'block';
  gIdx = null; updateMasterDateUI(); renderSalaPlan();
}

function renderSalaPlan() {
  if (!D.sala) D.sala = {};
  const weekStart = getWeekStart(currentMasterDate);
  const COL_TO_JSDAY = [1,2,3,4,5];
  
  const weekDates = COL_TO_JSDAY.map((jsDay, colIdx) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + colIdx);
    return d;
  });

  const todayStr = todayKey();
  const grid = document.getElementById('sala-grid');
  grid.innerHTML = '';

  weekDates.forEach((d, colIdx) => {
    const jsDay = d.getDay();
    const dk = formatDateKey(d);
    const isToday = dk === todayStr;

    const col = document.createElement('div');
    col.className = 'pb-day-col';

    const header = document.createElement('div');
    header.className = `pb-day-header ${isToday ? 'today' : ''}`;
    header.innerHTML = `${DAY_NAMES_SHORT[jsDay]} ${d.getDate()} <span style="display:block; font-size:0.6rem; opacity:0.6;">${d.toLocaleDateString('es-PE',{month:'short'})}</span>`;
    col.appendChild(header);

    const events = D.sala[dk] || [];
    const box = document.createElement('div');
    box.id = `sala-box-${dk}`;

    if(events.length > 0) {
      box.className = 'pb-class-box';
      box.style.borderColor = 'var(--yellow)';
      box.style.boxShadow = '0 4px 15px rgba(245,158,11,0.2)';
      box.style.cursor = 'default';
      const typeIcons = {colegiado:'🏫', padres:'👨‍👩‍👧', admin:'📋', capacitacion:'🎓'};
      const typeNames = {colegiado:'Colegiado', padres:'Padres', admin:'Admin', capacitacion:'Capacit.'};
      let html = `<div class="pb-course-name" style="color:var(--yellow); font-size:0.8rem; cursor:pointer;" onclick="openSalaModal('${dk}')">📅 ${events.length} Evento${events.length>1?'s':''} <span style="font-size:0.65rem; opacity:0.7; font-weight:600;">(ver / editar)</span></div>`;
      html += `<div style="display:flex; flex-direction:column; gap:6px; flex:1;">`;
      events.forEach(ev => {
        const tagClass = 'st-' + ev.type;
        html += `<div style="font-size:0.75rem; background:var(--surface2); padding:7px 8px; border-radius:8px; border-left:3px solid var(--yellow); word-break:break-word;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px; gap:4px; flex-wrap:wrap;">
            <span style="font-weight:900; font-family:'Roboto Mono',monospace; color:var(--yellow); font-size:0.78rem;">${ev.time || 'Todo el día'}</span>
            <span class="sala-tag ${tagClass}" style="font-size:0.55rem; padding:2px 5px;">${typeIcons[ev.type]} ${typeNames[ev.type]}</span>
          </div>
          <div style="color:var(--text); line-height:1.35; font-size:0.78rem;">${ev.desc}</div>
          ${ev.link ? `<a href="${ev.link.startsWith('http') ? ev.link : 'https://'+ev.link}" target="_blank" style="display:inline-block; margin-top:4px; font-size:0.68rem; color:var(--primary-light); text-decoration:none; font-weight:800;">🔗 Unirse</a>` : ''}
        </div>`;
      });
      html += `</div>`;
      box.innerHTML = html;
    } else {
      box.className = 'pb-class-box is-empty';
      box.style.cursor = 'pointer';
      box.innerHTML = `
        <div class="pb-course-name" style="opacity:0.5; color:var(--yellow);">Libre</div>
        <div style="flex:1; display:flex; align-items:center; justify-content:center; color:var(--yellow); font-size:0.75rem; font-weight:800; text-transform:uppercase;">
          + Agendar Evento
        </div>
      `;
      box.onclick = () => openSalaModal(dk);
    }

    col.appendChild(box);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-sm';
    addBtn.style.cssText = 'width:100%; justify-content:center; margin-top:6px; background:rgba(245,158,11,0.12); color:var(--yellow); border:1.5px dashed rgba(245,158,11,0.5); font-size:0.72rem; font-weight:800; padding:7px; border-radius:8px; cursor:pointer; transition: background 0.15s, border-color 0.15s;';
    addBtn.innerHTML = '＋ Agregar evento';
    addBtn.onmouseover = () => { addBtn.style.background = 'rgba(245,158,11,0.22)'; addBtn.style.borderColor = 'var(--yellow)'; };
    addBtn.onmouseout  = () => { addBtn.style.background = 'rgba(245,158,11,0.12)'; addBtn.style.borderColor = 'rgba(245,158,11,0.5)'; };
    addBtn.onclick = () => openSalaModal(dk);
    col.appendChild(addBtn);

    grid.appendChild(col);
  });
}

let editingSalaKey = null;
let tempSalaEvents = [];

function openSalaModal(dateKey) {
  if (!D.sala) D.sala = {};
  editingSalaKey = dateKey;
  tempSalaEvents = JSON.parse(JSON.stringify(D.sala[dateKey] || []));

  const d = new Date(dateKey + 'T12:00:00');
  document.getElementById('sm-sala-badge').innerHTML = 
    `📅 ${DAY_NAMES_FULL[d.getDay()]} ${d.getDate()} de ${d.toLocaleDateString('es-PE',{month:'long'})}`;

  document.getElementById('sm-btn-del-sala').style.display = tempSalaEvents.length ? 'inline-flex' : 'none';
  
  document.getElementById('se-time').value = '';
  document.getElementById('se-desc').value = '';
  document.getElementById('se-link').value = '';
  document.getElementById('se-type').selectedIndex = 0;
  if(document.getElementById('se-edit-idx')) document.getElementById('se-edit-idx').value = '-1';
  if(document.getElementById('sala-form-cancel-edit')) document.getElementById('sala-form-cancel-edit').style.display = 'none';
  if(document.getElementById('sala-add-btn')) { 
    document.getElementById('sala-add-btn').textContent = '➕ Agregar a la agenda'; 
    document.getElementById('sala-add-btn').style.background = '';
  }
  if(document.getElementById('sala-form-title')) {
    document.getElementById('sala-form-title').textContent = '➕ Nuevo Evento / Reunión';
    document.getElementById('sala-form-title').style.color = 'var(--yellow)';
  }
  if(document.getElementById('sala-form-container')) document.getElementById('sala-form-container').style.borderColor = 'var(--yellow)';

  renderSalaEventList(); openModal('mSalaDay');
}

function renderSalaEventList() {
  const el = document.getElementById('sala-event-list');
  if(!tempSalaEvents.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:0.78rem;padding:14px 12px;text-align:center;background:var(--surface2);border-radius:8px;border:1px dashed var(--border);">📭 Sin eventos agendados para este día.<br><span style="font-size:0.7rem;opacity:0.7;">Usa el formulario de abajo para agregar uno.</span></div>`;
    return;
  }

  const typeNames = {colegiado:'Reunión de Colegiado', padres:'Atención a Padres', admin:'Trámite / Administrativo', capacitacion:'Capacitación'};
  const typeIcons = {colegiado:'🏫', padres:'👨‍👩‍👧', admin:'📋', capacitacion:'🎓'};
  
  el.innerHTML = tempSalaEvents.sort((a,b) => (a.time||'24:00').localeCompare(b.time||'24:00')).map((ev, i) => `
    <div class="sala-event-item" style="position:relative; padding-bottom: 10px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; flex:1;">
          <span style="font-weight:900; font-family:'Roboto Mono', monospace; color:var(--yellow); font-size:0.95rem;">${ev.time || '--:--'}</span>
          <span class="sala-tag st-${ev.type}">${typeIcons[ev.type]} ${typeNames[ev.type]}</span>
        </div>
        <div style="display:flex; gap:5px; flex-shrink:0;">
          <button onclick="editSalaEvent(${i})" style="background:var(--surface3); border:1px solid var(--border); border-radius:6px; cursor:pointer; padding:3px 8px; font-size:0.72rem; color:var(--primary-light); font-weight:800; font-family:'Poppins',sans-serif;">✏️</button>
          <button class="btn-danger btn-xs" style="border:none; cursor:pointer; padding:3px 8px; border-radius:6px; background:var(--red); color:#fff; font-weight:800;" onclick="removeSalaEvent(${i})">✕</button>
        </div>
      </div>
      <div style="font-size:0.85rem; margin-top:6px; line-height:1.4; word-break:break-word;">${ev.desc}</div>
      ${ev.link ? `<div style="font-size:0.75rem; margin-top:5px; word-break:break-all;"><a href="${ev.link.startsWith('http') ? ev.link : 'https://'+ev.link}" target="_blank" style="display:inline-block; margin-top:4px; font-size:0.68rem; color:var(--primary-light); text-decoration:none; font-weight:800;">🔗 Unirse a reunión</a></div>` : ''}
    </div>
  `).join('');

  document.getElementById('sm-btn-del-sala').style.display = 'inline-flex';
}

function editSalaEvent(i) {
  const ev = tempSalaEvents[i];
  document.getElementById('se-time').value = ev.time || '';
  document.getElementById('se-type').value = ev.type || 'colegiado';
  document.getElementById('se-desc').value = ev.desc || '';
  document.getElementById('se-link').value = ev.link || '';
  document.getElementById('se-edit-idx').value = i;

  document.getElementById('sala-form-title').textContent = '✏️ Editando evento';
  document.getElementById('sala-form-title').style.color = 'var(--primary-light)';
  document.getElementById('sala-form-container').style.borderColor = 'var(--primary)';
  document.getElementById('sala-form-cancel-edit').style.display = 'inline-block';
  document.getElementById('sala-add-btn').textContent = '💾 Guardar cambios';
  document.getElementById('sala-add-btn').style.background = 'var(--primary)';
  
  const ta = document.getElementById('se-desc');
  ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px';
  document.getElementById('sala-form-container').scrollIntoView({behavior:'smooth', block:'nearest'});
}

function cancelSalaEdit() {
  document.getElementById('se-time').value = ''; document.getElementById('se-desc').value = '';
  document.getElementById('se-link').value = ''; document.getElementById('se-type').selectedIndex = 0;
  document.getElementById('se-edit-idx').value = '-1';
  document.getElementById('sala-form-title').textContent = '➕ Nuevo Evento / Reunión';
  document.getElementById('sala-form-title').style.color = 'var(--yellow)';
  document.getElementById('sala-form-container').style.borderColor = 'var(--yellow)';
  document.getElementById('sala-form-cancel-edit').style.display = 'none';
  document.getElementById('sala-add-btn').textContent = '➕ Agregar a la agenda';
  document.getElementById('sala-add-btn').style.background = '';
}

function addSalaEvent() {
  const time = document.getElementById('se-time').value; const type = document.getElementById('se-type').value;
  const desc = document.getElementById('se-desc').value.trim(); const link = document.getElementById('se-link').value.trim();
  const editIdx = parseInt(document.getElementById('se-edit-idx').value);

  if(!desc) { toast('⚠️ Ingresa una descripción para el evento', 'var(--red)'); return; }

  if(editIdx >= 0) {
    tempSalaEvents[editIdx] = { time, type, desc, link }; toast('✏️ Evento actualizado');
  } else {
    tempSalaEvents.push({ time, type, desc, link }); toast('✅ Evento agregado');
  }
  
  cancelSalaEdit(); renderSalaEventList();
}

function removeSalaEvent(i) { tempSalaEvents.splice(i, 1); renderSalaEventList(); }

function saveSalaDay() {
  if(!D.sala) D.sala = {};
  const editIdx = parseInt(document.getElementById('se-edit-idx').value);
  const pendingDesc = document.getElementById('se-desc').value.trim();
  if(pendingDesc && editIdx < 0) {
    if(!confirm('Hay una descripción sin agregar al formulario. ¿Guardar la agenda sin ese evento?')) return;
  }

  if(tempSalaEvents.length === 0) { delete D.sala[editingSalaKey]; } else { D.sala[editingSalaKey] = [...tempSalaEvents]; }
  save(); renderSalaPlan(); closeSalaModal(); toast('✅ Agenda guardada');
}

function deleteSalaDay() {
  if(!confirm('¿Borrar todos los eventos de este día?')) return;
  if (D.sala) delete D.sala[editingSalaKey];
  save(); renderSalaPlan(); closeSalaModal(); toast('🗑 Eventos eliminados', 'var(--red)');
}

function closeSalaModal() { editingSalaKey = null; tempSalaEvents = []; closeModal('mSalaDay'); }

// =========================================
// ASISTENTE DE IA GEMINI
// =========================================
let aiPdfBase64 = null;

// =========================================
// BASE DE DATOS PEDAGÓGICA (CNEB COMPLETO - I.E. 24 DE JUNIO)
// =========================================
const CONTEXTO_LOCAL = {
  IE: "24 de Junio - Huayobamba, San Marcos, Cajamarca",
  PROBLEMAS_CLAVE: "Baja autoestima, timidez extrema, hogares disfuncionales, escaso respeto a normas, nivel inicial de pensamiento crítico.",
  POTENCIALIDADES: "Disposición a dinámicas colaborativas guiadas, fuerte arraigo a tradiciones locales.",
  REALIDAD_SOCIOECONOMICA: "Actividad agrícola y ganadera, microempresas (embotelladoras, ladrilleras), festividades (Patrón San Juan Bautista, Unshas, Cruces).",
  REALIDAD_AMBIENTAL: "Contaminación de quebradas, uso de agroquímicos en cultivos locales.",
  OBJETIVO_PEDAGOGICO: "Generar espacios de confianza para la participación y fortalecer la argumentación basada en hechos reales del entorno."
};

const CAMPOS_TEMATICOS_DPCC = `
  Capítulo 1: Identidad, adolescencia y emociones (Mi historia personal y autoestima, influencia de grupos, educando emociones).
  Capítulo 2: Empatía y manejo de conflictos (afrontar diversas situaciones, enfrentar conflictos, compañeros sin violencia).
  Capítulo 3: Sexualidad y género (iguales pero diferentes, vínculos y relaciones sanas, no dejarse engañar).
  Capítulo 4: Identidad, cultura y relaciones interculturales (historias personales y culturas, país de muchas lenguas, música para convivir).
  Capítulo 5: Reflexión ética, derechos humanos y convivencia (ser justos, ampliación de derechos, identificar autoritarismo).
  Capítulo 6: Democracia, Estado y participación ciudadana (responsabilidades, somos parte del Estado, participación adolescente).
`;

const MARCO_CURRICULAR = {
  ENFOQUES_TRANSVERSALES: `
    1. Enfoque de Derechos (Valores: Conciencia de derechos, Libertad y responsabilidad, Diálogo y concertación).
    2. Enfoque Inclusivo o de Atención a la diversidad (Valores: Respeto por las diferencias, Equidad en la enseñanza, Confianza en la persona).
    3. Enfoque Intercultural (Valores: Respeto a la identidad cultural, Justicia, Diálogo intercultural).
    4. Enfoque Igualdad de Género (Valores: Igualdad y Dignidad, Justicia, Empatía).
    5. Enfoque Ambiental (Valores: Solidaridad planetaria y equidad intergeneracional, Justicia y solidaridad, Respeto a toda forma de vida).
    6. Enfoque Orientación al Bien Común (Valores: Equidad y justicia, Solidaridad, Empatía, Responsabilidad).
    7. Enfoque Búsqueda de la Excelencia (Valores: Flexibilidad y superación personal).
  `,
  COMPETENCIAS_TRANSVERSALES: `
    - TIC: Se desenvuelve en entornos virtuales. (Personaliza, Gestiona, Interactúa, Crea).
    - AUTONOMÍA: Gestiona su aprendizaje de manera autónoma. (Define metas, Organiza acciones, Monitorea).
  `,
  COMPETENCIAS_TRANSVERSALES_VI: `
    - TIC: Se desenvuelve en entornos virtuales. (Capacidades: Personaliza, Gestiona, Interactúa, Crea). 
      Desempeños clave (2°): Organiza aplicaciones, contrasta información de diversas fuentes, elabora videos/animaciones, resuelve problemas con programación.
    - AUTONOMÍA: Gestiona su aprendizaje de manera autónoma. (Capacidades: Define metas, Organiza acciones, Monitorea). 
      Desempeños clave (2°): Determina metas viables, organiza estrategias por prioridad, revisa avances considerando a sus pares, explica sus resultados y recursos movilizados.
  `,
  // ── DPCC por grado ──────────────────────────────────────────────────────────
  DPCC_CICLO_VI: `
    COMPETENCIA 1: Construye su identidad.
    CAPACIDADES: Se valora a sí mismo, Autorregula sus emociones, Reflexiona y argumenta éticamente, Vive su sexualidad plena y responsablemente.
    ESTÁNDAR (Fin Ciclo VI): Toma conciencia de aspectos que lo hacen único, regula emociones, argumenta ante conflictos morales y analiza desigualdad de género.
    DESEMPEÑOS 1° GRADO: Explica cambios de desarrollo, describe prácticas culturales, describe causas de emociones, argumenta dilemas morales en aula, explica consecuencias de sus decisiones.
    DESEMPEÑOS 2° GRADO: Explica sus características y logros, explica importancia de participar en grupos, argumenta dilemas en comunidad, analiza violencia y desigualdad de género, plantea pautas de autocuidado.

    COMPETENCIA 2: Convive y participa democráticamente en la búsqueda del bien común.
    CAPACIDADES: Interactúa con todas las personas, Construye normas y asume acuerdos, Maneja conflictos de manera constructiva, Delibera sobre asuntos públicos, Participa en acciones para el bienestar común.
    ESTÁNDAR (Fin Ciclo VI): Se relaciona respetando diferencias, construye normas basadas en principios democráticos, es mediador de conflictos y delibera asuntos públicos.
    DESEMPEÑOS 1° GRADO: Establece relaciones de respeto, evalúa normas escolares, interviene en conflictos cercanos con diálogo, delibera con diversas fuentes, propone acciones para grupos vulnerables.
    DESEMPEÑOS 2° GRADO: Defiende sus derechos, cuestiona prejuicios y estereotipos, propone normas para escuela y vías públicas, actúa como mediador, sustenta posición en principios democráticos.
  `,
  DPCC_CICLO_VII: `
    COMPETENCIA 1: Construye su identidad.
    CAPACIDADES: Se valora a sí mismo, Autorregula sus emociones, Reflexiona y argumenta éticamente, Vive su sexualidad de manera integral y responsable.
    ESTÁNDAR VII: Postura ética ante conflictos morales integrando principios y derechos fundamentales. Reflexiona sobre responsabilidad de acciones. Relaciones basadas en reciprocidad.
    DESEMPEÑOS 3° GRADO: Valora características y potencialidades, opina sobre prácticas culturales, sustenta posición ética en DDHH, analiza estereotipos de sexualidad, previene situaciones de riesgo sexual.
    DESEMPEÑOS 4° GRADO: Describe potencialidades ante riesgos, se identifica con grupos sociales, sustenta posición ética considerando dignidad, rechaza discriminación y violencia, protege su integridad sexual.
    DESEMPEÑOS 5° GRADO: Evalúa características según proyecto de vida, postura crítica sobre cultura, establece relaciones justas, rechaza discriminación por identidad de género u orientación sexual, evalúa vínculos de pareja.

    COMPETENCIA 2: Convive y participa democráticamente en la búsqueda del bien común.
    CAPACIDADES: Interactúa con todas las personas, Construye normas y asume acuerdos y leyes, Maneja conflictos de manera constructiva, Delibera sobre asuntos públicos, Participa en acciones que promueven el bienestar común.
    ESTÁNDAR VII: Evalúa normas según legislación vigente y principios democráticos. Negociación y diálogo complejo. Acciones colectivas por justicia social y ambiental.
    DESEMPEÑOS 3° GRADO: Promueve integración y cuestiona prejuicios, evalúa normas de tránsito, diferencia y enfrenta conflictos creativamente, delibera asuntos públicos y aporta a consensos.
    DESEMPEÑOS 4° GRADO: Rechaza violencia a grupos vulnerables, propone normas con base democrática, utiliza mediación y conciliación, delibera sobre Estado de derecho y mecanismos de participación.
    DESEMPEÑOS 5° GRADO: Demuestra respeto a diversidad y necesidades especiales, propone normas antidiscriminación, ejerce rol de mediador, realiza acciones por justicia social/ambiental, evalúa organismos del Estado.
  `
};

// ── Función: obtiene base curricular según área y grado ─────────────────────
function getBaseCurricular(area, grade) {
  const esCicloVII = grade.includes('3') || grade.includes('4') || grade.includes('5');
  if (area === 'DPCC') {
    return esCicloVII ? MARCO_CURRICULAR.DPCC_CICLO_VII : MARCO_CURRICULAR.DPCC_CICLO_VI;
  }
  // Para otras áreas: instrucción genérica enriquecida con grado
  return `Área: ${area}. Grado: ${grade}.
  Selecciona las competencias, capacidades, estándares y desempeños exactos del CNEB para esta área y grado.
  Asegúrate de que el estándar corresponda al ${esCicloVII ? 'Ciclo VII (3°–5° Secundaria)' : 'Ciclo VI (1°–2° Secundaria)'} y los desempeños al ${grade}.`;
}

function openAiGenerator() {
  document.getElementById('home').style.display = 'none';
  document.getElementById('portfolio').style.display = 'none';
  document.getElementById('sala-view').style.display = 'none';
  document.getElementById('ai-view').style.display = 'block';
  gIdx = null;
  
  const sel = document.getElementById('ai-group');
  sel.innerHTML = '<option value="">-- Sin Grupo / Generar Formato Genérico --</option>';
  D.groups.forEach((g, i) => {
    const activeCount = g.students.length - (g.withdrawn?.length || 0);
    sel.innerHTML += `<option value="${i}">${g.name} (${g.grade}) - ${activeCount} alumnos activos</option>`;
  });
}

function autoFillAIGrade() {
  const val = document.getElementById('ai-group').value;
  if(val !== '') {
     const g = D.groups[val];
     // Intenta hacer match en el select de grado
     const gradeEl = document.getElementById('ai-grade');
     const gradeStr = (g.grade || '').toLowerCase();
     Array.from(gradeEl.options).forEach(opt => {
       if(gradeStr.includes(opt.value.toLowerCase().replace(/[°º]/g,'').trim().charAt(0))) gradeEl.value = opt.value;
     });
  }
}

function handleAIPdfSelect(event) {
  const file = event.target.files[0];
  const nameSpan = document.getElementById('ai-pdf-name');
  if (!file) { nameSpan.textContent = 'Ningún archivo seleccionado'; aiPdfBase64 = null; return; }
  if (file.type !== 'application/pdf') { toast('⚠️ Solo se admiten archivos PDF', 'var(--red)'); nameSpan.textContent = 'Archivo no válido'; aiPdfBase64 = null; return; }
  if (file.size > 5 * 1024 * 1024) { toast('⚠️ El PDF es muy grande (máx 5MB recomendado)', 'var(--yellow)'); }
  
  nameSpan.textContent = file.name; nameSpan.style.color = '#a78bfa';
  const reader = new FileReader();
  reader.onload = function(e) { aiPdfBase64 = e.target.result.split(',')[1]; };
  reader.readAsDataURL(file);
}

// =========================================
// METODOLOGÍAS ACTIVAS
// =========================================
const METODOLOGIAS = {
  arde: {
    nombre: 'Metodología ARDE',
    descripcion: `Estructura la sesión siguiendo el ciclo ARDE (Activación → Reflexión → Demostración → Evaluación):
    - ACTIVACIÓN (fase de inicio): Engancha al estudiante con pausas activas, preguntas detonantes, retos iniciales o estudios de caso que despierten interés y conecten con saberes previos.
    - REFLEXIÓN (análisis crítico y recepción de información): El docente facilita la recepción de nueva información; los estudiantes analizan críticamente usando diálogo crítico, diarios de aprendizaje o las 5R (Recordar, Relacionar, Reflexionar, Razonar, Redireccionar).
    - DEMOSTRACIÓN (aprendizaje vivencial): Los estudiantes aplican los conceptos en situaciones reales o simuladas: exposición práctica, ejecución de procedimientos, juegos de rol o proyectos donde aprenden haciendo.
    - EVALUACIÓN (verificación del aprendizaje): Se valora el proceso y el resultado mediante rúbricas, portafolios, coevaluación y retroalimentación constante.
    IMPORTANTE: La tabla de SECUENCIA DIDÁCTICA debe usar exactamente estas 4 filas como momentos: ACTIVACIÓN, REFLEXIÓN, DEMOSTRACIÓN y EVALUACIÓN (en lugar de Inicio/Desarrollo/Cierre). Asigna el tiempo proporcionalmente según la duración total de la sesión.`
  },
  abp: {
    nombre: 'Aprendizaje Basado en Proyectos (ABP)',
    descripcion: `Estructura la sesión con metodología ABP: los estudiantes investigan y responden a un problema auténtico y complejo, creando un producto final. La secuencia incluye: presentación del reto/problema, investigación guiada, trabajo colaborativo en equipos, construcción del producto y presentación/evaluación de resultados.`
  },
  choice_board: {
    nombre: 'Choice Board (Tablero de Elección)',
    descripcion: `Estructura la sesión con un Tablero de Elección tipo cuadrícula donde cada celda contiene una actividad diferente. Los estudiantes eligen qué actividades realizar según sus intereses y estilos de aprendizaje. La secuencia incluye: presentación del tablero, tiempo de elección autónoma, ejecución y socialización.`
  },
  estaciones: {
    nombre: 'Estaciones de Rotación',
    descripcion: `Estructura la sesión con Estaciones de Rotación: los estudiantes rotan por 3 o 4 estaciones de trabajo (ej. lectura, práctica digital, trabajo colaborativo, evaluación individual), cada una con una actividad distinta. Incluye tiempos claros de rotación y un cierre integrador.`
  },
  flipped: {
    nombre: 'Flipped Learning (Aula Invertida)',
    descripcion: `Estructura la sesión con Aula Invertida: asume que los estudiantes ya revisaron el contenido teórico en casa (video/lectura). En clase, el tiempo se dedica íntegramente a práctica activa, resolución de problemas, debates, proyectos y retroalimentación personalizada.`
  },
  gamificacion: {
    nombre: 'Gamificación',
    descripcion: `Estructura la sesión incorporando elementos de juego: sistema de puntos, niveles de dificultad, retos por equipos, insignias de logro y retroalimentación inmediata. Las actividades están diseñadas como misiones o desafíos que aumentan la motivación y el compromiso del estudiante.`
  },
  learning_menu: {
    nombre: 'Learning Menu (Menú de Aprendizaje)',
    descripcion: `Estructura la sesión con un Menú de Aprendizaje organizado por niveles: entrada (actividad introductoria obligatoria), plato fuerte (actividades de desarrollo diferenciadas), postre (actividades de extensión o enriquecimiento). Los estudiantes eligen dentro de cada nivel según su ritmo.`
  },
  ninguna: {
    nombre: null,
    descripcion: null
  }
};

// =========================================
// CAPACIDADES DINÁMICAS POR COMPETENCIA
// =========================================

// ── Mapa de subtemas por capítulo ────────────────────────────────────────────
const SUBTEMAS_CAPITULOS = {
  1: ['Mi historia personal y la autoestima', 'Influencia de los grupos en la identidad', 'Educando nuestras emociones'],
  2: ['Afrontar diversas situaciones', 'Enfrentar conflictos con inteligencia', 'Ser compañeros sin violencia'],
  3: ['Iguales pero diferentes: sexo y género', 'Vínculos y relaciones sanas', 'No dejarse engañar: violencia y manipulación'],
  4: ['Historias personales y culturas', 'Un país de muchas lenguas', 'La música como espacio para convivir'],
  5: ['Ser justos: reflexión ética', 'Ampliación de derechos en la historia', 'Identificar el autoritarismo'],
  6: ['Responsabilidades ciudadanas', 'Somos parte del Estado peruano', 'Participación adolescente en democracia']
};

// ── Mapa de desempeños por grado (DPCC) ──────────────────────────────────────
const DESEMPENOS_DPCC = {
  '1er Grado': {
    comp1: ['Explica cambios de su desarrollo y describe prácticas culturales de su entorno.','Describe causas de sus emociones y argumenta sobre dilemas morales en familia/aula.','Explica consecuencias de sus decisiones relacionadas con su autocuidado.'],
    comp2: ['Establece relaciones de respeto con sus pares e interviene en conflictos cercanos con diálogo.','Evalúa normas escolares y propone acciones concretas para grupos vulnerables.','Delibera usando diversas fuentes sobre asuntos de su comunidad escolar.']
  },
  '2do Grado': {
    comp1: ['Explica sus características y logros, valorando su participación en grupos.','Argumenta dilemas morales en escuela/comunidad y analiza violencia y desigualdad de género.','Plantea pautas de autocuidado sexual y analiza críticamente estereotipos.'],
    comp2: ['Defiende sus derechos y cuestiona prejuicios y estereotipos en su entorno.','Propone y evalúa normas para la escuela y vías públicas usando principios democráticos.','Actúa como mediador con habilidades sociales y sustenta posiciones democráticas.']
  },
  '3er Grado': {
    comp1: ['Valora sus características y potencialidades, opinando sobre prácticas culturales.','Sustenta posición ética basada en DDHH y analiza estereotipos de sexualidad.','Previene situaciones de riesgo sexual con estrategias concretas.'],
    comp2: ['Promueve integración y cuestiona prejuicios en espacios públicos.','Evalúa normas de tránsito y diferencia tipos de conflictos, enfrentándolos creativamente.','Delibera sobre asuntos públicos y aporta a consensos democráticos.']
  },
  '4to Grado': {
    comp1: ['Describe potencialidades ante riesgos y se identifica con grupos sociales con sentido crítico.','Sustenta posición ética considerando dignidad y rechaza discriminación y violencia.','Protege su integridad sexual y evalúa situaciones de vulneración de derechos.'],
    comp2: ['Rechaza violencia hacia grupos vulnerables y propone normas con base democrática.','Utiliza mediación, conciliación y arbitraje para resolver conflictos complejos.','Delibera sobre Estado de derecho, institucionalidad y mecanismos de participación.']
  },
  '5to Grado': {
    comp1: ['Evalúa sus características según su proyecto de vida y postura crítica sobre cultura.','Establece relaciones justas y rechaza discriminación por identidad de género u orientación sexual.','Evalúa vínculos de pareja con enfoque de equidad y prevención de violencia.'],
    comp2: ['Demuestra respeto a la diversidad y propone normas antidiscriminación.','Ejerce rol de mediador en situaciones complejas y realiza acciones por justicia social/ambiental.','Evalúa la gestión de autoridades y organismos del Estado con criterios democráticos.']
  }
};

// ── Toggle: activar contexto local inyectado ─────────────────────────────────
function toggleContextoLocal(cb) {
  const inp = document.getElementById('ai-contexto');
  if (cb.checked) {
    inp.value = 'Huayobamba, San Marcos, Cajamarca. Estudiantes con baja autoestima y timidez extrema, arraigo a tradiciones locales (agricultura, ganadería, festividades San Juan Bautista, Unshas).';
    inp.style.borderColor = 'var(--accent)';
    inp.readOnly = true;
  } else {
    inp.value = '';
    inp.style.borderColor = '';
    inp.readOnly = false;
  }
}

// ── Actualizar al cambiar grado o área ───────────────────────────────────────
function onGradeAreaChange() {
  renderDesempenos();
  // Ocultar campos temáticos si el área no es DPCC
  const area = document.getElementById('ai-area').value;
  const wrap = document.getElementById('ai-campos-tematicos-wrap');
  if (wrap) wrap.style.display = area === 'DPCC' ? '' : 'none';
}

// ── Renderizar desempeños según grado y área ─────────────────────────────────
function renderDesempenos() {
  const grade = document.getElementById('ai-grade').value;
  const area  = document.getElementById('ai-area').value;
  const box   = document.getElementById('ai-desempenos-box');
  if (!box) return;
  if (area !== 'DPCC' || !DESEMPENOS_DPCC[grade]) {
    box.innerHTML = `<span style="color:var(--muted);font-style:italic;">Desempeños específicos disponibles solo para DPCC (1°–5° Secundaria). Para ${area}, la IA los seleccionará del CNEB según el grado.</span>`;
    return;
  }
  const data = DESEMPENOS_DPCC[grade];
  const comp1 = document.getElementById('ai-comp-1')?.checked;
  const comp2 = document.getElementById('ai-comp-2')?.checked;
  const compIA = document.getElementById('ai-comp-ia')?.checked;
  let html = '';
  const renderComp = (label, items) => {
    html += `<div style="margin-bottom:8px;"><div style="font-size:0.71rem;font-weight:800;color:var(--primary-light);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;">${label}</div>`;
    items.forEach(d => {
      const id = 'desemp_' + Math.random().toString(36).substr(2,6);
      html += `<label style="display:flex;align-items:flex-start;gap:8px;padding:5px 6px;border-radius:6px;cursor:pointer;font-size:0.77rem;color:var(--text);line-height:1.4;" onmouseover="this.style.background='rgba(14,165,233,0.08)'" onmouseout="this.style.background='transparent'">
        <input type="checkbox" id="${id}" data-desemp="${d.replace(/"/g,"'")}" style="width:14px;height:14px;accent-color:var(--primary);flex-shrink:0;margin-top:2px;">
        <span>${d}</span></label>`;
    });
    html += '</div>';
  };
  if (compIA || (!comp1 && !comp2)) {
    renderComp('Competencia 1 — Construye su identidad', data.comp1);
    renderComp('Competencia 2 — Convive y participa', data.comp2);
  } else {
    if (comp1) renderComp('Competencia 1 — Construye su identidad', data.comp1);
    if (comp2) renderComp('Competencia 2 — Convive y participa', data.comp2);
  }
  box.innerHTML = html || '<span style="color:var(--muted);font-style:italic;">Sin desempeños para mostrar.</span>';
}

// ── Toggle campos temáticos MINEDU ────────────────────────────────────────────
function toggleCamposTematicos(cb) {
  const wrap = document.getElementById('ai-campos-selects');
  if (!wrap) return;
  wrap.style.display = cb.checked ? 'flex' : 'none';
  if (!cb.checked) {
    document.getElementById('ai-capitulo').value = '';
    document.getElementById('ai-subtemas-check-box').innerHTML = '';
  }
}

// ── Render subtemas según capítulo elegido ────────────────────────────────────
function renderSubtemas() {
  const capVal = parseInt(document.getElementById('ai-capitulo').value);
  const box = document.getElementById('ai-subtemas-check-box');
  if (!box) return;
  if (!capVal || !SUBTEMAS_CAPITULOS[capVal]) { box.innerHTML = ''; return; }
  box.innerHTML = SUBTEMAS_CAPITULOS[capVal].map(st => {
    const id = 'st_' + Math.random().toString(36).substr(2,5);
    return `<label style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;cursor:pointer;font-size:0.78rem;" onmouseover="this.style.background='rgba(14,165,233,0.08)'" onmouseout="this.style.background='transparent'">
      <input type="checkbox" id="${id}" data-subtema="${st}" style="width:13px;height:13px;accent-color:var(--primary);flex-shrink:0;">
      <span>${st}</span></label>`;
  }).join('');
}
const CAPACIDADES_MAP = {
  'comp1': {
    nombre: 'Construye su identidad',
    capacidades: [
      'Se valora a sí mismo',
      'Autorregula sus emociones',
      'Reflexiona y argumenta éticamente',
      'Vive su sexualidad de manera integral y responsable'
    ]
  },
  'comp2': {
    nombre: 'Convive y participa democráticamente en la búsqueda del bien común',
    capacidades: [
      'Interactúa con todas las personas',
      'Construye normas y asume acuerdos y leyes',
      'Maneja conflictos de manera constructiva',
      'Delibera sobre asuntos públicos',
      'Participa en acciones que promueven el bienestar común'
    ]
  }
};

function renderCapacidades() {
  const box = document.getElementById('ai-capacidades-box');
  if (!box) return;
  const compIA = document.getElementById('ai-comp-ia').checked;
  const comp1 = document.getElementById('ai-comp-1').checked;
  const comp2 = document.getElementById('ai-comp-2').checked;
  box.innerHTML = '';
  if (compIA || (!comp1 && !comp2)) {
    box.innerHTML = '<div style="color:var(--muted); font-size:0.78rem; padding:8px 10px; text-align:center; font-style:italic;">Selecciona una competencia para ver sus capacidades.</div>';
    return;
  }
  const toShow = [];
  if (comp1) toShow.push('comp1');
  if (comp2) toShow.push('comp2');
  toShow.forEach(key => {
    const data = CAPACIDADES_MAP[key];
    const header = document.createElement('div');
    header.style.cssText = 'font-size:0.72rem; font-weight:800; color:var(--primary-light); text-transform:uppercase; letter-spacing:0.5px; padding:8px 10px 4px 10px;';
    header.textContent = data.nombre;
    box.appendChild(header);
    data.capacidades.forEach(cap => {
      const id = `ai-cap-${key}-${cap.replace(/\s/g,'_').replace(/[^a-zA-Z0-9_]/g,'')}`;
      const lbl = document.createElement('label');
      lbl.style.cssText = 'display:flex; align-items:center; gap:10px; padding:7px 10px; border-radius:8px; cursor:pointer; transition:background 0.15s;';
      lbl.onmouseover = () => lbl.style.background = 'rgba(14,165,233,0.08)';
      lbl.onmouseout = () => lbl.style.background = 'transparent';
      lbl.innerHTML = `<input type="checkbox" id="${id}" data-cap="${cap}" style="width:15px;height:15px;accent-color:var(--primary);flex-shrink:0;"><span style="font-size:0.79rem; font-weight:600;">${cap}</span>`;
      box.appendChild(lbl);
    });
  });
}

function getSelectedCapacidades() {
  const checked = box => [...box.querySelectorAll('input[type=checkbox]:checked')].map(cb => cb.dataset.cap).filter(Boolean);
  const box = document.getElementById('ai-capacidades-box');
  if (!box) return '';
  const caps = checked(box);
  return caps.length ? caps.join(', ') : '';
}

// Event listeners para actualizar capacidades al cambiar competencias
document.addEventListener('DOMContentLoaded', function() {
  ['ai-comp-ia','ai-comp-1','ai-comp-2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', function() {
      if (id === 'ai-comp-ia' && this.checked) {
        document.getElementById('ai-comp-1').checked = false;
        document.getElementById('ai-comp-2').checked = false;
      } else if ((id === 'ai-comp-1' || id === 'ai-comp-2') && this.checked) {
        document.getElementById('ai-comp-ia').checked = false;
      }
      renderCapacidades();
      renderDesempenos();
    });
  });
  renderCapacidades();
  onGradeAreaChange();
});

function selectMetodologia(el) {
  document.querySelectorAll('.metod-card').forEach(c => {
    c.style.borderColor = 'var(--border)';
    c.style.background = 'var(--surface2)';
  });
  const key = el.dataset.key;
  el.style.borderColor = key === 'ninguna' ? 'var(--muted)' : 'var(--primary-light)';
  el.style.background = 'rgba(14,165,233,0.07)';
  document.getElementById('ai-metodologia').value = key;
}

async function generateSessionWithAI() {
  if(!D.settings || !D.settings.apiKey) { toast('⚠️ Por favor configura tu API Key en la pantalla de inicio', 'var(--red)'); return; }

  const theme = document.getElementById('ai-theme').value.trim();
  const nivel = document.getElementById('ai-nivel').value;
  const grade = document.getElementById('ai-grade').value;
  const duration = parseInt(document.getElementById('ai-duration').value, 10) || 90;
  const round5 = n => Math.round(n / 5) * 5;
  const groupVal = document.getElementById('ai-group').value;
  const area = document.getElementById('ai-area').value;
  const instrumento = document.getElementById('ai-instrumento').value;
  const docente = document.getElementById('ai-docente').value.trim() || 'Ivan Noe Jalanoca Ticona';
  const director = document.getElementById('ai-director').value.trim() || 'Juan Carlos Ruiz Villanueva';
  const ie = document.getElementById('ai-ie').value.trim() || 'I.E. 24 de Junio';
  const contexto = document.getElementById('ai-contexto').value.trim();
  const usarContextoLocal = document.getElementById('ai-usar-contexto-local')?.checked || false;

  // Competencias
  const compIA = document.getElementById('ai-comp-ia').checked;
  const comp1 = document.getElementById('ai-comp-1').checked;
  const comp2 = document.getElementById('ai-comp-2').checked;
  const compTransversal = document.getElementById('ai-comp-transversal').value;
  const enfoque = document.getElementById('ai-enfoque').value;

  // Pedagógico opcional
  const proposito = document.getElementById('ai-proposito').value.trim();
  const reto = document.getElementById('ai-reto').value.trim();
  const evidencia = document.getElementById('ai-evidencia').value.trim();
  const producto = document.getElementById('ai-producto').value.trim();
  const incTeoria = document.getElementById('ai-teoria').checked;
  const incFicha = document.getElementById('ai-ficha').checked;
  const metodKey = document.getElementById('ai-metodologia').value || 'ninguna';
  const metodologia = METODOLOGIAS[metodKey] || METODOLOGIAS.ninguna;

  // Subtemas: prioridad → campos MINEDU checkeados, luego textarea libre
  let subtemas = document.getElementById('ai-subtemas').value.trim();
  if (document.getElementById('ai-usar-campos')?.checked) {
    const stChecked = [...document.querySelectorAll('#ai-subtemas-check-box input[type=checkbox]:checked')]
      .map(cb => cb.dataset.subtema).filter(Boolean);
    if (stChecked.length) subtemas = stChecked.join(' / ');
  }

  // Desempeños seleccionados por el docente
  const desempenosSeleccionados = [...document.querySelectorAll('#ai-desempenos-box input[type=checkbox]:checked')]
    .map(cb => cb.dataset.desemp).filter(Boolean).join(' | ');

  if(!theme) { toast('⚠️ Ingresa el tema específico de la sesión', 'var(--red)'); return; }

  // Base curricular dinámica según área y grado
  const basePedagogica = getBaseCurricular(area, grade);

  // Armar lista de competencias seleccionadas
  let competenciasSeleccionadas = '';
  if (compIA) {
    competenciasSeleccionadas = 'Selecciona la(s) competencia(s) más pertinente(s) al tema según el CNEB.';
  } else {
    const sel = [];
    if (comp1) sel.push('Construye su identidad');
    if (comp2) sel.push('Convive y participa democráticamente en la búsqueda del bien común');
    competenciasSeleccionadas = sel.length ? sel.join(' / ') : 'Selecciona la competencia más pertinente al tema.';
  }

  // Capacidades seleccionadas por el docente
  const capsBox = document.getElementById('ai-capacidades-box');
  const selectedCaps = capsBox ? [...capsBox.querySelectorAll('input[type=checkbox]:checked')].map(cb => cb.dataset.cap).filter(Boolean) : [];
  const capacidadesSeleccionadas = selectedCaps.length ? selectedCaps.join(', ') : '';

  let studentsList = "Alumno 1, Alumno 2, Alumno 3, Alumno 4, Alumno 5";
  let activeStudentsCount = 5;
  if(groupVal !== '') {
      const g = D.groups[groupVal];
      const activeStudents = g.students.filter((_, i) => !(g.withdrawn && g.withdrawn.includes(i)));
      activeStudentsCount = activeStudents.length;
      if(activeStudentsCount > 0) { studentsList = activeStudents.map((s, idx) => `${idx + 1}. ${s}`).join('\n'); }
  }

  const btn = document.getElementById('btn-generate-ai');
  const outBox = document.getElementById('ai-output');
  
  btn.disabled = true; btn.innerHTML = '⏳ Diseñando sesión especializada...';
  outBox.innerHTML = '<div style="color:var(--primary-light); text-align:center; padding: 40px 20px; font-weight:bold; animation: pulse 1s infinite;">Procesando currículo, contexto de Huayobamba y parámetros pedagógicos... 🇵🇪✨</div>';

  let prompt = `Actúa como un docente pedagogo experto del MINEDU Perú. Diseña una sesión de aprendizaje impecable y adaptada a la realidad de los estudiantes de la institución "${ie}" en formato HTML PURO. 
  Debes usar tablas HTML estructuradas (tabla, tr, th, td) para organizar la información de manera profesional, usando colores de fondo en los encabezados (ej. style="background-color: #dbeafe; text-align: left; padding: 8px; border: 1px solid black;").

  DATOS DE LA SESIÓN:
  - Docente: ${docente}
  - Director(a): ${director}
  - I.E.: ${ie}
  - Nivel: ${nivel}
  - Grado: ${grade}
  - Área: ${area}
  - Tema: ${theme}
  - Duración: ${duration} minutos.
  ${contexto ? `- Contexto Adicional del Docente: ${contexto}` : ''}
  ${metodologia.nombre ? `- Metodología Activa: ${metodologia.nombre}` : ''}
  ${subtemas ? `- Subtemas a integrar obligatoriamente (libro MINEDU): ${subtemas}` : ''}

  ${usarContextoLocal ? `CONTEXTO PSICOSOCIAL Y REGIONAL OBLIGATORIO (HUAYOBAMBA - SAN MARCOS):
  ${JSON.stringify(CONTEXTO_LOCAL)}
  Usa este contexto para diseñar la motivación, el reto y los ejemplos durante el desarrollo. Conecta el tema con la agricultura, ganadería, las costumbres locales (como San Juan Bautista o las unshas) y fomenta dinámicas guiadas para vencer su timidez.` : ''}
  
  ${subtemas ? `CAMPOS TEMÁTICOS OFICIALES DE REFERENCIA (Libro MINEDU):
  ${CAMPOS_TEMATICOS_DPCC}` : ''}

  COMPETENCIAS A DESARROLLAR: ${competenciasSeleccionadas}
  ${capacidadesSeleccionadas ? `CAPACIDADES A MOVILIZAR (seleccionadas por el docente): ${capacidadesSeleccionadas}` : ''}
  ${desempenosSeleccionados ? `DESEMPEÑOS A MOVILIZAR (seleccionados por el docente para ${grade}): ${desempenosSeleccionados}` : ''}
  ${compTransversal ? `COMPETENCIA TRANSVERSAL: ${compTransversal}` : ''}
  ${enfoque ? `ENFOQUE TRANSVERSAL: ${enfoque}` : '(Selecciona el enfoque transversal más pertinente al tema)'}

  PARÁMETROS ESTABLECIDOS POR EL DOCENTE (Respeta estos datos; si están vacíos, redáctalos tú integrando el contexto local):
  - Propósito de la sesión: ${proposito ? `El docente escribió este borrador: "${proposito}". MEJÓRALO: corrige la redacción pedagógica, enriquece con las competencias "${competenciasSeleccionadas}"${capacidadesSeleccionadas ? `, capacidades "${capacidadesSeleccionadas}"` : ''}${desempenosSeleccionados ? `, desempeños "${desempenosSeleccionados}"` : ''}${usarContextoLocal ? ' y contextualiza a la realidad de Huayobamba (agricultura, ganadería, festividades, superación de la timidez)' : ''}. Usa el formato: "Los estudiantes [acción observable] a través de [actividad] para [fin pedagógico]".` : `Redacta un propósito de sesión que integre explícitamente: la(s) competencia(s) "${competenciasSeleccionadas}", ${capacidadesSeleccionadas ? `las capacidades "${capacidadesSeleccionadas}"` : 'las capacidades pertinentes'}, ${desempenosSeleccionados ? `los desempeños "${desempenosSeleccionados}"` : 'los desempeños del grado'}, y el tema "${theme}". Debe redactarse como: "Los estudiantes [acción observable] a través de [actividad] para [fin pedagógico]".`}
  - Reto / Situación Significativa: ${reto ? `El docente escribió este borrador: "${reto}". MEJÓRALO: enriquece la redacción para que sea una situación significativa, motivadora y retadora${usarContextoLocal ? ', conectada a la realidad de Huayobamba (agricultura, ganadería, festividades, superación de la timidez)' : ''}, que active la competencia "${competenciasSeleccionadas}". Hazlo más narrativo, contextualizado y provocador.` : `Crea una situación significativa, motivadora y retadora vinculada al tema "${theme}"${usarContextoLocal ? ' y a la realidad de Huayobamba (agricultura, ganadería, festividades, timidez)' : ''}, que active la competencia "${competenciasSeleccionadas}".`}
  - Producto Final: ${producto ? `Mejora este producto: "${producto}". Hazlo más preciso e integrador para ${grade}.` : 'Define un producto final creativo e integrador pertinente al tema y nivel.'}
  - Evidencia de aprendizaje: ${evidencia ? `Ajusta esta evidencia: "${evidencia}" para coherencia directa con el producto final.` : 'Redacta una evidencia observable y medible vinculada al producto final.'}
  ${subtemas ? `- SUBTEMAS OBLIGATORIOS: Integra explícitamente: ${subtemas}.` : ''}

  BASE CURRICULAR OBLIGATORIA (Usa el estándar y desempeños exactos para este grado y área):
  ${basePedagogica}
  
  COMPETENCIAS TRANSVERSALES Y ENFOQUES (Referencia):
  ${MARCO_CURRICULAR.ENFOQUES_TRANSVERSALES}
  ${MARCO_CURRICULAR.COMPETENCIAS_TRANSVERSALES}

  INSTRUCCIONES DE ESTRUCTURA EXACTA DE 10 PUNTOS (Sigue exactamente esta numeración y formato del documento base):

  <h3 style="text-align: center; color: #333;">"Año de la Esperanza y el Fortalecimiento de la Democracia"</h3>
  <h2 style="text-align: center; text-transform: uppercase; color: #1e293b;">SESIÓN DE APRENDIZAJE: ${theme}</h2>

  <h4 style="color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 4px;">I. DATOS INFORMATIVOS</h4>
  (Crea una tabla con: Docente: ${docente}, Director(a): ${director}, I.E.: ${ie}, Nivel: ${nivel}, Grado: ${grade}, Área: ${area}, Tema: ${theme}, Duración: ${duration} min, Fecha: [Fecha Actual]).

  <h4 style="color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 4px;">II. PROPÓSITOS DE APRENDIZAJE</h4>
  (Crea una tabla con las columnas: COMPETENCIAS Y CAPACIDADES, ESTÁNDAR, DESEMPEÑOS. Usa la información de la Base Curricular proporcionada.
  Debajo de la tabla añade en texto libre la COMPETENCIA TRANSVERSAL y el ENFOQUE TRANSVERSAL).

  <h4 style="color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 4px;">III. PROPÓSITO DE LA SESIÓN</h4>
  <p>${proposito ? `(Aquí escribe tu versión mejorada del propósito del docente: "${proposito}". Aplica corrección pedagógica, enriquécelo con las competencias, capacidades y contexto local. Usa el formato: "Los estudiantes [acción observable] a través de [actividad] para [fin pedagógico]".)` : '[Redactado por la IA]'}</p>

  <h4 style="color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 4px;">IV. RETO (SITUACIÓN SIGNIFICATIVA)</h4>
  <p>${reto ? `(Aquí escribe tu versión mejorada del reto del docente: "${reto}". Hazlo más narrativo, contextualizado y retador. Debe conectar con el contexto local o socioemocional detallado y activar la competencia.)` : '[Redactado por la IA - Debe conectar con el contexto local o socioemocional detallado]'}</p>

  <h4 style="color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 4px;">V. CRITERIOS DE EVALUACIÓN</h4>
  (Crea una tabla o lista de 3 a 5 criterios claros y contextualizados a la realidad de los alumnos, orientados a la mejora de su participación y superación de la timidez, además de los contenidos del área).

  <h4 style="color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 4px;">VI. EVIDENCIA DE APRENDIZAJE</h4>
  <p>${evidencia || '[Redactado por la IA]'}</p>

  <h4 style="color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 4px;">VII. PRODUCTO</h4>
  <p><strong>${producto || '[Redactado por la IA]'}</strong></p>

  <h4 style="color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 4px;">VIII. SECUENCIA DIDÁCTICA</h4>
  ${metodologia.descripcion
    ? 'METODOLOGÍA SELECCIONADA — ' + metodologia.nombre + ': ' + metodologia.descripcion + ' (Detalla cómo abordar la timidez y la baja autoestima de los alumnos durante las dinámicas. Usa 2 columnas: MOMENTOS/ETAPAS y PROCESOS PEDAGÓGICOS Y ACTIVIDADES. Cada momento debe ser detallado con al menos 5 oraciones específicas de lo que el docente y los alumnos hacen. Los tiempos deben ser múltiplos de 5.)'
    : '(Crea una tabla con 2 columnas: MOMENTOS, PROCESOS PEDAGÓGICOS Y ACTIVIDADES. Filas: INICIO (' + round5(duration*0.15) + ' min), DESARROLLO (' + round5(duration*0.7) + ' min), CIERRE (' + round5(duration*0.15) + ' min). En Inicio: dinámica motivacional para vencer la timidez. En Desarrollo: abordaje del tema usando la realidad local agrícola/social. En Cierre: metacognición reflexiva.)'
  }

  <h4 style="color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 4px;">IX. INSTRUMENTO DE EVALUACIÓN: ${instrumento.toUpperCase()}</h4>
  (Crea una tabla de evaluación tipo "${instrumento}". Columnas: N°, Nombres y Apellidos, Criterio 1, Criterio 2, etc. 
  IMPORTANTE: Llena las filas EXACTAMENTE con esta lista de ${activeStudentsCount} alumnos:
  ${studentsList})

  <h4 style="color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 4px;">X. FIRMAS</h4>
  (Crea una tabla sin bordes visibles con espacio para las firmas del Docente y del Director(a)).

  ${incTeoria ? '<h4 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 4px; margin-top:30px;">TEORÍA DEL TEMA</h4>(Desarrolla el contenido teórico de manera amigable para los estudiantes, usando los capítulos oficiales si aplica, y relacionándolo con ejemplos locales de su comunidad).' : ''}

  ${incFicha ? '<h4 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 4px; margin-top:30px;">FICHA DE APLICACIÓN</h4>(Crea una ficha de trabajo para el alumno con cabecera. Incluye preguntas sobre la teoría contextualizadas a su realidad local. Al final, añade <strong>SOLUCIONARIO</strong>).' : ''}

  REGLAS ESTRICTAS: 
  - Devuelve ÚNICAMENTE el código HTML (sin markdown de código como \`\`\`html al inicio o final). Todo debe estar listo para renderizarse en el visualizador.
  - Usa bordes en todas las tablas (border="1" style="border-collapse: collapse; width: 100%;").
  - Respeta exhaustivamente la numeración de los 10 puntos en romanos del documento base.\`\`\`html al inicio o final). No uses código markdown. Genera TODAS las secciones del I al X sin excepción.`;

  if (aiPdfBase64) { prompt += `\n\nIMPORTANTE: Te he adjuntado un documento PDF. Por favor, extrae el contexto principal de ese documento y basa tu sesión estrictamente en sus contenidos.`; }

  const parts = [{ text: prompt }];
  if (aiPdfBase64) { parts.push({ inlineData: { mimeType: "application/pdf", data: aiPdfBase64 } }); }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${D.settings.apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: parts }] })
    });
    
    const data = await response.json();
    if(data.error) throw new Error(data.error.message);
    
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar el contenido.';
    text = text.replace(/```html/g, '').replace(/```/g, '').trim();

    outBox.innerHTML = `<div class="cneb-session-container" style="background:#fff; color:#333; padding:20px; border-radius:8px; text-align:left; overflow-x:auto;">${text}</div>`;
    toast('✨ ¡Sesión estructurada con éxito!', 'var(--green)');
  } catch(e) {
    outBox.innerHTML = `<div style="color:var(--red); padding:20px;"><strong>Error de conexión con la IA:</strong><br>${e.message}<br><br>Revisa tu API Key o conexión a internet.</div>`;
    toast('⚠️ Ocurrió un error', 'var(--red)');
  } finally {
    btn.disabled = false; btn.innerHTML = '✨ Generar Sesión Completa';
  }
}

function copyAiOutput() {
  const outBox = document.getElementById('ai-output');
  const text = outBox.innerText;
  if(text.includes('Llena los datos') || text.includes('Analizando...')) { toast('⚠️ No hay contenido generado para copiar', 'var(--red)'); return; }
  
  const tempTextArea = document.createElement("textarea");
  tempTextArea.value = text; document.body.appendChild(tempTextArea);
  tempTextArea.select(); document.execCommand("copy"); document.body.removeChild(tempTextArea);
  toast('📋 ¡Copiado al portapapeles!');
}

function downloadWord() {
  const outBox = document.getElementById('ai-output');
  if(outBox.innerText.includes('Llena los datos') || outBox.innerText.includes('Construyendo...')) { toast('⚠️ No hay contenido generado para descargar', 'var(--red)'); return; }

  const container = outBox.querySelector('.cneb-session-container');
  const rawContent = container ? container.innerHTML : outBox.innerHTML;

  // ══════════════════════════════════════════════════════
  // POST-PROCESO: clonar DOM y corregir antes de exportar
  // ══════════════════════════════════════════════════════
  const exportDiv = document.createElement('div');
  exportDiv.innerHTML = rawContent;
  const allH4 = [...exportDiv.querySelectorAll('h4')];

  // ── A) Tabla "I. DATOS INFORMATIVOS" → formato VERTICAL ──
  const datosH4 = allH4.find(h => h.textContent.toUpperCase().includes('DATOS INFORMATIVOS'));
  if (datosH4) {
    let node = datosH4.nextElementSibling;
    while (node && node.tagName !== 'H4') {
      if (node.tagName === 'TABLE') {
        const rows = node.querySelectorAll('tr');
        const firstCells = rows[0] ? [...rows[0].querySelectorAll('th,td')] : [];
        const pairs = [];
        if (rows.length <= 2 && firstCells.length > 2) {
          // horizontal: fila 0 = headers, fila 1 = valores
          const hdrs = firstCells.map(c => c.textContent.trim());
          const vals = rows[1] ? [...rows[1].querySelectorAll('th,td')].map(c => c.textContent.trim()) : [];
          hdrs.forEach((h, i) => { if (h) pairs.push([h, vals[i] || '']); });
        } else {
          rows.forEach(r => {
            const cells = [...r.querySelectorAll('th,td')];
            if (cells.length >= 2) pairs.push([cells[0].textContent.trim(), cells[1].textContent.trim()]);
          });
        }
        if (pairs.length) {
          const t = document.createElement('table');
          t.setAttribute('border','1');
          t.style.cssText = 'width:100%;border-collapse:collapse;margin-bottom:16px;';
          pairs.forEach(([label, val]) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="background:#dbeafe;font-weight:bold;width:35%;padding:6px 10px;vertical-align:top;white-space:nowrap;">${label}</td><td style="width:65%;padding:6px 10px;vertical-align:top;">${val}</td>`;
            t.appendChild(tr);
          });
          node.replaceWith(t);
        }
        break;
      }
      node = node.nextElementSibling;
    }
  }

  // ── B) Tabla "IX. INSTRUMENTO" → fuente y padding compactos ──
  const instrH4 = allH4.find(h => h.textContent.toUpperCase().includes('INSTRUMENTO'));
  if (instrH4) {
    let node = instrH4.nextElementSibling;
    while (node && node.tagName !== 'H4') {
      if (node.tagName === 'TABLE') {
        node.style.cssText = 'width:100%;border-collapse:collapse;margin-bottom:14px;font-size:8pt;table-layout:fixed;';
        node.querySelectorAll('th,td').forEach(cell => {
          cell.style.cssText = cell.tagName === 'TH'
            ? 'border:1px solid #000;padding:3px 4px;font-size:8pt;font-weight:bold;background:#dbeafe;text-align:center;vertical-align:middle;line-height:1.2;word-wrap:break-word;'
            : 'border:1px solid #000;padding:3px 4px;font-size:8pt;text-align:left;vertical-align:middle;line-height:1.2;word-wrap:break-word;';
        });
        break;
      }
      node = node.nextElementSibling;
    }
  }

  // ── C) Ficha de aplicación: sanear <input> y <hr> excesivos ──
  exportDiv.querySelectorAll('input[type="text"], input:not([type])').forEach(inp => {
    const span = document.createElement('span');
    span.style.cssText = 'display:inline-block;min-width:180px;border-bottom:1px solid #000;margin:0 3px;';
    span.innerHTML = '&nbsp;';
    inp.replaceWith(span);
  });
  exportDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    const span = document.createElement('span');
    span.style.cssText = 'display:inline-block;width:11px;height:11px;border:1px solid #000;margin:0 3px;vertical-align:middle;';
    cb.replaceWith(span);
  });
  const fichaH4 = allH4.find(h => h.textContent.toUpperCase().includes('FICHA'));
  if (fichaH4) {
    let node = fichaH4.nextElementSibling;
    let hrCount = 0;
    while (node) {
      const next = node.nextElementSibling;
      if (node.tagName === 'HR') { hrCount++; if (hrCount % 3 !== 0) node.remove(); }
      node = next;
    }
  }
  // ══════════════════════════════════════════════════════

  const processedContent = exportDiv.innerHTML;

  const style = `
    <style>
      @page { margin: 2cm; size: A4; }
      body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; line-height: 1.5; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; table-layout: fixed; word-wrap: break-word; }
      th, td { border: 1px solid #000; padding: 7px 10px; text-align: left; vertical-align: top; word-wrap: break-word; }
      th { background-color: #dbeafe; font-weight: bold; }
      h2, h3 { color: #1e293b; margin-top: 18px; margin-bottom: 10px; text-align: center; }
      h4 { color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 3px; margin-top: 18px; margin-bottom: 10px; }
      ul, ol { margin-top: 4px; padding-left: 20px; }
      li { margin-bottom: 4px; line-height: 1.5; }
      p { margin-bottom: 8px; line-height: 1.5; }
      hr { border: none; border-top: 1px solid #cbd5e1; margin: 8px 0; }
    </style>
  `;

  const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Sesión de Aprendizaje</title>" + style + "</head><body>";
  const footer = "</body></html>";
  const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(header + processedContent + footer);
  const fileDownload = document.createElement("a");
  document.body.appendChild(fileDownload);
  fileDownload.href = source;
  fileDownload.download = 'Sesion_Generada_Estructurada.doc';
  fileDownload.click();
  document.body.removeChild(fileDownload);
  toast('📥 Documento Word estructurado descargado');
}

// =========================================
// GROUP CRUD & MANAGE
// =========================================
function createGroup() {
  const name = document.getElementById('ng-name').value.trim();
  if(!name) { toast('⚠️ Ingresa un nombre','var(--red)'); return; }
  const students = document.getElementById('ng-students').value.trim().split('\n').map(s=>s.trim()).filter(Boolean);
  
  const classDays = Array.from(document.querySelectorAll('.ng-day:checked')).map(cb => parseInt(cb.value));
  if(classDays.length === 0) { toast('⚠️ Marca al menos un día de clases', 'var(--red)'); return; }

  const rltChecks = {}; const groupChecks = {};
  students.forEach((_, i) => { rltChecks[i] = true; groupChecks[i] = true; });

  D.groups.push({ 
    name, grade: document.getElementById('ng-grade').value.trim(), section: document.getElementById('ng-sec').value.trim(), 
    classDays, students, withdrawn: [], emotions: {}, dailyPoints: {}, semaforo:{}, sessions:{}, grades:[], 
    observations:[], attendance:{}, rltWinnerChecks: rltChecks, rltHistory: [], groupSortChecks: groupChecks, savedGroupsSorts: [] 
  });
  save(); renderHome(); closeModal('mNewGroup');
  document.getElementById('ng-name').value = ''; document.getElementById('ng-students').value = '';
  document.getElementById('ng-grade').selectedIndex = 0; document.getElementById('ng-sec').selectedIndex = 0;
  toast('✅ Grupo creado');
}

function openEditName() {
  // Llamado desde el portfolio — gIdx ya está activo
  const g = grp();
  document.getElementById('edit-name').value = g.name;
  document.querySelectorAll('.eg-day').forEach(cb => { cb.checked = (g.classDays || []).includes(parseInt(cb.value)); });
  document.getElementById('edit-group-hidden-idx').value = gIdx;
  openModal('mEditName');
}

function saveName() {
  const v = document.getElementById('edit-name').value.trim(); if(!v) return;
  const classDays = Array.from(document.querySelectorAll('.eg-day:checked')).map(cb => parseInt(cb.value));
  if(classDays.length === 0) { toast('⚠️ Marca al menos un día de clases', 'var(--red)'); return; }

  // Determinar a qué grupo aplicar: puede venir del home (hidden idx) o del portfolio (gIdx)
  const hiddenIdx = document.getElementById('edit-group-hidden-idx').value;
  const targetIdx = (hiddenIdx !== '' && hiddenIdx !== null) ? parseInt(hiddenIdx) : gIdx;
  if (targetIdx === null || targetIdx === undefined || isNaN(targetIdx)) return;

  const g = D.groups[targetIdx];
  if (!g) return;
  g.name = v; g.classDays = classDays;
  save();
  closeModal('mEditName');
  document.getElementById('edit-group-hidden-idx').value = '';
  toast('✅ Cambios guardados');

  // Si estamos en el portfolio y es el grupo activo, refrescar
  if (gIdx !== null && gIdx === targetIdx) renderPortfolio();
  // Si estamos en el home, refrescar los boxes
  if (document.getElementById('home').style.display !== 'none') renderHome();
}

function deleteGroup() {
  if (gIdx === null || gIdx === undefined || !D.groups[gIdx]) return;
  if (!confirm('¿Eliminar este grupo y todos sus datos de forma permanente?')) return;
  D.groups.splice(gIdx, 1);
  save(); goHome(); closeModal('mManage');
  toast('🗑 Eliminado', 'var(--red)');
}

function openManage() {
  const searchInp = document.getElementById('search-student-inp');
  if(searchInp) searchInp.value = '';
  editingStudentIdx = null;
  renderManageList(); 
  openModal('mManage');
}

// Al cerrar mManage desde el home, limpiar gIdx si el portfolio no está abierto
function closeMManage() {
  closeModal('mManage');
  if (document.getElementById('portfolio').style.display === 'none') {
    gIdx = null;
    renderHome();
  }
}

let editingStudentIdx = null;

function renderManageList() {
  const el = document.getElementById('manage-list');
  const g = grp();
  const searchTerm = (document.getElementById('search-student-inp')?.value || '').toLowerCase();
  if(!g.withdrawn) g.withdrawn = [];
  
  if(!g.students.length){ el.innerHTML=`<div style="color:var(--muted);text-align:center;padding:12px;">Sin alumnos.</div>`; return; }
  
  let html = '';
  g.students.forEach((s, i) => {
    if (searchTerm && !s.toLowerCase().includes(searchTerm)) return;

    const isW = isWithdrawn(i);
    const canUp = i > 0 && !searchTerm; 
    const canDown = i < g.students.length - 1 && !searchTerm;
    const isEditing = editingStudentIdx === i;

    html += `
    <div class="s-row" style="margin-bottom:8px; display:flex; align-items:center; justify-content:space-between; background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:10px 14px; opacity: ${isW ? '0.6' : '1'}; flex-wrap:wrap; gap:10px;">
      <div class="flex" style="gap:10px; flex:1; min-width:180px;">
        <div class="s-num" style="background:${isW ? 'var(--surface3)' : clr(i)}; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.73rem; font-weight:900; flex-shrink:0; color:#fff;">${ini(s)}</div>
        
        ${isEditing ? `
          <input type="text" id="edit-student-inp-${i}" value="${s}" style="flex:1; padding:4px 8px; font-size:0.8rem; border-radius:6px; border:1px solid var(--primary);">
        ` : `
          <span style="font-size:0.84rem;font-weight:700;">${s} ${isW ? '<span style="font-size:0.6rem;background:var(--surface3);color:var(--muted);padding:2px 6px;border-radius:4px;font-weight:800;margin-left:6px;">RETIRADO</span>' : ''}</span>
        `}
      </div>
      <div class="flex" style="gap:5px; flex-wrap:wrap;">
        ${isEditing ? `
          <button class="btn btn-success btn-xs" onclick="saveEditStudent(${i})" title="Guardar">💾</button>
          <button class="btn btn-secondary btn-xs" onclick="cancelEditStudent()" title="Cancelar">❌</button>
        ` : `
          ${!searchTerm ? `
          <button class="btn btn-secondary btn-xs" onclick="moveStudent(${i}, -1)" ${!canUp ? 'disabled style="opacity:0.3;"' : ''} title="Subir">▲</button>
          <button class="btn btn-secondary btn-xs" onclick="moveStudent(${i}, 1)" ${!canDown ? 'disabled style="opacity:0.3;"' : ''} title="Bajar">▼</button>
          ` : ''}
          <button class="btn btn-secondary btn-xs" onclick="startEditStudent(${i})" title="Editar nombre">✏️</button>
          <button class="btn ${isW ? 'btn-success' : 'btn-secondary'} btn-xs" onclick="toggleWithdrawn(${i})" title="${isW ? 'Reincorporar' : 'Retirar'}">${isW ? '↩' : '⏸'}</button>
          <button class="btn btn-danger btn-xs" onclick="removeStudent(${i})" title="Eliminar definitivamente">✕</button>
        `}
      </div>
    </div>
    `;
  });
  
  if(!html) html = `<div style="color:var(--muted);text-align:center;padding:12px;">No se encontraron resultados para "${searchTerm}".</div>`;
  el.innerHTML = html;
}

function startEditStudent(i) {
  if (i === undefined || i === null) return;
  const g = grp();
  if (!g || i < 0 || i >= g.students.length) return;
  // Si ya hay otra edición en curso, cancelarla primero
  if (editingStudentIdx !== null && editingStudentIdx !== i) {
    editingStudentIdx = null;
  }
  editingStudentIdx = i;
  renderManageList();
}

function cancelEditStudent() {
  editingStudentIdx = null;
  renderManageList();
}

function saveEditStudent(i) {
  const inp = document.getElementById(`edit-student-inp-${i}`);
  if (!inp) { editingStudentIdx = null; renderManageList(); return; }
  const newName = inp.value.trim();
  if (!newName) {
    toast('⚠️ El nombre no puede estar vacío', 'var(--red)');
    return;
  }
  const g = grp();
  if (!g || i < 0 || i >= g.students.length) { editingStudentIdx = null; renderManageList(); return; }
  g.students[i] = newName;
  if (g.observations) {
    g.observations.forEach(o => {
      if (parseInt(o.studentIdx) === i) o.studentName = newName;
    });
  }
  save();
  renderPortfolio();
  toast('✏️ Nombre actualizado');
  editingStudentIdx = null;
  renderManageList();
}

function swapObjectKeys(obj, a, b) {
  if(!obj) return;
  const temp = obj[a];
  if(obj[b] !== undefined) obj[a] = obj[b]; else delete obj[a];
  if(temp !== undefined) obj[b] = temp; else delete obj[b];
}

function moveStudent(i, dir) {
  if (i === undefined || i === null || gIdx === null || gIdx === undefined) return;
  const g = grp();
  if (!g) return;
  const target = i + dir;
  if (target < 0 || target >= g.students.length) return;

  const tempName = g.students[i];
  g.students[i] = g.students[target];
  g.students[target] = tempName;

  const iWithdrawn = isWithdrawn(i);
  const targetWithdrawn = isWithdrawn(target);
  if(!g.withdrawn) g.withdrawn = [];
  g.withdrawn = g.withdrawn.filter(x => x !== i && x !== target);
  if(iWithdrawn) g.withdrawn.push(target);
  if(targetWithdrawn) g.withdrawn.push(i);

  swapObjectKeys(g.semaforo, i, target);
  swapObjectKeys(g.rltWinnerChecks, i, target);
  swapObjectKeys(g.groupSortChecks, i, target);
  if(g.familyData) swapObjectKeys(g.familyData, i, target);
  if(g.birthdates) swapObjectKeys(g.birthdates, i, target);

  if(g.emotions) Object.values(g.emotions).forEach(day => swapObjectKeys(day, i, target));
  if(g.dailyPoints) Object.values(g.dailyPoints).forEach(day => swapObjectKeys(day, i, target));
  if(g.attendance) Object.values(g.attendance).forEach(day => swapObjectKeys(day, i, target));
  
  if(g.conductaHistory) g.conductaHistory.forEach(h => { if(h.states) swapObjectKeys(h.states, i, target); });
  if(g.grades) g.grades.forEach(gr => { if(gr.grades) swapObjectKeys(gr.grades, i, target); });

  if(g.observations) {
    g.observations.forEach(o => {
      let oIdx = parseInt(o.studentIdx);
      if(oIdx === i) o.studentIdx = target;
      else if(oIdx === target) o.studentIdx = i;
    });
  }

  save(); renderManageList(); renderPortfolio();
}

function addStudent() {
  const inp = document.getElementById('add-inp');
  if (!inp) return;
  const name = inp.value.trim();
  if (!name) { toast('⚠️ Escribe un nombre primero', 'var(--red)'); return; }
  if (gIdx === null || gIdx === undefined || !D.groups[gIdx]) return;
  const g = grp();
  g.students.push(name);
  const newIdx = g.students.length - 1;
  if (!g.rltWinnerChecks) g.rltWinnerChecks = {};
  if (!g.groupSortChecks) g.groupSortChecks = {};
  g.rltWinnerChecks[newIdx] = true;
  g.groupSortChecks[newIdx] = true;
  inp.value = '';
  save(); renderManageList(); renderPortfolio(); toast('✅ Alumno agregado');
}

function toggleWithdrawn(i) {
  if (i === undefined || i === null) return;
  const g = grp();
  if (!g || i < 0 || i >= g.students.length) return;
  if (!g.withdrawn) g.withdrawn = [];
  const idx = g.withdrawn.indexOf(i);
  if (idx > -1) {
    g.withdrawn.splice(idx, 1);
    toast('✅ Alumno reincorporado');
  } else {
    g.withdrawn.push(i);
    toast('⏸ Alumno retirado de listas');
  }
  save(); renderManageList(); renderPortfolio();
}

// ── Auxiliares de reindexación ─────────────────────────────────────────
function reindexFlatObj(obj, removedIdx) {
  if (!obj) return obj;
  const result = {};
  Object.keys(obj).forEach(k => {
    const ki = parseInt(k);
    if (ki === removedIdx) return;
    result[ki > removedIdx ? ki - 1 : ki] = obj[k];
  });
  return result;
}

function reindexDateObj(obj, removedIdx) {
  if (!obj) return obj;
  const result = {};
  Object.keys(obj).forEach(date => {
    result[date] = reindexFlatObj(obj[date], removedIdx);
  });
  return result;
}

function removeStudent(i) {
  if (i === undefined || i === null) return;
  const g = grp();
  if (!g || i < 0 || i >= g.students.length) return;
  if (!confirm('¿Eliminar DEFINITIVAMENTE a este alumno? Se perderá todo su historial. (Sugerencia: Usa el botón "Retirar" para conservar los datos)')) return;

  g.students.splice(i, 1);

  // Reindexar lista de retirados
  if (g.withdrawn) {
    g.withdrawn = g.withdrawn.filter(x => x !== i).map(x => x > i ? x - 1 : x);
  }

  // Reindexar objetos por fecha
  if (g.emotions)    g.emotions    = reindexDateObj(g.emotions, i);
  if (g.dailyPoints) g.dailyPoints = reindexDateObj(g.dailyPoints, i);
  if (g.attendance)  g.attendance  = reindexDateObj(g.attendance, i);

  // semaforo puede ser {fecha:{idx:val}} — detectar estructura
  if (g.semaforo) {
    const firstKey = Object.keys(g.semaforo)[0];
    if (firstKey && g.semaforo[firstKey] !== null && typeof g.semaforo[firstKey] === 'object' && !Array.isArray(g.semaforo[firstKey])) {
      g.semaforo = reindexDateObj(g.semaforo, i);
    } else {
      g.semaforo = reindexFlatObj(g.semaforo, i);
    }
  }

  // Reindexar objetos planos
  if (g.rltWinnerChecks) g.rltWinnerChecks = reindexFlatObj(g.rltWinnerChecks, i);
  if (g.groupSortChecks) g.groupSortChecks = reindexFlatObj(g.groupSortChecks, i);
  if (g.familyData)      g.familyData      = reindexFlatObj(g.familyData, i);
  if (g.birthdates)      g.birthdates      = reindexFlatObj(g.birthdates, i);

  // Reindexar conductaHistory
  if (g.conductaHistory) {
    g.conductaHistory.forEach(h => {
      if (h.states) h.states = reindexFlatObj(h.states, i);
    });
  }

  // Reindexar columnas de calificaciones
  if (g.grades) {
    g.grades.forEach(col => {
      if (col.grades) col.grades = reindexFlatObj(col.grades, i);
    });
  }

  // Reindexar observaciones
  if (g.observations) {
    g.observations = g.observations
      .filter(o => parseInt(o.studentIdx) !== i)
      .map(o => {
        const si = parseInt(o.studentIdx);
        if (si > i) o.studentIdx = si - 1;
        return o;
      });
  }

  save(); renderManageList(); renderPortfolio();
}

// PORTFOLIO
function renderPortfolio() {
  const g = grp();
  document.getElementById('grp-title').textContent = g.name;

  updateStats(); checkClassLockState(); updateConductaTabState();
  renderAtt(); renderGrades(); renderAR(); renderPlan(); renderReports();
  renderDinamicas(); renderCrearGrupos(); renderTareas();
  if (!g.anecdotario) { g.anecdotario = []; save(); }
  renderAnecdotario();
}

function updateStats() {
  const g = grp(); 
  const key = currentMasterDate;
  const activeCount = g.students.length - (g.withdrawn?.length || 0);
  document.getElementById('st-total').textContent = activeCount;
  
  const att = g.attendance[key] || {};
  let p=0,t=0,a=0,j=0;
  Object.entries(att).forEach(([iStr, v]) => { 
    if(isWithdrawn(parseInt(iStr))) return;
    if(v==='p')p++; else if(v==='t')t++; else if(v==='a')a++; else if(v==='j')j++; 
  });
  const marked = p+t+a+j;
  document.getElementById('st-pct').textContent = marked > 0 ? Math.round((p+j)/activeCount*100)+'%' : '—';
  document.getElementById('st-p').textContent=p; document.getElementById('st-t').textContent=t;
  document.getElementById('st-a').textContent=a; document.getElementById('st-j').textContent=j;
  
  let dailyPtsSum = 0;
  if(g.dailyPoints && g.dailyPoints[key]) {
      Object.entries(g.dailyPoints[key]).forEach(([iStr, pts]) => {
        if(!isAbsent(parseInt(iStr)) && !isWithdrawn(parseInt(iStr))) dailyPtsSum += pts;
      });
  }
  document.getElementById('st-alerts').textContent = dailyPtsSum;
}

// TABS
function isAttComplete() {
  const g = grp();
  const key = currentMasterDate;
  const activeCount = g.students.filter((_,i) => !isWithdrawn(i)).length;
  if (activeCount === 0) return true;
  const att = (g.attendance && g.attendance[key]) || {};
  const marked = Object.entries(att).filter(([iStr, v]) => !isWithdrawn(parseInt(iStr)) && v).length;
  return marked >= activeCount;
}

function updateConductaTabState() {
  const tab = document.getElementById('tab-autorregulacion');
  const proceed = document.getElementById('att-proceed-wrap');
  if (!tab) return;
  const complete = isAttComplete();
  if (complete) {
    tab.style.opacity = '1';
    tab.style.cursor = 'pointer';
    tab.title = '';
    tab.style.borderBottom = '';
    if (proceed) proceed.style.display = 'flex';
  } else {
    tab.style.opacity = '0.38';
    tab.style.cursor = 'not-allowed';
    tab.title = 'Completa la asistencia primero';
    if (proceed) proceed.style.display = 'none';
  }
}

function showTab(name) {
  if (typeof rltSpin !== 'undefined' && rltSpin) {
    toast('⚠️ Espera a que termine la dinámica', 'var(--yellow)');
    return;
  }
  if (name === 'autorregulacion' && !isAttComplete()) {
    toast('📋 Completa primero el llamado de lista antes de registrar conducta', 'var(--yellow)');
    return;
  }
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('sec-'+name).classList.add('active');
  document.querySelector(`[data-tab="${name}"]`).classList.add('active');
  
  if(name==='dinamicas') renderDinamicas(); 
  if(name==='reportes') renderReports();
  if(name==='autorregulacion') renderAR(); 
  if(name==='planeador') { renderPlan(); setTimeout(() => { drawPlanArrows(); renderDiarioCRUD(); }, 50); }
  if(name==='anecdotario') renderAnecdotario();
  if(name==='tareas') renderTareas();
}

// =========================================
// ASISTENCIA, EMOCIONES Y WHATSAPP
// =========================================
let attSt = {};
function renderAtt() {
  const g = grp(); const key = currentMasterDate; 
  if(!g.attendance) g.attendance={}; if(!g.emotions) g.emotions={};
  const saved = g.attendance[key]; 
  const savedEmo = g.emotions[key]||{};
  attSt = {};
  
  const el = document.getElementById('att-list'); const sw = document.getElementById('att-sum-wrap');
  const activeStudents = g.students.filter((_,i) => !isWithdrawn(i));
  if(!activeStudents.length){ el.innerHTML=`<div class="empty"><div class="empty-icon">📋</div><div class="empty-msg">No hay alumnos activos.</div></div>`; sw.style.display='none'; return; }
  
  if(saved) {
    g.students.forEach((_, i) => { if(!isWithdrawn(i) && saved[i]) attSt[i] = saved[i]; });
  }

  let visualCount = 1;
  el.innerHTML = g.students.map((s,i) => {
    if(isWithdrawn(i)) return '';
    const st = attSt[i] || ''; 
    const emo = savedEmo[i]||'';

    const rowBorder = st === 'p' ? 'border-color:rgba(34,197,94,0.4);' 
                    : st === 't' ? 'border-color:rgba(245,158,11,0.4);'
                    : st === 'a' ? 'border-color:rgba(239,68,68,0.4);'
                    : st === 'j' ? 'border-color:rgba(16,185,129,0.4);'
                    : 'border-color:rgba(148,163,184,0.25);'; 

    const unmarkedIndicator = !st ? `<span style="font-size:0.6rem;font-weight:800;color:var(--muted);background:var(--surface3);padding:2px 7px;border-radius:5px;text-transform:uppercase;letter-spacing:0.4px;">Sin marcar</span>` : '';

    const cumpleAttHoy = esCumpleHoy(gIdx, i);
    const cumpleAttBtn = cumpleAttHoy ? `<button onclick="tocarCumple()" title="¡Hoy es su cumpleaños!" style="background:rgba(245,158,11,0.15);border:1.5px solid var(--yellow);color:var(--yellow);border-radius:7px;padding:2px 9px;font-size:0.8rem;cursor:pointer;font-family:'Poppins',sans-serif;font-weight:800;" onmouseover="this.style.background='rgba(245,158,11,0.28)'" onmouseout="this.style.background='rgba(245,158,11,0.15)'">🎂</button>` : '';

    const html = `<div class="att-row" id="att-row-${i}" style="${rowBorder}">
      <div class="flex" style="gap:10px; flex-wrap:wrap; align-items:center;">
        <div class="s-num" style="background:${clr(i)};width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:0.7rem;flex-shrink:0;">${visualCount}</div>
        <span style="font-weight:700;font-size:0.82rem;text-transform:uppercase;">${s}</span>
        ${cumpleAttBtn}
        ${unmarkedIndicator}
        
        <button class="wa-bubble" onclick="sendWhatsAppSummary(${i})" title="Enviar reporte al padre">📱 WA Reporte</button>

        <div class="emo-btns">
           <button class="emo-btn ${emo==='happy'?'active':''}" onclick="setEmo(${i},'happy')" title="Feliz/Motivado">😄</button>
           <button class="emo-btn ${emo==='neutral'?'active':''}" onclick="setEmo(${i},'neutral')" title="Neutral">😐</button>
           <button class="emo-btn ${emo==='sad'?'active':''}" onclick="setEmo(${i},'sad')" title="Triste">😔</button>
           <button class="emo-btn ${emo==='tired'?'active':''}" onclick="setEmo(${i},'tired')" title="Cansado/Agotado">😴</button>
           <button class="emo-btn ${emo==='angry'?'active':''}" onclick="setEmo(${i},'angry')" title="Molesto/Frustrado">😡</button>
        </div>
      </div>
      <div class="att-btns">
        <button class="att-btn ${st==='p'?'aP':''}" id="ab-p-${i}" onclick="setAtt(${i},'p')">✅ P</button>
        <button class="att-btn ${st==='t'?'aT':''}" id="ab-t-${i}" onclick="setAtt(${i},'t')">⏰ T</button>
        <button class="att-btn ${st==='a'?'aA':''}" id="ab-a-${i}" onclick="setAtt(${i},'a')">❌ A</button>
        <button class="att-btn ${st==='j'?'aJ':''}" id="ab-j-${i}" onclick="setAtt(${i},'j')">📄 J</button>
      </div>
    </div>`;
    visualCount++;
    return html;
  }).join('');
  sw.style.display='block'; updAttSum();
}

// NUEVO: Reporte por WhatsApp
function sendWhatsAppSummary(i) {
    const g = grp();
    const student = g.students[i];
    const att = (g.attendance[currentMasterDate] || {})[i] || 'Sin marcar';
    const emo = (g.emotions[currentMasterDate] || {})[i] || 'neutral';
    
    const emoMap = { happy: '😄 Feliz', neutral: '😐 Neutral', sad: '😔 Triste', tired: '😴 Cansado', angry: '😡 Molesto' };
    const attMap = { p: '✅ Presente', a: '❌ Ausente', t: '⏰ Tardanza', j: '📄 Justificado', 'Sin marcar': '⬜ Sin marcar' };
    
    const attLabel = attMap[att] || attMap['Sin marcar'];
    const emoLabel = emoMap[emo] || emoMap['neutral'];
    
    const message = `Hola, este es un reporte de *Bitacorap* del día ${formatCustomDate(currentMasterDate)}.\n\n*Estudiante:* ${student}\n*Asistencia:* ${attLabel}\n*Estado emocional:* ${emoLabel}\n\n_Mensaje enviado por el docente._`;
    
    let phone = "";
    if(g.familyData && g.familyData[i]) {
        phone = g.familyData[i].mamaPhone || g.familyData[i].papaPhone || g.familyData[i].apodPhone || g.familyData[i].studentPhone || "";
    }
    
    if(!phone) {
        toast('⚠️ Agrega un teléfono en el Directorio', 'var(--yellow)');
        return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/51${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

function setAtt(i, s) {
  const prev = attSt[i] || '';
  if (prev === s) { delete attSt[i]; } else { attSt[i] = s; }

  ['p','t','a','j'].forEach(x => {
    const b = document.getElementById(`ab-${x}-${i}`);
    if(b) b.className = 'att-btn' + (attSt[i] === x ? ' a'+x.toUpperCase() : '');
  });

  const row = document.getElementById(`att-row-${i}`);
  if(row) {
    const cur = attSt[i] || '';
    row.style.borderColor = cur === 'p' ? 'rgba(34,197,94,0.4)'
                          : cur === 't' ? 'rgba(245,158,11,0.4)'
                          : cur === 'a' ? 'rgba(239,68,68,0.4)'
                          : cur === 'j' ? 'rgba(16,185,129,0.4)'
                          : 'rgba(148,163,184,0.25)';
    const nameSpan = row.querySelector('span[style*="Sin marcar"]') || row.querySelector('span[style*="font-size:0.6rem"]');
    if (nameSpan) nameSpan.remove();
    if (!cur) {
      const badge = document.createElement('span');
      badge.style.cssText = 'font-size:0.6rem;font-weight:800;color:var(--muted);background:var(--surface3);padding:2px 7px;border-radius:5px;text-transform:uppercase;letter-spacing:0.4px;';
      badge.textContent = 'Sin marcar';
      row.querySelector('.flex').appendChild(badge);
    }
  }

  const key = currentMasterDate;
  if(!grp().attendance) grp().attendance = {};
  grp().attendance[key] = { ...attSt };
  save(); updAttSum(); updateStats(); renderAR(); renderDinamicas(); renderCrearGrupos();
}

function setEmo(i, emo) {
  const g = grp(); const key = currentMasterDate;
  if(!g.emotions) g.emotions = {}; if(!g.emotions[key]) g.emotions[key] = {};
  if(g.emotions[key][i] === emo) { delete g.emotions[key][i]; } else { g.emotions[key][i] = emo; }
  save(); renderAtt(); renderARGrafico(); 
}

function updAttSum() {
  const g = grp();
  const activeCount = g.students.filter((_,i) => !isWithdrawn(i)).length;
  const markedKeys = Object.keys(attSt).filter(iStr => !isWithdrawn(parseInt(iStr)) && attSt[iStr]);
  const v = markedKeys.map(iStr => attSt[iStr]);
  const p=v.filter(x=>x==='p').length, t=v.filter(x=>x==='t').length, a=v.filter(x=>x==='a').length, j=v.filter(x=>x==='j').length;
  const unmarked = activeCount - markedKeys.length;
  const pct = activeCount > 0 ? Math.round((p+j) / activeCount * 100) : 0;
  const progressPct = activeCount > 0 ? Math.round(markedKeys.length / activeCount * 100) : 0;

  const pb = document.getElementById('att-progress-bar');
  const pl = document.getElementById('att-progress-label');
  if(pb) pb.style.width = progressPct + '%';
  if(pl) {
    pl.textContent = `${markedKeys.length} / ${activeCount} marcados`;
    pl.style.color = progressPct === 100 ? 'var(--green)' : progressPct > 50 ? 'var(--yellow)' : 'var(--primary-light)';
  }
  updateConductaTabState();

  document.getElementById('att-sum').innerHTML=`
    <div class="att-stat"><div class="att-stat-n c-p">${p}</div><div class="att-stat-l">✅ Presentes</div></div>
    <div class="att-stat"><div class="att-stat-n c-t">${t}</div><div class="att-stat-l">⏰ Tardanzas</div></div>
    <div class="att-stat"><div class="att-stat-n c-a">${a}</div><div class="att-stat-l">❌ Ausentes</div></div>
    <div class="att-stat"><div class="att-stat-n c-j">${j}</div><div class="att-stat-l">📄 Justif.</div></div>
    <div class="att-stat"><div class="att-stat-n" style="color:var(--muted);">${unmarked}</div><div class="att-stat-l">⬜ Sin marcar</div></div>
    <div class="att-stat"><div class="att-stat-n" style="color:var(--primary-light);">${pct}%</div><div class="att-stat-l">📊 Asistencia</div></div>`;
}

function markAllAs(status) {
  const g = grp();
  g.students.forEach((_, i) => { if(!isWithdrawn(i)) attSt[i] = status; });
  const key = currentMasterDate;
  if(!g.attendance) g.attendance = {};
  g.attendance[key] = { ...attSt };
  save(); renderAtt(); updateStats(); renderAR();
  const labels = { p:'✅ Todos marcados como Presentes', a:'❌ Todos marcados como Ausentes' };
  toast(labels[status] || '✅ Hecho');
}

function clearAllAtt() {
  if(!confirm('¿Limpiar toda la asistencia de esta fecha? Los datos se perderán.')) return;
  const g = grp(); const key = currentMasterDate;
  attSt = {};
  if(g.attendance) delete g.attendance[key];
  save(); renderAtt(); updateStats();
  toast('⬜ Asistencia limpiada', 'var(--muted)');
}

// =========================================
// PLANIFICACIÓN v2
// =========================================
const DAY_NAMES_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DAY_NAMES_FULL = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

const getWeekStart = (dateStr) => { const d = new Date(dateStr + 'T12:00:00'); const dow = d.getDay(); const diff = (dow === 0) ? -6 : 1 - dow; d.setDate(d.getDate() + diff); return d; };

function getUpcomingClassDates(startDateKey) {
  const g = grp(); const classDays = g.classDays || [1,2,3,4,5]; let dates = [];
  let d = new Date(startDateKey + 'T12:00:00'); d.setDate(d.getDate() + 1); 
  while(dates.length < 10) { if(classDays.includes(d.getDay())) { dates.push(formatDateKey(d)); } d.setDate(d.getDate() + 1); }
  return dates;
}

const formatDateKey = (date) => { const y = date.getFullYear(); const m = String(date.getMonth()+1).padStart(2,'0'); const d = String(date.getDate()).padStart(2,'0'); return `${y}-${m}-${d}`; };

function renderPlan() {
  if(gIdx === null) return;
  const g = grp(); if(!g.sessions) g.sessions = {}; const classDays = g.classDays || [1,2,3,4,5];
  const weekStart = getWeekStart(currentMasterDate); const COL_TO_JSDAY = [1,2,3,4,5]; 
  const weekDates = COL_TO_JSDAY.map((jsDay, colIdx) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + colIdx); return d; });
  const todayStr = todayKey(); const grid = document.getElementById('pb-grid'); grid.innerHTML = '';

  weekDates.forEach((d, colIdx) => {
    const jsDay = d.getDay(); const dk = formatDateKey(d); const isToday = dk === todayStr; const hasClass = classDays.includes(jsDay);
    const col = document.createElement('div'); col.className = 'pb-day-col';
    const header = document.createElement('div'); header.className = `pb-day-header ${isToday ? 'today' : ''}`;
    header.innerHTML = `${DAY_NAMES_SHORT[jsDay]} ${d.getDate()} <span style="display:block; font-size:0.6rem; opacity:0.6;">${d.toLocaleDateString('es-PE',{month:'short'})}</span>`;
    col.appendChild(header);

    if(hasClass) {
      const session = g.sessions[dk]; const box = document.createElement('div'); box.id = `class-box-${dk}`;
      
      if(session && (session.summary || (session.tasks && session.tasks.length))) {
        box.className = 'pb-class-box';
        const pendingTasks = (session.tasks || []).filter(t => !t.done);
        const grupalTasks = (session.tasks || []).filter(t => t.grupal);
        let html = `<div class="pb-course-name">${g.name}</div>`;
        if(session.summary) { html += `<div class="pb-summary-preview">📝 ${session.summary}</div>`; } else { html += `<div style="flex:1;"></div>`; }
        if(pendingTasks.length > 0) { html += `<div class="pb-tasks-preview">📌 ${pendingTasks.length} Tarea(s) pdte.${grupalTasks.length ? ' · 👥 ' + grupalTasks.length + ' grupal(es)' : ''}</div>`; }
        box.innerHTML = html;
      } else {
        box.className = 'pb-class-box is-empty';
        box.innerHTML = `<div class="pb-course-name" style="opacity:0.5;">${g.name}</div><div style="flex:1; display:flex; align-items:center; justify-content:center; color:var(--primary); font-size:0.75rem; font-weight:800; text-transform:uppercase;">+ Registrar Clase</div>`;
      }
      box.onclick = () => openSessionModalV2(dk); col.appendChild(box);
    } else {
      const empty = document.createElement('div'); empty.style.flex = "1"; empty.style.border = "1px dashed var(--border)"; empty.style.borderRadius = "12px"; empty.style.opacity = "0.3"; col.appendChild(empty);
    }
    grid.appendChild(col);
  });
  setTimeout(drawPlanArrows, 50);
}

function drawPlanArrows() {
  const svg = document.getElementById('arrows-svg'); if(!svg) return; svg.innerHTML = ''; 
  const g = grp(); if(!g.sessions) return;
  const boardWrap = svg.closest('.planning-board-wrap'); const boardRect = boardWrap.getBoundingClientRect();
  
  Object.keys(g.sessions).forEach(sourceDk => {
    const session = g.sessions[sourceDk]; const sourceBox = document.getElementById(`class-box-${sourceDk}`);
    if(!session.tasks || session.tasks.length === 0) return;
    
    session.tasks.forEach(task => {
      if(!task.due || task.done) return;
      const targetDk = task.due; const targetBox = document.getElementById(`class-box-${targetDk}`);
      if(sourceBox && targetBox) { drawCurve(svg, sourceBox, targetBox, boardRect); } 
      else if (sourceBox && targetDk > sourceDk) { drawCurveToOffscreen(svg, sourceBox, boardRect, 'right'); }
      else if (targetBox && sourceDk < targetDk) { drawCurveFromOffscreen(svg, targetBox, boardRect, 'left'); }
    });
  });
}

function drawCurve(svg, elSource, elTarget, boardRect) {
  const sR = elSource.getBoundingClientRect(); const tR = elTarget.getBoundingClientRect();
  const startX = sR.right - boardRect.left - 10; const startY = sR.top - boardRect.top + (sR.height / 2);
  const endX = tR.left - boardRect.left + 10; const endY = tR.top - boardRect.top + (tR.height / 2);
  const controlPointX = startX + (endX - startX) / 2;
  const pathData = `M ${startX} ${startY} C ${controlPointX} ${startY - 40}, ${controlPointX} ${endY - 40}, ${endX - 5} ${endY}`;
  appendPathToSvg(svg, pathData); appendArrowHead(svg, endX, endY, "right");
}

function drawCurveToOffscreen(svg, elSource, boardRect, dir) {
  const sR = elSource.getBoundingClientRect();
  const startX = sR.right - boardRect.left - 10; const startY = sR.top - boardRect.top + (sR.height / 2);
  const endX = boardRect.width - 20; const endY = startY;
  const pathData = `M ${startX} ${startY} Q ${(startX+endX)/2} ${startY-20}, ${endX} ${endY}`;
  appendPathToSvg(svg, pathData); appendArrowHead(svg, endX, endY, "right"); appendTextToSvg(svg, endX - 10, endY - 10, "Sigue ⏭");
}

function drawCurveFromOffscreen(svg, elTarget, boardRect, dir) {
  const tR = elTarget.getBoundingClientRect();
  const startX = 20; const startY = tR.top - boardRect.top + (tR.height / 2);
  const endX = tR.left - boardRect.left + 10; const endY = startY;
  const pathData = `M ${startX} ${startY} Q ${(startX+endX)/2} ${startY-20}, ${endX-5} ${endY}`;
  appendPathToSvg(svg, pathData); appendArrowHead(svg, endX, endY, "right"); appendTextToSvg(svg, startX, startY - 10, "⏮ Pdt.");
}

function appendPathToSvg(svg, d) { const path = document.createElementNS("http://www.w3.org/2000/svg", "path"); path.setAttribute("d", d); path.setAttribute("class", "task-arrow-path"); svg.appendChild(path); }
function appendArrowHead(svg, x, y, dir) { const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon"); poly.setAttribute("points", `${x-8},${y-5} ${x+2},${y} ${x-8},${y+5}`); poly.setAttribute("class", "task-arrow-head"); svg.appendChild(poly); }
function appendTextToSvg(svg, x, y, text) { const t = document.createElementNS("http://www.w3.org/2000/svg", "text"); t.setAttribute("x", x); t.setAttribute("y", y); t.setAttribute("fill", "var(--yellow)"); t.setAttribute("font-size", "10px"); t.setAttribute("font-weight", "bold"); t.textContent = text; svg.appendChild(t); }

// =========================================
// PLANEADOR - MODAL SESIÓN Y TAREAS
// =========================================
let editingSessionDk = null;
function openSessionModalV2(dk) {
  editingSessionDk = dk;
  const g = grp();
  if(!g.sessions) g.sessions = {};
  const session = g.sessions[dk] || { summary: '', tasks: [] };
  
  const d = new Date(dk + 'T12:00:00');
  document.getElementById('spm-day-badge').innerHTML = `📅 ${DAY_NAMES_FULL[d.getDay()]} ${d.getDate()} de ${d.toLocaleDateString('es-PE',{month:'long'})}`;
  
  document.getElementById('spm-summary').value = session.summary || '';
  document.getElementById('spm-btn-delete').style.display = session.summary ? 'inline-flex' : 'none';
  openModal('mSessionPlan');
}

function renderSessionTasks() {
  const el = document.getElementById('spm-task-list');
  if (!el) return;
  const countEl = document.getElementById('spm-tasks-count');
  const g = grp(); const session = g.sessions[editingSessionDk];
  if(!session || !session.tasks || session.tasks.length === 0) {
    el.innerHTML = '<div style="font-size:0.75rem; color:var(--muted); font-style:italic;">No hay tareas asignadas en esta sesión.</div>';
    if (countEl) countEl.textContent = '0'; return;
  }
  if (countEl) countEl.textContent = session.tasks.length;
  el.innerHTML = session.tasks.map((t, i) => `
    <div class="task-item">
      <input type="checkbox" class="task-cb" ${t.done ? 'checked' : ''} onchange="toggleTaskDone(${i})">
      <div class="task-item-text ${t.done ? 'task-done' : ''}">
        ${t.desc} 
        ${t.grupal ? '<span style="background:rgba(14,165,233,0.15); color:var(--primary-light); font-size:0.65rem; padding:2px 6px; border-radius:4px; margin-left:6px;">👥 Grupal</span>' : ''}
        <div class="task-item-date">Para: ${formatShortDate(t.due)}</div>
      </div>
      <button class="btn-danger btn-xs" onclick="deleteSessionTask(${i})">✕</button>
    </div>
  `).join('');
}

function toggleNewTaskGrupal() {
  const chk = document.getElementById('spm-task-grupal'); const lbl = document.getElementById('spm-grupal-label');
  lbl.style.borderColor = chk.checked ? 'var(--primary)' : 'var(--border)';
  lbl.style.background = chk.checked ? 'rgba(14,165,233,0.1)' : 'var(--surface3)';
}

function addSessionTask() {
  const desc = document.getElementById('spm-new-task').value.trim();
  let due = document.getElementById('spm-task-due-select').value;
  const grupal = document.getElementById('spm-task-grupal').checked;
  
  if(!desc) { toast('⚠️ Escribe la descripción', 'var(--red)'); return; }
  if(!due) { const upc = getUpcomingClassDates(editingSessionDk); if(upc.length) due = upc[0]; else return; }
  
  const g = grp(); if(!g.sessions[editingSessionDk]) g.sessions[editingSessionDk] = { summary:'', tasks:[] };
  if(!g.sessions[editingSessionDk].tasks) g.sessions[editingSessionDk].tasks = [];
  
  g.sessions[editingSessionDk].tasks.push({ desc, due, grupal, done: false });
  document.getElementById('spm-new-task').value = ''; renderSessionTasks();
}

function toggleTaskDone(i) { grp().sessions[editingSessionDk].tasks[i].done = !grp().sessions[editingSessionDk].tasks[i].done; renderSessionTasks(); }
function deleteSessionTask(i) { grp().sessions[editingSessionDk].tasks.splice(i, 1); renderSessionTasks(); }

function saveSession() {
  const g = grp();
  if(!g.sessions) g.sessions = {};
  if(!g.sessions[editingSessionDk]) g.sessions[editingSessionDk] = { summary: '', tasks: [] };
  const summary = document.getElementById('spm-summary').value.trim();
  g.sessions[editingSessionDk].summary = summary;
  save(); renderPlan(); renderDiarioCRUD(); closeSessionModal();
  toast(summary ? '✅ Resumen guardado' : '🗑 Sesión guardada');
}

function deleteSession() {
  if(!confirm('¿Eliminar todos los datos de esta sesión?')) return;
  delete grp().sessions[editingSessionDk]; save(); renderPlan(); closeSessionModal(); toast('🗑 Sesión eliminada', 'var(--red)');
}
function closeSessionModal() { editingSessionDk = null; closeModal('mSessionPlan'); }

/* --- renderDiarioCRUD: lista CRUD de todos los resúmenes guardados --- */
function renderDiarioCRUD() {
  const el = document.getElementById('diario-crud-list');
  const countEl = document.getElementById('diario-crud-count');
  if (!el) return;
  const g = grp();
  if (!g.sessions) { el.innerHTML = '<div class="empty"><div class="empty-icon">📝</div><div class="empty-msg">No hay resúmenes registrados aún.</div></div>'; if(countEl) countEl.textContent = '0'; return; }

  const entries = Object.entries(g.sessions)
    .filter(([dk, s]) => s && s.summary)
    .sort((a, b) => new Date(b[0]) - new Date(a[0]));

  if(countEl) countEl.textContent = entries.length;

  if (!entries.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📝</div><div class="empty-msg">No hay resúmenes registrados aún. Haz clic en un día de clase para agregar.</div></div>';
    return;
  }

  el.innerHTML = entries.map(([dk, s]) => {
    const d = new Date(dk + 'T12:00:00');
    const fechaStr = d.toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const preview = s.summary.length > 120 ? s.summary.substring(0, 120) + '…' : s.summary;
    return `<div style="background:var(--surface2);border-left:3px solid var(--primary);border-radius:10px;padding:12px 16px;margin-bottom:10px;display:flex;flex-direction:column;gap:6px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div style="font-size:0.75rem;font-weight:800;color:var(--primary-light);text-transform:capitalize;">📅 ${fechaStr}</div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="openSessionModalV2('${dk}')" style="font-size:0.7rem;padding:4px 10px;">✏️ Editar</button>
          <button class="btn btn-sm" onclick="deleteDiarioEntry('${dk}')" style="font-size:0.7rem;padding:4px 10px;background:var(--red);color:#fff;border:none;">🗑 Eliminar</button>
        </div>
      </div>
      <div style="font-size:0.82rem;color:var(--text);line-height:1.5;">${preview}</div>
    </div>`;
  }).join('');
}

function deleteDiarioEntry(dk) {
  if (!confirm('¿Eliminar el resumen de esta sesión?')) return;
  const g = grp();
  if (g.sessions && g.sessions[dk]) {
    delete g.sessions[dk];
    save(); renderPlan(); renderDiarioCRUD();
    toast('🗑 Resumen eliminado', 'var(--red)');
  }
}

// =========================================
// BLOQUEO DE CLASE
// =========================================
function checkClassLockState() {
  const g = grp(); const isLocked = g.lockedDays && g.lockedDays.includes(currentMasterDate);
  const view = document.getElementById('portfolio');
  const btnClose = document.getElementById('btn-cerrar-clase');
  const lblClosed = document.getElementById('lbl-clase-cerrada');
  const btnUnlock = document.getElementById('btn-desbloquear-clase');

  if(isLocked) {
    view.classList.add('locked-view');
    btnClose.style.display = 'none'; lblClosed.style.display = 'inline-block'; btnUnlock.style.display = 'inline-block';
  } else {
    view.classList.remove('locked-view');
    btnClose.style.display = 'inline-flex'; lblClosed.style.display = 'none'; btnUnlock.style.display = 'none';
  }
}

function confirmCloseClass() {
  const g = grp(); if(!g.lockedDays) g.lockedDays = [];
  if(!g.lockedDays.includes(currentMasterDate)) g.lockedDays.push(currentMasterDate);
  save(); checkClassLockState(); closeModal('mCloseClass'); toast('🔒 Clase Cerrada y Guardada');
}

function unlockClass() {
  const g = grp(); if(g.lockedDays) g.lockedDays = g.lockedDays.filter(d => d !== currentMasterDate);
  save(); checkClassLockState(); toast('🔓 Clase Desbloqueada');
}

// =========================================
// CALIFICACIONES
// =========================================
function renderGrades() {
  const g = grp(); const el = document.getElementById('grade-list');
  if(!g.grades) g.grades = [];
  
  let html = `<table class="g-tbl"><tr><th>N°</th><th>Alumno</th>`;
  g.grades.forEach((c, i) => { html += `<th>${c.name} <button class="btn-danger btn-xs" style="margin-left:5px;" onclick="deleteGradeCol(${i})">✕</button></th>`; });
  html += `</tr>`;
  
  g.students.forEach((s, i) => {
    if(isWithdrawn(i)) return;
    html += `<tr><td style="color:var(--muted);">${i+1}</td><td style="font-weight:700;">${s}</td>`;
    g.grades.forEach((c, cIdx) => {
      const v = c.grades[i] || '';
      const badgeClass = v==='AD'?'gAD':v==='A'?'gA':v==='B'?'gB':v==='C'?'gC':'';
      html += `<td>${v ? `<span class="g-badge ${badgeClass}" onclick="editGrade(${i}, ${cIdx})">${v}</span>` : `<input type="text" class="g-inp" onblur="updateGrade(${i}, ${cIdx}, this.value)">`}</td>`;
    });
    html += `</tr>`;
  });
  el.innerHTML = html + `</table>`;
}

function saveGrades() {
  const crit = document.getElementById('g-criteria').value.trim();
  if(!crit) { toast('⚠️ Escribe un criterio', 'var(--red)'); return; }
  grp().grades.push({ name: crit, grades: {} });
  document.getElementById('g-criteria').value = ''; save(); renderGrades(); toast('✅ Columna agregada');
}

function updateGrade(sIdx, cIdx, val) {
  val = val.trim().toUpperCase();
  if(['AD','A','B','C'].includes(val)) { grp().grades[cIdx].grades[sIdx] = val; save(); renderGrades(); } 
  else if(val !== '') { toast('⚠️ Solo notas: AD, A, B, C', 'var(--yellow)'); renderGrades(); }
}

function editGrade(sIdx, cIdx) { delete grp().grades[cIdx].grades[sIdx]; save(); renderGrades(); }
function deleteGradeCol(cIdx) { if(!confirm('¿Eliminar columna de calificaciones?')) return; grp().grades.splice(cIdx, 1); save(); renderGrades(); }

// =========================================
// REPORTES SIAGIE
// =========================================
function renderReports() {
  const setEl = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  const g = grp(); const activeCount = g.students.filter((_,i) => !isWithdrawn(i)).length;
  setEl('rpt-total', activeCount);

  let totP=0, totA=0, totPts=0, totReds=0;
  Object.keys(g.attendance || {}).forEach(k => {
    Object.entries(g.attendance[k]).forEach(([iStr, v]) => { if(!isWithdrawn(parseInt(iStr))) { if(v==='p'||v==='t'||v==='j') totP++; else if(v==='a') totA++; } });
  });
  const pct = (totP+totA)>0 ? Math.round((totP/(totP+totA))*100) : 0;
  setEl('rpt-att', pct + '%');

  Object.values(g.dailyPoints || {}).forEach(day => { Object.entries(day).forEach(([iStr, p]) => { if(!isWithdrawn(parseInt(iStr))) totPts += p; }); });
  setEl('rpt-pts', totPts);

  Object.values(g.semaforo || {}).forEach(day => { Object.entries(day).forEach(([iStr, s]) => { if(!isWithdrawn(parseInt(iStr)) && s==='r') totReds++; }); });
  setEl('rpt-reds', totReds);

  const histEl = document.getElementById('att-hist');
  if (!histEl) return;
  const dates = Object.keys(g.attendance || {}).sort((a,b)=>new Date(b)-new Date(a)).slice(0,5);
  if(!dates.length) { histEl.innerHTML='<div style="color:var(--muted);text-align:center;padding:20px;">Sin datos.</div>'; return; }
  histEl.innerHTML = dates.map(k => {
    let p=0, t=0;
    Object.entries(g.attendance[k]).forEach(([iStr,v]) => { if(!isWithdrawn(parseInt(iStr))) { if(v==='p'||v==='t'||v==='j')p++; t++; } });
    const w = t>0 ? Math.round((p/t)*100) : 0;
    return `<div class="hist-item"><div class="hist-date">${formatShortDate(k)}</div><div class="hist-bar"><div class="hist-fill" style="width:${w}%"></div></div><div style="font-size:0.75rem;font-weight:800;width:40px;text-align:right;">${w}%</div></div>`;
  }).join('');
}

function downloadAttReport(type) {
  const g = grp(); let datesToInclude = []; const currentObj = new Date(currentMasterDate + 'T12:00:00');

  if (type === 'daily') { datesToInclude = [currentMasterDate]; }
  else if (type === 'weekly') {
    const weekStart = getWeekStart(currentMasterDate);
    for(let i=0; i<5; i++) { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); datesToInclude.push(formatDateKey(d)); }
  } else if (type === 'monthly') {
    const y = currentObj.getFullYear(); const m = currentObj.getMonth();
    const firstDay = new Date(y, m, 1); const lastDay = new Date(y, m + 1, 0);
    for(let d=firstDay; d<=lastDay; d.setDate(d.getDate()+1)) { if(d.getDay() !== 0 && d.getDay() !== 6) { datesToInclude.push(formatDateKey(d)); } }
  }

  // --- Generar Word (.docx) formato SIAGIE MINEDU Perú ---
  const typeLabels = { daily: 'DIARIO', weekly: 'SEMANAL', monthly: 'MENSUAL' };
  const typeLabel = typeLabels[type] || type.toUpperCase();
  const mesNombre = currentObj.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  const gradoSeccion = `${g.grade || ''} ${g.section ? '"' + g.section + '"' : ''}`.trim();

  // Cabeceras de fecha para la tabla
  const colHeaders = datesToInclude.map(dk => {
    const d = new Date(dk + 'T12:00:00');
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
  });

  // Filas de estudiantes
  let filasTR = '';
  let nro = 1;
  g.students.forEach((s, i) => {
    if (isWithdrawn(i)) return;
    let celdas = '';
    let totP = 0, totA = 0, totT = 0, totJ = 0;
    datesToInclude.forEach(dk => {
      const val = (g.attendance[dk] && g.attendance[dk][i]) ? g.attendance[dk][i].toUpperCase() : '-';
      let color = '#ffffff';
      if (val === 'P') { color = '#d4edda'; totP++; }
      else if (val === 'A') { color = '#f8d7da'; totA++; }
      else if (val === 'T') { color = '#fff3cd'; totT++; }
      else if (val === 'J') { color = '#d1ecf1'; totJ++; }
      celdas += `<td style="text-align:center;background:${color};font-weight:700;border:1px solid #999;">${val}</td>`;
    });
    const rowBg = nro % 2 === 0 ? '#f5f7fa' : '#ffffff';
    filasTR += `<tr style="background:${rowBg};">
      <td style="text-align:center;border:1px solid #999;padding:4px 6px;">${nro}</td>
      <td style="border:1px solid #999;padding:4px 8px;font-weight:600;">${s}</td>
      ${celdas}
      <td style="text-align:center;border:1px solid #999;font-weight:700;color:#155724;">${totP}</td>
      <td style="text-align:center;border:1px solid #999;font-weight:700;color:#721c24;">${totA}</td>
      <td style="text-align:center;border:1px solid #999;font-weight:700;color:#856404;">${totT}</td>
      <td style="text-align:center;border:1px solid #999;font-weight:700;color:#0c5460;">${totJ}</td>
    </tr>`;
    nro++;
  });

  const colHeadersHTML = colHeaders.map(h => `<th style="text-align:center;background:#1e3a5f;color:#fff;border:1px solid #999;padding:5px 4px;font-size:11px;">${h}</th>`).join('');

  const html = `
  <html xmlns:o='urn:schemas-microsoft-com:office:office'
        xmlns:w='urn:schemas-microsoft-com:office:word'
        xmlns='http://www.w3.org/TR/REC-html40'>
  <head><meta charset='utf-8'>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11pt; margin: 20px; }
    h2 { text-align: center; font-size: 13pt; margin: 4px 0; text-transform: uppercase; }
    h3 { text-align: center; font-size: 11pt; font-weight: normal; margin: 2px 0; }
    .encabezado-box { border: 2px solid #1e3a5f; padding: 10px 14px; margin-bottom: 14px; background: #f0f4fa; }
    .enc-row { display: flex; gap: 30px; margin-top: 6px; font-size: 10pt; }
    .enc-field { flex: 1; }
    .enc-label { font-weight: 700; color: #1e3a5f; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
    th { background: #1e3a5f; color: white; padding: 6px 5px; border: 1px solid #999; }
    td { padding: 4px 6px; border: 1px solid #999; }
    .leyenda { margin-top: 14px; font-size: 9pt; display: flex; gap: 20px; flex-wrap: wrap; }
    .ley-item { display: flex; align-items: center; gap: 5px; }
    .ley-box { width: 14px; height: 14px; border: 1px solid #999; display: inline-block; }
    .firma-row { display: flex; justify-content: space-between; margin-top: 50px; font-size: 10pt; }
    .firma-col { text-align: center; width: 40%; border-top: 1px solid #333; padding-top: 6px; }
    .pie { text-align: center; margin-top: 30px; font-size: 8pt; color: #666; }
  </style>
  </head>
  <body>
    <div class="encabezado-box">
      <h2>MINISTERIO DE EDUCACIÓN DEL PERÚ — MINEDU</h2>
      <h2>REGISTRO DE ASISTENCIA — SIAGIE</h2>
      <h3>REPORTE ${typeLabel} · ${mesNombre.toUpperCase()}</h3>
      <div class="enc-row">
        <div class="enc-field"><span class="enc-label">INSTITUCIÓN EDUCATIVA:</span> ${g.school || 'I.E. ___________________________'}</div>
        <div class="enc-field"><span class="enc-label">UGEL:</span> ____________________</div>
        <div class="enc-field"><span class="enc-label">REGIÓN:</span> Cajamarca</div>
      </div>
      <div class="enc-row">
        <div class="enc-field"><span class="enc-label">DOCENTE:</span> ${g.teacher || '___________________________'}</div>
        <div class="enc-field"><span class="enc-label">ÁREA CURRICULAR:</span> ${g.name}</div>
        <div class="enc-field"><span class="enc-label">GRADO Y SECCIÓN:</span> ${gradoSeccion}</div>
      </div>
      <div class="enc-row">
        <div class="enc-field"><span class="enc-label">NIVEL:</span> Secundaria</div>
        <div class="enc-field"><span class="enc-label">TURNO:</span> ________________</div>
        <div class="enc-field"><span class="enc-label">AÑO LECTIVO:</span> ${currentObj.getFullYear()}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:30px;">N°</th>
          <th style="text-align:left;min-width:180px;">APELLIDOS Y NOMBRES</th>
          ${colHeadersHTML}
          <th style="background:#155724;color:#fff;border:1px solid #999;">P</th>
          <th style="background:#721c24;color:#fff;border:1px solid #999;">A</th>
          <th style="background:#856404;color:#fff;border:1px solid #999;">T</th>
          <th style="background:#0c5460;color:#fff;border:1px solid #999;">J</th>
        </tr>
      </thead>
      <tbody>${filasTR}</tbody>
    </table>

    <div class="leyenda">
      <strong>LEYENDA:</strong>
      <div class="ley-item"><div class="ley-box" style="background:#d4edda;"></div> <b>P</b> = Presente</div>
      <div class="ley-item"><div class="ley-box" style="background:#f8d7da;"></div> <b>A</b> = Ausente</div>
      <div class="ley-item"><div class="ley-box" style="background:#fff3cd;"></div> <b>T</b> = Tardanza</div>
      <div class="ley-item"><div class="ley-box" style="background:#d1ecf1;"></div> <b>J</b> = Justificado</div>
      <div class="ley-item"> <b>-</b> = Sin registro</div>
    </div>

    <div class="firma-row">
      <div class="firma-col">DIRECTOR(A) DE LA I.E.</div>
      <div class="firma-col">DOCENTE RESPONSABLE</div>
    </div>

    <div class="pie">
      Generado con Bitacorap🤖 — Sistema de Gestión Pedagógica · ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
    </div>
  </body>
  </html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Asistencia_SIAGIE_${g.name}_${typeLabel}_${todayKey()}.doc`;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  toast('📥 Reporte Word SIAGIE descargado');
}

// =========================================
// ANECDOTARIO
// =========================================
let currentAnecFilter = 'all';

function showAnecTab(tabId, btn) {
  document.querySelectorAll('.anec-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.anec-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active'); document.getElementById('anec-panel-'+tabId).classList.add('active');
  if(tabId === 'todas') renderAnecList('todas', currentAnecFilter);
  if(tabId === 'por-alumno') renderAnecPorAlumno();
  if(tabId === 'tutoria') renderAnecList('tutoria', 'tutoria');
}

function filterAnec(type, btn) {
  document.querySelectorAll('.anec-filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active'); currentAnecFilter = type; renderAnecList('todas', type);
}

function renderAnecdotario() {
  const g = grp(); if(!g.anecdotario) g.anecdotario = [];
  renderAnecStats(); renderAnecList('todas', currentAnecFilter);
  
  const sel = document.getElementById('anec-student-sel'); const selFilter = document.getElementById('anec-student-filter');
  let opts = '<option value="">-- Selecciona alumno --</option>';
  g.students.forEach((s,i) => { if(!isWithdrawn(i)) opts += `<option value="${i}">${s}</option>`; });
  sel.innerHTML = opts; selFilter.innerHTML = opts;
}

function renderAnecStats() {
  const g = grp(); const a = g.anecdotario || [];
  const pos = a.filter(x=>x.type==='positivo').length; const neg = a.filter(x=>x.type==='negativo').length; const tut = a.filter(x=>x.type==='tutoria').length;
  
  document.getElementById('anec-stat-row').innerHTML = `
    <div class="anec-stat-pill"><div class="anec-stat-n">${a.length}</div><div class="anec-stat-l">Total Regs</div></div>
    <div class="anec-stat-pill"><div class="anec-stat-n" style="color:var(--green);">${pos}</div><div class="anec-stat-l">Positivos</div></div>
    <div class="anec-stat-pill"><div class="anec-stat-n" style="color:var(--red);">${neg}</div><div class="anec-stat-l">Negativos</div></div>
    <div class="anec-stat-pill"><div class="anec-stat-n" style="color:#a78bfa;">${tut}</div><div class="anec-stat-l">Evid. Tutoría</div></div>
  `;
}

function generateAnecHTML(entries) {
  if(!entries.length) return `<div class="anec-empty">No hay entradas registradas que coincidan con los filtros.</div>`;
  const badges = {
    positivo: { class: 'anec-tb-positivo', label: '🌟 Positivo' }, negativo: { class: 'anec-tb-negativo', label: '⚠️ Negativo' },
    salud: { class: 'anec-tb-salud', label: '🏥 Salud' }, intervencion: { class: 'anec-tb-intervencion', label: '🛠️ Intervención' },
    tutoria: { class: 'anec-tb-tutoria', label: '🤝 Tutoría' }, neutro: { class: 'anec-tb-neutro', label: '📝 Otro' }
  };
  return entries.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(e => `
    <div class="anec-entry tipo-${e.type}" onclick="openAnecModal(${e.id})" style="cursor:pointer;">
      <div class="anec-entry-header"><div class="anec-entry-meta"><span class="anec-student-name">${grp().students[e.studentIdx] || 'Alumno Retirado'}</span><span class="anec-date">📅 ${formatCustomDate(e.date)}</span></div><span class="anec-type-badge ${badges[e.type].class}">${badges[e.type].label}</span></div>
      <div class="anec-content">${e.desc}</div>${e.action ? `<div class="anec-intervention"><strong>Medida tomada:</strong> ${e.action}</div>` : ''}
    </div>`).join('');
}

function renderAnecList(target, filterType) {
  const g = grp(); const list = g.anecdotario || []; let filtered = list;
  if(filterType !== 'all') filtered = list.filter(e => e.type === filterType);
  if(target === 'todas') document.getElementById('anec-list-todas').innerHTML = generateAnecHTML(filtered);
  if(target === 'tutoria') document.getElementById('anec-list-tutoria').innerHTML = generateAnecHTML(filtered);
}

function renderAnecPorAlumno() {
  const sIdx = document.getElementById('anec-student-filter').value; const el = document.getElementById('anec-list-alumno');
  if(!sIdx) { el.innerHTML = `<div class="anec-empty">Selecciona un alumno para ver su anecdotario.</div>`; return; }
  const g = grp(); const filtered = (g.anecdotario||[]).filter(e => e.studentIdx == sIdx);
  el.innerHTML = generateAnecHTML(filtered);
}

function openAnecModal(editId = null) {
  const g = grp(); document.getElementById('anec-student-sel').disabled = false;
  if(editId !== null) {
    const e = g.anecdotario.find(x => x.id === editId); if(!e) return;
    document.getElementById('anec-student-sel').value = e.studentIdx; document.getElementById('anec-student-sel').disabled = true;
    document.getElementById('anec-type-sel').value = e.type; document.getElementById('anec-desc').value = e.desc;
    document.getElementById('anec-intervencion').value = e.action || ''; document.getElementById('anec-fecha').value = e.date;
    document.getElementById('anec-edit-idx').value = editId; document.getElementById('anec-btn-delete').style.display = 'inline-block';
  } else {
    document.getElementById('anec-student-sel').value = ''; document.getElementById('anec-type-sel').value = 'neutro';
    document.getElementById('anec-desc').value = ''; document.getElementById('anec-intervencion').value = '';
    document.getElementById('anec-fecha').value = currentMasterDate; document.getElementById('anec-edit-idx').value = '-1';
    document.getElementById('anec-btn-delete').style.display = 'none';
  }
  openModal('mAnecdotario');
}

function saveAnecEntry() {
  const g = grp();
  const studentIdx = document.getElementById('anec-student-sel').value; const type = document.getElementById('anec-type-sel').value;
  const desc = document.getElementById('anec-desc').value.trim(); const action = document.getElementById('anec-intervencion').value.trim();
  const date = document.getElementById('anec-fecha').value; const editId = parseInt(document.getElementById('anec-edit-idx').value);

  if(!studentIdx) { toast('⚠️ Selecciona un alumno', 'var(--red)'); return; }
  if(!desc) { toast('⚠️ Escribe la descripción', 'var(--red)'); return; }
  
  if(!g.anecdotario) g.anecdotario = [];

  if(editId !== -1) {
    const idx = g.anecdotario.findIndex(x => x.id === editId);
    if(idx > -1) { g.anecdotario[idx] = { ...g.anecdotario[idx], type, desc, action, date }; }
  } else {
    const newId = g.anecdotario.length > 0 ? Math.max(...g.anecdotario.map(x=>x.id)) + 1 : 1;
    g.anecdotario.push({ id: newId, studentIdx: parseInt(studentIdx), type, desc, action, date });
  }
  save(); renderAnecdotario(); closeModal('mAnecdotario'); toast('✅ Anecdotario actualizado');
}

function deleteAnecEntry() {
  if(!confirm('¿Eliminar esta entrada permanentemente?')) return;
  const editId = parseInt(document.getElementById('anec-edit-idx').value); const g = grp();
  g.anecdotario = g.anecdotario.filter(x => x.id !== editId);
  save(); renderAnecdotario(); closeModal('mAnecdotario'); toast('🗑 Entrada eliminada', 'var(--red)');
}



// =========================================
// DINÁMICAS (RULETA Y SLOT) - OPTIMIZADAS
// =========================================
let dynamicsType = 'ruleta'; let currentAngle = 0; let spinTimeout = null; let rltSpin = false;

function switchDynamic(type) {
  if (rltSpin) { toast('⚠️ Espera a que termine la dinámica', 'var(--yellow)'); return; }
  dynamicsType = type;
  document.querySelectorAll('.dyn-tab').forEach(t=>t.classList.remove('active')); document.getElementById('tab-dyn-'+type).classList.add('active');
  document.getElementById('wrap-ruleta').style.display = type==='ruleta' ? 'flex' : 'none'; document.getElementById('wrap-slot').style.display = type==='slot' ? 'flex' : 'none';
  renderDinamicas();
}

function actionRltStudents(action) {
  if (rltSpin) return; const g = grp(); if(!g.rltWinnerChecks) g.rltWinnerChecks = {};
  g.students.forEach((s,i) => { if(!isWithdrawn(i) && !isAbsent(i)) g.rltWinnerChecks[i] = (action === 'all'); });
  save(); renderDinamicas();
}

function toggleRltStudent(i, isChecked) {
  if (rltSpin) return; const g = grp(); if(!g.rltWinnerChecks) g.rltWinnerChecks = {};
  g.rltWinnerChecks[i] = isChecked; save(); renderDinamicas();
}

function renderDinamicas() {
  if(gIdx === null) return; const g = grp(); if(!g.rltWinnerChecks) g.rltWinnerChecks = {};
  
  let validCount = 0; let totalCount = 0; let html = '';
  g.students.forEach((s, i) => {
    if(isWithdrawn(i) || isAbsent(i)) return;
    totalCount++; const isCh = g.rltWinnerChecks[i] !== false; if(isCh) validCount++;
    html += `
    <label class="student-check-item ${isCh ? 'selected' : ''}" style="${rltSpin ? 'opacity:0.5; pointer-events:none;' : ''}">
      <input type="checkbox" onchange="toggleRltStudent(${i}, this.checked)" ${isCh ? 'checked' : ''} ${rltSpin ? 'disabled' : ''}>
      <div class="list-num">${i+1}</div><div class="list-name">${s}</div>
    </label>`;
  });

  document.getElementById('rlt-student-list').innerHTML = html || '<div class="empty-msg" style="padding:20px;text-align:center;">No hay alumnos presentes.</div>';
  document.getElementById('rlt-sel-count').textContent = validCount; document.getElementById('rlt-total-count').textContent = totalCount;

  const validStudents = g.students.map((s,i)=>({s,i})).filter(x => !isWithdrawn(x.i) && !isAbsent(x.i) && g.rltWinnerChecks[x.i] !== false);
  
  const btnRuleta = document.getElementById('spin-btn-ruleta'); const btnSlot = document.getElementById('spin-btn-slot');
  if(btnRuleta) btnRuleta.disabled = validStudents.length < 2 || rltSpin;
  if(btnSlot) btnSlot.disabled = validStudents.length < 2 || rltSpin;

  if (validStudents.length < 2) {
    document.getElementById('rlt-msg').style.display = 'block'; document.getElementById('rlt-msg').textContent = 'Selecciona al menos 2 alumnos para jugar.';
    document.getElementById('wrap-ruleta').style.display = 'none'; document.getElementById('wrap-slot').style.display = 'none';
  } else {
    document.getElementById('rlt-msg').style.display = 'none';
    if(dynamicsType === 'ruleta') { document.getElementById('wrap-ruleta').style.display = 'flex'; drawRoulette(validStudents); } 
    else { document.getElementById('wrap-slot').style.display = 'flex'; drawSlot(validStudents); }
  }
  renderRltHistory();
}

function drawRoulette(students) {
  const canvas = document.getElementById("rouletteCanvas"); const ctx = canvas.getContext("2d");
  const cw = canvas.width, ch = canvas.height, radius = cw/2; ctx.clearRect(0,0,cw,ch);
  
  ctx.beginPath(); ctx.arc(radius, radius, radius - 2, 0, Math.PI * 2); ctx.fillStyle = 'var(--surface)'; ctx.fill();
  const arc = Math.PI / (students.length / 2);

  students.forEach((st, i) => {
    ctx.beginPath(); ctx.fillStyle = C[i % C.length]; ctx.moveTo(radius, radius); 
    ctx.arc(radius, radius, radius - 4, currentAngle + i*arc, currentAngle + (i+1)*arc, false); ctx.lineTo(radius, radius); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.save(); ctx.fillStyle = "#fff"; 
    ctx.translate(radius + Math.cos(currentAngle + i*arc + arc/2) * (radius - 24), radius + Math.sin(currentAngle + i*arc + arc/2) * (radius - 24));
    ctx.rotate(currentAngle + i*arc + arc/2); ctx.textAlign = "right"; ctx.font = "bold 11px Poppins"; 
    const nameStr = st.s.length > 12 ? st.s.substring(0, 10) + "..." : st.s;
    ctx.fillText(nameStr, 0, 4); ctx.restore();
  });

  ctx.beginPath(); ctx.arc(radius, radius, 18, 0, Math.PI * 2); ctx.fillStyle = '#0f172a'; ctx.fill();
  ctx.beginPath(); ctx.arc(radius, radius, 10, 0, Math.PI * 2); ctx.fillStyle = 'var(--primary)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.stroke();
}

function spinRoulette() {
  if (rltSpin) return; const g = grp(); 
  const students = g.students.map((s,i)=>({s,i})).filter(x => !isWithdrawn(x.i) && !isAbsent(x.i) && g.rltWinnerChecks[x.i] !== false);
  if (students.length < 2) return;
  
  rltSpin = true; renderDinamicas(); document.getElementById('spin-btn-ruleta').textContent = 'GIRANDO...';

  const spinAngleStart = Math.random() * 10 + 10; let spinTime = 0; const spinTimeTotal = Math.random() * 2500 + 5500; 
  const arc = Math.PI / (students.length / 2);

  const rotateWheel = () => {
    spinTime += 30;
    if(spinTime >= spinTimeTotal) { stopRotateWheel(students, arc); return; }
    const spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
    currentAngle += (spinAngle * Math.PI / 180); drawRoulette(students); spinTimeout = requestAnimationFrame(rotateWheel);
  };
  rotateWheel();
}

function stopRotateWheel(students, arc) {
  cancelAnimationFrame(spinTimeout);
  const degrees = currentAngle * 180 / Math.PI + 90; const arcd = arc * 180 / Math.PI;
  let index = Math.floor((360 - degrees % 360) / arcd);
  if(index < 0) index = 0; if(index >= students.length) index = students.length - 1;
  showWinnerModal(students[index]);
  rltSpin = false; renderDinamicas(); document.getElementById('spin-btn-ruleta').textContent = '🎲 ¡NUEVO GIRO!';
}

function easeOut(t, b, c, d) { const ts = (t/=d)*t; const tc = ts*t; return b+c*(tc + -3*ts + 3*t); }

function drawSlot(students) {
  const strip = document.getElementById('slot-strip'); let html = `<div class="slot-item" style="color:var(--text);">¡TIRA LA PALANCA!</div>`;
  students.forEach(st => { const fSize = st.s.length > 14 ? '1.1rem' : '1.5rem'; html += `<div class="slot-item" style="font-size:${fSize};">${st.s}</div>`; });
  strip.innerHTML = html; strip.style.transform = `translateY(0)`;
}

function spinSlot() {
  if(rltSpin) return; const g = grp(); 
  const students = g.students.map((s,i)=>({s,i})).filter(x => !isWithdrawn(x.i) && !isAbsent(x.i) && g.rltWinnerChecks[x.i] !== false);
  if (students.length < 2) return;
  
  rltSpin = true; renderDinamicas(); const btn = document.getElementById('spin-btn-slot'); btn.textContent = 'GIRANDO...';

  const strip = document.getElementById('slot-strip');
  let extendedHtml = `<div class="slot-item" style="color:var(--primary-light);">¡SUERTE!</div>`;
  for(let j=0; j<4; j++) {
      students.forEach(st => { const fSize = st.s.length > 14 ? '1.1rem' : '1.5rem'; extendedHtml += `<div class="slot-item" style="font-size:${fSize};">${st.s}</div>`; });
  }
  
  const winnerIdx = Math.floor(Math.random() * students.length);
  const finalIdx = (students.length * 3) + winnerIdx + 1; const winner = students[winnerIdx];
  
  strip.style.transition = 'none'; strip.style.transform = `translateY(0)`; strip.innerHTML = extendedHtml;
  void strip.offsetWidth;
  
  strip.style.transition = 'transform 2.5s cubic-bezier(0.1, 0.7, 0.1, 1)';
  const offset = -(finalIdx * 140); strip.style.transform = `translateY(${offset}px)`;
  
  setTimeout(() => { showWinnerModal(winner); rltSpin = false; renderDinamicas(); btn.textContent = '🎰 ¡NUEVO GIRO!'; }, 2600);
}

let currentWinner = null;
function showWinnerModal(winnerData) {
  currentWinner = winnerData; document.getElementById('rlt-winner-name-baloo').textContent = winnerData.s; openModal('mRltWinner');
}

function actionRltWinner(action) {
  if(!currentWinner) return; const g = grp();
  if(action === 'remove') { g.rltWinnerChecks[currentWinner.i] = false; }
  if(action !== 'clearHistory') {
    if(!g.rltHistory) g.rltHistory = [];
    g.rltHistory.unshift({ name: currentWinner.s, time: timeStr() });
    if(g.rltHistory.length > 50) g.rltHistory.pop();
  }
  save(); renderDinamicas(); renderRltHistory(); closeModal('mRltWinner'); currentWinner = null;
}

function renderRltHistory() {
  const g = grp(); const el = document.getElementById('rlt-history-list');
  if(!g.rltHistory || g.rltHistory.length === 0) { el.innerHTML = '<div class="empty-msg" style="padding:10px;text-align:center;">Aún no hay ganadores.</div>'; return; }
  el.innerHTML = g.rltHistory.map(h => `<div class="history-item"><div class="history-name">${h.name}</div><div class="history-time">${h.time}</div></div>`).join('');
}
function clearRltHistory() { grp().rltHistory = []; save(); renderRltHistory(); }

// =========================================
// CREAR GRUPOS (SORTEO / TEAMS)
// =========================================
function changeGroupCount(delta) {
  const inp = document.getElementById('group-count-inp'); let val = parseInt(inp.value) + delta;
  if (val < 2) val = 2; if (val > 10) val = 10; inp.value = val;
}

function actionGroupStudents(action) {
  const g = grp(); if(!g.groupSortChecks) g.groupSortChecks = {};
  g.students.forEach((s,i) => { if(!isWithdrawn(i) && !isAbsent(i)) g.groupSortChecks[i] = (action === 'all'); });
  save(); renderCrearGrupos();
}

function toggleGroupStudent(i, isChecked) {
  const g = grp(); if(!g.groupSortChecks) g.groupSortChecks = {};
  g.groupSortChecks[i] = isChecked; save(); renderCrearGrupos();
}

function renderCrearGrupos() {
  const g = grp(); if(!g.groupSortChecks) g.groupSortChecks = {};
  let validCount = 0; let totalCount = 0; let html = '';
  g.students.forEach((s, i) => {
    if(isWithdrawn(i) || isAbsent(i)) return;
    totalCount++; const isCh = g.groupSortChecks[i] !== false; if(isCh) validCount++;
    html += `
    <label class="student-check-item ${isCh ? 'selected' : ''}">
      <input type="checkbox" onchange="toggleGroupStudent(${i}, this.checked)" ${isCh ? 'checked' : ''}>
      <div class="list-num">${i+1}</div><div class="list-name">${s}</div>
    </label>`;
  });
  document.getElementById('group-student-list').innerHTML = html || '<div class="empty-msg" style="padding:20px;text-align:center;">No hay alumnos presentes.</div>';
  const gcEl = document.getElementById('group-sel-count'); const gtEl = document.getElementById('group-total-count');
  if (gcEl) gcEl.textContent = validCount; if (gtEl) gtEl.textContent = totalCount;
  renderSavedGroups();
}

function actionSortGroups() {
  const g = grp();
  const students = g.students.map((s,i)=>({s,i})).filter(x => !isWithdrawn(x.i) && !isAbsent(x.i) && g.groupSortChecks[x.i] !== false);
  const numGroups = parseInt(document.getElementById('group-count-inp').value);
  
  if(students.length < numGroups) { toast('⚠️ Hay menos alumnos que equipos deseados.', 'var(--red)'); return; }
  
  for (let i = students.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [students[i], students[j]] = [students[j], students[i]];
  }
  
  currentSortTeams = Array.from({length: numGroups}, () => []);
  students.forEach((st, i) => { currentSortTeams[i % numGroups].push(st); });
  
  const wrap = document.getElementById('generated-teams-wrap'); const list = document.getElementById('generated-teams-list');
  wrap.style.display = 'block';
  
  let html = '';
  currentSortTeams.forEach((team, idx) => {
    html += `
    <div class="team-card t-c-${(idx%6)+1}">
      <div class="t-header"><span>Equipo ${idx+1}</span><span class="t-header-meta">👥 ${team.length}</span></div>
      <div class="t-list">${team.map(st => `<div class="t-member-item">${st.s}</div>`).join('')}</div>
    </div>`;
  });
  list.innerHTML = html; wrap.scrollIntoView({behavior: 'smooth', block: 'end'}); toast('🎲 Equipos generados');
}

function saveSortGroups() {
  if(!currentSortTeams) return; const g = grp(); if(!g.savedGroupsSorts) g.savedGroupsSorts = [];
  const timestamp = new Date().toLocaleString('es-PE', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
  g.savedGroupsSorts.unshift({ id: Date.now(), date: timestamp, teams: currentSortTeams });
  save(); renderSavedGroups(); document.getElementById('generated-teams-wrap').style.display = 'none';
  currentSortTeams = null; toast('💾 Sorteo guardado exitosamente');
}

function renderSavedGroups() {
  const g = grp(); const el = document.getElementById('saved-groups-list');
  if(!g.savedGroupsSorts || g.savedGroupsSorts.length === 0) { el.innerHTML = '<div class="empty-msg" style="padding:20px;text-align:center;">No hay sorteos guardados.</div>'; return; }
  
  el.innerHTML = g.savedGroupsSorts.map((sort, index) => `
    <div class="saved-group-item" id="sg-item-${sort.id}">
      <div class="sg-header" onclick="toggleSavedGroup(${sort.id})">
        <div class="sg-meta">📅 ${sort.date} <span class="sg-meta-num">(${sort.teams.length} equipos)</span></div>
        <div class="sg-actions">
          <button class="btn-danger btn-xs" onclick="deleteSavedGroup(event, ${sort.id})" style="padding:2px 6px;">✕</button>
          <div class="sg-toggle">▼</div>
        </div>
      </div>
      <div class="sg-body">
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:10px;">
          ${sort.teams.map((team, tIdx) => `
            <div style="background:var(--surface2); border-radius:8px; overflow:hidden; border:1px solid var(--border);">
              <div style="background:var(--surface3); font-size:0.7rem; font-weight:800; padding:5px 8px; text-transform:uppercase; color:var(--text);">Equipo ${tIdx+1}</div>
              <div style="padding:8px; font-size:0.75rem;">${team.map(st => `<div style="margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">• ${st.s}</div>`).join('')}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

function toggleSavedGroup(id) { document.getElementById('sg-item-'+id).classList.toggle('open'); }
function deleteSavedGroup(e, id) {
  e.stopPropagation(); if(!confirm('¿Eliminar este sorteo guardado?')) return;
  const g = grp(); g.savedGroupsSorts = g.savedGroupsSorts.filter(s => s.id !== id);
  save(); renderSavedGroups(); toast('🗑 Sorteo eliminado', 'var(--red)');
}

// Funciones vacías para evitar errores si no se usan (Grupos de Tarea / Modal Selector)
function openTaskGroups(dKey, tIdx) { toast('Funcionalidad en desarrollo.', 'var(--yellow)'); }
function tgStartNew() {} function tgCancelEdit() {} function tgSaveGroup() {} function updateTGFormAlpha() {}
function cancelTaskGroups() { closeModal('mTaskGroups'); } function confirmTaskGroups() { closeModal('mTaskGroups'); }
function openStudentPickerForTG() {} function pickerSelectAll() {} function pickerClearAll() {} function confirmStudentPicker() { closeModal('mStudentPicker'); } function renderStudentPickerList() {}

// =========================================
// MIS ESTUDIANTES / FAMILIA (DIRECTORIO)
// =========================================
// =========================================
// MODAL mAlumno — Edición unificada de alumno
// =========================================

function abrirModalAlumno(gIdxParam, sIdxParam) {
  const g = D.groups[gIdxParam];
  if (!g) return;
  const nombre = g.students[sIdxParam] || '';
  const isW = g.withdrawn && g.withdrawn.includes(sIdxParam);
  const cumple = (g.birthdates && g.birthdates[sIdxParam]) || '';

  document.getElementById('ma-group-idx').value = gIdxParam;
  document.getElementById('ma-student-idx').value = sIdxParam;
  document.getElementById('ma-nombre').value = nombre;
  document.getElementById('ma-retirado').checked = !!isW;
  document.getElementById('ma-cumple').value = cumple;

  openModal('mAlumno');
}

function guardarAlumno() {
  const gIdxL = parseInt(document.getElementById('ma-group-idx').value);
  const sIdxL = parseInt(document.getElementById('ma-student-idx').value);
  const g = D.groups[gIdxL];
  if (!g) return;

  const nuevoNombre = document.getElementById('ma-nombre').value.trim().toUpperCase();
  if (!nuevoNombre) { toast('⚠️ El nombre no puede estar vacío', 'var(--red)'); return; }

  // Actualizar nombre
  const nombreAnterior = g.students[sIdxL];
  g.students[sIdxL] = nuevoNombre;

  // Actualizar referencias en observaciones
  if (g.observations) {
    g.observations.forEach(o => {
      if (parseInt(o.studentIdx) === sIdxL) o.studentName = nuevoNombre;
    });
  }

  // Actualizar estado retirado (respetando lógica existente)
  if (!g.withdrawn) g.withdrawn = [];
  const estaRetirado = g.withdrawn.includes(sIdxL);
  const debeRetirar  = document.getElementById('ma-retirado').checked;
  if (debeRetirar && !estaRetirado) {
    g.withdrawn.push(sIdxL);
  } else if (!debeRetirar && estaRetirado) {
    g.withdrawn = g.withdrawn.filter(x => x !== sIdxL);
  }

  // Guardar cumpleaños
  if (!g.birthdates) g.birthdates = {};
  const cumple = document.getElementById('ma-cumple').value;
  if (cumple) {
    g.birthdates[sIdxL] = cumple;
  } else {
    delete g.birthdates[sIdxL];
  }

  save();
  closeModal('mAlumno');
  toast('✅ Alumno actualizado');

  // Refrescar vistas activas de forma segura
  if (document.getElementById('mis-estudiantes-view').style.display === 'block') {
    renderMisEstudiantes();
  }
  // Solo refrescar el portfolio si el grupo editado es el que está abierto actualmente
  if (gIdx !== null && gIdxL === gIdx) {
    renderPortfolio();
    renderManageList();
  }
}

// =========================================
// CUMPLEAÑOS — Detección y melodía
// =========================================

function esCumpleHoy(gIdxParam, sIdxParam) {
  const g = D.groups[gIdxParam];
  if (!g || !g.birthdates) return false;
  const cumple = g.birthdates[sIdxParam];
  if (!cumple) return false;
  const hoy = new Date();
  const [anio, mes, dia] = cumple.split('-').map(Number);
  return hoy.getDate() === dia && (hoy.getMonth() + 1) === mes;
}

function tocarCumple() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Melodía: Happy Birthday primeras notas (Do Re Mi Do Mi Re Do)
    const notas = [
      { freq: 261.63, dur: 0.18 }, // Do
      { freq: 261.63, dur: 0.09 }, // Do
      { freq: 293.66, dur: 0.27 }, // Re
      { freq: 261.63, dur: 0.27 }, // Do
      { freq: 349.23, dur: 0.27 }, // Fa
      { freq: 329.63, dur: 0.54 }, // Mi
      { freq: 261.63, dur: 0.18 }, // Do
      { freq: 261.63, dur: 0.09 }, // Do
      { freq: 293.66, dur: 0.27 }, // Re
      { freq: 261.63, dur: 0.27 }, // Do
      { freq: 392.00, dur: 0.27 }, // Sol
      { freq: 349.23, dur: 0.54 }, // Fa
    ];
    let t = ctx.currentTime + 0.05;
    notas.forEach(({ freq, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.9);
      osc.start(t); osc.stop(t + dur);
      t += dur + 0.02;
    });
  } catch(e) { console.warn('Web Audio no disponible', e); }
}

function openMisEstudiantes() {
  document.getElementById('home').style.display = 'none'; document.getElementById('mis-estudiantes-view').style.display = 'block';
  renderMisEstudiantes();
}

function renderMisEstudiantes() {
  const c = document.getElementById('mis-est-content');
  if(!D.groups || !D.groups.length) { c.innerHTML = '<div class="empty">No hay grupos registrados.</div>'; return; }

  // Guardar qué secciones están abiertas antes de re-renderizar
  const openSections = new Set();
  c.querySelectorAll('.grade-section-body').forEach((body, idx) => {
    if (body.style.display !== 'none') openSections.add(idx);
  });

  let html = '';
  D.groups.forEach((g, gIdxLoop) => {
    const activeCount = g.students.length - (g.withdrawn?.length || 0);
    html += `<div class="grade-section">
      <div class="grade-section-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display==='none'?'block':'none'">
        <div class="grade-section-title">👥 ${g.name} <span style="font-size:0.75rem;color:var(--muted);background:var(--surface);padding:3px 8px;border-radius:10px;">${g.grade}</span></div>
        <div style="font-size:0.8rem; font-weight:800; color:var(--primary-light);">${activeCount} activos ▼</div>
      </div>
      <div class="grade-section-body" style="display:none;">`;
    
    if(!g.familyData) g.familyData = {};
    g.students.forEach((s, sIdx) => {
      const isW = g.withdrawn && g.withdrawn.includes(sIdx);
      const fd = g.familyData[sIdx] || {}; const resp = fd.responsible || 'mama';
      const cumpleHoy = esCumpleHoy(gIdxLoop, sIdx);
      const cumpleBtn = cumpleHoy ? `<button onclick="tocarCumple()" title="¡Hoy es su cumpleaños! 🎉" style="background:rgba(245,158,11,0.15);border:1.5px solid var(--yellow);color:var(--yellow);border-radius:8px;padding:3px 10px;font-size:0.82rem;cursor:pointer;font-family:'Poppins',sans-serif;font-weight:800;transition:all 0.15s;" onmouseover="this.style.background='rgba(245,158,11,0.28)'" onmouseout="this.style.background='rgba(245,158,11,0.15)'">🎂</button>` : '';
      const withdrawnBadge = isW ? `<span style="font-size:0.6rem;background:rgba(239,68,68,0.15);color:var(--red);padding:2px 8px;border-radius:6px;font-weight:800;text-transform:uppercase;letter-spacing:0.4px;">RETIRADO</span>` : '';
      
      let contHtml = '';
      if(fd.studentPhone) contHtml += `<div class="contact-item"><div class="contact-label">Estudiante</div><div class="contact-phone-row"><span class="contact-phone">${fd.studentPhone}</span> <span class="whatsapp-badge ${fd.studentWa?'wb-yes':'wb-no'}">WA</span></div></div>`;
      if(fd.mamaName || fd.mamaPhone) contHtml += `<div class="contact-item"><div class="contact-label">Mamá ${resp==='mama'?'<span class="responsible-tag">Firma</span>':''}</div><div style="font-size:0.75rem; font-weight:800; margin-bottom:2px; text-transform:capitalize;">${fd.mamaName||'--'}</div><div class="contact-phone-row"><span class="contact-phone">${fd.mamaPhone||'--'}</span> <span class="whatsapp-badge ${fd.mamaWa?'wb-yes':'wb-no'}">WA</span></div></div>`;
      if(fd.papaName || fd.papaPhone) contHtml += `<div class="contact-item"><div class="contact-label">Papá ${resp==='papa'?'<span class="responsible-tag">Firma</span>':''}</div><div style="font-size:0.75rem; font-weight:800; margin-bottom:2px; text-transform:capitalize;">${fd.papaName||'--'}</div><div class="contact-phone-row"><span class="contact-phone">${fd.papaPhone||'--'}</span> <span class="whatsapp-badge ${fd.papaWa?'wb-yes':'wb-no'}">WA</span></div></div>`;
      if(fd.apodName || fd.apodPhone) contHtml += `<div class="contact-item"><div class="contact-label">Apoderado(a) ${resp==='apoderado'?'<span class="responsible-tag">Firma</span>':''}</div><div style="font-size:0.75rem; font-weight:800; margin-bottom:2px; text-transform:capitalize;">${fd.apodName||'--'}</div><div class="contact-phone-row"><span class="contact-phone">${fd.apodPhone||'--'}</span> <span class="whatsapp-badge ${fd.apodWa?'wb-yes':'wb-no'}">WA</span></div></div>`;

      if(!contHtml) contHtml = `<div style="font-size:0.75rem; color:var(--muted); font-style:italic; padding:10px;">Aún no se han registrado datos familiares.</div>`;

      html += `
      <div class="student-family-card" style="${isW ? 'opacity:0.65;border-color:rgba(239,68,68,0.3);' : ''}">
        <div class="sfc-header">
          <div class="sfc-name">
            <div class="s-num" style="background:${isW ? 'var(--surface3)' : clr(sIdx)}; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.6rem; font-weight:900; color:#fff;">${ini(s)}</div>
            <span onclick="abrirModalAlumno(${gIdxLoop}, ${sIdx})" style="cursor:pointer; text-decoration:underline dotted; text-underline-offset:3px; transition:color 0.15s;" onmouseover="this.style.color='var(--primary-light)'" onmouseout="this.style.color=''">${s}</span>
            ${fd.dni ? `<span style="font-size:0.65rem; color:var(--muted); font-family:'Roboto Mono',monospace; margin-left:6px;">DNI: ${fd.dni}</span>` : ''}
            ${withdrawnBadge}
            ${cumpleBtn}
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button class="btn-add-family" onclick="abrirModalAlumno(${gIdxLoop}, ${sIdx})" title="Editar datos personales del alumno">✏️ Alumno</button>
            <button class="btn-add-family" onclick="openFamilyModal(${gIdxLoop}, ${sIdx})" style="background:rgba(244,114,182,0.1);border-color:#ec4899;color:#f472b6;" title="Registrar datos de padres y apoderados">👨‍👩‍👧 Familia</button>
          </div>
        </div>
        <div class="family-contacts-grid">${contHtml}</div>
      </div>`;
    });
    html += `</div></div>`;
  });
  c.innerHTML = html;

  // Restaurar secciones que estaban abiertas
  c.querySelectorAll('.grade-section-body').forEach((body, idx) => {
    if (openSections.has(idx)) body.style.display = 'block';
  });
}

function openFamilyModal(groupIndex, studentIndex) {
  const g = D.groups[groupIndex]; const sName = g.students[studentIndex];
  if(!g.familyData) g.familyData = {}; const fd = g.familyData[studentIndex] || {};

  document.getElementById('mfd-student-name').textContent = sName;
  document.getElementById('mfd-group-idx').value = groupIndex;
  document.getElementById('mfd-student-idx').value = studentIndex;
  document.getElementById('mfd-student-dni').value = fd.dni || '';
  document.getElementById('mfd-student-phone').value = fd.studentPhone || '';
  document.getElementById('mfd-student-wa').checked = !!fd.studentWa;
  document.getElementById('mfd-responsible').value = fd.responsible || 'mama';
  document.getElementById('mfd-mama-name').value = fd.mamaName || '';
  document.getElementById('mfd-mama-phone').value = fd.mamaPhone || '';
  document.getElementById('mfd-mama-wa').checked = !!fd.mamaWa;
  document.getElementById('mfd-papa-name').value = fd.papaName || '';
  document.getElementById('mfd-papa-phone').value = fd.papaPhone || '';
  document.getElementById('mfd-papa-wa').checked = !!fd.papaWa;
  document.getElementById('mfd-apod-name').value = fd.apodName || '';
  document.getElementById('mfd-apod-phone').value = fd.apodPhone || '';
  document.getElementById('mfd-apod-wa').checked = !!fd.apodWa;

  openModal('mFamilyData');
}

function saveFamilyData() {
  const gIdxL = document.getElementById('mfd-group-idx').value; const sIdxL = document.getElementById('mfd-student-idx').value;
  const g = D.groups[gIdxL]; if(!g.familyData) g.familyData = {};

  g.familyData[sIdxL] = {
    dni: document.getElementById('mfd-student-dni').value.trim(),
    studentPhone: document.getElementById('mfd-student-phone').value.trim(),
    studentWa: document.getElementById('mfd-student-wa').checked,
    responsible: document.getElementById('mfd-responsible').value,
    mamaName: document.getElementById('mfd-mama-name').value.trim(),
    mamaPhone: document.getElementById('mfd-mama-phone').value.trim(),
    mamaWa: document.getElementById('mfd-mama-wa').checked,
    papaName: document.getElementById('mfd-papa-name').value.trim(),
    papaPhone: document.getElementById('mfd-papa-phone').value.trim(),
    papaWa: document.getElementById('mfd-papa-wa').checked,
    apodName: document.getElementById('mfd-apod-name').value.trim(),
    apodPhone: document.getElementById('mfd-apod-phone').value.trim(),
    apodWa: document.getElementById('mfd-apod-wa').checked
  };

  save();
  if(document.getElementById('mis-estudiantes-view').style.display === 'block') { renderMisEstudiantes(); }
  closeModal('mFamilyData'); toast('💾 Datos familiares guardados');
}

// =========================================
// AUTORREGULACIÓN — FUNCIONES RESTAURADAS
// =========================================

// Estado del semáforo pendiente de guardar con observación
let pendingRedObs = null;
let arStatsMode = 'semanal';
let arChartInstance = null;

/* --- renderAR: dibuja las tarjetas de conducta y participación --- */
function renderAR() {
  if (gIdx === null) return;
  const g = grp();
  const key = currentMasterDate;
  if (!g.semaforo) g.semaforo = {};
  if (!g.dailyPoints) g.dailyPoints = {};
  if (!g.semaforo[key]) g.semaforo[key] = {};
  if (!g.dailyPoints[key]) g.dailyPoints[key] = {};

  const el = document.getElementById('ar-grid');
  if (!el) return;

  let cntG = 0, cntY = 0, cntR = 0, total = 0;

  const html = g.students.map((s, i) => {
    if (isWithdrawn(i)) return '';
    const absent = isAbsent(i, key);
    // Default state: verde (g) si no se ha registrado nada
    if (g.semaforo[key][i] === undefined) g.semaforo[key][i] = 'g';
    const state = g.semaforo[key][i];
    const pts   = g.dailyPoints[key][i] || 0;

    if (!absent) {
      total++;
      if (state === 'g') cntG++;
      else if (state === 'y') cntY++;
      else if (state === 'r') cntR++;
      // state 'g' is always counted (default)
    }

    const cardClass = absent ? 'ar-card st-absent'
                    : state === 'g' ? 'ar-card st-g'
                    : state === 'y' ? 'ar-card st-y'
                    : state === 'r' ? 'ar-card st-r'
                    : 'ar-card st-g';

    // Última observación
    const obs = (g.observations || []).filter(o => parseInt(o.studentIdx) === i);
    const lastObs = obs.length ? obs[obs.length - 1] : null;
    const lastObsHtml = lastObs
      ? `<div class="ar-last-obs">💬 ${lastObs.text}</div>`
      : '';

    return `
    <div class="${cardClass}" id="arc-${i}">
      <div class="ar-card-top">
        <div class="ar-avatar" style="background:${clr(i)};">${ini(s)}</div>
        <div>
          <div class="ar-name">${s}</div>
          <div class="ar-obs-count">${obs.length} observación(es)</div>
        </div>
      </div>
      <div class="ar-lights">
        <button class="ar-light al-r ${state==='r'?'on':''}" onclick="setLight(${i},'r')" title="Rojo"></button>
        <button class="ar-light al-y ${state==='y'?'on':''}" onclick="setLight(${i},'y')" title="Amarillo"></button>
        <button class="ar-light al-g ${state==='g'?'on':''}" onclick="setLight(${i},'g')" title="Verde"></button>
      </div>
      <div class="ar-daily-pts">
        <span class="ar-pts-lbl">⭐ Puntos</span>
        <div class="ar-pts-controls">
          <button class="pts-btn pb-minus" onclick="setPts(${i},-1)">−</button>
          <span class="pts-val" id="pts-val-${i}">${pts}</span>
          <button class="pts-btn pb-plus" onclick="setPts(${i},1)">+</button>
        </div>
      </div>
      ${lastObsHtml}
    </div>`;
  }).join('');

  el.innerHTML = html || '<div class="empty"><div class="empty-icon">👥</div><div class="empty-msg">No hay alumnos activos.</div></div>';

  // Actualizar contadores del resumen
  const setEl = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  setEl('ar-cnt-g', cntG);
  setEl('ar-cnt-y', cntY);
  setEl('ar-cnt-r', cntR);
  setEl('ar-cnt-total', total);
}

/* --- setLight: cambia el color del semáforo de un alumno --- */
function setLight(i, color) {
  const g = grp(); const key = currentMasterDate;
  if (!g.semaforo) g.semaforo = {};
  if (!g.semaforo[key]) g.semaforo[key] = {};

  const prev = g.semaforo[key][i] || '';
  // Toggle: si ya tenía ese color, lo quita
  const newState = prev === color ? '' : color;
  g.semaforo[key][i] = newState;

  // Si pasa a rojo, mostrar modal de observación
  if (newState === 'r') {
    pendingRedObs = i;
    const sName = g.students[i];
    const el = document.getElementById('mRedObs-student');
    if (el) el.textContent = '👤 ' + sName;
    const txt = document.getElementById('mRedObs-txt');
    if (txt) txt.value = '';
    save(); renderAR();
    openModal('mRedObs');
  } else {
    save(); renderAR();
  }

  // Registrar en historial de conducta
  if (!g.conductaHistory) g.conductaHistory = [];
  const today = g.conductaHistory.find(h => h.date === key);
  if (today) { today.states[i] = newState; }
  else { const states = {}; states[i] = newState; g.conductaHistory.push({ date: key, states }); }
  save();
}

/* --- setPts: incrementa o decrementa los puntos de participación --- */
function setPts(i, delta) {
  const g = grp(); const key = currentMasterDate;
  if (!g.dailyPoints) g.dailyPoints = {};
  if (!g.dailyPoints[key]) g.dailyPoints[key] = {};
  const cur = g.dailyPoints[key][i] || 0;
  g.dailyPoints[key][i] = Math.max(0, cur + delta);
  save();
  const el = document.getElementById(`pts-val-${i}`);
  if (el) el.textContent = g.dailyPoints[key][i];
  updateStats();
}

/* --- saveRedObs: guarda la observación del modal mRedObs --- */
function saveRedObs(withObs) {
  if (pendingRedObs === null) { closeModal('mRedObs'); return; }
  const g = grp();
  if (withObs) {
    const txt = (document.getElementById('mRedObs-txt')?.value || '').trim();
    if (txt) {
      if (!g.observations) g.observations = [];
      g.observations.push({
        studentIdx: pendingRedObs,
        studentName: g.students[pendingRedObs],
        text: txt,
        date: currentMasterDate,
        color: 'r'
      });
      save();
      toast('🔴 Observación registrada');
    }
  }
  pendingRedObs = null;
  closeModal('mRedObs');
  renderAR();
}

/* --- showArTab: cambia entre sub-pestañas de Conducta --- */
function showArTab(tabId) {
  document.querySelectorAll('#sec-autorregulacion .ar-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.ar-panel').forEach(p => p.classList.remove('active'));

  const tabs = document.querySelectorAll('#sec-autorregulacion .ar-tab');
  const map = { live: 0, grafico: 1, historial: 2 };
  if (tabs[map[tabId]]) tabs[map[tabId]].classList.add('active');

  const panel = document.getElementById('ar-panel-' + tabId);
  if (panel) panel.classList.add('active');

  if (tabId === 'grafico') renderARGrafico();
  if (tabId === 'historial') renderARHistorial();
}

/* --- setStatsMode: cambia el modo del gráfico de estadísticas --- */
function setStatsMode(modo) {
  arStatsMode = modo;
  const styles = {
    hoy:       { hoy: 'var(--primary)', sem: 'transparent', all: 'transparent' },
    semanal:   { hoy: 'transparent',   sem: 'var(--primary)', all: 'transparent' },
    acumulado: { hoy: 'transparent',   sem: 'transparent', all: 'var(--primary)' }
  };
  const s = styles[modo] || styles.semanal;
  const apply = (id, bg) => {
    const b = document.getElementById(id); if (!b) return;
    b.style.background = bg;
    b.style.color = bg !== 'transparent' ? '#fff' : 'var(--muted)';
  };
  apply('btn-stat-hoy', s.hoy);
  apply('btn-stat-sem', s.sem);
  apply('btn-stat-all', s.all);
  renderARGrafico();
}

/* --- toggleStatsMax: maximiza el panel de estadísticas --- */
function toggleStatsMax() {
  const panel = document.getElementById('chart-panel-only');
  if (!panel) return;
  panel.classList.toggle('stats-maximized');
  const btn = document.getElementById('btn-stat-max');
  if (btn) btn.textContent = panel.classList.contains('stats-maximized') ? '▣ Restaurar' : '🔲 Maximizar';
  // Redestrear el gráfico para que ocupe el nuevo espacio
  setTimeout(renderARGrafico, 100);
}

/* --- renderARGrafico: dibuja el gráfico de barras con Chart.js --- */
function renderARGrafico() {
  if (gIdx === null) return;
  const g = grp();
  if (!g.semaforo) g.semaforo = {};

  // Determinar qué fechas incluir
  let fechas = [];
  const allDates = Object.keys(g.semaforo).sort();
  if (arStatsMode === 'hoy') {
    fechas = [currentMasterDate];
  } else if (arStatsMode === 'semanal') {
    const ws = getWeekStart(currentMasterDate);
    for (let i = 0; i < 5; i++) {
      const d = new Date(ws); d.setDate(ws.getDate() + i);
      fechas.push(formatDateKey(d));
    }
  } else {
    fechas = allDates.length ? allDates : [currentMasterDate];
  }

  // Contar estados por fecha
  const labels = fechas.map(f => formatShortDate(f));
  const greens = [], yellows = [], reds = [];
  fechas.forEach(f => {
    let g2 = 0, y = 0, r = 0;
    const day = (g.semaforo[f] || {});
    Object.entries(day).forEach(([iStr, st]) => {
      if (isWithdrawn(parseInt(iStr))) return;
      if (st === 'g') g2++;
      else if (st === 'y') y++;
      else if (st === 'r') r++;
    });
    greens.push(g2); yellows.push(y); reds.push(r);
  });

  // Dibujar con Chart.js
  const canvas = document.getElementById('ar-chart');
  if (!canvas) return;

  if (arChartInstance) { arChartInstance.destroy(); arChartInstance = null; }

  arChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: '🟢 Verde', data: greens, backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 6 },
        { label: '🟡 Amarillo', data: yellows, backgroundColor: 'rgba(245,158,11,0.7)', borderRadius: 6 },
        { label: '🔴 Rojo', data: reds, backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Poppins', size: 11 } } } },
      scales: {
        x: { stacked: true, ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { stacked: true, beginAtZero: true, ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.07)' } }
      }
    }
  });

  // Radar socioemocional
  renderEmoStats(fechas);

  // Rankings
  renderARRankings(fechas);
}

/* --- renderEmoStats: muestra barra de emociones --- */
function renderEmoStats(fechas) {
  const g = grp();
  const el = document.getElementById('emo-stats-container');
  if (!el) return;

  const counts = { happy: 0, neutral: 0, sad: 0, tired: 0, angry: 0 };
  let total = 0;
  fechas.forEach(f => {
    const day = (g.emotions && g.emotions[f]) || {};
    Object.entries(day).forEach(([iStr, emo]) => {
      if (!isWithdrawn(parseInt(iStr)) && counts[emo] !== undefined) {
        counts[emo]++; total++;
      }
    });
  });

  if (total === 0) { el.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;text-align:center;padding:16px;">Sin datos emocionales en el período.</div>'; return; }

  const emoConf = [
    { key:'happy',  emoji:'😄', label:'Feliz',   color:'#22c55e' },
    { key:'neutral',emoji:'😐', label:'Neutral',  color:'#94a3b8' },
    { key:'sad',    emoji:'😔', label:'Triste',   color:'#60a5fa' },
    { key:'tired',  emoji:'😴', label:'Cansado',  color:'#a78bfa' },
    { key:'angry',  emoji:'😡', label:'Molesto',  color:'#f87171' }
  ];

  el.innerHTML = emoConf.map(e => {
    const pct = total > 0 ? Math.round(counts[e.key] / total * 100) : 0;
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <span style="font-size:1.3rem;width:28px;text-align:center;">${e.emoji}</span>
      <span style="font-size:0.72rem;font-weight:800;color:var(--muted);width:55px;">${e.label}</span>
      <div style="flex:1;height:10px;background:var(--surface3);border-radius:5px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${e.color};border-radius:5px;transition:width 0.4s;"></div>
      </div>
      <span style="font-size:0.75rem;font-weight:800;color:${e.color};width:35px;text-align:right;">${pct}%</span>
    </div>`;
  }).join('');
}

/* --- renderARRankings: muestra ranking de conducta y participación --- */
function renderARRankings(fechas) {
  const g = grp();
  const rEl = document.getElementById('ar-ranking');
  const pEl = document.getElementById('ar-part-ranking');

  // Conducta: puntúa g=2, y=1, r=-1, sin estado=0
  const conduct = {};
  const pts = {};
  g.students.forEach((_, i) => { conduct[i] = 0; pts[i] = 0; });

  fechas.forEach(f => {
    const semDay = (g.semaforo && g.semaforo[f]) || {};
    Object.entries(semDay).forEach(([iStr, st]) => {
      const i = parseInt(iStr);
      if (!isWithdrawn(i)) conduct[i] += (st === 'g' ? 2 : st === 'y' ? 1 : st === 'r' ? -1 : 0);
    });
    const ptDay = (g.dailyPoints && g.dailyPoints[f]) || {};
    Object.entries(ptDay).forEach(([iStr, p]) => {
      const i = parseInt(iStr);
      if (!isWithdrawn(i)) pts[i] += p;
    });
  });

  const makeRanking = (scoreObj, el, colorFn) => {
    if (!el) return;
    const entries = Object.entries(scoreObj)
      .filter(([i]) => !isWithdrawn(parseInt(i)))
      .sort((a, b) => b[1] - a[1]).slice(0, 5);

    if (!entries.length) { el.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;text-align:center;padding:12px;">Sin datos.</div>'; return; }

    el.innerHTML = entries.map(([i, score], rank) => {
      const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank+1}.`;
      return `<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:var(--surface2);border-radius:8px;margin-bottom:6px;">
        <span style="font-size:0.9rem;width:24px;text-align:center;">${medal}</span>
        <div class="ar-avatar" style="background:${clr(parseInt(i))};width:28px;height:28px;font-size:0.65rem;">${ini(g.students[parseInt(i)])}</div>
        <span style="flex:1;font-size:0.78rem;font-weight:700;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${g.students[parseInt(i)]}</span>
        <span style="font-size:0.88rem;font-weight:900;color:${colorFn(score)};">${score}</span>
      </div>`;
    }).join('');
  };

  makeRanking(conduct, rEl, s => s >= 2 ? '#22c55e' : s >= 0 ? '#f59e0b' : '#ef4444');
  if (pEl) makeRanking(pts, pEl, () => 'var(--primary-light)');
}

/* --- renderARHistorial: muestra el historial por sesión --- */
function renderARHistorial() {
  const g = grp(); const el = document.getElementById('ar-hist-list');
  if (!el) return;
  if (!g.conductaHistory || !g.conductaHistory.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📅</div><div class="empty-msg">No hay historial de conducta registrado aún.</div></div>';
    return;
  }

  const sorted = [...g.conductaHistory].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);
  el.innerHTML = sorted.map(h => {
    let cntG = 0, cntY = 0, cntR = 0;
    Object.entries(h.states || {}).forEach(([iStr, st]) => {
      if (!isWithdrawn(parseInt(iStr))) {
        if (st === 'g') cntG++; else if (st === 'y') cntY++; else if (st === 'r') cntR++;
      }
    });
    const hlClass = cntR > 0 ? 'hl-r' : cntY > 0 ? 'hl-y' : 'hl-g';
    return `<div class="ar-hist-item ${hlClass}">
      <div class="ar-hist-date">📅 ${formatCustomDate(h.date)}</div>
      <div class="ar-hist-row">
        <span class="ar-hist-badge hb-g">🟢 ${cntG}</span>
        <span class="ar-hist-badge hb-y">🟡 ${cntY}</span>
        <span class="ar-hist-badge hb-r">🔴 ${cntR}</span>
      </div>
    </div>`;
  }).join('');
}

// =========================================
// GOOGLE DRIVE SYNC — MÓDULO COMPLETO
// =========================================

/* ── Bandera de bloqueo: impide que save() dispare sync automático
   mientras el sistema espera la decisión del usuario (subir vs restaurar)
   o mientras se está ejecutando una restauración. ── */
// _gdriveBlocked ya declarada como variable global al inicio del script
let _gdriveSyncTimer = null;

/* Debounce: espera 8s después del último save() para subir a Drive.
   Respeta la bandera _gdriveBlocked. */
function gdriveSyncDebounced() {
  if (!gdriveToken || _gdriveBlocked) return;
  clearTimeout(_gdriveSyncTimer);
  _gdriveSyncTimer = setTimeout(() => {
    if (!_gdriveBlocked) gdriveSyncNow();
  }, 8000);
}

const GDRIVE_FILE_NAME = 'Bitacorap_Backup.json';
const GDRIVE_SCOPE     = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file';

let gdriveToken     = null;   // access token activo
let gdriveFileId    = null;   // ID del archivo en Drive
let gdriveAutoTimer = null;   // handle del intervalo de auto-sync

/* ── Leer Client ID guardado ── */
function gdriveClientId() {
  return (D.settings && D.settings.gdriveClientId) || '';
}

/* ── Inicializar estado visual al cargar ── */
function gdriveInitUI() {
  const saved  = localStorage.getItem('gdrive_token');
  const expiry = parseInt(localStorage.getItem('gdrive_token_expiry') || '0');
  if (saved && Date.now() < expiry) {
    gdriveToken  = saved;
    gdriveFileId = localStorage.getItem('gdrive_file_id') || null;
    gdriveSetConnected(true);
    gdriveStartAutoSync();
  } else {
    gdriveSetConnected(false);
  }
  gdriveRefreshSetupNote();
}

/* ── Mostrar/ocultar nota de configuración ── */
function gdriveRefreshSetupNote() {
  const note = document.getElementById('gdrive-setup-note');
  if (!note) return;
  note.style.display = gdriveClientId() ? 'none' : 'block';
}

/* ── Actualizar UI según estado conexión ── */
function gdriveSetConnected(connected) {
  const dot           = document.getElementById('gdrive-dot');
  const txt           = document.getElementById('gdrive-status-text');
  const connectBtn    = document.getElementById('gdrive-connect-btn');
  const syncNowBtn    = document.getElementById('gdrive-sync-now-btn');
  const restoreBtn    = document.getElementById('gdrive-restore-btn');
  const disconnectBtn = document.getElementById('gdrive-disconnect-btn');
  const lastSync      = document.getElementById('gdrive-last-sync');
  if (!dot) return;
  if (connected) {
    dot.style.background        = '#4285f4';
    txt.textContent             = '✅ Conectado a Google Drive';
    txt.style.color             = '#4285f4';
    connectBtn.style.display    = 'none';
    syncNowBtn.style.display    = 'flex';
    restoreBtn.style.display    = 'flex';
    disconnectBtn.style.display = 'block';
    lastSync.style.display      = 'block';
    const t = localStorage.getItem('gdrive_last_sync');
    if (t) document.getElementById('gdrive-last-sync-time').textContent = new Date(parseInt(t)).toLocaleString('es-PE');
  } else {
    dot.style.background        = 'var(--surface3)';
    txt.textContent             = 'No conectado';
    txt.style.color             = 'var(--muted)';
    connectBtn.style.display    = 'flex';
    syncNowBtn.style.display    = 'none';
    restoreBtn.style.display    = 'none';
    disconnectBtn.style.display = 'none';
    lastSync.style.display      = 'none';
  }
}

/* ── Modal de decisión: subir local → Drive  vs  descargar Drive → local ── */
function _gdriveShowSyncChoiceModal(fileExistsInDrive, onUpload, onDownload, onCancel) {
  // Crear overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:16px;padding:28px 26px;max-width:420px;width:100%;font-family:Poppins,sans-serif;">
      <div style="font-size:1.4rem;margin-bottom:10px;text-align:center;">☁️ Google Drive Conectado</div>
      <p style="font-size:0.84rem;color:var(--muted);text-align:center;line-height:1.55;margin-bottom:22px;">
        ${fileExistsInDrive
          ? 'Se encontró un archivo de respaldo en tu Drive.<br>¿Qué deseas hacer?'
          : 'No hay respaldo previo en Drive.<br>Se creará uno nuevo con tus datos locales.'}
      </p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${fileExistsInDrive ? `
        <button id="_gd-choice-down" style="padding:12px;border-radius:10px;border:1.5px solid var(--accent);background:rgba(16,185,129,0.1);color:var(--accent);font-family:Poppins,sans-serif;font-size:0.84rem;font-weight:800;cursor:pointer;">
          ♻️ Descargar datos de Drive (restaurar respaldo)
        </button>` : ''}
        <button id="_gd-choice-up" style="padding:12px;border-radius:10px;border:1.5px solid #4285f4;background:rgba(66,133,244,0.1);color:#4285f4;font-family:Poppins,sans-serif;font-size:0.84rem;font-weight:800;cursor:pointer;">
          ☁️ ${fileExistsInDrive ? 'Subir datos locales (sobrescribir Drive)' : 'Crear respaldo ahora'}
        </button>
        <button id="_gd-choice-cancel" style="padding:10px;border-radius:10px;border:1.5px solid var(--border);background:transparent;color:var(--muted);font-family:Poppins,sans-serif;font-size:0.78rem;font-weight:700;cursor:pointer;">
          Decidir más tarde
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const cleanup = () => document.body.removeChild(overlay);
  if (fileExistsInDrive) {
    overlay.querySelector('#_gd-choice-down').onclick = () => { cleanup(); onDownload(); };
  }
  overlay.querySelector('#_gd-choice-up').onclick     = () => { cleanup(); onUpload(); };
  overlay.querySelector('#_gd-choice-cancel').onclick = () => { cleanup(); onCancel(); };
}

/* ── Conectar: lanza OAuth con Google Identity Services ── */
function gdriveConnect() {
  const clientId = gdriveClientId();
  if (!clientId) {
    toast('⚙️ Primero ingresa tu Client ID en Configuración (⚙️)', 'var(--yellow)');
    openSettingsModal();
    return;
  }
  if (typeof google === 'undefined' || !google.accounts) {
    toast('⚠️ Google Identity Services no cargó. Revisa tu conexión.', 'var(--red)');
    return;
  }

  const client = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: GDRIVE_SCOPE,
    callback: async (resp) => {
      if (resp.error) {
        toast('❌ Error al conectar con Google: ' + resp.error, 'var(--red)');
        return;
      }
      gdriveToken = resp.access_token;
      const expiresAt = Date.now() + (resp.expires_in - 60) * 1000;
      localStorage.setItem('gdrive_token', gdriveToken);
      localStorage.setItem('gdrive_token_expiry', String(expiresAt));
      gdriveSetConnected(true);
      toast('✅ Conectado a Google Drive — buscando respaldo…', '#4285f4');

      // ── BLOQUEAR sync automático mientras el usuario decide ──
      _gdriveBlocked = true;
      clearTimeout(_gdriveSyncTimer);

      // Buscar si ya existe archivo en Drive (sin crearlo todavía)
      const fileExistsInDrive = await _gdriveFindFile();

      // Mostrar modal de decisión
      _gdriveShowSyncChoiceModal(
        fileExistsInDrive,
        // Opción A: subir local → Drive
        async () => {
          _gdriveBlocked = false;
          if (!gdriveFileId) await gdriveEnsureFile();
          await gdriveSyncNow();
          gdriveStartAutoSync();
        },
        // Opción B: descargar Drive → local
        async () => {
          _gdriveBlocked = false;
          await gdriveRestore();
          gdriveStartAutoSync();
        },
        // Opción C: decidir más tarde (no sincronizar ahora)
        () => {
          _gdriveBlocked = false;
          gdriveStartAutoSync();
          toast('⏸ Sincronización postergada. Usa los botones cuando quieras.', 'var(--yellow)');
        }
      );
    }
  });
  client.requestAccessToken();
}

/* ── Desconectar ── */
function gdriveDisconnect() {
  if (!confirm('¿Desconectar Google Drive? Tus datos locales se conservan.')) return;
  _gdriveBlocked = false;
  clearTimeout(_gdriveSyncTimer);
  gdriveToken  = null;
  gdriveFileId = null;
  localStorage.removeItem('gdrive_token');
  localStorage.removeItem('gdrive_token_expiry');
  localStorage.removeItem('gdrive_file_id');
  localStorage.removeItem('gdrive_last_sync');
  if (gdriveAutoTimer) { clearInterval(gdriveAutoTimer); gdriveAutoTimer = null; }
  gdriveSetConnected(false);
  toast('🔌 Google Drive desconectado', 'var(--muted)');
}

/* ── Buscar archivo en Drive SIN crearlo (retorna true/false) ── */
async function _gdriveFindFile() {
  try {
    const q = encodeURIComponent(`name='${GDRIVE_FILE_NAME}' and trashed=false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive,appDataFolder&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,
      { headers: { Authorization: 'Bearer ' + gdriveToken } }
    );
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      gdriveFileId = data.files[0].id;
      localStorage.setItem('gdrive_file_id', gdriveFileId);
      return true;
    }
    return false;
  } catch(e) {
    console.warn('_gdriveFindFile error', e);
    return false;
  }
}

/* ── Buscar archivo de backup en Drive, o crearlo si no existe ── */
async function gdriveEnsureFile() {
  if (!gdriveToken) return;
  try {
    const found = await _gdriveFindFile();
    if (!found) {
      // Crear el archivo vacío solo si no existe
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + gdriveToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: GDRIVE_FILE_NAME, mimeType: 'application/json' })
      });
      const created = await createRes.json();
      gdriveFileId = created.id;
      localStorage.setItem('gdrive_file_id', gdriveFileId);
    }
  } catch(e) { console.warn('gdriveEnsureFile error', e); }
}

/* ── Verificar que el token siga vigente ── */
async function gdriveCheckToken() {
  const expiry = parseInt(localStorage.getItem('gdrive_token_expiry') || '0');
  if (!gdriveToken || Date.now() >= expiry) {
    const clientId = gdriveClientId();
    if (!clientId || typeof google === 'undefined') return false;
    return new Promise((resolve) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GDRIVE_SCOPE,
        prompt: '',
        callback: (resp) => {
          if (resp.error) { resolve(false); return; }
          gdriveToken = resp.access_token;
          const expiresAt = Date.now() + (resp.expires_in - 60) * 1000;
          localStorage.setItem('gdrive_token', gdriveToken);
          localStorage.setItem('gdrive_token_expiry', String(expiresAt));
          resolve(true);
        }
      });
      client.requestAccessToken();
    });
  }
  return true;
}

/* ── Subir datos locales a Drive ── */
async function gdriveSyncNow() {
  if (!gdriveToken) { toast('⚠️ Conecta Google Drive primero', 'var(--yellow)'); return; }
  if (_gdriveBlocked) { toast('⏸ Sincronización en espera de tu decisión', 'var(--yellow)'); return; }

  const ok = await gdriveCheckToken();
  if (!ok) { toast('⚠️ Sesión de Google expirada. Vuelve a conectar.', 'var(--red)'); gdriveSetConnected(false); return; }

  if (!gdriveFileId) await gdriveEnsureFile();
  if (!gdriveFileId) { toast('❌ No se pudo crear el archivo en Drive', 'var(--red)'); return; }

  try {
    const body = JSON.stringify(D);
    const url  = `https://www.googleapis.com/upload/drive/v3/files/${gdriveFileId}?uploadType=media`;
    const res  = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + gdriveToken, 'Content-Type': 'application/json' },
      body
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const now     = Date.now();
    localStorage.setItem('gdrive_last_sync', String(now));
    const timeStr = new Date(now).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const lastEl  = document.getElementById('gdrive-last-sync-time');
    if (lastEl) lastEl.textContent = timeStr;
    const txt = document.getElementById('backup-status-text');
    if (txt) txt.textContent = `Autoguardado · Drive ☁️ ${timeStr} · ${D.groups.length} grupo(s)`;
    toast('☁️ Guardado en Google Drive', '#4285f4');
  } catch(e) {
    console.warn('gdriveSyncNow error', e);
    toast('❌ Error al subir a Drive: ' + e.message, 'var(--red)');
  }
}

/* ── Restaurar datos desde Drive → local ── */
async function gdriveRestore() {
  if (!gdriveToken) { toast('⚠️ Conecta Google Drive primero', 'var(--yellow)'); return; }

  // Solo pedir confirmación si se llama manualmente (no desde el modal de conexión)
  const calledManually = !_gdriveBlocked;
  if (calledManually && !confirm('¿Restaurar los datos guardados en Google Drive?\n\nSe reemplazarán los datos locales actuales.')) return;

  const ok = await gdriveCheckToken();
  if (!ok) { toast('⚠️ Sesión de Google expirada. Vuelve a conectar.', 'var(--red)'); return; }

  // Si no tenemos fileId, buscar (pero no crear)
  if (!gdriveFileId) {
    toast('🔍 Buscando archivo de respaldo en Drive...', '#4285f4');
    const found = await _gdriveFindFile();
    if (!found) {
      toast('❌ No se encontró "' + GDRIVE_FILE_NAME + '" en Drive.\n💡 Pega el File ID manualmente en ⚙️ Configuración.', 'var(--red)');
      return;
    }
  }

  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${gdriveFileId}?alt=media`, {
      headers: { Authorization: 'Bearer ' + gdriveToken }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const parsed = await res.json();
    if (!parsed || !parsed.groups) { toast('⚠️ El archivo en Drive no es válido o está vacío', 'var(--red)'); return; }
    pushSnapshot('pre-restauracion-drive');
    D = parsed;
    if (!D.sala) D.sala = {};
    if (!D.settings) D.settings = { apiKey: '' };
    // Guardar localmente SIN disparar sync a Drive
    _gdriveBlocked = true;
    localStorage.setItem('pd4', JSON.stringify(D));
    localStorage.setItem('pd4_mirror', JSON.stringify(D));
    _gdriveBlocked = false;
    renderHome();
    refreshBackupStatusUI();
    toast('♻️ Datos restaurados desde Google Drive', '#4285f4');
  } catch(e) {
    console.warn('gdriveRestore error', e);
    toast('❌ Error al restaurar desde Drive: ' + e.message, 'var(--red)');
  }
}

/* ── Auto-sync cada 5 minutos cuando está conectado ── */
function gdriveStartAutoSync() {
  if (gdriveAutoTimer) return;
  gdriveAutoTimer = setInterval(async () => {
    if (gdriveToken && !_gdriveBlocked) await gdriveSyncNow();
  }, 5 * 60 * 1000);
}

/* ── Hook: sincronizar en Drive también al cerrar la pestaña ── */
window.addEventListener('beforeunload', () => {
  if (gdriveToken && navigator.sendBeacon) {
    // sendBeacon no soporta auth headers, así que solo hacemos push local
    pushSnapshot('cierre');
  }
});

// =========================================
// REUNIÓN DE PADRES DE FAMILIA — MÓDULO COMPLETO
// =========================================

let reunionDetalleId = null; // ID de la reunión en detalle actualmente

/* ── Inicializar array de reuniones en D ── */
function ensureReuniones() {
  if (!D.reuniones) D.reuniones = [];
}

/* ── Abrir vista principal de Reuniones ── */
function openReunionPadres() {
  document.getElementById('home').style.display = 'none';
  document.getElementById('mis-estudiantes-view').style.display = 'none';
  document.getElementById('reunion-detalle-view').style.display = 'none';
  document.getElementById('reunion-padres-view').style.display = 'block';
  poblarSelectGruposReunion();
  renderReunionList();
}

/* ── Poblar selects de grupo en la vista y en el modal ── */
function poblarSelectGruposReunion() {
  const selVista = document.getElementById('reunion-grupo-sel');
  const selModal = document.getElementById('mnr-grupo');
  if (!D.groups || !D.groups.length) {
    if (selVista) selVista.innerHTML = '<option value="">Sin grupos registrados</option>';
    if (selModal) selModal.innerHTML = '<option value="">Sin grupos registrados</option>';
    return;
  }
  const opts = D.groups.map((g, i) => `<option value="${i}">${g.name} ${g.grade ? '— ' + g.grade : ''}</option>`).join('');
  // Vista: opción "Todas" como default
  if (selVista) {
    const prev = selVista.value;
    selVista.innerHTML = '<option value="all">📋 Todas las reuniones</option>' + opts;
    // Restaurar selección previa si existía, si no dejar "all" por defecto
    if (prev && prev !== '' && selVista.querySelector(`option[value="${prev}"]`)) {
      selVista.value = prev;
    } else {
      selVista.value = 'all';
    }
  }
  // Modal: solo grupos (para crear/editar)
  if (selModal) selModal.innerHTML = opts;
}

/* ── Renderizar tablero Kanban general de todas las reuniones ── */
function renderReunionList() {
  ensureReuniones();
  const sel = document.getElementById('reunion-grupo-sel');
  const container = document.getElementById('reunion-list-container');
  const statsEl = document.getElementById('reunion-global-stats');
  if (!sel || !container) return;

  const selVal = sel.value;
  const verTodas = selVal === 'all';

  // Filtrar reuniones según selección
  let reuniones;
  if (verTodas) {
    reuniones = [...D.reuniones];
  } else {
    const gIdxF = parseInt(selVal);
    if (isNaN(gIdxF)) return;
    reuniones = D.reuniones.filter(r => r.groupIdx === gIdxF);
  }

  // Ordenar por fecha dentro de cada columna
  const byFecha = (a, b) => {
    const da = new Date(a.fecha || '1900-01-01');
    const db = new Date(b.fecha || '1900-01-01');
    return da - db;
  };

  // Stats globales
  const total = reuniones.length;
  const realizadas = reuniones.filter(r => r.estado === 'realizada').length;
  const pendientes = reuniones.filter(r => r.estado === 'pendiente').length;
  const canceladas = reuniones.filter(r => r.estado === 'cancelada').length;
  if (statsEl) statsEl.innerHTML = `
    <div class="reunion-stat-pill"><div class="rsp-num">${total}</div><div class="rsp-lbl">Total</div></div>
    <div class="reunion-stat-pill"><div class="rsp-num" style="color:var(--yellow);">${pendientes}</div><div class="rsp-lbl">Pendientes</div></div>
    <div class="reunion-stat-pill"><div class="rsp-num" style="color:var(--green);">${realizadas}</div><div class="rsp-lbl">Realizadas</div></div>
    <div class="reunion-stat-pill"><div class="rsp-num" style="color:var(--red);">${canceladas}</div><div class="rsp-lbl">Canceladas</div></div>
  `;

  if (!reuniones.length) {
    container.innerHTML = `<div style="text-align:center;padding:50px 20px;color:var(--muted);background:var(--surface);border:1px dashed var(--border);border-radius:14px;">
      <div style="font-size:2.5rem;margin-bottom:12px;">🤝</div>
      <div style="font-weight:800;font-size:0.9rem;margin-bottom:6px;">No hay reuniones registradas</div>
      <div style="font-size:0.78rem;">Haz clic en "➕ Nueva Reunión" para registrar la primera.</div>
    </div>`;
    return;
  }

  // Separar por estado
  const colsPend   = reuniones.filter(r => r.estado === 'pendiente').sort(byFecha);
  const colsReal   = reuniones.filter(r => r.estado === 'realizada').sort((a,b) => new Date(b.fecha||'1900-01-01') - new Date(a.fecha||'1900-01-01'));
  const colsCanc   = reuniones.filter(r => r.estado === 'cancelada').sort((a,b) => new Date(b.fecha||'1900-01-01') - new Date(a.fecha||'1900-01-01'));

  // Tarjeta Kanban de reunión
  function buildKanbanCard(r) {
    const g = D.groups[r.groupIdx];
    const asistentes = _contarAsistentesReunion(r);
    const totalPadres = g ? g.students.filter((_, i) => !g.withdrawn?.includes(i)).length : 0;
    const fotos = (r.fotos || []).length;
    const temas = (r.temas || []).length;
    const acuerdos = (r.acuerdos || []).length;
    const temasK = (r.temasKanban || []).length;
    const fechaStr = r.fecha ? new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const grupoLabel = verTodas && g ? `<div style="font-size:0.63rem;font-weight:800;color:var(--primary-light);margin-bottom:4px;">📚 ${escHtml(g.name)}${g.grade ? ' · ' + g.grade : ''}</div>` : '';
    const pct = totalPadres > 0 ? Math.round(asistentes / totalPadres * 100) : 0;
    const barColor = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--red)';

    return `
    <div onclick="abrirDetalleReunion('${r.id}')" style="background:var(--surface);border:1.5px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:10px;cursor:pointer;transition:all 0.15s;position:relative;overflow:hidden;"
      onmouseover="this.style.borderColor='var(--primary)';this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 16px rgba(14,165,233,0.13)'"
      onmouseout="this.style.borderColor='var(--border)';this.style.transform='';this.style.boxShadow=''">
      ${grupoLabel}
      <div style="font-size:0.88rem;font-weight:900;color:var(--text);margin-bottom:5px;line-height:1.3;">${escHtml(r.titulo || 'Sin nombre')}</div>
      <div style="font-size:0.72rem;color:var(--muted);margin-bottom:8px;display:flex;gap:8px;flex-wrap:wrap;">
        <span>📅 ${fechaStr}</span>
        ${r.hora ? `<span>🕐 ${r.hora}</span>` : ''}
        ${r.lugar ? `<span>📍 ${escHtml(r.lugar)}</span>` : ''}
      </div>
      ${totalPadres > 0 ? `
      <div style="margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--muted);margin-bottom:3px;">
          <span>👨‍👩‍👧 Asistencia</span><span style="color:${barColor};font-weight:800;">${asistentes}/${totalPadres} · ${pct}%</span>
        </div>
        <div style="height:5px;background:var(--surface2);border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;transition:width 0.4s;"></div>
        </div>
      </div>` : ''}
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px;">
        ${temas ? `<span style="font-size:0.6rem;font-weight:800;padding:2px 7px;border-radius:20px;background:rgba(14,165,233,0.12);color:var(--primary-light);">📌 ${temas} tema${temas>1?'s':''}</span>` : ''}
        ${acuerdos ? `<span style="font-size:0.6rem;font-weight:800;padding:2px 7px;border-radius:20px;background:rgba(16,185,129,0.12);color:var(--accent);">✅ ${acuerdos} acuerdo${acuerdos>1?'s':''}</span>` : ''}
        ${temasK ? `<span style="font-size:0.6rem;font-weight:800;padding:2px 7px;border-radius:20px;background:rgba(245,158,11,0.12);color:var(--yellow);">🗂 ${temasK} en tablero</span>` : ''}
        ${fotos ? `<span style="font-size:0.6rem;font-weight:800;padding:2px 7px;border-radius:20px;background:rgba(139,92,246,0.12);color:#a78bfa;">📷 ${fotos}</span>` : ''}
      </div>
    </div>`;
  }

  function buildCol(label, colorClass, items, emptyMsg) {
    const colBorderColor = colorClass === 'kh-pendiente' ? 'rgba(245,158,11,0.3)' : colorClass === 'kh-resuelto' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)';
    return `
    <div style="background:var(--surface2);border-radius:14px;padding:14px;min-height:120px;border-top:3px solid ${colBorderColor};">
      <div class="kanban-col-header ${colorClass}" style="margin-bottom:12px;font-size:0.75rem;">
        ${label} <span style="background:var(--surface);padding:1px 9px;border-radius:20px;font-size:0.68rem;">${items.length}</span>
      </div>
      ${items.length ? items.map(buildKanbanCard).join('') : `<div style="color:var(--muted);font-size:0.75rem;font-style:italic;text-align:center;padding:18px 8px;">${emptyMsg}</div>`}
    </div>`;
  }

  container.innerHTML = `
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;">
    ${buildCol('⏳ Pendientes', 'kh-pendiente', colsPend, 'Sin reuniones pendientes')}
    ${buildCol('✅ Realizadas', 'kh-resuelto', colsReal, 'Sin reuniones realizadas')}
    ${buildCol('❌ Canceladas', 'kh-cancelada', colsCanc, 'Sin reuniones canceladas')}
  </div>
  <style>.kh-cancelada{color:var(--red);}@media(max-width:680px){#reunion-list-container>div{grid-template-columns:1fr!important;}}</style>`;
}

function _contarAsistentesReunion(r) {
  if (!r.asistencia) return 0;
  return Object.values(r.asistencia).filter(v => v && v !== 'ausente' && v !== '').length;
}

/* ── Abrir detalle de una reunión ── */
function abrirDetalleReunion(id) {
  ensureReuniones();
  const r = D.reuniones.find(x => x.id === id);
  if (!r) return;
  reunionDetalleId = id;

  // Resetear contenido para que renderDetalleReunion reconstruya la estructura completa
  const content = document.getElementById('reunion-detalle-content');
  if (content) content.innerHTML = '';

  document.getElementById('reunion-padres-view').style.display = 'none';
  document.getElementById('reunion-detalle-view').style.display = 'block';

  const fechaStr = r.fecha ? new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '';
  document.getElementById('reunion-detalle-title').textContent = `📋 ${r.titulo || 'Reunión'}`;
  document.getElementById('reunion-detalle-fecha').textContent = fechaStr + (r.hora ? ' · ' + r.hora : '') + (r.lugar ? ' · ' + r.lugar : '');

  renderDetalleReunion(r);
}

/* ─────────────────────────────────────────────────────────────────
   RENDER DETALLE — estructura completa solo en la primera llamada,
   luego cada sección se actualiza de forma quirúrgica (CRUD sin
   re-renderizar todo para no borrar el textarea de observaciones).
───────────────────────────────────────────────────────────────── */
function _fdGet(g, i) {
  // familyData puede tener claves numéricas o string; normalizar ambos casos
  if (!g.familyData) return {};
  return g.familyData[i] || g.familyData[String(i)] || {};
}

function _buildAttRow(r, g, s, i) {
  const fd = _fdGet(g, i);
  // Construir línea de datos familiares mostrando TODOS los registrados
  const partes = [];
  if (fd.mamaName || fd.mamaPhone) partes.push(`<span class="pf-tag pf-mama">👩 ${fd.mamaName || fd.mamaPhone}</span>`);
  if (fd.papaName || fd.papaPhone) partes.push(`<span class="pf-tag pf-papa">👨 ${fd.papaName || fd.papaPhone}</span>`);
  if (fd.apodName || fd.apodPhone) partes.push(`<span class="pf-tag pf-apod">🧑 ${fd.apodName || fd.apodPhone}</span>`);
  const familiaHtml = partes.length
    ? partes.join(' ')
    : '<span style="color:var(--muted);font-style:italic;font-size:0.7rem;">Sin datos — registra en Mis Estudiantes</span>';

  const att = String((r.asistencia || {})[i] || (r.asistencia || {})[String(i)] || '');
  const rowClass = att === 'presente' || att === 'apoderado' ? 'padre-att-row att-asistio' : att === 'ausente' ? 'padre-att-row att-no-asistio' : 'padre-att-row';
  return `<div class="${rowClass}" id="padre-row-${i}">
    <div class="padre-att-info">
      <div class="padre-att-student">
        <span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:${clr(i)};color:#fff;font-size:0.6rem;font-weight:900;text-align:center;line-height:22px;margin-right:7px;flex-shrink:0;">${ini(s)}</span>
        <strong>${escHtml(s)}</strong>
      </div>
      <div class="padre-att-parent" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;">${familiaHtml}</div>
    </div>
    <div class="padre-att-btns">
      <button class="padre-btn ${att === 'presente' ? 'activo-presente' : ''}" onclick="marcarAsistenciaPadre('${r.id}', ${i}, 'presente')">✅ Presente</button>
      <button class="padre-btn ${att === 'apoderado' ? 'activo-apoderado' : ''}" onclick="marcarAsistenciaPadre('${r.id}', ${i}, 'apoderado')">🔵 Apoderado</button>
      <button class="padre-btn ${att === 'ausente' ? 'activo-ausente' : ''}" onclick="marcarAsistenciaPadre('${r.id}', ${i}, 'ausente')">❌ Ausente</button>
    </div>
  </div>`;
}

function _buildAttHtml(r, g) {
  let html = '';
  g.students.forEach((s, i) => {
    if (g.withdrawn && g.withdrawn.includes(i)) return;
    html += _buildAttRow(r, g, s, i);
  });
  return html || '<div style="color:var(--muted);text-align:center;padding:20px;">No hay alumnos activos.</div>';
}

function _buildStatsHtml(r, g) {
  const estadoBadge = { pendiente: 'rb-pendiente', realizada: 'rb-realizada', cancelada: 'rb-cancelada' };
  const estadoLabel = { pendiente: '⏳ Pendiente', realizada: '✅ Realizada', cancelada: '❌ Cancelada' };
  const totalPadres = g.students.filter((_, i) => !g.withdrawn?.includes(i)).length;
  const att = r.asistencia || {};
  const allVals = [...Object.values(att)];
  const presentes = allVals.filter(v => v === 'presente').length;
  const apoderados = allVals.filter(v => v === 'apoderado').length;
  const ausentes = allVals.filter(v => v === 'ausente').length;
  const sinMarcar = totalPadres - presentes - apoderados - ausentes;
  const pctAsist = totalPadres > 0 ? Math.round((presentes + apoderados) / totalPadres * 100) : 0;
  return `<div class="reunion-stat-pill"><div class="rsp-num" style="color:var(--green);">${presentes}</div><div class="rsp-lbl">Presentes</div></div>
    <div class="reunion-stat-pill"><div class="rsp-num" style="color:var(--primary-light);">${apoderados}</div><div class="rsp-lbl">Apoderados</div></div>
    <div class="reunion-stat-pill"><div class="rsp-num" style="color:var(--red);">${ausentes}</div><div class="rsp-lbl">Ausentes</div></div>
    <div class="reunion-stat-pill"><div class="rsp-num" style="color:var(--muted);">${sinMarcar}</div><div class="rsp-lbl">Sin marcar</div></div>
    <div class="reunion-stat-pill"><div class="rsp-num" style="color:var(--accent);">${pctAsist}%</div><div class="rsp-lbl">Asist.</div></div>
    <span class="reunion-badge ${estadoBadge[r.estado] || 'rb-pendiente'}" style="align-self:center;">${estadoLabel[r.estado] || r.estado}</span>`;
}

function _buildTemasHtml(r) {
  const temas = r.temas || [];
  if (!temas.length) return '<div class="rdn-empty">Aún no hay temas registrados.</div>';
  return temas.map((t, i) => `
    <div class="tema-item" id="tema-item-${i}">
      <span class="item-text" id="tema-text-${i}" ondblclick="editarTemaInline('${r.id}',${i})">📌 ${escHtml(t)}</span>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button class="btn-remove-item" title="Editar" onclick="editarTemaInline('${r.id}',${i})">✏️</button>
        <button class="btn-remove-item" title="Eliminar" onclick="eliminarTemaReunion('${r.id}',${i})">✕</button>
      </div>
    </div>`).join('');
}

function _buildAcuerdosHtml(r) {
  const acuerdos = r.acuerdos || [];
  if (!acuerdos.length) return '<div class="rdn-empty">Aún no hay acuerdos registrados.</div>';
  return acuerdos.map((a, i) => `
    <div class="acuerdo-item" id="acuerdo-item-${i}">
      <span class="item-text" id="acuerdo-text-${i}" ondblclick="editarAcuerdoInline('${r.id}',${i})">✅ ${escHtml(a)}</span>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button class="btn-remove-item" title="Editar" onclick="editarAcuerdoInline('${r.id}',${i})">✏️</button>
        <button class="btn-remove-item" title="Eliminar" onclick="eliminarAcuerdoReunion('${r.id}',${i})">✕</button>
      </div>
    </div>`).join('');
}

function _buildFotosHtml(r) {
  const fotos = r.fotos || [];
  return fotos.map((f, i) => `
    <div class="foto-thumb">
      <img src="${f}" alt="Evidencia ${i+1}" onclick="abrirLightbox(event,'${f}')">
      <button class="foto-thumb-remove" onclick="eliminarFotoReunion('${r.id}',${i},event)" title="Eliminar foto">✕</button>
    </div>`).join('');
}

/* ─── Render completo — solo al abrir el detalle ─── */
function renderDetalleReunion(r) {
  const g = D.groups[r.groupIdx];
  const content = document.getElementById('reunion-detalle-content');
  if (!content || !g) return;

  // Si la estructura ya existe, hacer update quirúrgico para no perder el textarea
  if (content.querySelector('#rd-stats-bar')) {
    _actualizarStatsReunion(r, g);
    _actualizarAttReunion(r, g);
    _actualizarTemasReunion(r);
    _actualizarAcuerdosReunion(r);
    _actualizarFotosReunion(r);
    // NO tocar el textarea de observaciones
    return;
  }

  // Primera vez: construir estructura completa
  content.innerHTML = `
  <!-- STATS -->
  <div class="reunion-stats-bar" id="rd-stats-bar">${_buildStatsHtml(r, g)}</div>

  <!-- TEMAS A TRATAR KANBAN -->
  ${(r.temasKanban && r.temasKanban.length) ? `
  <div class="reunion-detalle-section" id="rd-kanban-section">
    <div class="reunion-detalle-title">📌 Temas a Tratar — Tablero Kanban</div>
    <div class="kanban-board">
      ${['pendiente','proceso','resuelto'].map(col => {
        const labels = {pendiente:'⏳ Por Tratar', proceso:'🔄 En Proceso', resuelto:'✅ Resuelto'};
        const hdrCls = {pendiente:'kh-pendiente', proceso:'kh-proceso', resuelto:'kh-resuelto'};
        const items = r.temasKanban.filter(t => t.col === col);
        return `<div class="kanban-col">
          <div class="kanban-col-header ${hdrCls[col]}">${labels[col]} <span style="background:var(--surface);padding:1px 7px;border-radius:20px;">${items.length}</span></div>
          ${items.map(t => `<div class="kanban-card" style="cursor:default;">${escHtml(t.texto)}</div>`).join('') || '<div style="color:var(--muted);font-size:0.75rem;font-style:italic;padding:4px 2px;">Sin temas</div>'}
        </div>`;
      }).join('')}
    </div>
  </div>` : ''}

  <!-- ASISTENCIA -->
  <div class="reunion-detalle-section">
    <div class="reunion-detalle-title">👨‍👩‍👧 Lista de Asistencia por Estudiante</div>
    <div style="font-size:0.74rem;color:var(--muted);margin-bottom:12px;line-height:1.4;">
      Marca quién asistió: <strong style="color:var(--green);">Presente</strong> = papá/mamá registrado.
      <strong style="color:var(--primary-light);">Apoderado</strong> = otra persona en su lugar.
      <strong style="color:var(--red);">Ausente</strong> = no se presentó.
    </div>
    <div id="rd-att-list">${_buildAttHtml(r, g)}</div>
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-secondary btn-sm" onclick="marcarTodosPresente('${r.id}')">✅ Todos presentes</button>
      <button class="btn btn-secondary btn-sm" onclick="marcarTodosAusente('${r.id}')">❌ Todos ausentes</button>
    </div>
  </div>

  <!-- TEMAS -->
  <div class="reunion-detalle-section">
    <div class="reunion-detalle-title">📌 Temas Tratados en la Reunión</div>
    <div id="rd-temas-list">${_buildTemasHtml(r)}</div>
    <div style="display:flex;gap:8px;margin-top:10px;">
      <input type="text" id="nuevo-tema-inp" placeholder="Escribe un tema y presiona Enter o ➕ Agregar..."
        style="flex:1;background:var(--surface2);border:1.5px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;"
        onkeydown="if(event.key==='Enter'){event.preventDefault();agregarTemaReunion('${r.id}');}">
      <button class="btn btn-secondary btn-sm" onclick="agregarTemaReunion('${r.id}')" style="border-color:var(--primary);color:var(--primary-light);">➕ Agregar</button>
    </div>
  </div>

  <!-- ACUERDOS -->
  <div class="reunion-detalle-section">
    <div class="reunion-detalle-title">✅ Acuerdos Tomados</div>
    <div id="rd-acuerdos-list">${_buildAcuerdosHtml(r)}</div>
    <div style="display:flex;gap:8px;margin-top:10px;">
      <input type="text" id="nuevo-acuerdo-inp" placeholder="Escribe un acuerdo y presiona Enter o ➕ Agregar..."
        style="flex:1;background:var(--surface2);border:1.5px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;"
        onkeydown="if(event.key==='Enter'){event.preventDefault();agregarAcuerdoReunion('${r.id}');}">
      <button class="btn btn-secondary btn-sm" onclick="agregarAcuerdoReunion('${r.id}')" style="border-color:var(--accent);color:var(--accent);">➕ Agregar</button>
    </div>
  </div>

  <!-- FOTOS -->
  <div class="reunion-detalle-section">
    <div class="reunion-detalle-title">📷 Evidencia Fotográfica</div>
    <div style="background:rgba(14,165,233,0.06);border:1px solid rgba(14,165,233,0.2);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:0.75rem;color:var(--muted);line-height:1.5;">
      <strong style="color:var(--primary-light);">💡 Recomendación:</strong> Sube fotos directamente desde tu celular (JPG comprimido). Las imágenes se comprimen automáticamente a 1200px antes de guardar. Máximo recomendado: 8 fotos por reunión para no sobrecargar el almacenamiento.
    </div>
    <div class="foto-evidencia-grid" id="rd-fotos-grid">
      ${_buildFotosHtml(r)}
      <label class="foto-add-btn" for="foto-input-${r.id}" style="font-size:0.75rem;color:var(--muted);">
        <span style="font-size:1.8rem;">📷</span><span>Agregar foto</span>
      </label>
    </div>
    <input type="file" id="foto-input-${r.id}" accept="image/*" multiple style="display:none;" onchange="subirFotosReunion('${r.id}',this)">
    <div style="margin-top:8px;font-size:0.7rem;color:var(--muted);">📱 Selecciona múltiples fotos a la vez. Formatos: JPG, PNG, HEIC.</div>
  </div>

  <!-- OBSERVACIONES -->
  <div class="reunion-detalle-section">
    <div class="reunion-detalle-title">📝 Observaciones Generales</div>
    <textarea id="reunion-obs-area" rows="5"
      placeholder="Escribe observaciones generales de la reunión (desarrollo, clima, incidencias, compromisos verbales no formales, etc.)..."
      style="width:100%;background:var(--surface2);border:1.5px solid var(--border);border-radius:8px;padding:10px 14px;color:var(--text);font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;resize:vertical;box-sizing:border-box;transition:border-color 0.15s;"
      onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"></textarea>
    <div style="display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap;">
      <button class="btn btn-secondary btn-sm" id="rd-obs-save-btn" onclick="guardarObservacionesReunion('${r.id}')" style="border-color:var(--accent);color:var(--accent);">💾 Guardar Observaciones</button>
      <button class="btn btn-secondary btn-sm" id="rd-obs-edit-btn" onclick="editarObservacionesReunion()" style="display:none;border-color:var(--primary);color:var(--primary-light);">✏️ Editar</button>
      <span id="rd-obs-status" style="font-size:0.72rem;color:var(--muted);"></span>
    </div>
  </div>`;

  // Cargar observaciones guardadas en el textarea SIN escHtml (valor real)
  const ta = document.getElementById('reunion-obs-area');
  if (ta) {
    ta.value = r.observaciones || '';
    // Si ya hay observaciones guardadas, bloquear el textarea
    if (r.observaciones) {
      ta.readOnly = true;
      ta.style.opacity = '0.75';
      ta.style.cursor = 'not-allowed';
      const saveBtn = document.getElementById('rd-obs-save-btn');
      const editBtn = document.getElementById('rd-obs-edit-btn');
      if (saveBtn) saveBtn.style.display = 'none';
      if (editBtn) editBtn.style.display = 'inline-flex';
    }
  }

  // Detectar cambios sin guardar en el textarea
  if (ta) {
    ta.addEventListener('input', () => {
      if (ta.readOnly) return;
      const statusEl = document.getElementById('rd-obs-status');
      if (statusEl) { statusEl.textContent = '● Sin guardar'; statusEl.style.color = 'var(--yellow)'; }
    });
  }
}

/* ─── Helpers de actualización quirúrgica (sin tocar textarea) ─── */
function _actualizarStatsReunion(r, g) {
  const el = document.getElementById('rd-stats-bar');
  if (el) el.innerHTML = _buildStatsHtml(r, g);
}
function _actualizarAttReunion(r, g) {
  const el = document.getElementById('rd-att-list');
  if (el) el.innerHTML = _buildAttHtml(r, g);
}
function _actualizarTemasReunion(r) {
  const el = document.getElementById('rd-temas-list');
  if (el) el.innerHTML = _buildTemasHtml(r);
}
function _actualizarAcuerdosReunion(r) {
  const el = document.getElementById('rd-acuerdos-list');
  if (el) el.innerHTML = _buildAcuerdosHtml(r);
}
function _actualizarFotosReunion(r) {
  const grid = document.getElementById('rd-fotos-grid');
  if (!grid) return;
  // Reconstruir fotos + botón agregar
  grid.innerHTML = _buildFotosHtml(r) +
    `<label class="foto-add-btn" for="foto-input-${r.id}" style="font-size:0.75rem;color:var(--muted);">
      <span style="font-size:1.8rem;">📷</span><span>Agregar foto</span>
    </label>`;
}

/* ── Marcar asistencia de padre ── */
function marcarAsistenciaPadre(reunionId, studentIdx, valor) {
  ensureReuniones();
  const r = D.reuniones.find(x => x.id === reunionId); if (!r) return;
  if (!r.asistencia) r.asistencia = {};
  const key = String(studentIdx);
  r.asistencia[key] = r.asistencia[key] === valor ? '' : valor;
  save();
  const g = D.groups[r.groupIdx];
  _actualizarStatsReunion(r, g);
  _actualizarAttReunion(r, g);
  toast('✅ Asistencia actualizada', 'var(--accent)');
}

function marcarTodosPresente(reunionId) {
  ensureReuniones();
  const r = D.reuniones.find(x => x.id === reunionId); if (!r) return;
  const g = D.groups[r.groupIdx]; if (!g) return;
  if (!r.asistencia) r.asistencia = {};
  g.students.forEach((_, i) => { if (!g.withdrawn?.includes(i)) r.asistencia[String(i)] = 'presente'; });
  save(); _actualizarStatsReunion(r, g); _actualizarAttReunion(r, g); toast('✅ Todos marcados como presentes', 'var(--green)');
}

function marcarTodosAusente(reunionId) {
  ensureReuniones();
  const r = D.reuniones.find(x => x.id === reunionId); if (!r) return;
  const g = D.groups[r.groupIdx]; if (!g) return;
  if (!r.asistencia) r.asistencia = {};
  g.students.forEach((_, i) => { if (!g.withdrawn?.includes(i)) r.asistencia[String(i)] = 'ausente'; });
  save(); _actualizarStatsReunion(r, g); _actualizarAttReunion(r, g); toast('❌ Todos marcados como ausentes', 'var(--red)');
}

/* ── Temas — CRUD completo ── */
function agregarTemaReunion(reunionId) {
  const inp = document.getElementById('nuevo-tema-inp'); if (!inp) return;
  const texto = inp.value.trim(); if (!texto) { toast('⚠️ Escribe el tema', 'var(--yellow)'); return; }
  ensureReuniones();
  const r = D.reuniones.find(x => x.id === reunionId); if (!r) return;
  if (!r.temas) r.temas = [];
  r.temas.push(texto); inp.value = '';
  save(); _actualizarTemasReunion(r); toast('📌 Tema agregado', 'var(--primary)');
}

function editarTemaInline(reunionId, idx) {
  const spanEl = document.getElementById(`tema-text-${idx}`);
  if (!spanEl || spanEl.querySelector('input')) return; // ya en edición
  ensureReuniones();
  const r = D.reuniones.find(x => x.id === reunionId); if (!r) return;
  const actual = r.temas[idx] || '';
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.value = actual;
  inp.style.cssText = 'flex:1;width:100%;background:var(--surface3);border:1.5px solid var(--primary);border-radius:6px;padding:4px 8px;color:var(--text);font-family:Poppins,sans-serif;font-size:0.82rem;outline:none;';
  spanEl.innerHTML = '';
  spanEl.appendChild(inp);
  inp.focus();
  inp.select();
  function guardar() {
    const v = inp.value.trim();
    if (!v) { toast('⚠️ El tema no puede estar vacío', 'var(--yellow)'); spanEl.innerHTML = '📌 ' + escHtml(actual); return; }
    r.temas[idx] = v;
    save(); _actualizarTemasReunion(r); toast('✏️ Tema actualizado', 'var(--primary)');
  }
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); guardar(); } if (e.key === 'Escape') { spanEl.innerHTML = '📌 ' + escHtml(actual); } });
  inp.addEventListener('blur', guardar);
}

function editarTemaReunion(reunionId, idx) { editarTemaInline(reunionId, idx); }

function eliminarTemaReunion(reunionId, idx) {
  if (!confirm('¿Eliminar este tema?')) return;
  ensureReuniones();
  const r = D.reuniones.find(x => x.id === reunionId); if (!r) return;
  r.temas.splice(idx, 1); save(); _actualizarTemasReunion(r); toast('🗑 Tema eliminado', 'var(--red)');
}

/* ── Acuerdos — CRUD completo ── */
function agregarAcuerdoReunion(reunionId) {
  const inp = document.getElementById('nuevo-acuerdo-inp'); if (!inp) return;
  const texto = inp.value.trim(); if (!texto) { toast('⚠️ Escribe el acuerdo', 'var(--yellow)'); return; }
  ensureReuniones();
  const r = D.reuniones.find(x => x.id === reunionId); if (!r) return;
  if (!r.acuerdos) r.acuerdos = [];
  r.acuerdos.push(texto); inp.value = '';
  save(); _actualizarAcuerdosReunion(r); toast('✅ Acuerdo registrado', 'var(--accent)');
}

function editarAcuerdoInline(reunionId, idx) {
  const spanEl = document.getElementById(`acuerdo-text-${idx}`);
  if (!spanEl || spanEl.querySelector('input')) return; // ya en edición
  ensureReuniones();
  const r = D.reuniones.find(x => x.id === reunionId); if (!r) return;
  const actual = r.acuerdos[idx] || '';
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.value = actual;
  inp.style.cssText = 'flex:1;width:100%;background:var(--surface3);border:1.5px solid var(--accent);border-radius:6px;padding:4px 8px;color:var(--text);font-family:Poppins,sans-serif;font-size:0.82rem;outline:none;';
  spanEl.innerHTML = '';
  spanEl.appendChild(inp);
  inp.focus();
  inp.select();
  function guardar() {
    const v = inp.value.trim();
    if (!v) { toast('⚠️ El acuerdo no puede estar vacío', 'var(--yellow)'); spanEl.innerHTML = '✅ ' + escHtml(actual); return; }
    r.acuerdos[idx] = v;
    save(); _actualizarAcuerdosReunion(r); toast('✏️ Acuerdo actualizado', 'var(--accent)');
  }
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); guardar(); } if (e.key === 'Escape') { spanEl.innerHTML = '✅ ' + escHtml(actual); } });
  inp.addEventListener('blur', guardar);
}

function editarAcuerdoReunion(reunionId, idx) { editarAcuerdoInline(reunionId, idx); }

function eliminarAcuerdoReunion(reunionId, idx) {
  if (!confirm('¿Eliminar este acuerdo?')) return;
  ensureReuniones();
  const r = D.reuniones.find(x => x.id === reunionId); if (!r) return;
  r.acuerdos.splice(idx, 1); save(); _actualizarAcuerdosReunion(r); toast('🗑 Acuerdo eliminado', 'var(--red)');
}

/* ── Observaciones — guarda SIN re-render ── */
function guardarObservacionesReunion(reunionId) {
  ensureReuniones();
  const r = D.reuniones.find(x => x.id === reunionId); if (!r) return;
  const ta = document.getElementById('reunion-obs-area');
  if (!ta) { toast('⚠️ No se encontró el campo', 'var(--red)'); return; }
  r.observaciones = ta.value; // Guardar valor RAW sin trim ni escHtml
  save();
  // Bloquear textarea tras guardar
  ta.readOnly = true;
  ta.style.opacity = '0.75';
  ta.style.cursor = 'not-allowed';
  const saveBtn = document.getElementById('rd-obs-save-btn');
  const editBtn = document.getElementById('rd-obs-edit-btn');
  if (saveBtn) saveBtn.style.display = 'none';
  if (editBtn) editBtn.style.display = 'inline-flex';
  const statusEl = document.getElementById('rd-obs-status');
  if (statusEl) { statusEl.textContent = '✓ Guardado'; statusEl.style.color = 'var(--accent)'; setTimeout(() => { statusEl.textContent = ''; }, 2500); }
  toast('💾 Observaciones guardadas', 'var(--accent)');
}

/* ── Desbloquear observaciones para editar ── */
function editarObservacionesReunion() {
  const ta = document.getElementById('reunion-obs-area');
  if (!ta) return;
  ta.readOnly = false;
  ta.style.opacity = '1';
  ta.style.cursor = 'text';
  ta.focus();
  const saveBtn = document.getElementById('rd-obs-save-btn');
  const editBtn = document.getElementById('rd-obs-edit-btn');
  if (saveBtn) saveBtn.style.display = 'inline-flex';
  if (editBtn) editBtn.style.display = 'none';
  const statusEl = document.getElementById('rd-obs-status');
  if (statusEl) { statusEl.textContent = '● Editando...'; statusEl.style.color = 'var(--yellow)'; }
}

/* ── Fotos ── */
function subirFotosReunion(reunionId, inputEl) {
  ensureReuniones();
  const r = D.reuniones.find(x => x.id === reunionId); if (!r) return;
  if (!r.fotos) r.fotos = [];
  const files = Array.from(inputEl.files);
  if (!files.length) return;

  let procesadas = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 1200;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.78);
        r.fotos.push(compressed);
        procesadas++;
        if (procesadas === files.length) {
          save();
          _actualizarFotosReunion(r); // quirúrgico — no toca textarea
          toast(`📷 ${files.length} foto${files.length > 1 ? 's' : ''} agregada${files.length > 1 ? 's' : ''}`, 'var(--primary)');
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
  inputEl.value = '';
}

function eliminarFotoReunion(reunionId, idx, evt) {
  if (evt) evt.stopPropagation();
  if (!confirm('¿Eliminar esta foto?')) return;
  ensureReuniones();
  const r = D.reuniones.find(x => x.id === reunionId); if (!r) return;
  r.fotos.splice(idx, 1);
  save();
  _actualizarFotosReunion(r); // quirúrgico — no toca textarea
  toast('🗑 Foto eliminada', 'var(--red)');
}

function abrirLightbox(evt, src) {
  if (evt) evt.stopPropagation();
  const lb = document.getElementById('fotoLightbox');
  const img = document.getElementById('fotoLightboxImg');
  if (lb && img) { img.src = src; lb.style.display = 'flex'; }
}

function cerrarLightbox() {
  const lb = document.getElementById('fotoLightbox');
  if (lb) lb.style.display = 'none';
}

// =========================================
// KANBAN TEMAS A TRATAR — MODAL NUEVA REUNIÓN
// =========================================
let _mnrKanbanTemas = []; // [{texto, col}]
let _mnrDragIdx = null;

function mnrKanbanRender() {
  ['pendiente','proceso','resuelto'].forEach(col => {
    const container = document.getElementById('mnr-cards-' + col);
    const cnt = document.getElementById('mnr-cnt-' + col);
    if (!container) return;
    const items = _mnrKanbanTemas.filter(t => t.col === col);
    if (cnt) cnt.textContent = items.length;
    container.innerHTML = items.map((t, localIdx) => {
      const globalIdx = _mnrKanbanTemas.indexOf(t);
      return `<div class="kanban-card" draggable="true"
        ondragstart="mnrKanbanDragStart(event,${globalIdx})"
        ondragend="mnrKanbanDragEnd(event)">
        <span style="flex:1;font-size:0.79rem;line-height:1.35;">${escHtml(t.texto)}</span>
        <div class="kanban-card-actions">
          <button class="kc-btn" title="Eliminar" onclick="mnrKanbanRemove(${globalIdx})">✕</button>
        </div>
      </div>`;
    }).join('');
  });
}

function mnrKanbanAdd(col) {
  const inp = document.getElementById('mnr-inp-' + col);
  if (!inp) return;
  const texto = inp.value.trim();
  if (!texto) return;
  _mnrKanbanTemas.push({ texto, col });
  inp.value = '';
  mnrKanbanRender();
}

function mnrKanbanRemove(idx) {
  _mnrKanbanTemas.splice(idx, 1);
  mnrKanbanRender();
}

function mnrKanbanDragStart(event, idx) {
  _mnrDragIdx = idx;
  event.dataTransfer.effectAllowed = 'move';
  setTimeout(() => { const el = event.target; if (el) el.classList.add('dragging'); }, 0);
}

function mnrKanbanDragEnd(event) {
  _mnrDragIdx = null;
  document.querySelectorAll('.kanban-card').forEach(c => c.classList.remove('dragging'));
}

function mnrKanbanDragOver(event, col) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  const colEl = document.getElementById('mnr-col-' + col);
  if (colEl) colEl.classList.add('drag-over');
}

function mnrKanbanDragLeave(event) {
  if (event.currentTarget) event.currentTarget.classList.remove('drag-over');
}

function mnrKanbanDrop(event, col) {
  event.preventDefault();
  const colEl = document.getElementById('mnr-col-' + col);
  if (colEl) colEl.classList.remove('drag-over');
  if (_mnrDragIdx === null) return;
  _mnrKanbanTemas[_mnrDragIdx].col = col;
  _mnrDragIdx = null;
  mnrKanbanRender();
}

function mnrKanbanLoad(temas) {
  // temas puede ser array de strings (legacy) o [{texto, col}]
  _mnrKanbanTemas = (temas || []).map(t =>
    typeof t === 'string' ? { texto: t, col: 'pendiente' } : t
  );
  mnrKanbanRender();
}

function mnrKanbanGet() {
  return _mnrKanbanTemas.map(t => ({ texto: t.texto, col: t.col }));
}

/* ── Modal nueva / editar reunión ── */
function abrirModalNuevaReunion() {
  poblarSelectGruposReunion();
  document.getElementById('mNuevaReunion-title').textContent = '🤝 Nueva Reunión';
  document.getElementById('mnr-titulo').value = '';
  document.getElementById('mnr-fecha').value = currentMasterDate;
  document.getElementById('mnr-hora').value = '';
  document.getElementById('mnr-lugar').value = '';
  document.getElementById('mnr-estado').value = 'pendiente';
  document.getElementById('mnr-edit-id').value = '';
  document.getElementById('mnr-btn-delete').style.display = 'none';
  mnrKanbanLoad([]); // Kanban vacío
  // Preseleccionar el grupo activo si hay uno
  const sel = document.getElementById('mnr-grupo');
  if (sel && gIdx !== null) sel.value = gIdx;
  openModal('mNuevaReunion');
}

function abrirEditarReunion() {
  ensureReuniones();
  const r = D.reuniones.find(x => x.id === reunionDetalleId); if (!r) return;
  poblarSelectGruposReunion();
  document.getElementById('mNuevaReunion-title').textContent = '✏️ Editar Reunión';
  document.getElementById('mnr-grupo').value = r.groupIdx;
  document.getElementById('mnr-titulo').value = r.titulo || '';
  document.getElementById('mnr-fecha').value = r.fecha || '';
  document.getElementById('mnr-hora').value = r.hora || '';
  document.getElementById('mnr-lugar').value = r.lugar || '';
  document.getElementById('mnr-estado').value = r.estado || 'pendiente';
  document.getElementById('mnr-edit-id').value = r.id;
  document.getElementById('mnr-btn-delete').style.display = 'inline-flex';
  mnrKanbanLoad(r.temasKanban || r.temas || []); // cargar temas Kanban existentes
  openModal('mNuevaReunion');
}

function guardarReunion() {
  ensureReuniones();
  const gIdxVal = parseInt(document.getElementById('mnr-grupo').value);
  const titulo = document.getElementById('mnr-titulo').value.trim();
  const fecha = document.getElementById('mnr-fecha').value;
  const hora = document.getElementById('mnr-hora').value;
  const lugar = document.getElementById('mnr-lugar').value.trim();
  const estado = document.getElementById('mnr-estado').value;
  const editId = document.getElementById('mnr-edit-id').value;
  const temasKanban = mnrKanbanGet();

  if (isNaN(gIdxVal)) { toast('⚠️ Selecciona un grupo', 'var(--red)'); return; }
  if (!titulo) { toast('⚠️ Escribe el nombre de la reunión', 'var(--red)'); return; }
  if (!fecha) { toast('⚠️ Indica la fecha', 'var(--red)'); return; }

  if (editId) {
    const r = D.reuniones.find(x => x.id === editId);
    if (r) { r.titulo = titulo; r.fecha = fecha; r.hora = hora; r.lugar = lugar; r.estado = estado; r.groupIdx = gIdxVal; r.temasKanban = temasKanban; }
    toast('✏️ Reunión actualizada');
  } else {
    D.reuniones.push({
      id: 'rn_' + Date.now(),
      groupIdx: gIdxVal, titulo, fecha, hora, lugar, estado,
      temasKanban,
      asistencia: {}, temas: [], acuerdos: [], fotos: [], observaciones: ''
    });
    toast('✅ Reunión registrada');
  }
  save();
  closeModal('mNuevaReunion');

  // Si estamos en el detalle y editamos, re-renderizar
  if (editId && reunionDetalleId === editId) {
    const r = D.reuniones.find(x => x.id === editId);
    if (r) {
      const fechaStr = r.fecha ? new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '';
      document.getElementById('reunion-detalle-title').textContent = `📋 ${r.titulo || 'Reunión'}`;
      document.getElementById('reunion-detalle-fecha').textContent = fechaStr + (r.hora ? ' · ' + r.hora : '') + (r.lugar ? ' · ' + r.lugar : '');
      const content = document.getElementById('reunion-detalle-content');
      if (content) content.innerHTML = '';
      renderDetalleReunion(r);
    }
  } else if (!editId) {
    openReunionPadres();
  }
  renderReunionList();
}

function eliminarReunion() {
  const editId = document.getElementById('mnr-edit-id').value; if (!editId) return;
  if (!confirm('¿Eliminar permanentemente esta reunión? Se perderá toda la información registrada.')) return;
  ensureReuniones();
  D.reuniones = D.reuniones.filter(r => r.id !== editId);
  save(); closeModal('mNuevaReunion');
  reunionDetalleId = null;
  openReunionPadres();
  toast('🗑 Reunión eliminada', 'var(--red)');
}

// =========================================
// INICIALIZACIÓN (BOOTSTRAP)
// =========================================
recoverDataOnLoad();          // intenta recuperar si localStorage principal falló
updateMasterDateUI(); renderHome();
pushSnapshot('inicio');       // snapshot al abrir la app
startAutoSnapshot();          // snapshot automático cada 10 min
setTimeout(refreshBackupStatusUI, 500); // refresca UI de backups
setTimeout(gdriveInitUI, 1000);         // inicializa Google Drive sync
