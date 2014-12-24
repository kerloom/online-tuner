//Different functions to use on audio.
//Last Update Dec 21, 2014

function peakInterpolate(x1, y1, x2, y2, x3, y3) {
	//Polynomial interpolation for 3 points
	var denom = (x1 - x2) * (x1 - x3) * (x2 - x3);
	var A     = (x3 * (y2 - y1) + x2 * (y1 - y3) + x1 * (y3 - y2)) / denom;
	var B     = (x3*x3 * (y1 - y2) + x2*x2 * (y3 - y1) + x1*x1 * (y2 - y3)) / denom;
	var C     = (x2 * x3 * (x2 - x3) * y1 + x3 * x1 * (x3 - x1) * y2 + x1 * x2 * (x1 - x2) * y3) / denom;

	var bin = -B / (2*A);
	var amp = C - B*B / (4*A);
	return [bin, amp];
}

function getMaxPeak(dataArray){
	//Return Max peak index and value
	var maxValue = Math.max.apply(null, dataArray);
	var idx;

	for (var i=0; i < dataArray.length; i++){
		if(dataArray[i] == maxValue) idx = i;
	}

	if (idx == null) {
		throw "No Peak";
		console.log("ERROR: No Peak found")
	}

	return [idx, maxValue];
}

function freq2cents (freq) {
	//freq += .000000001;
	var cents = 1200 * (Math.log( freq / 440 )/Math.log(2) ) + 6900;
	return Math.round(cents);
}

function cents2note (cents){
	//Returns note name
	var noteNum = Math.round(cents/100);
	var note = NOTE_NAMES[noteNum % 12];
	var centsOff = cents - noteNum*100;
	return [note, centsOff];
}

//TODO controloar cuántas muestras se han de comparar al centro
function getPeaks(data, thresh){
	//Returns an array of [peaks, indices]
	var peaks = [];
	var indices = [];
	for(var i = 1; i < data.length -1; i++) {
		if(data[i] > thresh) {
			if (data[i-2] < data [i] && data[i-1] < data [i] && data[i] > data[i+1] && data[i] > data[i+2]) {
				peaks.push(data[i]);
				indices.push(i);
			}
		}
	}

	return [peaks, indices];
}

function f0Detection(peakFreqs, peakMags, minFreq, maxFreq, Fs, bufferSize){	
	//Returns frequency for 
	var idx = 0;	//Look for bin corresponding to minimum allowed freq
	var idx2 = peakFreqs.length -1;	//Look for bin corresponging to max allowed frequency
	
	//Convert to Frequency in Hz
	var bin2Freq = Fs/2/bufferSize;
	peakFreqs = numeric.mul(peakFreqs, bin2Freq);

	//Find index for lower freq than minimum
	for(idx; idx< peakFreqs.length; idx++){
		if (peakFreqs[idx] >= minFreq) break;
	}
	
	//Find index for higher freqs tan max
	for(idx2; idx2>0; idx2--){
		if (peakFreqs[idx2] <= maxFreq) break;
	}
		
	//Keep only peaks within freq range
	var freqCand = peakFreqs.slice(0).splice(idx, idx2-idx+1);
	//TODO agregar tracking de f0 anterior

	//Errores de cada pico
	var TWMerrs = TWM(peakFreqs, peakMags, freqCand);		//Get TWM errors for peak candidates
	
	try {
		var minError = getMaxPeak(numeric.mul(TWMerrs, -1))[0];	//Get interpolated index of min err
		var f0 = freqCand[minError];
	} 
	catch(err){
		//No frequency peak found
		//console.log("error: " + err);
		f0 = -1;
	}
	//console.log(f0);
	return f0;

}

//Two way mismatch algorithm for frequency estimation
//Based on R.C. Maher and d. W. Beauchamp: Fundamental frequency estimation
//Main TWM Function
function TWM(peakFreqs, peakAmps, f0cand){	
	var p = 0.5; 		//Constants for algorithm
	var q = 1.4;
	var r = 0.5; 
	var rho = 0.33;

	// var peakFreqs = [200, 300, 500, 600, 700, 800];		//Testing variables
	// var peakAmps = [1, 1, 1, 1, 1, 1];					//Testing variables
	// var f0cand = [50, 100, 200];							//Testing variables

	var Fmax = Math.max.apply(null, peakFreqs);
	var Amax = 1;    //Maxima magnitud de las observadas  Math.max.apply(null, peaksMag);
	var TWMerrs = [];       //Array of errors to compare for min

	for(var idx = 0; idx < f0cand.length; idx++){	//Loop through all candidates

		var N = Math.ceil(Fmax/f0cand[idx]);			//Define number of harmonics
		N = N <= 10? N : 10;					//Limit harmonics to 10
		predicted = numeric.mul(genArray(N), f0cand[idx]); 	//Generate predicted harmonics
	    
     	TWMerrs.push(TWM_err(predicted, peakFreqs, peakAmps));

	}

	return TWMerrs;
}

//Calculate TWM error
function TWM_err(predicted, measured, amplitudes){
	var p = 0.5; 		//Constants for algorithm
	var q = 1.4;
	var r = 0.5; 
	var rho = 0.33;

	var ptmErr = 0;
	var mtpErr = 0;
    var Amax = Math.max.apply(null, amplitudes);

    //Predicted to Measured
    var predAmps = closestHarmonics(measured, predicted, amplitudes);	//temp variable to hold closest harmonics
    var deltas = numeric.abs(numeric.sub(predicted, predAmps[0]));  //Calculate distance from readings
    predAmps = predAmps[1]; 
    
    for(var i = 0; i < deltas.length; i++){
    	var Fn = predicted[i];
    	var dFn = deltas[i];
    	var an = predAmps[i];

	ptmErr += dFn * Math.pow(Fn, -p) + (an/Amax) * (q*dFn * Math.pow(Fn,-p) -r);   	
    }

    //Measured to Predicted
    deltas =  numeric.abs(numeric.sub(measured, closestHarmonics(predicted, measured, amplitudes)[0]));		//Discard predicted amps

    for(var i = 0; i < deltas.length; i++){
    	var Fk = measured[i];
    	var dFk = deltas[i];
    	var ak = amplitudes[i];

		mtpErr += dFk * Math.pow(Fk, -p) + (ak/Amax) * (q*dFk * Math.pow(Fk,-p) -r);    	
    }

    //Total TWM Error
    var TWMErr = ptmErr/predicted.length + rho * mtpErr / measured.length;
  	return TWMErr;
}

function closestHarmonics(origin, target, amplitudes){
	//chooses closest harmonic and amplitude from target compared to origin
	var closestHarmonics = [];
	var predictedAmps = [];
	//TODO : Sort origin to be sure and optimize to break when match is found
	for(var num in target){
		var curr = origin[0];
		var currAmp = amplitudes[0];
        for (var index = 0; index < origin.length; index++){
            if (Math.abs(target[num] - origin[index]) < Math.abs(target[num] - curr)){
                curr = origin[index];
                currAmp = amplitudes[index];
            }
        }
        closestHarmonics.push(curr);
        predictedAmps.push(currAmp);
	}
	return [closestHarmonics, predictedAmps];	//return also predicted amps to use in PTM
}


//AUXILIARES
function genArray(N){
	//Generar array de 1 a N
	arr = [];
	for(var i = 1; i <=N; i++) {
		arr.push(i);
	}
	return arr;
}
