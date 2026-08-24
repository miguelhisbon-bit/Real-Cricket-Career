import * as THREE
from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import {Career,fmt}
from "./career.js";

const career = new Career();

let scene;
let camera;
let renderer;
let clock;
let animId;

let ball;
let batter;
let bowler;

let fielders = [];
let pitch;

let game = {};

const $ = id =>
  document.getElementById(id);

const screens =
  [...document.querySelectorAll(".screen")];


/* -----------------------------
   SCREEN SYSTEM
----------------------------- */

function show(id){

  screens.forEach(screen => {

    screen.classList.toggle(
      "active",
      screen.id === id
    );

  });

  if(id !== "match"){
    stop3D();
  }

  if(id === "match"){
    start3D();
  }

  renderAll();
}


/* -----------------------------
   CAREER UI
----------------------------- */

function renderAll(){

  const p = career.player;

  $("topStats").textContent =
    `Age ${p.age} • OVR ${p.overall} • ₹ ${fmt(p.money)}`;

  $("homeName").textContent =
    p.name;

  $("homeOvr").textContent =
    p.overall;

  $("homeStatus").textContent =
    `${p.team} • Level ${p.level} • Form ${Math.round(p.form)}`;

  $("profileName").textContent =
    p.name;

  $("profileRole").textContent =
    p.role;

  $("profileTeam").textContent =
    p.team;

  $("avatar").textContent =
    p.role.toLowerCase().includes("bowl")
    ? "🎯"
    : "🏏";


  $("skills").innerHTML =
    Object.entries(p.skills)
    .map(([key,value]) => {

      const label =
        key[0].toUpperCase() +
        key.slice(1);

      return `
        <div class="skill">

          <div class="skillTop">
            <b>${label}</b>
            <strong>${value}</strong>
          </div>

          <div class="meter">
            <i style="width:${value}%"></i>
          </div>

        </div>
      `;

    })
    .join("");


  $("energyBar").style.width =
    p.energy + "%";

  $("energyText").textContent =
    `${Math.round(p.energy)} / 100`;


  const stats = {

    Matches:p.stats.matches,
    Runs:p.stats.runs,
    "High score":p.stats.highScore,
    Wickets:p.stats.wickets,
    Wins:p.stats.wins,
    "50s":p.stats.fifties,
    "100s":p.stats.hundreds,
    Catches:p.stats.catches

  };


  $("careerStats").innerHTML =
    Object.entries(stats)
    .map(([key,value]) => {

      return `
        <div class="statCard">

          <small>${key}</small>

          <strong>
            ${fmt(value)}
          </strong>

        </div>
      `;

    })
    .join("");


  $("recent").innerHTML =
    p.recent.length

    ? p.recent
      .slice(0,8)
      .map(match => {

        return `
          <div class="row">

            <span>
              ${match.label}
            </span>

            <b>
              ${match.runs}/${match.wickets}
            </b>

          </div>
        `;

      })
      .join("")

    : `<p class="muted">
         No matches yet.
       </p>`;


  $("newsList").innerHTML =
    p.news
    .map(news => {

      return `
        <div class="news">

          <span class="tag">
            ${news.tag}
          </span>

          <b>
            ${news.title}
          </b>

          <span class="muted">
            ${news.text}
          </span>

        </div>
      `;

    })
    .join("");


  $("journey").innerHTML = [

    ["Academy",p.level >= 1],
    ["Domestic",p.level >= 2],
    ["National",p.level >= 3],
    ["World stage",p.level >= 4]

  ]

  .map(item => {

    return `
      <div class="row">

        <span>
          ${item[1] ? "✅" : "🔒"}
          ${item[0]}
        </span>

        <small>
          ${item[1]
            ? "Unlocked"
            : "Keep improving"}
        </small>

      </div>
    `;

  })
  .join("");


  const offer =
    career.contractOffer();

  $("contractPanel").innerHTML = `

    <h3>${p.team}</h3>

    <div class="row">
      <span>Current contract</span>
      <b>${p.contract.name}</b>
    </div>

    <div class="row">
      <span>Salary</span>
      <b>₹ ${fmt(p.contract.salary)}</b>
    </div>

    <div class="row">
      <span>Pro offer</span>
      <b>₹ ${fmt(offer.salary)}</b>
    </div>

    <button
      class="primary"
      id="acceptContract">
      Accept new contract
    </button>

  `;


  setTimeout(() => {

    $("acceptContract")
    ?.addEventListener(
      "click",
      () => {

        p.contract = offer;

        p.money += offer.salary;

        career.save();

        renderAll();

        toast("Contract signed!");

      }
    );

  });
}


/* -----------------------------
   NOTIFICATION
----------------------------- */

function toast(text){

  $("message").textContent =
    text;
}


/* -----------------------------
   CREATE PLAYER
----------------------------- */

function openCreate(){

  modal(`

    <h2>Create Player</h2>

    <div class="form">

      <label>Name</label>

      <input
        id="newName"
        maxlength="20"
        value="${career.player.name}">

      <label>Role</label>

      <select id="newRole">

        <option>
          Right Hand Batter
        </option>

        <option>
          Left Hand Batter
        </option>

        <option>
          Fast Bowler
        </option>

        <option>
          Spin Bowler
        </option>

        <option>
          All Rounder
        </option>

      </select>

      <button
        class="primary"
        id="savePlayer">

        Start Career

      </button>

    </div>

  `);


  $("savePlayer").onclick =
    () => {

      career.reset(
        $("newName").value,
        $("newRole").value
      );

      closeModal();

      renderAll();

      toast("Career created");
    };
}


/* -----------------------------
   MODAL
----------------------------- */

function modal(html){

  $("modalContent").innerHTML =
    html;

  $("modal")
    .classList.add("show");
}

function closeModal(){

  $("modal")
    .classList.remove("show");
}


/* -----------------------------
   START MATCH
----------------------------- */

function startMatch(){

  show("match");

  game = {

    over:0,
    balls:0,
    runs:0,
    wickets:0,

    target:120,

    batting:true,

    score:0,

    inningsBalls:0,

    lastResult:null,

    ended:false,

    pendingShot:null

  };

  updateHUD();

  toast(
    "Choose your shot when the ball arrives"
  );
}


/* -----------------------------
   THREE.JS SETUP
----------------------------- */

function init3D(){

  scene =
    new THREE.Scene();

  scene.background =
    new THREE.Color(0x7bb6d9);

  scene.fog =
    new THREE.Fog(
      0x7bb6d9,
      35,
      95
    );


  camera =
    new THREE.PerspectiveCamera(
      55,
      innerWidth / innerHeight,
      .1,
      150
    );

  camera.position.set(
    0,
    6.5,
    15
  );

  camera.lookAt(
    0,
    2,
    0
  );


  renderer =
    new THREE.WebGLRenderer({

      canvas:$("gameCanvas"),

      antialias:true,

      powerPreference:
        "high-performance"

    });


  renderer.setPixelRatio(
    Math.min(devicePixelRatio,1.7)
  );

  renderer.setSize(
    innerWidth,
    innerHeight - 64
  );

  renderer.shadowMap.enabled = true;

  renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;


  const hemi =
    new THREE.HemisphereLight(
      0xffffff,
      0x31543c,
      2
    );

  scene.add(hemi);


  const sun =
    new THREE.DirectionalLight(
      0xffffff,
      3
    );

  sun.position.set(
    -12,
    18,
    10
  );

  sun.castShadow = true;

  scene.add(sun);


  buildStadium();
}


/* -----------------------------
   3D MATERIAL HELPERS
----------------------------- */

function mat(color){

  return new THREE.MeshStandardMaterial({

    color,

    roughness:.72,

    metalness:.05

  });
}


function box(
  width,
  height,
  depth,
  color
){

  const mesh =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        width,
        height,
        depth
      ),
      mat(color)
    );

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}


function cyl(
  radius,
  height,
  color
){

  const mesh =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        radius,
        radius,
        height,
        16
      ),
      mat(color)
    );

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}


/* -----------------------------
   STADIUM
----------------------------- */

function buildStadium(){

  const grass =
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        100,
        100
      ),
      mat(0x356b3d)
    );

  grass.rotation.x =
    -Math.PI / 2;

  scene.add(grass);


  const outfield =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        26,
        26,
        .3,
        64
      ),
      mat(0x2d6338)
    );

  outfield.position.y =
    .15;

  scene.add(outfield);


  pitch =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        3,
        .08,
        26
      ),
      mat(0xc6a96b)
    );

  pitch.position.y =
    .32;

  scene.add(pitch);


  for(let i=0;i<32;i++){

    const angle =
      i / 32 * Math.PI * 2;

    const radius = 25;

    const stand =
      box(
        7,
        4,
        2,
        0x354452
      );

    stand.position.set(
      Math.cos(angle) * radius,
      2,
      Math.sin(angle) * radius
    );

    stand.lookAt(
      0,
      2,
      0
    );

    scene.add(stand);
  }


  batter =
    makePlayer(0xeeeeee);

  batter.position.set(
    0,
    1.2,
    8
  );

  batter.rotation.y =
    Math.PI;

  scene.add(batter);


  bowler =
    makePlayer(0x2266cc);

  bowler.position.set(
    0,
    1.2,
    -8
  );

  scene.add(bowler);


  for(let i=0;i<8;i++){

    const fielder =
      makePlayer(0xd34b4b);

    const angle =
      i / 8 * Math.PI * 2;

    fielder.position.set(
      Math.sin(angle) * 9,
      1.1,
      Math.cos(angle) * 9
    );

    fielder.scale.setScalar(.8);

    scene.add(fielder);

    fielders.push(fielder);
  }
}


/* -----------------------------
   PLAYER MODEL
----------------------------- */

function makePlayer(color){

  const group =
    new THREE.Group();


  const body =
    cyl(
      .38,
      1.15,
      color
    );

  body.position.y = 0;

  group.add(body);


  const head =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        .3,
        16,
        12
      ),
      mat(0xb87852)
    );

  head.position.y =
    .8;

  group.add(head);


  const leg1 =
    box(
      .14,
      .8,
      .16,
      0x20242a
    );

  leg1.position.set(
    -.16,
    -.75,
    0
  );

  group.add(leg1);


  const leg2 =
    leg1.clone();

  leg2.position.x =
    .16;

  group.add(leg2);


  return group;
}


/* -----------------------------
   BALL
----------------------------- */

function throwBall(){

  if(
    game.over >= 5 ||
    game.inningsBalls >= 30
  ){

    endMatch();

    return;
  }


  game.inningsBalls++;
  game.balls++;


  ball =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        .11,
        12,
        12
      ),
      mat(0x8d1010)
    );


  ball.position.set(
    (Math.random()-.5)*1.2,
    2,
    -7
  );


  scene.add(ball);


  setTimeout(() => {

    if(!game.batting)
      return;

    toast("SHOT NOW!");

  },700);


  const start =
    performance.now();


  const startPos =
    ball.position.clone();


  const endPos =
    new THREE.Vector3(
      (Math.random()-.5)*.7,
      1.1,
      7
    );


  function travel(){

    if(!ball)
      return;


    const t =
      Math.min(
        (performance.now()-start)/850,
        1
      );


    ball.position.lerpVectors(
      startPos,
      endPos,
      t
    );


    if(t >= 1){

      resolveShot(
        game.pendingShot || "defend"
      );

      game.pendingShot =
        null;

      return;
    }


    requestAnimationFrame(
      travel
    );
  }


  travel();
}


/* -----------------------------
   SHOT RESOLUTION
----------------------------- */

function resolveShot(shot){

  if(!ball)
    return;


  const p =
    career.player;


  const skill =
    p.skills.batting;

  const power =
    p.skills.power;


  const roll =
    Math.random() * 100;


  let runs = 0;
  let wicket = 0;
  const balls = 1;


  const quality =
    skill * .55 +
    power * .25 +
    p.form * .20;


  const bonuses = {

    defend:-8,
    drive:8,
    cut:5,
    pull:7,
    loft:14

  };


  const q =
    quality +
    bonuses[shot];


  if(
    roll <
    Math.max(
      5,
      7 - (q-50)*.08
    )
  ){

    wicket = 1;

    toast("WICKET!");

  }
  else{

    const x =
      Math.random()*100;


    if(
      shot === "loft" &&
      x < 35
    ){

      runs = 6;

    }
    else if(
      x <
      18 + (q > 65 ? 8 : 0)
    ){

      runs = 4;

    }
    else if(x < 42){

      runs = 2;

    }
    else if(x < 65){

      runs = 1;

    }
    else{

      runs = 0;

    }


    if(runs === 6)
      toast("SIX!");

    else if(runs === 4)
      toast("FOUR!");

    else if(runs)
      toast("RUN!");

    else
      toast("DOT BALL");
  }


  game.runs += runs;

  game.wickets += wicket;

  game.score =
    game.runs;


  game.lastResult = {
    r:runs,
    w:wicket,
    b:balls
  };


  if(ball){

    scene.remove(ball);

    ball = null;
  }


  updateHUD();


  if(
    wicket ||
    game.inningsBalls >= 30
  ){

    setTimeout(
      endMatch,
      900
    );

  }
  else{

    setTimeout(
      () => {

        game.pendingShot =
          null;

        throwBall();

      },
      600
    );
  }
}


/* -----------------------------
   SCOREBOARD
----------------------------- */

function updateHUD(){

  const balls =
    game.inningsBalls || 0;


  const overs =
    Math.floor(balls/6) +
    "." +
    (balls%6);


  $("score").textContent =
    `${game.runs}/${game.wickets}`;


  $("overs").textContent =
    `${overs} ov`;


  $("target").textContent =
    `T20 • ${Math.max(
      0,
      game.target-game.runs
    )} needed`;


  $("batTeam").textContent =
    career.player.team.toUpperCase();
}


/* -----------------------------
   MATCH END
----------------------------- */

function endMatch(){

  if(game.ended)
    return;


  game.ended = true;


  const win =
    game.runs >= game.target;


  const result = {

    runs:game.runs,

    balls:game.inningsBalls,

    wickets:game.wickets,

    catches:
      Math.random() < .25
      ? 1
      : 0,

    win

  };


  career.finishMatch(
    result
  );


  career.player.recent.unshift({

    label:
      `${new Date().toLocaleDateString()} • ` +
      `${win ? "Win" : "Loss"}`,

    runs:
      game.runs,

    wickets:
      game.wickets

  });


  career.player.recent =
    career.player.recent.slice(
      0,
      10
    );


  career.save();


  modal(`

    <h2>
      ${win
        ? "🏆 Victory!"
        : "🏏 Match Complete"}
    </h2>

    <p>
      You scored
      <b>${game.runs}</b>
      from
      <b>${game.inningsBalls}</b>
      balls.
    </p>

    <div class="row">
      <span>Result</span>
      <b>${win ? "WIN" : "LOSS"}</b>
    </div>

    <div class="row">
      <span>XP</span>
      <b>+${40+game.runs}</b>
    </div>

    <div class="row">
      <span>Career money</span>
      <b>₹ ${fmt(career.player.money)}</b>
    </div>

    <button
      class="primary"
      id="backCareer">

      Continue Career

    </button>

  `);


  $("backCareer").onclick =
    () => {

      closeModal();

      show("home");

    };
}


/* -----------------------------
   3D LOOP
----------------------------- */

function start3D(){

  if(!renderer)
    init3D();


  cancelAnimationFrame(
    animId
  );


  clock.start();

  animate();
}


function stop3D(){

  if(animId)
    cancelAnimationFrame(
      animId
    );


  if(ball && scene){

    scene.remove(ball);

    ball = null;
  }
}


function animate(){

  animId =
    requestAnimationFrame(
      animate
    );


  const dt =
    clock.getDelta();


  if(scene){

    if(batter){

      batter.rotation.y =
        Math.sin(
          performance.now()*.001
        )*.02;

    }


    if(bowler){

      bowler.position.y =
        1.2 +
        Math.sin(
          performance.now()*.004
        )*.05;

    }


    renderer.render(
      scene,
      camera
    );
  }
}


/* -----------------------------
   SHOT INPUT
----------------------------- */

function handleShot(shot){

  if(
    !game ||
    game.ended ||
    !game.batting
  )
    return;


  if(game.pendingShot){

    toast("Wait for the ball");

    return;
  }


  game.pendingShot =
    shot;

  throwBall();
}


/* -----------------------------
   CLICK EVENTS
----------------------------- */

document.addEventListener(
  "click",
  event => {

    const action =
      event.target.closest(
        "[data-action]"
      );


    if(action){

      const act =
        action.dataset.action;


      if(act === "home"){

        show("home");

      }
      else if(act === "create"){

        openCreate();

      }
      else if(act === "match"){

        startMatch();

      }
      else{

        show(act);

      }

      return;
    }


    const training =
      event.target.closest(
        "[data-train]"
      );


    if(training){

      const result =
        career.train(
          training.dataset.train
        );


      toast(result.msg);

      renderAll();

      return;
    }


    const shot =
      event.target.closest(
        "[data-shot]"
      );


    if(shot){

      handleShot(
        shot.dataset.shot
      );

      return;
    }


    const bowl =
      event.target.closest(
        "[data-bowl]"
      );


    if(bowl){

      toast(
        "Bowling mode is coming in the next gameplay module."
      );
    }

  }
);


/* -----------------------------
   MODAL EVENTS
----------------------------- */

$("modalClose").onclick =
  closeModal;


$("modal").addEventListener(
  "click",
  event => {

    if(
      event.target ===
      $("modal")
    ){

      closeModal();

    }

  }
);


/* -----------------------------
   RESPONSIVE 3D
----------------------------- */

window.addEventListener(
  "resize",
  () => {

    if(!renderer)
      return;


    camera.aspect =
      innerWidth /
      innerHeight;


    camera.updateProjectionMatrix();


    renderer.setSize(
      innerWidth,
      innerHeight - 64
    );

  }
);


/* -----------------------------
   KEYBOARD
----------------------------- */

window.addEventListener(
  "keydown",
  event => {

    const map = {

      1:"defend",
      2:"drive",
      3:"cut",
      4:"pull",
      5:"loft"

    };


    if(map[event.key]){

      handleShot(
        map[event.key]
      );

    }

  }
);


/* -----------------------------
   LOADING
----------------------------- */

for(
  let i=0;
  i<=100;
  i+=10
){

  setTimeout(
    () => {

      $("loadProgress")
        .style.width =
        i + "%";

    },
    i * 4
  );
}


setTimeout(
  () => {

    $("loading").style.opacity =
      0;


    setTimeout(
      () => {

        $("loading").remove();

      },
      500
    );


    renderAll();

  },
  550
);
