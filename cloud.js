/** PEKY LEGEND CLUB PRO — Firebase Spark.
 * Las cuentas se identifican por Firebase UID. El apodo registrado NO cambia.
 * Rankings provisionales: Firestore valida identidad/esquema, no demuestra que una
 * partida se jugó legítimamente. Para premios se requiere árbitro en servidor.
 */
import { firebaseConfig as config } from './firebase-config.js';
const configured=Boolean(config.apiKey && !config.apiKey.startsWith('PEGA_') && config.projectId && config.projectId!=='TU_PROYECTO');
window.PEKY_CLOUD={active:false,uid:null};
window.dispatchEvent(new CustomEvent('peky-cloud-state',{detail:{uid:null}}));
if(configured){
try {
const [appSDK,authSDK,dbSDK]=await Promise.all([
  import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
  import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')
]);
const {initializeApp}=appSDK;
const {getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendPasswordResetEmail,signOut,onAuthStateChanged,GoogleAuthProvider,signInWithPopup}=authSDK;
const {getFirestore,doc,setDoc,getDoc,getDocs,collection,query,orderBy,limit,runTransaction,serverTimestamp}=dbSDK;
const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app);
const choices={colors:['green','blue','red','purple','gold','pink'],skins:['light','tan','brown','dark'],hair:['pony','short','curly','spiky']};
const cleanProfile=(input={})=>({
 nickname:String(input.nickname||'Atleta').trim().replace(/[<>]/g,'').slice(0,18)||'Atleta',
 number:Number.isInteger(Number(input.number))?Math.max(0,Math.min(99,Number(input.number))):5,
 color:choices.colors.includes(input.color)?input.color:'green',
 gender:['male','female'].includes(input.gender)?input.gender:'female',
 skin:choices.skins.includes(input.skin)?input.skin:'tan',
 hair:choices.hair.includes(input.hair)?input.hair:'pony'
});
const profileRef=uid=>doc(db,'players',uid);
let profileStateRevision=0;
const runRef=(uid,r)=>doc(db,'rankings',[r.mode,r.level,r.duration,r.target].join('_'),'entries',uid);
async function ensureProfile(user,suggestion={}){
 const ref=profileRef(user.uid);
 let snap=await getDoc(ref);
 if(!snap.exists()){
   // create protegido con UID; si otro dispositivo gana la carrera, recuperamos el perfil existente.
   const candidate=cleanProfile(suggestion);
   try {await setDoc(ref,{...candidate,joinedAt:serverTimestamp()});}
   catch(error){snap=await getDoc(ref);if(!snap.exists())throw error;}
   snap=await getDoc(ref);
 }
 return snap.data()||null;
}
function publishProfile(uid,profile){window.dispatchEvent(new CustomEvent('peky-cloud-state',{detail:{uid,profile}}));}
const cloud={
 active:true,uid:null,
 async register(email,password,profile){
   if(!email||!password||password.length<6)throw Error('Introduce correo y una contraseña de al menos 6 caracteres.');
   const cred=await createUserWithEmailAndPassword(auth,email.trim(),password);
   cloud.uid=cred.user.uid;
   const saved=await ensureProfile(cred.user,profile);
   publishProfile(cred.user.uid,saved);
   return cred.user;
 },
 async registerAccount(email,password){
   if(!email||!password||password.length<6)throw Error('Introduce correo y contraseña de al menos 6 caracteres.');
   const cred=await createUserWithEmailAndPassword(auth,email.trim(),password);
   cloud.uid=cred.user.uid;
   publishProfile(cloud.uid,null);
   return cred.user;
 },
 async createProfile(input){
   const user=auth.currentUser;if(!user)throw Error('Debes iniciar sesión antes de crear personaje.');
   const saved=await ensureProfile(user,input);
   cloud.uid=user.uid;profileStateRevision++;publishProfile(user.uid,saved);return saved;
 },
 async login(email,password){
   if(!email||!password)throw Error('Introduce tu correo y contraseña.');
   const cred=await signInWithEmailAndPassword(auth,email.trim(),password);
   cloud.uid=cred.user.uid;
   const snap=await getDoc(profileRef(cloud.uid));
   publishProfile(cloud.uid,snap.exists()?snap.data():null);
   return cred.user;
 },
 async loginGoogle(){
   const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
   const credential=await signInWithPopup(auth,provider);
   cloud.uid=credential.user.uid;
   const snap=await getDoc(profileRef(cloud.uid));
   publishProfile(cloud.uid,snap.exists()?snap.data():null);
   return credential.user;
 },
 async logout(){profileStateRevision++;await signOut(auth);cloud.uid=null;},
 async resetPassword(email){if(!email)throw Error('Escribe tu correo primero.');await sendPasswordResetEmail(auth,email.trim());},
 async saveProfile(input){
   const user=auth.currentUser;if(!user)throw Error('Inicia sesión para guardar el personaje.');
   const ref=profileRef(user.uid),snap=await getDoc(ref);
   if(!snap.exists())throw Error('No encontramos un perfil registrado.');
   const existing=snap.data(),visual=cleanProfile({...input,nickname:existing.nickname});
   // Nunca se envía una mutación de nickname.
   await setDoc(ref,{number:visual.number,color:visual.color,gender:visual.gender,skin:visual.skin,hair:visual.hair,updatedAt:serverTimestamp()},{merge:true});
 },
 async submitRun(raw){
   const user=auth.currentUser;
   if(!user)throw Error('Inicia sesión para entrar en el ranking.');
   const profile=await getDoc(profileRef(user.uid));
   if(!profile.exists())throw Error('Completa tu perfil de jugador.');
   const mode=String(raw.mode),level=String(raw.level),duration=Number(raw.duration),target=Number(raw.target);
   const score=Math.max(0,Math.min(10000,Number(raw.score)||0));
   const elapsed=Math.max(0,Math.min(duration+1,Number(raw.elapsed)||0));
   const lives=Math.max(0,Math.min(3,Math.trunc(Number(raw.lives)||0)));
   const won=Boolean(raw.won);
   // MISMA combinación -> misma clasificación: modo, nivel, tiempo y objetivo.
   // Vitória supera cualquier intento parcial. Luego menor tiempo y más vidas.
   // Marcadores sin objetivo fijo se ordenan prioritariamente por puntuación.
   const progress=target>0?Math.min(1,score/target):Math.min(1,score/Math.max(1,duration));
   const rankValue=won
     ?Math.round(1000000 + (target>0?Math.max(0,duration-elapsed)*100:score*300) + lives*100 + Math.min(score,1000))
     :Math.round((target>0?progress*100000:score*300) + lives*100 + Math.max(0,duration-elapsed));
   const candidate={uid:user.uid,mode,level,duration,target,score,rankValue,won,elapsed,lives,
    nickname:profile.data().nickname,number:profile.data().number,color:profile.data().color,updatedAt:serverTimestamp()};
   const ref=runRef(user.uid,candidate);
   const saved=await runTransaction(db,async transaction=>{
     const previous=await transaction.get(ref);
     if(previous.exists() && Number(previous.data().rankValue)>=rankValue)return false;
     transaction.set(ref,candidate);return true;
   });
   return {saved,rankValue};
 },
 async loadMyRecord(bucket){if(!auth.currentUser)return null;const snap=await getDoc(doc(db,'rankings',bucket,'entries',auth.currentUser.uid));return snap.exists()?snap.data():null;},
 async ranking(bucket,n=25){const s=await getDocs(query(collection(db,'rankings',bucket,'entries'),orderBy('rankValue','desc'),limit(Math.max(1,Math.min(50,n)))));return s.docs.map(x=>x.data());}
};
window.PEKY_CLOUD=cloud;
onAuthStateChanged(auth,async user=>{
  const rev=++profileStateRevision;cloud.uid=user?.uid||null;let profile=null;
  if(user){try{const snap=await getDoc(profileRef(user.uid));profile=snap.exists()?snap.data():null}catch(e){console.warn('Perfil no disponible:',e)}}
  if(rev===profileStateRevision)publishProfile(user?.uid||null,profile);
});
}catch(err){console.warn('Firebase no disponible; queda habilitado el modo invitado.',err)}
}
