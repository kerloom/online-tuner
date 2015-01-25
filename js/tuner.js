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

var fps = 16;
var now;
var then = Date.now();
var interval = 1000/fps;
var delta;

//Audio Context Variables
var audioCtx = new (window.AudioContext || window.webkitAudioContext)() ;
var analyser = audioCtx.createAnalyser();

var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
var TO_RADIANS = Math.PI/180;

var prevAudioData = 0; 	//previous spectrum to be averaged
var prevF0 = [0,0,0,0,0,0];	//record of previous F0 to be averaged
var dataGlob = 0;
var peaksGlob = 0;

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

	if (prevAudioData != 0) {

		if (prevAudioData != null) {
			data = numeric.div(numeric.add(data, prevAudioData), 2); 		//average previous data
			dataGlob = data;
		}	

		var peaks = getPeaks(data, -70)[1];		//Store peak indices above threshold
		peaksGlob = peaks;
		var peakBins = [];	
		var peakMags = [];	
		
		for (var i = 0; i < peaks.length; i++){
			peak = peaks[i];
			var tmp = peakInterpolate(peak-1, data[peak-1], peak, data[peak], peak+1, data[peak+1]); 	//store tuple
			peakBins.push(tmp[0]);		
			peakMags.push(tmp[1]);
		}
		
		f0 = f0Detection(peakBins, peakMags, 30, 1000, audioCtx.sampleRate, bufferSize);
		
		prevAudioData = 0;			//Reset to 
		return f0;
	}
	else {
		prevAudioData = data;
		return prevF0[prevF0.length-1];
	}
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

function drawSpectro(data, peaks){
	//Debugging purposes
	var binWidth = 1;//Math.floor(c.width / (data.length/2));
	var HEIGHT_MULT = 5;
	var xOffset = 40;
	var yOffset = c.height - 20;
	var bin2Freq = audioCtx.sampleRate/2/bufferSize		//Factor to convert bin to frequency

	for (var i = 0; i < data.length; i++){
		var barHeight = (100 + data[i]) * -1 * HEIGHT_MULT;

		if(peaks.indexOf(i) != -1) {
			var pk = peaks[peaks.indexOf(i)];
			var peak = peakInterpolate(pk-1, data[pk-1], pk, data[pk], pk+1, data[pk+1])[0];
			var freq = (peak * bin2Freq).toFixed(1);

			canvasCtx.fillStyle = "red";
			canvasCtx.font="8px Verdana";
			canvasCtx.fillText(freq + "Hz", i + 5 + xOffset, c.height + barHeight - 7);	
		}

		canvasCtx.fillRect(i + xOffset, yOffset, binWidth, barHeight);
		canvasCtx.fillStyle = "black";
	}

	//Leyends
	canvasCtx.fillStyle = "white";
	canvasCtx.fillRect(0, yOffset, c.width, yOffset + c.height);	//Clean space beneath offset
	
	canvasCtx.fillStyle = "black";
	canvasCtx.font="10px Verdana";
	
	//Horizontal Label
	for (var i = xOffset; i < c.width; i+=50) {
		var freq = Math.round((i - xOffset + 1) * bin2Freq);
		
		canvasCtx.fillRect(i, yOffset, 1, 5);
		canvasCtx.fillText(freq, i - 10, yOffset + 15);		
	}

	//Vertical Label
	for(var i = yOffset; i > 0; i-=50){
		var dBs = Math.round(-(i * 100 / yOffset));
		canvasCtx.fillRect(xOffset, i, -5, 1);
		canvasCtx.fillText(dBs, 12, i + 5);
	}
}

function meanFreq(freqs) {
	var f0s = trimArray(freqs, 0.03); 

	return numeric.sum(f0s)/f0s.length;
}

//Looping function to redraw and recalculate.
function update(){

	now = Date.now();
	delta = now - then;
	
	if (delta > interval) {

		var freq = getFrequency();
		prevF0.shift();
		prevF0.push(freq);
			//console.log(prevF0);
		var cents = "-";
		var note = "-";
		var angle = 0;

		//TODO: Improve cents stability		
		if (prevF0.indexOf(-1) == -1) {
			// All frequencies are valid
			freq = meanFreq(prevF0);

			cents = freq2cents(freq); 	//store temp absolute note in cents
			note = cents2note(cents); 	//Store temp array
			angle = cents2angle(cents);		
			cents = note[1];
			note = note[0];
			freq = Math.round(freq);
			
		} else {
			freq = -1;
			freq = "-";	//To draw string
		}

		canvasCtx.clearRect(0, 0, c.width, c.height);
		
		rotateImg(chromCircle, angle);
		(Math.abs(cents) <= 3) ? drawTriangle("green") : drawTriangle("red");
		
		
		drawSpectro(dataGlob, peaksGlob); //For debugging

		canvasCtx.font="30px Verdana";
		canvasCtx.fillText("Frequency: " + freq + " Hz",200, 140);
		canvasCtx.fillText("Note: " + note, 200, 200);
		canvasCtx.fillText("Cents: " + cents, 200, 260);
		
		then = now - (delta % interval);

	}
	
	window.requestAnimationFrame(update);
}

window.requestAnimationFrame(update);
