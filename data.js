export const TEAMS=[
 {name:"Academy XI",strength:56,color:0x31d98a},
 {name:"City Warriors",strength:61,color:0x4bb4ff},
 {name:"Capital Strikers",strength:66,color:0xffc857},
 {name:"Riverside Royals",strength:72,color:0xff6b8cff},
 {name:"Metro Titans",strength:78,color:0xff6bd6c2}
];
export const PITCHES=[
 {name:"Flat",bat:.12,bowl:-.03,pace:0,spin:-.02,desc:"True bounce • timing is rewarded"},
 {name:"Green",bat:-.08,bowl:.10,pace:.10,spin:-.05,desc:"Seam movement • new ball is dangerous"},
 {name:"Dry",bat:-.03,bowl:.04,pace:-.02,spin:.12,desc:"Slower surface • spin grips"},
 {name:"Slow",bat:-.06,bowl:.06,pace:-.06,spin:.08,desc:"Low pace • placement beats power"}
];
export const CONDITIONS=[
 {name:"Clear",swing:0,dew:0,desc:"Good visibility"},
 {name:"Overcast",swing:.08,dew:0,desc:"Extra movement through the air"},
 {name:"Dew",swing:.02,dew:.10,desc:"Ball gets slippery later"}
];
export const FIELDS={
 attacking:{name:"Attacking",boundary:.05,wicket:.07,runs:-.04,desc:"Close catchers • pressure on batter"},
 balanced:{name:"Balanced",boundary:0,wicket:0,runs:0,desc:"Standard T20 field"},
 defensive:{name:"Defensive",boundary:-.09,wicket:-.035,runs:.08,desc:"Boundary riders • singles allowed"},
 death:{name:"Death",boundary:-.12,wicket:-.01,runs:.11,desc:"Protect the rope"}
};
export const SHOTS={
 defend:{risk:.018,desc:"You get right behind the ball.",timing:.95,attack:.18},
 drive:{risk:.055,desc:"Beautiful front-foot drive.",timing:.88,attack:.52},
 cut:{risk:.07,desc:"You cut it square of the wicket.",timing:.82,attack:.58},
 pull:{risk:.095,desc:"You transfer weight and pull hard.",timing:.78,attack:.72},
 loft:{risk:.15,desc:"You launch the ball into the air.",timing:.68,attack:.95}
};
export const BOWLS={
 yorker:{wicket:.14,runFactor:.72,desc:"A full yorker attacks the base of the stumps."},
 length:{wicket:.085,runFactor:.92,desc:"A disciplined good-length ball."},
 bouncer:{wicket:.105,runFactor:1.03,desc:"A sharp bouncer climbs at the batter."},
 slower:{wicket:.115,runFactor:.82,desc:"A disguised slower ball changes the pace."}
};
export const AI_BATTERS=[
 {name:"Arjun Mehta",bat:67,power:66,mental:72,form:68,role:"Opener",weak:"slower"},
 {name:"Kabir Singh",bat:61,power:74,mental:62,form:64,role:"Aggressive opener",weak:"yorker"},
 {name:"Rohan Das",bat:70,power:58,mental:76,form:70,role:"Anchor",weak:"bouncer"},
 {name:"Dev Malhotra",bat:64,power:78,mental:61,form:65,role:"Finisher",weak:"length"},
 {name:"Ayaan Khan",bat:58,power:71,mental:67,form:63,role:"All-rounder",weak:"slower"},
 {name:"Vikram Rao",bat:55,power:63,mental:69,form:60,role:"Middle order",weak:"yorker"},
 {name:"Neil Sharma",bat:52,power:69,mental:58,form:57,role:"Middle order",weak:"bouncer"},
 {name:"Aditya Roy",bat:48,power:55,mental:61,form:54,role:"Lower order",weak:"slower"},
 {name:"Sameer Paul",bat:44,power:58,mental:56,form:51,role:"All-rounder",weak:"length"},
 {name:"Ishaan Sen",bat:42,power:50,mental:53,form:49,role:"Bowler",weak:"yorker"},
 {name:"Manav Joshi",bat:36,power:45,mental:50,form:46,role:"Bowler",weak:"bouncer"}
];
export const AI_BOWLERS=[
 {name:"Rahul Verma",pace:86,accuracy:76,variation:62,type:"Fast"},
 {name:"Karan Patel",pace:79,accuracy:84,variation:68,type:"Seam"},
 {name:"Samar Khan",pace:91,accuracy:69,variation:71,type:"Fast"},
 {name:"Ritwik Sen",pace:73,accuracy:88,variation:82,type:"Spin/Slow"}
];
