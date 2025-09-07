async function api(path, opts={}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function el(tag, cls){ const e=document.createElement(tag); if(cls) e.className=cls; return e; }
function $(sel){ return document.querySelector(sel); }

const setupSection = $('#setup-section');
const mainSection  = $('#main-section');
const ownerLabel   = $('#ownerLabel');
const contactsDiv  = $('#contacts');
const contactTpl   = document.getElementById('contactRow');
const addContactBtn= $('#addContactBtn');
const saveSetupBtn = $('#saveSetupBtn');
const panicBtn     = $('#panicBtn');
const alertsList   = $('#alertsList');
const contactList  = $('#contactList');
const logsBox      = $('#logsBox');
const responsesList= $('#responsesList');
const statusBanner = $('#statusBanner');

function showBanner(msg){
  statusBanner.textContent = msg;
  statusBanner.classList.remove('hidden');
  statusBanner.classList.add('visible');
  setTimeout(()=> {
    statusBanner.classList.remove('visible');
    setTimeout(()=> statusBanner.classList.add('hidden'), 500);
  }, 3000);
}

function addContactRow(data){
  const row = contactTpl.content.firstElementChild.cloneNode(true);
  row.querySelector('.c-name').value = data?.name || '';
  row.querySelector('.c-phone').value = data?.phone || '';
  row.querySelector('.c-sms').checked = data?.via_sms ?? true;
  row.querySelector('.c-wa').checked  = data?.via_whatsapp ?? false;
  row.querySelector('.remove').onclick = () => row.remove();
  contactsDiv.appendChild(row);
}

async function loadConfig(){
  const cfg = await api('/api/config');
  if (!cfg.owner_name || cfg.contacts.length === 0){
    setupSection.classList.remove('hidden');
    addContactRow();
  } else {
    mainSection.classList.remove('hidden');
    ownerLabel.textContent = cfg.owner_name;
    renderContacts(cfg.contacts);
    refreshAlerts();
    refreshLogs();
    refreshResponses();
    setInterval(()=>{ refreshAlerts(); refreshLogs(); refreshResponses(); }, 5000);
  }
}

function renderContacts(list){
  contactList.innerHTML='';
  list.forEach(c => {
    const li = el('li');
    li.textContent = `${c.name} — ${c.phone} ${c.via_sms ? '[SMS]' : ''} ${c.via_whatsapp ? '[WA]' : ''}`;
    contactList.appendChild(li);
  });
}

addContactBtn.onclick = () => addContactRow();
saveSetupBtn.onclick = async () => {
  const ownerName = $('#ownerName').value.trim();
  const rows = Array.from(contactsDiv.querySelectorAll('.contact-row')).map(r => ({
    name: r.querySelector('.c-name').value.trim(),
    phone: r.querySelector('.c-phone').value.trim(),
    via_sms: r.querySelector('.c-sms').checked,
    via_whatsapp: r.querySelector('.c-wa').checked
  })).filter(x => x.name && x.phone);
  await api('/api/setup', { method:'POST', body: JSON.stringify({ owner_name: ownerName, contacts: rows })});
  location.reload();
};

panicBtn.onclick = async () => {
  panicBtn.disabled = true;
  panicBtn.textContent = '...';
  try {
    const message = $('#alertMessage').value.trim();
    const resp = await api('/api/alert', { method:'POST', body: JSON.stringify({ message }) });
    refreshAlerts();
    refreshResponses();
    showBanner("🚨 Alert Sent Successfully!");

    // Shake animation
    document.body.classList.add('shake');
    setTimeout(()=> document.body.classList.remove('shake'), 500);
  } catch (e){
    alert('Failed: ' + e.message);
  } finally {
    panicBtn.disabled = false;
    panicBtn.textContent = 'SOS';
  }
};

async function refreshAlerts(){
  const { alerts } = await api('/api/alerts');
  alertsList.innerHTML='';
  for (const a of alerts){
    const li = el('li');
    const info = await api('/api/alerts/' + a.id);
    const responders = info.recipients.map(r => `${r.contact_name}: ${r.status}${r.clicked_at ? ' ('+r.clicked_at+')':''}`).join(' | ');
    li.innerHTML = `<strong>#${a.id}</strong> ${a.created_at} — ${a.message || ''}<br/><small>${responders}</small>`;
    alertsList.appendChild(li);
  }
}

async function refreshResponses(){
  const { alerts } = await api('/api/alerts');
  if (!alerts.length) {
    responsesList.innerHTML = "<li>No alerts yet.</li>";
    return;
  }
  const latest = alerts[0];
  const info = await api('/api/alerts/' + latest.id);
  responsesList.innerHTML = '';
  info.recipients.forEach(r => {
    const li = el('li');
    if (r.status === 'responding') {
      li.textContent = `✅ ${r.contact_name} is Responding${r.note ? ' – ' + r.note : ''}`;
    } else if (r.status === 'not_responding') {
      li.textContent = `❌ ${r.contact_name} cannot respond${r.note ? ' – ' + r.note : ''}`;
    } else {
      li.textContent = `⏳ Awaiting ${r.contact_name}...`;
    }
    responsesList.appendChild(li);
  });
}

async function refreshLogs(){
  const { logs } = await api('/api/logs');
  logsBox.textContent = logs.map(l => `[${l.created_at}] ${l.level.toUpperCase()} ${l.event} ${l.meta || ''}`).join('\\n');
}

loadConfig();
