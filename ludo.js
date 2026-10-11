import { firebaseConfig } from './firebase-config.js';
import { databaseURL as overrideURL } from './ludo-settings.js';
const $=id=>document.getElementById(id);
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const COLORS=['#e75b5b','#4fbe6f','#edc850','#51a8dd'];
const NAMES=['Rojo','Verde','Amarillo','Azul'];
const FACES=['⚀','⚁','⚂','⚃','⚄','⚅'];
const ACTIONS=['baila como robot ocho segundos','pon tu cara más dramática de llanto de novela','imita un pato muy elegante','canta una canción de revancha','camina como pingüino cinco pasos','entrevista al dado que te hizo perder','haz una reverencia al campeón','posa como estatua derrotada','inventa un grito de guerra','haz una ovación exagerada','declara amor eterno al dado','imita una rana famosa','narra tu derrota como partido de fútbol','representa un comercial de la mala suerte','inventa un apodo gracioso para tu ficha','haz un baile de celebración ajena','imita la bocina de un tren','saluda como un astronauta','haz una escena de suspenso de diez segundos','finge que ganas un Óscar por tu derrota','di un trabalenguas sencillo','habla como extraterrestre una frase','actúa como villano derrotado','haz una pose de superhéroe cansado','presenta un noticiero sobre tu derrota'];
const STYLES=['con elegancia','como estrella pop','en cámara lenta','con voz de caricatura','como un narrador deportivo','como rey o reina','como pirata','con cara completamente seria','como actor de telenovela'];
const PENALTIES=ACTIONS.flatMap((x,i)=>STYLES.map((y,j)=>`${x[0].toUpperCase()+x.slice(1)} ${y}. ${['😂','🎭','🦆','🎲','✨'][(i+j)%5]}`));
let deck=[],penaltyQueue=[];
function shuffle(){deck=Array.from({length:PENALTIES.length},(_,i)=>i);for(let i=deck.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[deck[j],deck[i]]=[deck[i],deck[j]];}}
function showPenalty(name){if(!deck.length)shuffle();penaltyQueue.push(`${name}: ${PENALTIES[deck.pop()]}`);if($('penalty').style.display!=='block')nextPenalty();}
function nextPenalty(){if(!penaltyQueue.length){$('penalty').style.display='none';return;}$('penaltyText').textContent=penaltyQueue.shift();$('penalty').style.display='block';}
const notify=s=>{ $('notice').textContent=s; if($('roomActionStatus')&&/^([⚠✅⌛🔐ℹ]|Sala REAL)/u.test(s)){const el=$('roomActionStatus');el.hidden=false;el.textContent=s;} };
const TRACKS=[1,2,3,4].map(x=>`assets/chamame_peky_05_0${x}.mp3`);
const EMBEDDED=window.self!==window.top;
const music=new Audio();music.preload='metadata';let track=0,enabled=true;
try{enabled=localStorage.getItem('pekylegend05_music')!=='off';track=JSON.parse(sessionStorage.getItem('peky_ludo_music_handoff')||'null')?.index||0;}catch{}
music.src=TRACKS[Math.max(0,Math.min(3,track))];music.volume=.8;
try{music.volume=Math.max(0,Math.min(1,Number(localStorage.getItem('pekylegend05_musicvol')||'.8')));}catch{}
$('musicVolume').value=Math.round(music.volume*100);
let handoffTime=0;try{handoffTime=Number(JSON.parse(sessionStorage.getItem('peky_ludo_music_handoff')||'null')?.time)||0;}catch{}
music.addEventListener('loadedmetadata',()=>{if(handoffTime>0&&handoffTime<music.duration){music.currentTime=handoffTime;handoffTime=0;}});
music.addEventListener('ended',()=>{track=(track+1)%4;music.src=TRACKS[track];playMusic();});
function syncMusicUI(){$('musicToggle').textContent=enabled?'♫ Música ON':'♩ Música OFF';}
function playMusic(){if(!enabled||EMBEDDED)return;const p=music.play();if(p?.catch)p.catch(()=>{$('musicToggle').textContent='▶ Activar música';});}
if(EMBEDDED){$('soundControls').style.display='none';const back=document.querySelector('header a[href="index.html"]');back.addEventListener('click',e=>{e.preventDefault();parent.postMessage('PEKY_CLOSE_LUDO',location.origin);});}
$('musicToggle').onclick=()=>{enabled=!enabled;localStorage.setItem('pekylegend05_music',enabled?'on':'off');if(enabled)playMusic();else music.pause();syncMusicUI();};
$('musicVolume').oninput=e=>{music.volume=Number(e.target.value)/100;localStorage.setItem('pekylegend05_musicvol',String(music.volume));};
document.addEventListener('pointerdown',()=>{if(enabled&&music.paused)playMusic();},{once:true});syncMusicUI();
let s=null,uid=null,profile=null,authReady=false,db=null,fns=null,roomRef=null,unsub=null,online=false,transacting=false,rolling=false,shownDie=0,animationToken=0,lastRollId=null,roomCode='';
const inviteCode=(new URLSearchParams(location.search).get('room')||'').trim().toUpperCase();
const inviteValid=/^PEKY[A-HJ-NP-Z2-9]{5}$/.test(inviteCode);
let inviteJoinAttempted=false;
const roomPath=code=>'ludoProRoomsV2/'+code;
const NOW=()=>Date.now();
// 52 casillas reales del recorrido clásico 15×15, en sentido horario.
const TRACK=[[6,1],[6,0],[7,0],[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],[14,8],[13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],[7,14],[6,14],[6,13],[6,12],[6,11],[6,10],[6,9],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],[0,7],[0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],[6,2]];
const LANES=[[[7,2],[7,3],[7,4],[7,5],[7,6]],[[12,7],[11,7],[10,7],[9,7],[8,7]],[[7,12],[7,11],[7,10],[7,9],[7,8]],[[2,7],[3,7],[4,7],[5,7],[6,7]]];
const BASES=[[0,0],[9,0],[9,9],[0,9]];
const circle=(cx,cy,r,fill,stroke='#124038',sw=2)=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const rect=(x,y,w,h,fill,stroke='#dae1d6',sw=1)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const center=([c,r])=>[c*40+20,r*40+20];
const homeSpot=(color,piece)=>{const [c,r]=BASES[color];return [(c+[2.15,3.85,2.15,3.85][piece])*40,(r+[2.15,2.15,3.85,3.85][piece])*40];};
function position(color,i,piece){if(i<0)return homeSpot(color,piece);if(i<52)return center(TRACK[(color*13+i)%52]);if(i<57)return center(LANES[color][i-52]);return [300+(color-1.5)*11,300+(piece-1.5)*11];}
function boardDraw(){const p=[];p.push('<defs><filter id="pShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-opacity="0.35"/></filter></defs>');p.push(rect(0,0,600,600,'#fff9eb','#654e37',5));BASES.forEach(([c,r],i)=>{p.push(rect(c*40,r*40,240,240,COLORS[i],'#f5efe5',3));p.push(`<rect x="${(c+1)*40}" y="${(r+1)*40}" width="160" height="160" rx="19" fill="#fffdf6" stroke="#e8dbbb" stroke-width="5"/>`);for(let j=0;j<4;j++){let [x,y]=homeSpot(i,j);p.push(circle(x,y,23,COLORS[i],'#fdfbec',4));}});
TRACK.forEach((xy,i)=>{let [c,r]=xy;const start=i%13===0;p.push(rect(c*40,r*40,40,40,start?COLORS[i/13]:'#fffdfa','#9baba2',1));if(start){const [x,y]=center(xy);p.push(`<text x="${x}" y="${y+7}" text-anchor="middle" font-size="24" font-weight="900" fill="#fffdf0">★</text>`);} else if([4,17,30,43].includes(i)){const [x,y]=center(xy);p.push(`<text x="${x}" y="${y+6}" text-anchor="middle" font-size="17" fill="#958358">☆</text>`);}});
LANES.forEach((lane,color)=>lane.forEach((xy,k)=>{const [c,r]=xy;p.push(rect(c*40,r*40,40,40,COLORS[color],'#f9f6e9',1));if(k===4){const [x,y]=center(xy);p.push(circle(x,y,6,'#fff4be','none',0));}}));
p.push('<polygon points="240,240 360,240 300,300" fill="#e75b5b"/><polygon points="360,240 360,360 300,300" fill="#4fbe6f"/><polygon points="360,360 240,360 300,300" fill="#edc850"/><polygon points="240,360 240,240 300,300" fill="#51a8dd"/>');
if(s){const used=new Map();s.players.forEach((player,pi)=>player.pieces.forEach((steps,piece)=>{let [x,y]=position(player.color,steps,piece),key=`${x},${y}`,overlap=used.get(key)||0;used.set(key,overlap+1);if(overlap){x+=((overlap%3)-1)*10;y+=Math.floor(overlap/3)*9;}const active=s.status==='active'&&s.turn===pi&&!rolling&&possible(s).includes(piece)&&(!online||player.uid===uid);p.push(`<g data-player="${pi}" data-piece="${piece}" tabindex="${active?0:-1}" role="button" aria-label="${esc(player.nickname)} ficha ${piece+1}" style="${active?'cursor:pointer':'cursor:default'}"><circle cx="${x}" cy="${y}" r="${active?19:17}" fill="${COLORS[player.color]}" stroke="${active?'#ffdf64':'#fdf2d4'}" stroke-width="${active?5:3}" filter="url(#pShadow)"/><ellipse cx="${x-4}" cy="${y-6}" rx="8" ry="5" fill="#fff9" opacity=".73"/><text x="${x}" y="${y+9}" font-weight="1000" text-anchor="middle" font-size="14" fill="#102e2c">${piece+1}</text></g>`);}));}
$('board').innerHTML=p.join('');drawSide();}
function drawSide(){const p=s?.players||[];$('players').innerHTML=p.length?p.map((v,i)=>`<div class="player ${s.turn===i&&s.status==='active'?'active':''}"><span><span class="dot" style="background:${COLORS[v.color]}"></span><b>${esc(v.nickname)}</b> · ${v.pieces.filter(x=>x===57).length}/4 fichas</span><small>${s.status==='waiting'?'✓ LISTO':s.turn===i?'🎲 TURNO':''}</small></div>`).join(''):'<div class="caption">Nadie conectado todavía.</div>';
const me=s?.players?.[s.turn];$('roll').disabled=!s||s.status!=='active'||s.die>0||rolling||transacting||(online&&me?.uid!==uid);$('cancel').disabled=!s||s.status!=='active'||s.die!==0||rolling||transacting||online;
const isHost=s&&uid&&s.hostUid===uid;$('start').classList.toggle('hidden',!(online&&s?.status==='waiting'&&isHost));$('start').disabled=!s||s.players.length<2;
$('roomInfo').textContent=s?(online?`Sala REAL ${s.roomCode} · ${s.players.length}/${s.capacity} conectados · ${s.status==='waiting'?'Esperando al anfitrión':s.status==='active'?'En juego':'Finalizada'}`:`Local · ${p.length} jugadores · ${s.status}`):online?'Todavía no hay una sala conectada.':'Crea una partida local.';
if($('boardStatus')) $('boardStatus').textContent=s?.status==='active'?`TURNO: ${(s.players[s.turn]?.nickname||'').toUpperCase()}`:s?.status==='waiting'?'ESPERANDO JUGADORES':s?.status==='finished'?'PARTIDA TERMINADA':'LISTO PARA JUGAR';
if(!rolling){$('dice').classList.remove('rolling');$('dice').textContent=shownDie?FACES[shownDie-1]:'🎲';$('diceCaption').textContent=!s?'Primero crea o únete a una partida':s.status==='waiting'?'Esperando jugadores reales para iniciar':s.status==='finished'?'Partida terminada':s.die?'Selecciona una ficha destacada':'Lanza el dado cuando sea tu turno';}
}
function newState(n,name,isOnline=false){const count=isOnline?1:n;const colors=!isOnline&&n===2?[0,2]:[0,1,2,3];return {schema:2,hostUid:isOnline?uid:'local',roomCode:'',capacity:n,status:isOnline?'waiting':'active',created:NOW(),turn:0,die:0,turnNo:0,rollId:'',winner:-1,events:[],players:Array.from({length:count},(_,i)=>({uid:isOnline?uid:(i===0?'local0':'local'+i),nickname:i===0?name:NAMES[colors[i]],color:colors[i],pieces:[-1,-1,-1,-1]}))};}
function possible(g){if(!g||g.status!=='active'||!g.die)return [];return g.players[g.turn].pieces.map((v,i)=>v===-1?(g.die===6?i:-1):(v+g.die<=57?i:-1)).filter(i=>i>=0);}
function tickEvent(g,type,actor,extra={}){g.events=(g.events||[]).slice(-29);g.events.push({id:`${g.turnNo}-${type}-${NOW()}-${Math.floor(Math.random()*99999)}`,type,actor,at:NOW(),...extra});}
function rollLogic(g,who,value){if(g.status!=='active'||g.turn!==who||g.die)throw Error('No es tu turno para tirar.');g.turnNo++;g.die=value;g.rollId=String(g.turnNo)+'-'+String(who);tickEvent(g,'roll',who,{value});if(!possible(g).length){g.die=0;g.turn=(who+1)%g.players.length;tickEvent(g,'pass',who);}return g;}
function moveLogic(g,who,piece){if(g.status!=='active'||g.turn!==who||!possible(g).includes(piece))throw Error('Esa ficha no puede moverse ahora.');const me=g.players[who],die=g.die;me.pieces[piece]=me.pieces[piece]<0?0:me.pieces[piece]+die;const v=me.pieces[piece];let capture=false;
if(v<52){const spot=(me.color*13+v)%52;const safe=spot%13===0;if(!safe)g.players.forEach((other,i)=>{if(i===who)return;other.pieces.forEach((pos,j)=>{if(pos>=0&&pos<52&&((other.color*13+pos)%52)===spot){other.pieces[j]=-1;capture=true;}});});}
const won=me.pieces.every(n=>n===57);g.die=0;tickEvent(g,won?'win':capture?'capture':'move',who,{piece});if(won){g.winner=who;g.status='finished';}else if(die!==6&&!capture)g.turn=(who+1)%g.players.length;return g;}
function rollSound(){try{let C=window.AudioContext||window.webkitAudioContext;if(!C)return;let ac=new C();for(let i=0;i<8;i++){let o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+i*.12;o.type='triangle';o.frequency.value=150+i*35;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.045,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.08);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+.085);}setTimeout(()=>ac.close().catch(()=>{}),2200);}catch{}}
function animateRoll(value,rollId){if(!rollId||rollId===lastRollId)return;lastRollId=rollId;rolling=true;shownDie=0;$('diceCaption').textContent='🎲 ¡El dado está girando!';$('dice').textContent='🎲';$('dice').classList.remove('rolling');void $('dice').offsetWidth;$('dice').classList.add('rolling');drawSide();let t=++animationToken;let faceTimer=setInterval(()=>{if(t!==animationToken){clearInterval(faceTimer);return;} $('dice').textContent=FACES[Math.floor(Math.random()*6)];},96);setTimeout(()=>{clearInterval(faceTimer);if(t!==animationToken)return;rolling=false;shownDie=value;$('dice').classList.remove('rolling');$('dice').textContent=FACES[value-1];$('diceCaption').textContent=`Salió ${value}. ${s?.die?'¡Mueve tu ficha!':'No hubo movimientos posibles.'}`;boardDraw();},1150);}
function update(prev,next){s=next;if(next?.rollId&&next.rollId!==lastRollId){const ev=(next.events||[]).filter(x=>x.type==='roll').at(-1);if(ev)animateRoll(ev.value,next.rollId);}
const last=next?.events?.at(-1),old=prev?.events?.at(-1);if(last&&last.id!==old?.id){const name=next.players[last.actor]?.nickname||'Jugador';if(last.type==='win'){notify(`🏆 ¡${name} ganó! Los demás reciben penitencias diferentes.`);next.players.forEach((p,i)=>{if(i!==next.winner)showPenalty(p.nickname)});if(!online)saveLocalRank(next);}else if(last.type==='capture')notify(`💥 ¡${name} capturó una ficha!`);else if(last.type==='pass')notify(`🎲 ${name} no tenía movimientos; cambia el turno.`);else if(last.type==='move')notify(`✨ ${name} avanzó correctamente.`);}boardDraw();}
function saveLocalRank(g){let data={};try{data=JSON.parse(localStorage.getItem('peky-ludo-local-ranking')||'{}');}catch{}g.players.forEach((p,i)=>{const key=p.nickname;data[key]??={wins:0,losses:0};if(i===g.winner)data[key].wins++;else data[key].losses++;});try{localStorage.setItem('peky-ludo-local-ranking',JSON.stringify(data));}catch{}renderRanking();}
function renderRanking(){let data={};try{data=JSON.parse(localStorage.getItem('peky-ludo-local-ranking')||'{}');}catch{}const a=Object.entries(data).sort((a,b)=>b[1].wins-a[1].wins);$('ranking').innerHTML=a.length?a.slice(0,15).map(([name,v],i)=>`<div class="player"><span>${i+1}. ${esc(name)}</span><b>🏆 ${v.wins} · ❌ ${v.losses}</b></div>`).join(''):'<p class="caption">Aún no hay partidas locales finalizadas.</p>';}
function onlineReady(){return !!(db&&fns&&uid&&profile?.nickname);}
function hint(){if(online){let msg=!db?'⚠ Realtime Database no está conectada. Comprueba ludo-settings.js.':!authReady?'⌛ Comprobando tu sesión de Firebase…':!uid?'🔐 Inicia sesión desde el club para jugar con amigos online.':!profile?'⚠ Tu cuenta aún no tiene personaje guardado. Entra al club para completarlo.':'✅ Cuenta lista para jugar con otros usuarios registrados.';$('onlineHint').textContent=msg;}else $('onlineHint').textContent='✅ Modo local disponible sin conexión. Aquí todos juegan en el mismo dispositivo.';$('connectStatus').textContent=online?(onlineReady()?'Online disponible':'Online no conectado'):'Modo local';$('nickname').readOnly=online; if(online&&profile?.nickname)$('nickname').value=profile.nickname;}

function offerInvite(){
  if(!inviteValid)return;
  const banner=$('inviteBanner');if(!banner)return;
  banner.hidden=false;
  const signin=new URL('index.html',location.href);
  signin.searchParams.set('ludoInvite',inviteCode);
  if(!authReady){banner.textContent=`🔗 Invitación ${inviteCode} detectada. Comprobando tu cuenta…`;return;}
  if(!uid){
    banner.innerHTML=`🎲 Te invitaron a la sala <b>${inviteCode}</b>. Para jugar online, <a href="${esc(signin.toString())}" target="_top" style="color:#ffe4a2;text-decoration:underline;font-weight:900">inicia sesión o regístrate en el club</a>. La invitación se conservará.`;
    notify('🔐 Entra con tu propia cuenta registrada para unirte a la sala.');return;
  }
  if(!profile?.nickname){
    banner.innerHTML=`⚠ Primero termina tu personaje en el club. <a href="${esc(signin.toString())}" target="_top" style="color:#ffe4a2;text-decoration:underline">Continuar registro y volver a esta sala</a>.`;
    return;
  }
  banner.textContent=`🎲 Invitación ${inviteCode}: conectando tu cuenta «${profile.nickname}»…`;
  if(inviteJoinAttempted)return;
  inviteJoinAttempted=true;
  // Esperar al final de la carga de Firebase, sin precisar toques extras.
  Promise.resolve().then(()=>$('join').click());
}
async function initFirebase(){try{const [{initializeApp,getApps,getApp},{getAuth,onAuthStateChanged},{getFirestore,doc,getDoc},{getDatabase,ref,onValue,runTransaction,get}]=await Promise.all([
import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js')]);
const app=getApps().length?getApp():initializeApp(firebaseConfig),auth=getAuth(app);const URL=String(overrideURL||firebaseConfig.databaseURL||'').trim();if(URL&&!/^https:\/\/[^/]+\.(?:firebaseio\.com|firebasedatabase\.app)\/?$/.test(URL))throw Error('La URL de Realtime Database no tiene el formato esperado.');
if(URL){db=getDatabase(app,URL);fns={ref,onValue,runTransaction,get};}
const store=getFirestore(app);onAuthStateChanged(auth,async user=>{authReady=true;uid=user?.uid||null;profile=null;if(user){try{const snap=await getDoc(doc(store,'players',user.uid));profile=snap.exists()?snap.data():null;if(profile?.nickname&&!s)$('nickname').value=profile.nickname;}catch(err){console.warn('No se pudo leer el perfil',err);}}hint();drawSide();offerInvite();});}catch(e){authReady=true;hint();offerInvite();notify('⚠ No se pudo iniciar Firebase: '+(e?.message||e));console.warn('No se pudo conectar Firebase:',e.message);}}
function leaveRoom(){if(unsub){unsub();unsub=null;}roomRef=null;roomCode='';s=null;lastRollId=null;rolling=false;shownDie=0;animationToken++;boardDraw();}
function listenRoom(code){if(unsub)unsub();roomCode=code;roomRef=fns.ref(db,roomPath(code));unsub=fns.onValue(roomRef,snap=>{const previous=s;const value=snap.val();if(!value){notify('Esta sala no existe o fue cerrada.');leaveRoom();return;}update(previous,value);},e=>notify('⚠ Error al escuchar la sala: '+e.message));}
async function transact(fn){if(!online){if(!s)throw Error('Primero crea una partida.');const prev=structuredClone(s);update(prev,fn(structuredClone(s)));return;}if(!onlineReady()||!roomRef)throw Error('Primero conecta una sala real con tu usuario.');const result=await fns.runTransaction(roomRef,current=>{if(!current)return;try{return fn(current);}catch{return;}},{applyLocally:false});if(!result.committed)throw Error('Firebase rechazó la operación. Revisa turno, reglas y conexión.');}
function codeGenerate(){return 'PEKY'+Array.from(crypto.getRandomValues(new Uint8Array(5)),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('');}
function syncModeTabs(){ $('tabLocal')?.classList.toggle('selected', !online); $('tabOnline')?.classList.toggle('selected',online);$('roomCode').disabled=!online;$('copyCode').disabled=!online;$('shareRoom').disabled=!online;$('join').disabled=!online; }
$('mode').onchange=()=>{online=$('mode').value==='online';leaveRoom();hint();syncModeTabs();notify(online?'Modo online: crea una sala real o introduce un código.':'Modo local: todos juegan desde este equipo.');};
$('tabLocal').onclick=()=>{$('mode').value='local';$('mode').onchange();};
$('tabOnline').onclick=()=>{$('mode').value='online';$('mode').onchange();};
$('create').onclick=async()=>{online=$('mode').value==='online';const n=Number($('count').value),name=$('nickname').value.trim().slice(0,18)||'Atleta';try{if(!online){leaveRoom();update(null,newState(n,name));notify(`Partida local creada para ${n} jugadores. ¡A jugar!`);return;}if(!onlineReady()){hint();notify('No se pudo crear sala: primero activa Realtime Database y entra con tu cuenta de jugador.');return;}
let game=newState(n,profile.nickname,true),code,created=false;for(let attempt=0;attempt<4&&!created;attempt++){code=codeGenerate();game.roomCode=code;const ref=fns.ref(db,roomPath(code));let result=await fns.runTransaction(ref,existing=>existing?undefined:game,{applyLocally:false});created=result.committed;}if(!created)throw Error('No se pudo reservar un código único. Intenta otra vez.');$('roomCode').value=code;listenRoom(code);notify(`✅ Sala REAL ${code} creada. Comparte el código. Solo tú estás conectado: espera que tus amigos se unan.`);}catch(e){notify('⚠ '+e.message);}};
$('join').onclick=async()=>{
  online=$('mode').value==='online';const btn=$('join');
  try{
    if(!online)throw Error('Selecciona ONLINE para unirte a una sala.');
    if(!authReady)throw Error('Firebase está cargando tu cuenta; espera unos segundos.');
    if(!uid)throw Error('Inicia sesión con una cuenta propia desde el club para unirte.');
    if(!profile?.nickname)throw Error('Tu cuenta necesita un personaje registrado; complétalo en el club.');
    if(!db||!fns)throw Error('La conexión de Realtime Database no está configurada.');
    const code=$('roomCode').value.trim().toUpperCase();
    if(!/^PEKY[A-HJ-NP-Z2-9]{5}$/.test(code))throw Error('El código debe empezar por PEKY y contener cinco caracteres adicionales.');
    btn.disabled=true;
    notify(`⌛ Buscando sala ${code}…`);
    const ref=fns.ref(db,roomPath(code)),snap=await fns.get(ref);
    if(!snap.exists())throw Error(`La sala ${code} no existe. Confirma que el anfitrión la creó y sigue abierta.`);
    const existing=snap.val();
    if(existing.players?.some(p=>p?.uid===uid)){
      listenRoom(code);
      notify(existing.hostUid===uid?'ℹ Esta cuenta creó la sala. Para tener un segundo jugador, entra desde OTRA CUENTA en el otro celular.':'✅ Volviste a tu asiento en esta sala con tu cuenta.');
      if($('inviteBanner'))$('inviteBanner').hidden=true;
      return;
    }
    if(existing.status!=='waiting')throw Error('La partida ya comenzó o terminó; pide al anfitrión otra sala.');
    if(existing.players?.length>=existing.capacity)throw Error('La sala está llena.');
    const result=await fns.runTransaction(ref,game=>{
      if(!game||game.status!=='waiting'||!Array.isArray(game.players))return;
      if(game.players.some(p=>p.uid===uid))return game;
      if(game.players.length>=game.capacity)return;
      game.players.push({uid,nickname:profile.nickname,color:game.players.length,pieces:[-1,-1,-1,-1]});
      return game;
    },{applyLocally:false});
    if(!result.committed)throw Error('No pudimos reservar tu plaza. Puede estar llena o Firebase rechazó el cambio.');
    listenRoom(code);
    if($('inviteBanner'))$('inviteBanner').hidden=true;
    notify(`✅ Ya estás en la sala ${code}. Espera que el anfitrión pulse COMENZAR.`);
  }catch(e){
    const msg=String(e?.message||e);
    notify('⚠ '+(/permission_denied|permission.denied/i.test(msg)?'Firebase no permitió unirte. Comprueba que publicaste las reglas de Realtime Database y que estás registrado.':msg));
    if(inviteValid&&$('inviteBanner'))$('inviteBanner').hidden=false;
  }finally{btn.disabled=!online;}
};
$('shareRoom').onclick=async()=>{const code=$('roomCode').value.trim().toUpperCase();if(!/^PEKY[A-HJ-NP-Z2-9]{5}$/.test(code)||!roomRef||!online){notify('Primero crea o entra en una sala online real.');return;}const invite=new URL('ludo.html',location.href);invite.searchParams.set('room',code);const message=`🎲 ¡Te invito a Ludo Pro de PEKY LEGEND! Sala ${code}: ${invite.toString()}`;try{if(navigator.share){await navigator.share({title:'PEKY LUDO PRO',text:message,url:invite.toString()});}else if(navigator.clipboard){await navigator.clipboard.writeText(message);notify('✅ Invitación y enlace copiados. Envíalos por WhatsApp.');}else{notify('🔗 Copia: '+message);}}catch(e){if(e.name!=='AbortError')notify('Comparte este enlace: '+invite.toString());}};
$('start').onclick=async()=>{try{if(!onlineReady()||!s||s.hostUid!==uid)throw Error('Solo el anfitrión puede iniciar la partida.');await transact(g=>{if(g.status!=='waiting'||g.players.length<2)throw Error('Se necesitan mínimo 2 personas reales.');g.status='active';g.turn=0;return g;});notify('🎲 ¡Partida online iniciada!');}catch(e){notify('⚠ '+e.message);}};
$('copyCode').onclick=async()=>{const code=$('roomCode').value.trim();if(!code){notify('Todavía no hay un código.');return;}try{await navigator.clipboard.writeText(code);notify('✅ Copiado: '+code);}catch{$('roomCode').focus();$('roomCode').select();notify('Selecciona y copia el código manualmente.');}};
$('roll').onclick=async()=>{if(rolling||transacting||!s)return;try{transacting=true;rollSound();const who=s.turn,face=crypto.getRandomValues(new Uint32Array(1))[0]%6+1;await transact(g=>{if(online&&g.players[g.turn]?.uid!==uid)throw Error('No es tu turno.');return rollLogic(g,who,face);});}catch(e){notify('⚠ '+e.message);}finally{transacting=false;drawSide();}};
$('cancel').onclick=async()=>{if(online)return;try{await transact(g=>{if(g.die)throw Error('Debes jugar la tirada primero.');g.turn=(g.turn+1)%g.players.length;return g;});}catch(e){notify(e.message);}};
async function pickPiece(node){if(!node||!s||!s.die||rolling)return;const who=Number(node.dataset.player),piece=Number(node.dataset.piece);if(who!==s.turn)return;try{await transact(g=>{if(online&&g.players[g.turn]?.uid!==uid)throw Error('No es tu turno.');return moveLogic(g,who,piece);});}catch(e){notify('⚠ '+e.message);}}
$('board').addEventListener('click',e=>pickPiece(e.target.closest('[data-piece]')));
$('board').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const g=e.target.closest('[data-piece]');if(g){e.preventDefault();pickPiece(g);}}});
$('skipPenalty').onclick=nextPenalty;$('randomPenalty').onclick=()=>showPenalty('Reto de muestra');
try { const playerData=JSON.parse(localStorage.getItem('club_player')||'null');if(playerData?.nickname)$('nickname').value=String(playerData.nickname).slice(0,18); }catch{}
renderRanking();boardDraw();hint();syncModeTabs();initFirebase();
if(inviteValid){$('roomCode').value=inviteCode;$('mode').value='online';$('mode').onchange();notify('🔗 Invitación '+inviteCode+' recibida. Comprobando tu cuenta para unirte…');offerInvite();}
