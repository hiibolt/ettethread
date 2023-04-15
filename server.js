/**   Libraries   **/
// Utilites
const bodyParser = require('body-parser');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Server
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// Other
const { Configuration, OpenAIApi } = require("openai");


// Library configuration
const configuration = new Configuration({
  apiKey: process.env.OPEN_AI_KEY,
});
const openai = new OpenAIApi(configuration);
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Variables
const delimiter = '~#~\n';
let timer;

function listFilesRecursively(dir, baseDir) {
	let ret = [];
	
	// if baseDir is not provided, use dir as the baseDir
	baseDir = baseDir || dir;

	// read the contents of the directory
	const files = fs.readdirSync(dir);

	// iterate over the files
	for (const file of files) {
		const filePath = path.join(dir, file);

		// check if the file is a directory
		if (fs.statSync(filePath).isDirectory()) {
			// if it's a directory, recursively call listFilesRecursively
			ret = [ ...ret, ...listFilesRecursively(filePath, baseDir)];
		} else {
			// if it's a file, print the path (minus the base path)
			ret.push(filePath.replace(baseDir, '') + "");
		}
	}
	return ret;
}
function setPathValue(path, value, obj) {
  // split the path into its segments
  const segments = path.split('/');
  
  // use reduce to create the nested objects and set the value of the final property
  segments.reduce((acc, segment, index) => {
    if (index === segments.length - 1) {
      // if this is the last segment, set the value
      acc[segment.split('.')[0]] = value;
    } else if (!acc.hasOwnProperty(segment)) {
      // if the segment doesn't exist, create a new object
      acc[segment] = {};
    }
    // return the nested object for the next iteration
    return acc[segment];
  }, obj);
}

rl.on( 'line', (line) => {
	let command = line.split(' ');
	switch (command[0]){
		case '$$buildimports':
			let files = listFilesRecursively('public/assets');
			console.log(files.length)

			// Turn the paths into an object
			//files.forEach( (file) => {
			//	setPathValue(file, file.split('/').slice(-1)[0], file_structure);
			//});

			// Write the object to a human readable file
			fs.writeFileSync( 'public/imports.txt', JSON.stringify({items:files}) );
			break;
		default:
			// Ignore bad answers
			if( line.length == 0 ){
				return;
			}
			console.log("make this do stuff in the future\n" + line);
	}
})

app.use('/public', express.static(__dirname+'/public'));
app.get('/vm3', function(req, res) {
	res.sendFile(__dirname+'/public/monikai/index.html');
});
app.get('/', function(req, res) {
	res.send('hi!');
})
app.use(bodyParser.urlencoded({ extended: false }));

io.on('connection', function(socket) {
	console.log(socket.id + ' | Connected');


	socket.on( "cts_gpt_interaction", (data) => {
		console.log("Recieved GPT req:")
		console.dir(data);

		let messages;
		try{
			messages = data.log.map( (line) => {
				let response = line.match(/\[(.+)\]\[.+\]: (.+)/) ||  line.match(/\[(.+)\]: (.+)/);
				return { "role": (response[1] == 'Nastya' ? "assistant" : "user"), "content": line }
			})
			console.log(messages)
			let proompt = [
				{ "role": "system", "content": data.characters[0].description },
				{ "role": "system", "content": `${data.context}\nNastya's goal: ${data.characters[0].goal}` },
				{ "role": "system", "content": `Message format: [${data.characters[0].name}][${data.characters[0].emotions.join(' | ')}]: blah blah blah etc`},
				...messages
			]
			console.log(proompt)
			openai.createChatCompletion({
				model: "gpt-3.5-turbo",
				messages: proompt,
			}).then( (response) => {
				let msg = response.data.choices[0].message.content
				console.log(msg);
				let prooompt2 = `Decide whether Nastya completed her goal of ${data.characters[0].goal}.\n\nConversation:\n${[...messages, msg].map( i=>i.content ).join('\n')}\n\nCreate a JSON file for it, similar to the following:\nExample:\n{"completed": true, "exit_token": ${data.exit_tokens.map(i=>'"'+i+'"').join('|')}}\n\nJSON File:\n{
				`;
				console.log(prooompt2)
				openai.createCompletion({
					model: "text-davinci-003",
					prompt: prooompt2,
					temperature: 0,
					max_tokens: 300,
				}).then( (analyzed_response)=>{
					let analytics = analyzed_response.data.choices[0].text;
					console.log(analytics);
					console.log(JSON.parse("{" + analytics));

					socket.emit( 'stc_gpt_interaction', { msg, analytics: JSON.parse("{" + analytics) })

				});
			})

		}catch(e){
			console.log(e);
			fs.writeFileSync('data/logs.txt', `${e}\n`);
		}
	})
	/**
  socket.on('cts_msg', (data) => {
    // Add player's message
		log_message( "user", data.content, "browser" );
		set_timer(0, "browser", (response) => {
			socket.emit( 'stc_msg', JSON.parse(last_messages[last_messages.length - 1]) );
		});
  });
	**/
	
	socket.on('disconnect',function(){
		console.log(socket.id + ' | Disconnected');
	})
});


http.listen(3000, () => {
  console.log(`Server for monikai started on port 3000! Enjoy~`);
});