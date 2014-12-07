function peakInterpolate(x1, y1, x2, y2, x3, y3) {
	//Polynomial interpolation for 3 points
	var denom = (x1 - x2) * (x1 - x3) * (x2 - x3);
	var A     = (x3 * (y2 - y1) + x2 * (y1 - y3) + x1 * (y3 - y2)) / denom;
	var B     = (x3*x3 * (y1 - y2) + x2*x2 * (y3 - y1) + x1*x1 * (y2 - y3)) / denom;
	var C     = (x2 * x3 * (x2 - x3) * y1 + x3 * x1 * (x3 - x1) * y2 + x1 * x2 * (x1 - x2) * y3) / denom;

	var xv = -B / (2*A);
	var yv = C - B*B / (4*A);
	return [xv, yv];
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
	var noteNum = Math.round(cents/100);
	var note = NOTE_NAMES[noteNum % 12];
	var centsOff = cents - noteNum*100;
	return [note, centsOff];
}