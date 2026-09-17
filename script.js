const gpuRank={ "Intel UHD Graphics 620":1,"Integrated":1,"GTX 1050":2,"GTX 1650":3,"GTX 1660":4,"RTX 2060":5,"RTX 3060":6,"RTX 4060":7 };
const cpuRank={"Intel i3":1,"Ryzen 3":1,"Intel i5":2,"Ryzen 5":2,"Intel i7":3,"Ryzen 7":3};
const state={page:1,perPage:20,quick:"All"};
const $=id=>document.getElementById(id);

$("heroCount").textContent=(catalog.length/1000).toFixed(0)+"K+";
$("heroCount").title=`${catalog.length.toLocaleString()} catalog items`;

const categories=[...new Set(catalog.map(x=>x.category))].sort();
categories.forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;$("categoryFilter").appendChild(o)});
const quickCategories=["All","Game","Software","Developer Tools","Creative","Design","Video Editing","AI Tools","Utilities","RPG","FPS","Racing"];
$("quickFilters").innerHTML=quickCategories.map(x=>`<button class="quick ${x==="All"?"active":""}" data-quick="${x}">${x}</button>`).join("");

function getPC(){try{return JSON.parse(localStorage.getItem("gamefinder_pc"))||null}catch{return null}}
function setPC(pc){localStorage.setItem("gamefinder_pc",JSON.stringify(pc))}
function updatePCUI(){
  const pc=getPC(), badge=$("savedBadge"), status=$("pcStatus");
  if(pc){badge.textContent="✓ PC saved";badge.classList.add("saved");status.textContent=`PC: ${pc.ram}GB • ${pc.cpu}`;$("ram").value=pc.ram;$("gpu").value=pc.gpu;$("cpu").value=pc.cpu;$("os").value=pc.os}
  else{badge.textContent="Not saved";badge.classList.remove("saved");status.textContent="PC not set"}
}
function coverStyle(item){const colors=item.type==="Game"?["#39206e","#125f70"]:["#163e59","#263069"];return `--a:${colors[0]};--b:${colors[1]}`}
function card(item){
  const free=item.free?"<span class='free'>FREE</span>":"";
  const demo=item.demo?" • Demo":"";
  return `<article class="card"><div class="cover" style="${coverStyle(item)}"><span class="type-badge">${item.type}</span>${free}<span class="cover-icon">${item.icon}</span></div><div class="card-body"><div class="title-row"><h3>${escapeHtml(item.name)}</h3><span class="rating">★ ${item.rating}</span></div><div class="meta">${escapeHtml(item.category)}${demo}</div><div class="req-grid"><div class="req"><small>RAM</small><b>${item.ram} GB</b></div><div class="req"><small>GPU</small><b>${escapeHtml(item.gpu)}</b></div><div class="req"><small>CPU</small><b>${escapeHtml(item.cpu)}</b></div><div class="req"><small>Storage</small><b>${item.storage} GB</b></div></div><button class="btn ghost check" data-id="${item.id}">Check Compatibility</button></div></article>`
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function filtered(){
  const q=$("search").value.trim().toLowerCase(), type=$("typeFilter").value, cat=$("categoryFilter").value, platform=$("platformFilter").value, ram=Number($("ramFilter").value);
  let arr=catalog.filter(x=>
    (!q||`${x.name} ${x.category} ${x.type}`.toLowerCase().includes(q)) &&
    (type==="All Types"||x.type===type) &&
    (cat==="All Categories"||x.category===cat) &&
    (platform==="All Platforms"||x.platform===platform) &&
    (!ram||x.ram<=ram)
  );
  if(state.quick!=="All"){
    if(state.quick==="Game"||state.quick==="Software") arr=arr.filter(x=>x.type===state.quick);
    else arr=arr.filter(x=>x.category===state.quick);
  }
  const sort=$("sort").value;
  if(sort==="rating")arr.sort((a,b)=>b.rating-a.rating||a.name.localeCompare(b.name));
  if(sort==="requirements")arr.sort((a,b)=>(a.ram+(gpuRank[a.gpu]||1)*2)- (b.ram+(gpuRank[b.gpu]||1)*2));
  if(sort==="name")arr.sort((a,b)=>a.name.localeCompare(b.name));
  return arr;
}
function render(){
  const arr=filtered(), pages=Math.max(1,Math.ceil(arr.length/state.perPage));
  if(state.page>pages)state.page=pages;
  const start=(state.page-1)*state.perPage, visible=arr.slice(start,start+state.perPage);
  $("resultCount").textContent=arr.length.toLocaleString();
  $("catalogGrid").innerHTML=visible.map(card).join("");
  $("empty").classList.toggle("hidden",arr.length>0);
  $("pagination").innerHTML=pages<=1?"":`<button class="page" ${state.page===1?"disabled":""} data-page="${state.page-1}">←</button>${Array.from({length:Math.min(7,pages)},(_,i)=>{let p=Math.min(Math.max(1,state.page-3)+i,pages);return `<button class="page ${p===state.page?"active":""}" data-page="${p}">${p}</button>`}).join("")}<button class="page" ${state.page===pages?"disabled":""} data-page="${state.page+1}">→</button>`;
}
function openModal(id){
  const item=catalog.find(x=>x.id===Number(id)); if(!item)return;
  const pc=getPC();
  if(!pc){
    $("modalBody").innerHTML=`<h2>🖥️ Set up your PC</h2><p class="modal-sub">Before checking <b>${escapeHtml(item.name)}</b>, save your RAM, GPU and CPU in the My PC section.</p><div class="score-box"><div class="score">?</div><div class="result">PC specifications required</div></div><button class="btn primary" data-scroll="#compatibility">Go to My PC</button>`;
  }else{
    const r=score(pc,item), c=r.score>=80?"var(--cyan)":r.score>=60?"var(--yellow)":r.score>=40?"#ff9950":"var(--red)";
    $("modalBody").innerHTML=`<h2>${item.icon} ${escapeHtml(item.name)}</h2><p class="modal-sub">${escapeHtml(item.type)} • ${escapeHtml(item.category)} • ${item.demo?"Demo/sample catalog item":"Sample requirement data"}</p><div class="score-box"><div class="score" style="color:${c}">${r.score}%</div><div class="result">${r.icon} ${r.label}</div></div><div class="check-list">${r.checks.map(x=>`<div class="check-row"><span><b>${x[0]}</b><br><small>${x[1]}</small></span><b style="color:${x[3]}">${x[2]}</b></div>`).join("")}</div><p class="modal-note">Approximate educational estimate: RAM 30 points, GPU 40 points, CPU 30 points. It is not an FPS benchmark and actual performance may differ.</p>`;
  }
  $("modalBackdrop").classList.remove("hidden");document.body.style.overflow="hidden";
}
function score(pc,g){
  let s=0,checks=[];
  if(Number(pc.ram)>=g.ram){s+=30;checks.push(["RAM",`${pc.ram} GB / need ${g.ram} GB`,"30/30","var(--cyan)"])}else checks.push(["RAM",`${pc.ram} GB / need ${g.ram} GB`,"0/30","var(--red)"]);
  if((gpuRank[pc.gpu]||1)>=(gpuRank[g.gpu]||1)){s+=40;checks.push(["GPU",`${pc.gpu} / need ${g.gpu}`,"40/40","var(--cyan)"])}else checks.push(["GPU",`${pc.gpu} / need ${g.gpu}`,"0/40","var(--yellow)"]);
  if((cpuRank[pc.cpu]||1)>=(cpuRank[g.cpu]||1)){s+=30;checks.push(["CPU",`${pc.cpu} / need ${g.cpu}`,"30/30","var(--cyan)"])}else checks.push(["CPU",`${pc.cpu} / need ${g.cpu}`,"0/30","var(--yellow)"]);
  let label,icon;if(s>=80){label="Should Run Well";icon="🟢"}else if(s>=60){label="May Run";icon="🟡"}else if(s>=40){label="Low Performance Expected";icon="🟠"}else{label="Not Recommended";icon="🔴"}return{score:s,label,icon,checks}
}
[$("search"),$("typeFilter"),$("categoryFilter"),$("platformFilter"),$("ramFilter"),$("sort")].forEach(el=>el.addEventListener("input",()=>{state.page=1;render()}));
$("clearBtn").addEventListener("click",()=>{$("search").value="";$("typeFilter").value="All Types";$("categoryFilter").value="All Categories";$("platformFilter").value="All Platforms";$("ramFilter").value="0";$("sort").value="rating";state.quick="All";document.querySelectorAll(".quick").forEach(x=>x.classList.toggle("active",x.dataset.quick==="All"));state.page=1;render()});
$("quickFilters").addEventListener("click",e=>{const b=e.target.closest(".quick");if(!b)return;state.quick=b.dataset.quick;document.querySelectorAll(".quick").forEach(x=>x.classList.toggle("active",x===b));state.page=1;render()});
$("catalogGrid").addEventListener("click",e=>{const b=e.target.closest(".check");if(b)openModal(b.dataset.id)});
$("pagination").addEventListener("click",e=>{const b=e.target.closest(".page");if(b&&!b.disabled){state.page=Number(b.dataset.page);render();document.querySelector("#catalog").scrollIntoView({behavior:"smooth"})}});
$("pcForm").addEventListener("submit",e=>{e.preventDefault();setPC({ram:Number($("ram").value),gpu:$("gpu").value,cpu:$("cpu").value,os:$("os").value});updatePCUI();$("saveMessage").textContent="✓ Your PC specifications have been saved in this browser.";setTimeout(()=>$("saveMessage").textContent="",3000)});
function closeModal(){$("modalBackdrop").classList.add("hidden");document.body.style.overflow=""}
$("closeModal").addEventListener("click",closeModal);$("modalBackdrop").addEventListener("click",e=>{if(e.target===$("modalBackdrop"))closeModal()});document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
document.addEventListener("click",e=>{const b=e.target.closest("[data-scroll]");if(b){document.querySelector(b.dataset.scroll)?.scrollIntoView({behavior:"smooth"});if(b.closest(".modal"))closeModal()}});
$("menuBtn").addEventListener("click",()=>$("navLinks").classList.toggle("open"));$("navLinks").addEventListener("click",()=>$("navLinks").classList.remove("open"));
const topBtn=$("topBtn");window.addEventListener("scroll",()=>topBtn.classList.toggle("hidden",scrollY<500));topBtn.addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}));
updatePCUI();render();
