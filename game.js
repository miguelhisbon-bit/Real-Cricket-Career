/* Real Cricket Career V9 - single-file browser match engine. No external libraries. */
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const D=window.GAME_DATA;
const SAVE_KEY="real_cricket_career_v9";
let career=loadCareer();
let match=null,renderRAF=0,lastFrame=performance.now(),anim=null;

function loadCareer(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));return s&&s.player?s:{player:{...D.player}}}catch{return {player:{...D.player}}}}
function saveCareer(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(career))}catch(e){}}
function overText(){return `${Math.floor(match.balls/6)}.${match.balls%6}`}
function rr(){return match.balls?((match.score/(match.balls/6))||0).toFixed(2):"0.00"}
function setText(id,v){const e=$(id);if(e)e.textContent=v}
function updateHome(){const p=career.player;["playerName","ovr","matches","runs","best","sr","xpText","form","fours","sixes"].forEach(k=>setText(k,p[k]??0));setText("formBadge",`FORM ${p.form}`);const bar=$("#xpBar");if(bar)bar.style.width=Math.min(100,(p.xp/1200)*100)+"%";}
function screen(id){$$('.screen').forEach(x=>x.classList.remove('active'));$("#"+id)?.classList.add('active');$$('.bottom-nav button').forEach(x=>x.classList.remove('active'));const n=[...$$('.bottom-nav button')].find(x=>x.dataset.screen===id);if(n)n.classList.add('active');if(id==='match')startRenderer()}
function showResult(text,type=""){const e=$("#resultPop");e.textContent=text;e.className="result-pop show "+type;clearTimeout(showResult.t);showResult.t=setTimeout(()=>e.className="result-pop",1250)}
function toast(text){setText("statusChip",text)}
function setMode(userBat){match.userBat=userBat;$("#batControls").classList.toggle("hidden",!userBat);$("#bowlControls").classList.toggle("hidden",userBat);setText("modeLabel",userBat?"BATTING":"BOWLING");setText("hudTitle",userBat?"YOUR BATTING":"YOUR BOWLING");setText("hudSub",userBat?"Choose timing and shot placement.":"Read the batter and choose a delivery.")}

function newMatch(){
 match={score:0,wickets:0,balls:0,target:D.target,history:[],paused:false,finished:false,playerBatIndex:0,partnerIndex:1,strikerIsPlayer:true,userBat:true,fours:0,sixes:0,playerRuns:0,playerBalls:0,playerOut:false,partnerRuns:0,partnerBalls:0,teamRuns:0,teamWickets:0,shotAnim:null,delivery:null,fieldSwing:0,battingTeam:D.teams.home,opposition:D.teams.away,over:0,ballInOver:0,aiConfidence:72,modeCamera:"WIDE",aiScore:0,aiBalls:0};
 setMode(true);screen("match");updateMatchUI();toast("SAMAR KHAN · 91 KPH · FIELD SET");
}
function updateMatchUI(){if(!match)return;setText("score",match.score);setText("wickets",match.wickets);setText("overs",overText());setText("rr",rr());setText("target",match.target);setText("needText",Math.max(0,match.target-match.score)+" needed");
 const p=D.lineup[match.playerBatIndex]||"Saikat",partner=D.lineup[match.partnerIndex]||"Rahul Sen";
 setText("striker",match.strikerIsPlayer?p:partner);setText("strikerRuns",`${match.strikerIsPlayer?match.playerRuns:match.partnerRuns}* (${match.strikerIsPlayer?match.playerBalls:match.partnerBalls})`);
 setText("partner",match.strikerIsPlayer?partner:p);setText("partnerRuns",`${match.strikerIsPlayer?match.partnerRuns:match.playerRuns}* (${match.strikerIsPlayer?match.partnerBalls:match.playerBalls})`);
 setText("bowlerName",match.userBat?"Samar Khan":"Ayan Kabir");setText("bowlerSpell",`${match.userBat?Math.floor(match.aiScore/10):Math.floor(match.score/10)}/${Math.floor(match.balls/6)}`);setText("bowlerMeta",match.userBat?"FAST · 91 KPH":"OFFBREAK · 78 KPH");
 setText("miniOver",`OVER ${Math.floor(match.balls/6)+1} · BALL ${(match.balls%6)+1}`);setText("fieldState",match.userBat?"FIELD · BALANCED":"FIELD · SET FOR BATTER");setText("cameraMode",match.modeCamera);
 const h=$("#ballHistory");h.innerHTML=match.history.slice(-12).map(v=>`<span class="${v==='4'?'four':v==='6'?'six':v==='W'?'wicket':v==='0'?'dot':''}">${v}</span>`).join("");
}

function resultForShot(shot){
 const weights={defend:[[0,42],[1,22],[2,10],[4,3],["W",3]],drive:[[0,18],[1,22],[2,15],[3,5],[4,25],[6,7],["W",8]],cut:[[0,18],[1,24],[2,13],[4,29],[6,6],["W",10]],pull:[[0,16],[1,17],[2,10],[4,28],[6,20],["W",13]],loft:[[0,13],[1,10],[2,8],[4,24],[6,31],["W",19]]};
 return weighted(weights[shot]);
}
function weighted(a){let total=a.reduce((s,x)=>s+x[1],0),r=Math.random()*total;for(const x of a){r-=x[1];if(r<=0)return x[0]}return 0}
function bowlOutcome(type){
 const w={yorker:[[0,30],[1,20],[2,7],[4,8],[6,2],["W",18]],good:[[0,20],[1,17],[2,10],[4,24],[6,7],["W",14]],bouncer:[[0,16],[1,14],[2,12],[4,18],[6,17],["W",13]],slower:[[0,18],[1,13],[2,8],[4,20],[6,24],["W",17]],spin:[[0,21],[1,17],[2,14],[4,20],[6,9],["W",19]]};return weighted(w[type])}

function playBall(shot){
 if(!match||match.paused||match.finished||!match.userBat||!match.strikerIsPlayer)return;
 const result=resultForShot(shot);resolveBall(result,true,shot);
}
function bowlBall(type){
 if(!match||match.paused||match.finished||match.userBat)return;
 const result=bowlOutcome(type);resolveBall(result,false,type);
}

function resolveBall(result,userBat,action){
 match.balls++;match.ballInOver=(match.balls-1)%6+1;match.over=Math.floor((match.balls-1)/6);match.history.push(String(result));
 const pace=userBat?88+Math.random()*7:72+Math.random()*9;setText("speedPop",`${pace.toFixed(1)} KPH`);$("#speedPop").classList.add("show");setTimeout(()=>$("#speedPop").classList.remove("show"),700);
 animatePlay(result,userBat,action);
 if(result==='W'){handleWicket(userBat);showResult("WICKET!","wicket");}
 else {const n=Number(result);match.score+=n;match.aiScore+=userBat?0:n;if(n===4){match.fours++;showResult("FOUR!","four");}else if(n===6){match.sixes++;showResult("SIX!","six");}else showResult(n===0?"DOT BALL":`${n} RUN${n===1?'':'S'}`);incrementStriker(n,userBat)}
 if(match.balls%6===0)swapStrike();
 updateMatchUI();
 if(match.score>=match.target){return setTimeout(()=>finishMatch(true),700)}
 if(match.wickets>=10||match.balls>=120)return setTimeout(()=>finishMatch(false),700);
 // In this game the user is the featured player: if they are non-striker, AI teammate faces the next ball.
 if(!match.strikerIsPlayer){setMode(false);setTimeout(aiBatBall,650)}else setMode(true);
}
function incrementStriker(n,userBat){if(match.strikerIsPlayer){match.playerRuns+=n;match.playerBalls++}else{match.partnerRuns+=n;match.partnerBalls++}if(n%2===1)swapStrike()}
function swapStrike(){match.strikerIsPlayer=!match.strikerIsPlayer}
function handleWicket(userBat){match.wickets++;if(match.strikerIsPlayer){match.playerBalls++;match.playerOut=true;match.playerBatIndex++;if(match.playerBatIndex>=10){match.finished=true;return}match.strikerIsPlayer=true;match.partnerIndex=Math.min(match.playerBatIndex+1,10)}else{match.partnerBalls++;match.partnerIndex++;if(match.partnerIndex>=11){match.finished=true;return}match.strikerIsPlayer=true}}
function aiBatBall(){if(!match||match.finished||match.paused)return;const options=["defend","drive","cut","pull","loft"];const aggression=Math.min(1,(match.score/(match.balls+1))/9);let shot=aggression>.75?weighted([["drive",25],["pull",22],["loft",18],["cut",20],["defend",15]]):weighted(options.map((x,i)=>[x,[38,25,16,12,9][i]]));const r=resultForShot(shot);resolveBall(r,false,shot)}
function finishMatch(win){if(!match||match.finished&&match.score<match.target)return;match.finished=true;match.paused=true;const p=career.player;p.matches++;p.runs+=match.playerRuns;p.best=Math.max(p.best,match.playerRuns);p.fours+=match.fours;p.sixes+=match.sixes;p.xp=Math.min(1200,p.xp+Math.max(40,match.playerRuns+15));p.form=Math.max(1,Math.min(99,p.form+(win?4:-2)));p.ovr=Math.min(99,p.ovr+(win?1:0));p.sr=p.matches?Number(((p.runs/Math.max(1,p.matches*10))*10).toFixed(1)):0;saveCareer();updateHome();
 const title=win?"🏆 YOU WIN!":"MATCH OVER";setTimeout(()=>{const again=confirm(`${title}\nFinal score: ${match.score}/${match.wickets} (${overText()})\nSaikat: ${match.playerRuns}${match.playerOut?'':'*'}\n\nOK = New Match   Cancel = Career Home`);if(again)newMatch();else screen('home')},150)}

function animatePlay(result,userBat,action){
 const wrap=$("#stadiumWrap"),ball=$("#ballTracker"),bat=renderState.batter,bowler=renderState.bowler;
 const isSix=result===6,isFour=result===4;
 anim={t:0,d:950,result,userBat,action};
 ball.style.opacity=1;
 if(isFour||isSix){const pop=$("#cameraFlash");pop.style.opacity=isSix?.32:.14;setTimeout(()=>pop.style.opacity=0,110)}
 if(result==='W'){wrap.classList.add('shake');setTimeout(()=>wrap.classList.remove('shake'),320)}
}

// Procedural pseudo-3D stadium renderer: player silhouettes, pitch, fielders, umpire and ball trajectory are drawn each frame.
const canvas=$("#stadium"),ctx=canvas.getContext('2d');
const renderState={batter:{x:.50,z:.69,rot:0,swing:0},bowler:{x:.50,z:.20,run:0},umpire:{x:.50,z:.52},fielders:[],ball:{x:.5,z:.64,h:0}};
function resetFielders(){renderState.fielders=[];const pts=[[.19,.45],[.81,.45],[.12,.62],[.88,.62],[.24,.75],[.76,.75],[.08,.31],[.92,.31],[.34,.27],[.66,.27],[.5,.10]];pts.forEach((p,i)=>renderState.fielders.push({x:p[0],z:p[1],team:i%2}))}
resetFielders();
function project(x,z){const horizon=.19,depth=Math.max(0,Math.min(1,(z-horizon)/(1-horizon)));return{x:x*canvas.width,y:(horizon+depth*.76)*canvas.height,scale:.38+depth*.72}}
function ellipse(cx,cy,rx,ry,fill,stroke){ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function drawPerson(p,team,scale=1,pose=0,label=""){
 const q=project(p.x,p.z),s=q.scale*scale;ctx.save();ctx.translate(q.x,q.y);ctx.scale(s,s);ctx.rotate(pose*.2);
 ellipse(0,6,17,6,"#0005");ctx.fillStyle=team===0?"#1676ff":"#dc4d4d";ctx.beginPath();ctx.roundRect(-10,-34,20,35,7);ctx.fill();
 ctx.fillStyle="#dca17a";ellipse(0,-45,9,10,"#dca17a");ctx.fillStyle="#17212a";ctx.beginPath();ctx.arc(0,-49,9,Math.PI,Math.PI*2);ctx.fill();
 ctx.fillStyle="#eef5f7";ctx.fillRect(-7,2,5,12);ctx.fillRect(2,2,5,12);ctx.fillStyle="#101820";ctx.fillRect(-8,12,6,3);ctx.fillRect(2,12,6,3);
 ctx.strokeStyle="#dca17a";ctx.lineWidth=4;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-9,-25);ctx.lineTo(-15,-10);ctx.moveTo(9,-25);ctx.lineTo(15,-10);ctx.stroke();
 if(label){ctx.font="bold 8px system-ui";ctx.textAlign="center";ctx.fillStyle="#eaf6ff";ctx.fillText(label,0,-63)}ctx.restore();
}
function drawBat(p,scale=1,angle=.35){const q=project(p.x,p.z),s=q.scale*scale;ctx.save();ctx.translate(q.x,q.y);ctx.scale(s,s);ctx.rotate(angle);ctx.fillStyle="#e7c274";ctx.beginPath();ctx.roundRect(-3,-48,7,58,2);ctx.fill();ctx.fillStyle="#7d5125";ctx.fillRect(-2,6,5,16);ctx.restore()}
function drawWickets(z){const q=project(.5,z),s=q.scale;ctx.save();ctx.translate(q.x,q.y);ctx.strokeStyle="#f3f5f5";ctx.lineWidth=Math.max(2,3*s);for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(i*6*s,-13*s);ctx.lineTo(i*6*s,13*s);ctx.stroke()}ctx.beginPath();ctx.moveTo(-8*s,-12*s);ctx.lineTo(8*s,-12*s);ctx.stroke();ctx.restore()}
function drawField(){
 const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
 const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,"#031221");sky.addColorStop(.24,"#0a2d36");sky.addColorStop(.55,"#09251d");sky.addColorStop(1,"#03130e");ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 // stadium tiers
 for(let r=0;r<8;r++){ctx.fillStyle=r%2?"#0d3342":"#10293a";ctx.beginPath();ctx.ellipse(w/2,150+r*24,w*.53-r*12,55-r*3,0,0,Math.PI*2);ctx.fill()}
 // crowd dots
 for(let r=0;r<7;r++)for(let i=0;i<42;i++){ctx.fillStyle=["#2e6880","#d35454","#d9b64a","#4d9a75"][i%4];ctx.fillRect(35+i*23,80+r*20,5,7)}
 // floodlights
 for(const x of [55,160,840,945]){ctx.fillStyle="#ffffff";ctx.fillRect(x,45,6,95);for(let k=0;k<5;k++){ctx.beginPath();ctx.arc(x+(k-2)*7,42,3,0,Math.PI*2);ctx.fill()}}
 // outfield
 ctx.fillStyle="#13834d";ctx.beginPath();ctx.ellipse(w/2,h*.64,w*.48,h*.45,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#6ee7a7";ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(w/2,h*.64,w*.44,h*.40,0,0,Math.PI*2);ctx.stroke();
 // inner mowing stripes
 for(let i=0;i<7;i++){ctx.strokeStyle=i%2?"#ffffff09":"#00000008";ctx.lineWidth=28;ctx.beginPath();ctx.arc(w/2,h*.64,w*(.11+i*.05),0,Math.PI*2);ctx.stroke()}
 // pitch
 const top=project(.5,.27),bot=project(.5,.78);ctx.fillStyle="#c9b888";ctx.beginPath();ctx.moveTo(w*.41,top.y);ctx.lineTo(w*.59,top.y);ctx.lineTo(w*.62,bot.y);ctx.lineTo(w*.38,bot.y);ctx.closePath();ctx.fill();ctx.strokeStyle="#e2d4a9";ctx.stroke();
 ctx.strokeStyle="#fff";ctx.lineWidth=3;for(const z of [.27,.78]){const q=project(.5,z);ctx.beginPath();ctx.moveTo(w*.41,q.y);ctx.lineTo(w*.59,q.y);ctx.stroke()}
 drawWickets(.28);drawWickets(.76);
 // boundary rope
 ctx.strokeStyle="#d7f5e5";ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(w/2,h*.64,w*.45,h*.39,0,0,Math.PI*2);ctx.stroke();
 // players
 renderState.fielders.forEach((p,i)=>drawPerson(p,p.team,1,0,D.opponents[i]||""));
 drawPerson(renderState.bowler,1,.02,"Samar");drawPerson(renderState.batter,0,1,renderState.batter.swing,"Saikat");drawBat(renderState.batter,1,renderState.batter.swing>.2?-1.1:.45);
 drawPerson(renderState.umpire,2,.9,0,"UMP");
 // bowler's run-up marker
 ctx.strokeStyle="#ffffff33";ctx.setLineDash([8,10]);ctx.beginPath();const b1=project(.5,.20),b2=project(.5,.27);ctx.moveTo(b1.x,b1.y);ctx.lineTo(b2.x,b2.y);ctx.stroke();ctx.setLineDash([]);
 // ball
 if(anim){const t=Math.min(1,anim.t/anim.d);let bx=.5,bz=.64,bh=0;if(anim.userBat){bz=.64-(t*.40);bx=.5+(anim.result==='6'?(t-.3)*.55:anim.result==='4'?(t-.3)*.38:0);bh=(anim.result==='6'?Math.sin(t*Math.PI)*.45:anim.result==='4'?Math.sin(t*Math.PI)*.2:Math.sin(t*Math.PI)*.08)}else{bz=.28+t*.38;bx=.5+Math.sin(t*Math.PI)*.12;bh=Math.sin(t*Math.PI)*.18}const q=project(bx,bz);ctx.fillStyle="#ff3e52";ellipse(q.x,q.y-q.scale*bh*120,4+q.scale*2,4+q.scale*2,"#ff3e52");}
}
function frame(now){const dt=Math.min(50,now-lastFrame);lastFrame=now;if(anim){anim.t+=dt;const t=Math.min(1,anim.t/anim.d);renderState.batter.swing=Math.sin(t*Math.PI)*(anim.result==='6'?.9:anim.result==='4'?.75:.4);renderState.bowler.run=Math.sin(t*Math.PI);if(t>=1){anim=null;renderState.batter.swing=0}}drawField();renderRAF=requestAnimationFrame(frame)}
function startRenderer(){if(!renderRAF){lastFrame=performance.now();renderRAF=requestAnimationFrame(frame)}}

function setup(){
 updateHome();
 $("#playBtn").onclick=newMatch;$("#navPlay").onclick=newMatch;$("#careerBtn").onclick=()=>screen("career");$("#statsBtn").onclick=()=>screen("statsScreen");$("#trainingBtn").onclick=()=>screen("trainingScreen");$("#navTrain").onclick=()=>screen("trainingScreen");
 $("#equipmentBtn").onclick=()=>alert("Equipment hub: bat, gloves, pads, helmet and shoe upgrades are tracked in Career.");$("#newsBtn").onclick=()=>alert("NEWS\nAcademy scouts are watching your recent form. Keep playing to unlock the next career stage.");$("#menuBtn").onclick=()=>alert("REAL CRICKET CAREER V9\n11-player match engine • batting • bowling • dynamic stadium • career save");
 $$('[data-home]').forEach(b=>b.onclick=()=>screen('home'));$$('.bottom-nav [data-screen]').forEach(b=>b.onclick=()=>screen(b.dataset.screen));
 $$('[data-shot]').forEach(b=>b.onclick=()=>playBall(b.dataset.shot));$$('[data-bowl]').forEach(b=>b.onclick=()=>bowlBall(b.dataset.bowl));
 $("#cameraBtn").onclick=()=>{match.modeCamera=match.modeCamera==='WIDE'?'BATTER':match.modeCamera==='BATTER'?'BOWLER':'WIDE';updateMatchUI();toast("CAMERA · "+match.modeCamera);const f=$("#cameraFlash");f.style.opacity=.16;setTimeout(()=>f.style.opacity=0,90)};
 $("#pauseBtn").onclick=()=>{if(!match)return;match.paused=!match.paused;setText("pauseBtn",match.paused?"▶":"Ⅱ");toast(match.paused?"MATCH PAUSED":"LIVE MATCH")};
 $("#endMatchBtn").onclick=()=>{if(!match)return;if(confirm("End this match and return to career?")){match.finished=true;screen('home')}};
 $$('[data-train]').forEach(b=>b.onclick=()=>{career.player.xp=Math.min(1200,career.player.xp+35);career.player.form=Math.min(99,career.player.form+1);career.player.ovr=Math.min(99,career.player.ovr+(Math.random()<.3?1:0));saveCareer();updateHome();alert("Training complete! +35 XP");});
 startRenderer();
}
setup();
