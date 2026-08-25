const BOOT_TIMEOUT=9000;
const loading=document.getElementById("loading");
const progress=document.getElementById("loadProgress");
const message=document.querySelector("#loading p");
let done=false;
function setProgress(v){if(progress)progress.style.width=Math.max(0,Math.min(100,v))+"%"}
function finish(){if(done)return;done=true;setProgress(100);setTimeout(()=>loading?.classList.add("hide"),180)}
function bootError(err){
  console.error("Real Cricket Career boot failed:",err);
  if(message)message.innerHTML=`Game engine could not start safely.<br><small>Trying a clean recovery…</small>`;
  document.body.classList.add("bootError");
  const box=document.createElement("div");
  box.className="bootErrorBox";
  box.innerHTML=`<b>SAFE RECOVERY MODE</b><p>The 3D engine did not load. Your career save is kept safe.</p><button id="reloadGame">↻ RETRY</button>`;
  document.body.appendChild(box);
  document.getElementById("reloadGame")?.addEventListener("click",()=>location.reload());
  setProgress(100);
}
async function loadCore(){
  setProgress(18);
  message&&(message.textContent="Loading career data • preparing match engine");
  await import("./game-core.js");
  setProgress(88);
  finish();
}
const timeout=setTimeout(()=>{if(!done)bootError(new Error("Boot timeout"))},BOOT_TIMEOUT);
loadCore().catch(bootError).finally(()=>clearTimeout(timeout));
setTimeout(()=>setProgress(42),350);
setTimeout(()=>setProgress(64),900);
