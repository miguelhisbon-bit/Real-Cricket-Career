let THREE=null;
const THREE_CDN="https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
async function loadThree(){
  if(THREE) return THREE;
  const mod=await import(THREE_CDN);
  THREE=mod;
  return THREE;
}
import {Career,fmt} from "./career.js";
import {TEAMS,SHOTS,BOWLS,AI_BATTERS,AI_BOWLERS,PITCHES,CONDITIONS,FIELDS} from "./data.js";

const career=new Career(),$=id=>document.getElementById(id),screens=[...document.querySelectorAll(".screen")];
let scene,camera,renderer,clock,game=null,lastMatchStart=0,cameraMode=0,cameraTween=null;
let paused=false,autoPlayMode=false,autoTimer=null,matchLock=false;
const three={players:[],fielders:[],ball:null,batter:null,bowler:null,umpires:[],wickets:[]};
let anim={active:false,t:0,dur:0,type:"",from:null,to:null,done:null,player:null};
const SHOT_NAMES={defend:"DEFENCE",drive:"FRONT-FOOT DRIVE",cut:"SQUARE CUT",pull:"PULL SHOT",loft:"LOFTED DRIVE"};
let ballFeed=[];
let fallbackCanvas=null,fallbackCtx=null,fallbackRAF=0,fallbackBall=null,fallbackLast=0;
const fallbackPlayers=[
  {x:0,z:-0.70,c:"#39e88f",role:"BAT"},{x:0.08,z:-0.79,c:"#39e88f",role:"BAT"},
  {x:-.55,z:-.18,c:"#ff6b76"},{x:.55,z:-.18,c:"#ff6b76"},{x:-.38,z:.35,c:"#ff6b76"},{x:.38,z:.35,c:"#ff6b76"},
  {x:-.72,z:.18,c:"#ff6b76"},{x:.72,z:.18,c:"#ff6b76"},{x:-.78,z:.70,c:"#ff6b76"},{x:.78,z:.70,c:"#ff6b76"},{x:0,z:.82,c:"#ff6b76",role:"WK"}
];
function ensureBallFeed(){
  if($("ballFeed")) return;
  const el=document.createElement("div"); el.id="ballFeed"; el.className="ballFeed"; el.innerHTML='<div class="feedHead"><b>LIVE BALL-BY-BALL</b><span id="feedCount">0</span></div><div id="feedItems"></div>';
  const flash=document.createElement("div"); flash.id="ballFlash"; flash.className="ballFlash"; flash.innerHTML="<strong>READY</strong><span>LIVE</span>";
  $("match")?.appendChild(el); $("match")?.appendChild(flash);
}
function pushBallEvent(runs,wicket,over,ball,label){
  ensureBallFeed();
  const text=wicket?"WICKET":runs===6?"SIX!":runs===4?"FOUR!":runs===0?"DOT":`+${runs}`;
  ballFeed.unshift({runs,wicket,over,ball,label,text}); ballFeed=ballFeed.slice(0,8);
  const items=$("feedItems"); if(items) items.innerHTML=ballFeed.map((x,i)=>`<div class="feedItem ${x.wicket?"isWicket":x.runs>=4?"isBoundary":x.runs===0?"isDot":"isRun"}" style="--d:${i*35}ms"><span>${x.over}.${x.ball}</span><b>${x.text}</b><small>${x.label}</small></div>`).join("");
  $("feedCount") && ($("feedCount").textContent=ballFeed.length);
  const flash=$("ballFlash"); if(flash){flash.className=`ballFlash ${xClass(wicket,runs)}`;flash.innerHTML=`<strong>${text}</strong><span>${over}.${ball} • ${label}</span>`;flash.classList.remove("show");void flash.offsetWidth;flash.classList.add("show");}
}
function xClass(w,r){return w?"wicket":r>=4?"boundary":r===0?"dot":"run"}
function resetBallFeed(){ballFeed=[];ensureBallFeed();$("feedItems")&&($("feedItems").innerHTML="");$("feedCount")&&($("feedCount").textContent="0");}


function show(id){
  screens.forEach(s=>s.classList.toggle("active",s.id===id));
  if(id==="match"){
    if(!game)startMatch();
    if(renderer){renderer.setAnimationLoop(renderLoop);setTimeout(resize3D,30)}
    else startFallbackLoop();
  }else if(renderer)renderer.setAnimationLoop(null);
  renderAll();
}
function renderAll(){
  const p=career.player;
$("topStats").textContent=`SEASON ${p.season.number} • ${p.team} • ₹ ${fmt(p.money)}`;
  $("homeName").textContent=p.name;$("homeForm").textContent=Math.round(p.form);
  $("homeStatus").textContent=`${p.team} • Level ${p.level} • Form ${Math.round(p.form)} • ${p.contract}`;
  $("profileName").textContent=p.name;$("profileRole").textContent=p.role;$("profileTeam").textContent=p.team;
  $("profileAge").textContent=`${p.age} yrs`;$("profileLevel").textContent=`Level ${p.level}`;$("profileForm").textContent=`Form ${Math.round(p.form)}`;  const starCount=Math.max(1,Math.min(5,Math.round(p.overall/20)));$("profileStars").textContent="★".repeat(starCount)+"☆".repeat(5-starCount);$("profileRatingText").textContent=`${p.overall} OVR`;
  $("avatar").textContent=p.role.toLowerCase().includes("bowl")?"🎯":"🏏";
  $("skills").innerHTML=Object.entries(p.skills).map(([k,v])=>`<div class="skill"><div class="skillTop"><b>${k[0].toUpperCase()+k.slice(1)}</b><strong>${v}</strong></div><div class="meter"><i style="width:${v}%"></i></div></div>`).join("");
  $("energyBar").style.width=p.energy+"%";$("energyText").textContent=`${Math.round(p.energy)} / 100`;
  const st={Matches:p.stats.matches,Runs:p.stats.runs,"High score":p.stats.highScore,Wickets:p.stats.wickets,Wins:p.stats.wins,"50s":p.stats.fifties,"100s":p.stats.hundreds,Catches:p.stats.catches};
  $("careerStats").innerHTML=Object.entries(st).map(([k,v])=>`<div class="statCard"><small>${k}</small><strong>${fmt(v)}</strong></div>`).join("");
  $("recent").innerHTML=p.recent.length?p.recent.map(r=>`<div class="row"><span>${r.opponent}<br><small>${r.runs} (${r.balls}) • ${r.wickets} wkts</small></span><b>${r.win?"WIN":"LOSS"}</b></div>`).join(""):"<p class='muted'>No matches played yet.</p>";
  $("quickStats").innerHTML=[["Runs",p.stats.runs],["Matches",p.stats.matches],["Best",p.stats.highScore],["Form",Math.round(p.form)]].map(x=>`<div class="quickStat"><small>${x[0]}</small><b>${fmt(x[1])}</b></div>`).join("");
  $("journeyStage").textContent=p.team.toUpperCase();
  const milestones=[["Academy debut",p.stats.matches>=1],["First 50",p.stats.fifties>=1],["First 100",p.stats.hundreds>=1],["Professional contract",p.contract!=="Academy Scholarship"],["Career level 5",p.level>=5]];
  $("journey").innerHTML=milestones.map(([t,done])=>`<div class="journeyItem"><span class="journeyDot" style="opacity:${done?1:.3}"></span><span>${t}</span><b class="${done?"":"muted"}">${done?"✓":"LOCKED"}</b></div>`).join("");
  const offers=career.getTransferOffers(); const offer=offers[0]||career.createOffer();
  $("contractPanel").innerHTML=`<h3>${p.contract==="Academy Scholarship"?"Next Opportunity":"Professional Contract"}</h3><p class="muted">${p.contract==="Academy Scholarship"?"Your performances unlock domestic and franchise interest.":`You are contracted to ${p.team} as ${p.role}. ${p.contractYears||1} year(s) remaining • ₹ ${fmt(p.wage||0)} wage.`}</p><div class="row"><span>Squad role</span><b>${p.squadRole}</b></div><div class="row"><span>Morale</span><b>${Math.round(p.morale)}%</b></div><div class="row"><span>Market value</span><b>₹ ${fmt(career.transferValue())}</b></div>${offer?.team&&offer.team!==p.team?`<div class="transferOffer"><div class="row"><span>Best offer</span><b>${offer.team}</b></div><div class="row"><span>Role / Wage</span><b>${offer.role} • ₹${fmt(offer.wage||offer.money)}</b></div><button class="primary" id="acceptOffer">Accept Transfer</button></div>`:"<p class='muted'>No stronger transfer offer is currently available. Keep performing.</p>`}`;
  $("newsList").innerHTML=p.news.map((n,i)=>`<div class="news"><b>${i===0?"LATEST":"CAREER UPDATE"}</b><span>${n}</span></div>`).join("");
  const season=p.season, goalPct=Math.min(100,(season.runs/Math.max(1,season.goalRuns))*100);
  $("seasonLabel").textContent=`SEASON ${season.number}`;
  $("seasonGoals").innerHTML=[["MATCHES",`${season.matches}/${season.goalMatches}`],["RUNS",`${season.runs}/${season.goalRuns}`],["WINS",`${season.wins}/${season.goalWins}`]].map(x=>`<div class="goalCard"><small>${x[0]}</small><b>${x[1]}</b></div>`).join("");
  $("goalText").textContent=`${fmt(season.runs)} / ${fmt(season.goalRuns)} runs`;$("goalBar").style.width=goalPct+"%";
  const rep=[["Local",p.reputation.local],["Domestic",p.reputation.domestic],["Franchise",p.reputation.franchise],["International",p.reputation.international]];
  $("reputationGrid").innerHTML=rep.map(x=>`<div class="repItem"><div><span>${x[0]}</span><b>${Math.round(x[1])}</b></div><div class="repMeter"><i style="width:${Math.min(100,x[1])}%"></i></div></div>`).join("");
  $("selectionStatus").textContent=p.selection;$("conditionValue").textContent=Math.round(p.fitness.condition);$("fatigueValue").textContent=Math.round(p.fitness.fatigue);$("fansValue").textContent=Math.round(p.reputation.fans);
  $("conditionBar").style.width=Math.max(0,p.fitness.condition)+"%";$("injuryStatus").textContent=p.fitness.injury?`INJURED • ${p.fitness.injury.toUpperCase()}`:"FIT • READY";
  $("selectionTitle").textContent=p.selection;$("selectionCopy").textContent=`Overall ${p.overall}. Selectors are tracking form ${Math.round(p.form)}, domestic reputation ${Math.round(p.reputation.domestic)} and fitness ${Math.round(p.fitness.condition)}.`;
  const checks=[["Academy debut",p.stats.matches>=1],["50+ run innings",p.stats.fifties+p.stats.hundreds>=1],["Professional contract",p.contract!=="Academy Scholarship"],["Domestic shortlist",p.reputation.domestic>=18],["Franchise watch",p.reputation.franchise>=30],["International watch",p.reputation.international>=35]];
  $("selectionBars").innerHTML=`<div class="selectorScore"><b>${p.overall}</b><span>PLAYER OVR</span></div><div class="selectorNote">${p.fitness.injury?"Medical team has placed a temporary hold on selection.":p.overall>=75?"National selectors have flagged your profile for monitoring.":p.overall>=60?"Domestic selectors are requesting more consistent performances.":"Academy coaches want more match exposure."}</div>`;
  $("selectionChecklist").innerHTML=checks.map(x=>`<div class="checkItem"><span>${x[1]?"✓":"○"}</span><b>${x[0]}</b><small>${x[1]?"COMPLETED":"IN PROGRESS"}</small></div>`).join("");
  const w=p.world||{rival:{name:"Rohan Das",runs:0,matches:0,wins:0,form:61},league:{points:0,played:0,wins:0,losses:0,nrr:0}};
  const wd=$("worldDashboard"); if(wd) wd.innerHTML=`<div class="worldGrid"><div><small>RIVAL</small><b>${w.rival.name}</b><span>${w.rival.runs} runs • ${w.rival.matches} matches</span></div><div><small>LEAGUE</small><b>${w.league.points} pts</b><span>${w.league.wins}W ${w.league.losses}L • NRR ${Number(w.league.nrr||0).toFixed(2)}</span></div><div><small>RIVAL FORM</small><b>${Math.round(w.rival.form)}</b><span>${w.rival.wins} wins</span></div></div><div class="miniTable">${(w.table||[]).map((t,i)=>`<div><b>${i+1}. ${t.team}</b><span>${t.pts} pts • ${t.w}-${t.l} • ${Number(t.nrr||0).toFixed(2)}</span></div>`).join("")}</div>`;
  $("awardCount").textContent=p.awards.length;
  $("awardsList").innerHTML=p.awards.length?p.awards.map(a=>`<div class="awardCard"><span>🏆</span><div><b>${a.title}</b><small>${a.detail}</small></div></div>`).join(""):"<div class='panel'><p class='muted'>Your trophy cabinet is waiting. Win matches and build milestones.</p></div>";
  const offers2=career.getTransferOffers();const tl=$("transferList");if(tl)tl.innerHTML=offers2.length?offers2.map(o=>`<div class="transferOffer"><div class="row"><span>${o.level}</span><b>${o.team}</b></div><div class="row"><span>Role</span><b>${o.role}</b></div><div class="row"><span>Wage</span><b>₹ ${fmt(o.wage)} / season</b></div><div class="row"><span>Bonus</span><b>₹ ${fmt(o.bonus)}</b></div><button class="primary" data-transfer-id="${o.id}">Accept ${o.team}</button></div>`).join(""):"<p class='muted'>No clubs are ready to make an offer yet. Improve your overall, form and reputation.</p>";
  const ch=$("contractHistory");if(ch)ch.innerHTML=(p.world.contractHistory||[]).length?p.world.contractHistory.map(h=>`<div><b>${h.team}</b><span>moved to ${h.left}</span></div>`).join(""):"<p class='muted'>No previous professional transfers.</p>";

  $("acceptOffer")?.addEventListener("click",()=>{career.acceptOffer(offer);renderAll();show("home")});
  $("recoverBtn") && ($("recoverBtn").onclick=()=>{career.recover();renderAll()});
  if(game)updateMatchUI();
}
function openCreate(){
  $("modalContent").innerHTML=`<h2>Create Your Player</h2><p class="muted">Your career is saved on this device.</p><div class="form"><label>Name</label><input id="playerName" maxlength="22" value="${career.player.name==="Rookie"?"":career.player.name}"><label>Role</label><select id="playerRole"><option>Right Hand Batter</option><option>Left Hand Batter</option><option>Batting All-Rounder</option><option>Bowling All-Rounder</option></select><button class="primary" id="savePlayer">Create Player</button></div>`;
  $("modal").classList.add("show");
  $("savePlayer").onclick=()=>{const name=$("playerName").value.trim()||"Rookie",role=$("playerRole").value;career.resetPlayer({name,role});$("modal").classList.remove("show");game=null;renderAll();show("home")};
}

/* --------------------------- SAFE MOBILE FALLBACK --------------------------- */
function setupFallbackCanvas(){
  fallbackCanvas=$("fallbackCanvas");
  if(!fallbackCanvas) return;
  fallbackCtx=fallbackCanvas.getContext("2d",{alpha:false});
  if(!fallbackCtx) return;
  fallbackCanvas.classList.add("show");
  resizeFallbackCanvas();
}
function resizeFallbackCanvas(){
  const c=fallbackCanvas||$("fallbackCanvas"); if(!c||!fallbackCtx) return;
  const d=Math.min(window.devicePixelRatio||1,2),w=Math.max(320,window.innerWidth),h=Math.max(420,window.innerHeight-(document.querySelector(".topbar")?.offsetHeight||58));
  c.width=Math.floor(w*d);c.height=Math.floor(h*d);c.style.width=w+"px";c.style.height=h+"px";fallbackCtx.setTransform(d,0,0,d,0,0);
}
function fallbackPoint(x,z,w,h){return {x:w*.5+x*w*.38,y:h*.50+z*h*.36};}
function drawFallback(){
  if(!fallbackCtx) return;
  const c=fallbackCanvas||$("fallbackCanvas");if(!c)return;
  const w=window.innerWidth,h=Math.max(420,window.innerHeight-(document.querySelector(".topbar")?.offsetHeight||58)),ctx=fallbackCtx;
  ctx.clearRect(0,0,w,h);
  const g=ctx.createRadialGradient(w*.5,h*.48,10,w*.5,h*.5,Math.max(w,h)*.72);g.addColorStop(0,"#17683b");g.addColorStop(.55,"#0b432a");g.addColorStop(1,"#02150d");ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  ctx.save();ctx.translate(w*.5,h*.52);ctx.scale(1,Math.max(.55,Math.min(1,w/h)));ctx.fillStyle="#123f2b";ctx.beginPath();ctx.ellipse(0,0,w*.47,w*.42,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="rgba(255,255,255,.12)";ctx.lineWidth=2;ctx.stroke();ctx.restore();
  const pitchW=Math.min(w*.24,170),pitchH=Math.min(h*.58,430),px=w*.5,py=h*.51;
  ctx.save();ctx.translate(px,py);ctx.fillStyle="#b69b6d";ctx.fillRect(-pitchW/2,-pitchH/2,pitchW,pitchH);ctx.fillStyle="#c5ac7c";ctx.fillRect(-pitchW*.45,-pitchH*.48,pitchW*.9,pitchH*.96);
  ctx.strokeStyle="rgba(255,255,255,.85)";ctx.lineWidth=2;[-pitchH*.44,pitchH*.44].forEach(y=>{ctx.beginPath();ctx.moveTo(-pitchW*.43,y);ctx.lineTo(pitchW*.43,y);ctx.stroke()});
  ctx.fillStyle="#f2e7bd";[-pitchH*.46,pitchH*.46].forEach(y=>{ctx.fillRect(-pitchW*.16,y-3,pitchW*.32,6)});ctx.restore();
  fallbackPlayers.forEach((pl,i)=>{const pt=fallbackPoint(pl.x,pl.z,w,h),r=Math.max(6,Math.min(10,w*.014));ctx.beginPath();ctx.fillStyle=pl.c;ctx.shadowColor=pl.c;ctx.shadowBlur=12;ctx.arc(pt.x,pt.y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="rgba(255,255,255,.8)";ctx.font="800 7px system-ui";ctx.textAlign="center";ctx.fillText(pl.role||"",pt.x,pt.y+r+10)});
  if(game&&fallbackBall){const b=fallbackBall,q=Math.min(1,b.elapsed/b.dur),e=1-Math.pow(1-q,2);const sx=w*.5,sy=b.fromBatting?h*.70:h*.30,tx=w*.5+b.side*w*.22,ty=b.fromBatting?h*.32:h*.70;const x=sx+(tx-sx)*e,y=sy+(ty-sy)*e-Math.sin(q*Math.PI)*h*.12;ctx.beginPath();ctx.fillStyle=b.wicket?"#ff5d70":"#ffffff";ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=14;ctx.arc(x,y,Math.max(4,w*.009),0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
  ctx.fillStyle="rgba(255,255,255,.52)";ctx.font="900 8px system-ui";ctx.textAlign="center";ctx.fillText(renderer?"3D BROADCAST ENGINE":"SAFE MOBILE MATCH VIEW",w*.5,h*.16);
}
function startFallbackLoop(){
  setupFallbackCanvas();
  if(fallbackRAF) return;
  fallbackLast=performance.now();
  const frame=(now)=>{fallbackRAF=requestAnimationFrame(frame);const dt=Math.min(.05,(now-fallbackLast)/1000);fallbackLast=now;if(!paused&&fallbackBall){fallbackBall.elapsed+=dt*1000;if(fallbackBall.elapsed>=fallbackBall.dur)fallbackBall=null;}if($('match')?.classList.contains('active'))drawFallback();};
  fallbackRAF=requestAnimationFrame(frame);
}
function fallbackLaunchBall(runs,wicket,fromBatting){
  fallbackBall={elapsed:0,dur:wicket?620:(runs>=4?1000:800),runs,wicket,fromBatting,side:(Math.random()-.5)*.7};
  startFallbackLoop();
}
window.addEventListener("resize",()=>{if(!renderer)resizeFallbackCanvas()});

/* --------------------------- 3D MATCH ENGINE --------------------------- */
function resize3D(){
  if(!renderer||!camera)return;
  const w=window.innerWidth,h=Math.max(1,window.innerHeight-(document.querySelector(".topbar")?.offsetHeight||58));
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
function mat(color,rough=.75,metal=0){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal})}
function limb(radius,length,material){return new THREE.Mesh(new THREE.CapsuleGeometry(radius,length,5,10),material)}
function makePlayer(color,skin=0xd99b79,opts={}){
  const g=new THREE.Group();g.userData.baseY=0;g.userData.speed=.7+Math.random()*.35;
  const jersey=mat(color,.64),skinMat=mat(skin,.82),dark=mat(0x111a20,.78),shoe=mat(0xe9edf0,.4),white=mat(0xf4f5f1,.45);
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.31,.68,7,14),jersey);torso.position.y=1.08;torso.scale.x=1.04;torso.castShadow=true;g.add(torso);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.09,.105,.15,10),skinMat);neck.position.y=1.53;g.add(neck);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.235,24,18),skinMat);head.position.y=1.78;head.castShadow=true;g.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.245,24,12,0,Math.PI*2,0,Math.PI/2),mat(0x15191d,.9));hair.position.y=1.91;g.add(hair);
  const earL=new THREE.Mesh(new THREE.SphereGeometry(.045,10,8),skinMat);earL.position.set(-.235,1.78,0);g.add(earL);const earR=earL.clone();earR.position.x=.235;g.add(earR);
  const armL=limb(.078,.5,jersey);armL.position.set(-.36,1.19,0);armL.rotation.z=-.35;armL.name="armL";g.add(armL);const armR=limb(.078,.5,jersey);armR.position.set(.36,1.19,0);armR.rotation.z=.35;armR.name="armR";g.add(armR);
  const legL=limb(.105,.58,dark);legL.position.set(-.15,.47,0);legL.name="legL";g.add(legL);const legR=limb(.105,.58,dark);legR.position.set(.15,.47,0);legR.name="legR";g.add(legR);
  const shoeL=new THREE.Mesh(new THREE.BoxGeometry(.20,.11,.38),shoe);shoeL.position.set(-.16,.12,.06);g.add(shoeL);const shoeR=shoeL.clone();shoeR.position.x=.16;g.add(shoeR);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(.255,22,11,0,Math.PI*2,0,Math.PI/2),jersey);cap.position.y=1.95;g.add(cap);const brim=new THREE.Mesh(new THREE.BoxGeometry(.31,.035,.14),jersey);brim.position.set(0,1.91,.18);g.add(brim);
  if(opts.batter){
    // helmet shell, face guard, batting pads and gloves
    const helmet=new THREE.Mesh(new THREE.SphereGeometry(.27,24,15,0,Math.PI*2,0,Math.PI*.78),mat(0x11191f,.55));helmet.position.y=1.91;g.add(helmet);
    const guard=new THREE.Mesh(new THREE.TorusGeometry(.16,.014,7,18,Math.PI),mat(0xd7e0e5,.35));guard.position.set(0,1.75,.22);guard.rotation.x=Math.PI/2;g.add(guard);
    [-.13,.13].forEach(x=>{const pad=new THREE.Mesh(new THREE.BoxGeometry(.18,.55,.12),white);pad.position.set(x,.57,.12);pad.rotation.z=x<0?.03:-.03;g.add(pad)});
    const gloveL=new THREE.Mesh(new THREE.SphereGeometry(.105,12,10),white);gloveL.position.set(-.33,1.05,.22);g.add(gloveL);const gloveR=gloveL.clone();gloveR.position.x=.33;g.add(gloveR);
  }
  if(opts.keeper){const glove=new THREE.Mesh(new THREE.BoxGeometry(.25,.18,.12),white);glove.position.set(.35,.92,.28);g.add(glove)}
  // V6 elite kit details: collar, belt, socks, face, jersey number and tiny kit seams.
  const collar=new THREE.Mesh(new THREE.TorusGeometry(.13,.018,7,18,.95*Math.PI),mat(0xf0f4f4,.55));collar.position.set(0,1.47,.03);collar.rotation.x=Math.PI/2;g.add(collar);
  const belt=new THREE.Mesh(new THREE.BoxGeometry(.43,.07,.28),mat(0x0b1217,.55));belt.position.y=.76;g.add(belt);
  const sockL=new THREE.Mesh(new THREE.CylinderGeometry(.07,.08,.25,12),white);sockL.position.set(-.15,.22,0);g.add(sockL);const sockR=sockL.clone();sockR.position.x=.15;g.add(sockR);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.035,.075,8),skinMat);nose.rotation.x=Math.PI/2;nose.position.set(0,1.77,.23);g.add(nose);
  const eyeMat=mat(0x111318,.5);for(const x of[-.075,.075]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.018,8,8),eyeMat);eye.position.set(x,1.80,.22);g.add(eye)}
  if(opts.batter){const grill=new THREE.Group();for(let x=-.14;x<=.14;x+=.07){const bar=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.27,6),mat(0xc9d3d9,.3,.55));bar.position.set(x,1.70,.29);bar.rotation.x=.18;grill.add(bar)}const bar2=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.30,6),mat(0xc9d3d9,.3,.55));bar2.rotation.z=Math.PI/2;bar2.position.set(0,1.68,.29);grill.add(bar2);g.add(grill)}
  if(opts.number!=null){const cv=document.createElement("canvas");cv.width=128;cv.height=128;const ctx=cv.getContext("2d");ctx.clearRect(0,0,128,128);ctx.fillStyle="#ffffff";ctx.font="900 76px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(String(opts.number),64,68);const tex=new THREE.CanvasTexture(cv);const num=new THREE.Mesh(new THREE.PlaneGeometry(.22,.22),new THREE.MeshBasicMaterial({map:tex,transparent:true}));num.position.set(0,1.12,.325);g.add(num)}
  return g;
}
function addBat(player){const bat=new THREE.Group();bat.name="bat";const handle=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,.58,10),mat(0x5a3a24));handle.position.y=.27;bat.add(handle);const blade=new THREE.Mesh(new THREE.BoxGeometry(.19,.72,.055),mat(0xc89b5b));blade.position.y=.79;blade.rotation.z=-.04;bat.add(blade);bat.position.set(.34,1.0,.10);bat.rotation.z=-.5;player.add(bat);return bat}
function addUmpire(pos,rot=0){const u=makePlayer(0x222831,0xd99b79);u.position.set(...pos);u.rotation.y=rot;u.scale.set(.95,1.04,.95);const shirt=new THREE.Mesh(new THREE.BoxGeometry(.44,.18,.32),mat(0xf2f2ed,.8));shirt.position.y=1.25;u.add(shirt);scene.add(u);three.umpires.push(u);return u}
function buildStadium(){
  const grass=mat(0x176b3a,.94),lightGrass=mat(0x208046,.95),pitchMat=mat(0xb69b6d,.96),white=mat(0xf5f2dd,.35);
  const ground=new THREE.Mesh(new THREE.CylinderGeometry(34,34,.5,160),grass);ground.scale.z=.84;ground.position.y=-.3;ground.receiveShadow=true;scene.add(ground);
  for(let i=-16;i<=16;i++){const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.1,.012,52),i%2?lightGrass:grass);stripe.position.set(i*2.05,0,0);stripe.scale.z=.82;scene.add(stripe)}
  const inner=new THREE.Mesh(new THREE.CylinderGeometry(21,21,.08,160),lightGrass);inner.scale.z=.82;inner.position.y=.02;scene.add(inner);
  const rope=new THREE.Mesh(new THREE.TorusGeometry(25.5,.06,8,160),mat(0xf7f7eb,.38));rope.rotation.x=Math.PI/2;rope.scale.y=.82;rope.position.y=.18;scene.add(rope);
  const pitch=new THREE.Mesh(new THREE.BoxGeometry(3.66,.13,20.12),pitchMat);pitch.position.y=.10;pitch.receiveShadow=true;scene.add(pitch);const pitchTop=new THREE.Mesh(new THREE.BoxGeometry(3.35,.025,20),mat(0xc5ac7c,.97));pitchTop.position.y=.18;scene.add(pitchTop);
  [-9.75,9.75].forEach(z=>{for(const x of[-1.55,1.55]){const l=new THREE.Mesh(new THREE.BoxGeometry(.055,.026,3.3),white);l.position.set(x,.22,z);scene.add(l)}const pop=new THREE.Mesh(new THREE.BoxGeometry(3.9,.026,.06),white);pop.position.set(0,.22,z);scene.add(pop)});
  const makeWicket=z=>{const wg=new THREE.Group();for(const x of[-.13,0,.13]){const stump=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.72,10),mat(0xf3e8bd,.42));stump.position.set(x,.52,z);stump.castShadow=true;wg.add(stump)}for(const x of[-.065,.065]){const bail=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.19,8),mat(0xf3e8bd,.42));bail.rotation.z=Math.PI/2;bail.position.set(x,.88,z);wg.add(bail)}scene.add(wg);three.wickets.push(wg)};makeWicket(-10);makeWicket(10);
  // Stands, crowd blocks, banners and floodlights make the whole stadium readable from the wide camera.
  for(let i=0;i<64;i++){const a=i/64*Math.PI*2,r=28.2;const s=new THREE.Mesh(new THREE.BoxGeometry(1.05,.7,1.25),mat(i%3?0x283f4a:0x314c58,.9));s.position.set(Math.cos(a)*r,.43,Math.sin(a)*r*.82);s.lookAt(0,.4,0);scene.add(s)}
  for(let i=0;i<40;i++){const a=i/40*Math.PI*2,r=30.5;const c=new THREE.Mesh(new THREE.BoxGeometry(.25,.22,.25),mat([0x4bb4ff,0xffc857,0xff6b8c,0x39e88f][i%4],.55));c.position.set(Math.cos(a)*r,1.0,Math.sin(a)*r*.82);scene.add(c)}
  const board=new THREE.Mesh(new THREE.BoxGeometry(13,2.6,.35),mat(0x06141c,.35));board.position.set(0,7,-29);scene.add(board);const board2=new THREE.Mesh(new THREE.BoxGeometry(13,2.6,.35),mat(0x06141c,.35));board2.position.set(0,7,29);board2.rotation.y=Math.PI;scene.add(board2);
  for(const [x,z] of[[-26,-21],[26,-21],[-26,21],[26,21]]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.11,.18,12,12),mat(0xbfcbd2,.45));pole.position.set(x,6,z);pole.castShadow=true;scene.add(pole);const lamp=new THREE.PointLight(0xffffff,2.0,34);lamp.position.set(x,12,z);scene.add(lamp);const lampBar=new THREE.Mesh(new THREE.BoxGeometry(2.8,.12,.18),mat(0xdfe9ed,.28,.45));lampBar.position.set(x,11.7,z);lampBar.rotation.y=Math.atan2(-z,-x);scene.add(lampBar)}
  // Sight screens, boundary ads and a giant V6 stadium title.
  for(const [z,rot] of[[-24,0],[24,Math.PI]]){const screen=new THREE.Mesh(new THREE.BoxGeometry(8,5,.35),mat(0x11181d,.75));screen.position.set(0,3.4,z);screen.rotation.y=rot;scene.add(screen);const strip=new THREE.Mesh(new THREE.BoxGeometry(7.2,.22,.38),mat(0x39e88f,.4));strip.position.set(0,5.2,z+(rot?-.2:.2));strip.rotation.y=rot;scene.add(strip)}
  for(let i=0;i<12;i++){const z=-23+i*4.2;const ad=new THREE.Mesh(new THREE.BoxGeometry(3.4,.55,.08),mat([0x0f2732,0x14392b,0x29261b][i%3],.6));ad.position.set(-18,.55,z);scene.add(ad);const ad2=ad.clone();ad2.position.x=18;scene.add(ad2)}
  addUmpire([2.1,0,0],Math.PI/2);addUmpire([-2.1,0,0],-Math.PI/2);
}
function clearTeamModels(){three.players.forEach(p=>scene?.remove(p));three.players=[];three.fielders=[];three.batter=null;three.bowler=null;if(three.ball){scene?.remove(three.ball);three.ball=null}}
function buildTeams(){
  clearTeamModels();
  const myColor=TEAMS[0].color,oppColor=game?.opponent?.color||TEAMS[1].color;
  const p1=makePlayer(myColor,0xd99b79,{batter:true,number:7}),p2=makePlayer(myColor,0xd99b79,{batter:true,number:18});p1.position.set(0,0,-8.55);p2.position.set(.65,0,-9.25);p1.rotation.y=Math.PI;p2.rotation.y=Math.PI;addBat(p1);addBat(p2);scene.add(p1,p2);three.players.push(p1,p2);three.batter=p1;
  const positions=[[-9,0,-2],[9,0,-2],[-6.5,0,6.8],[6.5,0,6.8],[-12,0,4],[12,0,4],[-14.5,0,-7.5],[14.5,0,-7.5],[0,0,8.5]];
  positions.forEach((pos,i)=>{const f=makePlayer(oppColor,[0xd99b79,0xc98b6d,0xe0a27d][i%3],{keeper:i===8,number:i+1});f.position.set(...pos);f.rotation.y=Math.atan2(-pos[0],-pos[2]);scene.add(f);three.players.push(f);three.fielders.push(f)});
  three.bowler=three.fielders[8];renderTeamList();
}
function init3D(){
  const canvas=$("gameCanvas");renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(window.innerWidth,window.innerHeight,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;scene=new THREE.Scene();scene.background=new THREE.Color(0x06141a);scene.fog=new THREE.FogExp2(0x06141a,.010);camera=new THREE.PerspectiveCamera(48,1,.05,180);camera.position.set(0,14,27);camera.lookAt(0,.6,0);clock=new THREE.Clock();
  scene.add(new THREE.HemisphereLight(0xbfeaff,0x0c2819,2.3));const sun=new THREE.DirectionalLight(0xffffff,2.9);sun.position.set(-18,28,14);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);sun.shadow.camera.left=-38;sun.shadow.camera.right=38;sun.shadow.camera.top=38;sun.shadow.camera.bottom=-38;scene.add(sun);const rim=new THREE.DirectionalLight(0x6fc8ff,1.05);rim.position.set(18,14,-22);scene.add(rim);
  buildStadium();buildTeams();resize3D();$("fallbackCanvas")?.classList.remove("show");window.addEventListener("resize",resize3D);renderer.setAnimationLoop(renderLoop);
}
function renderTeamList(){
  const names=game?.phase==="bat"?[career.player.name,game.teammateName,...game.teamBatters.slice(2)]:[game.aiBatter?.name||"AI Opener",game.aiNon?.name||"AI Non-striker","Player Bowler","Slip","Point","Cover","Mid-off","Mid-on","Square Leg","Fine Leg","Wicketkeeper"];
  $("teamCount").textContent="11/11";$("teamPlayers").innerHTML=names.slice(0,11).map((n,i)=>`<div class="teamP ${i===0?"active":""}">${i+1}. ${n}</div>`).join("");
}

/* --------------------------- CAMERA / ANIMATION --------------------------- */
function cameraTo(pos,look,dur=.55){if(!camera)return;cameraTween={from:camera.position.clone(),to:new THREE.Vector3(...pos),look:new THREE.Vector3(...look),dur,t:0}}
function cinematicCamera(mode){cameraMode=(mode+5)%5;const poses=[[0,13.8,27],[6.8,4.4,13.5],[-6.8,4.7,12.5],[0,8.8,-19],[0,22,3]];const looks=[[0,.5,0],[0,1,-8.5],[0,1,8],[0,.8,-2],[0,0,0]];cameraTo(poses[cameraMode],looks[cameraMode],.62);$("cameraHint").textContent=["CAMERA • BROADCAST WIDE","CAMERA • STRIKER CLOSE-UP","CAMERA • BOWLER END","CAMERA • BATTER END","CAMERA • AERIAL STADIUM"][cameraMode]}
function updateCamera(dt){if(!cameraTween)return;cameraTween.t=Math.min(1,cameraTween.t+dt/cameraTween.dur);const q=cameraTween.t<.5?2*cameraTween.t*cameraTween.t:1-Math.pow(-2*cameraTween.t+2,2)/2;camera.position.lerpVectors(cameraTween.from,cameraTween.to,q);camera.lookAt(cameraTween.look);if(cameraTween.t>=1)cameraTween=null}
function playAnim(type,dur,done,player){if(anim.active)return false;anim={active:true,t:0,dur,type,from:player.position.clone(),to:player.position.clone(),done,player};return true}
function animateShot(type,done){const p=three.batter;if(!p){done?.();return}anim={active:true,t:0,dur:.64,type:"shot",from:p.position.clone(),to:p.position.clone(),done,player:p};cinematicCamera(type==="loft"||type==="pull"?1:3)}
function animateBowling(done){const b=three.bowler;if(!b){done?.();return}const from=b.position.clone(),to=new THREE.Vector3(0,0,7.5);anim={active:true,t:0,dur:.88,type:"bowl",from,to,done:()=>{b.position.copy(from);done?.()},player:b};cinematicCamera(2)}
function animateRun(player,from,to,done){anim={active:true,t:0,dur:.5,type:"run",from:from.clone(),to:to.clone(),done,player}}
function updateAnimation(dt){
  if(paused||!anim.active)return;anim.t+=dt;const q=Math.min(1,anim.t/anim.dur),e=q<.5?2*q*q:1-Math.pow(-2*q+2,2)/2,p=anim.player;
  if(anim.type==="bowl"){p.position.lerpVectors(anim.from,anim.to,e);p.rotation.y=0;const l=p.getObjectByName("armL"),r=p.getObjectByName("armR");if(l)l.rotation.z=-.35-Math.sin(q*Math.PI)*1.5;if(r)r.rotation.z=.35+Math.sin(q*Math.PI)*1.2;const ll=p.getObjectByName("legL"),lr=p.getObjectByName("legR");if(ll)ll.rotation.x=Math.sin(q*Math.PI*3)*.8;if(lr)lr.rotation.x=-Math.sin(q*Math.PI*3)*.8}
  if(anim.type==="shot"){const bat=p?.getObjectByName("bat");if(bat){bat.rotation.z=-.5-Math.sin(q*Math.PI)*1.9;bat.rotation.x=.25*Math.sin(q*Math.PI)}p.rotation.y=Math.PI+Math.sin(q*Math.PI)*.6;const l=p.getObjectByName("armL"),r=p.getObjectByName("armR");if(l)l.rotation.z=-.35+Math.sin(q*Math.PI)*1.2;if(r)r.rotation.z=.35-Math.sin(q*Math.PI)*1.0}
  if(anim.type==="run"){p.position.lerpVectors(anim.from,anim.to,e);p.position.y=Math.abs(Math.sin(q*Math.PI*2))*.08;const l=p.getObjectByName("legL"),r=p.getObjectByName("legR");if(l)l.rotation.x=Math.sin(q*Math.PI*4)*.7;if(r)r.rotation.x=-Math.sin(q*Math.PI*4)*.7}
  if(q>=1){anim.active=false;anim.done?.()}
}
function launchBall(runs,wicket,shotType="drive",fromBatting=false){
  if(!scene){fallbackLaunchBall(runs,wicket,fromBatting);return;}
  if(three.ball)scene.remove(three.ball);const ball=new THREE.Mesh(new THREE.SphereGeometry(.095,18,14),mat(0xa91528,.35));const playerBatting=game?.phase==="bat";const strikerZ=playerBatting?-8.6:8.6;const startZ=playerBatting?8.5:-8.5;ball.position.set(0,1.18,startZ);scene.add(ball);three.ball=ball;
  let side=(Math.random()-.5)*1.3;if(shotType==="cut")side=-1.4+Math.random()*2.8;if(shotType==="pull")side=(Math.random()<.5?-1:1)*(1.2+Math.random()*2);if(shotType==="loft")side=(Math.random()-.5)*4;
  const dir=playerBatting?-1:1,base=10+(runs>=4?4:0)+(runs>=6?6:0),target=new THREE.Vector3(side,Math.min(1.4,0.18+(runs>=6?.5:0)),strikerZ+dir*base);const start=ball.position.clone(),t0=performance.now(),dur=wicket?620:(runs>=4?1000:800);
  function step(now){if(paused){requestAnimationFrame(step);return;}const q=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-q,2);ball.position.lerpVectors(start,target,e);ball.position.y=.22+(wicket?.8:1.4+Math.min(2.2,runs*.34))*Math.sin(q*Math.PI);ball.rotation.x+=.25;ball.rotation.z+=.19;if(q<1)requestAnimationFrame(step);else{scene.remove(ball);if(three.ball===ball)three.ball=null;cinematicCamera(0)}}requestAnimationFrame(step);
}

/* --------------------------- MATCH LOGIC --------------------------- */
function overString(balls){return `${Math.floor(balls/6)}.${balls%6}`}function rr(runs,balls){return balls?((runs/(balls/6))).toFixed(2):"0.00"}
async function startMatch(){
  clearAutoTimer();paused=false;autoPlayMode=false;matchLock=false;
  const opponent=TEAMS[1+Math.floor(Math.random()*3)],bowl=AI_BOWLERS[Math.floor(Math.random()*AI_BOWLERS.length)];
  const pitch=PITCHES[Math.floor(Math.random()*PITCHES.length)],condition=CONDITIONS[Math.floor(Math.random()*CONDITIONS.length)],fixture=career.getNextFixture();
  game={innings:1,phase:"bat",balls:0,runs:0,wickets:0,playerRuns:0,playerBalls:0,teammateRuns:0,teammateBalls:0,fours:0,sixes:0,bowlWickets:0,catches:0,target:null,opponent,teammateName:"Rahul Sen",userStriker:true,playerOut:false,overNumber:0,ballInOver:0,finished:false,aiScore:0,aiWickets:0,aiBalls:0,aiBatterIndex:0,aiOnStrike:true,aiBatter:AI_BATTERS[0],aiNon:AI_BATTERS[1],aiBowler:bowl,field:"balanced",pitch,condition,fixture,teamBatters:[career.player.name,"Rahul Sen","Aman Roy","Rafi Khan","Nabil Hasan","Sohan Das","Imran Ali","Rifat Chowdhury","Arif Noor","Tanim Ahmed","Shuvo Paul"],matchStart:Date.now()};
  lastMatchStart=Date.now();resetBallFeed();$("matchResult").classList.remove("show");
  if(renderer===undefined||!renderer){
    try{
      await loadThree();
      init3D();
      document.body.classList.remove("no3d");
      $("fallbackCanvas")?.classList.remove("show");
    }catch(err){
      console.warn("3D engine unavailable; switching to safe 2D match view.",err);
      renderer=null; scene=null; camera=null; clock=null;
      document.body.classList.add("no3d");
      setPhaseText("3D engine unavailable • Safe 2D match view is active. The match is still fully playable.");
      setupFallbackCanvas();startFallbackLoop();
    }
  }
  if(renderer) buildTeams();
  else { setupFallbackCanvas();startFallbackLoop(); }
  cameraMode=0;if(camera)cinematicCamera(0);setPhaseText(`Toss won • ${career.player.name}'s XI bats first. Watch the line and choose your shot.`);$("aiDecision").textContent=`${game.aiBowler.name} is setting the field • ${game.aiBowler.pace} kph pace`;updateMatchUI();renderTeamList();
}
function clearAutoTimer(){if(autoTimer){clearTimeout(autoTimer);autoTimer=null}}
function scheduleAuto(fn,delay=280){clearAutoTimer();autoTimer=setTimeout(()=>{autoTimer=null;if(game&&!game.finished&&autoPlayMode&&!paused)fn();else if(game&&!game.finished&&autoPlayMode&&paused)scheduleAuto(fn,400)},delay)}
function togglePause(){if(!game||game.finished)return;paused=!paused;const b=$("pauseBtn");if(b)b.textContent=paused?"▶ RESUME":"Ⅱ PAUSE";const ov=$("pauseOverlay");if(ov)ov.classList.toggle("show",paused)}
function enableAutoPlay(){if(!game||game.finished)return;autoPlayMode=true;paused=false;matchLock=false;const panel=$("autoPanel");if(panel)panel.classList.remove("show");const b=$("pauseBtn");if(b)b.textContent="Ⅱ PAUSE";setPhaseText(game.playerOut?"FULL MATCH AUTOPLAY • Your player is out. Watch the remaining innings and AI chase.":"FULL MATCH AUTOPLAY");scheduleAutoStep(120)}
function scheduleAutoStep(delay=260){scheduleAuto(()=>{
  if(!game||game.finished)return;
  if(anim.active||three.ball||fallbackBall){scheduleAutoStep(140);return;}
  if(game.phase==="bat"){if(game.wickets>=10||game.balls>=120){beginAIMatch();return}teammateBall();}
  else if(game.phase==="bowl"){if(game.aiScore>=game.target||game.aiBalls>=120||game.aiWickets>=10){finishMatch();return}const types=Object.keys(BOWLS);bowling(types[game.aiBalls%types.length]);}
},delay)}
function showAutoPanel(){const p=$("autoPanel");if(p){p.classList.add("show");p.innerHTML='<div class="autoCard"><span>🏏</span><div><b>YOU ARE OUT</b><small>Watch the rest of the match</small></div><button id="autoPlayBtn">▶ FULL MATCH AUTOPLAY</button></div>';$('autoPlayBtn').onclick=enableAutoPlay}}
function updateMatchUI(){
  if(!game)return;const isBat=game.phase==="bat",userOn=isBat&&game.userStriker&&!game.playerOut;
  $("score").textContent=isBat?`${game.runs}/${game.wickets}`:`${game.aiScore}/${game.aiWickets}`;$("overs").textContent=isBat?`${overString(game.balls)} ov`:`${overString(game.aiBalls)} ov`;$("runRate").textContent=isBat?`RR ${rr(game.runs,game.balls)}`:`REQ ${rr(Math.max(0,game.target-game.aiScore),Math.max(1,120-game.aiBalls))}`;
  $("batTeam").textContent=(isBat?career.player.team:game.opponent.name).toUpperCase();$("inningsLabel").textContent=isBat?"1ST INNINGS":"2ND INNINGS";$("target").textContent=isBat?"YOU BAT FIRST • T20":`TARGET ${game.target} • NEED ${Math.max(0,game.target-game.aiScore)}`;$("matchPhase").textContent=isBat?"BATTING":"BOWLING";
  const shotPanel=$("shotPanel"),bowlPanel=$("bowlPanel");
  if(shotPanel){shotPanel.classList.toggle("isHidden",!(isBat&&userOn&&!autoPlayMode));shotPanel.setAttribute("aria-hidden",String(!(isBat&&userOn&&!autoPlayMode)));}
  if(bowlPanel){bowlPanel.classList.toggle("isHidden",isBat||game.finished);bowlPanel.setAttribute("aria-hidden",String(isBat||game.finished));}
  document.querySelectorAll("[data-shot],[data-bowl]").forEach(b=>b.disabled=!!anim.active||paused||game.finished||autoPlayMode);
  const pauseBtn=$("pauseBtn");if(pauseBtn)pauseBtn.textContent=paused?"▶ RESUME":"Ⅱ PAUSE";
  $("strikerName").textContent=isBat?(game.playerOut?game.teammateName:(game.userStriker?career.player.name:game.teammateName)):game.aiBatter.name;$("strikerMini").textContent=isBat?(game.playerOut?`${game.teammateRuns}* (${game.teammateBalls})`:(game.userStriker?`${game.playerRuns}* (${game.playerBalls})`:`${game.teammateRuns}* (${game.teammateBalls})`)):game.aiBatter.role;
  $("aiName").textContent=isBat?(game.userStriker?game.teammateName:career.player.name):game.aiNon.name;$("aiMini").textContent=isBat?"NON-STRIKER":"NON-STRIKER";$("bowlerName").textContent=isBat?game.aiBowler.name:career.player.name;$("bowlerMini").textContent=isBat?`${game.aiBowler.pace} kph • AI BOWLER`:`YOUR BOWLING`;
  $("miniScore").textContent=isBat?`${career.player.name} ${game.playerRuns}${game.playerOut?"":"*"} • ${game.playerBalls} balls • ${game.ballInOver}/6`:`AI ${game.aiScore}/${game.aiWickets} • ${overString(game.aiBalls)} ov`;$("strikeStatus").textContent=isBat?(game.playerOut?"🤖 YOU ARE OUT • TEAMMATE BATTING":game.userStriker?"⚡ YOU ARE ON STRIKE":"🤖 TEAMMATE IS ON STRIKE"):"🎯 YOU ARE BOWLING";$("deliveryText").textContent=isBat?`OVER ${game.overNumber+1} • BALL ${game.ballInOver+1}`:`OVER ${Math.floor(game.aiBalls/6)+1} • BALL ${game.aiBalls%6+1}`;$("fieldText").textContent=isBat?`FIELD: ${game.wickets>=7?"AGGRESSIVE":"BALANCED"}`:`FIELD: ${FIELDS[game.field]?.name||"BALANCED"}`;$("stadiumStatus").textContent=cameraMode===0?"🏟️ FULL STADIUM":"🎥 BROADCAST CAMERA";const v=$("venueLabel");if(v)v.textContent=`${game.condition.name.toUpperCase()} • ${game.pitch.name.toUpperCase()} • ${game.fixture?.venue||"HOME"}`;$("matchClock").textContent=`${String(Math.floor((Date.now()-game.matchStart)/60000)).padStart(2,"0")}:${String(Math.floor((Date.now()-game.matchStart)/1000)%60).padStart(2,"0")}`;
}
function setPhaseText(text){$("commentary").textContent=text}function animateIndicator(wicket=false){const el=$("ballIndicator");el.classList.remove("animate","wicket");void el.offsetWidth;el.classList.add("animate");if(wicket)el.classList.add("wicket")}
function timingQuality(){const p=career.player;return Math.min(99,p.skills.batting*.46+p.skills.mental*.16+p.skills.fitness*.08+p.form*.30)}
function completePlayerBall(){
  if(game.ballInOver>=6){game.ballInOver=0;game.overNumber++;game.userStriker=!game.userStriker;setPhaseText(`OVER ${game.overNumber} COMPLETE • End-of-over strike rotation applied. ${game.userStriker&&!game.playerOut?"You face the new over.":"Teammate faces the new over."}`)}
  updateMatchUI();renderTeamList();
  if(game.wickets>=10||game.balls>=120){beginAIMatch();return}
  if(game.phase==="bat"&&game.playerOut){
    if(autoPlayMode) scheduleAutoStep(180);
    else { showAutoPanel(); return; }
  } else if(game.phase==="bat"&&!game.playerOut&&!game.userStriker){
    scheduleAuto(()=>{if(game&&!game.finished&&game.phase==="bat")teammateBall()},650);
  }
}
function battingShot(type){
  if(!game||game.phase!=="bat"||game.playerOut||!game.userStriker||anim.active)return;
  three.batter=three.players[0]||three.batter;const p=career.player,s=SHOTS[type];game.playerBalls++;game.balls++;game.ballInOver++;
  const pitchMod=game.pitch.bat,conditionMod=game.condition.swing,bowlerQuality=(game.aiBowler.accuracy*.42+game.aiBowler.pace*.22+game.aiBowler.variation*.20+game.opponent.strength*.16)/100;
  const timing=timingQuality(),skill=(p.skills.batting*.45+p.skills.power*.18+p.skills.mental*.15+p.form*.12+p.fitness.condition*.10)/100;
  const matchup=(type==="cut"&&game.aiBowler.pace>82)?.02:(type==="pull"&&game.aiBowler.pace>86)?.018:0;
  const risk=Math.max(.008,s.risk*(1.25-timing/110)+(Math.max(0,bowlerQuality-.58)*.09)+Math.max(0,-pitchMod)*.08+conditionMod*.05+Math.min(.12,game.wickets*.013+game.balls*.0003)-matchup);
  const wicket=Math.random()<risk;
  $("shotFeedback").textContent=`TIMING • ${SHOT_NAMES[type]}`;$("shotFeedback").classList.add("show");setTimeout(()=>$("shotFeedback").classList.remove("show"),520);
  animateShot(type,()=>launchBall(0,wicket,type,true));animateIndicator(wicket);
  if(wicket){game.wickets++;game.playerOut=true;game.userStriker=false;setPhaseText(`${SHOT_NAMES[type]} • ${game.condition.desc}. WICKET — ${career.player.name} is out for ${game.playerRuns}.`);pushBallEvent(0,true,Math.floor((game.balls-1)/6),((game.balls-1)%6)+1,SHOT_NAMES[type]);if(game.wickets<10&&game.balls<120)showAutoPanel())}
  else{
    const r=Math.random(),quality=skill*.58+(timing/100)*.20+s.timing*.22;let outcome;
    if(type==="defend")outcome=r<.80?0:r<.97?1:2;else if(type==="drive")outcome=r<.15?0:r<.54?1:r<.78?2:r<.95?4:6;else if(type==="cut")outcome=r<.13?0:r<.45?1:r<.70?2:r<.94?4:6;else if(type==="pull")outcome=r<.11?0:r<.38?1:r<.63?2:r<.88?4:6;else outcome=r<.08?0:r<.27?1:r<.48?2:r<.75?4:6;
    if(game.pitch.name==="Slow"&&outcome>=4)outcome=Math.random()<.42?2:outcome;if(game.pitch.name==="Flat"&&quality>.78&&Math.random()<.24&&outcome<4)outcome=4;if(Math.random()<Math.max(0,quality-.72)*.65)outcome=Math.min(6,outcome+1);
    game.runs+=outcome;game.playerRuns+=outcome;if(outcome===4)game.fours++;if(outcome===6)game.sixes++;if([1,3,5].includes(outcome))game.userStriker=!game.userStriker;
    setPhaseText(`${SHOT_NAMES[type]} • ${outcome===0?"dot ball":outcome===4?"FOUR!":outcome===6?"SIX!":`${outcome} run${outcome>1?"s":""}`}. ${game.pitch.name} pitch • ${game.condition.name} conditions.`);pushBallEvent(outcome,false,Math.floor((game.balls-1)/6),((game.balls-1)%6)+1,SHOT_NAMES[type]);
  }
  completePlayerBall();
}
function teammateBall(){
  if(!game||game.phase!=="bat"||anim.active||game.balls>=120||game.wickets>=10)return;three.batter=three.players[1]||three.batter;game.teammateBalls++;game.balls++;game.ballInOver++;const skill=57+Math.random()*28,wicket=Math.random()<Math.max(.028,.115-skill/1000),r=Math.random();let outcome=wicket?0:(r<.49?0:r<.69?1:r<.84?2:r<.96?4:6);animateShot("drive",()=>launchBall(outcome,wicket,"drive",true));animateIndicator(wicket);
  if(wicket){game.wickets++;setPhaseText(`${game.teammateName} edges behind — WICKET. The next Academy batter comes in.`);pushBallEvent(0,true,Math.floor((game.balls-1)/6),((game.balls-1)%6)+1,game.teammateName);game.teammateName=game.teamBatters[Math.min(10,game.wickets+1)]||"Next Batter";game.userStriker=game.playerOut?false:true}
  else{game.runs+=outcome;game.teammateRuns+=outcome;if([1,3,5].includes(outcome))game.userStriker=!game.userStriker;setPhaseText(`${game.teammateName}: ${outcome===0?"dot ball":outcome===4?"FOUR!":outcome===6?"SIX!":`${outcome} run${outcome>1?"s":""}`}. ${game.userStriker&&!game.playerOut?"You are back on strike.":"Teammate keeps strike."}`);pushBallEvent(outcome,false,Math.floor((game.balls-1)/6),((game.balls-1)%6)+1,game.teammateName)}
  completePlayerBall();
}
function beginAIMatch(){
  fallbackBall=null;
  game.target=game.runs+1;game.innings=2;game.phase="bowl";game.aiScore=0;game.aiWickets=0;game.aiBalls=0;game.aiBatterIndex=0;game.aiOnStrike=true;game.aiBatter=AI_BATTERS[0];game.aiNon=AI_BATTERS[1];game.ballInOver=0;game.overNumber=0;game.playerOut=false;
  if(scene){
    clearTeamModels();buildTeams();
    three.batter=three.players[0];three.bowler=three.players[10];
    if(three.players[0]){three.players[0].position.set(0,0,8.55);three.players[0].rotation.y=0}
    if(three.players[1]){three.players[1].position.set(.65,0,9.25);three.players[1].rotation.y=0}
    const pos=[[-9,0,2],[9,0,2],[-6.5,0,-6.8],[6.5,0,-6.8],[-12,0,-4],[12,0,-4],[-14.5,0,7.5],[14.5,0,7.5],[0,0,-8.5]];three.fielders.forEach((f,i)=>{if(pos[i]){f.position.set(...pos[i]);f.rotation.y=Math.atan2(-pos[i][0],-pos[i][2])}});
  }
  setPhaseText(`TARGET ${game.target} • You are bowling. Use variation and attack the AI batter's weakness.`);$("aiDecision").textContent="AI is reading required run rate, wickets in hand and field placement…";cinematicCamera(0);updateMatchUI();renderTeamList();
}
function chooseAIShot(){const b=game.aiBatter,need=Math.max(0,game.target-game.aiScore),left=Math.max(1,120-game.aiBalls),required=need/(left/6),base=b.bat*.48+b.power*.22+b.mental*.18+b.form*.12;let shot;if(required>12)shot=Math.random()<.62?"loft":Math.random()<.7?"pull":"drive";else if(required>9)shot=Math.random()<.45?"loft":Math.random()<.6?"pull":"drive";else if(required>7)shot=Math.random()<.3?"loft":Math.random()<.5?"drive":"cut";else if(required<5)shot=Math.random()<.52?"defend":Math.random()<.7?"drive":"cut";else shot=Math.random()<.38?"drive":Math.random()<.68?"cut":"pull";if(game.aiWickets>=6&&b.mental>70&&required<8)shot="drive";if(base<52&&required>10&&Math.random()<.35)shot="defend";return shot}
function bowling(type){
  if(!game||game.phase!=="bowl"||anim.active||game.aiBalls>=120)return;
  game.aiBalls++;const b=game.aiBatter,d=BOWLS[type],need=Math.max(0,game.target-game.aiScore),left=Math.max(1,120-game.aiBalls),required=need/(left/6),bowStrength=(career.player.skills.bowling*.44+career.player.skills.mental*.20+career.player.skills.fitness*.18+career.player.skills.fielding*.18)/100,field=FIELDS[game.field]||FIELDS.balanced,aiShot=chooseAIShot();
  let wicketChance=d.wicket*(.65+bowStrength*.82)+game.pitch.bowl*.45+game.condition.swing*.28+field.wicket;if(type===b.weak)wicketChance+=.045;if(type==="yorker"&&b.bat<65)wicketChance+=.03;if(type==="bouncer"&&b.power>72)wicketChance-=.018;if(required>10)wicketChance+=.012;
  const wicket=Math.random()<Math.min(.36,Math.max(.015,wicketChance));const r=Math.random();let runs;
  const paceMod=game.pitch.pace,spinMod=game.pitch.spin;let boundaryBoost=field.boundary;
  if(wicket)runs=0;else if(type==="yorker")runs=r<.56?0:r<.83?1:r<.94?2:r<.985?4:6;else if(type==="length")runs=r<.40?0:r<.70?1:r<.88?2:r<.98?4:6;else if(type==="bouncer")runs=r<.28?0:r<.54?1:r<.72?2:r<.94?4:6;else runs=r<.46?0:r<.70?1:r<.87?2:r<.97?4:6;
  if(!wicket&&game.pitch.name==="Slow"&&runs>=4&&Math.random()<.35)runs=2;if(!wicket&&game.pitch.name==="Flat"&&Math.random()<.12)runs=Math.max(runs,4);if(!wicket&&Math.random()<Math.max(0,boundaryBoost))runs=Math.max(runs,4);if(!wicket&&field.runs<0&&runs<=1&&Math.random()<.25)runs=0;
  animateBowling(()=>launchBall(runs,wicket,aiShot,false));animateIndicator(wicket);
  if(wicket){game.aiWickets++;setPhaseText(`${d.desc} • ${b.name} beaten by your ${type.toUpperCase()} on a ${game.pitch.name} pitch.`);pushBallEvent(0,true,Math.floor((game.aiBalls-1)/6),((game.aiBalls-1)%6)+1,type.toUpperCase());advanceAIWicket()}
  else{game.aiScore+=runs;if([1,3,5].includes(runs))game.aiOnStrike=!game.aiOnStrike;$("aiDecision").textContent=`AI played ${aiShot.toUpperCase()} • ${b.name} weakness: ${b.weak.toUpperCase()} • req RR ${required.toFixed(2)}`;setPhaseText(`${b.name}: ${runs===0?"dot ball":runs===4?"FOUR":runs===6?"SIX":`${runs} run${runs>1?"s":""}`}. ${game.field} field.`);pushBallEvent(runs,false,Math.floor((game.aiBalls-1)/6),((game.aiBalls-1)%6)+1,type.toUpperCase())}
  if(game.aiScore>=game.target||game.aiBalls>=120||game.aiWickets>=10){finishMatch();return}
  if(game.aiBalls%6===0){game.aiOnStrike=!game.aiOnStrike;game.overNumber++;setPhaseText(`OVER ${game.overNumber} COMPLETE • ${Math.max(0,game.target-game.aiScore)} needed • ${game.field} field.`)}updateMatchUI();if(autoPlayMode&&!game.finished)scheduleAutoStep(220)
}
function advanceAIWicket(){if(game.aiWickets>=10)return;game.aiBatterIndex=Math.min(10,game.aiWickets);game.aiBatter=AI_BATTERS[game.aiBatterIndex]||AI_BATTERS[10];const next=Math.min(10,game.aiBatterIndex+1);game.aiNon=AI_BATTERS[next]||AI_BATTERS[1];game.aiOnStrike=true;$("aiDecision").textContent=`${game.aiBatter.name} walks in • ${game.aiBatter.role} • AI changes plan.`}
function finishMatch(){
  if(!game||game.finished)return;clearAutoTimer();autoPlayMode=false;paused=false;matchLock=false;fallbackBall=null;const po=$("pauseOverlay");if(po)po.classList.remove("show");game.finished=true;game.phase="finished";
  const tie=game.aiScore===game.target-1;const win=!tie&&game.aiScore<game.target-1;const chased=!tie&&game.aiScore>=game.target;
  const result={win,tie,runs:game.playerRuns,balls:game.playerBalls,wickets:game.aiWickets,catches:game.catches,sixes:game.sixes,fours:game.fours,opponent:game.opponent.name,notOut:!game.playerOut,aiScore:game.aiScore};career.applyMatch(result);renderAll();
  $("resultIcon").textContent=tie?"🤝":win?"🏆":"💪";$("resultTitle").textContent=tie?"MATCH TIED":win?"MATCH WON":"MATCH LOST";
  $("resultText").textContent=tie?`${career.player.name}'s XI finished level with ${game.opponent.name}. Both teams share a point.`:win?`${career.player.name}'s XI defended ${game.target-1} against ${game.opponent.name}.`:`${game.opponent.name} chased ${game.target} with ${Math.max(0,120-game.aiBalls)} balls remaining.`;
  $("resultStats").innerHTML=[["Your runs",game.playerRuns],["Team score",game.target-1],["AI score",game.aiScore],["AI wickets",game.aiWickets],["Balls",game.playerBalls],["Fours / Sixes",`${game.fours}/${game.sixes}`],["Pitch",game.pitch.name],["Conditions",game.condition.name],["Field",FIELDS[game.field]?.name||"Balanced"],["Form",Math.round(career.player.form)]].map(x=>`<div class="resultStat"><small>${x[0]}</small><b>${x[1]}</b></div>`).join("");$("matchResult").classList.add("show");if(camera)cinematicCamera(0)
}

function renderLoop(){if(!renderer||!scene)return;if(paused){renderer.render(scene,camera);return;}const dt=Math.min(clock.getDelta(),.04);updateAnimation(dt);updateCamera(dt);const t=clock.elapsedTime;three.players.forEach((p,i)=>{if(!p.userData.busy&&!anim.active){const l=p.getObjectByName("legL"),r=p.getObjectByName("legR");if(l)l.rotation.x=Math.sin(t*p.userData.speed+i)*.035;if(r)r.rotation.x=-Math.sin(t*p.userData.speed+i)*.035;p.rotation.z=Math.sin(t*.8+i)*.006}});renderer.render(scene,camera)}

$("gameCanvas")?.addEventListener("webglcontextlost",e=>{
  e.preventDefault();
  try{renderer?.setAnimationLoop(null)}catch(_){}
  renderer=null;scene=null;camera=null;clock=null;document.body.classList.add("no3d");setupFallbackCanvas();startFallbackLoop();
  if(game&&!game.finished){setPhaseText("3D graphics paused by the device • Safe match view is active.");updateMatchUI();}
});

document.addEventListener("click",e=>{
  const action=e.target.closest("[data-action]")?.dataset.action;
  if(action==="pause"){togglePause();return;}
  if(action==="home")show("home");else if(action==="profile")show("profile");else if(action==="match")show("match");else if(action==="training")show("training");else if(action==="stats")show("stats");else if(action==="contract")show("contract");else if(action==="news")show("news");else if(action==="selection")show("selection");else if(action==="awards")show("awards");else if(action==="transfer")show("transfer");else if(action==="create")openCreate();
  const train=e.target.closest("[data-train]")?.dataset.train;if(train){const r=career.train(train);renderAll();alert(r.msg)}
  const shot=e.target.closest("[data-shot]")?.dataset.shot;if(shot)battingShot(shot);const bowl=e.target.closest("[data-bowl]")?.dataset.bowl;if(bowl)bowling(bowl);const field=e.target.closest("[data-field]")?.dataset.field;if(field&&game&&game.phase==="bowl"&&!anim.active&&!paused){game.field=field;setPhaseText(`Field changed to ${FIELDS[field].name}. ${FIELDS[field].desc}`);updateMatchUI();} const transferId=e.target.closest("[data-transfer-id]")?.dataset.transferId;if(transferId){const off=career.getTransferOffers().find(o=>o.id===transferId);if(off){career.acceptTransfer(off);renderAll();show("transfer");alert(`Transfer complete: ${off.team}`)}}
  const sim=e.target.closest("[data-sim]")?.dataset.sim;if(sim&&game&&game.phase==="bowl"&&!anim.active){for(let i=0;i<(sim==="over"?6:Math.max(1,120-game.aiBalls));i++){if(game.finished||game.aiScore>=game.target||game.aiWickets>=10||game.aiBalls>=120)break;const types=Object.keys(BOWLS);bowling(types[i%types.length]);}}
});
$("modalClose").onclick=()=>$("modal").classList.remove("show");$("cameraBtn")?.addEventListener("click",()=>cinematicCamera(cameraMode+1));$("wideBtn")?.addEventListener("click",()=>cinematicCamera(0));$("newMatchBtn")?.addEventListener("click",()=>{game=null;startMatch();show("match")});
let progress=0;const timer=setInterval(()=>{progress+=8;$("loadProgress").style.width=Math.min(progress,100)+"%";if(progress>=100){clearInterval(timer);setTimeout(()=>$("loading").classList.add("hide"),260)}},70);
setInterval(()=>{if(game&&$("match").classList.contains("active"))updateMatchUI()},1000);renderAll();
