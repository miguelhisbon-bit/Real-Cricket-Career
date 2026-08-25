const KEY="rcc_career_v3";
const OLD_KEYS=["rcc_career_v2"];
const DEFAULT_PLAYER={
  name:"Rookie",age:18,role:"Right Hand Batter",team:"Academy XI",level:1,overall:55,form:60,
  money:500,energy:100,contract:"Academy Scholarship",selection:"Academy XI",
  skills:{batting:58,power:52,bowling:45,fielding:55,fitness:62,mental:58},
  stats:{matches:0,runs:0,balls:0,dismissals:0,highScore:0,wickets:0,wins:0,losses:0,fifties:0,hundreds:0,catches:0,sixes:0,fours:0,average:0},
  reputation:{local:12,domestic:0,franchise:0,international:0,fans:35},
  fitness:{condition:92,fatigue:0,injury:null},
  season:{number:1,matches:0,runs:0,wins:0,goalMatches:8,goalRuns:250,goalWins:4},
  awards:[],relationships:{coach:62,captain:55,team:58},
  world:{rival:{name:"Rohan Das",runs:0,matches:0,wins:0,form:61},league:{points:0,played:0,wins:0,losses:0,nrr:0}},
  recent:[],news:["Welcome to Academy XI. Your professional journey starts now.","Selectors have added you to the Academy watchlist."]
};
function deepClone(x){return JSON.parse(JSON.stringify(x))}
function mergePlayer(raw){
  const p={...deepClone(DEFAULT_PLAYER),...raw};
  p.skills={...DEFAULT_PLAYER.skills,...(raw?.skills||{})};
  p.stats={...DEFAULT_PLAYER.stats,...(raw?.stats||{})};p.stats.dismissals=Number(raw?.stats?.dismissals??0);
  p.reputation={...DEFAULT_PLAYER.reputation,...(raw?.reputation||{})};
  p.fitness={...DEFAULT_PLAYER.fitness,...(raw?.fitness||{})};
  p.season={...DEFAULT_PLAYER.season,...(raw?.season||{})};
  p.relationships={...DEFAULT_PLAYER.relationships,...(raw?.relationships||{})};
  p.world={...DEFAULT_PLAYER.world,...(raw?.world||{}),rival:{...DEFAULT_PLAYER.world.rival,...(raw?.world?.rival||{})},league:{...DEFAULT_PLAYER.world.league,...(raw?.world?.league||{})}};
  p.awards=[...(raw?.awards||[])];p.recent=[...(raw?.recent||[])];p.news=[...(raw?.news||DEFAULT_PLAYER.news)];
  return p;
}
function calcOverall(p){
  const s=p.skills;
  return Math.round(s.batting*.30+s.power*.15+s.bowling*.20+s.fielding*.12+s.fitness*.10+s.mental*.13);
}
function stageFor(p){
  if(p.reputation.international>=35&&p.overall>=78)return "INTERNATIONAL XI";
  if(p.reputation.franchise>=30&&p.overall>=68)return "FRANCHISE XI";
  if(p.reputation.domestic>=18&&p.overall>=60)return "DOMESTIC XI";
  return "ACADEMY XI";
}
export function fmt(n){return Number(n||0).toLocaleString("en-IN")}
export class Career{
  constructor(){this.player=this.load()}
  load(){
    try{
      let raw=localStorage.getItem(KEY);
      if(!raw){for(const k of OLD_KEYS){raw=localStorage.getItem(k);if(raw)break}}
      if(raw)return mergePlayer(JSON.parse(raw));
    }catch(e){}
    return deepClone(DEFAULT_PLAYER)
  }
  save(){
    const p=this.player;p.overall=calcOverall(p);p.selection=stageFor(p);
    localStorage.setItem(KEY,JSON.stringify(p));
  }
  resetPlayer(data){
    const p=deepClone(DEFAULT_PLAYER);Object.assign(p,data||{});
    if(data?.skills)p.skills={...DEFAULT_PLAYER.skills,...data.skills};
    p.news=[`${p.name} has entered the Academy pathway.`,"Selectors are watching your early performances."];
    this.player=p;this.save()
  }
  train(skill){
    const p=this.player;
    if(p.fitness.injury)return {ok:false,msg:`You are recovering from ${p.fitness.injury}. Rest first.`};
    if(p.energy<18||p.fitness.condition<22)return {ok:false,msg:"Not enough energy/fitness. Recover before another session."};
    p.energy=Math.max(0,p.energy-18);p.fitness.condition=Math.max(0,p.fitness.condition-5);p.fitness.fatigue=Math.min(100,p.fitness.fatigue+8);
    const gain=1+Math.floor(Math.random()*3);p.skills[skill]=Math.min(99,p.skills[skill]+gain);p.form=Math.min(99,p.form+1);p.money=Math.max(0,p.money-20);
    if(p.fitness.fatigue>82&&Math.random()<.08){p.fitness.injury="muscle strain";p.news.unshift("⚠️ Training overload caused a muscle strain. Recovery is required.")}
    else p.news.unshift(`Training report: ${skill} improved by +${gain}.`);
    p.news=p.news.slice(0,10);this.save();return {ok:true,msg:`${skill[0].toUpperCase()+skill.slice(1)} improved by +${gain}.`}
  }
  recover(){const p=this.player;p.energy=Math.min(100,p.energy+38);p.fitness.condition=Math.min(100,p.fitness.condition+20);p.fitness.fatigue=Math.max(0,p.fitness.fatigue-28);if(p.fitness.injury&&Math.random()<.65)p.fitness.injury=null;p.news.unshift("Recovery day complete. Fitness and energy restored.");p.news=p.news.slice(0,10);this.save()}
  applyMatch(result){
    const p=this.player,s=p.stats;
    s.matches++;s.runs+=result.runs;s.balls+=result.balls;s.dismissals+=result.notOut?0:1;s.highScore=Math.max(s.highScore,result.runs);s.wickets+=result.wickets;s.catches+=result.catches;s.sixes+=result.sixes;s.fours+=result.fours;
    if(result.runs>=50&&result.runs<100)s.fifties++;if(result.runs>=100)s.hundreds++;result.win?s.wins++:s.losses++;
    s.average=Number((s.runs/Math.max(1,s.dismissals)).toFixed(2));
    p.season.matches++;p.season.runs+=result.runs;p.season.wins+=result.win?1:0;
    p.money+=result.win?180:70;p.energy=Math.max(10,p.energy-25);p.fitness.condition=Math.max(15,p.fitness.condition-10);p.fitness.fatigue=Math.min(100,p.fitness.fatigue+18);
    p.form=Math.max(20,Math.min(99,p.form+(result.win?4:result.runs>=50?3:-2)));
    this.advanceWorld(result);
    const repGain=result.win?3:result.runs>=50?2:1;p.reputation.local=Math.min(100,p.reputation.local+repGain);if(p.overall>=60)p.reputation.domestic=Math.min(100,p.reputation.domestic+repGain*.55);
    if(p.overall>=70)p.reputation.franchise=Math.min(100,p.reputation.franchise+repGain*.35);if(p.overall>=80&&p.season.wins>=3)p.reputation.international=Math.min(100,p.reputation.international+repGain*.2);
    p.reputation.fans=Math.min(100,p.reputation.fans+(result.win?4:1)+Math.floor(result.runs/50));
    p.relationships.coach=Math.min(100,p.relationships.coach+(result.win?2:result.runs>=50?1:-1));p.relationships.team=Math.min(100,p.relationships.team+(result.win?1:0));
    if(s.matches%5===0){p.level++;p.skills.batting=Math.min(99,p.skills.batting+1);p.skills.mental=Math.min(99,p.skills.mental+1);p.age+=1;p.news.unshift(`🎂 Career milestone: Age ${p.age}. Level ${p.level} reached.`)}
    if(result.runs>=50){p.awards.unshift({title:result.runs>=100?"Century Hero":"Half-Century Impact",detail:`${result.runs} runs vs ${result.opponent}`})}
    if(result.win&&result.runs>=40){p.awards.unshift({title:"Player of the Match",detail:`Match-winning performance vs ${result.opponent}`})}
    if(p.season.matches>=p.season.goalMatches&&p.season.runs>=p.season.goalRuns&&p.season.wins>=p.season.goalWins&&!p.season.goalComplete){p.season.goalComplete=true;p.money+=500;p.awards.unshift({title:`Season ${p.season.number} Goal`,detail:"Performance target completed • ₹500 bonus"});p.news.unshift("🏆 Season objective completed. Selectors are impressed.")}
    if(p.season.matches>=p.season.goalMatches&&p.season.runs>=p.season.goalRuns&&p.season.wins>=p.season.goalWins){this.nextSeason()}
    if(p.fitness.fatigue>88&&Math.random()<.09){p.fitness.injury="ankle knock";p.news.unshift("⚠️ Post-match scan: ankle knock. Recovery recommended.")}
    p.news.unshift(result.win?"🏆 Match win boosts your reputation and selection chances.":"📋 Coaches have added notes to your performance report.");p.news=p.news.slice(0,10);
    p.recent.unshift(result);p.recent=p.recent.slice(0,10);this.save()
  }
  advanceWorld(result){
    const p=this.player,w=p.world;
    w.rival.matches++;w.rival.runs+=Math.max(0,Math.round(18+Math.random()*62+(w.rival.form-60)*.35));
    w.rival.wins+=Math.random()<(.48+(w.rival.form-60)*.006)?1:0;
    w.rival.form=Math.max(35,Math.min(95,w.rival.form+(Math.random()-.42)*5));
    w.league.played++; if(result.win){w.league.wins++;w.league.points+=2}else w.league.losses++;
    w.league.nrr=Number(Math.max(-3,Math.min(4,(w.league.wins*1.18-w.league.losses*.72))).toFixed(2));
    if(p.stats.matches>0 && p.stats.matches%4===0){
      p.news.unshift(`📰 Rival watch: ${w.rival.name} has ${w.rival.runs} runs in ${w.rival.matches} matches this season.`);
    }
  }
  nextSeason(){const p=this.player;p.world.league={points:0,played:0,wins:0,losses:0,nrr:0};p.season={number:p.season.number+1,matches:0,runs:0,wins:0,goalMatches:8+p.season.number*2,goalRuns:250+p.season.number*100,goalWins:4+p.season.number,goalComplete:false};p.news.unshift(`🚀 Season ${p.season.number} begins. New targets are live.`);p.energy=Math.min(100,p.energy+45);p.fitness.condition=Math.min(100,p.fitness.condition+35);p.fitness.fatigue=Math.max(0,p.fitness.fatigue-40)}
  createOffer(){
    const p=this.player;
    const offers=[];
    if(p.overall<60)offers.push({team:"City Warriors",role:"Right Hand Batter",money:1200,level:"Domestic"});
    if(p.overall>=58)offers.push({team:"Capital Strikers",role:"Batting All-Rounder",money:1800,level:"Domestic"});
    if(p.overall>=65)offers.push({team:"Riverside Royals",role:"Opening Batter",money:2600,level:"Franchise"});
    if(p.overall>=75)offers.push({team:"Metro Titans",role:"Top Order All-Rounder",money:4200,level:"Franchise Elite"});
    if(!offers.length)return {team:"Academy XI",role:p.role,money:500,level:"Academy"};
    const idx=p.overall>=75?offers.length-1:p.overall>=65?Math.min(offers.length-1,2):p.overall>=58?Math.min(offers.length-1,1):0;
    return offers[idx]
  }
  acceptOffer(offer){const p=this.player;p.team=offer.team;p.role=offer.role;p.money+=offer.money;p.contract=`${offer.level} Professional Contract`;if(offer.level.includes("Franchise"))p.reputation.franchise=Math.max(p.reputation.franchise,35);p.news.unshift(`✍️ Signed with ${offer.team} on a ${offer.level} deal.`);this.save()}
}
export function playerExists(){return !!(localStorage.getItem(KEY)||localStorage.getItem(OLD_KEYS[0]))}
