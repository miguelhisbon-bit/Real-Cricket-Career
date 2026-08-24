import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {Career,fmt} from "./career.js";
import {TEAMS,SHOTS,BOWLS,AI_BATTERS,AI_BOWLERS} from "./data.js";

const career=new Career(), $=id=>document.getElementById(id);
const screens=[...document.querySelectorAll(".screen")];
let scene,camera,renderer,clock,animId;
let game=null, three={players:[],ball:null,batter:null,bowler:null,stumps:null,fielders:[]};
let anim={active:false,t:0,dur:0,type:"",from:null,to:null,done:null};
let lastMatchStart=0, cameraMode=0, cameraTween=null;

function show(id){
  screens.forEach(s=>s.classList.toggle("active",s.id===id));
  if(id==="match"){
    if(!game || game.finished || Date.now()-lastMatchStart>120000) startMatch();
    if(renderer) renderer.setAnimationLoop(renderLoop);
    setTimeout(()=>resize3D(),30);
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));
  renderer.setSize(innerWidth,Math.max(1,innerHeight-66),false);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x07131a);
  scene.fog=new THREE.FogExp2(0x07131a,.012);
  camera=new THREE.PerspectiveCamera(50,innerWidth/Math.max(1,innerHeight-66),.05,150);
  camera.position.set(0,8.7,18);
  camera.lookAt(0,.8,0);
  clock=new THREE.Clock();

  scene.add(new THREE.HemisphereLight(0xbfeaff,0x102f1c,2.4));
  const sun=new THREE.DirectionalLight(0xffffff,3.1);
  sun.position.set(-16,28,12);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);
  sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;
  scene.add(sun);
  const rim=new THREE.DirectionalLight(0x6fc8ff,1.0);rim.position.set(18,12,-22);scene.add(rim);

  buildStadium();
  buildTeams();
  window.addEventListener("resize",resize3D);
  renderer.setAnimationLoop(renderLoop);
}
function mat(color,rough=.75){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:.02})}
function limb(radius,length,material){return new THREE.Mesh(new THREE.CapsuleGeometry(radius,length,4,8),material)}

function makePlayer(color,skin=0xd69a78){
  const g=new THREE.Group(); g.userData.baseY=0;
  const jersey=mat(color,.68), skinMat=mat(skin,.82), dark=mat(0x101820,.82), shoe=mat(0xeeeeee,.45);

  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.30,.68,6,12),jersey);
  torso.position.y=1.08;torso.castShadow=true;g.add(torso);

  const head=new THREE.Mesh(new THREE.SphereGeometry(.235,20,16),skinMat);
  head.position.y=1.78;head.castShadow=true;g.add(head);

  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.09,.105,.15,10),skinMat);
  neck.position.y=1.53;g.add(neck);

  const armL=limb(.078,.5,jersey);armL.position.set(-.36,1.19,0);armL.rotation.z=-.35;armL.name="armL";g.add(armL);
  const armR=limb(.078,.5,jersey);armR.position.set(.36,1.19,0);armR.rotation.z=.35;armR.name="armR";g.add(armR);

  const legL=limb(.10,.58,dark);legL.position.set(-.15,.47,0);legL.name="legL";g.add(legL);
  const legR=limb(.10,.58,dark);legR.position.set(.15,.47,0);legR.name="legR";g.add(legR);

  const shoeL=new THREE.Mesh(new THREE.BoxGeometry(.19,.10,.36),shoe);shoeL.position.set(-.16,.12,.05);g.add(shoeL);
  const shoeR=new THREE.Mesh(new THREE.BoxGeometry(.19,.10,.36),shoe);shoeR.position.set(.16,.12,.05);g.add(shoeR);

  const cap=new THREE.Mesh(new THREE.SphereGeometry(.255,20,10,0,Math.PI*2,0,Math.PI/2),jersey);
  cap.position.y=1.94;g.add(cap);
  const brim=new THREE.Mesh(new THREE.BoxGeometry(.30,.035,.13),jersey);brim.position.set(0,1.91,.18);g.add(brim);

  const number=new THREE.Mesh(new THREE.PlaneGeometry(.22,.22),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.8}));
  number.position.set(0,1.15,-.31);number.rotation.y=Math.PI;g.add(number);
  return g;
}
function addBat(player){
  const bat=new THREE.Group();bat.name="bat";
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,.55,10),mat(0x5c3a22));handle.position.y=.25;bat.add(handle);
  const blade=new THREE.Mesh(new THREE.BoxGeometry(.18,.72,.055),mat(0xc89b5b));blade.position.y=.78;blade.rotation.z=-.04;bat.add(blade);
  bat.position.set(.34,1.0,.1);bat.rotation.z=-.5;player.add(bat);return bat;
}
function buildStadium(){
  const grassMat=mat(0x176b3a,.9), stripeMat=mat(0x1c7540,.9), pitchMat=mat(0xb59a69,.95), white=mat(0xf3f0dc,.35);
  const ground=new THREE.Mesh(new THREE.CylinderGeometry(31,31,.5,128),grassMat);
  ground.scale.z=.84;ground.position.y=-.3;ground.receiveShadow=true;scene.add(ground);

  // Mowed grass stripes
  for(let i=-14;i<=14;i++){
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.0,.012,48),stripeMat);
    stripe.position.set(i*2.0,.0,0);stripe.scale.z=.82;scene.add(stripe);
  }

  const inner=new THREE.Mesh(new THREE.CylinderGeometry(20.5,20.5,.08,128),mat(0x2d8a48,.95));
  inner.scale.z=.82;inner.position.y=.02;scene.add(inner);

  // Boundary rope
  const rope=new THREE.Mesh(new THREE.TorusGeometry(24.5,.055,8,128),mat(0xf7f7e9,.4));
  rope.rotation.x=Math.PI/2;rope.scale.y=.82;rope.position.y=.18;scene.add(rope);

  // Realistic rectangular pitch
  const pitch=new THREE.Mesh(new THREE.BoxGeometry(3.66,.13,20.12),pitchMat);
  pitch.position.y=.10;scene.add(pitch);
  const pitchTop=new THREE.Mesh(new THREE.BoxGeometry(3.35,.02,20.0),mat(0xc2aa79,.95));
  pitchTop.position.y=.18;scene.add(pitchTop);

  // Creases + popping creases
  [-9.75,9.75].forEach(z=>{
    for(const x of [-1.55,1.55]){
      const l=new THREE.Mesh(new THREE.BoxGeometry(.055,.025,3.3),white);l.position.set(x,.22,z);scene.add(l);
    }
    const pop=new THREE.Mesh(new THREE.BoxGeometry(3.9,.025,.06),white);pop.position.set(0,.22,z);scene.add(pop);
  });

  // Stumps at both ends
  const makeWicket=(z)=>{
    const wg=new THREE.Group();
    for(const x of [-.13,0,.13]){
      const stump=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.72,10),mat(0xf3e8bd,.45));
      stump.position.set(x,.52,z);wg.add(stump);
    }
    for(const x of [-.065,.065]){
      const bail=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.19,8),mat(0xf3e8bd,.45));
      bail.rotation.z=Math.PI/2;bail.position.set(x,.88,z);wg.add(bail);
    }
    scene.add(wg);
  };
  makeWicket(-10);makeWicket(10);

  // Stands + floodlights
  const standMat=mat(0x273e4b,.9);
  for(let i=0;i<44;i++){
    const a=i/44*Math.PI*2,r=27;
    const s=new THREE.Mesh(new THREE.BoxGeometry(1.2,.55,.9),standMat);
    s.position.set(Math.cos(a)*r,.42,Math.sin(a)*r*.82);s.lookAt(0,.42,0);scene.add(s);
  }
  const floodMat=mat(0xbfcbd2,.45);
  for(const [x,z] of [[-25,-20],[25,-20],[-25,20],[25,20]]){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.11,.18,12,12),floodMat);
    pole.position.set(x,6,z);pole.castShadow=true;scene.add(pole);
    const lamp=new THREE.PointLight(0xffffff,1.8,28);lamp.position.set(x,12,z);scene.add(lamp);
  }

  // Sky lights / distant scoreboard
  const board=new THREE.Mesh(new THREE.BoxGeometry(10,2.4,.3),mat(0x07151d,.35));
  board.position.set(0,7,-28);scene.add(board);
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
  updateCamera(dt);
  const t=clock.elapsedTime;
  three.players.forEach((p,i)=>{
    if(!p.userData.busy){
      p.position.y=p.userData.baseY||0;
      const legL=p.getObjectByName("legL"),legR=p.getObjectByName("legR");
      if(!anim.active){p.rotation.z=Math.sin(t*1.5+i)*.01}
      if(legL&&legR&&!anim.active){legL.rotation.x=Math.sin(t*1.5+i)*.035;legR.rotation.x=-Math.sin(t*1.5+i)*.035}
    }
  });
  renderer.render(scene,camera);
}
function updateCamera(dt){
  if(!camera||!cameraTween)return;
  cameraTween.t=Math.min(1,cameraTween.t+dt/cameraTween.dur);
  const q=cameraTween.t<.5?2*cameraTween.t*cameraTween.t:1-Math.pow(-2*cameraTween.t+2,2)/2;
  camera.position.lerpVectors(cameraTween.from,q?cameraTween.to:cameraTween.from,q);
  const look=cameraTween.look||new THREE.Vector3(0,.8,0);
  camera.lookAt(look);
  if(cameraTween.t>=1)cameraTween=null;
}
function cinematicCamera(mode){
  if(!camera)return;
  cameraMode=mode%3;
  const targets=[
    {pos:new THREE.Vector3(0,7.7,16),look:new THREE.Vector3(0,1,-1)},
    {pos:new THREE.Vector3(10,5.2,12),look:new THREE.Vector3(0,1,0)},
    {pos:new THREE.Vector3(-11,6.2,7),look:new THREE.Vector3(0,1,-1)}
  ];
  cameraTween={from:camera.position.clone(),to:targets[cameraMode].pos,look:targets[cameraMode].look,dur:.55,t:0};
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

function launchBall(runs,wicket,shotType="drive"){
  const old=three.ball;if(old)scene.remove(old);
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.095,16,12),mat(0x9d1726,.42));
  ball.position.set(0,1.25,-9.0);scene.add(ball);three.ball=ball;
  const dir=(Math.random()-.5)*1.2;
  const distance=runs>=6?18:runs>=4?15:runs>=2?7:4;
  const target=new THREE.Vector3(dir*distance*.55,.25,distance*(Math.random()>.5?1:-1));
  const startPos=ball.position.clone(),t0=performance.now(),dur=wicket?700:(runs>=4?1050:820);
  cinematicCamera(runs>=4?1:2);
  function step(now){
    const q=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-q,2);
    ball.position.lerpVectors(startPos,target,e);
    const arc=(wicket?.9:1.8+Math.min(2.2,runs*.35))*Math.sin(q*Math.PI);
    ball.position.y=.22+arc;
    ball.rotation.x+=.22;ball.rotation.z+=.18;
    if(q<1)requestAnimationFrame(step);
    else{
      scene.remove(ball);if(three.ball===ball)three.ball=null;
      cinematicCamera(0);
    }
  }
  requestAnimationFrame(step);
}
function startMatch(){
  lastMatchStart=Date.now();$("matchResult").classList.remove("show");
  const opponent=TEAMS[1+Math.floor(Math.random()*3)];
  const bowl=AI_BOWLERS[Math.floor(Math.random()*AI_BOWLERS.length)];
  game={
    innings:1,phase:"bat",balls:0,runs:0,wickets:0,playerRuns:0,playerBalls:0,
    teammateRuns:0,teammateBalls:0,fours:0,sixes:0,bowlWickets:0,catches:0,target:null,opponent,
    userStriker:true,teammateName:"Academy Opener",teammateOut:false,overNumber:0,ballInOver:0,
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
  const userOnStrike=isBat?game.userStriker:true;
  $("strikerName").textContent=isBat?(userOnStrike?career.player.name:game.teammateName):game.aiBatter.name;
  $("strikerMini").textContent=isBat?(userOnStrike?`${game.playerRuns}* (${game.playerBalls})`:`${game.teammateRuns} (${game.teammateBalls})`):`${game.aiBatter.role}`;
  $("aiName").textContent=isBat?(userOnStrike?game.teammateName:career.player.name):game.aiNon.name;
  $("aiMini").textContent=isBat?"AI bowler & field":"AI non-striker";
  $("bowlerName").textContent=isBat?game.aiBowler.name:career.player.name;
  $("bowlerMini").textContent=isBat?"AI BOWLER":"YOUR BOWLING";
  $("miniScore").textContent=isBat?`${career.player.name} ${game.playerRuns}* • ${game.playerBalls} balls • ${game.ballInOver}/6`:`AI ${game.aiScore}/${game.aiWickets} • ${overString(game.aiBalls)} ov`;
  $("strikeStatus").textContent=isBat?(game.userStriker?"⚡ YOU ARE ON STRIKE":"🤖 TEAMMATE IS ON STRIKE"):"🎯 YOU ARE BOWLING";
  $("deliveryText").textContent=isBat?`OVER ${game.overNumber+1} • BALL ${game.ballInOver+1}`:`OVER ${Math.floor(game.aiBalls/6)+1} • BALL ${game.aiBalls%6+1}`;
  $("fieldText").textContent=isBat?(game.wickets>=6?"FIELD: AGGRESSIVE":"FIELD: BALANCED"):"FIELD: AI CHASE";
  $("shotPanel").style.opacity=isBat&&game.userStriker?"1":".72";
  $("matchClock").textContent=`${String(Math.floor((Date.now()-game.matchStart)/60000)).padStart(2,"0")}:${String(Math.floor((Date.now()-game.matchStart)/1000)%60).padStart(2,"0")}`;
}

function animateIndicator(wicket=false){
  const el=$("ballIndicator");el.classList.remove("animate","wicket");void el.offsetWidth;el.classList.add("animate");if(wicket)el.classList.add("wicket");
}

function battingShot(type){
  if(!game||game.phase!=="bat"||anim.active||!game.userStriker)return;
  const p=career.player,s=SHOTS[type];
  game.playerBalls++;game.balls++;game.ballInOver++;
  const timing=(p.skills.batting*.45+p.skills.mental*.2+p.skills.fitness*.1+p.form*.25);
  const bowQuality=(game.aiBowler.accuracy*.45+game.aiBowler.pace*.25+game.aiBowler.variation*.15+game.opponent.strength*.15);
  const pressure=Math.min(.16,game.wickets*.012+(game.balls/120)*.04);
  const risk=Math.max(.008,s.risk*(1.18-timing/115)+Math.max(0,bowQuality-65)/1000+pressure);
  const wicket=Math.random()<risk;
  $("shotFeedback").textContent=`TIMING • ${type.toUpperCase()}`;
  $("shotFeedback").classList.add("show");setTimeout(()=>$("shotFeedback").classList.remove("show"),500);
  animateShot(type,()=>{launchBall(0,wicket,type);animateIndicator(wicket);});
  if(wicket){
    game.wickets++;game.userStriker=true;
    setPhaseText(`${s.desc} — outside edge! WICKET. Your player is out.`);
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
    if(outcome===1||outcome===3||outcome===5)game.userStriker=false;
    setPhaseText(`${s.desc} ${outcome===0?"Dot ball.":outcome===4?"FOUR!":outcome===6?"SIX!":`${outcome} run${outcome>1?"s":""}.`} ${game.userStriker?"You keep strike.":"Strike changes — teammate faces next ball."}`);
  }
  afterPlayerBall();
}

function teammateBall(){
  if(!game||game.phase!=="bat"||game.userStriker||anim.active)return;
  game.teammateBalls++;game.balls++;game.ballInOver++;
  const skill=58+Math.random()*24;
  const wicket=Math.random()<Math.max(.025,.105-(skill/1000));
  const r=Math.random();
  let outcome=wicket?0:(r<.50?0:r<.70?1:r<.86?2:r<.96?4:6);
  animateShot("drive",()=>{launchBall(outcome,wicket,"drive");animateIndicator(wicket);});
  if(wicket){
    game.wickets++;
    setPhaseText(`${game.teammateName} edges behind — WICKET. New batter joins you.`);
    game.userStriker=true;
  }else{
    game.runs+=outcome;game.teammateRuns+=outcome;
    if(outcome===1||outcome===3||outcome===5)game.userStriker=true;
    setPhaseText(`${game.teammateName}: ${outcome===0?"dot ball.":outcome===4?"FOUR!":outcome===6?"SIX!":outcome+" run"+(outcome>1?"s":"")+". "} ${game.userStriker?"You are back on strike.":"Teammate keeps strike."}`);
  }
  afterPlayerBall();
}

function afterPlayerBall(){
  updateMatchUI();
  if(game.wickets>=10||game.balls>=120){beginAIMatch();return}

  // End of over: strike swaps automatically, exactly like real cricket.
  if(game.ballInOver>=6){
    game.ballInOver=0;game.overNumber++;
    game.userStriker=!game.userStriker;
    setPhaseText(`OVER COMPLETE • Strike changes for the new over. ${game.userStriker?"You are back on strike.":"Teammate will face first."}`);
    updateMatchUI();
    setTimeout(()=>{ if(game&&game.phase==="bat"&&!game.finished&&!game.userStriker)teammateBall(); },700);
    return;
  }

  $("aiDecision").textContent=`AI bowler: ${game.aiBowler.name} • field set • ${game.userStriker?"your strike":"teammate strike"}`;
  updateMatchUI();

  if(!game.userStriker){
    setTimeout(()=>{if(game&&game.phase==="bat"&&!game.finished)teammateBall()},650);
  }
}
function beginAIMatch(){
  game.target=game.runs+1;game.innings=2;game.phase="bowl";
  game.userStriker=true;game.ballInOver=0;game.overNumber=0;
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
  const aiShot=chooseAIShot();
  animateBowling(()=>{launchBall(isWicket?0:(Math.random()<.5?1:Math.random()<.78?2:Math.random()<.94?4:6),isWicket,aiShot);animateIndicator(isWicket);});
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
$("cameraBtn")?.addEventListener("click",()=>cinematicCamera(cameraMode+1));
let progress=0;const timer=setInterval(()=>{progress+=10;$("loadProgress").style.width=Math.min(progress,100)+"%";if(progress>=100){clearInterval(timer);setTimeout(()=>$("loading").classList.add("hide"),220)}},70);
setInterval(()=>{if(game&&document.getElementById("match").classList.contains("active"))updateMatchUI()},1000);
renderAll();
