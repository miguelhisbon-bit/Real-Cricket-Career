import {DEFAULT_PLAYER} from "./data.js";

const KEY = "realCricketCareerV1";

export class Career{

  constructor(){
    this.load();
  }

  load(){

    try{
      this.player =
        JSON.parse(localStorage.getItem(KEY))
        || DEFAULT_PLAYER();
    }
    catch{
      this.player = DEFAULT_PLAYER();
    }

    this.recalc();
  }

  save(){
    localStorage.setItem(
      KEY,
      JSON.stringify(this.player)
    );

    this.recalc();
  }

  reset(
    name="Rookie",
    role="Right Hand Batter"
  ){

    this.player = DEFAULT_PLAYER();

    this.player.name =
      name || "Rookie";

    this.player.role =
      role;

    this.save();
  }

  recalc(){

    const s = this.player.skills;

    this.player.overall =
      Math.round(
        s.batting * .30 +
        s.power * .12 +
        s.bowling * .18 +
        s.fielding * .12 +
        s.fitness * .14 +
        s.mental * .14
      );
  }

  gainXP(amount){

    this.player.xp += amount;

    let needed =
      100 + (this.player.level - 1) * 75;

    while(
      this.player.xp >= needed &&
      this.player.level < 20
    ){

      this.player.xp -= needed;
      this.player.level++;
      this.player.reputation += 5;

      needed =
        100 + (this.player.level - 1) * 75;
    }

    this.player.energy =
      Math.max(0,this.player.energy);

    this.save();
  }

  train(skill){

    if(this.player.energy < 12){

      return {
        ok:false,
        msg:"Not enough energy. Rest between matches."
      };
    }

    this.player.energy -= 12;

    const gain =
      1 + Math.floor(Math.random()*3);

    this.player.skills[skill] =
      Math.min(
        99,
        this.player.skills[skill] + gain
      );

    this.player.form =
      Math.min(
        100,
        this.player.form + 1
      );

    this.gainXP(15);

    return {
      ok:true,
      msg:
        skill[0].toUpperCase() +
        skill.slice(1) +
        " +" +
        gain
    };
  }

  recover(){

    this.player.energy =
      Math.min(
        100,
        this.player.energy + 25
      );

    this.player.form =
      Math.max(
        0,
        this.player.form - 1
      );

    this.save();
  }

  finishMatch(result){

    const p = this.player;

    p.stats.matches++;

    p.stats.runs += result.runs;

    p.stats.balls += result.balls;

    p.stats.wickets += result.wickets;

    p.stats.catches += result.catches;

    p.stats.highScore =
      Math.max(
        p.stats.highScore,
        result.runs
      );

    if(result.runs >= 100){
      p.stats.hundreds++;
    }
    else if(result.runs >= 50){
      p.stats.fifties++;
    }

    if(result.win){
      p.stats.wins++;
    }

    p.form =
      Math.max(
        0,
        Math.min(
          100,
          p.form +
          (result.runs >= 30 ? 7 : -4)
        )
      );

    p.energy =
      Math.max(
        0,
        p.energy -
        result.balls * .18 -
        10
      );

    p.money +=
      result.win ? 350 : 150;

    p.news.unshift({
      title:
        result.win
        ? "Victory!"
        : "Match completed",

      text:
        `${p.name} scored ${result.runs} from ` +
        `${result.balls} balls. ` +
        `${result.wickets} wicket(s).`,

      tag:
        result.win
        ? "WIN"
        : "MATCH"
    });

    p.news =
      p.news.slice(0,12);

    this.gainXP(
      40 + result.runs
    );

    this.updateTeam();

    this.save();
  }

  updateTeam(){

    const p = this.player;

    if(
      p.overall >= 78 &&
      p.level >= 10
    ){

      p.team = "World XI";
      p.level =
        Math.max(p.level,4);

    }
    else if(
      p.overall >= 68 &&
      p.level >= 6
    ){

      p.team =
        "Bangladesh Tigers";

      p.level =
        Math.max(p.level,3);

    }
    else if(
      p.overall >= 60 &&
      p.level >= 3
    ){

      p.team =
        "Dhaka Warriors";

      p.level =
        Math.max(p.level,2);
    }
  }

  contractOffer(){

    const p = this.player;

    const salary =
      500 +
      p.overall * 25 +
      p.reputation * 10;

    return {
      name:
        p.team +
        " Professional Contract",

      salary,

      remaining:12
    };
  }
}

export function fmt(n){

  return new Intl.NumberFormat()
    .format(Math.round(n));
}
