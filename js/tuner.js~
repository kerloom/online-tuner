window.requestAnimationFrame = function() {
	return window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		function(f) {
			window.setTimeout(f,1e3/60);
		}
}();

navigator.getUserMedia = ( navigator.getUserMedia ||
                           navigator.webkitGetUserMedia ||
                           navigator.mozGetUserMedia ||
                           navigator.msGetUserMedia);

//Canvas and animation variables
var c = document.getElementById("canvas");
var canvasCtx= c.getContext("2d");

var fps = 12;
var now;
var then = Date.now();
var interval = 1000/fps;
var delta;

//Audio Context Variables
var audioCtx = new (window.audioContext || window.webkitAudioContext)() ;
var analyser = audioCtx.createAnalyser();

var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
var TO_RADIANS = Math.PI/180; 

var chromCircle = new Image();
chromCircle.src = 'img/chromaticCircle.png';

//Get audio input through microphone
try {
	navigator.getUserMedia(
          { video: false,
            audio: true},
          setupAudioNodes,
          errorFunction);
} catch (e) {
    console.log('webkitGetUserMedia threw exception :' + e);
    alert("Could not start getUserMedia");
}

//Function called when streaming is succesfull
function setupAudioNodes(stream) {
    sourceNode = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();

    //Setup Analyser
    analyser.fftSize = 2048;
	sourceNode.connect(analyser);

}

//called on getUserMedia error
function errorFunction (e) {
    console.log(e);
}

function getFrequency(){
	bufferSize = analyser.frequencyBinCount;
	var data = new Float32Array(bufferSize); 
	analyser.getFloatFrequencyData(data);

	peak = getMaxPeak(data)[0];
	peak = peakInterpolate(peak-1, data[peak-1], peak, data[peak], peak+1, data[peak+1]);

	return  audioCtx.sampleRate/2/bufferSize*peak[0];
}

function rotateImg(image, angle){
	canvasCtx.save();
	canvasCtx.translate(image.width/2, image.height/2)
	canvasCtx.rotate(angle * TO_RADIANS);
	canvasCtx.drawImage(image, -(image.width/2), -(image.height/2));
	canvasCtx.restore()
}

function cents2angle(cents){
	var angle = (cents % 1200) * -0.3;
	return angle;
}

//Looping function to redraw and recalculate.
function update(){

	now = Date.now();
	delta = now - then;
	//console.log(delta);
	
	if (delta > interval) {
		
		var freq = Math.round(getFrequency());
		var cents = freq2cents(freq); //store temp absolute note in cents
		var note = cents2note(cents); //Store array
		var angle = cents2angle(cents);		
		cents = note[1];
		note = note[0];

		canvasCtx.clearRect(0, 0, c.width, c.height);
		
		rotateImg(chromCircle, angle);
		
		canvasCtx.font="30px Verdana";
		canvasCtx.fillText("Frequency: " + freq + " Hz",150,240);
		canvasCtx.fillText("Note: " + note, 150, 300);
		canvasCtx.fillText("Cents: " + cents, 150, 360);
		
		then = now - (delta % interval);

	}

	window.requestAnimationFrame(update);
}

window.requestAnimationFrame(update);
