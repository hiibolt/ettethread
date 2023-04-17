// blehhh
"use strict";
p5.disableFriendlyErrors = true;

// Libraries
const socket = io();

// Assets
let assets = {};
let script = {};

// Variables
let playername = "Bolt";

// Variables
var get_character;
let canvas;
let scene = {
	"background": null,
	"_characters": [],
	"_messages": [],
	"_stack": null,
	"_queue": [],
	"_asking": false,
	"_log": [],
	"_objects": [],
	"_variables": [],
	// bg: sets the background image
	// options:
	// 		background: the background image to set
	"bg": function( options ){ 
		this["background"] = options["background"];
	}, 
	// save: saves to the autosave slot
	// options:
	// 		slot: the slot to save to
	"save": function( options ){
		localStorage.setItem( options.slot ? options.slot : "autosave", JSON.stringify({
			"background": this["background"],
			"_characters": this["_characters"],
			"_messages": this["_messages"],
			"_stack": this["_stack"],
			"_queue": this["_queue"],
			"_asking": this["_asking"],
			"_log": this["_log"],
			"_objects": this["_objects"],
			"_variables": this["_variables"],
		}) );
		console.log(`Saved to slot: ${options.slot}`);
	},
	// load: loads from a slot
	// options:
	// 		slot: the slot to load from
	"load": function( options ){
		let slot = options.slot || "autosave";
		if( localStorage.getItem(slot) ){
			let save = JSON.parse(localStorage.getItem(slot));
			this["background"] = save.background;
			this["_characters"] = save._characters;
			this["_messages"] = save._messages;
			this["_stack"] = save._stack;
			this["_queue"] = save._queue;
			this["_asking"] = save._asking;
			this["_log"] = save._log;
			this["_objects"] = save._objects;
			this["_variables"] = save._variables;
		}else{
			console.log(`Save '${slot}' not found!`)
		}
	},
	// introduce: adds a character to the scene
	// options:
	// 		name: the name of the character
	// 		emotion: the emotion of the character
	// 		xpos: the x position of the character
	// 		ypos: the y position of the character
	// 		opacity: the opacity of the character
	//    scale: the scale of the character
	"introduce": function( options ){ 
		this["_characters"].push( { 
			name: options["name"], 
			outfit: options["outfit"],
			emotion: options["emotion"] || "NEUTRAL", 
			description: assets["sprites"][options["name"]]["character"]["description"],
			emotions: assets["sprites"][options["name"]]["character"]["emotions"],
			xpos: options["xpos"] * 1 || 280,
			ypos: options["ypos"] * 1 || 0,
			scale: options["scale"] * 1 || 1,
			opacity: options["opacity"] * 1 || 0,
		});
		this["_queue"].push({
			cmd: "fade_character",
			character: get_character( options["name"] ),
			direction: "in",
			blocking: true
		});
	},
	// leave: removes a character from the scene
	// options:
	// 		name: the name of the character to remove
	"leave": function( options ){ 
		this["_queue"].push({
			cmd: "fade_character",
			character: get_character( options["name"] ),
			direction: "out",
			blocking: true
		});
	},
	// say: makes a character say something
	// options:
	// 		name: the name of the character to say something
	// 		msg: the message the character will say
	// 		speed: the speed at which the character will say the message
	// 		emotion: the emotion the character will have while saying the message
	//    alternating: whether the character will use alternating speaking sprites
	//    nospeak: whether the character does not have a speaking sprite
	"say": function( options ){
		this["_messages"].push({ 
			name: options["name"] || "???", 
			content: options["msg"], 
			speed: options["speed"] || 1,
			alternating: options["alternating"] || false,
			nospeak: options["nospeak"] || false,
			time: millis(),
		}); 
		if( get_character(options["name"]) ){
			let char = get_character(options["name"]);
			char.emotion = options["emotion"] || char.emotion;
			this["_log"].push( `[${char.name}][${char.emotion}]: ${options["msg"]}` )
		} 
	},
	// psay: makes the player say something
	// options:
	// 		msg: the message the player will say
	// 		speed: the speed at which the player will say the message
	"psay": function( options ){ 
		this["_messages"].push({ 
			name: playername, 
			content: options["msg"], 
			speed: options["speed"] || 1,
			time: millis() 
		}); 
		this["_log"].push( `[player]: ${options["msg"]}` )
	},
	// stage: sets the current stage
	// options:
	// 		id: the id of the stage to set
	"stage": function( options ){
		this["_stack"] = script[options["id"]];
		this["_characters"] = [];
		this["_messages"] = [];
		this["_log"] = [];
		this["background"] = null;
	},
	// move: moves a character to a new position
	// options:
	// 		name: the name of the character to move
	// 		xpos: the x position to move the character to
	// 		ypos: the y position to move the character to
	//      scale: the scaling of the character's sprite
	"move": function( options ){
		let character = get_character( options["name"] );
		this["_queue"].push({
			cmd: "move",
			character,
			xpos: options["xpos"] || character.xpos,
			ypos: options["ypos"] || character.ypos,
			scale: options["scale"] || 1,
			speed: options["speed"] || 1,
			tick: 0,
			blocking: true
		});
	},
	// fade: fades the curtain in or out
	// options:
	// 		direction: the direction to fade the curtain
	"fade": function( options ){ 
		this["_queue"].push({
			cmd: `fade_curtain`,
			direction: options["direction"],
			speed: options["speed"] || 1,
			blocking: true
		}) 
	},
	// check: checks if a condition is true, and adds a stack of commands if it is
	// options:
	// 		value: the condition to check
	// 		yes_stack: the stack to add if the condition is true
	// 		no_stack: the stack to add if the condition is false
	"check": function( options, yes_stack, no_stack ){ 
		// maybe? refactor this later
		let tokens = options["value"].split(' ');
		tokens.forEach( (a, ind) => { 
			if (a == "var") { 
				let value = this["_variables"][tokens[ind + 1]];
				if(typeof value == "string"){
					value = '"' + value + '"';
				}
				tokens.splice(ind, 2, value); 
			}
		});
		let toeval = tokens.join(' ');
		console.log(`Attempting to evaluate ${toeval}`)
		let answer = eval(toeval);
		console.log(`${toeval} evaluated to ${answer}, adding the folllowing stack:`);
		if (answer){
			this["_stack"] = [ ...yes_stack, ...this["_stack"] ];
			console.log("   " + yes_stack);
		}else{
			this["_stack"] = [ ...no_stack, ...this["_stack"] ];
			console.log("   " + no_stack);
		}
	},
	"gpt": function( options ){
		this["_asking"] = true;
		this["_queue"].push({
			cmd: `gpt`,
			result_variable: options["result_var"],
			exit_tokens: options["exit_tokens"].split(','),
			blocking: true,
			context: options["context"],
		})
	},
	"goal": function( options ){
		get_character(options["name"]).goal = options["goal"].replace(/\[player\]/g, playername);
	},
	"set": function( options ){
		let value = options["value"].split(' ');
		value.forEach( (a, ind) => { 
			if (a == "var") { 
				value.splice(ind, 2, this["_variables"][value[ind + 1]]); 
			}
		});
		this["_variables"][options["var"]] = eval(value.join(' '));
		console.log(`Variable ${options["var"]} was set to ${this[options["var"]]}`);
	},
}
get_character = function( name ){
	return scene["_characters"].find( i => i.name == name );
}

// HTML Elements
const input_box = document.getElementById("player_message_main");

socket.on('stc_gpt_interaction', (data) => {
	console.log("Recieved message: ");
	console.dir(data);

	// Get the gpt command by reference
	let gpt_command = scene["_queue"].find( i=>i.cmd == "gpt");

	// If the character's goal is accomplished, exit the command and ignore the response.
	if(data.analytic_response.completed){
		// Set command
		scene["_variables"][gpt_command.result_variable] = data.analytic_response.exit_token;
		console.log(`${gpt_command.result_variable} was set to ${data.analytic_response.exit_token} via GPT interaction`);

		// Remove GPT command
		scene["_queue"].splice(scene["_queue"].findIndex( i=>i.cmd=="gpt" ), 1);
		return;
	}

	// Extract the name, emotion, and message content
	let chat_response_object = data.chat_response.match(/\[(.+)\]\[(.+)\]: (.+)/) ||  data.match(/\[(.+)\]: (.+)/);
	let name = chat_response_object[1];
	let emotion = chat_response_object[2];
	let content = chat_response_object[3];

	// Add the message to the message queue
	scene["_messages"].push({ 
		name, 
		content, 
		speed: 1,
		alternating: false,
		nospeak: false,
		time: millis(),
	}); 

	// If it's a valid emotion, adjust the character
	let char = get_character(name);
	char.emotion = ( emotion && char.emotions.includes(emotion) ) ? emotion : "NEUTRAL";

	// Add the message to the message log
	scene["_log"].push( `[${name}][${emotion}]: ${content}` )
});

function is_speaking( character ){
	if (character){
		return ( scene["_messages"][0] && scene["_messages"][0].name == character && scene["_messages"][0].time) ? (floor((millis() - scene["_messages"][0].time) / 20) < scene["_messages"][0].content.length) : false;
	}else{
		return ( scene["_messages"][0] && scene["_messages"][0].time) ? (floor((millis() - scene["_messages"][0].time) / 20) < scene["_messages"][0].content.length) : false;
	}
}
// Input handling
function mouseClicked(){
	if( is_speaking() ){
		scene["_messages"][0].time = -100000000; // blehh
	}else{
		if( scene["_messages"].length > 0 ){
			// Feed new message 
			let last_message = scene["_messages"].splice( 0, 1 );
			
			console.dir(last_message[0])
			if(last_message[0].name != "[player]" && scene["_queue"].some( (i)=>i.cmd == "gpt" )){
				input_box.value = "";
				scene["_asking"] = true;
			}
			return;
		}
	}
}
function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
	canvas = {
		windowWidth,
		windowHeight,
		x_scale: (windowWidth / 1280),
		y_scale: (windowHeight / 720)
	}
}


function preload(){
	// Download and initialize all assets
	loadJSON('public/imports.txt', (imports) => {
		console.log('Loaded download instructions');
	
		imports.items.forEach( (i)=>{
			setPathValue(i, i.split('/').slice(-1)[0], assets);
		} );
		console.log('Loaded assets');

		assets = assets[""];
	});

	// Download script
	script = loadJSON('public/script.txt', ()=>{
		console.log('Loaded script');
	});
}
function setup(){
	// Start script
	scene["_stack"] = script["entry"];
	
  	createCanvas( windowWidth, windowHeight );
	canvas = {
		windowWidth,
		windowHeight,
		x_scale: (windowWidth / 1280),
		y_scale: (windowHeight / 720)
	}
	//image( assets["gui"]["menu_bg"], 0, 0, windowWidth, 1320 * (windowWidth / 1380) );
	
	let pos = true_position( [275,573], canvas );
	input_box.style.left = `${pos[0]}px`;
	input_box.style.top = `${pos[1]}px`;
	input_box.style["font-size"] = `${ ceil(19 * canvas.y_scale) }px`;
	input_box.style["width"] = `${690 * canvas.y_scale}px`;
	input_box.style["height"] = `${65 * canvas.y_scale}px`;
	input_box.style.display = "none";
	input_box.value = "";
}
function draw(){
	// Work the queue
	scene["_queue"].forEach( (i, index) => {
		switch (i.cmd) {
			case "gpt":
				if( scene["_asking"]  ){
					input_box.style.display = "block";
				}else {
					input_box.style.display = "none";
				}
				
				// Button Handling
				let top_left = true_position( [980, 650 + cos(millis() / 600) * 2], canvas );
				let bottom_right = true_position( [980 + 34, 650 + cos(millis() / 600) * 2 + 34], canvas );
				if( scene["_asking"] && mouseIsPressed && mouseX > top_left[0] && mouseX < bottom_right[0] && mouseY > top_left[1] && mouseY < bottom_right[1]){
					scene["_asking"] = false;
					scene["_messages"].push({
						name: "[player]", 
						content: input_box.value, 
						speed: 1,
						time: millis(),
					});
					scene["_log"].push(`[player]: ${input_box.value}`);
					socket.emit( "cts_gpt_interaction", { 
						log: scene["_log"].slice(-20).map(i=>i.replace(/\[player\]/g, `[${playername}]`)), 
						characters: scene["_characters"],
						exit_tokens: i.exit_tokens,
						context: i.context.replace(/\[player\]/g, playername)
					} );
				}
				break;
			case "move":
				i.tick += i.speed / 1000 * deltaTime;
				i.character.xpos = lerp(i.character.xpos, i.xpos, i.tick);
				i.character.ypos = lerp(i.character.ypos, i.ypos, i.tick);
				i.character.scale = lerp(i.character.scale, i.scale, i.tick);
				if( dist( i.character.xpos, i.character.ypos, i.xpos, i.ypos ) < 1 ){
					scene["_queue"].splice(index,1);
				}
				break;
			case "fade_curtain":
				if( i.direction == "in" && scene["_variables"]["_curtain_opacity"] > -1 ){
					scene["_variables"]["_curtain_opacity"] -= deltaTime / 10 * i.speed;
				}else if( i.direction == "out" && scene["_variables"]["_curtain_opacity"] < 256 ){
					scene["_variables"]["_curtain_opacity"] += deltaTime / 10 * i.speed;
				}else{
					scene["_queue"].splice(index,1);
				}
				break;
			case "fade_character":
				if(i.direction == "in" && i.character.opacity < 255){
					i.character.opacity += deltaTime * 2;
				}else if(i.direction == "out" && i.character.opacity > 0){
					i.character.opacity -= deltaTime * 2;
				}else{
					if(i.direction == "out"){
						scene["_characters"].splice( get_character( i.character.name ), 1);
					}
					scene["_queue"].splice(index,1);
				}
				break;
		}
	})
	
	// If there are no blocking messages, there is a stack, and there are no message, work the stack
	while( !scene["_queue"].some( (i)=>i.blocking == true ) && scene["_stack"].length > 0 && scene["_messages"].length == 0 ){
		// Extract text based options
		var cmd = scene["_stack"][0];
		var options = {};
		
		while ( cmd.match(/ \w+=\`.+?\`/) !== null ){
			// Add the option
			let match = cmd.match(/ (\w+)\=`(.+?)`/);
			options[match[1]] = match[2];

			// Remove the option
			cmd = cmd.replace(/ \w+=\`.+?\`/, '');
		}
		cmd = cmd.split(' ');
		
		// Extract standard options
		var args = cmd.splice( 1, cmd.length - 1 );
		args.forEach( (i)=>{
			let option = i.split('=');
			options[option[0]] = option[1];
		});
		console.log(`${cmd[0]} called with options ${JSON.stringify(options)}`);
		
		// Activate command
		switch (cmd[0]){
			case "check":
				// Remove base command
				scene["_stack"].splice(0,1);

				// Grab and remove all elements prefixed with 'y '
				let yes_end_index = scene["_stack"]
					.slice(0,scene["_stack"].length)
					.findIndex( (i)=>i.split(' ')[0] != 'y' );
				let yes_elements = yes_end_index != -1 ? scene["_stack"]
					.splice(0, yes_end_index)
					.map( i=> {
						// Remove y prefix
						let ret = i.split(' ');
						ret.shift();
						return ret.join(' ');
					}) : scene["_stack"].splice(0, scene["_stack"].length).map( i=> {
						// Remove x prefix
						let ret = i.split(' ');
						ret.shift();
						return ret.join(' ');
					});

				// Grab and remove all elements prefixed with 'n '
				let no_end_index = scene["_stack"]
					.findIndex( (i)=>i.split(' ')[0] != 'n' );
				let no_elements = no_end_index != -1 ? scene["_stack"]
					.splice(0, no_end_index)
					.map( i=> {
						// Remove x prefix
						let ret = i.split(' ');
						ret.shift();
						return ret.join(' ');
					}) : scene["_stack"].splice(0, scene["_stack"].length).map( i=> {
						// Remove x prefix
						let ret = i.split(' ');
						ret.shift();
						return ret.join(' ');
					});
				
				scene[cmd[0]]( options, yes_elements, no_elements );
				break;
			default:
				scene["_stack"].splice(0,1);
				scene[cmd[0]]( options );
		};
	}
	
	push();
	translate( (windowWidth - 1280 * canvas.y_scale) / 2, 0 );
	scale( canvas.y_scale );
	image( assets["backgrounds"][scene["background"]], 0, 0, 1280, 720 );
	
	scene["_characters"].forEach( (character) => {
		let is_speaking_addendum = ( is_speaking( character.name ) && !scene["_messages"][0].nospeak ) ? "SPEAKING" : "";
		let alternating_addendum = (is_speaking_addendum != "" && scene["_messages"].length > 0 && scene["_messages"][0].alternating == "true" && millis() % 3000 > 1500 ) ? "ALT" : "";
		push();
		tint(255, character.opacity);
		translate(character.xpos, character.ypos);
		scale( character.scale );
		image( assets["sprites"][ character.name ][ character.outfit ][ character.emotion + is_speaking_addendum + alternating_addendum ], 0, 0, 960 * 0.75, 960 * 0.75 );
		pop();
	});

	// Curtain
	noStroke();
	fill(0, scene["_variables"]["_curtain_opacity"]);
	rect(0, 0, 1280, 720);

	// Messages
	if( scene["_asking"] ){
		image( assets["gui"][scene["_variables"]["_textbox_sprite"]], (1280 - 816) / 2, -166 + 720, 816, 146 );
	}
	if( scene["_messages"].length > 0 ){
		image( assets["gui"][scene["_variables"]["_textbox_sprite"]], (1280 - 816) / 2, -166 + 720, 816, 146 );
		
		textFont( assets["fonts"][scene["_variables"]["_speech_font"]], 19 );
		textAlign( LEFT );
		fill( 255 );
		strokeWeight( 2.5 );
		strokeCap(ROUND);
		stroke( 0 );
		text( scene["_messages"][0].content.replace(/\[player\]/g, playername).substring( 0, floor((millis() - scene["_messages"][0].time) / 20 * scene["_messages"][0].speed) ), 280, -123 + 720, 1280 - (280 * 2) );
	}
	
	// Continue button
	if( scene["_asking"] || ( scene["_messages"].length > 0 && !is_speaking() ) ){
		image( assets["gui"][scene["_variables"]["_next_icon"]], 980, 650 + cos(millis() / 600) * 2, 34, 34 );
	}

	pop();
}