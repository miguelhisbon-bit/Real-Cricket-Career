export const TEAMS = [
  {
    id:"academy",
    name:"Academy XI",
    country:"Bangladesh",
    level:1
  },
  {
    id:"dhaka",
    name:"Dhaka Warriors",
    country:"Bangladesh",
    level:2
  },
  {
    id:"tigers",
    name:"Bangladesh Tigers",
    country:"Bangladesh",
    level:3
  },
  {
    id:"world",
    name:"World XI",
    country:"International",
    level:4
  }
];

export const STADIUMS = [
  {
    name:"Green Valley Cricket Ground",
    pitch:"balanced",
    capacity:18000
  },
  {
    name:"National Cricket Arena",
    pitch:"flat",
    capacity:42000
  },
  {
    name:"Riverside Stadium",
    pitch:"spin",
    capacity:26000
  }
];

export const ATTRIBUTES = {
  batting:55,
  power:48,
  bowling:32,
  fielding:48,
  fitness:58,
  mental:50
};

export const TOURNAMENTS = [
  {
    name:"Academy T20",
    level:1,
    format:"T20"
  },
  {
    name:"Domestic T20",
    level:2,
    format:"T20"
  },
  {
    name:"National One Day",
    level:3,
    format:"ODI"
  },
  {
    name:"World Cup",
    level:4,
    format:"ODI"
  }
];

export const DEFAULT_PLAYER = () => ({
  name:"Rookie",
  age:18,
  role:"Right Hand Batter",
  team:"Academy XI",
  overall:55,
  energy:100,
  form:50,
  reputation:0,
  money:500,
  level:1,
  xp:0,

  skills:{
    ...ATTRIBUTES
  },

  stats:{
    matches:0,
    runs:0,
    balls:0,
    fifties:0,
    hundreds:0,
    highScore:0,
    wickets:0,
    catches:0,
    wins:0
  },

  recent:[],

  news:[
    {
      title:"Career begins",
      text:"Your academy journey has started. Train hard and earn your first selection.",
      tag:"START"
    }
  ],

  contract:{
    name:"Academy Rookie",
    salary:500,
    remaining:8
  }
});
