//conección con API
async function api(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ocurrió un error. Intenta de nuevo.');
  return data;
}
//arreglo de preguntas
const QUESTIONS = [
  { stage: 'Temperatura', t: '¿Qué tonalidad identificas en tu piel con luz natural?',
    o: ['Rosada o rojiza', 'Dorada, amarilla o durazno', 'Sin predominio claro'] },
  { stage: 'Temperatura', t: '¿De qué color se ven tus venas?',
    o: ['Azules o moradas', 'Verdes u olivas', 'Mezcla de azules y verdes', 'No logro distinguirlas'] },
  { stage: 'Temperatura', t: '¿Qué colores favorecen más a tu rostro?',
    o: ['Fucsia, azul frío, morado o rojo cereza', 'Coral, naranja, terracota o dorado', 'Ambos grupos', 'No estoy segura'] },
  { stage: 'Temperatura', t: '¿Cómo es tu cabello natural?',
    o: ['Cenizo o de aspecto frío', 'Dorado, cobrizo o castaño cálido', 'Sin tendencia clara'] },
  { stage: 'Intensidad', t: '¿De qué color son tus ojos naturales?',
    o: ['Azul claro, verde claro o gris claro', 'Verde intenso, miel o café medio', 'Café oscuro o casi negro'] },
  { stage: 'Intensidad', t: '¿Qué tan oscuro es tu cabello natural?',
    o: ['Rubio claro o castaño claro', 'Rubio oscuro, cobrizo o castaño medio', 'Castaño muy oscuro o negro'] },
  { stage: 'Intensidad', t: '¿Qué contraste hay entre tu piel, cabello y ojos?',
    o: ['Bajo: los colores son similares y los rasgos se ven suaves',
        'Alto: los ojos o el cabello destacan mucho respecto a la piel',
        'Predominan los rasgos oscuros', 'No estoy segura'] }
];

const AVISO = `<b>Aviso de privacidad.</b> OWN recopila tu correo, tus respuestas del test de colorimetría y tus pedidos únicamente para darte tu recomendación de tonos y gestionar tus pedidos. Tu contraseña se guarda cifrada. <b>Derechos ARCO:</b> puedes solicitar el Acceso, Rectificación, Cancelación u Oposición al tratamiento de tus datos personales en cualquier momento.`;

//estados
const $app = document.getElementById('app');
const S = {
  user: null, view: 'auth', msg: '', busy: false,
  qi: 0, ans: [],
  result: { done: false, category: null, pending: null, tones: [] },
  orders: [], draft: null
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = d => new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
const hasResult = () => S.result.done && (S.result.category || S.result.pending);

async function loadResult() { S.result = await api('/test/result'); }
async function loadOrders() { S.orders = await api('/orders'); }
function resetTest() { S.qi = 0; S.ans = []; }

//pantallas
const toneCard = (t, extra = '') => `
  <article class="tone">
    <div class="sw" style="background:${esc(t.hex)}"></div>
    <div class="info"><h3>${esc(t.name)}</h3><span class="hex">Tono ${t.position} · ${esc(t.hex)}</span>${extra}</div>
  </article>`;
const refillBtn = t => `<button class="btn small" data-act="order" data-type="refill" data-id="${t.id}">Pedir repuesto</button>`;
const hero = (title, sub = '') => `<header class="hero"><h1>${title}</h1>${sub ? `<small>${sub}</small>` : ''}</header>`;

const V = {
  auth: () => `<div class="auth"><section class="brand on-wine"><img src="imagenes/logo.png" alt="Logo" class="logo"><p>Encuentra los tonos que son tuyos</p></section>
    <section class="panel"><form class="form" data-form="login">
      <h1>Bienvenid@</h1>
      <input class="field" type="email" name="email" placeholder="Email" required autocomplete="email">
      <input class="field" type="password" name="password" placeholder="Contraseña" required autocomplete="current-password">
      <div class="msg" role="alert">${esc(S.msg)}</div>
      <button class="btn" ${S.busy ? 'disabled' : ''}>Iniciar sesión</button>
      <button type="button" class="btn wine" data-act="goto" data-v="register">Crear cuenta</button>
      <button type="button" class="btn link" data-act="forgot">¿Olvidaste tu contraseña?</button>
    </form></section></div>`,

  register: () => `<div class="auth"><section class="brand on-wine"><img src="imagenes/logo.png" alt="Logo" class="logo"><p>Encuentra los tonos que son tuyos</p></section>
    <section class="panel"><form class="form" data-form="register">
      <h1>Crear cuenta</h1>
      <input class="field" type="email" name="email" placeholder="Email" required autocomplete="email">
      <input class="field" type="password" name="password" placeholder="Contraseña (mínimo 6 caracteres)" required minlength="6" autocomplete="new-password">
      <div class="aviso">${AVISO}</div>
      <label class="chk"><input type="checkbox" name="privacy" required> Acepto el aviso de privacidad y conozco mis derechos ARCO.</label>
      <div class="msg" role="alert">${esc(S.msg)}</div>
      <button class="btn" ${S.busy ? 'disabled' : ''}>Crear cuenta</button>
      <button type="button" class="btn link" data-act="goto" data-v="auth">Ya tengo cuenta</button>
    </form></section></div>`,

  test() {
    const q = QUESTIONS[S.qi];
    return hero('Test de colorimetría', 'Responde con lo que ves en ti, sin maquillaje y con luz natural.') + `
      <section class="card">
        <div class="steps" aria-hidden="true">${QUESTIONS.map((_, i) => `<i class="${i <= S.qi ? 'done' : ''}"></i>`).join('')}</div>
        <p class="stage">${q.stage}: pregunta ${S.qi + 1} de ${QUESTIONS.length}</p>
        <h2 class="q">${esc(q.t)}</h2>
        <div class="opts">${q.o.map((o, i) => `<button class="opt ${S.ans[S.qi] === i ? 'sel' : ''}" data-act="answer" data-i="${i}" ${S.busy ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>
        <div class="msg" role="alert">${esc(S.msg)}</div>
        ${S.qi ? '<button class="btn link" data-act="back">Pregunta anterior</button>' : ''}
      </section>`;
  },

  result() {
    const r = S.result;
    if (r.pending) return hero('Tu resultado', 'Aún no podemos asignarte una categoría') + `
      <section class="card pending"><h2>Resultado por confirmar</h2>
        <p>Tus respuestas no permiten definir tu ${esc(r.pending.replace(' por confirmar', ''))} con certeza. Para no darte un resultado al azar, repite el test o solicita una revisión.</p>
        <button class="btn" data-act="retake">Repetir test</button></section>`;
    return hero('Tu resultado', `Categoría OWN: ${esc(r.category)}`) +
      `<div class="tones">${r.tones.map(t => toneCard(t)).join('')}</div>
       <div class="actions"><button class="btn" data-act="order" data-type="kit">Comprar kit completo</button>
       <button class="btn link" data-act="retake">Repetir test</button></div>`;
  },

  orders() {
    return hero('Mis pedidos') + `<section class="card">${S.orders.length ? `<div class="wrap"><table>
      <tr><th>Pedido</th><th>Producto</th><th>Fecha</th></tr>
      ${S.orders.map(o => `<tr><td>#${o.id}</td><td>${o.type === 'kit' ? 'Kit completo'
        : `<span class="dot" style="background:${esc(o.tone_hex)}"></span>${esc(o.tone_name)} (repuesto)`}</td><td>${fmt(o.created_at)}</td></tr>`).join('')}
      </table></div>` : '<p class="empty">Aún no tienes pedidos. Haz el test y pide tu primer kit.</p>'}</section>`;
  },

  account() {
    const t = S.result.tones;
    return hero('Mi cuenta', esc(S.user.email)) + `<h2>Mis tonos</h2>` +
      (t.length ? `<div class="tones">${t.map(x => toneCard(x, refillBtn(x))).join('')}</div>
        <div class="actions"><button class="btn" data-act="order" data-type="kit">Comprar kit completo</button></div>`
        : '<section class="card"><p class="empty">Aún no tienes tonos. Haz el test de colorimetría.</p></section>') +
      `<div class="actions" style="margin-top:30px"><button class="btn wine" data-act="logout">Cerrar sesión</button></div>`;
  },

  confirm() {
    const d = S.draft;
    // Leer datos guardados en el navegador (si no hay, usa un objeto vacío)
    const saved = JSON.parse(localStorage.getItem('own_address') || '{}');
    
    return hero('Confirmar pedido') + `<section class="card center">
      ${d.type === 'kit' ? '<h2>Kit completo</h2><p>Los 3 tonos de tu categoría.</p>'
        : `<h2>Repuesto: ${esc(d.tone.name)}</h2><div class="sw" style="background:${esc(d.tone.hex)};height:90px;border-radius:18px;margin:14px 0"></div>`}
      
      <form data-form="order" style="margin-top: 24px; text-align: left;">
        <h3 style="margin-bottom: 14px; font-size: 1.2rem; text-align: center;">Datos de envío</h3>
        
        <input class="field" type="text" name="calle" value="${esc(saved.calle || '')}" placeholder="Calle y número" required style="margin-bottom: 10px;">
        <input class="field" type="text" name="colonia" value="${esc(saved.colonia || '')}" placeholder="Colonia" required style="margin-bottom: 10px;">
        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
          <input class="field" type="text" name="ciudad" value="${esc(saved.ciudad || '')}" placeholder="Ciudad" required>
          <input class="field" type="text" name="cp" value="${esc(saved.cp || '')}" placeholder="C.P." required style="width: 140px;">
        </div>
        <input class="field" type="text" name="estado" value="${esc(saved.estado || '')}" placeholder="Estado" required style="margin-bottom: 14px;">
        
        <div class="msg" role="alert" style="text-align:center">${esc(S.msg)}</div>
        <div class="actions" style="justify-content:center; margin-top: 20px;">
          <button type="submit" class="btn" ${S.busy ? 'disabled' : ''}>Confirmar pedido</button>
          <button type="button" class="btn link" data-act="cancel">Cancelar</button>
        </div>
      </form>
    </section>`;
  },

  sent: () => `<section class="center"><div class="check">✓</div><h1>Tu pedido ha sido realizado</h1>
    <p style="margin:14px 0 24px">Gracias por tu compra.</p><button class="btn" data-act="nav" data-v="orders">Ver mis pedidos</button></section>`
};

const NAV = [['home', 'Inicio'], ['orders', 'Pedidos'], ['account', 'Cuenta']];
const navGroup = v => (['test', 'result', 'confirm', 'sent'].includes(v) ? 'home' : v);

function render() {
  if (!S.user) { $app.innerHTML = V[S.view === 'register' ? 'register' : 'auth'](); return; }
  let view = S.view;
  if (view === 'home') view = hasResult() ? 'result' : 'test';
  $app.innerHTML = `<div class="shell"><aside class="side"><img src="imagenes/logo.png" alt="Logo" class="logo">
    ${NAV.map(([k, l]) => `<button class="${navGroup(S.view) === k ? 'on' : ''}" data-act="nav" data-v="${k}">${l}</button>`).join('')}
    <div class="who">${esc(S.user.email)}</div></aside>
    <main class="main">${V[view]()}</main></div>`;
  window.scrollTo(0, 0);
}

//Eventos
document.addEventListener('submit', async e => {
  e.preventDefault();
  if (S.busy) return;
  const f = e.target, fd = new FormData(f), kind = f.dataset.form;
  S.busy = true; S.msg = '';
  
  try {
    if (kind === 'order') {
      // 1. Guardar en el navegador para la próxima vez
      const addressData = {
        calle: fd.get('calle'),
        colonia: fd.get('colonia'),
        ciudad: fd.get('ciudad'),
        cp: fd.get('cp'),
        estado: fd.get('estado')
      };
      localStorage.setItem('own_address', JSON.stringify(addressData));
      
      // 2. Enviar a la API
      await api('/orders', 'POST', { 
        type: S.draft.type, 
        toneId: S.draft.tone?.id 
      });
      
      S.draft = null; 
      S.view = 'sent';
    } else {
      // Lógica original para login y registro
      const body = { email: fd.get('email'), password: fd.get('password') };
      if (kind === 'register') body.privacy = fd.get('privacy') === 'on';
      S.user = await api('/auth/' + kind, 'POST', body);
      await loadResult(); resetTest(); S.view = 'home';
    }
  } catch (err) { S.msg = err.message; }
  
  S.busy = false; render();
});

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]');
  if (!b || S.busy) return;
  const a = b.dataset.act;
  S.msg = '';
  try {
    if (a === 'goto') S.view = b.dataset.v;
    else if (a === 'forgot') S.msg = 'La recuperación de contraseña aún no está disponible.';
    else if (a === 'nav') {
      S.view = b.dataset.v; resetTest();
      if (S.view === 'orders') await loadOrders();
      if (S.view === 'account') await loadResult();
    }
    else if (a === 'answer') {
      S.ans[S.qi] = +b.dataset.i;
      if (S.qi < QUESTIONS.length - 1) S.qi++;
      else {
        S.busy = true; render();
        const r = await api('/test', 'POST', { answers: S.ans });   
        S.result = { done: true, ...r }; resetTest(); S.view = 'home';
      }
    }
    else if (a === 'back') S.qi--;
    else if (a === 'retake') { S.result = { done: false, category: null, pending: null, tones: [] }; resetTest(); S.view = 'home'; }
    else if (a === 'order') {
      S.draft = { type: b.dataset.type, tone: S.result.tones.find(t => t.id === +b.dataset.id) };
      S.view = 'confirm';
    }
    else if (a === 'cancel') S.view = 'home';
    else if (a === 'logout') { await api('/auth/logout', 'POST'); S.user = null; S.view = 'auth'; S.result = { done: false, tones: [] }; }
  } catch (err) { S.msg = err.message; }
  S.busy = false; render();
});

(async function boot() {
  try { S.user = await api('/auth/me'); await loadResult(); S.view = 'home'; }
  catch { S.user = null; S.view = 'auth'; }
  render();
})();
