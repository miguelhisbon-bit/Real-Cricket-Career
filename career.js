const KEY="rcc_career_v3";
const OLD_KEYS=["rcc_career_v2"];
const CLUBS=[
 {name:"Academy XI",level:"Academy",strength:56,wage:300},
 {name:"City Warriors",level:"Domestic",strength:61,wage:1200},
 {name:"Capital Strikers",level:"Domestic",strength:66,wage:1800},
 {name:"Riverside Royals",level:"Franchise",strength:72,wage:2800},
 {name:"Metro Titans",level:"Franchise Elite",strength:78,wage:4300},
 {name:"National XI",level:"International",strength:84,wage:7000}
];
const DEFAULT_TABLE=CLUBS.slice(1,5).map(c=>({team:c.name,p:0,w:0,l:0,pts:0,nrr:0}));
const DEFAULT_PLAYER={
 name:"Rookie",age:18,role:"Right Hand Batter",team:"Academy XI",level:1,overall:55,form:60,money:500,
 energy:100,contract:"Academy Scholarship",contractYears:1,wage:0,selection:"Academy XI",squadRole:"Prospect",morale:72,
 skills:{batting:58,power:52,bowling:45,fielding:55,fitness:62,mental:58},
 stats:{matches:0,runs:0,balls:0,dismissals:0,highScore:0,wickets:0,wins:0,losses:0,ties:0,fifties:0,hundreds:0,catches:0,sixes:0,fours:0,average:0,strikeRate:0,bestBowling:"0/0"},
 reputation:{local:12,domestic:0,franchise:0,international:0,fans:35},
 fitness:{condition:92,fatigue:0,injury:null},
 season:{number:1,matches:0,runs:0,wins:0,goalMatches:8,goalRuns:250,goalWins:4,goalComplete:false},
 awards:[],relationships:{coach:62,captain:55,team:58},
 world:{rival:{name:"Rohan Das",runs:0,matches:0,wins:0,form:61},league:{points:0,played:0,wins:0,losses:0,ties:0,nrr:0},table:DEFAULT_TABLE,fixtures:[],transferOffers:[],contractHistory:[]},
 recent:[],news:["Welcome to Academy XI. Your professional journey starts now.","Selectors have added you to the Academy watchlist."]
};
function deepClone(x){return JSON.parse(JSON.stringify(x))}
function mergePlayer(raw){
 const p={...deepClone(DEFAULT_PLAYER),...raw};
 p.skills={...DEFAULT_PLAYER.skills,...(raw?.skills||{})};
 p.stats={...DEFAULT_PLAYER.stats,...(raw?.stats||{})};
 p.reputation={...DEFAULT_PLAYER.reputation,...(raw?.reputation||{})};p.fitness={...DEFAULT_PLAYER.fitness,...(raw?.fitness||{})};
 p.season={...DEFAULT_PLAYER.season,...(raw?.season||{})};p.relationships={...DEFAULT_PLAYER.relationships,...(raw?.relationships||{})};
 p.world={...DEFAULT_PLAYER.world,...(raw?.world||{}),rival:{...DEFAULT_PLAYER.world.rival,...(raw?.world?.rival||{})},league:{...DEFAULT_PLAYER.world.league,...(raw?.world?.league||{})}};
 p.world.table=(raw?.world?.table?.length?raw.world.table:deepClone(DEFAULT_TABLE));p.world.fixtures=[...(raw?.world?.fixtures||[])];p.world.transferOffers=[...(raw?.world?.transferOffers||[])];p.world.contractHistory=[...(raw?.world?.contractHistory||[])];
 p.awards=[...(raw?.awards||[])];p.recent=[...(raw?.recent||[])];p.news=[...(raw?.news||DEFAULT_PLAYER.news)];return p;
}
function calcOverall(p){const s=p.skills;return Math.round(s.batting*.30+s.power*.15+s.bowling*.20+s.fielding*.12+s.fitness*.10+s.mental*.13)}
function stageFor(p){if(p.reputation.international>=35&&p.overall>=78)return "INTERNATIONAL XI";if(p.reputation.franchise>=30&&p.overall>=68)return "FRANCHISE XI";if(p.reputation.domestic>=18&&p.overall>=60)return "DOMESTIC XI";return "ACADEMY XI"}
function club(name){return CLUBS.find(c=>c.name===name)||CLUBS[0]}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
export function fmt(n){return Number(n||0).toLocaleString("en-IN")}
export class Career{
 constructor(){this.player=this.load();this.ensureCareerWorld();this.save()}
 load(){try{let raw=localStorage.getItem(KEY);if(!raw)for(const k of OLD_KEYS){raw=localStorage.getItem(k);if(raw)break}if(raw)return mergePlayer(JSON.parse(raw))}catch(e){}return deepClone(DEFAULT_PLAYER)}
 ensureCareerWorld(){const p=this.player;p.world=p.world||deepClone(DEFAULT_PLAYER.world);if(!p.world.table?.length)p.world.table=deepClone(DEFAULT_TABLE);if(!p.world.table.some(x=>x.team===p.team))p.world.table.push({team:p.team,p:0,w:0,l:0,pts:0,nrr:0});if(!p.world.fixtures?.length)this.generateFixtures();p.overall=calcOverall(p);p.selection=stageFor(p)}
 save(){const p=this.player;p.overall=calcOverall(p);p.selection=stageFor(p);try{localStorage.setItem(KEY,JSON.stringify(p))}catch(e){console.warn(e)}}
 resetPlayer(data){const p=deepClone(DEFAULT_PLAYER);Object.assign(p,data||{});if(data?.skills)p.skills={...DEFAULT_PLAYER.skills,...data.skills};p.news=[`${p.name} has entered the Academy pathway.`,"Selectors are watching your early performances."];this.player=p;this.ensureCareerWorld();this.save()}
 train(skill){const p=this.player;if(p.fitness.injury)return{ok:false,msg:`You are recovering from ${p.fitness.injury}. Rest first.`};if(p.energy<18||p.fitness.condition<22)return{ok:false,msg:"Not enough energy/fitness. Recover before another session."};p.energy=Math.max(0,p.energy-18);p.fitness.condition=Math.max(0,p.fitness.condition-5);p.fitness.fatigue=Math.min(100,p.fitness.fatigue+8);const gain=1+Math.floor(Math.random()*3);p.skills[skill]=Math.min(99,p.skills[skill]+gain);p.form=Math.min(99,p.form+1);p.morale=clamp(p.morale+1,0,100);p.money=Math.max(0,p.money-20);if(p.fitness.fatigue>82&&Math.random()<.08){p.fitness.injury="muscle strain";p.news.unshift("⚠️ Training overload caused a muscle strain. Recovery is required.")}else p.news.unshift(`Training report: ${skill} improved by +${gain}.`);p.news=p.news.slice(0,10);this.save();return{ok:true,msg:`${skill[0].toUpperCase()+skill.slice(1)} improved by +${gain}.`}}
 recover(){const p=this.player;p.energy=Math.min(100,p.energy+38);p.fitness.condition=Math.min(100,p.fitness.condition+20);p.fitness.fatigue=Math.max(0,p.fitness.fatigue-28);p.morale=clamp(p.morale+2,0,100);if(p.fitness.injury&&Math.random()<.65)p.fitness.injury=null;p.news.unshift("Recovery day complete. Fitness and energy restored.");p.news=p.news.slice(0,10);this.save()}
 generateFixtures(){const p=this.player,teams=DEFAULT_TABLE.map(x=>x.team);p.world.fixtures=[];for(let i=0;i<12;i++){const opp=teams[i%teams.length];p.world.fixtures.push({round:i+1,opponent:opp,status:"UPCOMING",venue:i%2?"AWAY":"HOME"})}}
 getNextFixture(){this.ensureCareerWorld();return this.player.world.fixtures.find(f=>f.status==="UPCOMING")||null}
 updateTable(result){const p=this.player,w=p.world,l=w.league;const row=w.table.find(x=>x.team===p.team)||w.table[0];if(row){row.p++;if(result.win){row.w++;row.pts+=2}else if(result.tie){row.pts+=1}else row.l++;row.nrr=Number((row.nrr+(result.win?.45:-.28)+(result.runs-result.aiScore)*.01).toFixed(2))}w.table.sort((a,b)=>b.pts-a.pts||b.nrr-a.nrr)}
 applyMatch(result){
  const p=this.player,s=p.stats,l=p.world.league;s.matches++;s.runs+=result.runs;s.balls+=result.balls;s.dismissals+=result.notOut?0:1;s.highScore=Math.max(s.highScore,result.runs);s.wickets+=result.wickets;s.catches+=result.catches;s.sixes+=result.sixes;s.fours+=result.fours;
  if(result.runs>=50&&result.runs<100)s.fifties++;if(result.runs>=100)s.hundreds++;if(result.tie){s.ties++;l.ties++}else if(result.win){s.wins++;l.wins++}else s.losses++;
  s.average=Number((s.runs/Math.max(1,s.dismissals)).toFixed(2));s.strikeRate=Number((s.runs/Math.max(1,s.balls)*100).toFixed(2));
  p.season.matches++;p.season.runs+=result.runs;if(result.win)p.season.wins++;
  p.money+=result.win?180:result.tie?120:70;p.energy=Math.max(10,p.energy-25);p.fitness.condition=Math.max(15,p.fitness.condition-10);p.fitness.fatigue=Math.min(100,p.fitness.fatigue+18);p.form=clamp(p.form+(result.win?4:result.tie?1:result.runs>=50?3:-2),20,99);p.morale=clamp(p.morale+(result.win?4:result.tie?1:-2),0,100);
  l.played++;if(result.win)l.points+=2;else if(result.tie)l.points+=1;l.nrr=Number(clamp((l.wins*1.18-l.losses*.72+(result.runs-result.aiScore)*.01),-5,5).toFixed(2));this.updateTable(result);
  const fixture=this.getNextFixture();if(fixture){fixture.status=result.win?"WON":result.tie?"TIED":"LOST";fixture.result=`${result.runs}/${result.aiScore}`}
  this.advanceWorld(result);
  const repGain=result.win?3:result.runs>=50?2:1;p.reputation.local=clamp(p.reputation.local+repGain,0,100);if(p.overall>=60)p.reputation.domestic=clamp(p.reputation.domestic+repGain*.55,0,100);if(p.overall>=70)p.reputation.franchise=clamp(p.reputation.franchise+repGain*.35,0,100);if(p.overall>=80&&p.season.wins>=3)p.reputation.international=clamp(p.reputation.international+repGain*.2,0,100);p.reputation.fans=clamp(p.reputation.fans+(result.win?4:1)+Math.floor(result.runs/50),0,100);
  p.relationships.coach=clamp(p.relationships.coach+(result.win?2:result.runs>=50?1:-1),0,100);p.relationships.team=clamp(p.relationships.team+(result.win?1:0),0,100);
  if(s.matches%5===0){p.level++;p.skills.batting=Math.min(99,p.skills.batting+1);p.skills.mental=Math.min(99,p.skills.mental+1);p.age+=1;p.news.unshift(`🎂 Career milestone: Age ${p.age}. Level ${p.level} reached.`)}
  if(result.runs>=50)p.awards.unshift({title:result.runs>=100?"Century Hero":"Half-Century Impact",detail:`${result.runs} runs vs ${result.opponent}`});if(result.win&&result.runs>=40)p.awards.unshift({title:"Player of the Match",detail:`Match-winning performance vs ${result.opponent}`});
  if(p.season.matches>=p.season.goalMatches&&p.season.runs>=p.season.goalRuns&&p.season.wins>=p.season.goalWins&&!p.season.goalComplete){p.season.goalComplete=true;p.money+=500;p.awards.unshift({title:`Season ${p.season.number} Goal`,detail:"Performance target completed • ₹500 bonus"});p.news.unshift("🏆 Season objective completed. Selectors are impressed.")}
  if(p.season.matches>=p.season.goalMatches&&p.season.runs>=p.season.goalRuns&&p.season.wins>=p.season.goalWins)this.nextSeason();
  if(p.fitness.fatigue>88&&Math.random()<.09){p.fitness.injury="ankle knock";p.news.unshift("⚠️ Post-match scan: ankle knock. Recovery recommended.")}
  this.generateTransferOffers();p.news.unshift(result.tie?"🤝 Match tied. A point keeps the campaign alive.":result.win?"🏆 Match win boosts your reputation and transfer value.":"📋 Coaches have added notes to your performance report.");p.news=p.news.slice(0,10);p.recent.unshift({...result});p.recent=p.recent.slice(0,10);this.save()
 }
 advanceWorld(result){const p=this.player,w=p.world;w.rival.matches++;w.rival.runs+=Math.max(0,Math.round(18+Math.random()*62+(w.rival.form-60)*.35));w.rival.wins+=Math.random()<(.48+(w.rival.form-60)*.006)?1:0;w.rival.form=clamp(w.rival.form+(Math.random()-.42)*5,35,95);if(p.stats.matches>0&&p.stats.matches%4===0)p.news.unshift(`📰 Rival watch: ${w.rival.name} has ${w.rival.runs} runs in ${w.rival.matches} matches this season.`)}
 nextSeason(){const p=this.player;if(p.wage)p.money+=p.wage;if(p.contractYears>0)p.contractYears--;if(p.contractYears===0&&p.contract!=="Academy Scholarship"){p.news.unshift(`📄 Contract expired with ${p.team}. You are now a free agent.`);p.contract="Free Agent";p.squadRole="Free Agent";p.wage=0}p.world.league={points:0,played:0,wins:0,losses:0,ties:0,nrr:0};p.world.table=deepClone(DEFAULT_TABLE);if(!p.world.table.some(x=>x.team===p.team))p.world.table.push({team:p.team,p:0,w:0,l:0,pts:0,nrr:0});p.world.fixtures=[];this.generateFixtures();p.world.rival.runs=0;p.world.rival.matches=0;p.world.rival.wins=0;p.season={number:p.season.number+1,matches:0,runs:0,wins:0,goalMatches:8+p.season.number*2,goalRuns:250+p.season.number*100,goalWins:4+p.season.number,goalComplete:false};p.news.unshift(`🚀 Season ${p.season.number} begins. New targets are live.`);p.energy=Math.min(100,p.energy+45);p.fitness.condition=Math.min(100,p.fitness.condition+35);p.fitness.fatigue=Math.max(0,p.fitness.fatigue-40)}
 transferValue(){const p=this.player;return Math.round(p.overall*45+p.form*20+p.reputation.franchise*25+p.reputation.international*40+(p.age<24?500:0))}
 generateTransferOffers(){const p=this.player;if(p.team==="Academy XI"&&p.overall<58)return;const pool=CLUBS.filter(c=>c.name!==p.team&&c.strength<=p.overall+18&&c.strength>=p.overall-4);p.world.transferOffers=pool.slice(0,3).map(c=>({id:`${c.name}-${p.season.number}`,team:c.name,level:c.level,wage:Math.max(c.wage,Math.round(p.overall*38)),bonus:Math.round(c.wage*1.5),years:p.overall>=72?3:2,role:p.overall>=70?"First XI":p.overall>=62?"Rotation":"Prospect",value:this.transferValue()}))}
 getTransferOffers(){this.generateTransferOffers();return this.player.world.transferOffers}
 acceptTransfer(offer){const p=this.player,c=club(offer.team);p.world.contractHistory.unshift({team:p.team,joined:new Date().toISOString(),left:offer.team});p.team=c.name;p.contract=`${offer.level} Professional Contract`;p.contractYears=offer.years;p.wage=offer.wage;p.squadRole=offer.role;p.money+=offer.bonus;p.morale=clamp(p.morale+8,0,100);p.reputation.franchise=Math.max(p.reputation.franchise,c.level.includes("Franchise")?35:p.reputation.franchise);p.news.unshift(`✈️ TRANSFER COMPLETE: ${offer.team} signed ${p.name} for ${offer.years} years.`);p.world.transferOffers=[];this.generateFixtures();this.save()}
 createOffer(){const p=this.player;if(p.contract!=="Academy Scholarship"){const c=club(p.team);return{team:p.team,role:p.squadRole,money:p.wage||c.wage,level:c.level}}const offers=this.getTransferOffers();return offers[0]||{team:"Academy XI",role:p.role,money:500,level:"Academy"}}
 acceptOffer(offer){if(offer?.team&&offer.team!==this.player.team)this.acceptTransfer({...offer,years:offer.years||2,wage:offer.wage||offer.money||1000,bonus:offer.bonus||offer.money||500});}
}
export function playerExists(){return!!(localStorage.getItem(KEY)||localStorage.getItem(OLD_KEYS[0]))}
