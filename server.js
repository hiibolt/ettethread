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

function listFilesRecursively(dir, baseDir) {
	let ret = [];
	
	// If baseDir is not provided, use dir as the baseDir
	baseDir = baseDir || dir;

	// Read the contents of the directory
	const files = fs.readdirSync(dir);

	// Iterate over the files
	for (const file of files) {
		const filePath = path.join(dir, file);

		// Check if the file is a directory
		if (fs.statSync(filePath).isDirectory()) {
			// If it's a directory, recursively call listFilesRecursively
			ret = [ ...ret, ...listFilesRecursively(filePath, baseDir)];
		} else {
			// If it's a file, print the path (minus the base path)
			ret.push(filePath.replace(baseDir, '') + "");
		}
	}
	return ret;
}
function setPathValue(path, value, obj) {
  // Split the path into its segments
  const segments = path.split('/');
  
  // Use reduce to create the nested objects and set the value of the final property
  segments.reduce((acc, segment, index) => {
    if (index === segments.length - 1) {
      // If this is the last segment, set the value
      acc[segment.split('.')[0]] = value;
    } else if (!acc.hasOwnProperty(segment)) {
      // If the segment doesn't exist, create a new object
      acc[segment] = {};
    }
    // Return the nested object for the next iteration
    return acc[segment];
  }, obj);
}

rl.on( 'line', (line) => {
	let command = line.split(' ');
	switch (command[0]){
		case '$$buildimports':
			// Grab all files from assets as an object
			let files = listFilesRecursively('public/assets');

			// Write the object to a human readable file
			fs.writeFileSync( 'public/imports.txt', JSON.stringify({items:files}) );
			break;
		default:
			console.log(`Command ${line} not found!`);
	}
})

app.use('/public', express.static(__dirname+'/public'));
app.get('/vm3', function(req, res) {
	res.sendFile(__dirname+'/public/monikai/index.html');
});
app.use(bodyParser.urlencoded({ extended: false }));

io.on('connection', function(socket) {
	console.log(socket.id + ' | Connected');

	socket.on( "cts_gpt_interaction", (data) => {
		console.log("Recieved GPT req:")
		console.dir(data);

		// Convert [Character][EMOTION]: ... messages to { "role": "assistant | user", "content": "..."}
		let messages = data.log.map( (line) => {
			let response = line.match(/\[(.+)\]\[.+\]: (.+)/) ||  line.match(/\[(.+)\]: (.+)/);
			return { "role": (response[1] == data.characters[0].name ? "assistant" : "user"), "content": line }
		});

		// Add system context
		let chat_prompt = [
			{ "role": "system", "content": data.characters[0].description },
			{ "role": "system", "content": `${data.context}\nNastya's goal: ${data.characters[0].goal}\nDirect conversation to complete this goal. You still have not completed your goal.` },
			{ "role": "system", "content": `Message format: [${data.characters[0].name}][${data.characters[0].emotions.join(' | ')}]: blah blah blah etc`},
			...messages
		];
		console.log(chat_prompt);

		// Generate the next chat
		openai.createChatCompletion({
			model: "gpt-3.5-turbo",
			messages: chat_prompt,
		}).then( (res) => {
			// Get the chat's next response
			let chat_response = res.data.choices[0].message.content;
			console.log(chat_response);

			// Create prompt context
			let analytic_prompt = `Decide whether Nastya completed her goal: ${data.characters[0].goal}.\n\nConversation:\n${[...messages, chat_response].map( i=>i.content ).join('\n')}\n\nCreate a JSON file for it, similar to the following:\nExample:\n{"completed": true, "exit_token": ${data.exit_tokens.map(i=>'"'+i+'"').join('|')}}\n\nJSON File:\n{`;
			console.log(analytic_prompt);

			// Decide whether the character has completed their goal
			openai.createCompletion({
				model: "text-davinci-003",
				prompt: analytic_prompt,
				temperature: 0,
				max_tokens: 300,
			}).then( (res)=>{
				// Parse the decision
				let analytic_response = JSON.parse("{" + res.data.choices[0].text);
				console.dir(analytic_response);

				socket.emit( 'stc_gpt_interaction', { chat_response, analytic_response })

			});
		})
	})
	
	socket.on('disconnect',function(){
		console.log(socket.id + ' | Disconnected');
	})
});


http.listen(3000, () => {
  console.log(`Server for monikai started on port 3000! Enjoy~`);
});