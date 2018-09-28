// fork getUserMedia for multiple browser versions, for the future
// when more browsers support MediaRecorder

navigator.getUserMedia = ( navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);

// set up basic variables for app

var record = document.querySelector('.record');
var stop = document.querySelector('.stop');
var upload = document.querySelector('.upload');
var soundClips = document.querySelector('.sound-clips');
var canvas = document.querySelector('.visualizer');
var mediaRecorder = null;
var mediaStreamSource = null;
var ignoreAutoPlay = false;

// disable stop button while not recording

stop.disabled = true;
upload.disabled = false;

// visualiser setup - create web audio api context and canvas

var audioCtx = new (window.AudioContext || webkitAudioContext)();
var canvasCtx = canvas.getContext("2d");

//main block for doing the audio recording

if (navigator.getUserMedia) {
  console.log('getUserMedia supported.');

  var constraints = { audio: true };
  var chunks = [];

  var onSuccess = function(stream) {
    /**
    var options = {
      audioBitsPerSecond : 256000,
      //videoBitsPerSecond : 2500000,
      mimeType : 'audio/webm;codecs=opus'
    }*/
    mediaRecorder = new MediaRecorder(stream);
    mediaStreamSource = audioCtx.createMediaStreamSource(stream);
    record.onclick = function() {
      visualize(stream);

      // Display a countdown before recording starts.
      var progress = document.querySelector('.progress-display');
      progress.innerText = "3";
      document.querySelector('.info-display').innerText = "";
     
      setTimeout(function() {
	      progress.innerText = "2";
	      setTimeout(function() {
	        progress.innerText = "1";
	          setTimeout(function() {
		          progress.innerText = "";
		          startRecording();
	           }, 100);
	        }, 100);
      }, 100);
      stop.disabled = false;
      record.disabled = true;
    }

    stop.onclick = function() {
      console.log("is this running? \n \n")
      if (mediaRecorder.state == 'inactive') {
        // The user has already pressed stop, so don't set up another word.
        ignoreAutoPlay = true;
      } else {
        mediaRecorder.stop();
      }
      mediaStreamSource.disconnect();
      console.log(mediaRecorder.state);
      record.style.background = "";
      record.style.color = ""; 
      stop.disabled = true;
      record.disabled = false;
      
    }

    upload.onclick = function() {
      saveRecordings();
    }

    mediaRecorder.onstop = function(e) {
      console.log("data available after MediaRecorder.stop() called.");

      var clipName = document.querySelector('.info-display').innerText;
      var clipContainer = document.createElement('article');
      var clipLabel = document.createElement('p');
      var audio = document.createElement('audio');
      var deleteButton = document.createElement('button');
     
      clipContainer.classList.add('clip');
      clipLabel.classList.add('clip-label');
      audio.setAttribute('controls', '');
      deleteButton.textContent = 'Delete';
      deleteButton.className = 'delete';
      clipLabel.textContent = clipName;

      clipContainer.appendChild(audio);
      clipContainer.appendChild(clipLabel);
      clipContainer.appendChild(deleteButton);
      soundClips.appendChild(clipContainer);

      audio.controls = true;
      
      
      var mergedBuffers = mergeBuffers(chunks, recLength);
      var downsampledBuffer = downsampleBuffer(mergedBuffers, 16000);
      var encodedWav = encodeWAV(downsampledBuffer);  
      var blob = new Blob([encodedWav], { type: 'application/octet-stream' });
      
      //var blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
      chunks = [];
      var audioURL = window.URL.createObjectURL(blob);
      audio.src = audioURL;
      console.log("recorder stopped");

      deleteButton.onclick = function(e) {
        evtTgt = e.target;
        evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
	updateProgress();
      }
    }

    mediaRecorder.ondataavailable = function(e) {
      chunks.push(e.data);
      recLength += e.data.length;
    }
  }

  var onError = function(err) {
    console.log('The following error occured: ' + err);
  }

  navigator.getUserMedia(constraints, onSuccess, onError);
} else {
  console.log('getUserMedia not supported on your browser!');
  document.querySelector('.info-display').innerText = 
	'Your device does not support the HTML5 API needed to record audio (this is a known problem on iOS)';  
}

function visualize(stream) {
  var analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  var bufferLength = analyser.frequencyBinCount;
  var dataArray = new Uint8Array(bufferLength);

  mediaStreamSource.connect(analyser);
  
  WIDTH = canvas.width
  HEIGHT = canvas.height;

  draw()

  function draw() {

    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = 'rgb(200, 200, 200)';
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

    canvasCtx.beginPath();

    var sliceWidth = WIDTH * 1.0 / bufferLength;
    var x = 0;

    for(var i = 0; i < bufferLength; i++) {
 
      var v = dataArray[i] / 128.0;
      var y = v * HEIGHT/2;

      if(i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height/2);
    canvasCtx.stroke();
  }
}

var wantedWords = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'On',
  'Off',
  'Stop',
  'Go',
  'Up',
  'Down',
  'Left',
  'Right',
  'Yes',
  'No',
];

var fillerWords = [
  'Dog',
  'Cat',
  'Bird',
  'Tree',
  'Marvin',
  'Sheila',
  'House',
  'Bed',
  'Wow',
  'Happy',
];

function getRecordedWords() {
  var wordElements = document.querySelectorAll('.clip-label');
  var wordCounts = {};
  wordElements.forEach(function(wordElement) {
      var word = wordElement.innerText;
      if (!wordCounts.hasOwnProperty(word)) {
	  wordCounts[word] = 0;
      }
      wordCounts[word] += 1;
  });
  return wordCounts;
}

function getAllWantedWords() {
  var wordCounts = {};
  wantedWords.forEach(function(word) {
    wordCounts[word] = 5;
  });
  fillerWords.forEach(function(word) {
    wordCounts[word] = 1;
  });
  return wordCounts;
}

function getRemainingWords() {
  var recordedCounts = getRecordedWords();
  var wantedCounts = getAllWantedWords();
  var remainingCounts = {};
  for (var word in wantedCounts) {
    wantedCount = wantedCounts[word];
    var recordedCount;
    if (recordedCounts.hasOwnProperty(word)) {
      recordedCount = recordedCounts[word];
    } else {
      recordedCount = 0;
    }
    var remainingCount = wantedCount - recordedCount;
    if (remainingCount > 0) {
      remainingCounts[word] = remainingCount;
    }
  }
  return remainingCounts;
}

function unrollWordCounts(wordCounts) {
  var result = [];
  for (var word in wordCounts) {
    count = wordCounts[word];
    for (var i = 0; i < count; ++i) {
      result.push(word);
    }
  }
  return result;
}

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

function getNextWord() {
  var remainingWords = unrollWordCounts(getRemainingWords());
  if (remainingWords.length == 0) {
    return null;
  }
  shuffleArray(remainingWords);
  return remainingWords[0];
}

function getProgressDescription() {
  var allWords = unrollWordCounts(getAllWantedWords());
  var remainingWords = unrollWordCounts(getRemainingWords());
  return ((allWords.length + 1) - remainingWords.length) + "/" + allWords.length;
}

function updateProgress() {
  var progress = getProgressDescription();
  document.querySelector('.progress-display').innerText = progress;
}

function startRecording() {
  if (ignoreAutoPlay) {
    ignoreAutoPlay = false;
    return;
  }
  /*
  var word = getNextWord();
  if (word === null) {
    promptToSave();
    return;
  }
  
  updateProgress();
  document.querySelector('.info-display').innerText = word;
  */
  mediaRecorder.start();
  console.log(mediaRecorder.state);
  console.log("recorder started");
  record.style.background = "red";
  setTimeout(endRecording, 5000);
}

function endRecording() {
  if (mediaRecorder.state == 'inactive') {
    // The user has already pressed stop, so don't set up another word.
    return;
  }
  mediaRecorder.stop();
  console.log(mediaRecorder.state);
  console.log("recorder stopped");
  record.style.background = "";
  record.style.color = "";
  setTimeout(startRecording, 1000);
}

function promptToSave() {
  if (confirm('Are you ready to upload your words?\nIf not, press cancel now,' + 
	      ' and then press Upload once you are ready.')) {
    saveRecordings();
  }
  upload.disabled = false;
}

var allClips;
var clipIndex;

function saveRecordings() {
  mediaStreamSource.disconnect();
  allClips = document.querySelectorAll('.clip');
  clipIndex = 0;
  uploadNextClip();
}

function uploadNextClip() {
  document.querySelector('.progress-display').innerText = 'Uploading clip ' + 
	clipIndex + '/' + unrollWordCounts(getAllWantedWords()).length;
  var clip = allClips[clipIndex];
  clip.style.display = 'None';
  var audioBlobUrl = clip.querySelector('audio').src;
  var word = clip.querySelector('p').innerText;
  var xhr = new XMLHttpRequest();
  xhr.open('GET', audioBlobUrl, true);
  xhr.responseType = 'blob';
  xhr.onload = function(e) {
    if (this.status == 200) {
      var blob = this.response;
      var ajaxRequest = new XMLHttpRequest();
      var uploadUrl = '/upload?word=' + word //+ '&_csrf_token=' + csrf_token;
      ajaxRequest.open('POST', uploadUrl, true);
      ajaxRequest.setRequestHeader('Content-Type', 'application/json');    
      ajaxRequest.onreadystatechange = function() {
        if (ajaxRequest.readyState == 4) {
	  if (ajaxRequest.status === 200) {
            clipIndex += 1;
            if (clipIndex < allClips.length) {
	      uploadNextClip();
	    } else {
	      allDone();
	    }
          } else {
            alert('Uploading failed with error code ' + ajaxRequest.status);
          }
	}
      };
      ajaxRequest.send(blob);
    }
  };
  xhr.send();
}

function allDone() {
  document.cookie = 'all_done=true; path=/';
  location.reload(true);
}









/////////////////////////////////////////////////////////////////////



/**
   * Audio recorder object. Handles setting up the audio context, 
   * accessing the mike, and creating the Recorder object.
   */
  lexaudio.audioRecorder = function() {
    /**
     * Creates an audio context and calls getUserMedia to request the mic (audio).
     * If the user denies access to the microphone, the returned Promise rejected 
     * with a PermissionDeniedError
     * @returns {Promise} 
     */
    var requestDevice = function() {
 
      if (typeof audio_context === 'undefined') {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audio_context = new AudioContext();
      }
 
      return navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function(stream) {
          audio_stream = stream; 
        });
    };
 
    var createRecorder = function() {
      return recorder(audio_context.createMediaStreamSource(audio_stream));
    };
 
    return {
      requestDevice: requestDevice,
      createRecorder: createRecorder
    };
 
  };


// Create a ScriptProcessorNode with a bufferSize of 4096 and a single input and output channel
    var recording, node = source.context.createScriptProcessor(4096, 1, 1);
 
    /**
     * The onaudioprocess event handler of the ScriptProcessorNode interface. It is the EventHandler to be 
     * called for the audioprocess event that is dispatched to ScriptProcessorNode node types. 
     * @param {AudioProcessingEvent} audioProcessingEvent - The audio processing event.
     */
    node.onaudioprocess = function(audioProcessingEvent) {
      if (!recording) {
        return;
      }
 
      worker.postMessage({
        command: 'record',
        buffer: [
          audioProcessingEvent.inputBuffer.getChannelData(0),
        ]
      });
    };
 
    /**
     * Sets recording to true.
     */
    var record = function() {
      recording = true;
    };
 
    /**
     * Sets recording to false.
     */
    var stop = function() {
      recording = false;
    };


var recLength = 0,
        recBuffer = [];
 
    function record(inputBuffer) {
      recBuffer.push(inputBuffer[0]);
      recLength += inputBuffer[0].length;
    }
    

function exportBuffer() {
      // Merge
      var mergedBuffers = mergeBuffers(recBuffer, recLength);
      // Downsample
      var downsampledBuffer = downsampleBuffer(mergedBuffers, 16000);
      // Encode as a WAV
      var encodedWav = encodeWAV(downsampledBuffer);                                 
      // Create Blob
      var audioBlob = new Blob([encodedWav], { type: 'application/octet-stream' });
      postMessage(audioBlob);
    }


function mergeBuffers(bufferArray, recLength) {
    var result = new Float32Array(recLength);
    var offset = 0;
      for (var i = 0; i < bufferArray.length; i++) {
      result.set(bufferArray[i], offset);
      offset += bufferArray[i].length;
    }
      return result;
  }
    

function downsampleBuffer(buffer) {
          if (16000 === sampleRate) {
            return buffer;
          }
      var sampleRateRatio = sampleRate / 16000;
      var newLength = Math.round(buffer.length / sampleRateRatio);
      var result = new Float32Array(newLength);
      var offsetResult = 0;
      var offsetBuffer = 0;
      while (offsetResult < result.length) {
        var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        var accum = 0,
          count = 0;
        for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
          accum += buffer[i];
          count++;
        }
        result[offsetResult] = accum / count;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
      }
      return result;
    }


function encodeWAV(samples) {
      var buffer = new ArrayBuffer(44 + samples.length * 2);
      var view = new DataView(buffer);
 
      writeString(view, 0, 'RIFF');
      view.setUint32(4, 32 + samples.length * 2, true);
      writeString(view, 8, 'WAVE');
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(view, 36, 'data');
      view.setUint32(40, samples.length * 2, true);
      floatTo16BitPCM(view, 44, samples);
 
      return view;
    }
















