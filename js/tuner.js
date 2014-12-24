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

var chromCircle = new Image();
chromCircle.src = 'img/chromaticCircle.png';

var fps = 12;
var now;
var then = Date.now();
var interval = 1000/fps;
var delta;

//Audio Context Variables
var audioCtx = new (window.AudioContext || window.webkitAudioContext)() ;
var analyser = audioCtx.createAnalyser();

var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
var TO_RADIANS = Math.PI/180; 

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
	
	//console.log(data);
	var peaks = getPeaks(data, -60)[1];		//Store peak indices
	var peakBins = [];	
	var peakMags = [];	
	
	//console.log(peaks);
	for (var i = 0; i < peaks.length; i++){
		peak = peaks[i];
		var tmp = peakInterpolate(peak-1, data[peak-1], peak, data[peak], peak+1, data[peak+1]); 	//store tuple
		peakBins.push(tmp[0]);		
		peakMags.push(tmp[1]);
	}
	
	//console.log(peakBins + " - " + peakMags);
	
	var bin2Freq = audioCtx.sampleRate/2/bufferSize		//Factor to convert bin to frequency
	var minFreqBin = 30/bin2Freq
	var maxFreqBin = 1500/bin2Freq
	f0 = f0Detection(peakBins, peakMags, 30, 1500, audioCtx.sampleRate, bufferSize);
	
	return f0;
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

function drawTriangle(color){
	canvasCtx.moveTo(300, 50);
	canvasCtx.lineTo(275, 75);
	canvasCtx.lineTo(325, 75);
	canvasCtx.fillStyle = color;
	canvasCtx.fill();
}

//Looping function to redraw and recalculate.
function update(){

	now = Date.now();
	delta = now - then;
	//console.log(delta);
	
	if (delta > interval) {
		var freq = Math.round(getFrequency());
		var cents = "-";
		var note = "-";
		var angle = 0;

		//Frequency resolved
		if (freq != -1) {
			cents = freq2cents(freq); 	//store temp absolute note in cents
			note = cents2note(cents); 	//Store temp array
			angle = cents2angle(cents);		
			cents = note[1];
			note = note[0];
		}

		else freq = "-";	//To draw string

		canvasCtx.clearRect(0, 0, c.width, c.height);
		
		rotateImg(chromCircle, angle);
		
		(Math.abs(cents) < 3) ? drawTriangle("green") : drawTriangle("red");

		canvasCtx.font="30px Verdana";
		canvasCtx.fillText("Frequency: " + freq + " Hz",150,240);
		canvasCtx.fillText("Note: " + note, 150, 300);
		canvasCtx.fillText("Cents: " + cents, 150, 360);
		
		then = now - (delta % interval);

	}
	
	window.requestAnimationFrame(update);
}

window.requestAnimationFrame(update);
