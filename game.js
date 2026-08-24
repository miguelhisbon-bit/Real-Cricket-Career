import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {Career,fmt} from "./career.js";
import {TEAMS,SHOTS,BOWLS} from "./data.js";

const career=new Career();
const $=id=>document.getElementById(id);
const screens=[...document.querySelectorAll(".screen")];
let scene,camera,renderer,clock,animId;
let ball,batter,bowler,fielders=[];
let game=null;

function show(id){
  screens.forEach(s=>s.classList.toggle("active",s.id===id));
  if(id==="match") startMatch(); else stop3D();
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
  $("quickStats").innerHTML=[
    ["Runs",p.stats.runs],["Matches",p.stats.matches],["Best",p.stats.highScore],["Form",Math.round(p.form)]
  ].map(x=>`<div class="quickStat"><small>${x[0]}</small><b>${fmt(x[1])}</b></div>`).join("");
  $("journeyStage").textContent=p.team.toUpperCase();
  const milestones=[
    ["Academy debut",p.stats.matches>=1],
    ["First 50",p.stats.fifties>=1],
    ["First 100",p.stats.hundreds>=1],
    ["Professional contract",p.contract!=="Academy Scholarship"],
    ["Career level 5",p.level>=5]
  ];
  $("journey").innerHTML=milestones.map(([t,done])=>`<div class="journeyItem"><span class="journeyDot" style="opacity:${done?1:.3}"></span><span>${t}</span><b class="${done?"":"muted"}">${done?"✓":"LOCKED"}</b></div>`).join("");
  const offer=career.createOffer();
  $("contractPanel").innerHTML=p.contract==="Academy Scholarship"
    ?`<h3>Next opportunity</h3><p class="muted">Your current level is ${p.level}. A strong run of matches can unlock a professional deal.</p><div class="row"><span>Offer</span><b>${offer.team}</b></div><div class="row"><span>Role</span><b>${offer.role}</b></div><div class="row"><span>Signing bonus</span><b>₹ ${fmt(offer.money)}</b></div><button class="primary" id="acceptOffer">Accept offer</button>`
    :`<h3>Professional Contract</h3><p class="muted">You are contracted to ${p.team} as ${p.role}.</p><div class="row"><span>Status</span><b class="tag">ACTIVE</b></div>`;
  $("newsList").innerHTML=p.news.map((n,i)=>`<div class="news"><b>${i===0?"LATEST":"CAREER UPDATE"}</b><span>${n}</span></div>`).join("");
  $("acceptOffer")?.addEventListener("click",()=>{career.acceptOffer(offer);renderAll();show("home")});
}
function openCreate(){
  $("modalContent").innerHTML=`<h2>Create Your Player</h2><p class="muted">This will save automatically on this device.</p><div class="form"><label>Name</label><input id="playerName" maxlength="22" value="${career.player.name==="Rookie"?"":career.player.name}"><label>Role</label><select id="playerRole"><option>Right Hand Batter</option><option>Left Hand Batter</option><option>Batting All-Rounder</option><option>Bowling All-Rounder</option></select><button class="primary" id="savePlayer">Create Player</button></div>`;
  $("modal").classList.add("show");
  $("savePlayer").onclick=()=>{
    const name=$("playerName").value.trim()||"Rookie";const role=$("playerRole").value;
    career.resetPlayer({name,role});$("modal").classList.remove("show");renderAll();show("home");
  };
}
function setup3D(){
  const canvas=$("gameCanvas");
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setSize(innerWidth,innerHeight-64,false);
  renderer.shadowMap.enabled=true;
  scene=new THREE.Scene();scene.background=new THREE.Color(0x07170e);
  scene.fog=new THREE.Fog(0x07170e,28,80);
  camera=new THREE.PerspectiveCamera(50,innerWidth/(innerHeight-64),.1,150);
  camera.position.set(0,8,18);camera.lookAt(0,0,0);
  clock=new THREE.Clock();
  const hemi=new THREE.HemisphereLight(0xc9e9ff,0x17351f,2.1);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffffff,2.6);sun.position.set(12,20,8);sun.castShadow=true;scene.add(sun);
  makeStadium();
  animate();
}
function makeStadium(){
  const ground=new THREE.Mesh(new THREE.CylinderGeometry(27,27,.5,96),new THREE.MeshStandardMaterial({color:0x1c6a3b,roughness:.9}));
  ground.position.y=-.3;ground.scale.z=.82;ground.receiveShadow=true;scene.add(ground);
  const inner=new THREE.Mesh(new THREE.CylinderGeometry(17,17,.12,96),new THREE.MeshStandardMaterial({color:0x3f9b51,roughness:1}));
  inner.position.y=.0;inner.scale.z=.8;scene.add(inner);
  const pitchMesh=new THREE.Mesh(new THREE.BoxGeometry(3.4,.12,24),new THREE.MeshStandardMaterial({color:0xb89b68,roughness:1}));
  pitchMesh.position.y=.08;scene.add(pitchMesh);
  const lineMat=new THREE.MeshBasicMaterial({color:0xffffff});
  [-9.5,9.5].forEach(z=>{const l=new THREE.Mesh(new THREE.BoxGeometry(3.8,.03,.08),lineMat);l.position.set(0,.16,z);scene.add(l)});
  [-1.55,1.55].forEach(x=>{const l=new THREE.Mesh(new THREE.BoxGeometry(.05,.03,24),lineMat);l.position.set(x,.16,0);scene.add(l)});
  const stumpsMat=new THREE.MeshStandardMaterial({color:0xe7dfc9});
  [-.22,0,.22].forEach(x=>{const s=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.9,10),stumpsMat);s.position.set(x,.52,-9.2);scene.add(s)});
  batter=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.9,5,10),new THREE.MeshStandardMaterial({color:0x1762a0}));
  batter.position.set(0,1,-8.2);batter.castShadow=true;scene.add(batter);
  bowler=new THREE.Mesh(new THREE.CapsuleGeometry(.32,.9,5,10),new THREE.MeshStandardMaterial({color:0xe85d55}));
  bowler.position.set(0,1,8.5);bowler.castShadow=true;scene.add(bowler);
  fielders=[];
  const positions=[[-10,1,-2],[10,1,-2],[-7,1,7],[7,1,7],[-13,1,5],[13,1,5],[-15,1,-9],[15,1,-9]];
  positions.forEach(pos=>{const f=new THREE.Mesh(new THREE.CapsuleGeometry(.25,.7,4,8),new THREE.MeshStandardMaterial({color:0xf0b53b}));f.position.set(...pos);f.castShadow=true;scene.add(f);fielders.push(f)});
  for(let i=0;i<28;i++){const a=i/28*Math.PI*2;const r=22;const seat=new THREE.Mesh(new THREE.BoxGeometry(1.1,.5,1),new THREE.MeshStandardMaterial({color:i%2?0x263e4c:0x314e5b}));seat.position.set(Math.cos(a)*r,.5,Math.sin(a)*r*.82);seat.lookAt(0,.5,0);scene.add(seat)}
}
function animate(){animId=requestAnimationFrame(animate);if(!renderer)return;const t=clock?.getElapsedTime()||0;if(batter)batter.rotation.y=Math.sin(t*.8)*.03;if(bowler)bowler.rotation.y=Math.sin(t*.65)*.03;fielders.forEach((f,i)=>f.rotation.y=Math.sin(t*.5+i)*.04);renderer.render(scene,camera)}
function stop3D(){if(animId)cancelAnimationFrame(animId);animId=null}
function resize3D(){if(renderer&&camera){renderer.setSize(innerWidth,Math.max(1,innerHeight-64),false);camera.aspect=innerWidth/Math.max(1,innerHeight-64);camera.updateProjectionMatrix()}}
function startMatch(){
  $("matchResult").classList.remove("show");$("shotPanel").style.display="block";$("bowlPanel").style.display="none";
  game={balls:0,runs:0,wickets:0,playerBalls:0,playerRuns:0,fours:0,sixes:0,bowlWickets:0,catches:0,target:120,phase:"bat",opponent:TEAMS[1+Math.floor(Math.random()*3)],start:Date.now()};
  if(!renderer)setup3D(); else animate();
  updateMatchUI();comment("Choose your batting shot.");
}
function updateMatchUI(){
  if(!game)return;
  const ov=Math.floor(game.balls/6)+"."+game.balls%6;
  $("score").textContent=`${game.runs}/${game.wickets}`;$("overs").textContent=`${ov} ov`;
  $("target").textContent=`T20 • ${game.target} target`;$("runRate").textContent=`RR ${game.balls?(game.runs/(game.balls/6)).toFixed(2):"0.00"}`;
  $("batTeam").textContent=career.player.team.toUpperCase();$("inningsLabel").textContent=game.phase==="bat"?"1ST INNINGS":"2ND INNINGS";
  $("matchPhase").textContent=game.phase==="bat"?"BATTING":"BOWLING";
  $("miniScore").textContent=`${career.player.name} ${game.playerRuns}* • ${game.playerBalls} balls`;
  $("shotPanel").style.display=game.phase==="bat"?"block":"none";$("bowlPanel").style.display=game.phase==="bowl"?"block":"none";
}
function comment(text){$("commentary").textContent=text}
function animateBall(wicket=false){
  const el=$("ballIndicator");el.classList.remove("animate","wicket");void el.offsetWidth;el.classList.add("animate");if(wicket)el.classList.add("wicket");
}
function battingShot(type){
  if(!game||game.phase!=="bat")return;
  const p=career.player,s=SHOTS[type];
  game.playerBalls++;game.balls++;
  const timing=(p.skills.batting+p.skills.mental+p.form)/3;
  const power=p.skills.power;
  const defence=Math.random();
  let outcome;
  const wicketChance=Math.max(.025,s.risk*(1.12-timing/130)+(game.wickets*.008));
  if(defence<wicketChance){game.wickets++;outcome="WICKET";animateBall(true);comment(`${s.desc} Edge! ${career.player.name} is OUT.`)}
  else{
    let r=Math.random();
    const quality=(timing/100)*.65+(power/100)*.35;
    if(type==="defend") outcome=r<.72?0:(r<.94?1:2);
    else if(type==="drive") outcome=r<.27?0:(r<.64?1:(r<.86?2:(r<.97?4:6)));
    else if(type==="cut") outcome=r<.24?0:(r<.56?1:(r<.76?2:(r<.95?4:6)));
    else if(type==="pull") outcome=r<.18?0:(r<.46?1:(r<.68?2:(r<.89?4:6)));
    else outcome=r<.12?0:(r<.34?1:(r<.53?2:(r<.78?4:6)));
    if(Math.random()<quality*.05)outcome=Math.min(6,outcome+1);
    game.runs+=outcome;game.playerRuns+=outcome;if(outcome===4)game.fours++;if(outcome===6)game.sixes++;
    animateBall(false);comment(`${s.desc} ${outcome===0?"Dot ball.":outcome===4?"FOUR!":outcome===6?"SIX!":`${outcome} run${outcome>1?"s":""}.`}`)
  }
  afterBall();
}
function bowling(type){
  if(!game||game.phase!=="bowl")return;
  const p=career.player,b=BOWLS[type];game.balls++;
  const strength=(p.skills.bowling+p.skills.mental+p.skills.fitness)/3;
  const wk=Math.min(.35,b.wicket*(.7+strength/100));
  const isWicket=Math.random()<wk;
  if(isWicket){game.wickets++;game.bowlWickets++;animateBall(true);comment(`${b.desc} OUT! Excellent bowling.`)}
  else{const r=Math.random();const runs=r<.42?0:r<.75?1:r<.91?2:r<.98?4:6;game.runs+=runs;animateBall(false);comment(`${b.desc} ${runs===0?"Dot ball.":`${runs} run${runs>1?"s":""} conceded.`}`)}
  afterBall();
}
function afterBall(){
  updateMatchUI();
  if(game.phase==="bat"){
    if(game.wickets>=5||game.balls>=120||game.runs>=game.target){game.phase="bowl";game.balls=0;game.runs=0;game.wickets=0;comment(`You scored ${game.playerRuns}. Defend ${game.playerRuns} in the second innings.`);updateMatchUI()}
  }else if(game.balls>=120||game.wickets>=5||game.runs>game.playerRuns){
    finishMatch();
  }
}
function finishMatch(){
  const win=game.runs<game.playerRuns;
  const result={win,runs:game.playerRuns,balls:game.playerBalls,wickets:game.bowlWickets,catches:game.catches,sixes:game.sixes,fours:game.fours,opponent:game.opponent.name};
  career.applyMatch(result);renderAll();
  $("resultIcon").textContent=win?"🏆":"💪";$("resultTitle").textContent=win?"MATCH WON!":"MATCH LOST";
  $("resultText").textContent=win?`Brilliant performance against ${game.opponent.name}.`:`A competitive effort against ${game.opponent.name}.`;
  $("resultStats").innerHTML=[["Runs",game.playerRuns],["Balls",game.playerBalls],["Wickets",game.bowlWickets]].map(x=>`<div class="resultStat"><small>${x[0]}</small><b>${x[1]}</b></div>`).join("");
  $("matchResult").classList.add("show");
}
document.addEventListener("click",e=>{
  const action=e.target.closest("[data-action]")?.dataset.action;
  if(action==="home")show("home");else if(action==="profile")show("profile");else if(action==="match")show("match");else if(action==="training")show("training");else if(action==="stats")show("stats");else if(action==="contract")show("contract");else if(action==="news")show("news");else if(action==="create")openCreate();
  const train=e.target.closest("[data-train]")?.dataset.train;
  if(train){const r=career.train(train);comment("");renderAll();alert(r.msg)}
  const shot=e.target.closest("[data-shot]")?.dataset.shot;if(shot)battingShot(shot);
  const bowl=e.target.closest("[data-bowl]")?.dataset.bowl;if(bowl)bowling(bowl);
});
$("modalClose").onclick=()=>$("modal").classList.remove("show");
window.addEventListener("resize",resize3D);
window.addEventListener("beforeunload",stop3D);
let progress=0;const timer=setInterval(()=>{progress+=12;$("loadProgress").style.width=Math.min(progress,100)+"%";if(progress>=100){clearInterval(timer);setTimeout(()=>$("loading").classList.add("hide"),180)}},80);
renderAll();
