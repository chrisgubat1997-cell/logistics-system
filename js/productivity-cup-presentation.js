/* Productivity Cup slide presentation mode */
(function(){
 function init(){
  const root=document.querySelector('.pc-presentation'); if(!root||root.dataset.slideModeReady)return; root.dataset.slideModeReady='1';
  const slides=Array.from(root.querySelectorAll('.pc-slide')); if(!slides.length)return;
  let current=0;
  const head=root.querySelector('.pc-present-head');
  const nav=root.querySelector('.pc-slide-nav');
  const progress=document.createElement('div');progress.className='pc-progress-track';progress.innerHTML='<div class="pc-progress-fill"></div>';
  root.insertBefore(progress,nav||head.nextSibling);
  const fill=progress.querySelector('.pc-progress-fill');
  const toolbar=document.createElement('div');toolbar.className='pc-present-toolbar';
  toolbar.innerHTML='<button type="button" class="pc-present-prev" aria-label="Previous slide">← Previous</button><span class="pc-present-counter"></span><button type="button" class="pc-present-fullscreen">⛶ Full Screen</button><button type="button" class="pc-present-next">Next →</button>';
  root.insertBefore(toolbar,nav||slides[0]);
  const counter=toolbar.querySelector('.pc-present-counter');
  function show(n){current=Math.max(0,Math.min(slides.length-1,n));slides.forEach((s,i)=>{s.classList.toggle('pc-slide-active',i===current);s.setAttribute('aria-hidden',i===current?'false':'true');});if(nav){nav.querySelectorAll('a').forEach((a,i)=>a.classList.toggle('pc-nav-active',i===current));}fill.style.width=((current+1)/slides.length*100)+'%';counter.textContent=(current+1)+' / '+slides.length;toolbar.querySelector('.pc-present-prev').disabled=current===0;toolbar.querySelector('.pc-present-next').disabled=current===slides.length-1;root.scrollIntoView({behavior:'smooth',block:'start'});}
  toolbar.querySelector('.pc-present-prev').addEventListener('click',()=>show(current-1));
  toolbar.querySelector('.pc-present-next').addEventListener('click',()=>show(current+1));
  toolbar.querySelector('.pc-present-fullscreen').addEventListener('click',async()=>{try{if(!document.fullscreenElement)await root.requestFullscreen();else await document.exitFullscreen();}catch(e){console.warn('Fullscreen not available',e);}});
  document.addEventListener('keydown',e=>{if(!root.classList.contains('pc-presenting')&&!document.fullscreenElement)return;if(['ArrowRight','PageDown'].includes(e.key)){e.preventDefault();show(current+1);}if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();show(current-1);}if(e.key==='Escape'&&document.fullscreenElement){document.exitFullscreen().catch(()=>{});}});
  document.addEventListener('fullscreenchange',()=>{root.classList.toggle('pc-presenting',!!document.fullscreenElement);});
  show(0);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
 const observer=new MutationObserver(()=>init());observer.observe(document.getElementById('productivityCupModule')||document.body,{childList:true,subtree:true});
})();