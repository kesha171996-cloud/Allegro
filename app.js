'use strict';
const {normalizeText,findExample} = window.CategoryData;
const get = id => document.getElementById(id);
const KEYS = { history:'category-finder.history.v1', entries:'category-finder.entries.v1' };
const SAMPLES = {
  heat:'Экран теплозащитный заднего бампера Range Rover Evoque New L551 (2019-), K8D25K261BA, K8D25K261BB, K8D25K261BC, K8D25K261BD, K8D25K261BE, LR114212',
  hose:'Шланг системы охлаждения Range Rover Evoque New L551 (2019-), J9C25933, M8D28C480BB, LR139856'
};
const keyFor = value => normalizeText(value).toLocaleLowerCase('ru');
const short = text => text.length > 68 ? text.slice(0,65) + '…' : text;
const pathString = result => (result.path || []).join(' → ');
function read(key, fallback) {
  try {const value=JSON.parse(localStorage.getItem(key)); return value && typeof value==='object' ? value : fallback;} catch{return fallback;}
}
let history = Array.isArray(read(KEYS.history, [])) ? read(KEYS.history, []) : [];
let entries = read(KEYS.entries, {});
if (Array.isArray(entries)) entries = {};
let currentText = '';
let currentResult = null;

function make(tag, options={}) {
  const el=document.createElement(tag);
  for (const [key,value] of Object.entries(options)) {
    if (key==='text') el.textContent=value;
    else if (key==='class') el.className=value;
    else el.setAttribute(key,value);
  }
  return el;
}
function sanitizeLink(value) {
  if(typeof value!=='string') return '';
  try {const url=new URL(value);return url.protocol==='https:' || url.protocol==='http:' ? url.href : '';} catch {return '';}
}
function validateEntry(value) {
  if(!value || typeof value!=='object' || Array.isArray(value)) return null;
  const id=String(value.id??'').trim();
  const name=String(value.name??'').trim();
  if(!/^\d{1,12}$/.test(id) || !name || name.length>200) return null;
  let path=[];
  if(Array.isArray(value.path)) path=value.path.filter(x=>typeof x==='string').map(x=>x.slice(0,150)).slice(0,20);
  return {id,name,path,sourceUrl:sanitizeLink(value.sourceUrl),sourceLabel:'Источник, указанный пользователем'};
}
function lookup(text) {
  const stored=validateEntry(entries[keyFor(text)]);
  if(stored) return {...stored,status:'manual',note:'Категория добавлена вручную. Сервис не проверял её актуальность в Allegro.'};
  return findExample(text) || {status:'unverified',id:null,note:'Этого товара нет в локальной базе. Без API и сервера сайт не может самостоятельно проверить весь каталог Allegro. Откройте поиск Allegro и внесите проверенную категорию вручную.'};
}
function selectSearchTerm(text) {
  const tokens = text.match(/[A-Za-z][A-Za-z0-9-]{5,}/g) || [];
  const id = tokens.find(t=>/\d/.test(t) && /[A-Za-z]/.test(t) && !/^L\d{3,4}$/i.test(t));
  return id || text.slice(0,110);
}
function allegroSearchUrl(text) {return 'https://allegro.pl/listing?string='+encodeURIComponent(selectSearchTerm(text));}
function renderHistory() {
  const container=get('history-list');container.replaceChildren();
  if(!history.length) {container.append(make('p',{class:'empty-note',text:'После первого поиска здесь появятся результаты.'}));return;}
  for(const item of history.slice(0,100)) {
    const button=make('button',{type:'button',class:'history-item'});
    button.append(make('b',{text:item.id ? item.id+' · '+(item.name||'Категория') : 'Не подтверждено'}));
    button.append(make('small',{text:short(item.text||'')}));
    button.addEventListener('click',()=>{get('part-input').value=item.text||'';submitForm();window.scrollTo({top:0,behavior:'smooth'});});
    container.append(button);
  }
}
function saveHistory(text,result) {
  history = [{text,id:result.id||'',name:result.name||'',date:new Date().toISOString()},...history.filter(x=>keyFor(x.text||'')!==keyFor(text))].slice(0,100);
  try{localStorage.setItem(KEYS.history,JSON.stringify(history));}catch{}
  renderHistory();
}
function showCorrection(result) {
  get('correction-panel').hidden=false;
  get('manual-id').value=result.id||'';
  get('manual-name').value=result.name||'';
  get('manual-path').value=pathString(result);
  get('manual-source').value=result.sourceUrl||'';
  get('correction-panel').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function showResult(result) {
  currentResult=result;
  get('result-panel').hidden=false;
  const out=get('result-content');out.replaceChildren();
  const badge=get('result-badge');
  const meta=result.status==='example' ? ['Из базы примеров','warn'] : result.status==='manual' ? ['Добавлено вручную','warn'] : ['Не подтверждено','error'];
  badge.className='result-badge '+meta[1];badge.textContent=meta[0];
  if (result.id) {
    const top=make('div',{class:'id-row'});
    const left=make('div');
    left.append(make('span',{class:'helper',text:'ID категории Allegro'}),make('div',{class:'category-id',text:result.id}));
    const copy=make('button',{type:'button',class:'small-btn',text:'⧉ Копировать ID'});
    copy.addEventListener('click',async()=>{
      try {await navigator.clipboard.writeText(result.id);copy.textContent='✓ Скопировано';setTimeout(()=>copy.textContent='⧉ Копировать ID',1500);}
      catch {window.prompt('Скопируйте ID:',result.id);}
    });
    top.append(left,copy);out.append(top);
    out.append(make('div',{class:'category-title',text:result.name||'Название не указано'}));
    out.append(make('div',{class:'path',text:pathString(result)||'Полный путь категории не указан'}));
    if(result.note) out.append(make('p',{class:'category-notice',text:result.note}));
    if(sanitizeLink(result.sourceUrl)) {
      const link=make('a',{class:'result-link',href:result.sourceUrl,target:'_blank',rel:'noopener noreferrer',text:'Проверить источник ↗'});
      out.append(link);
    }
  } else {
    out.append(make('div',{class:'category-title',text:'Не могу подтвердить точную категорию'}));
    out.append(make('p',{class:'category-notice',text:result.note||'В локальной базе нет этого товара.'}));
  }
  const controls=make('div',{class:'result-tools'});
  controls.style.marginTop='20px';
  const search=make('a',{class:'plain-btn',href:allegroSearchUrl(currentText),target:'_blank',rel:'noopener noreferrer',text:'↗ Найти деталь на Allegro'});
  controls.append(search);
  const correct=make('button',{class:'plain-btn',type:'button',text:result.id?'✎ Исправить категорию':'+ Добавить проверенную категорию'});
  correct.addEventListener('click',()=>showCorrection(result));controls.append(correct);
  if(entries[keyFor(currentText)]) {
    const remove=make('button',{class:'plain-btn',type:'button',text:'Удалить свою запись'});
    remove.addEventListener('click',()=>{
      delete entries[keyFor(currentText)];persist();const answer=lookup(currentText);showResult(answer);saveHistory(currentText,answer);
    });
    controls.append(remove);
  }
  out.append(controls);
}
function persist() {try{localStorage.setItem(KEYS.entries,JSON.stringify(entries));}catch{window.alert('Не удалось записать данные в этот браузер.');}}
function submitForm(event) {
  event?.preventDefault();
  const text=normalizeText(get('part-input').value);
  if(!text){get('part-input').focus();return;}
  currentText=text;
  get('correction-panel').hidden=true;
  const result=lookup(text);
  showResult(result);
  saveHistory(text,result);
}
function downloadJson(filename,obj) {
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const anchor=make('a',{href:url,download:filename});document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}
get('classify-form').addEventListener('submit',submitForm);
get('part-input').addEventListener('keydown',event=>{
  if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();submitForm();}
});
get('try-heat').addEventListener('click',()=>{get('part-input').value=SAMPLES.heat;submitForm();});
get('try-hose').addEventListener('click',()=>{get('part-input').value=SAMPLES.hose;submitForm();});
get('clear-history').addEventListener('click',()=>{history=[];localStorage.removeItem(KEYS.history);renderHistory();});
get('cancel-correction').addEventListener('click',()=>get('correction-panel').hidden=true);
get('correction-form').addEventListener('submit',event=>{
  event.preventDefault();
  if(!currentText)return;
  const candidate={id:get('manual-id').value.trim(),name:get('manual-name').value.trim(),path:get('manual-path').value.split('→').map(x=>x.trim()).filter(Boolean),sourceUrl:get('manual-source').value.trim()};
  const validated=validateEntry(candidate);
  if(!validated){window.alert('Проверьте ID и название категории.');return;}
  entries[keyFor(currentText)]=validated;
  persist();
  const result=lookup(currentText);showResult(result);saveHistory(currentText,result);
  get('correction-panel').hidden=true;
});
get('export-corrections').addEventListener('click',()=>downloadJson('category-finder-my-categories.json',{version:1,entries}));
get('import-corrections').addEventListener('click',()=>get('import-file').click());
get('import-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  if(file.size>2_000_000){window.alert('Файл слишком большой (максимум 2 МБ).');return;}
  try {
    const raw=JSON.parse(await file.text());
    const imported=raw && typeof raw==='object' && raw.entries && typeof raw.entries==='object' ? raw.entries : raw;
    if(!imported||typeof imported!=='object'||Array.isArray(imported))throw new Error('неверный формат');
    let count=0;
    for(const [key,value] of Object.entries(imported).slice(0,5000)) {
      const validated=validateEntry(value);
      if(!validated||!key||key.length>1800)continue;
      entries[keyFor(key)]=validated;count++;
    }
    if(!count)throw new Error('не найдено подходящих записей');
    persist();window.alert('Импортировано категорий: '+count+'. Данные хранятся в этом браузере.');
    if(currentText) {const result=lookup(currentText);showResult(result);saveHistory(currentText,result);}
  }catch(error){window.alert('Не удалось импортировать базу: '+error.message);}
});
renderHistory();
