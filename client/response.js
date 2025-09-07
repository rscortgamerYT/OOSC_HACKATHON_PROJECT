async function api(path, opts={}){
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
function $(sel){ return document.querySelector(sel); }

const params = new URLSearchParams(location.search);
const token = params.get('token');
const infoDiv = $('#respInfo');
const noteInput = $('#note');
const yesBtn = $('#btnYes');
const noBtn = $('#btnNo');

async function loadRecipient(){
  if (!token){
    infoDiv.textContent = 'Invalid link.';
    yesBtn.disabled = true; noBtn.disabled = true;
    return;
  }
  try {
    const data = await api('/api/recipient/' + token);
    infoDiv.innerHTML = `<strong>${data.contact_name}</strong>, this alert was created at <em>${data.alert_created_at}</em> for ${data.contact_phone}.`;
  } catch (e){
    infoDiv.textContent = 'This link is invalid or expired.';
    yesBtn.disabled = true; noBtn.disabled = true;
  }
}

async function send(status){
  try {
    await api('/api/respond', { method:'POST', body: JSON.stringify({ token, status, note: noteInput.value }) });
    infoDiv.textContent = status === 'responding' ? 'Thanks! Your response has been recorded.' : 'Thanks, we have noted you cannot respond.';
    yesBtn.disabled = true; noBtn.disabled = true;
  } catch (e){
    alert('Failed: ' + e.message);
  }
}

yesBtn.onclick = () => send('responding');
noBtn.onclick  = () => send('not_responding');

loadRecipient();
