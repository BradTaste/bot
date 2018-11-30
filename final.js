/*
Version 0.2 updated Nov 25, 2018.
This script will bruteforce a live match from the TPP API
in Defiance mode and estimate winrates.
Requirements:
-An oauth for the TPP API: https://twitchplayspokemon.tv/show_oauth_token
-Node.js: https://nodejs.org/en/download/
-sync-request for Node.js: `npm install -g sync-request` (NPM should come installed with Node.js)
-Pokemon Showdown: https://github.com/Zarel/Pokemon-Showdown
You don't need to install its dependencies, the simulator itself does not require them.
-My PBR mod for Pokemon Showdown: https://github.com/mathfreak231/random-showdown-mods
This is required to accurately simulate PBR. Note that it is still in development.
Setup steps:
Copy the pbr directory from random-showdown-mods into Pokemon-Showdown/mods.
Fill in the relative path to Pokemon-Showdown/sim below
Fill in your TPP API oauth token below
Change the number constants if you wish
Then just `node defiancechan.js`, sit back, and enjoy your simulation!
Note that the PBR mod is *not* entirely accurate. Known inaccuracies include,
but are not limited to: draws are not handled properly, and Fury Cutter
still resets when it shouldn't.
*/

// Replace this with a relative path to Pokemon-Showdown/sim
const Sim = require('/Users/bradleylehmann/Documents/Pokemon-Showdown-master/sim');

// Replace this with your TPP oauth token
const TPP_OAUTH = "2uwmqexek5648pj9987pc1l1lh5ezg";

//turn off cosmetics
const cosmetics = true;

// z* for your desired confidence level. This is used to calculate
// the margin of sampling error. Some common values:
// For 95% confidence: 1.959963986
// For 99% confidence: 2.575829303
// In practice this means that C% of your simulations will
// have the true proportion within the margin of error from
// the sampled proportion.
// If you don't know what any of this means, don't bother changing
// or paying attention to the "Margin of error" output at the end.
const Z_STAR = 2.575829303;
const Z_Star_Round = Z_STAR.toFixed(3)

// Maximum time to run the simulation for, in milliseconds.
const MAX_TIME = 30000;

// If this is true, it prints some match logs (1 in DEBUG_EVERY) to stdout while it's bashing them.
const DEBUG = false;
const DEBUG_EVERY = 100;

// Set this to require a .json file to bash a match there instead of a live match.
const TEST_MATCH_PATH = null;

/////////////////////////////////////////
// DON'T EDIT ANYTHING BELOW THIS LINE //
/////////////////////////////////////////
const request = require('sync-request');

const PBR_FORMAT = {
  id: 'tppbr',
  name: 'TPPBR',
  mod: 'pbr',
  ruleset: ["PBR Sleep Clause", "PBR Freeze Clause", "PBR Self-Destruct Clause", "PBR Destiny Bond Clause"],
  banlist: [],
  unbanlist: [],
  debug: true,
}


var finalBet
var moveTies = [];
var moveAcc = [];

//2 teams
//3 best move indexes
//3 moves
var bestMove = [[null,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]];



//IMPORT JQUERY
var jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;

var $ = jQuery = require('jquery')(window);

//COLORS
var colors = require('colors');
colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});

function doFirst(){
	//console.log("Getting current match...");
  let match;
  if (TEST_MATCH_PATH) {
    match = require(TEST_MATCH_PATH);
  } else {
    const res = request('GET', "https://twitchplayspokemon.tv/api/current_match", {
      headers: {
        'OAuth-Token': TPP_OAUTH
      },
    });
    match = JSON.parse(res.getBody('utf8'));
  }



  //////
  if ((match.base_gimmicks.includes('blind_bet') || match.base_gimmicks.includes('secrecy')) && !match.started) {
    throw new Error("Can't analyze a match unless all the Pokemon have been revealed.");
  }
  let betconf = 100;
  const startTime = Date.now();
  let wincounter = {
    Blue: 0,
    Red: 0,
  };
  let drawCount = 0;
  let teams = [[], []];
  for (let i = 0; i < teams.length; i++) {
    for (const pokemon of match.teams[i]) {
      teams[i].push({
        name: pokemon.ingamename,
        species: pokemon.species.name, // TODO: handle forms
        item: pokemon.item.name,
        ability: pokemon.ability.name,
        moves: pokemon.moves.map(move => move.name),
        nature: pokemon.nature.name,
        gender: pokemon.gender ? pokemon.gender.toUpperCase() : 'N',
        evs: convert_stats_table(pokemon.evs),
        ivs: convert_stats_table(pokemon.ivs),
        level: pokemon.level,
        shiny: pokemon.shiny,
        happiness: pokemon.happiness,
      });
    }
    //console.log(teams)
    
  }
  for(q = 0; q< 2; q++){
	for(b = 0; b< 3; b++){
	  for(j = 0; j< 4; j++){
	  	if(match.teams[q][b].moves[j] != null){	
	  		moveTies.push(match.teams[q][b].moves[j])
	  		moveAcc.push(match.teams[q][b].moves[j].accuracy)
		}
	  }
	}
	}
}
doFirst();

//GET MATCH FOR VIS
function pingCurrentMatch(){
		$.ajax({
		type: "GET",
		url: "https://twitchplayspokemon.tv/api/matches/"+match_id,
		dataType: 'json',
		async: true,
		success: function (data){
			match_showing = false
		},
		error: function(){
			match_showing = true
		}
		});
	}

function LoadNewMatch(){

		teams = data.teams;
		for(j=0;j<2;j++){
			for(i=0;i<3;i++){
				StatModArr.push([0,0,0,0,0,teams[j][i].stats.hp]);
			}
		}

		getDamage();
		fillentries();
		match_id = data.id;
		}

function spemodToMultiplier(mod,ability){
		if(ability !== 'Simple'){
			if(mod < 0){
				return (2)/(2-(mod));
			}
			else if(mod == 0){
				return 1;
			}
			else if(mod >= 1){
				return ((2+mod)/2);
			}
		}
		else if(ability == 'Simple'){
			if(mod > 3){
				mod = 3
			}
			else if (mod < -3){
				mod = -3
			}
			if(mod < 0){
				return (2)/(2-(2*mod));
			}
			else if(mod == 0){
				return 1;
			}
			else if(mod >= 1){
				return ((2+2*mod)/2);
			}
		}
	}

	function ModToMultiplier(mod,selfability,foeability){
		if(foeability !== 'Unaware'){
			if(selfability !== 'Simple'){
				if(mod < 0){
					return (2)/(2-(mod));
				}
				else if(mod == 0){
					return 1;
				}
				else if(mod >= 1){
					return ((2+mod)/2);
				}
			}
			else if(selfability == 'Simple'){
				if(mod > 3){
					mod = 3
				}
				else if (mod < -3){
					mod = -3
				}
				if(mod < 0){
					return (2)/(2-(2*mod));
				}
				else if(mod == 0){
					return 1;
				}
				else if(mod >= 1){
					return ((2+2*mod)/2);
				}
			}
		}
		else {
			return 1;
		}
	}
/**
  * because pokecat TriHard
  */
function convert_stats_table(stats) {
  let newstats = {};
  for (statname in stats) {
    newstats[statname.toLowerCase()] = stats[statname];
  }
  return newstats;
}



	var trickRoom
	trickRoom = false
	var gravity
	gravity = false

	$('#bgtoggle').on("click", function(){
		bgtoggle();
	});

	typeIndices = {'Normal': 0, 'Fighting': 1, 'Flying': 2, 'Poison': 3,
					'Ground': 4, 'Rock': 5, 'Bug': 6, 'Ghost': 7, 'Steel': 8,
					'Fire': 9, 'Water': 10, 'Grass': 11, 'Electric': 12,
					'Psychic': 13, 'Ice': 14, 'Dragon': 15, 'Dark': 16, 'None': 17}
	typeChart = [[1.00,	1.00, 1.00, 1.00, 1.00, 0.50, 1.00, 0.00, 0.50, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00],
				[2.00, 1.00, 0.50, 0.50, 1.00, 2.00, 0.50, 0.00, 2.00, 1.00, 1.00, 1.00, 1.00, 0.50, 2.00, 1.00, 2.00, 1.00],
				[1.00, 2.00, 1.00, 1.00, 1.00, 0.50, 2.00, 1.00, 0.50, 1.00, 1.00, 2.00, 0.50, 1.00, 1.00, 1.00, 1.00, 1.00],
				[1.00, 1.00, 1.00, 0.50, 0.50, 0.50, 1.00, 0.50, 0.00, 1.00, 1.00, 2.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00],
				[1.00, 1.00, 0.00, 2.00, 1.00, 2.00, 0.50, 1.00, 2.00, 2.00, 1.00, 0.50, 2.00, 1.00, 1.00, 1.00, 1.00, 1.00],
				[1.00, 0.50, 2.00, 1.00, 0.50, 1.00, 2.00, 1.00, 0.50, 2.00, 1.00, 1.00, 1.00, 1.00, 2.00, 1.00, 1.00, 1.00],
				[1.00, 0.50, 0.50, 0.50, 1.00, 1.00, 1.00, 0.50, 0.50, 0.50, 1.00, 2.00, 1.00, 2.00, 1.00, 1.00, 2.00, 1.00],
				[0.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 2.00, 0.50, 1.00, 1.00, 1.00, 1.00, 2.00, 1.00, 1.00, 0.50, 1.00],
				[1.00, 1.00, 1.00, 1.00, 1.00, 2.00, 1.00, 1.00, 0.50, 0.50, 0.50, 1.00, 0.50, 1.00, 2.00, 1.00, 1.00, 1.00],
				[1.00, 1.00, 1.00, 1.00, 1.00, 0.50, 2.00, 1.00, 2.00, 0.50, 0.50, 2.00, 1.00, 1.00, 2.00, 0.50, 1.00, 1.00],
				[1.00, 1.00, 1.00, 1.00, 2.00, 2.00, 1.00, 1.00, 1.00, 2.00, 0.50, 0.50, 1.00, 1.00, 1.00, 0.50, 1.00, 1.00],
				[1.00, 1.00, 0.50, 0.50, 2.00, 2.00, 0.50, 1.00, 0.50, 0.50, 2.00, 0.50, 1.00, 1.00, 1.00, 0.50, 1.00, 1.00],
				[1.00, 1.00, 2.00, 1.00, 0.00, 1.00, 1.00, 1.00, 1.00, 1.00, 2.00, 0.50, 0.50, 1.00, 1.00, 0.50, 1.00, 1.00],
				[1.00, 2.00, 1.00, 2.00, 1.00, 1.00, 1.00, 1.00, 0.50, 1.00, 1.00, 1.00, 1.00, 0.50, 1.00, 1.00, 0.00, 1.00],
				[1.00, 1.00, 2.00, 1.00, 2.00, 1.00, 1.00, 1.00, 0.50, 0.50, 0.50, 2.00, 1.00, 1.00, 0.50, 2.00, 1.00, 1.00],
				[1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 0.50, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 2.00, 1.00, 1.00],
				[1.00, 0.50, 1.00, 1.00, 1.00, 1.00, 1.00, 2.00, 0.50, 1.00, 1.00, 1.00, 1.00, 2.00, 1.00, 1.00, 0.50, 1.00],
				[1.00,	1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00]]

	RecoilMoves = ['Double-Edge','Brave Bird','Wood Hammer','Flare Blitz','Volt Tackle','Take Down','Submission','Head Smash']
	PunchMoves = ['Bullet Punch','Comet Punch','Dizzy Punch','Drain Punch','Dynamic Punch','Fire Punch','Focus Punch','Hammer Arm','Ice Punch','Mach Punch','Mega Punch','Meteor Mash','Shadow Punch','Sky Uppercut','Thunder Punch']
	SoundMoves = ['Hyper Voice','Bug Buzz','Chatter','Grass Whistle','Growl','Heal Bell','Metal Sound','Roar','Screech','Sing','Snore','Supersonic','Uproar']
	MultistrikeMoves = ['Arm Thrust','Barrage','Bone Rush','Bullet Seed','Comet Punch','Double Slap','Fury Attack','Fury Swipes','Icicle Spear','Pin Missile','Rock Blast','Spike Cannon']
	DoublestrikeMoves = ['Bonemerang','Double Hit','Double Kick','Twineedle']

	var damageMatrix = [
			//Pokemon attacking
			//[],
			//Pokemon defending
			//[]
			//Move
		];


	function getDamage() {
		//for both sides attacking
		for(h=0; h<2; h++){
			//for all attacking pokemon on that side
			for(i=0; i < 3; i++) {
				// and the defenders on the other side
				for(j=0; j<3; j++){
					//and all attacking moves for the attacking side
					for(k=0; k < 4; k++){
						if (teams[(h*(-1)+1)][j].stats.def == "???"){
							damageMatrix.push([0+"<br>"+0,[0+"<br>"+0,1]]);
						}
						else{
							if (teams[h][i].moves[k] == null) {
								damageMatrix.push([0+"<br>"+0,[0+"<br>"+0,1]]);
							}
							else if ( teams[h][i].moves[k] == "???" ){
								damageMatrix.push([0+"<br>"+0,[0+"<br>"+0,1]]);
								damageMatrix.push([0+"<br>"+0,[0+"<br>"+0,1]]);
								damageMatrix.push([0+"<br>"+0,[0+"<br>"+0,1]]);
								damageMatrix.push([0+"<br>"+0,[0+"<br>"+0,1]]);
							}
							else {
								var weather
								weather = "none";
								if (h == 0){
									r2 = counter[i][j]
								}
								else{
									r2 = counter[j][i]
								}
								switch(r2){
									case 0:
										weather = "none";
										break;
									case 1:
										weather = "sun";
										break;
									case 2:
										weather = "rain";
										break;
									case 3:
										weather = "hail";
										break;
									case 4:
										weather = "sand";
										break;
									case 5:
										weather = "fog";
										break;
									default:
										weather = "none";
								}
								if (teams[h][i].moves[k].category === "Physical") {
									if (teams[h][i].moves[k].power > 0){
										damageMatrix.push(rawDamage(teams[h][i].moves[k].name, teams[h][i].stats.atk, teams[(h*(-1)+1)][j].stats.def, teams[h][i].moves[k].power, teams[h][i].level, teams[h][i].moves[k].type, teams[h][i].species.types
											, teams[(h*(-1)+1)][j].species.types, teams[h][i].item.name, teams[(h*(-1)+1)][j].item.name, teams[h][i].ability.name, teams[(h*(-1)+1)][j].ability.name, teams[(h*(-1)+1)][j].stats.hp, teams[h][i].species.name
											, teams[(h*(-1)+1)][j].species.name, "Physical", teams[h][i].gender, teams[(h*(-1)+1)][j].gender, teams[h][i].stats.spe, teams[(h*(-1)+1)][j].stats.spe
											, StatModArr[(3*h+i)][0], StatModArr[(3*h+i)][2], StatModArr[(3*(h*(-1)+1)+j)][1], StatModArr[(3*(h*(-1)+1)+j)][3], teams[h][i].stats.hp, StatModArr[(3*(h*(-1)+1)+j)][5], StatModArr[(3*h+i)][5],weather,h,i))
									}
									else{
										findPower(teams[h][i].moves[k].name, teams[h][i].stats.atk, teams[(h*(-1)+1)][j].stats.def, teams[h][i].moves[k].power, teams[h][i].level, teams[h][i].moves[k].type, teams[h][i].species.types
											, teams[(h*(-1)+1)][j].species.types, teams[h][i].item.name, teams[(h*(-1)+1)][j].item.name, teams[h][i].ability.name, teams[(h*(-1)+1)][j].ability.name, teams[(h*(-1)+1)][j].stats.hp
											, teams[h][i].species.name, teams[(h*(-1)+1)][j].species.name, "Physical", teams[h][i].gender, teams[(h*(-1)+1)][j].gender, teams[h][i].stats.spe, teams[(h*(-1)+1)][j].stats.spe
											, StatModArr[(3*h+i)][0], StatModArr[(3*h+i)][2], StatModArr[(3*(h*(-1)+1)+j)][1], StatModArr[(3*(h*(-1)+1)+j)][3], teams[h][i].stats.hp, StatModArr[(3*(h*(-1)+1)+j)][5], StatModArr[(3*h+i)][5],weather
											, StatModArr[(3*h+i)][4], StatModArr[(3*(h*(-1)+1)+j)][4], teams[h][i].moves[k].pp, teams[h][i].happiness)
									}
								}
								else if (teams[h][i].moves[k].category === "Special"){
									if (teams[h][i].moves[k].power > 0){
										damageMatrix.push(rawDamage(teams[h][i].moves[k].name, teams[h][i].stats.spA, teams[(h*(-1)+1)][j].stats.spD, teams[h][i].moves[k].power, teams[h][i].level, teams[h][i].moves[k].type, teams[h][i].species.types
											, teams[(h*(-1)+1)][j].species.types, teams[h][i].item.name, teams[(h*(-1)+1)][j].item.name, teams[h][i].ability.name, teams[(h*(-1)+1)][j].ability.name, teams[(h*(-1)+1)][j].stats.hp, teams[h][i].species.name
											, teams[(h*(-1)+1)][j].species.name, "Special", teams[h][i].gender, teams[(h*(-1)+1)][j].gender, teams[h][i].stats.spe, teams[(h*(-1)+1)][j].stats.spe
											, StatModArr[(3*h+i)][0], StatModArr[(3*h+i)][2], StatModArr[(3*(h*(-1)+1)+j)][1], StatModArr[(3*(h*(-1)+1)+j)][3], teams[h][i].stats.hp, StatModArr[(3*(h*(-1)+1)+j)][5], StatModArr[(3*h+i)][5],weather,h,i))
									}
									else{
										findPower(teams[h][i].moves[k].name, teams[h][i].stats.spA, teams[(h*(-1)+1)][j].stats.spD, teams[h][i].moves[k].power, teams[h][i].level, teams[h][i].moves[k].type, teams[h][i].species.types
											, teams[(h*(-1)+1)][j].species.types, teams[h][i].item.name, teams[(h*(-1)+1)][j].item.name, teams[h][i].ability.name, teams[(h*(-1)+1)][j].ability.name, teams[(h*(-1)+1)][j].stats.hp
											, teams[h][i].species.name, teams[(h*(-1)+1)][j].species.name, "Special", teams[h][i].gender, teams[(h*(-1)+1)][j].gender, teams[h][i].stats.spe, teams[(h*(-1)+1)][j].stats.spe
											, StatModArr[(3*h+i)][0], StatModArr[(3*h+i)][2], StatModArr[(3*(h*(-1)+1)+j)][1], StatModArr[(3*(h*(-1)+1)+j)][3], teams[h][i].stats.hp, StatModArr[(3*(h*(-1)+1)+j)][5], StatModArr[(3*h+i)][5],weather
											, StatModArr[(3*h+i)][4], StatModArr[(3*(h*(-1)+1)+j)][4], teams[h][i].moves[k].pp, teams[h][i].happiness)
									}
								}
								else if (teams[h][i].moves[k].category === "Status") {
									if (teams[h][i].setname.substr(0,2) == "m-"){
										if(teams[h][i].moves[k].name == 'Metronome'){
											PHYSDMG = rawDamage(teams[h][i].moves[k].name, teams[h][i].stats.atk, teams[(h*(-1)+1)][j].stats.def, 67, teams[h][i].level, "None", teams[h][i].species.types
												, teams[(h*(-1)+1)][j].species.types, teams[h][i].item.name, teams[(h*(-1)+1)][j].item.name, teams[h][i].ability.name, teams[(h*(-1)+1)][j].ability.name, teams[(h*(-1)+1)][j].stats.hp, teams[h][i].species.name
												, teams[(h*(-1)+1)][j].species.name, "Physical", teams[h][i].gender, teams[(h*(-1)+1)][j].gender, teams[h][i].stats.spe, teams[(h*(-1)+1)][j].stats.spe
												, StatModArr[(3*h+i)][0], StatModArr[(3*h+i)][2], StatModArr[(3*(h*(-1)+1)+j)][1], StatModArr[(3*(h*(-1)+1)+j)][3], teams[h][i].stats.hp, StatModArr[(3*(h*(-1)+1)+j)][5], StatModArr[(3*h+i)][5],weather)
											SPCDMG = rawDamage(teams[h][i].moves[k].name, teams[h][i].stats.spA, teams[(h*(-1)+1)][j].stats.spD, 77, teams[h][i].level, "None", teams[h][i].species.types
												, teams[(h*(-1)+1)][j].species.types, teams[h][i].item.name, teams[(h*(-1)+1)][j].item.name, teams[h][i].ability.name, teams[(h*(-1)+1)][j].ability.name, teams[(h*(-1)+1)][j].stats.hp, teams[h][i].species.name
												, teams[(h*(-1)+1)][j].species.name, "Special", teams[h][i].gender, teams[(h*(-1)+1)][j].gender, teams[h][i].stats.spe, teams[(h*(-1)+1)][j].stats.spe
												, StatModArr[(3*h+i)][0], StatModArr[(3*h+i)][2], StatModArr[(3*(h*(-1)+1)+j)][1], StatModArr[(3*(h*(-1)+1)+j)][3], teams[h][i].stats.hp, StatModArr[(3*(h*(-1)+1)+j)][5], StatModArr[(3*h+i)][5],weather)
											av1 = Math.floor( (164*parseInt( PHYSDMG[0].substr(0,PHYSDMG[0].indexOf("<")) ) + 97*parseInt( SPCDMG[0].substr(0,SPCDMG[0].indexOf("<"))) ) /442)
											av2 = Math.floor( (164*parseInt( PHYSDMG[0].substr(PHYSDMG[0].indexOf(">")+1) ) + 97*parseInt( SPCDMG[0].substr(SPCDMG[0].indexOf(">")+1)) ) /442)
											av3 = Math.floor( (164*parseInt( PHYSDMG[1][0].substr(0,PHYSDMG[1][0].indexOf("<")) ) + 97*parseInt( SPCDMG[1][0].substr(0,SPCDMG[1][0].indexOf("<"))) ) /442)
											av4 = Math.floor( (164*parseInt( PHYSDMG[1][0].substr(PHYSDMG[1][0].indexOf(">")+1) ) + 97*parseInt( SPCDMG[1][0].substr(SPCDMG[1][0].indexOf(">")+1)) ) /442)
											damageMatrix.push([av1+"<br>"+av2,[av3+"%<br>"+av4+"%", 1]]);
										}
										else if(teams[h][i].moves[k].name == 'Nature Power'){
											if (colosseum == 'sunset'){
												damageMatrix.push(rawDamage("Earthquake", teams[h][i].stats.atk, teams[(h*(-1)+1)][j].stats.def, 100, teams[h][i].level, "Ground", teams[h][i].species.types
													, teams[(h*(-1)+1)][j].species.types, teams[h][i].item.name, teams[(h*(-1)+1)][j].item.name, teams[h][i].ability.name, teams[(h*(-1)+1)][j].ability.name, teams[(h*(-1)+1)][j].stats.hp, teams[h][i].species.name
													, teams[(h*(-1)+1)][j].species.name, "Physical", teams[h][i].gender, teams[(h*(-1)+1)][j].gender, teams[h][i].stats.spe, teams[(h*(-1)+1)][j].stats.spe
													, StatModArr[(3*h+i)][0], StatModArr[(3*h+i)][2], StatModArr[(3*(h*(-1)+1)+j)][1], StatModArr[(3*(h*(-1)+1)+j)][3], teams[h][i].stats.hp, StatModArr[(3*(h*(-1)+1)+j)][5], StatModArr[(3*h+i)][5],weather,h,i))
											}
											else if (colosseum == 'gateway'){
												damageMatrix.push(rawDamage("Hydro Pump", teams[h][i].stats.spA, teams[(h*(-1)+1)][j].stats.spD, 120, teams[h][i].level, "Water", teams[h][i].species.types
													, teams[(h*(-1)+1)][j].species.types, teams[h][i].item.name, teams[(h*(-1)+1)][j].item.name, teams[h][i].ability.name, teams[(h*(-1)+1)][j].ability.name, teams[(h*(-1)+1)][j].stats.hp, teams[h][i].species.name
													, teams[(h*(-1)+1)][j].species.name, "Special", teams[h][i].gender, teams[(h*(-1)+1)][j].gender, teams[h][i].stats.spe, teams[(h*(-1)+1)][j].stats.spe
													, StatModArr[(3*h+i)][0], StatModArr[(3*h+i)][2], StatModArr[(3*(h*(-1)+1)+j)][1], StatModArr[(3*(h*(-1)+1)+j)][3], teams[h][i].stats.hp, StatModArr[(3*(h*(-1)+1)+j)][5], StatModArr[(3*h+i)][5],weather,h,i))
											}
											else if (colosseum == 'crystal' || colosseum == 'magma' || colosseum == 'stargazer'){
												damageMatrix.push(rawDamage("Rock Slide", teams[h][i].stats.atk, teams[(h*(-1)+1)][j].stats.def, 75, teams[h][i].level, "Rock", teams[h][i].species.types
													, teams[(h*(-1)+1)][j].species.types, teams[h][i].item.name, teams[(h*(-1)+1)][j].item.name, teams[h][i].ability.name, teams[(h*(-1)+1)][j].ability.name, teams[(h*(-1)+1)][j].stats.hp, teams[h][i].species.name
													, teams[(h*(-1)+1)][j].species.name, "Physical", teams[h][i].gender, teams[(h*(-1)+1)][j].gender, teams[h][i].stats.spe, teams[(h*(-1)+1)][j].stats.spe
													, StatModArr[(3*h+i)][0], StatModArr[(3*h+i)][2], StatModArr[(3*(h*(-1)+1)+j)][1], StatModArr[(3*(h*(-1)+1)+j)][3], teams[h][i].stats.hp, StatModArr[(3*(h*(-1)+1)+j)][5], StatModArr[(3*h+i)][5],weather,h,i))
											}
											else if (colosseum == 'waterfall' || colosseum == 'sunny_park'){
												damageMatrix.push(rawDamage("Seed Bomb", teams[h][i].stats.atk, teams[(h*(-1)+1)][j].stats.def, 80, teams[h][i].level, "Grass", teams[h][i].species.types
													, teams[(h*(-1)+1)][j].species.types, teams[h][i].item.name, teams[(h*(-1)+1)][j].item.name, teams[h][i].ability.name, teams[(h*(-1)+1)][j].ability.name, teams[(h*(-1)+1)][j].stats.hp, teams[h][i].species.name
													, teams[(h*(-1)+1)][j].species.name, "Physical", teams[h][i].gender, teams[(h*(-1)+1)][j].gender, teams[h][i].stats.spe, teams[(h*(-1)+1)][j].stats.spe
													, StatModArr[(3*h+i)][0], StatModArr[(3*h+i)][2], StatModArr[(3*(h*(-1)+1)+j)][1], StatModArr[(3*(h*(-1)+1)+j)][3], teams[h][i].stats.hp, StatModArr[(3*(h*(-1)+1)+j)][5], StatModArr[(3*h+i)][5],weather,h,i))
											}
											else if (colosseum == 'lagoon' || colosseum == 'main_street' || colosseum == 'neon' || colosseum == 'courtyard'){
												damageMatrix.push(rawDamage("Tri Attack", teams[h][i].stats.spA, teams[(h*(-1)+1)][j].stats.spD, 80, teams[h][i].level, "Normal", teams[h][i].species.types
													, teams[(h*(-1)+1)][j].species.types, teams[h][i].item.name, teams[(h*(-1)+1)][j].item.name, teams[h][i].ability.name, teams[(h*(-1)+1)][j].ability.name, teams[(h*(-1)+1)][j].stats.hp, teams[h][i].species.name
													, teams[(h*(-1)+1)][j].species.name, "Special", teams[h][i].gender, teams[(h*(-1)+1)][j].gender, teams[h][i].stats.spe, teams[(h*(-1)+1)][j].stats.spe
													, StatModArr[(3*h+i)][0], StatModArr[(3*h+i)][2], StatModArr[(3*(h*(-1)+1)+j)][1], StatModArr[(3*(h*(-1)+1)+j)][3], teams[h][i].stats.hp, StatModArr[(3*(h*(-1)+1)+j)][5], StatModArr[(3*h+i)][5],weather,h,i))
											}
											else {
												damageMatrix.push([0+"<br>"+0,[0+"<br>"+0,1]]);
											}
										}
										else{
											damageMatrix.push([0+"<br>"+0,[0+"<br>"+0,1]]);
										}
									}
									else{
										if(teams[h][i].moves[k].name == 'Nature Power'){
											if (colosseum == 'sunset'){
												damageMatrix.push(rawDamage("Earthquake", teams[h][i].stats.atk, teams[(h*(-1)+1)][j].stats.def, 100, teams[h][i].level, "Ground", teams[h][i].species.types
													, teams[(h*(-1)+1)][j].species.types, teams[h][i].item.name, teams[(h*(-1)+1)][j].item.name, teams[h][i].ability.name, teams[(h*(-1)+1)][j].ability.name, teams[(h*(-1)+1)][j].stats.hp, teams[h][i].species.name
													, teams[(h*(-1)+1)][j].species.name, "Physical", teams[h][i].gender, teams[(h*(-1)+1)][j].gender, teams[h][i].stats.spe, teams[(h*(-1)+1)][j].stats.spe
													, StatModArr[(3*h+i)][0], StatModArr[(3*h+i)][2], StatModArr[(3*(h*(-1)+1)+j)][1], StatModArr[(3*(h*(-1)+1)+j)][3], teams[h][i].stats.hp, StatModArr[(3*(h*(-1)+1)+j)][5], StatModArr[(3*h+i)][5],weather,h,i))
											}
											else if (colosseum == 'gateway'){
												damageMatrix.push(rawDamage("Hydro Pump", teams[h][i].stats.spA, teams[(h*(-1)+1)][j].stats.spD, 120, teams[h][i].level, "Water", teams[h][i].species.types
													, teams[(h*(-1)+1)][j].species.types, teams[h][i].item.name, teams[(h*(-1)+1)][j].item.name, teams[h][i].ability.name, teams[(h*(-1)+1)][j].ability.name, teams[(h*(-1)+1)][j].stats.hp, teams[h][i].species.name
													, teams[(h*(-1)+1)][j].species.name, "Special", teams[h][i].gender, teams[(h*(-1)+1)][j].gender, teams[h][i].stats.spe, teams[(h*(-1)+1)][j].stats.spe
													, StatModArr[(3*h+i)][0], StatModArr[(3*h+i)][2], StatModArr[(3*(h*(-1)+1)+j)][1], StatModArr[(3*(h*(-1)+1)+j)][3], teams[h][i].stats.hp, StatModArr[(3*(h*(-1)+1)+j)][5], StatModArr[(3*h+i)][5],weather,h,i))
											}
											else if (colosseum == 'crystal' || colosseum == 'magma' || colosseum == 'stargazer'){
												damageMatrix.push(rawDamage("Rock Slide", teams[h][i].stats.atk, teams[(h*(-1)+1)][j].stats.def, 75, teams[h][i].level, "Rock", teams[h][i].species.types
													, teams[(h*(-1)+1)][j].species.types, teams[h][i].item.name, teams[(h*(-1)+1)][j].item.name, teams[h][i].ability.name, teams[(h*(-1)+1)][j].ability.name, teams[(h*(-1)+1)][j].stats.hp, teams[h][i].species.name
													, teams[(h*(-1)+1)][j].species.name, "Physical", teams[h][i].gender, teams[(h*(-1)+1)][j].gender, teams[h][i].stats.spe, teams[(h*(-1)+1)][j].stats.spe
													, StatModArr[(3*h+i)][0], StatModArr[(3*h+i)][2], StatModArr[(3*(h*(-1)+1)+j)][1], StatModArr[(3*(h*(-1)+1)+j)][3], teams[h][i].stats.hp, StatModArr[(3*(h*(-1)+1)+j)][5], StatModArr[(3*h+i)][5],weather,h,i))
											}
											else if (colosseum == 'waterfall' || colosseum == 'sunny_park'){
												damageMatrix.push(rawDamage("Seed Bomb", teams[h][i].stats.atk, teams[(h*(-1)+1)][j].stats.def, 80, teams[h][i].level, "Grass", teams[h][i].species.types
													, teams[(h*(-1)+1)][j].species.types, teams[h][i].item.name, teams[(h*(-1)+1)][j].item.name, teams[h][i].ability.name, teams[(h*(-1)+1)][j].ability.name, teams[(h*(-1)+1)][j].stats.hp, teams[h][i].species.name
													, teams[(h*(-1)+1)][j].species.name, "Physical", teams[h][i].gender, teams[(h*(-1)+1)][j].gender, teams[h][i].stats.spe, teams[(h*(-1)+1)][j].stats.spe
													, StatModArr[(3*h+i)][0], StatModArr[(3*h+i)][2], StatModArr[(3*(h*(-1)+1)+j)][1], StatModArr[(3*(h*(-1)+1)+j)][3], teams[h][i].stats.hp, StatModArr[(3*(h*(-1)+1)+j)][5], StatModArr[(3*h+i)][5],weather,h,i))
											}
											else if (colosseum == 'lagoon' || colosseum == 'main_street' || colosseum == 'neon' || colosseum == 'courtyard'){
												damageMatrix.push(rawDamage("Tri Attack", teams[h][i].stats.spA, teams[(h*(-1)+1)][j].stats.spD, 80, teams[h][i].level, "Normal", teams[h][i].species.types
													, teams[(h*(-1)+1)][j].species.types, teams[h][i].item.name, teams[(h*(-1)+1)][j].item.name, teams[h][i].ability.name, teams[(h*(-1)+1)][j].ability.name, teams[(h*(-1)+1)][j].stats.hp, teams[h][i].species.name
													, teams[(h*(-1)+1)][j].species.name, "Special", teams[h][i].gender, teams[(h*(-1)+1)][j].gender, teams[h][i].stats.spe, teams[(h*(-1)+1)][j].stats.spe
													, StatModArr[(3*h+i)][0], StatModArr[(3*h+i)][2], StatModArr[(3*(h*(-1)+1)+j)][1], StatModArr[(3*(h*(-1)+1)+j)][3], teams[h][i].stats.hp, StatModArr[(3*(h*(-1)+1)+j)][5], StatModArr[(3*h+i)][5],weather,h,i))
											}
											else {
												damageMatrix.push([0+"<br>"+0,[0+"<br>"+0,1]]);
											}
										}
										else{
											damageMatrix.push([0+"<br>"+0,[0+"<br>"+0,1]]);
										}
									}
								}
							}
						}
					}
				}
			}
		}
		
		console.log(printVisuals(damageMatrix))
		//console.log(moveTies)
		//console.log(printVisuals(damageMatrix))
		//console.log(damageMatrix)

  	
	};
	function findPower(MoveName, Attack, Defense, Power, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName, MoveCategory, AttackGender
		, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather, AttackSpeedMod, DefenseSpeedMod, MovePP, happiness){
		var weather = $('.weather').text();
		if (MoveName == 'Guillotine' || MoveName == 'Sheer Cold' || MoveName == 'Horn Drill' || MoveName == 'Fissure'){
			damageMatrix.push(rawDamage(MoveName, Attack, Defense, 9999, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
				, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
		}
		else if(MoveName == 'Return'){
			returnpower =  Math.max(1,Math.floor(happiness/2.5))
			damageMatrix.push(rawDamage(MoveName, Attack, Defense, returnpower, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
				, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))

		}
		else if(MoveName == 'Frustration'){
			frustrationpower =  Math.max(1,Math.floor((255-happiness)/2.5))
			damageMatrix.push(rawDamage(MoveName, Attack, Defense, frustrationpower, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
				, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
		}
		else if (MoveName == 'Sonic Boom'|| MoveName == 'Seismic Toss' || MoveName == 'Night Shade' || MoveName == 'Dragon Rage' || MoveName == 'Psywave'){
			damageMatrix.push(rawDamage(MoveName, Attack, Defense, 1, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
				, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
		}
		else if (MoveName == 'Magnitude'){
			damageMatrix.push(rawDamage(MoveName, Attack, Defense, 70, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
				, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
		}
		else if (MoveName == 'Crush Grip' || MoveName == 'Wring Out'){
			damageMatrix.push(rawDamage(MoveName, Attack, Defense, 121, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
				, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
		}
		else if (MoveName == 'Flail' || MoveName == 'Reversal'){
			damageMatrix.push(rawDamage(MoveName, Attack, Defense, 20, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
				, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
		}
		else if (MoveName == 'Punishment'){
			damageMatrix.push(rawDamage(MoveName, Attack, Defense, 60, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
				, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
		}
		else if (MoveName == 'Endeavor'){
			damageMatrix.push(rawDamage(MoveName, Attack, Defense, 0, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
				, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
		}
		else if (MoveName == 'Grass Knot' || MoveName == 'Low Kick'){
			Pkmn0to10kg = ['Bulbasaur','Charmander','Squirtle','Caterpie','Metapod','Weedle','Kakuna','Pidgey','Rattata','Spearow','Ekans','Pikachu','Nidoran\u2640','Nidoran\u2642','Clefairy','Vulpix','Jigglypuff','Zubat','Oddish','Gloom','Paras','Diglett','Meowth','Bellsprout','Weepinbell','Magnemite','Shellder','Gastly','Haunter','Krabby','Exeggcute','Cubone','Koffing','Weezing','Horsea','Magikarp','Ditto','Eevee','Omanyte','Dratini','Mew','Chikorita','Cyndaquil','Totodile','Sentret','Spinarak','Pichu','Cleffa','Igglybuff','Togepi','Togetic','Natu','Mareep','Bellossom','Marill','Hoppip','Skiploom','Jumpluff','Sunkern','Sunflora','Wooper','Murkrow','Misdreavus','Unown','Pineco','Snubbull','Qwilfish','Teddiursa','Swinub','Corsola','Smoochum','Celebi','Treecko','Torchic','Mudkip','Wurmple','Silcoon','Lotad','Seedot','Taillow','Wingull','Ralts','Surskit','Masquerain','Shroomish','Nincada','Shedinja','Azurill','Plusle','Minun','Roselia','Spinda','Swablu','Barboach','Feebas','Castform','Shuppet','Chimecho','Luvdisc','Jirachi','Chimchar','Piplup','Starly','Kricketot','Shinx','Budew','Burmy','Wormadam','Combe','Pachirisu','Cherubi','Cherrim','Shellos','Drifloon','Buneary','Mismagius','Glameow','Chingling','Chatot','Finneon','Rotom','Uxie','Mesprit','Azelf','Phione','Manaphy','Shaymin']
			Pkmn10to25kg = ['Ivysaur','Charmeleon','Wartortle','Raticate','Sandshrew','Nidorina','Nidorino','Ninetales','Wigglytuff','Vileplume','Venomoth','Psyduck','Growlithe','Poliwag','Poliwhirl','Abra','Machop','Victreebel','Geodude',"Farfetch'd",'Voltorb','Seadra','Goldeen','Jolteon','Flareon','Kabuto','Dragonair','Bayleef','Quilava','Croconaw','Hoothoot','Ledyba','Chinchou','Lanturn','Xatu','Flaaffy','Aipom','Dunsparce','Shuckle','Remoraid','Delibird','Houndour','Tyrogue','Elekid','Magby','Grovyle','Combusken','Poochyena','Zigzagoon','Cascoon','Swellow','Kirlia','Slakoth','Ninjask','Whismur','Skitty','Sableye','Mawile','Meditite','Electrike','Volbeat','Illumise','Gulpin','Carvanha','Numel','Trapinch','Vibrava','Altaria','Whiscash','Corphish','Baltoy','Lileep','Anorith','Kecleon','Banette','Duskull','Wynaut','Snorunt','Gorebyss','Relicanth','Turtwig','Monferno','Prinplup','Staravia','Bidoof','Roserade','Mothim','Ambipom','Drifblim','Stunky','Bonsly','Mime Jr.','Happiny','Gible','Riolu','Skorupi','Croagunk','Lumineon']
			Pkmn25to50kg = ['Butterfree','Beedrill','Pidgeottot','Pidgeot','Fearow','Sandslash','Clefable','Parasect','Venonat','Dugtrio','Persian','Mankey','Primeape','Alakazam','Tentacool','Ponyta','Slowpoke','Doduo','Grimer','Muk','Gengar','Drowzee','Marowak','Hitmonlee','Chansey','Tangela','Seaking','Staryu','Jynx','Electabuzz','Magmar','Vaporeon','Porygon','Omastar','Kabutops','Furret','Noctowl','Ledian','Ariados','Azumarill','Sudowoodo','Politoed','Yanma','Espeon','Umbreon','Wobbuffet','Girafarig','Granbull','Sneasel','Slugma','Octillery','Houndoom','Phanpy','Porygon2','Hitmontop','Blissey','Marshtomp','Mightyena','Linoone','Beautifly','Dustox','Lombre','Nuzleaf','Pelipper','Gardevoir','Breloom','Vigoroth','Loudred','Delcatty','Medicham','Manectric','Spoink','Zangoose','Crawdaunt','Dusclops','Absol','Spheal','Carnivine','Huntail','Bagon','Latias','Bibarel','Kricketune','Luxio','Luxray','Cranidos','Vespiquen','Buizel','Floatzel','Gastrodon','Lopunny','Honchkrow','Purugly','Skuntank','Hippopotas','Toxicroak','Carvnivine','Weavile','Togekiss','Leafeon','Glaceon','Gliscor','Porygon-Z','Froslass']
			Pkmn50to100kg = ['Venusaur','Charizard','Blastoise','Arbok','Nidoqueen','Nidoking','Golbat','Dugtrio','Golduck','Poliwrath','Kadabra','Machoke','Tentacruel','Rapidash','Slowbro','Magneton','Dodrio','Seel','Hypno','Kingler','Electrode','Hitmonchan','Lickitung','Kangaskhan','Starmie','Mr. Mime','Scyther','Pinsir','Tauros','Aerodactyl','Articuno','Zapdos','Moltres','Typhlosion','Feraligatr','Crobat','Ampharos','Quagsire','Slowking','Gligar','Heracross','Magcargo','Piloswine','Skarmory','Stantler','Smeargle','Miltank','Larvitar','Sceptile','Blaziken','Swampert','Ludicolo','Shiftry','Exploud','Makuhita','Nosepass','Aron','Swalot','Sharpedo','Torkoal','Grumpig','Flygon','Cacnea','Cacturne','Seviper','Cradily','Armaldo','Tropius','Sealeo','Clamperl','Beldum','Latios','Deoxys','Grotle','Infernape','Empoleon','Shieldon','Bronzor','Gabite','Garchomp','Lucario','Drapion','Mantyke','Snover','Magmortar','Yanmega','Gallade','Cresselia','Darkrai']
			Pkmn100to200kg = ['Arcanine','Machamp','Graveler','Dewgong','Cloyster','Exeggutor','Rhyhorn','Rhydon','Mewtwo','Meganium','Forretress','Scizor','Ursaring','Kingdra','Donphan','Raikou','Entei','Suicune','Pupitar','Ho-Oh','Slaking','Lairon','Wailmer','Lunatone','Solrock','Claydol','Milotic','Walrein','Shelgon','Salamence','Regice','Rampardos','Bastiodon','Bronzong','Spiritomb','Munchlax','Abomasnow','Magnezone','Lickilicky','Tangrowth','Electivire','Dusknoir']
			PkmnOver200kg = ['Golem','Onix','Gyarados','Lapras','Snorlax','Dragonite','Steelix','Mantine','Tyranitar','Lugia','Hariyama','Aggron','Wailord','Camerupt','Glalie','Metang','Metagross','Regirock','Registeel','Kyogre','Groudon','Rayquaza','Torterra','Hippowdon','Rhyperior','Mamoswine','Probopass','Dialga','Palkia','Heatran','Regigigas','Giratina','Arceus']
			if (Pkmn0to10kg.includes(DefenderName)){
				damageMatrix.push(rawDamage(MoveName, Attack, Defense, 20, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
					, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else if (Pkmn10to25kg.includes(DefenderName)){
				damageMatrix.push(rawDamage(MoveName, Attack, Defense, 40, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
					, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else if (Pkmn25to50kg.includes(DefenderName)){
				damageMatrix.push(rawDamage(MoveName, Attack, Defense, 60, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
					, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else if (Pkmn50to100kg.includes(DefenderName)){
				damageMatrix.push(rawDamage(MoveName, Attack, Defense, 80, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
					, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else if (Pkmn100to200kg.includes(DefenderName)){
				damageMatrix.push(rawDamage(MoveName, Attack, Defense, 100, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
					, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else if (PkmnOver200kg.includes(DefenderName)){
				damageMatrix.push(rawDamage(MoveName, Attack, Defense, 120, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
					, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else {
				damageMatrix.push([0+"<br>"+0,[0+"<br>"+0,1]]);
			}
		}
		else if (MoveName == 'Trump Card'){
			if (MovePP == 1){
			damageMatrix.push(rawDamage(MoveName, Attack, Defense, 200, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
				, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else if (MovePP == 2){
			damageMatrix.push(rawDamage(MoveName, Attack, Defense, 80, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
				, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else if (MovePP == 3){
			damageMatrix.push(rawDamage(MoveName, Attack, Defense, 60, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
				, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else if (MovePP == 4){
			damageMatrix.push(rawDamage(MoveName, Attack, Defense, 50, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
				, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else{
			damageMatrix.push(rawDamage(MoveName, Attack, Defense, 40, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
				, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
		}
		else if (MoveName == 'Gyro Ball'){
			var atkSpeMod = 1;
			var defSpeMod = 1;
			if(AttackItem == 'Choice Scarf'){
				atkSpeMod = atkSpeMod * 1.5
			}
			else if(AttackItem == 'Iron Ball'  | AttackItem == 'Macho Brace' | AttackItem == 'Power Weight' | AttackItem == 'Power Bracer'  | AttackItem == 'Power Belt' | AttackItem == 'Power Lens' | AttackItem == 'Power Band' | AttackItem == 'Power Anklet'){
				atkSpeMod = atkSpeMod * 0.5
			}
			if(DefenseItem == 'Choice Scarf'){
				defSpeMod = defSpeMod * 1.5
			}
			else if(DefenseItem == 'Iron Ball'  | DefenseItem == 'Macho Brace' | DefenseItem == 'Power Weight' | DefenseItem == 'Power Bracer'  | DefenseItem == 'Power Belt' | DefenseItem == 'Power Lens' | DefenseItem == 'Power Band' | DefenseItem == 'Power Anklet'){
				defSpeMod = defSpeMod * 0.5
			}
			if(AttackAbility == 'Slow Start'){
				atkSpeMod = atkSpeMod * 0.5
			}
			if(DefenseAbility == 'Slow Start'){
				defSpeMod = defSpeMod * 0.5
			}
			if(AttackAbility == 'Swift Swim' && weather == 'rain'){
				atkSpeMod = atkSpeMod * 2
			}
			else if(AttackAbility == 'Chlorophyll' && weather == 'sun'){
				atkSpeMod = atkSpeMod * 2
			}
			if(DefenseAbility == 'Swift Swim' && weather == 'rain'){
				defSpeMod = defSpeMod * 2
			}
			else if(DefenseAbility == 'Chlorophyll' && weather == 'sun'){
				defSpeMod = defSpeMod * 2
			}
			if ( (25/(AttackSpeed * atkSpeMod * spemodToMultiplier(AttackSpeedMod, AttackAbility)) * (DefenseSpeed * defSpeMod * spemodToMultiplier(DefenseSpeedMod, DefenseAbility))) > 150){
				Power = 150;
			}
			else {
				Power =  (25/(AttackSpeed * atkSpeMod * spemodToMultiplier(AttackSpeedMod, AttackAbility)) * (DefenseSpeed * defSpeMod * spemodToMultiplier(DefenseSpeedMod, DefenseAbility)));
			}
			damageMatrix.push(rawDamage(MoveName, Attack, Defense, Power, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName,
			 MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
		}
		else if (MoveName == 'Super Fang'){
			damageMatrix.push(rawDamage(MoveName, Attack, Defense, 1, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName,
			 MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
		}
		else if (MoveName == 'Fling'){
			Fling10 = ['Lagging Tail','Silk Scarf']
			Fling30 = ['Tiny Mushroom','Light Ball','Flame Orb','Toxic Orb',"King's Rock",'Poké Doll','Escape Rope','Rare Candy','Lemonade','Nugget','Smoke Ball','Damp Mulch','Burn Heal','Honey','Repel','Sacred Ash','BlackGlasses','Razor Fang','Black Belt']
			Fling50 = ['Dubious Disc','Sharp Beak']
			Fling40 = ['Icy Rock','Lucky Punch']
			Fling60 = ['Adamant Orb','Damp Rock','Griseous Orb','Heat Rock','Lustrous Orb','Macho Brace','Stick']
			Fling70 = ['Dragon Fang','Poison Barb','Power Anklet','Power Band','Power Belt','Power Bracer','Power Lens','Power Weight']
			Fling80 = ['Dawn Stone','Dusk Stone','Electirizer','Magmarizer','Odd Keystone','Oval Stone','Protector','Quick Claw','Razor Claw','Shiny Stone','Sticky Barb']
			Fling90 = ['Draco Plate','Dread Plate','Earth Plate','Fist Plate','Flame Plate','Icicle Plate','Insect Plate','Iron Plate','Meadow Plate','Mind Plate','Sky Plate','Splash Plate','Spooky Plate','Stone Plate','Toxic Plate','Zap Plate','DeepSeaTooth','Grip Claw','Thick Club']
			Fling100 = ['Hard Stone','Rare Bone','Dome Fossil','Helix Fossil','Old Amber','Root Fossil','Claw Fossil','Skull Fossil','Armor Fossil']
			Fling130 = ['Iron Ball']
			if (AttackItem == null){
				damageMatrix.push([0+"<br>"+0,[0+"<br>"+0,1]]);
			}
			else if (Fling10.includes(AttackItem)){
				damageMatrix.push(rawDamage(MoveName, Attack, Defense, 10, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName,
				 MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else if (Fling30.includes(AttackItem)){
				damageMatrix.push(rawDamage(MoveName, Attack, Defense, 30, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName,
				 MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else if (Fling40.includes(AttackItem)){
				damageMatrix.push(rawDamage(MoveName, Attack, Defense, 40, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName,
				 MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else if (Fling50.includes(AttackItem)){
				damageMatrix.push(rawDamage(MoveName, Attack, Defense, 50, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName,
				 MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else if (Fling60.includes(AttackItem)){
				damageMatrix.push(rawDamage(MoveName, Attack, Defense, 60, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName,
				 MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else if (Fling70.includes(AttackItem)){
				damageMatrix.push(rawDamage(MoveName, Attack, Defense, 70, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName,
				 MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else if (Fling80.includes(AttackItem)){
				damageMatrix.push(rawDamage(MoveName, Attack, Defense, 80, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName,
				 MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else if (Fling90.includes(AttackItem)){
				damageMatrix.push(rawDamage(MoveName, Attack, Defense, 90, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName,
				 MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else if (Fling100.includes(AttackItem)){
				damageMatrix.push(rawDamage(MoveName, Attack, Defense, 100, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName,
				 MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else if (Fling130.includes(AttackItem)){
				damageMatrix.push(rawDamage(MoveName, Attack, Defense, 130, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName,
				 MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather,0,0))
			}
			else{
				damageMatrix.push([0+"<br>"+0,[0+"<br>"+0,1]]);
			}
		}
		else {
			damageMatrix.push([0+"<br>"+0,[0+"<br>"+0,1]]);
		}

		
	
	}



	//NEW VISUALIZER
	//console.log(damageMatrix)
	//NEW VIS

	//USE https://github.com/Zarel/honko-damagecalc/blob/master/js/damage_dpp.js
	function rawDamage(MoveName, Attack, Defense, Power, Level, MoveType, AttackTypes, DefenseTypes, AttackItem, DefenseItem, AttackAbility, DefenseAbility, Defensehp, AttackerName, DefenderName
		, MoveCategory, AttackGender, DefenseGender, AttackSpeed, DefenseSpeed, AtkAtkMod, AtkSpAMod, DefDefMod, DefSpdefMod, Attackhp, DefCurrenthp, AtkCurrenthp, weather, teamSide, pokemonIndex) {
		if (AttackAbility == 'Air Lock' || DefenseAbility == 'Air Lock' || AttackAbility == 'Cloud Nine' || DefenseAbility == 'Cloud Nine'){
			weather = "none";
		}
		var movetype;
		movetype = MoveType
		var attackTypes;
		attackTypes = AttackTypes
		var defenseTypes;
		defenseTypes = DefenseTypes
		var FinalEffectiveness;
		FinalEffectiveness = 1;
		var atkAbilityMod;
		atkAbilityMod = 1;
		var Power;
		Power = Power

		/*if(MoveName == 'Punishment'){
			Power = 60;
			if(DefDefMod > 0){
				Power = Power + 20*DefDefMod
			}
			if(DefSpdefMod > 0){
				Power = Power + 20*DefSpdefMod
			}
			if(defSpeMod > 0){
				Power = Power + 20*defSpeMod
			}
			if(DefDefMod > 0){
				Power = Power + 20*DefDefMod
			}
			if(DefDefMod > 0){
				Power = Power + 20*DefDefMod
			}
		}*/

		if(MoveName == 'Avalanche' || MoveName == 'Revenge'){
			Power = Power * 2
		}

		if(MoveName == 'Payback'){
			var atkSpeMod = 1;
			var defSpeMod = 1;
			if(AttackItem == 'Choice Scarf'){
				atkSpeMod = atkSpeMod * 1.5
			}
			else if(AttackItem == 'Iron Ball'  | AttackItem == 'Macho Brace' | AttackItem == 'Power Weight' | AttackItem == 'Power Bracer'  | AttackItem == 'Power Belt' | AttackItem == 'Power Lens' | AttackItem == 'Power Band' | AttackItem == 'Power Anklet'){
				atkSpeMod = atkSpeMod * 0.5
			}
			if(DefenseItem == 'Choice Scarf'){
				defSpeMod = defSpeMod * 1.5
			}
			else if(DefenseItem == 'Iron Ball'  | DefenseItem == 'Macho Brace' | DefenseItem == 'Power Weight' | DefenseItem == 'Power Bracer'  | DefenseItem == 'Power Belt' | DefenseItem == 'Power Lens' | DefenseItem == 'Power Band' | DefenseItem == 'Power Anklet'){
				defSpeMod = defSpeMod * 0.5
			}
			if(AttackAbility == 'Slow Start'){
				atkSpeMod = atkSpeMod * 0.5
			}
			if(DefenseAbility == 'Slow Start'){
				defSpeMod = defSpeMod * 0.5
			}
			if(AttackAbility == 'Swift Swim' && weather == 'rain'){
				atkSpeMod = atkSpeMod * 2
			}
			else if(AttackAbility == 'Chlorophyll' && weather == 'sun'){
				atkSpeMod = atkSpeMod * 2
			}
			if(DefenseAbility == 'Swift Swim' && weather == 'rain'){
				defSpeMod = defSpeMod * 2
			}
			else if(DefenseAbility == 'Chlorophyll' && weather == 'sun'){
				defSpeMod = defSpeMod * 2
			}
			if ((AttackSpeed * atkSpeMod) < (DefenseSpeed * defSpeMod)){
				Power = 100;
			}
			else {
				Power =  50;
			}
		}

		if(MoveName == 'Hidden Power'){
			hpbit = teams[h][i].ivs.hp % 2
			atkbit = teams[h][i].ivs.atk % 2
			defbit = teams[h][i].ivs.def % 2
			spebit = teams[h][i].ivs.spe % 2
			spAbit = teams[h][i].ivs.spA % 2
			spDbit = teams[h][i].ivs.spD % 2
			HPtypeMod = Math.floor(15*(hpbit+2*atkbit+4*defbit+8*spebit+16*spAbit+32*spDbit)/63)
			if(HPtypeMod == 0){
				movetype = "Fighting"
			}
			else if(HPtypeMod == 1){
				movetype = "Flying"
			}
			else if(HPtypeMod == 2){
				movetype = "Poison"
			}
			else if(HPtypeMod == 3){
				movetype = "Ground"
			}
			else if(HPtypeMod == 4){
				movetype = "Rock"
			}
			else if(HPtypeMod == 5){
				movetype = "Bug"
			}
			else if(HPtypeMod == 6){
				movetype = "Ghost"
			}
			else if(HPtypeMod == 7){
				movetype = "Steel"
			}
			else if(HPtypeMod == 8){
				movetype = "Fire"
			}
			else if(HPtypeMod == 9){
				movetype = "Water"
			}
			else if(HPtypeMod == 10){
				movetype = "Grass"
			}
			else if(HPtypeMod == 11){
				movetype = "Electric"
			}
			else if(HPtypeMod == 12){
				movetype = "Psychic"
			}
			else if(HPtypeMod == 13){
				movetype = "Ice"
			}
			else if(HPtypeMod == 14){
				movetype = "Dragon"
			}
			else if(HPtypeMod == 15){
				movetype = "Dark"
			}

			hpbit2 = Math.floor((teams[h][i].ivs.hp % 4)/2)
			atkbit2 = Math.floor((teams[h][i].ivs.atk % 4)/2)
			defbit2 = Math.floor((teams[h][i].ivs.def % 4)/2)
			spebit2 = Math.floor((teams[h][i].ivs.spe % 4)/2)
			spAbit2 = Math.floor((teams[h][i].ivs.spA % 4)/2)
			spDbit2 = Math.floor((teams[h][i].ivs.spD % 4)/2)
			Power = Math.floor(40*(hpbit2+2*atkbit2+4*defbit2+8*spebit2+16*spAbit2+32*spDbit2)/63 + 30)
		}

		var ATKMOD;
		var DEFMOD;
		if (MoveCategory == 'Physical'){
			ATKMOD =  ModToMultiplier(AtkAtkMod,AttackAbility,DefenseAbility)
			DEFMOD = ModToMultiplier(DefDefMod,DefenseAbility,AttackAbility)
		}
		else if (MoveCategory == 'Special'){
			ATKMOD =  ModToMultiplier(AtkSpAMod,AttackAbility,DefenseAbility)
			DEFMOD = ModToMultiplier(DefSpdefMod,DefenseAbility,AttackAbility)
		}
		else {
			ATKMOD = 1;
			DEFMOD = 1;
		}

		var atkMod = 1;
		var defMod = 1;
		var LifeOrb = 1;
		var ebeltMod = 1;
		var weatherMod = 1;
		var weatherBallMod = 1;
		var tintedMod = 1;
		var berryMod = 1;

		var cancelDamage = false
		//sort out pokemon with awkward dynamic types
		if (AttackerName == 'Castform' && AttackAbility == 'Forecast'){
			if (weather == 'sun'){
				attackTypes = ["Fire"]
			}
			else if (weather == 'rain'){
				attackTypes = ["Water"]
			}
			else if (weather == 'hail'){
				attackTypes = ["Ice"]
			}
		}
		else if (AttackerName == 'Arceus'){
			if (AttackAbility == 'Multitype'){
				if (AttackItem == 'Draco Plate'){
					attackTypes = ["Dragon"]
				}
				else if (AttackItem == 'Dread Plate'){
					attackTypes = ["Dark"]
				}
				else if (AttackItem == 'Earth Plate'){
					attackTypes = ["Ground"]
				}
				else if (AttackItem == 'Fist Plate'){
					attackTypes = ["Fighting"]
				}
				else if (AttackItem == 'Flame Plate'){
					attackTypes = ["Fire"]
				}
				else if (AttackItem == 'Icicle Plate'){
					attackTypes = ["Ice"]
				}
				else if (AttackItem == 'Insect Plate'){
					attackTypes = ["Bug"]
				}
				else if (AttackItem == 'Iron Plate'){
					attackTypes = ["Steel"]
				}
				else if (AttackItem == 'Meadow Plate'){
					attackTypes = ["Grass"]
				}
				else if (AttackItem == 'Mind Plate'){
					attackTypes = ["Psychic"]
				}
				else if (AttackItem == 'Sky Plate'){
					attackTypes = ["Flying"]
				}
				else if (AttackItem == 'Splash Plate'){
					attackTypes = ["Water"]
				}
				else if (AttackItem == 'Spooky Plate'){
					attackTypes = ["Ghost"]
				}
				else if (AttackItem == 'Stone Plate'){
					attackTypes = ["Rock"]
				}
				else if (AttackItem == 'Toxic Plate'){
					attackTypes = ["Poison"]
				}
				else if (AttackItem == 'Zap Plate'){
					attackTypes = ["Electric"]
				}
				else{
					attackTypes = ["Normal"]
				}
			}
			else{
				attackTypes = ["Normal"]
			}
		}
		if (DefenderName == 'Castform' && DefenseAbility == 'Forecast'){
			if (weather == 'sun'){
				defenseTypes = ["Fire"];
			}
			else if (weather == 'rain'){
				defenseTypes = ["Water"];
			}
			else if (weather == 'hail'){
				defenseTypes = ["Ice"];
			}
		}
		else if (DefenderName == 'Arceus'){
			if(DefenseAbility == 'Multitype'){
				if (DefenseItem == 'Draco Plate'){
					defenseTypes = ["Dragon"]
				}
				else if (DefenseItem == 'Dread Plate'){
					defenseTypes = ["Dark"]
				}
				else if (DefenseItem == 'Earth Plate'){
					defenseTypes = ["Ground"]
				}
				else if (DefenseItem == 'Fist Plate'){
					defenseTypes = ["Fighting"]
				}
				else if (DefenseItem == 'Flame Plate'){
					defenseTypes = ["Fire"]
				}
				else if (DefenseItem == 'Icicle Plate'){
					defenseTypes = ["Ice"]
				}
				else if (DefenseItem == 'Insect Plate'){
					defenseTypes = ["Bug"]
				}
				else if (DefenseItem == 'Iron Plate'){
					defenseTypes = ["Steel"]
				}
				else if (DefenseItem == 'Meadow Plate'){
					defenseTypes = ["Grass"]
				}
				else if (DefenseItem == 'Mind Plate'){
					defenseTypes = ["Psychic"]
				}
				else if (DefenseItem == 'Sky Plate'){
					defenseTypes = ["Flying"]
				}
				else if (DefenseItem == 'Splash Plate'){
					defenseTypes = ["Water"]
				}
				else if (DefenseItem == 'Spooky Plate'){
					defenseTypes = ["Ghost"]
				}
				else if (DefenseItem == 'Stone Plate'){
					defenseTypes = ["Rock"]
				}
				else if (DefenseItem == 'Toxic Plate'){
					defenseTypes = ["Poison"]
				}
				else if (DefenseItem == 'Zap Plate'){
					defenseTypes = ["Electric"]
				}
				else{
				    defenseTypes = ["Normal"]
				}
			}
			else{
				defenseTypes = ["Normal"]
			}
		}

		//Incorporation of weather
		if (weather !== 'none'){
			if (MoveName == 'Weather Ball'){
				weatherBallMod = 2;
				if(weather == 'sun'){
					movetype = 'Fire'
				}
				else if(weather == 'rain'){
					movetype = 'Water'
				}
				else if(weather == 'hail'){
					movetype = 'Ice'
				}
				else if(weather == 'sand'){
					movetype = 'Rock'
				}
			}
			if (weather == 'sun'){
				if (movetype == 'Fire'){
					weatherMod = weatherMod * 1.5;
				}
				else if (movetype == 'Water'){
					weatherMod = weatherMod * 0.5;
				}
			}
			if (weather == 'rain'){
				if (movetype == 'Fire'){
					weatherMod = weatherMod * 0.5;
				}
				else if (movetype == 'Water'){
					weatherMod = weatherMod * 1.5;
				}
			}
			if (weather == 'sand' && defenseTypes.includes("Rock") && MoveCategory == 'Special' ){
				defMod = defMod * 1.5;
			}
			if (MoveName == 'Solar Beam' && weather !== 'sun'){
				Power = Power * 0.5
			}
		}

		//Changing Judgment type for plates
		if (MoveName == 'Judgment'){
			if (AttackItem == 'Draco Plate'){
				movetype = ["Dragon"];
			}
			else if (AttackItem == 'Dread Plate'){
				movetype = ["Dark"];
			}
			else if (AttackItem == 'Earth Plate'){
				movetype = ["Ground"];
			}
			else if (AttackItem == 'Fist Plate'){
				movetype = ["Fighting"];
			}
			else if (AttackItem == 'Flame Plate'){
				movetype = ["Fire"];
			}
			else if (AttackItem == 'Icicle Plate'){
				movetype = ["Ice"];
			}
			else if (AttackItem == 'Insect Plate'){
				movetype = ["Bug"];
			}
			else if (AttackItem == 'Iron Plate'){
				movetype = ["Steel"];
			}
			else if (AttackItem == 'Meadow Plate'){
				movetype = ["Grass"];
			}
			else if (AttackItem == 'Mind Plate'){
				movetype = ["Psychic"];
			}
			else if (AttackItem == 'Sky Plate'){
				movetype = ["Flying"];
			}
			else if (AttackItem == 'Splash Plate'){
				movetype = ["Water"];
			}
			else if (AttackItem == 'Spooky Plate'){
				movetype = ["Ghost"];
			}
			else if (AttackItem == 'Stone Plate'){
				movetype = ["Rock"];
			}
			else if (AttackItem == 'Toxic Plate'){
				movetype = ["Poison"];
			}
			else if (AttackItem == 'Zap Plate'){
				movetype = ["Electric"];
			}
			else{
				movetype = ["Normal"];
			}
		}

		//Normalize
		if(AttackAbility == 'Normalize'){
			movetype = ["Normal"]
		}
		else {
			movetype = movetype
		}


		//STAB and Effectiveness
		var STAB;
		var mult1;
		var mult2;
		STAB = 1;
		mult1 = 1;
		mult2 = 1;


		if (attackTypes[0] == (movetype) || attackTypes[1] == movetype){
			if (AttackAbility == 'Adaptability'){
				STAB = 2;
			}
			else {
				STAB = 1.5;
			}
		}

		if (defenseTypes[0] == null ){
			mult1 = 1;
		}
		else {
			Defense1 = defenseTypes[0]
			row = typeIndices[movetype]
			col1 = typeIndices[Defense1]
			mult1 = typeChart[row][col1]
			if (AttackAbility == 'Scrappy' && Defense1 == 'Ghost' && (movetype == 'Fighting' || movetype == 'Normal')){
				mult1 = 1;
			}
			else if(DefenseItem == 'Iron Ball' && movetype == 'Ground'){
                if (defenseTypes[0] == 'Fire' || defenseTypes[0] == 'Steel' || defenseTypes[0] == 'Rock' || defenseTypes[0] == 'Electric' || defenseTypes[0] == 'Poison'){
                    mult1 = 2;
                }
                    else if (defenseTypes[0] == 'Bug' || defenseTypes[0] == 'Grass'){
                    mult1 = 0.5;
                }
                else {
                    mult1 = 1;
                }
            }
		}
		if (defenseTypes[1] == null ){
			mult2 = 1
		}
		else {
			Defense2 = defenseTypes[1]
			row = typeIndices[movetype]
			col2 = typeIndices[Defense2]
			mult2 = typeChart[row][col2]
			if (AttackAbility == 'Scrappy' && Defense2 == 'Ghost' && movetype == 'Normal'){
				mult2 = 1;
			}
			else if(DefenseItem == 'Iron Ball' && movetype == 'Ground'){
                if (defenseTypes[1] == 'Fire' || defenseTypes[1] == 'Steel' || defenseTypes[1] == 'Rock' || defenseTypes[1] == 'Electric' || defenseTypes[1] == 'Poison'){
                    mult2 = 2;
                }
                else if (defenseTypes[1] == 'Bug' || defenseTypes[1] == 'Grass'){
                    mult2 = 0.5;
                }
                else {
                    mult2 = 1;
                }
			}
		}

		if(MoveName == 'Future Sight' || MoveName == 'Doom Desire' || MoveName == 'Beat Up' || MoveName == 'Night Shade' || MoveName == 'Seismic Toss' || MoveName == 'Dragon Rage' || MoveName == 'Psywave' || MoveName == 'Super Fang' ||
			MoveName == 'Sonic Boom' || MoveName == 'counter' || MoveName == 'Mirror Coat'  || MoveName == 'Metal Burst' || MoveName == 'Guillotine' || MoveName == 'Horn Drill'  || MoveName == 'Sheer Cold'  || MoveName == 'Fissure' || MoveName == 'Endeavor' ){
			STAB = 1;
			if(MoveName == 'Future Sight' || MoveName == 'Doom Desire'){
				mult1 = 1;
				mult2 = 1;
			}
		}
		//Moves With variable damage depending on HP
		if (MoveName == 'Flail' || MoveName == 'Reversal'){
			var a = Math.floor(64 * AtkCurrenthp / Attackhp )
			Power = a <= 1 ? 200 : a <= 5 ? 150 : a <= 12 ? 100 : a <= 21 ? 80 : a <= 42 ? 40 : 20;
		}
		else if (MoveName == 'Eruption' || MoveName == 'Water Spout'){
			a = Math.min(150, Math.floor(Power * AtkCurrenthp/Attackhp));
			Power = a;
		}
		else if (MoveName == 'Wring Out'|| MoveName == 'Crush Grip'){
			Power = Math.min(121, Math.floor(DefCurrenthp * 120 / Defensehp) + 1);
		}
		else if (MoveName == 'Brine'){
			if(DefCurrenthp <= (Defensehp/2)){
				Power = Power * 2
			}
		}


		//AttackerItem mods
		if (AttackAbility !== 'Klutz'){
			if (AttackItem == 'None'){
				itemMod = 1;
			}
			else if (AttackItem == 'Muscle Band' && MoveCategory == 'Physical' || AttackItem == 'Wise Glasses' && MoveCategory == 'Special'){
				itemMod = 1.1;
			}
			else if (AttackItem == 'Expert Belt' && mult1 * mult2 > 1){
				itemMod = 1;
				ebeltMod = 1.2;
			}
			else if (AttackItem == 'Choice Band' && MoveCategory == 'Physical' || AttackItem == 'Choice Specs' && MoveCategory == 'Special'){
				itemMod = 1;
				atkMod = atkMod * 1.5;
			}
			else if (AttackItem == 'Adamant Orb' && AttackerName == 'Dialga' && (movetype == 'Dragon' || movetype == 'Steel' ) || AttackItem == 'Lustrous Orb' && AttackerName == 'Palkia' && (movetype == 'Dragon' || movetype == 'Water')
				|| AttackItem == 'Griseous Orb' && AttackerName == 'Giratina' &&  (movetype == 'Dragon' || movetype == 'Ghost')){
				itemMod = 1.2;
			}
			else if ( AttackItem == 'Silk Scarf' && movetype == 'Normal' || (AttackItem == 'Draco Plate' || AttackItem == 'Dragon Fang') && movetype == 'Dragon' || (AttackItem == 'Dread Plate' || AttackItem =='BlackGlasses') && movetype == 'Dark'
				|| (AttackItem == 'Earth Plate' || AttackItem == 'Soft Sand') && movetype == 'Ground' || (AttackItem == 'Fist Plate' || AttackItem == 'Black Belt') && movetype == 'Fighting'
				|| (AttackItem == 'Flame Plate' || AttackItem == 'Charcoal') && movetype == 'Fire' || (AttackItem == 'Icicle Plate' || AttackItem == 'NeverMeltIce') && movetype == 'Ice' || (AttackItem == 'Insect Plate'|| AttackItem == 'SilverPowder') && movetype == 'Bug'
				|| (AttackItem == 'Iron Plate' || AttackItem == 'Metal Coat') && movetype == 'Steel' || (AttackItem == 'Meadow Plate'|| AttackItem == 'Miracle Seed' || AttackItem == 'Rose Incense') && movetype == 'Grass'
				|| (AttackItem == 'Mind Plate' || AttackItem == 'TwistedSpoon' || AttackItem == 'Odd Incense') && movetype == 'Psychic' || (AttackItem == 'Sky Plate' || AttackItem == 'Sharp Beak') && movetype == 'Flying'
				|| (AttackItem == 'Splash Plate' || AttackItem == 'Mystic Water' || AttackItem == 'Sea Incense' || AttackItem == 'Wave Incense') && movetype == 'Water' || (AttackItem == 'Spooky Plate' || AttackItem == 'Spell Tag') && movetype == 'Ghost'
				|| (AttackItem == 'Stone Plate' || AttackItem == 'Hard Stone' || AttackItem == 'Rock Incense') && movetype == 'Rock' || (AttackItem == 'Toxic Plate' || AttackItem == 'Poison Barb') && movetype == 'Poison'
				|| (AttackItem == 'Zap Plate' || AttackItem == 'Magnet') && movetype == 'Electric'){
				itemMod = 1.2;
			}
			else if (AttackItem == 'Light Ball' && AttackerName == 'Pikachu' || AttackItem == 'Thick Club' && (AttackerName == 'Cubone' || AttackerName == 'Marowak') && MoveCategory == 'Physical' || AttackItem == 'DeepSeaTooth' && AttackerName == 'Clamperl' && MoveCategory == 'Special' ){
				itemMod = 1;
				atkMod = atkMod * 2;
			}
			else if (AttackItem == 'Soul Dew' && (AttackerName == 'Latios' || AttackerName == 'Latias') && MoveCategory == 'Special'){
				itemMod = 1
				atkMod = atkMod * 1.5;
			}
			else if (AttackItem == 'Life Orb'){
				itemMod = 1;
				LifeOrb = 1.3;
			}
			else {
				itemMod = 1;
			}
		}
		else{
		    itemMod = 1;
		}

		Power = Power * weatherBallMod

		//AttackAbility mods
		if (AttackAbility == 'None'){
			atkAbilityMod = 1;
		}
		else if (AttackAbility == 'Slow Start'){
			if (MoveCategory == 'Physical'){
				atkMod = atkMod * 0.5;
			}
		}
		else if (AttackAbility == 'Rivalry'){
			if ((AttackGender == 'm' && DefenseGender == 'f') || (AttackGender == 'f' && DefenseGender == 'm')) {
				atkAbilityMod = atkAbilityMod * 0.75;
			}
			else if ((AttackGender == 'm' && DefenseGender == 'm') || (AttackGender == 'f' && DefenseGender == 'f')) {
				atkAbilityMod = atkAbilityMod * 1.25;
			}
			else {
				atkAbilityMod = atkAbilityMod * 1;
			}
		}
		else if (AttackAbility == 'Reckless' && RecoilMoves.includes(MoveName) || AttackAbility == 'Iron Fist' && PunchMoves.includes(MoveName)){
			atkAbilityMod = 1.2;
		}
		else if (AttackAbility == 'Technician' && Power <= 60){
			atkAbilityMod = 1.5;
		}
		else if ((AttackAbility == 'Pure Power' || AttackAbility == 'Huge Power') && MoveCategory == 'Physical'){
			atkAbilityMod = 1;
			atkMod = atkMod * 2;
		}
		else if (weather == 'sun' && ( MoveCategory == 'Physical' && AttackAbility == 'Flower Gift' || MoveCategory == 'Special' && AttackAbility == 'Solar Power')){
			atkAbilityMod = 1;
			atkMod = atkMod * 1.5;
		}
		else if (AttackAbility == 'Hustle' && MoveCategory == 'Physical'){
			atkAbilityMod = 1;
			atkMod = atkMod * 1.5;
		}
		else if (AttackAbility == 'Tinted Lens' && mult1 * mult2 < 1) {
			tintedMod = 2;
		}
		else if ((AttackAbility == 'Blaze' && movetype == 'Fire' || AttackAbility == 'Overgrow' && movetype == 'Grass' || AttackAbility == 'Torrent' && movetype == 'Water' || AttackAbility == 'Swarm' && movetype == 'Bug') &&  AtkCurrenthp <= Attackhp / 3){
			atkMod = atkMod * 1.5;
		}
		else {
			atkAbilityMod = 1;
		}

		if ((AttackAbility == 'Damp' || DefenseAbility == 'Damp') && (MoveName == 'Explosion' || MoveName == 'Self-Destruct')){
			cancelDamage = true;
		}

		//Defender Item mods
		if (DefenseItem == 'Soul Dew' && (DefenderName == 'Latios' || DefenderName == 'Latias') && MoveCategory == 'Special'){
			defMod = defMod * 1.5;
		}
		else if (DefenseItem == 'DeepSeaScale' && DefenderName == 'Clamperl' && MoveCategory == 'Special' ){
			defMod = defMod * 2;
		}
		else if ((DefenseItem == 'Occa Berry' && movetype == 'Fire' && mult1 * mult2 > 1) || (DefenseItem == 'Passho Berry' && movetype == 'Water' && mult1 * mult2 > 1) ||  (DefenseItem == 'Wacan Berry' && movetype == 'Electric' && mult1 * mult2 > 1) ||
				(DefenseItem == 'Rindo Berry' && movetype == 'Grass' && mult1 * mult2 > 1) ||  (DefenseItem == 'Yache Berry' && movetype == 'Ice' && mult1 * mult2 > 1) ||  (DefenseItem == 'Chople Berry' && movetype == 'Fighting' && mult1 * mult2 > 1) ||
				(DefenseItem == 'Kebia Berry' && movetype == 'Poison' && mult1 * mult2 > 1) ||  (DefenseItem == 'Shuca Berry' && movetype == 'Ground' && mult1 * mult2 > 1) ||  (DefenseItem == 'Coba Berry' && movetype == 'Flying' && mult1 * mult2 > 1) ||
				(DefenseItem == 'Papaya Berry' && movetype == 'Psychic' && mult1 * mult2 > 1) ||  (DefenseItem == 'Tanga Berry' && movetype == 'Bug' && mult1 * mult2 > 1) ||  (DefenseItem == 'Charti Berry' && movetype == 'Rock' && mult1 * mult2 > 1) ||
				(DefenseItem == 'Kasib Berry' && movetype == 'Ghost' && mult1 * mult2 > 1) ||  (DefenseItem == 'Haban Berry' && movetype == 'Dragon' && mult1 * mult2 > 1) ||  (DefenseItem == 'Colbur Berry' && movetype == 'Dark' && mult1 * mult2 > 1) ||
				 (DefenseItem == 'Babiri Berry' && movetype == 'Steel' && mult1 * mult2 > 1) ||  (DefenseItem == 'Chilan Berry' && movetype == 'Normal') ){
			berryMod = 0.5;
		}

		//Defender Abilty mods
		var filterMod = 1;
		var defAbilityMod = 1;
		if (AttackAbility !== 'Mold Breaker'){
			if ((DefenseAbility === "Thick Fat" && (movetype === "Fire" || movetype === "Ice")) || (DefenseAbility === "Heatproof" && movetype === "Fire")){
				defAbilityMod = 0.5;
			}
			else if (DefenseAbility == 'Dry Skin' && movetype == 'Fire'){
				defAbilityMod = 1.25;
			}
			else if (((DefenseAbility == 'Wonder Guard' && mult1 * mult2 <= 1) || (movetype == 'Fire' && DefenseAbility == 'Flash Fire') || (movetype == 'Water' && (DefenseAbility == 'Dry Skin' || DefenseAbility == 'Water Absorb'))
					|| (movetype == 'Electric' && (DefenseAbility == 'Volt Absorb' || DefenseAbility == 'Motor Drive')) || (DefenseAbility == 'Levitate' && movetype == 'Ground' && DefenseItem !== 'Iron Ball') || (SoundMoves.includes(MoveName) && DefenseAbility == 'Soundproof') ) && MoveName != 'Future Sight' && MoveName != 'Doom Desire'  ){
				cancelDamage = true;
			}
			else if ((DefenseAbility == 'Solid Rock' || DefenseAbility == 'Filter') && mult1 * mult2 > 1 ){
				defAbilityMod = 1;
				filterMod = 0.75;
			}
			else if (DefenseAbility == 'Flower Gift' && weather == 'sun' && MoveCategory == 'Special'){
				defAbilityMod = 1;
				defMod = defMod * 1.5;
			}
			else if ((MoveName == 'Guillotine' || MoveName == 'Sheer Cold' || MoveName == 'Horn Drill' || MoveName == 'Fissure') && DefenseAbility == 'Sturdy'){
				cancelDamage = true;
			}
			else {
				defAbilityMod = 1;
			}
		}

		raw = Math.floor(Math.floor((Math.floor((2 * Level) / 5 + 2) * Math.floor(Math.floor(Power * atkAbilityMod * itemMod)*defAbilityMod) * Math.floor(Attack * ATKMOD * atkMod)) / Math.floor(Defense * DEFMOD * defMod)) / 50)

		raw = Math.floor(raw * weatherMod + 2)

		FinalEffectiveness = mult1 * mult2

		var min;
		var max;
		var minPerc;
		var maxPerc;
		min = Math.max(Math.ceil(FinalEffectiveness/4), Math.floor(Math.floor(Math.floor(Math.floor(Math.floor(Math.floor(Math.floor(Math.floor(LifeOrb*raw)*0.85)*STAB)*FinalEffectiveness)*filterMod)*ebeltMod)*tintedMod)*berryMod))
		max = Math.max(Math.ceil(FinalEffectiveness/4), Math.floor(Math.floor(Math.floor(Math.floor(Math.floor(Math.floor(Math.floor(raw*LifeOrb)*STAB)*FinalEffectiveness)*filterMod)*ebeltMod)*tintedMod)*berryMod))

		//if(min == 0){
		//	min = 1;
		//}
		//if (max == 0){
		//	max = 1;
		//}

		minPerc = (Math.floor(1000*min/Defensehp)/10)+"%"
		maxPerc = (Math.round(1000*max/Defensehp)/10)+"%"

		if(FinalEffectiveness > 0){
			if(MoveName == 'Dragon Rage'){
				min = 40
				max = 40
				minPerc = (Math.round(1000*min/Defensehp)/10)+"%"
				maxPerc = (Math.round(1000*max/Defensehp)/10)+"%"
			}
			else if (MoveName == 'Seismic Toss' || MoveName == 'Night Shade' ){
				if (mult1 *mult2 > 0){
					min = Level
					max = Level
					minPerc = (Math.round(1000*min/Defensehp)/10)+"%"
					maxPerc = (Math.round(1000*max/Defensehp)/10)+"%"
				}
			}
			else if (MoveName == 'Sonic Boom'){
				if (mult1 *mult2 > 0){
					min = 20
					max = 20
					minPerc = (Math.round(1000*min/Defensehp)/10)+"%"
					maxPerc = (Math.round(1000*max/Defensehp)/10)+"%"
				}
			}
			else if (MoveName == 'Psywave'){
				if (mult1 *mult2 > 0){
					min = Math.floor(Level * 0.5)
					max = Math.floor(Level * 1.5)
					minPerc = (Math.round(1000*min/Defensehp)/10)+"%"
					maxPerc = (Math.round(1000*max/Defensehp)/10)+"%"
				}
			}
			else if (MoveName == 'Super Fang'){
				min = Math.max(1, Math.floor(DefCurrenthp/2))
				max = Math.max(1, Math.floor(DefCurrenthp/2))
				minPerc = (Math.round(1000*min/DefCurrenthp)/10)+"%"
				maxPerc = (Math.round(1000*max/DefCurrenthp)/10)+"%"
			}
			else if (MoveName == 'Endeavor'){
				min = Math.max(0, DefCurrenthp - AtkCurrenthp)
				max = Math.max(0, DefCurrenthp - AtkCurrenthp)
				minPerc = (Math.floor(1000*min/Defensehp)/10)+"%"
				maxPerc = (Math.round(1000*max/Defensehp)/10)+"%"
			}

			if (DoublestrikeMoves.includes(MoveName)){
				min = min * 2
				max = max * 2
				minPerc = (Math.round(1000*min/Defensehp)/10)+"%"
				maxPerc = (Math.round(1000*max/Defensehp)/10)+"%"
			}
			else if (MultistrikeMoves.includes(MoveName)){
				if (AttackAbility == 'Skill Link'){
					min = min * 5
					max = max * 5
					minPerc = (Math.round(1000*min/Defensehp)/10)+"%"
					maxPerc = (Math.round(1000*max/Defensehp)/10)+"%"
				}
				else {
					min = min * 2
					max = max * 5
					minPerc = (Math.round(1000*min/Defensehp)/10)+"%"
					maxPerc = (Math.round(1000*max/Defensehp)/10)+"%"
				}
			}
			else if (MoveName == 'Triple Kick'){
				max = max + Math.floor(Math.floor(Math.floor(Math.floor(Math.floor(Math.floor(Math.floor(raw*LifeOrb)*filterMod)*ebeltMod)*tintedMod)*berryMod)*STAB)*FinalEffectiveness) * 5
				maxPerc = (Math.round(1000*max/Defensehp)/10)+"%"
			}
			else if ((MoveName == 'Guillotine' || MoveName == 'Sheer Cold' || MoveName == 'Horn Drill' || MoveName == 'Fissure') && (DefenseAbility != 'Sturdy' || (DefenseAbility == 'Sturdy' && AttackAbility == 'Mold Breaker'))){
				minPerc = 'OHKO'
				maxPerc = 'OHKO'
			}
		}



		if (cancelDamage) {
			min = 0
			max = 0
			minPerc = 0
			maxPerc = 0
		}

		return [min+"<br>"+max,[minPerc+"<br>"+maxPerc, FinalEffectiveness]]
	};
		

	function getCurrentMatch(){
		$.ajax({
		type: "GET",
		url: "https://twitchplayspokemon.tv/api/current_match",
		dataType: 'json',
		async: true,
		success: function (data){
			data = data
			match_showing = true
			teams = data.teams;
			colosseum = data.stage;
			damageMatrix = [];
			StatModArr = [];
			for(j=0;j<2;j++){
				for(i=0;i<3;i++){
					StatModArr.push([0,0,0,0,0,teams[j][i].stats.hp]);
				}
			}
			gravity = false;
			trickRoom = false;
			counter = [[0,0,0],[0,0,0],[0,0,0]]
			getDamage();
			match_id = data.id;
		},
		error: function(){
			match_showing = false
		}
		});
	}
	getCurrentMatch();
	

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////
////////////////////////////////////
////////////////////////////////////
////////////////////////////////////
////////////////////////////////////
/* my stuff */
//
//all moves will get assigned to the respective pokemon
var blue1= [];
var blue2= [];
var blue3= [];
var red1 = [];
var red2= [];
var red3= [];
var matchup = [];
var matchupDmg = [];

function printVisuals(moveGrid){
	//get highest percentage for moves
	fillMoves(moveGrid, blue1, 0);
	fillMoves(moveGrid, blue2, 6);
	fillMoves(moveGrid, blue3, 12);
	fillMoves(moveGrid, red1, 18);
	fillMoves(moveGrid, red2, 24);
	fillMoves(moveGrid, red3, 30);
	
	
	matchup = [blue1,blue2,blue3,red1, red2, red3];
	//console.log(matchup);
	connectMove(matchup);
	main();
	return "hi";
}

function fillMoves(moveGrid, toPoke, index){
	for(r = 0;r < 3;r++){
		var emp = []
		var emp2 = []
		var emp3 = [];
		for(x = 0 + index;x < 4 + index;x++){
			
			
			var f = moveGrid[x+(4*r)+index][1][0].split("<br>")[1];
			var fDmg = moveGrid[x+(4*r)+index][0].split("<br>")[1];
			emp.push(f);
			emp2.push(fDmg);
		}
	emp3.push(emp)
	emp3.push(emp2)
	toPoke.push(emp3);
	}

}

function connectMove(matchup){
	//THIS IS GONNA BE A MIGRAINE
	//playerselection = 0
		var count = 0;
		//moveSelection =  moves % 4;

		//console.log("modulus: " + moveSelection);
		if(cosmetics==true){
		for(c=0;c<6;c++){
			console.log("Pokemon " + c)
			console.log("-------------------")
			for(i2=0;i2<4;i2++){
				if (moveTies[count] != null){
				console.log(displayPoke(c) + " - " + colors.green(moveTies[count].displayname))
				}
					for(i3=0;i3<3;i3++){
						
						console.log("Move Chosen: | " + colors.red(matchup[c][i3][1][i2]) + " | " + colors.bold(matchup[c][i3][0][i2]) + " | Acc: " + colors.bgBlack(colors.white.bold(moveTies[count].accuracy + "%")) + "  Against Pokemon #" + (i3 + 1));
					}
				console.log("-------------------")
				count++;
			}
			//moveTies[count]
		}
		}

		count = 0
		//Find Best Move
		for(c=0;c<6;c++){
			for(i2=0;i2<3;i2++){
				sendMove = [];
				sendAcc = [];
				sendName = [];
				sendCategory = [];
				sendFull = [];
				if (moveTies[count] != null){
				//console.log(displayPoke(c) + " - " + colors.green(moveTies[count].displayname))
				}
				for(i3=0;i3<4;i3++){
					sendMove.push(parseInt(matchup[c][i2][1][i3]))
					sendAcc.push(moveTies[count].accuracy / 100)
					sendName.push(moveTies[count].displayname);
					sendCategory.push(moveTies[count].category);
					count++;
				}
				var infoString = colors.blue("Pokemon " + c + " against Pokemon " + i2 + " | ")
				count -= 4
				sendFull.push(sendMove);
				sendFull.push(sendAcc);
				sendFull.push(sendName);
				sendFull.push(sendCategory);
				getBestMove(sendFull, infoString, c, i2);
				
			}
			count += 4
			//moveTies[count]
		}
		console.log(bestMove)


		function displayPoke(ind){
			p = ind
			p++
			var teamSide;
			var stringy;
			if(p<=3){
				teamSide = "Blue"
				stringy = colors.blue("Team " + teamSide) + " - Pokemon " + (p)
			} else if(p>3){
				teamSide = "Red"
				stringy = colors.red("Team " + teamSide) + " - Pokemon " + (p)
			}
			return stringy;
		}

	
}

function getBestMove(moveList, infoString, p1, p2){
	if(cosmetics==true){console.log(infoString + moveList)}
	var bestIndex;
	compare = [0,0,0,0];
	for(i=0;i<4;i++){
		if(moveList[1][i] != null){
			if(moveList[1][i] == "OHKO"){
				compare[i] = 30
			}
			else if(moveList[0][i] != 0){
				if((c==2 || c==5) && ((moveList[2][i] == "Explosion") || (moveList[2][i] == "Self-Destruct"))){
					compare[i] = parseInt((moveList[0][i] * 0))
				}else{
				compare[i] = parseInt((moveList[0][i] * moveList[1][i]).toFixed(1))
			}
			} else if(moveList[0][i] == 0){
				if(moveList[3][i] == "Status"){
				handleStatus(moveList, moveList[2][i])
			}
			}
		}		
	
	}
	var k = Math.max(compare[0],compare[1],compare[2],compare[3]);
	var bestIndex = compare.indexOf(k)
	if(cosmetics==true){console.log("max no: " + k)
	console.log(bestIndex)}
	bestMove[p1][p2] = bestIndex + 1
}

//HANDLE ALL STATUS EFFECTS
function handleStatus(moveList, name){
	//console.log(name)
}
////////////////////////////////////
////////////////////////////////////
////////////////////////////////////
////////////////////////////////////
////////////////////////////////////
////////////////////////////////////
////////////////////////////////////


   var bubb = 0;



function main() {
  console.log("Getting current match...");
  let match;
  if (TEST_MATCH_PATH) {
    match = require(TEST_MATCH_PATH);
  } else {
    const res = request('GET', "https://twitchplayspokemon.tv/api/current_match", {
      headers: {
        'OAuth-Token': TPP_OAUTH
      },
    });
    match = JSON.parse(res.getBody('utf8'));
  }
  console.log("Done.");
  ///////
  //testing functions




  //////
  if ((match.base_gimmicks.includes('blind_bet') || match.base_gimmicks.includes('secrecy')) && !match.started) {
    throw new Error("Can't analyze a match unless all the Pokemon have been revealed.");
  }
  if (!match.base_gimmicks.includes('defiance')) {
    console.log("WARNING: This is not a defiance match!");
  }

  let betconf = 100;
  const startTime = Date.now();
  let wincounter = {
    Blue: 0,
    Red: 0,
  };
  let drawCount = 0;
  let teams = [[], []];
  for (let i = 0; i < teams.length; i++) {
    for (const pokemon of match.teams[i]) {
      teams[i].push({
        name: pokemon.ingamename,
        species: pokemon.species.name, // TODO: handle forms
        item: pokemon.item.name,
        ability: pokemon.ability.name,
        moves: pokemon.moves.map(move => move.name),
        nature: pokemon.nature.name,
        gender: pokemon.gender ? pokemon.gender.toUpperCase() : 'N',
        evs: convert_stats_table(pokemon.evs),
        ivs: convert_stats_table(pokemon.ivs),
        level: pokemon.level,
        shiny: pokemon.shiny,
        happiness: pokemon.happiness,
      });
    }
    //console.log(teams)
    
  }
  for(q = 0; q< 2; q++){
	for(b = 0; b< 3; b++){
	  for(j = 0; j< 4; j++){
	  	if(match.teams[q][b].moves[j] != null){	
	  		moveTies.push(match.teams[q][b].moves[j])
	  		moveAcc.push(match.teams[q][b].moves[j].accuracy)
		}
	  }
	}
	}
//console.log(teams);
  

///
  const isRandomOrder = match.base_gimmicks.includes('random_order');
  const isTraitor = match.base_gimmicks.includes('traitor');
  const isSwitching = match.switching.includes('always');
  const isFog = match.base_gimmicks.includes('fog');

  let battle;
  let i;
  console.log("Begin simulation of matches...");
  for (i = 1;; i++) {
    battle = new Sim.Battle({
      formatid: PBR_FORMAT,
    });
    // prevent battle from starting so we can edit stuff first
    battle.started = true;

    let newTeams = teams;
    if (!match.started && (isRandomOrder || isTraitor)) {
      // TODO: In what order are these gimmicks applied?
      newTeams = teams.map(team => team.slice());
      if (isRandomOrder) {
        for (let team of newTeams) {
          battle.shuffle(team);
        }
      }
      if (isTraitor) {
        // swap 2 pokes, same position
        const p = battle.random(3);
        const temp = newTeams[0][p];
        newTeams[0][p] = newTeams[1][p];
        newTeams[1][p] = temp;
      }
    }

    battle.join('p1', 'Blue', 1, newTeams[0]);
    battle.join('p2', 'Red', 2, newTeams[1]);

    for (const side of battle.sides) {
      for (const pokemon of side.pokemon) {
        pokemon.originalPosition = pokemon.position;
        for (const [m, move] of pokemon.baseMoveSlots.entries()) {
          // change move PP
          const moveData = battle.getMove(move.id);
          const oldMoveData = match.teams[side.n][pokemon.position].moves[m];
          if (oldMoveData) {
            move.pp = oldMoveData.pp;
            move.maxpp = moveData.pp * (5 + oldMoveData.pp_ups) / 5;
          }
        }
        pokemon.clearVolatile(); // actually update the moveslots TriHard
      }
    }

    if (match.stage) {
      battle.colosseum = match.stage;
    } else if (isFog && battle.randomChance(1,2)) {
      // TODO: confirm this is correct
      battle.colosseum = 'courtyard';
    } else {
      battle.colosseum = battle.sample([
        'gateway', 'mainstreet', 'waterfall', 'neon', 'crystal',
        'sunnypark', 'magma', 'sunset', 'stargazer', 'lagoon',
      ]);
    }

    battle.started = false;
    battle.start();

    //
//console.log(battle.getMove(moveTies[0]))
    //
    if (isFog) battle.setWeather('fog');

    while (!battle.ended) {
      if (battle.turn > 500) {
        console.log('===BEGIN BAD MATCH LOG EXPORT===');
        console.log(battle.log.join('\n'));
        console.log('===END BAD MATCH LOG EXPORT===');
        console.log('===BEGIN BAD MATCH INPUT LOG EXPORT===');
        console.log(battle.inputLog.join('\n'));
        console.log('===END BAD MATCH INPUT LOG EXPORT===');
        throw new Error("The match fucked up somehow.");
      }
      for (const side of battle.sides) {
        let result;
        switch (side.currentRequest) {
          case 'switch':
            // TPPBR switching rules.
            let target = null;
            for (let i = side.active.length; i < side.pokemon.length; i++) {
              const pokemon = side.pokemon[i];
              if (!(pokemon.fainted) && (!target || pokemon.originalPosition < target.originalPosition)) {
                target = pokemon;

              }
            }
            result = battle.choose(side.id, `switch ${target.position + 1}`);
            if (!result) throw new Error(side.choice.error);
            break;
          case 'move':
            // Same as TPPBR, choose random moves until one works
            let tries = 0;
            do {
            	//i need to change this
            	
            	var chooseBest;
            	
            	
            	
            

    		var us = side.active[0].originalPosition;
    		var them = side.foe.active[0].originalPosition;
    		if(side.name == "Red"){
    			us += 3
			}
    			
    			chooseBest = bestMove[us][them];
    			
         
            	//if (side.p1.active)console.log("Foe is " + side.foe.active[0].originalPosition)

              result = battle.choose(side.id, `move ${(chooseBest)} `);

            //console.log("Choosing move on " + side.name)
            //console.log("Foe is " + side.foe.active[0].originalPosition)
            //console.log("Foe is " + side.foe.active[0].name)
            //console.log("We are " + side.active[0].originalPosition)
            //console.log("We are " + side.active[0].name)
            //console.log("using " + side.active[0].name)
            //console.log("using " + `${(chooseBest)}`)
            //console.log("using " + result)

              //okay
              if (++tries > 30) {
              	result = battle.choose(side.id, `move ${battle.random(4) + 1}`);
              	bubb++;
              	

              };
              if (++tries > 200) throw new Error(`${side.id} stuck on a move choice: ${side.choice.error}`);
            } while (!result);
            break;
        }
      }
    }
    if (battle.winner) wincounter[battle.winner]++;
    else drawCount++;

    if (DEBUG && i % DEBUG_EVERY === 0) {
      console.log('===BEGIN RANDOM MATCH LOG EXPORT===');
      console.log(battle.log.join('\n'));
      console.log('===END RANDOM MATCH LOG EXPORT===');
      console.log('===BEGIN RANDOM MATCH INPUT LOG EXPORT===');
      console.log(battle.inputLog.join('\n'));
      console.log('===END RANDOM MATCH INPUT LOG EXPORT===');
    }

    battle.destroy();

    if (MAX_TIME && Date.now() - startTime >= MAX_TIME) {
      break;
    }
  }
console.log("A move was randomized " + bubb + "times")
  console.log(`Simulated ${i} battles in ${Date.now() - startTime}ms.`);
  if (drawCount > 0) {
    console.log(`Of these, ${drawCount} draw(s) were discarded.`);
    i -= drawCount;
  }
  let favoredTeam = wincounter['Blue'] > wincounter['Red'] ? 'Blue' : 'Red';
  let nonfavored = wincounter['Blue'] < wincounter['Red'] ? 'Blue' : 'Red';
  let favoredWinrate = (wincounter[favoredTeam] / i).toFixed(3);
  let nonfavoredWinrate = (1 - (wincounter[favoredTeam] / i)).toFixed(3);
  let ratio = (favoredWinrate / nonfavoredWinrate).toFixed(2);
  console.log(`${favoredTeam} win chance: ${favoredWinrate}`);
  console.log(`${nonfavored} win chance: ${nonfavoredWinrate}`);

  // Large Counts condition
  if (wincounter['Blue'] >= 10 && wincounter['Red'] >= 10) {
    let standardError = (Math.sqrt(favoredWinrate * (1-favoredWinrate) / i)).toFixed(3);
    console.log(`Margin of error: ${Z_Star_Round * standardError}`);
  } else {
    console.log("Counts are too small to infer a margin of error.");
  }
  if (favoredTeam == "Red"){
  	console.log(colors.red(`---------- Bet ${favoredTeam} -----------`))
   console.log(colors.red(`---------- For ${ratio} : 1 -----------`))
  }
   if (favoredTeam == "Blue"){
  	console.log(colors.blue(`---------- Bet ${favoredTeam} -----------`))
   console.log(colors.blue(`---------- For ${ratio} : 1-----------`))
  }
   
}


