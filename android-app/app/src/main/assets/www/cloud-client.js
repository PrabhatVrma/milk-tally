import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, serverTimestamp, getDocsFromServer } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const config=window.MILK_TALLY_FIREBASE_CONFIG;
const state=document.getElementById('cloudState');
const refreshButton=document.getElementById('refreshPrices');
const setState=(message,mode='')=>{state.textContent=message;state.className=`cloudstate ${mode}`;};
const tally=window.milkTally;
let db=null,cloudReady=false,gotProducts=false,gotQuantities=false,qtyTimer=0;
const toast=message=>{const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2400);};

if(!config||!config.apiKey||String(config.apiKey).startsWith('PASTE_')){
  setState('Cloud setup needed — this device saves locally for now.','offline');
}else{
  try{
    const app=initializeApp(config);db=getFirestore(app);
    const sharedRef=doc(db,'sharedData','current');
    setState('Connecting to shared prices…');
    onSnapshot(collection(db,'products'),snap=>applyProducts(snap.docs.map(d=>({id:d.id,...d.data()}))),err=>{setState('Could not load approved products.','offline');console.error('Products:',err);});
    onSnapshot(sharedRef,snap=>{
      if(snap.exists()){
        const remote=snap.data().quantities||{};const qty={};for(const p of tally.products)qty[p.id]=Math.max(0,Math.min(9999,Number(remote[p.id])||0));tally.data.qty=qty;tally.persist();tally.renderQuantities();
      }else{
        setDoc(sharedRef,{quantities:tally.data.qty,updatedAt:serverTimestamp()},{merge:true}).catch(err=>console.error('Initial tally:',err));
      }
      gotQuantities=true;finishConnection();
    },err=>{setState('Could not sync the shared tally.','offline');console.error('Tally:',err);});
  }catch(error){setState('Cloud setup is incomplete — this device saves locally for now.','offline');console.error('Firebase setup:',error);}
}
function applyProducts(rows){
  const approved=rows.filter(p=>typeof p.name==='string'&&typeof p.kind==='string'&&Number.isFinite(Number(p.price)));
  if(approved.length){approved.sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));tally.products.splice(0,tally.products.length,...approved.map(p=>({badge:'AMUL PRODUCT',color:'green',...p})));const prices={};for(const p of tally.products)prices[p.id]=Number(p.price);tally.data.prices=prices;tally.persist();tally.render();tally.populateProductPicker();}
  gotProducts=true;finishConnection();
}
function finishConnection(){if(gotProducts&&gotQuantities){cloudReady=true;window.MILK_TALLY_SYNCED=true;setState('Connected · shared prices are live.','online');tally.renderSummary();}}
async function refreshPrices(){
  if(!db){toast('Cloud setup is needed to refresh prices.');return;}
  refreshButton.disabled=true;refreshButton.classList.add('loading');setState('Refreshing prices from Firestore…');
  try{const snap=await getDocsFromServer(collection(db,'products'));applyProducts(snap.docs.map(d=>({id:d.id,...d.data()})));toast('Prices refreshed from the cloud.');}
  catch(error){setState('Refresh failed — check your internet and try again.','offline');toast('Could not refresh prices. Check your connection.');console.error('Refresh prices:',error);}
  finally{refreshButton.disabled=false;refreshButton.classList.remove('loading');}
}
refreshButton?.addEventListener('click',refreshPrices);
window.addEventListener('milk-quantity-changed',()=>{
  clearTimeout(qtyTimer);qtyTimer=setTimeout(async()=>{if(!cloudReady||!db)return;try{await setDoc(doc(db,'sharedData','current'),{quantities:tally.data.qty,updatedAt:serverTimestamp()},{merge:true});}catch(error){setState('Could not save online — your tally is kept on this device.','offline');console.error(error);}},450);
});

document.getElementById('changeForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!db){toast('Cloud setup is needed to send approval requests.');return;}
  const isNew=document.getElementById('changeType').value==='product';
  const base={note:document.getElementById('requestNote').value.trim(),status:'pending',createdAt:serverTimestamp()};
  const request=isNew?{...base,type:'new_product',name:`Amul ${document.getElementById('newProductName').value.trim().replace(/^Amul\s*/i,'')}`,kind:document.getElementById('newProductSize').value.trim(),suggestedPrice:Number(document.getElementById('newProductPrice').value)}:{...base,type:'price_change',productId:document.getElementById('requestProduct').value,suggestedPrice:Number(document.getElementById('requestPrice').value)};
  const button=document.getElementById('sendRequest');button.disabled=true;button.textContent='Sending…';
  try{await addDoc(collection(db,'changeRequests'),request);e.target.reset();document.getElementById('changeType').dispatchEvent(new Event('change'));document.getElementById('modal').classList.remove('open');toast('Suggestion sent for owner approval.');}
  catch(error){toast('Could not send. Check your connection and try again.');console.error(error);}
  finally{button.disabled=false;button.textContent='Send for approval';}
});

document.getElementById('supportForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!db){toast('Cloud setup is needed to send support messages.');return;}
  const message=document.getElementById('supportMessage').value.trim(),contact=document.getElementById('contactInfo').value.trim();
  if(message.length<3){document.getElementById('supportMessage').focus();return;}
  const button=document.getElementById('sendSupport');button.disabled=true;button.textContent='Sending…';
  try{await addDoc(collection(db,'supportMessages'),{message,contact,createdAt:serverTimestamp()});e.target.reset();document.getElementById('supportModal').classList.remove('open');toast('Message sent to support.');}
  catch(error){toast('Could not send. Check your connection and try again.');console.error(error);}
  finally{button.disabled=false;button.textContent='Send message';}
});
