export const TEAMS=[
 {name:"Academy XI",strength:56,color:0x31d98a,kit:{jersey:0x31d98a,pants:0x1a1a2e}},
 {name:"City Warriors",strength:61,color:0x4bb4ff,kit:{jersey:0x4bb4ff,pants:0x0d1b2a}},
 {name:"Capital Strikers",strength:66,color:0xffc857,kit:{jersey:0xffc857,pants:0x1a1a2e}},
 {name:"Riverside Royals",strength:59,color:0xff6b8c,kit:{jersey:0xff6b8c,pants:0x1a1a2e}}
];

export const SHOTS={
 defend:{risk:.018,desc:"You get right behind the ball.",timing:.95,attack:.18},
 drive:{risk:.055,desc:"Beautiful front-foot drive.",timing:.88,attack:.52},
 cut:{risk:.07,desc:"You cut it square of the wicket.",timing:.82,attack:.58},
 pull:{risk:.095,desc:"You transfer weight and pull hard.",timing:.78,attack:.72},
 loft:{risk:.15,desc:"You launch the ball into the air.",timing:.68,attack:.95}
};

export const BOWLS={
 yorker:{wicket:.14,runFactor:.72,desc:"A full yorker attacks the base of the stumps.",pressure:.9},
 length:{wicket:.085,runFactor:.92,desc:"A disciplined good-length ball.",pressure:.7},
 bouncer:{wicket:.105,runFactor:1.03,desc:"A sharp bouncer climbs at the batter.",pressure:.78},
 slower:{wicket:.115,runFactor:.82,desc:"A disguised slower ball changes the pace.",pressure:.84}
};

export const AI_BATTERS=[
 {name:"Arjun Mehta",bat:67,power:66,mental:72,form:68,role:"Opener",personality:"anchor"},
 {name:"Kabir Singh",bat:61,power:74,mental:62,form:64,role:"Aggressive opener",personality:"aggressive"},
 {name:"Rohan Das",bat:70,power:58,mental:76,form:70,role:"Anchor",personality:"anchor"},
 {name:"Dev Malhotra",bat:64,power:78,mental:61,form:65,role:"Finisher",personality:"aggressive"},
 {name:"Ayaan Khan",bat:58,power:71,mental:67,form:63,role:"All-rounder",personality:"balanced"},
 {name:"Vikram Rao",bat:55,power:63,mental:69,form:60,role:"Middle order",personality:"anchor"},
 {name:"Neil Sharma",bat:52,power:69,mental:58,form:57,role:"Middle order",personality:"innovator"},
 {name:"Aditya Roy",bat:48,power:55,mental:61,form:54,role:"Lower order",personality:"balanced"},
 {name:"Sameer Paul",bat:44,power:58,mental:56,form:51,role:"All-rounder",personality:"balanced"},
 {name:"Ishaan Sen",bat:42,power:50,mental:53,form:49,role:"Bowler",personality:"balanced"},
 {name:"Manav Joshi",bat:36,power:45,mental:50,form:46,role:"Bowler",personality:"balanced"}
];

export const AI_BOWLERS=[
 {name:"Rahul Verma",pace:86,accuracy:76,variation:62,personality:"aggressive"},
 {name:"Karan Patel",pace:79,accuracy:84,variation:68,personality:"anchor"},
 {name:"Samar Khan",pace:91,accuracy:69,variation:71,personality:"aggressive"},
 {name:"Ritwik Sen",pace:73,accuracy:88,variation:82,personality:"innovator"}
];

// Weather conditions
export const WEATHERS = [
 {name:"Sunny",icon:"☀️",swing:0.8,spin:0.9,batting:1.0,color:"#ffd15c"},
 {name:"Overcast",icon:"☁️",swing:1.4,spin:0.8,batting:0.9,color:"#8da7b5"},
 {name:"Cloudy",icon:"⛅",swing:1.1,spin:0.9,batting:0.95,color:"#b8ccd5"},
 {name:"Dew",icon:"💧",swing:0.6,spin:0.7,batting:1.15,color:"#4db8ff"}
];

export const PERSONALITIES = {
  aggressive: { riskBonus: 0.08, powerBonus: 5, timingPenalty: -3, label:"🔥 Aggressive" },
  anchor: { riskPenalty: 0.05, timingBonus: 8, powerPenalty: -5, label:"🛡️ Anchor" },
  innovator: { unorthodoxChance: 0.15, timingBonus: 4, riskBonus: 0.04, label:"🎯 Innovator" },
  finisher: { pressureBoost: 10, clutchFactor: 0.12, label:"💪 Finisher" },
  balanced: { label:"⚖️ Balanced" }
};
