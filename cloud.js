import { firebaseConfig as config } from './firebase-config.js';
const moduleReady = config.apiKey && !config.apiKey.startsWith('PEGA_') && config.projectId && config.projectId!=='TU_PROYECTO';
window.PEKY_CLOUD={active:false,uid:null};
window.dispatchEvent(new CustomEvent('peky-cloud-state',{detail:{uid:null}}));
if(moduleReady){
try{
const [{initializeApp},{getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendPasswordResetEmail,signOut,onAuthStateChanged,GoogleAuthProvider,signInWithPopup},{getFirestore,doc,setDoc,getDoc,getDocs,collection,query,orderBy,limit,serverTimestamp}]=await Promise.all([
 import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
 import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
 import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')]);
const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app);
const cloud={active:true,uid:null,async register(email,password,profile){if(!email||!password||password.length<6)throw Error('Correo y contraseña de al menos 6 caracteres');const cred=await createUserWithEmailAndPassword(auth,email.trim(),password);await setDoc(doc(db,'players',cred.user.uid),{nickname:profile.nickname,number:profile.number,color:profile.color,joinedAt:serverTimestamp()});cloud.uid=cred.user.uid;return cred.user},async login(email,password){const cred=await signInWithEmailAndPassword(auth,email.trim(),password);cloud.uid=cred.user.uid;return cred.user},async loginGoogle(profile){
  // Llamar directamente desde el clic: algunos navegadores bloquean ventanas tardías.
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  const cred = await signInWithPopup(auth,provider);
  const user = cred.user;
  cloud.uid=user.uid;
  const ref=doc(db,'players',user.uid);
  let found=await getDoc(ref);
  if(!found.exists()){
    const allowed=['green','blue','red','purple','gold','pink'];
    const nickname=String(profile?.nickname||user.displayName||'Atleta').trim().slice(0,18)||'Atleta';
    const rawNumber=Number(profile?.number);
    const number=Number.isInteger(rawNumber)&&rawNumber>=0&&rawNumber<=99?rawNumber:5;
    const color=allowed.includes(profile?.color)?profile.color:'green';
    await setDoc(ref,{nickname,number,color,joinedAt:serverTimestamp()});
    found=await getDoc(ref);
  }
  window.dispatchEvent(new CustomEvent('peky-cloud-state',{detail:{uid:user.uid,profile:found.data()||null}}));
  return user;
},async logout(){await signOut(auth);cloud.uid=null;},async resetPassword(email){if(!email)throw Error('Escribe tu correo primero');await sendPasswordResetEmail(auth,email.trim());},async saveProfile(p){if(!auth.currentUser)throw Error('Inicia sesión');await setDoc(doc(db,'players',auth.currentUser.uid),{nickname:p.nickname,number:p.number,color:p.color,updatedAt:serverTimestamp()},{merge:true});},async submitRun(r){if(!auth.currentUser)throw Error('Inicia sesión');const user=auth.currentUser,p=window.PEKY_API?.getProfile?.()||{nickname:'Atleta',number:5,color:'green'};const bucket=[r.mode,r.level,r.duration,r.target].join('_');const ref=doc(db,'rankings',bucket,'entries',user.uid);const prior=await getDoc(ref);const timed=['race','swim','cycle','slalom','triples','soccer','volley'].includes(r.mode);const rankValue=timed?(r.won?100000-Math.round(r.elapsed*10):r.score):(r.score*1000-r.elapsed*.01);if(prior.exists()&&Number(prior.data().rankValue??0)>=rankValue)return;await setDoc(ref,{uid:user.uid,mode:r.mode,level:r.level,duration:r.duration,target:r.target,score:r.score,rankValue,won:r.won,elapsed:r.elapsed,lives:r.lives,nickname:p.nickname,number:p.number,color:p.color,updatedAt:serverTimestamp()});},async loadMyRecord(bucket){if(!auth.currentUser)return null;const snap=await getDoc(doc(db,'rankings',bucket,'entries',auth.currentUser.uid));return snap.exists()?snap.data():null;},async ranking(bucket,n=25){const snap=await getDocs(query(collection(db,'rankings',bucket,'entries'),orderBy('rankValue','desc'),limit(n)));return snap.docs.map(s=>s.data());}};
window.PEKY_CLOUD=cloud;
onAuthStateChanged(auth,async user=>{cloud.uid=user?.uid||null;let profile=null;if(user){try{const snap=await getDoc(doc(db,'players',user.uid));profile=snap.exists()?snap.data():null;}catch(e){console.warn('No se pudo leer perfil',e)}}window.dispatchEvent(new CustomEvent('peky-cloud-state',{detail:{uid:cloud.uid,profile}}));});
}catch(e){console.warn('Firebase no disponible. Modo invitado sigue operativo:',e)}
}
