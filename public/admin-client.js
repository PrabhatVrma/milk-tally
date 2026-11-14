import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendEmailVerification, inMemoryPersistence, setPersistence } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, collection, getDocs, doc, runTransaction, serverTimestamp, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const config=window.MILK_TALLY_FIREBASE_CONFIG;
const loginView=document.getElementById('loginView');
const adminView=document.getElementById('adminView');
const loginNotice=document.getElementById('loginNotice');
const pageError=document.getElementById('pageError');
const loginButton=document.getElementById('loginButton');
const verifyButton=document.getElementById('sendVerification');
const loginForm=document.getElementById('loginForm');
const requestsRoot=document.getElementById('requestList');
const productsRoot=document.getElementById('productList');
const supportRoot=document.getElementById('supportList');
const toastEl=document.getElementById('toast');
let auth=null,db=null,toastTimer=0,authReady=Promise.resolve();

function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function showLogin(message=''){loginView.hidden=false;adminView.hidden=true;loginNotice.textContent=message;}
function showToast(message){toastEl.textContent=message;toastEl.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.hidden=true,2600)}
function showPageError(message){pageError.textContent=message;pageError.hidden=false}
function clearPageError(){pageError.textContent='';pageError.hidden=true}
function dateLabel(value){try{return value?.toDate?value.toDate().toLocaleString('en-IN'):''}catch{return ''}}
function money(value){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(value)||0)}
function emptyList(root,message){root.innerHTML=`<div class="empty">${escapeHtml(message)}</div>`}

if(!config||!config.apiKey||String(config.apiKey).startsWith('PASTE_')){
  showLogin('Firebase is not configured. Check firebase-config.js.');
}else{
  const app=initializeApp(config);
  auth=getAuth(app);
  db=getFirestore(app);
  authReady=setPersistence(auth,inMemoryPersistence).then(()=>signOut(auth)).then(()=>{
    onAuthStateChanged(auth,async user=>{
      verifyButton.hidden=true;
      if(!user){showLogin();return;}
      if(!user.emailVerified){loginForm.reset();showLogin('Verify the owner account before opening the admin panel.');verifyButton.hidden=false;return;}
      loginForm.reset();loginView.hidden=true;adminView.hidden=false;clearPageError();await loadInbox();
    });
  }).catch(()=>showLogin('Could not initialize a private admin session. Check the connection and try again.'));
}

loginForm.addEventListener('submit',async event=>{
  event.preventDefault();if(!auth)return;
  loginNotice.textContent='';loginButton.disabled=true;loginButton.textContent='Signing in…';verifyButton.hidden=true;
  const emailInput=document.getElementById('adminEmail'),passwordInput=document.getElementById('adminPassword');
  const email=emailInput.value.trim(),password=passwordInput.value;
  emailInput.value='';passwordInput.value='';
  try{await authReady;await signInWithEmailAndPassword(auth,email,password);}
  catch(error){const messages={ 'auth/operation-not-allowed':'Enable Email/Password in Firebase Authentication first.','auth/invalid-credential':'Email or password is incorrect.','auth/too-many-requests':'Too many attempts. Wait and try again.','auth/network-request-failed':'Network unavailable. Check the connection.'};loginNotice.textContent=messages[error.code]||'Sign-in failed. Check the connection and Firebase setup.';}
  finally{loginButton.disabled=false;loginButton.textContent='Sign in';}
});
verifyButton.addEventListener('click',async()=>{
  const user=auth?.currentUser;if(!user)return;
  verifyButton.disabled=true;
  try{await sendEmailVerification(user);loginNotice.textContent='Verification email sent. Follow its link, then sign in again.';}
  catch(error){loginNotice.textContent=`Could not send verification email: ${error.message}`;}
  finally{verifyButton.disabled=false;}
});
document.getElementById('signOut').addEventListener('click',async()=>{await signOut(auth);loginForm.reset();});
document.getElementById('reloadPanel').addEventListener('click',loadInbox);
requestsRoot.addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action]');if(!button)return;
  button.disabled=true;
  try{await reviewRequest(button.dataset.id,button.dataset.action==='approve');showToast(button.dataset.action==='approve'?'Suggestion approved.':'Suggestion rejected.');await loadInbox();}
  catch(error){showPageError(`Could not review suggestion: ${error.message}`);button.disabled=false;}
});
productsRoot.addEventListener('click',async event=>{
  const button=event.target.closest('button[data-product-id]');if(!button)return;
  const card=button.closest('.item'),input=card?.querySelector('input[data-price]');
  const rawPrice=input?.value.trim(),price=Number(rawPrice);
  if(!rawPrice||!Number.isFinite(price)||price<0||price>100000){showPageError('Enter a price from ₹0 to ₹100,000.');input?.focus();return;}
  button.disabled=true;clearPageError();
  try{await updateDoc(doc(db,'products',button.dataset.productId),{price});showToast('Product price updated.');await loadInbox();}
  catch(error){showPageError(`Could not update price: ${error.message}`);button.disabled=false;}
});
supportRoot.addEventListener('click',async event=>{
  const button=event.target.closest('button[data-support-action]');if(!button)return;
  const messageId=button.dataset.id,action=button.dataset.supportAction;
  if(action==='delete'&&!window.confirm('Delete this support message? This cannot be undone.'))return;
  button.disabled=true;clearPageError();
  try{
    const messageRef=doc(db,'supportMessages',messageId);
    if(action==='read'){await updateDoc(messageRef,{readAt:serverTimestamp()});showToast('Message marked as read.');}
    else if(action==='delete'){await deleteDoc(messageRef);showToast('Support message deleted.');}
    await loadInbox();
  }catch(error){showPageError(`Could not ${action==='delete'?'delete':'mark'} message: ${error.message}`);button.disabled=false;}
});

async function loadInbox(){
  if(!db||!auth?.currentUser)return;
  clearPageError();productsRoot.innerHTML='<div class="empty">Loading products…</div>';requestsRoot.innerHTML='<div class="empty">Loading requests…</div>';supportRoot.innerHTML='<div class="empty">Loading messages…</div>';
  try{
    const [requestSnapshot,supportSnapshot,productSnapshot]=await Promise.all([
      getDocs(collection(db,'changeRequests')),
      getDocs(collection(db,'supportMessages')),
      getDocs(collection(db,'products'))
    ]);
    const products=new Map(productSnapshot.docs.map(item=>[item.id,{id:item.id,...item.data()}]));
    const requests=requestSnapshot.docs.map(item=>({id:item.id,...item.data()})).filter(item=>item.status==='pending').sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0));
    const messages=supportSnapshot.docs.map(item=>({id:item.id,...item.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0));
    renderProducts([...products.values()].sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)));
    renderRequests(requests,products);renderSupport(messages);
  }catch(error){
    emptyList(productsRoot,'Products are unavailable.');emptyList(requestsRoot,'Requests are unavailable.');emptyList(supportRoot,'Support messages are unavailable.');
    showPageError(`Could not read the admin inbox. The Email/Password provider and owner-only Firestore rules must be enabled and published. ${error.message}`);
  }
}
function renderProducts(products){
  if(!products.length){emptyList(productsRoot,'No products are available.');return;}
  productsRoot.innerHTML=products.map((product,index)=>`<article class="item"><div class="itemtop"><div><h3>${escapeHtml(product.name||product.id)}</h3><div class="meta">${escapeHtml(product.kind||'')} · ID ${escapeHtml(product.id)}</div></div><span class="pill">${escapeHtml(money(product.price))}</span></div><div class="price-edit"><label for="product-price-${index}">Price (₹)</label><input id="product-price-${index}" data-price type="number" min="0" max="100000" step="0.01" inputmode="decimal" value="${escapeHtml(product.price??'')}"><button class="primary" type="button" data-product-id="${escapeHtml(product.id)}">Save price</button></div></article>`).join('');
}
function renderRequests(requests,products){
  if(!requests.length){emptyList(requestsRoot,'No pending suggestions.');return;}
  requestsRoot.innerHTML=requests.map(request=>{
    const isNew=request.type==='new_product';
    const product=products.get(request.productId);
    const title=isNew?`Add ${request.name||'Amul product'}`:`${product?.name||request.productId||'Product'} price change`;
    const detail=isNew?`${request.kind||''} · proposed ${money(request.suggestedPrice)}`:`Current ${money(product?.price)} → proposed ${money(request.suggestedPrice)}`;
    const note=request.note?`<div class="note">${escapeHtml(request.note)}</div>`:'';
    return `<article class="item"><div class="itemtop"><div><h3>${escapeHtml(title)}</h3><div class="meta">${escapeHtml(detail)}${request.productId?` · ID ${escapeHtml(request.productId)}`:''}</div><div class="meta">Submitted ${escapeHtml(dateLabel(request.createdAt))}</div></div><span class="pill">${isNew?'New item':'Price'}</span></div>${note}<div class="actions"><button class="primary" type="button" data-action="approve" data-id="${escapeHtml(request.id)}">Approve</button><button class="secondary reject" type="button" data-action="reject" data-id="${escapeHtml(request.id)}">Reject</button></div></article>`;
  }).join('');
}
function renderSupport(messages){
  document.getElementById('supportCount').textContent=`${messages.length} total`;
  if(!messages.length){emptyList(supportRoot,'No support messages yet.');return;}
  supportRoot.innerHTML=messages.map(message=>{
    const read=Boolean(message.readAt);
    const action=read
      ?`<button class="secondary delete-message" type="button" data-support-action="delete" data-id="${escapeHtml(message.id)}">Delete message</button>`
      :`<button class="secondary" type="button" data-support-action="read" data-id="${escapeHtml(message.id)}">Mark as read</button>`;
    return `<article class="item"><div class="itemtop"><div class="meta">Received ${escapeHtml(dateLabel(message.createdAt))}</div>${read?'<span class="pill read-pill">Read</span>':'<span class="pill unread-pill">Unread</span>'}</div><div class="messagebody">${escapeHtml(message.message)}</div>${message.contact?`<div class="contact">Contact: ${escapeHtml(message.contact)}</div>`:''}<div class="actions">${action}</div></article>`;
  }).join('');
}
async function reviewRequest(requestId,approve){
  const requestRef=doc(db,'changeRequests',requestId);
  const generatedProductRef=doc(collection(db,'products'));
  await runTransaction(db,async transaction=>{
    const requestSnapshot=await transaction.get(requestRef);
    if(!requestSnapshot.exists())throw new Error('Suggestion no longer exists.');
    const request=requestSnapshot.data();
    if(request.status!=='pending')throw new Error('Suggestion has already been reviewed.');
    if(!approve){transaction.update(requestRef,{status:'rejected',reviewedAt:serverTimestamp()});return;}
    if(request.type==='price_change'){
      const productRef=doc(db,'products',request.productId);
      const productSnapshot=await transaction.get(productRef);
      if(!productSnapshot.exists())throw new Error('The requested product does not exist.');
      transaction.update(productRef,{price:Number(request.suggestedPrice)});
      transaction.update(requestRef,{status:'approved',reviewedAt:serverTimestamp()});
      return;
    }
    if(request.type==='new_product'){
      const slug=`${request.name}-${request.kind}`.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'amul-product';
      const productRef=doc(db,'products',`${slug}-${generatedProductRef.id.slice(0,8)}`);
      transaction.set(productRef,{name:request.name,kind:request.kind,price:Number(request.suggestedPrice),color:'green',badge:'AMUL PRODUCT',image:'',order:Date.now()});
      transaction.update(requestRef,{status:'approved',reviewedAt:serverTimestamp(),approvedProductId:productRef.id});
      return;
    }
    throw new Error('Unknown suggestion type.');
  });
}
