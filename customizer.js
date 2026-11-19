import * as THREE from './vendor/three.module.js';
import { createCharacter } from './character.js?v=6';
import { FEATURES, PALETTES, DEFAULT_APPEARANCE, normalizeAppearance, randomAppearance, saveAppearance } from './appearance.js';

export function createCustomizer({ character, onOpen, notify, canEdit = () => false }) {
  const dialog=document.querySelector('#character-dialog');
  const tabs=document.querySelector('#appearance-tabs');
  const options=document.querySelector('#appearance-options');
  const viewport=document.querySelector('#character-preview');
  let draft=character.getAppearance(), category='eyes', renderer, scene, camera, preview, angle=0, portrait=true, dragX=null;
  let editable=false;
  const canChange=()=>editable&&canEdit();
  const categories=[...Object.keys(FEATURES),'palette'];
  const hex=color=>'#'+color.toString(16).padStart(6,'0');
  function thumbnail(key,i) {
    const color=hex(PALETTES[draft.palette].colors[0]), light=hex(PALETTES[draft.palette].colors[1]);
    let drawing='';
    if(key==='eyes'){
      const sizes=[[10,7],[12,5],[9,10],[11,4],[11,5],[14,7],[12,3],[10,6],[11,9],[12,8]][i];
      for(const x of [25,55])drawing+=`<ellipse cx="${x}" cy="30" rx="${sizes[0]}" ry="${sizes[1]}" fill="#faf5e8" stroke="#64857c"/><ellipse cx="${x}" cy="30" rx="4" ry="${Math.min(6,sizes[1])}" fill="#486e62"/><circle cx="${x-1}" cy="28" r="1.5" fill="white"/><path d="M${x-10} ${19+(i%3)} Q${x} ${16+(i%4)} ${x+10} ${19-(i%3)}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
    }
    if(key==='nose'){
      const paths=['M32 30 Q40 20 48 30 Q50 42 40 42 Q30 42 32 30','M36 15 L43 15 L46 40 L33 40 Z','M30 34 Q39 22 49 29 L47 38 L32 38 Z','M25 33 Q40 21 55 33 Q54 43 40 41 Q26 44 25 33','M38 14 L42 14 L45 42 L36 42 Z','M36 14 L43 19 L48 32 L43 42 L35 40 L39 29 Z','M27 29 L53 29 L53 39 L27 39 Z','M40 16 Q43 28 49 34 Q49 46 40 46 Q31 46 31 35 Q37 26 40 16','M40 18 L53 32 L44 44 L29 35 Z','M34 24 Q40 17 46 24 L49 37 Q40 45 31 37 Z'];
      drawing=`<path d="${paths[i]}" fill="#d5a184" stroke="#b9826d" stroke-width="2" stroke-linejoin="round"/>`;
    }
    if(key==='mouth'){
      const paths=['M25 31 L55 31','M24 26 Q40 43 56 26','M20 25 Q40 48 60 25 Z','M23 34 Q40 38 58 24','M24 29 Q40 23 56 29 M27 34 Q40 40 53 34','M40 20 A9 12 0 1 0 40 44 A9 12 0 1 0 40 20','M22 30 Q40 33 58 30','M20 24 Q40 37 55 35','M29 29 Q40 37 51 29','M23 23 Q40 18 57 23 Q57 47 40 44 Q23 44 23 23'];
      drawing=`<path d="${paths[i]}" fill="${[2,9].includes(i)?'#9b615b':'none'}" stroke="#9b615b" stroke-width="${i===6?4:2.5}" stroke-linecap="round"/>`;
      if([2,9].includes(i))drawing+='<path d="M27 25 L53 25 L51 30 L29 30 Z" fill="#fff5df"/>';
    }
    if(key==='ears'){
      const w=[8,12,9,6,15,6,14,9,10,12][i],h=[13,12,20,19,16,16,17,17,21,16][i];
      for(const side of [-1,1]){
        const x=40+side*18;
        drawing+=i===8||i===9?`<path d="M${x} ${30-h} L${x+w} 28 L${x} ${30+h} L${x-w} 30 Z" fill="#dbad8c" stroke="#be8973" stroke-width="2"/>`:`<ellipse cx="${x}" cy="30" rx="${w}" ry="${h}" fill="#dbad8c" stroke="#be8973" stroke-width="2"/>`;
        drawing+=`<ellipse cx="${x}" cy="31" rx="${w*.45}" ry="${h*.6}" fill="#c58c78"/>`;
      }
    }
    if(key==='hair'){
      const paths=[
        'M18 31 Q14 18 24 17 Q27 8 36 14 Q43 6 50 14 Q61 11 63 23 L61 37 L56 25 L24 26 L20 37 Z',
        'M18 38 L18 21 Q26 10 44 12 Q61 10 62 26 L61 38 L54 26 L25 21 L23 36 Z',
        'M18 36 Q14 15 30 11 L51 11 Q66 16 61 35 L56 24 L24 24 Z',
        'M17 35 L17 22 L23 23 L23 9 L32 18 L37 6 L43 18 L53 8 L54 22 L65 16 L61 37 L54 28 L25 28 Z',
        'M16 35 Q9 25 18 21 Q14 10 26 13 Q29 4 38 12 Q46 4 53 13 Q66 9 65 22 Q73 29 62 39 L56 27 L24 27 L21 39 Z',
        'M15 50 L16 22 Q20 9 40 11 Q61 9 64 23 L65 50 L53 50 L53 28 L26 28 L26 50 Z',
        'M18 38 L18 20 Q31 4 55 14 L63 24 L61 45 L51 31 L29 19 L24 35 Z',
        'M16 34 Q12 12 36 10 Q58 8 63 22 Q77 22 70 53 L61 48 L64 30 L56 29 L53 23 L24 25 L22 37 Z',
        'M18 33 Q14 10 39 10 Q61 10 62 32 L57 38 L62 43 L57 48 L60 54 L51 54 L48 46 L53 40 L50 25 L26 25 L23 36 Z',
        'M19 35 Q11 33 14 22 Q5 21 9 12 Q18 4 26 14 Q40 7 53 14 Q63 4 71 12 Q77 22 65 24 L62 37 L54 26 L26 26 Z',
      ];
      drawing=`<ellipse cx="40" cy="37" rx="15" ry="17" fill="#dfb799"/><path d="${paths[i]}" fill="${color}"/><path d="M26 20 Q39 11 53 20" fill="none" stroke="${light}" stroke-width="3" stroke-linecap="round" opacity=".75"/>`;
    }
    return `<svg viewBox="0 0 80 64" aria-hidden="true">${drawing}</svg>`;
  }
  function renderOptions() {
    tabs.querySelectorAll('button').forEach(button=>{
      const active=button.dataset.category===category;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
    });
    options.setAttribute('aria-labelledby','tab-'+category);
    document.querySelector('#appearance-category').textContent=category==='palette'?'Палитры волос':FEATURES[category].label;
    document.querySelector('#appearance-note').textContent=!editable?'Только просмотр · выбран текущий вариант':category==='palette'?'Любая палитра подходит ко всем 10 причёскам.':category==='hair'?'10 силуэтов без головных уборов.':'10 вариантов · нажми, чтобы примерить';
    options.replaceChildren();
    const labels=category==='palette'?PALETTES.map(p=>p.name):FEATURES[category].options;
    labels.forEach((label,i)=>{
      const button=document.createElement('button');button.type='button';button.className='appearance-choice';
      button.disabled=!editable;button.dataset.option=i;button.setAttribute('aria-pressed',String(draft[category]===i));
      if(category==='palette'){
        const swatches=document.createElement('div');swatches.className='hair-swatches';
        PALETTES[i].colors.forEach(color=>{const span=document.createElement('span');span.style.background=hex(color);swatches.append(span)});button.append(swatches);
      }else button.innerHTML=thumbnail(category,i);
      const name=document.createElement('span');name.textContent=label;button.append(name);
      button.onclick=()=>{if(!canChange())return;draft[category]=i;preview.setAppearance(draft);renderOptions();options.querySelector(`[data-option="${i}"]`).focus()};
      options.append(button);
    });
    document.querySelector('#appearance-summary').textContent=`${FEATURES.hair.options[draft.hair]} · ${PALETTES[draft.palette].name}`;
  }
  categories.forEach((key,index)=>{
    const button=document.createElement('button');button.type='button';button.role='tab';button.id='tab-'+key;button.dataset.category=key;
    button.setAttribute('aria-controls','appearance-options');button.textContent=key==='palette'?'Цвет волос':FEATURES[key].label;
    button.onclick=()=>{category=key;renderOptions()};
    button.onkeydown=e=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
      const next=e.key==='Home'?0:e.key==='End'?categories.length-1:(index+(e.key==='ArrowRight'?1:-1)+categories.length)%categories.length;
      tabs.children[next].click();tabs.children[next].focus();
    };tabs.append(button);
  });
  function initPreview() {
    if(renderer)return;
    renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.setClearColor(0xdce6df);renderer.domElement.setAttribute('aria-label','Трёхмерный предпросмотр персонажа');viewport.append(renderer.domElement);
    scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xfff4dd,0x718783,2.8));
    const key=new THREE.DirectionalLight(0xffedcf,2.7);key.position.set(-3,5,-4);scene.add(key);
    const rim=new THREE.DirectionalLight(0xb0cbe0,1.6);rim.position.set(3,2,3);scene.add(rim);
    camera=new THREE.PerspectiveCamera(32,1,.01,20);
    preview=createCharacter(draft);scene.add(preview.root);
    const plinth=new THREE.Mesh(new THREE.CylinderGeometry(.48,.53,.08,32),new THREE.MeshStandardMaterial({color:0xc3d0c5,roughness:1}));plinth.position.y=-.045;scene.add(plinth);
    renderer.domElement.onpointerdown=e=>{dragX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId)};
    renderer.domElement.onpointermove=e=>{if(dragX!==null){angle+=(e.clientX-dragX)*.012;dragX=e.clientX}};
    renderer.domElement.onpointerup=renderer.domElement.onpointercancel=()=>dragX=null;
    new ResizeObserver(resize).observe(viewport);
  }
  function resize() {
    if(!renderer||!dialog.open)return;
    const {width,height}=viewport.getBoundingClientRect();if(!width||!height)return;
    renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();
  }
  function open() {
    if(dialog.open)return;
    editable=canEdit();dialog.dataset.editable=String(editable);
    dialog.querySelector('.character-subtitle').textContent=editable?'Выбери черты лица, причёску и палитру волос.':'Только просмотр. Изменять внешность можно на первом острове.';
    for(const id of ['character-save','appearance-random','appearance-default'])document.getElementById(id).disabled=!editable;
    document.querySelector('#character-cancel').textContent=editable?'Отмена':'Закрыть';
    document.querySelector('#character-close').setAttribute('aria-label',editable?'Закрыть без сохранения':'Закрыть просмотр');
    dialog.querySelector('.character-footer>span').textContent=editable?'Внешность сохраняется в этом браузере.':'Вернись на первый остров, чтобы изменить образ.';
    onOpen();draft=character.getAppearance();initPreview();preview.setAppearance(draft);angle=0;portrait=true;
    dialog.showModal();renderOptions();resize();setView(true);
  }
  function setView(face) {
    portrait=face;document.querySelector('#preview-face').setAttribute('aria-pressed',String(face));document.querySelector('#preview-body').setAttribute('aria-pressed',String(!face));
  }
  document.querySelector('#character-close').onclick=document.querySelector('#character-cancel').onclick=()=>dialog.close();
  document.querySelector('#character-save').onclick=()=>{
    if(!canChange())return;
    character.setAppearance(draft);const saved=saveAppearance(draft);dialog.close();
    notify(saved?'Внешность сохранена. Твой исследователь готов к путешествию.':'Внешность применена. Браузер не разрешил сохранить её между запусками.');
  };
  document.querySelector('#appearance-random').onclick=()=>{if(!canChange())return;draft=randomAppearance();preview.setAppearance(draft);renderOptions()};
  document.querySelector('#appearance-default').onclick=()=>{if(!canChange())return;draft={...DEFAULT_APPEARANCE};preview.setAppearance(draft);renderOptions()};
  document.querySelector('#preview-left').onclick=()=>angle-=Math.PI/4;
  document.querySelector('#preview-right').onclick=()=>angle+=Math.PI/4;
  document.querySelector('#preview-face').onclick=()=>setView(true);
  document.querySelector('#preview-body').onclick=()=>setView(false);
  dialog.addEventListener('close',()=>dragX=null);
  return { isOpen:()=>dialog.open,open,close:()=>dialog.close(),
    render(dt,time){
      if(!dialog.open||!renderer)return;
      preview.root.rotation.y=angle;
      preview.animate(dt,{time});
      if(portrait){camera.position.set(.38,1.52,-1.65);camera.lookAt(0,1.44,0)}
      else{camera.position.set(.65,1.35,-4.0);camera.lookAt(0,.88,0)}
      renderer.render(scene,camera);
    },
  };
}
