// Minimal functions. Avoid putting as much as possible here.

/**
 * @description Set the value of a nested object property given a path string
 * @param {string} path - The path to the property
 * @param {string} value - The value to set
 * @param {object} obj - The object to set the value in
 */
function setPathValue(path, value, obj) {
  // Split the path into its segments
  const segments = path.split('/');
  
  // Use reduce to create the nested objects and set the value of the final property
  segments.reduce((acc, segment, index) => {
    if (index === segments.length - 1) {
      // if this is the last segment, set the value
			switch (value.split('.')[1]){
				case "png":
					acc[segment.split('.')[0]] = loadImage('public/assets' + path);
					break;
				case "webp":
					acc[segment.split('.')[0]] = loadImage('public/assets' + path);
					break;
				case "jpg":
					acc[segment.split('.')[0]] = loadImage('public/assets' + path);
					break;
				case "svg":
					acc[segment.split('.')[0]] = loadImage('public/assets' + path);
					break;
				case "ttf":
					acc[segment.split('.')[0]] = loadFont('public/assets' + path);
					break;
				case "txt":
					acc[segment.split('.')[0]] = loadJSON('public/assets' + path);
					break;
				default:
					console.log(`BAD TYPE: ${path}`);
			}
      
    } else if (!acc.hasOwnProperty(segment)) {
      // If the segment doesn't exist, create a new object
      acc[segment] = {};
    }
    // Return the nested object for the next iteration
    return acc[segment];
  }, obj);
}

/**
 * @description Get the value of a nested object property given a path string
 * @param {string} path - The path to the property
 * @param {object} obj - The object to grab the value from
 */
function grabValueFromPath(path, obj) {
	// Split the path into its segments
	const segments = path.split('/');

	let value = obj;
	for(let i = 0; i < segments.length; i++){
		if(value.hasOwnProperty(segments[i])){
			value = value[segments[i]];
		}else{
			return null;
		}
	}
	return value;
}


/**
 * @description Log an error to the console and exit the program
 * @param {string} hint - A hint about what the error is
 * @param {object} error - The error object
 */
function fatal_error( hint, error ){
	console.log( hint );
	console.dir( error );
	exit();
}

/**
 * @description Get the true position of an object on the screen
 * @param {array} pos_obj - The position of the object
 * @param {object} canvas - The canvas object
 * @returns {array} The true position of the object
 */
function true_position( pos_obj, canvas ){
	return [ pos_obj[0] * canvas.y_scale + (canvas.windowWidth - 1280 * canvas.y_scale) / 2, pos_obj[1] * canvas.y_scale ];
}

