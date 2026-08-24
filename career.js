const KEY="rcc_career_v2";
const DEFAULT_PLAYER={
  name:"Rookie",age:18,role:"Right Hand Batter",team:"Academy XI",level:1,overall:55,form:60,
  money:500,energy:100,contract:"Academy Scholarship",
  skills:{batting:58,power:52,bowling:45,fielding:55,fitness:62,mental:58},
  stats:{matches:0,runs:0,balls:0,highScore:0,wickets:0,wins:0,losses:0,fifties:0,hundreds:0,catches:0,sixes:0,fours:0},
  recent:[],news:["Welcome to Academy XI. Your professional journey starts now."]
};
function deepClone(x){return JSON.parse(JSON.stringify(x))}
function calcOverall(p){
  const s=p.skills;
  return Math.round(s.batting*.30+s.power*.15+s.bowling*.20+s.fielding*.12+s.fitness*.10+s.mental*.13);
}
export function fmt(n){return Number(n||0).toLocaleString("en-IN")}
export class Career{
  constructor(){this.player=this.load()}
  load(){
    try{const raw=localStorage.getItem(KEY);if(raw){const p={...deepClone(DEFAULT_PLAYER),...JSON.parse(raw)};p.skills={...DEFAULT_PLAYER.skills,...p.skills};p.stats={...DEFAULT_PLAYER.stats,...p.stats};return p}}catch(e){}
    return deepClone(DEFAULT_PLAYER)
  }
  save(){this.player.overall=calcOverall(this.player);localStorage.setItem(KEY,JSON.stringify(this.player))}
  resetPlayer(data){
    const p=deepClone(DEFAULT_PLAYER);Object.assign(p,data||{});
    if(data?.skills)p.skills={...DEFAULT_PLAYER.skills,...data.skills};
    this.player=p;this.save()
  }
  train(skill){
    const p=this.player;
    if(p.energy<18)return {ok:false,msg:"Not enough energy. Rest before another session."};
    p.energy=Math.max(0,p.energy-18);
    const gain=1+Math.floor(Math.random()*3);
    p.skills[skill]=Math.min(99,p.skills[skill]+gain);
    p.form=Math.min(99,p.form+1);
    p.money=Math.max(0,p.money-20);
    this.save();
    return {ok:true,msg:`${skill[0].toUpperCase()+skill.slice(1)} improved by +${gain}.`}
  }
  recover(){this.player.energy=Math.min(100,this.player.energy+35);this.save()}
  applyMatch(result){
    const p=this.player,s=p.stats;
    s.matches++;s.runs+=result.runs;s.balls+=result.balls;s.highScore=Math.max(s.highScore,result.runs);
    s.wickets+=result.wickets;s.catches+=result.catches;s.sixes+=result.sixes;s.fours+=result.fours;
    if(result.runs>=50&&result.runs<100)s.fifties++;
    if(result.runs>=100)s.hundreds++;
    result.win?s.wins++:s.losses++;
    p.money+=result.win?180:70;
    p.energy=Math.max(10,p.energy-25);
    p.form=Math.max(20,Math.min(99,p.form+(result.win?4:-2)));
    if(s.matches%5===0){p.level++;p.skills.batting=Math.min(99,p.skills.batting+1);p.skills.mental=Math.min(99,p.skills.mental+1)}
    p.news.unshift(result.win?"Match win boosts your reputation.":"A tough match. Coaches want a stronger response next game.");
    p.news=p.news.slice(0,8);
    p.recent.unshift(result);
    p.recent=p.recent.slice(0,8);
    this.save()
  }
  createOffer(){
    const p=this.player;
    const offers=[
      {team:"City Warriors",role:"Right Hand Batter",money:1200},
      {team:"Capital Strikers",role:"Batting All-Rounder",money:1600},
      {team:"Riverside Royals",role:"Opening Batter",money:2000}
    ];
    return offers[Math.min(offers.length-1,Math.floor(p.overall/18))]
  }
  acceptOffer(offer){this.player.team=offer.team;this.player.role=offer.role;this.player.money+=offer.money;this.player.contract="Professional Contract";this.player.news.unshift(`Signed a professional contract with ${offer.team}.`);this.save()}
}
export function playerExists(){return !!localStorage.getItem(KEY)}
