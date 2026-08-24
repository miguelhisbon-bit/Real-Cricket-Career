import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {Career,fmt} from "./career.js";
import {TEAMS,SHOTS,BOWLS,AI_BATTERS,AI_BOWLERS} from "./data.js";

const career=new Career(), $=id=>document.getElementById(id);
const screens=[...document.querySelectorAll(".screen")];
let scene,camera,renderer,clock,animId;
let game=null, three={players:[],ball:null,batter:null,bowler:null,stumps:null,fielders:[]};
let anim={active:false,t:0,dur:0,type:"",from:null,to:null,done:null};
let lastMatchStart=0;

function show(id){
  screens.forEach(s=>s.classList.toggle("active",s.id===id));
  if(id==="match"){
    if(!game || Date.now()-lastMatchStart>120000) startMatch();
    if(renderer) renderer.setAnimationLoop(renderLoop);
  } else if(renderer) renderer.setAnimationLoop(null);
  renderAll();
}

function renderAll(){
  const p=career.player;
  $("topStats").textContent=`Age ${p.age} • OVR ${p.overall} • ₹ ${fmt(p.money)}`;
  $("homeName").textContent=p.name;$("homeOvr").textContent=p.overall;
  $("homeStatus").textContent=`${p.team} • Level ${p.level} • Form ${Math.round(p.form)} • ${p.contract}`;
  $("profileName").textContent=p.name;$("profileRole").textContent=p.role;$("profileTeam").textContent=p.team;
  $("profileAge").textContent=`${p.age} yrs`;$("profileLevel").textContent=`Level ${p.level}`;$("profileForm").textContent=`Form ${Math.round(p.form)}`;
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
  const offer=career.createOffer();
  $("contractPanel").innerHTML=p.contract==="Academy Scholarship"
   ?`<h3>Next opportunity</h3><p class="muted">Strong performances unlock a professional deal.</p><div class="row"><span>Offer</span><b>${offer.team}</b></div><div class="row"><span>Role</span><b>${offer.role}</b></div><div class="row"><span>Signing bonus</span><b>₹ ${fmt(offer.money)}</b></div><button class="primary" id="acceptOffer">Accept offer</button>`
   :`<h3>Professional Contract</h3><p class="muted">You are contracted to ${p.team} as ${p.role}.</p><div class="row"><span>Status</span><b class="tag">ACTIVE</b></div>`;
  $("newsList").innerHTML=p.news.map((n,i)=>`<div class="news"><b>${i===0?"LATEST":"CAREER UPDATE"}</b><span>${n}</span></div>`).join("");
  $("acceptOffer")?.addEventListener("click",()=>{career.acceptOffer(offer);renderAll();show("home")});
  if(game) updateMatchUI();
}

function openCreate(){
  $("modalContent").innerHTML=`<h2>Create Your Player</h2><p class="muted">Your career is saved on this device.</p><div class="form"><label>Name</label><input id="playerName" maxlength="22" value="${career.player.name==="Rookie"?"":career.player.name}"><label>Role</label><select id="playerRole"><option>Right Hand Batter</option><option>Left Hand Batter</option><option>Batting All-Rounder</option><option>Bowling All-Rounder</option></select><button class="primary" id="savePlayer">Create Player</button></div>`;
  $("modal").classList.add("show");
  $("savePlayer").onclick=()=>{const name=$("playerName").value.trim()||"Rookie",role=$("playerRole").value;career.resetPlayer({name,role});$("modal").classList.remove("show");renderAll();show("home")};
}

/* ------------------------- 3D ENGINE ------------------------- */
function setup3D(){
  const canvas=$("gameCanvas");
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
  renderer.setSize(innerWidth,Math.max(1,innerHeight-64),false);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();scene.background=new THREE.Color(0x06150d);scene.fog=new THREE.Fog(0x06150d,34,95);
  camera=new THREE.PerspectiveCamera(47,innerWidth/Math.max(1,innerHeight-64),.1,140);
  camera.position.set(0,9.5,19);camera.lookAt(0,1,0);
  clock=new THREE.Clock();
  scene.add(new THREE.HemisphereLight(0xd8efff,0x14371f,2.0));
  const sun=new THREE.DirectionalLight(0xffffff,2.5);sun.position.set(-12,24,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
  buildStadium();
  buildTeams();
  window.addEventListener("resize",resize3D);
  renderer.setAnimationLoop(renderLoop);
}

function mat(color,rough=.75){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:.02})}
function limb(radius,length,material){return new THREE.Mesh(new THREE.CapsuleGeometry(radius,length,4,8),material)}

function makePlayer(color,skin=0xd69a78){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.28,.68,5,10),mat(color));body.position.y=1.05;body.castShadow=true;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.22,16,12),mat(skin,.8));head.position.y=1.72;head.castShadow=true;g.add(head);
  const armL=limb(.075,.48,mat(color));armL.position.set(-.35,1.18,0);armL.rotation.z=-.35;armL.name="armL";g.add(armL);
  const armR=limb(.075,.48,mat(color));armR.position.set(.35,1.18,0);armR.rotation.z=.35;armR.name="armR";g.add(armR);
  const legL=limb(.09,.55,mat(0x18212a));legL.position.set(-.15,.48,0);legL.name="legL";g.add(legL);
  const legR=limb(.09,.55,mat(0x18212a));legR.position.set(.15,.48,0);legR.name="legR";g.add(legR);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(.245,16,8,0,Math.PI*2,0,Math.PI/2),mat(color));cap.position.y=1.86;g.add(cap);
  return g;
}
function addBat(player){
  const bat=new THREE.Group();bat.name="bat";
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,.55,10),mat(0x5c3a22));handle.position.y=.25;bat.add(handle);
  const blade=new THREE.Mesh(new THREE.BoxGeometry(.18,.72,.055),mat(0xc89b5b));blade.position.y=.78;blade.rotation.z=-.04;bat.add(blade);
  bat.position.set(.34,1.0,.1);bat.rotation.z=-.5;player.add(bat);return bat;
}
function buildStadium(){
  const ground=new THREE.Mesh(new THREE.CylinderGeometry(29,29,.45,96),mat(0x1a6738));ground.scale.z=.83;ground.position.y=-.3;ground.receiveShadow=true;scene.add(ground);
  const inner=new THREE.Mesh(new THREE.CylinderGeometry(18,18,.12,96),mat(0x3f9b51));inner.scale.z=.8;scene.add(inner);
  const pitch=new THREE.Mesh(new THREE.BoxGeometry(3.35,.12,24),mat(0xb99d6a));pitch.position.y=.08;scene.add(pitch);
  const crease=mat(0xffffff,.4);
  [-9.5,9.5].forEach(z=>{const l=new THREE.Mesh(new THREE.BoxGeometry(3.9,.025,.08),crease);l.position.set(0,.16,z);scene.add(l)});
  [-1.55,1.55].forEach(x=>{const l=new THREE.Mesh(new THREE.BoxGeometry(.05,.025,24),crease);l.position.set(x,.16,0);scene.add(l)});
  const seatsMat=mat(0x273d49);
  for(let i=0;i<36;i++){const a=i/36*Math.PI*2,r=23,s=new THREE.Mesh(new THREE.BoxGeometry(1.15,.5,.85),seatsMat);s.position.set(Math.cos(a)*r,.45,Math.sin(a)*r*.82);s.lookAt(0,.45,0);scene.add(s)}
  const floodMat=mat(0xbfc9d1);
  for(const [x,z] of [[-24,-18],[24,-18],[-24,18],[24,18]]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.12,.18,10,12),floodMat);pole.position.set(x,5,z);scene.add(pole)}
}

function buildTeams(){
  // 11 visible player models: 2 batters + 9 fielders. One fielder becomes the bowler.
  clearTeamModels();
  const myColor=TEAMS[0].color, oppColor=TEAMS[2].color;
  const p1=makePlayer(myColor),p2=makePlayer(myColor);
  p1.position.set(0,0,-8.2);p2.position.set(.6,0,-9.0);p1.rotation.y=Math.PI;p2.rotation.y=Math.PI;
  addBat(p1);addBat(p2);
  scene.add(p1,p2);three.players.push(p1,p2);three.batter=p1;
  const positions=[[-10,0,-2],[10,0,-2],[-7,0,7],[7,0,7],[-13,0,5],[13,0,5],[-15,0,-8],[15,0,-8],[0,0,9]];
  positions.forEach((pos,i)=>{const f=makePlayer(oppColor);f.position.set(...pos);f.rotation.y=Math.atan2(-pos[0],-pos[2]);scene.add(f);three.players.push(f);three.fielders.push(f)});
  three.bowler=three.fielders[8];
  // Team list is the 11 visible opponent/player participants for the current phase.
  renderTeamList();
}
function clearTeamModels(){
  three.players.forEach(p=>scene?.remove(p));three.players=[];three.fielders=[];three.batter=null;three.bowler=null;
}
function renderTeamList(){
  const names=game?.phase==="bat"
    ? [career.player.name,"Non-striker",...["Rahul Verma","Karan Patel","Samar Khan","Ritwik Sen","Fielder 5","Fielder 6","Fielder 7","Fielder 8","Fielder 9"]]
    : [AI_BATTERS[game?.aiWicketOrder?.[0]||0]?.name||"AI Opener","AI Non-striker","Player Bowler","Fielder 4","Fielder 5","Fielder 6","Fielder 7","Fielder 8","Fielder 9","Fielder 10","Fielder 11"];
  $("teamPlayers").innerHTML=names.slice(0,11).map((n,i)=>`<div class="teamP ${i===0?"active":""}">${i+1}. ${n}</div>`).join("");
}

function renderLoop(){
  if(!renderer||!scene)return;
  const dt=Math.min(clock.getDelta(),.04);
  updateAnimation(dt);
  const t=clock.elapsedTime;
  three.players.forEach((p,i)=>{
    if(!p.userData.busy){
      const a=p.userData.baseY||0;
      p.rotation.z=Math.sin(t*1.4+i)*.015;
      p.position.y=a;
    }
  });
  renderer.render(scene,camera);
}
function updateAnimation(dt){
  if(!anim.active)return;
  anim.t+=dt;const q=Math.min(1,anim.t/anim.dur),e=q<.5?2*q*q:1-Math.pow(-2*q+2,2)/2;
  if(anim.type==="bowl"){
    const b=three.bowler;
    b.position.lerpVectors(anim.from,anim.to,e);
    b.rotation.x=Math.sin(q*Math.PI)*.25;
    const al=b.getObjectByName("armR"),ar=b.getObjectByName("armL");
    if(al)al.rotation.z=-.35-Math.sin(q*Math.PI)*1.8;
    if(ar)ar.rotation.z=.35+Math.sin(q*Math.PI)*1.3;
  } else if(anim.type==="shot"){
    const p=three.batter;
    const bat=p?.getObjectByName("bat");
    if(bat){bat.rotation.z=-.5- Math.sin(Math.min(1,q)*Math.PI)*1.8;bat.rotation.x=.25*Math.sin(q*Math.PI)}
    p.rotation.y=Math.PI+Math.sin(q*Math.PI)*.55;
    const al=p.getObjectByName("armL"),ar=p.getObjectByName("armR");
    if(al)al.rotation.z=-.35+Math.sin(q*Math.PI)*1.2;
    if(ar)ar.rotation.z=.35-Math.sin(q*Math.PI)*1.0;
  } else if(anim.type==="run"){
    const p=anim.player;const stride=Math.sin(q*Math.PI*4)*.65;
    p.position.lerpVectors(anim.from,anim.to,e);p.position.y=Math.abs(Math.sin(q*Math.PI*2))*.08;
    const l=p.getObjectByName("legL"),r=p.getObjectByName("legR");
    if(l)l.rotation.x=stride;if(r)r.rotation.x=-stride;
  }
  if(q>=1){anim.active=false;anim.done?.()}
}
function playAnim(type,dur,done,player=three.bowler){
  if(anim.active)return false;
  anim={active:true,t:0,dur,type,from:player.position.clone(),to:player.position.clone(),done,player};
  return true;
}

function animateShot(type,onDone){
  const p=three.batter;if(!p){onDone?.();return}
  const start=p.position.clone(),bat=p.getObjectByName("bat");
  if(bat)bat.rotation.z=-.5;
  anim={active:true,t:0,dur:.62,type:"shot",from:start,to:start,done:onDone,player:p};
}
function animateBowling(onDone){
  const b=three.bowler;if(!b){onDone?.();return}
  const from=b.position.clone(),to=new THREE.Vector3(0,0,3.7);
  anim={active:true,t:0,dur:.82,type:"bowl",from,to,done:()=>{b.position.copy(from);onDone?.()},player:b};
}
function animateRun(player,from,to,onDone){
  anim={active:true,t:0,dur:.48,type:"run",from:from.clone(),to:to.clone(),done:onDone,player};
}

function launchBall(runs,wicket){
  const old=three.ball;if(old)scene.remove(old);
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.09,12,12),mat(0x8e1821,.45));ball.position.set(0,1.45,-7.5);scene.add(ball);three.ball=ball;
  const angle=(Math.random()-.5)*1.25;
  const target=new THREE.Vector3(angle*9,Math.max(.4,1+Math.random()*3),runs>=4?(Math.random()>.5?14:-14):(-3+Math.random()*9));
  const start=ball.position.clone(),t0=performance.now(),dur=wicket?650:720;
  function step(now){const q=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-q,2);ball.position.lerpVectors(start,target,e);ball.position.y+=Math.sin(q*Math.PI)*3.0;if(q<1)requestAnimationFrame(step);else{scene.remove(ball);if(three.ball===ball)three.ball=null}}
  requestAnimationFrame(step);
}

function startMatch(){
  lastMatchStart=Date.now();$("matchResult").classList.remove("show");
  const opponent=TEAMS[1+Math.floor(Math.random()*3)];
  const bowl=AI_BOWLERS[Math.floor(Math.random()*AI_BOWLERS.length)];
  game={
    innings:1,phase:"bat",balls:0,runs:0,wickets:0,playerRuns:0,playerBalls:0,
    fours:0,sixes:0,bowlWickets:0,catches:0,target:null,opponent,
    aiScore:0,aiWickets:0,aiBalls:0,aiBatterIndex:0,aiNonStriker:1,aiWicketOrder:[...Array(11).keys()],
    aiBatter:AI_BATTERS[0],aiNon:AI_BATTERS[1],aiBowler:bowl,
    overRuns:0,matchStart:Date.now()
  };
  if(!renderer)setup3D(); else buildTeams();
  setPhaseText("Your team bats first. Attack smartly — every shot has a different risk.");
  updateMatchUI();renderTeamList();
}

function setPhaseText(text){$("commentary").textContent=text}
function overString(balls){return `${Math.floor(balls/6)}.${balls%6}`}
function rr(runs,balls){return balls? (runs/(balls/6)).toFixed(2):"0.00"}

function updateMatchUI(){
  if(!game)return;
  const isBat=game.phase==="bat";
  $("score").textContent=`${game.runs}/${game.wickets}`;
  $("overs").textContent=`${overString(game.balls)} ov`;
  $("runRate").textContent=`RR ${rr(game.runs,game.balls)}`;
  $("batTeam").textContent=isBat?career.player.team.toUpperCase():game.opponent.name.toUpperCase();
  $("inningsLabel").textContent=isBat?"1ST INNINGS":"2ND INNINGS";
  $("target").textContent=isBat?"YOU BAT FIRST • T20":`TARGET ${game.target} • NEED ${Math.max(0,game.target-game.runs)}`;
  $("matchPhase").textContent=isBat?"BATTING":"BOWLING";
  $("shotPanel").style.display=isBat?"block":"none";$("bowlPanel").style.display=isBat?"none":"block";
  $("strikerName").textContent=isBat?career.player.name:game.aiBatter.name;
  $("strikerMini").textContent=isBat?`${game.playerRuns}* (${game.playerBalls})`:`${game.aiBatter.role}`;
  $("aiName").textContent=isBat?game.aiBatter.name:game.aiNon.name;
  $("aiMini").textContent=isBat?"AI bowler & field":"AI non-striker";
  $("bowlerName").textContent=isBat?game.aiBowler.name:career.player.name;
  $("bowlerMini").textContent=isBat?"AI BOWLER":"YOUR BOWLING";
  $("miniScore").textContent=isBat?`${career.player.name} ${game.playerRuns}* • ${game.playerBalls} balls`:`AI ${game.aiScore}/${game.aiWickets} • ${overString(game.aiBalls)} ov`;
  $("matchClock").textContent=`${String(Math.floor((Date.now()-game.matchStart)/60000)).padStart(2,"0")}:${String(Math.floor((Date.now()-game.matchStart)/1000)%60).padStart(2,"0")}`;
}

function animateIndicator(wicket=false){
  const el=$("ballIndicator");el.classList.remove("animate","wicket");void el.offsetWidth;el.classList.add("animate");if(wicket)el.classList.add("wicket");
}

function battingShot(type){
  if(!game||game.phase!=="bat"||anim.active)return;
  const p=career.player,s=SHOTS[type];
  game.playerBalls++;game.balls++;
  const timing=(p.skills.batting*.45+p.skills.mental*.2+p.skills.fitness*.1+p.form*.25);
  const bowQuality=(game.aiBowler.accuracy*.45+game.aiBowler.pace*.25+game.aiBowler.variation*.15+game.opponent.strength*.15);
  const pressure=Math.min(.16,game.wickets*.012+(game.balls/120)*.04);
  const risk=Math.max(.008,s.risk*(1.18-timing/115)+Math.max(0,bowQuality-65)/1000+pressure);
  const contact=Math.min(.98,(timing/100)*s.timing+.05);
  const decision=Math.random();
  const wicket=decision<risk;
  animateShot(type,()=>{launchBall(0,wicket);animateIndicator(wicket);});
  if(wicket){
    game.wickets++;
    setPhaseText(`${s.desc} — outside edge! WICKET. You must rebuild.`);
  }else{
    let r=Math.random(), quality=(timing/100)*.58+(p.skills.power/100)*.27+(s.timing)*.15;
    let outcome;
    if(type==="defend") outcome=r<.76?0:r<.96?1:2;
    else if(type==="drive") outcome=r<.20?0:r<.57?1:r<.79?2:r<.96?4:6;
    else if(type==="cut") outcome=r<.18?0:r<.50?1:r<.72?2:r<.94?4:6;
    else if(type==="pull") outcome=r<.14?0:r<.42?1:r<.65?2:r<.88?4:6;
    else outcome=r<.10?0:r<.31?1:r<.51?2:r<.76?4:6;
    if(Math.random()<Math.max(0,quality-.72)*.8) outcome=Math.min(6,outcome+1);
    game.runs+=outcome;game.playerRuns+=outcome;
    if(outcome===4)game.fours++;if(outcome===6)game.sixes++;
    setPhaseText(`${s.desc} ${outcome===0?"Dot ball.":outcome===4?"FOUR!":outcome===6?"SIX!":`${outcome} run${outcome>1?"s":""}.`}`);
  }
  afterPlayerBall();
}

function afterPlayerBall(){
  updateMatchUI();
  if(game.wickets>=10||game.balls>=120){beginAIMatch();return}
  // Small cinematic reset for the next ball.
  $("aiDecision").textContent=`AI bowler: ${game.aiBowler.name} • field set for the next delivery`;
}

function beginAIMatch(){
  game.target=game.runs+1;game.innings=2;game.phase="bowl";
  game.aiScore=0;game.aiWickets=0;game.aiBalls=0;game.aiBatterIndex=0;game.aiNonStriker=1;game.aiBatter=AI_BATTERS[0];game.aiNon=AI_BATTERS[1];
  clearTeamModels();buildTeams();
  // Reposition visible 11 for AI batting: two bats at the far end and player bowler/8 fielders.
  if(three.players.length>=11){
    three.players[0].position.set(0,0,-8.2);three.players[1].position.set(.6,0,-9.0);
    three.batter=three.players[0];three.bowler=three.players[10];
    const pos=[[-10,0,-2],[10,0,-2],[-7,0,7],[7,0,7],[-13,0,5],[13,0,5],[-15,0,-8],[15,0,-8],[0,0,8.5]];
    three.fielders.forEach((f,i)=>f.position.set(...pos[i]));
  }
  setPhaseText(`Target ${game.target}. AI will choose shots from the situation; you control every delivery.`);
  $("aiDecision").textContent="AI is calculating required run rate, wickets and batter confidence…";
  updateMatchUI();renderTeamList();
}

function chooseAIShot(){
  const b=game.aiBatter;
  const need=Math.max(0,game.target-game.aiScore),ballsLeft=Math.max(1,120-game.aiBalls);
  const required=need/(ballsLeft/6);
  const base=(b.bat*.48+b.power*.22+b.mental*.18+b.form*.12);
  let shot="defend";
  if(required>12)shot=Math.random()<.62?"loft":Math.random()<.7?"pull":"drive";
  else if(required>9)shot=Math.random()<.45?"loft":Math.random()<.6?"pull":"drive";
  else if(required>7)shot=Math.random()<.3?"loft":Math.random()<.5?"drive":"cut";
  else if(required<5)shot=Math.random()<.52?"defend":Math.random()<.7?"drive":"cut";
  else shot=Math.random()<.38?"drive":Math.random()<.68?"cut":"pull";
  // High composure makes AI more likely to take the lower-risk option in a pressure chase.
  if(game.aiWickets>=6 && b.mental>70 && required<8)shot="drive";
  if(base<52 && required>10 && Math.random()<.35)shot="defend";
  return shot;
}

function bowling(type){
  if(!game||game.phase!=="bowl"||anim.active)return;
  game.aiBalls++;
  const b=game.aiBatter,delivery=BOWLS[type];
  const required=Math.max(0,game.target-game.aiScore)/(Math.max(1,120-game.aiBalls)/6);
  const batterAttack=(b.power*.45+b.bat*.4+b.form*.15)/100;
  const bowStrength=(career.player.skills.bowling*.42+career.player.skills.mental*.22+career.player.skills.fitness*.18+career.player.skills.fielding*.18)/100;
  let wicketChance=delivery.wicket*(.7+bowStrength*.65);
  if(type==="yorker" && b.bat<65)wicketChance+=.025;
  if(type==="bouncer" && b.power>72)wicketChance-=.015;
  if(required>10)wicketChance+=.01;
  const isWicket=Math.random()<Math.min(.30,wicketChance);
  animateBowling(()=>{launchBall(0,isWicket);animateIndicator(isWicket);});
  if(isWicket){
    game.aiWickets++;
    setPhaseText(`${delivery.desc} OUT! ${b.name} is beaten by your bowling.`);
    advanceAIWicket();
  }else{
    const pressure=delivery.pressure*bowStrength;
    const r=Math.random();
    let runs;
    if(type==="yorker")runs=r<.55?0:r<.80?1:r<.94?2:r<.985?4:6;
    else if(type==="length")runs=r<.40?0:r<.70?1:r<.88?2:r<.98?4:6;
    else if(type==="bouncer")runs=r<.28?0:r<.54?1:r<.72?2:r<.94?4:6;
    else runs=r<.46?0:r<.70?1:r<.87?2:r<.97?4:6;
    if(Math.random()<pressure*.08)runs=Math.max(0,runs-1);
    game.aiScore+=runs;
    const decision=chooseAIShot();
    $("aiDecision").textContent=`AI chose ${decision.toUpperCase()} — required RR ${required.toFixed(2)} • batter ${b.name}`;
    setPhaseText(`${b.name}: ${decision} attempt. ${runs===0?"Dot ball.":`${runs} run${runs>1?"s":""}.`}`);
  }
  if(game.aiScore>=game.target||game.aiBalls>=120||game.aiWickets>=10)finishMatch();
  else updateMatchUI();
}

function advanceAIWicket(){
  if(game.aiWickets>=10)return;
  game.aiBatterIndex=game.aiWicketOrder[game.aiWickets];
  game.aiBatter=AI_BATTERS[game.aiBatterIndex]||AI_BATTERS[10];
  // Keep a sensible non-striker from the next available batter.
  const ni=Math.min(10,game.aiBatterIndex+1);game.aiNon=AI_BATTERS[ni]||AI_BATTERS[1];
  $("aiDecision").textContent=`New batter ${game.aiBatter.name} walks in. AI adjusts its plan.`;
  updateMatchUI();
}

function finishMatch(){
  if(!game||game.finished)return;
  game.finished=true;
  const win=game.aiScore<game.target;
  const result={
    win,runs:game.playerRuns,balls:game.playerBalls,wickets:game.aiWickets,
    catches:game.catches,sixes:game.sixes,fours:game.fours,opponent:game.opponent.name
  };
  career.applyMatch(result);renderAll();
  $("resultIcon").textContent=win?"🏆":"💪";
  $("resultTitle").textContent=win?"MATCH WON!":"MATCH LOST";
  $("resultText").textContent=win
   ?`${career.player.name}'s team defended ${game.target-1} against ${game.opponent.name}.`
   :`${game.opponent.name} chased ${game.target} with ${Math.max(0,120-game.aiBalls)} balls remaining.`;
  $("resultStats").innerHTML=[
    ["Your runs",game.playerRuns],["Team score",game.target-1],["AI score",game.aiScore],
    ["AI wkts",game.aiWickets],["Balls",game.playerBalls],["Fours/Sixes",`${game.fours}/${game.sixes}`]
  ].slice(0,3).map(x=>`<div class="resultStat"><small>${x[0]}</small><b>${x[1]}</b></div>`).join("");
  $("matchResult").classList.add("show");
}

document.addEventListener("click",e=>{
  const action=e.target.closest("[data-action]")?.dataset.action;
  if(action==="home")show("home");else if(action==="profile")show("profile");else if(action==="match")show("match");
  else if(action==="training")show("training");else if(action==="stats")show("stats");else if(action==="contract")show("contract");
  else if(action==="news")show("news");else if(action==="create")openCreate();
  const train=e.target.closest("[data-train]")?.dataset.train;
  if(train){const r=career.train(train);renderAll();alert(r.msg)}
  const shot=e.target.closest("[data-shot]")?.dataset.shot;if(shot)battingShot(shot);
  const bowl=e.target.closest("[data-bowl]")?.dataset.bowl;if(bowl)bowling(bowl);
});
$("modalClose").onclick=()=>$("modal").classList.remove("show");
let progress=0;const timer=setInterval(()=>{progress+=10;$("loadProgress").style.width=Math.min(progress,100)+"%";if(progress>=100){clearInterval(timer);setTimeout(()=>$("loading").classList.add("hide"),220)}},70);
setInterval(()=>{if(game&&document.getElementById("match").classList.contains("active"))updateMatchUI()},1000);
renderAll();
