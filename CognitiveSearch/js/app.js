//utility function to get parameter/query by name
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}


//utility function to log
function log(e, msg) {
    document.getElementById('log').innerHTML += "\n" + e + " " + (msg || '');
}


//interval to refresh token at every 9th min
var ival;

//show log if opened for debug
$(document).ready(function () {
    if (getParameterByName("debug") == "true") {
        $('.log').show();
    } else {
        $('.log').hide();
    }

    //hide answer block
    toggleAnswerBlock();

    //set full screen
    makeFullScreen();

    //initialize
    loadAudio();

    //get token
    setToken();

    ival = window.setInterval(function () {
        //get token after every 9th min
        setToken();
    }, 540000);

});

//make the app run on fullscreen
function makeFullScreen() {
    var el = document.documentElement,
        rfs = el.requestFullscreen
            || el.webkitRequestFullScreen
            || el.mozRequestFullScreen
            || el.msRequestFullscreen
        ;

    rfs.call(el);
}


//all variables used in app
var showAll = false;
var audio_context;
var recorder;
var micStatus = false;
var mic = $('#mic');
var token = '';
var blobData;
var answerStatus = false;

//start stream
function startUserMedia(stream) {
    var input = audio_context.createMediaStreamSource(stream);
    log('Media stream created.');

    // Uncomment if you want the audio to feedback directly
    //input.connect(audio_context.destination);
    //__log('Input connected to audio context destination.');

    recorder = new Recorder(input);
    log('Recorder initialised.');
}

//initialize the audio on load
function loadAudio() {
    try {
        // webkit shim
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
        window.URL = window.URL || window.webkitURL;

        audio_context = new AudioContext;
        log('Audio context set up.');
        log('navigator.getUserMedia ' + (navigator.getUserMedia ? 'available.' : 'not present!'));
    } catch (e) {
        alert('No web audio support in this browser!');
    }

    navigator.getUserMedia({ audio: true }, startUserMedia, function (e) {
        log('No live audio input: ' + JSON.stringify(e));
    });
}

//stop the recorder
function stopRecording() {
    recorder && recorder.stop();
    log('Stopped recording.');

    // create WAV download link using audio data blob
    exportBlobData();
    setTimeout(function () { getTextFromSpeech();}, 500);
    
    recorder.clear();
}

//clear the controls
function clearText() {
    document.getElementById("txtSearch").value = "";
    $('#divAnswer').html('');
    $('.answerDetailed').html('');
    answerStatus = false;
    toggleAnswerBlock();
}

//start
function startRecording() {
    recorder && recorder.record();
    log('Recording...');
    clearText();

    window.setTimeout(function () {
        stopRecording();
        stopPropagation();
    }, 12000);
}

//stop button actions
function stopPropagation() {
    mic.removeClass('fa-microphone');
    mic.removeClass('mic-on');
    mic.addClass('fa-microphone-slash');
    mic.addClass('mic-off');
    micStatus = false;
    mic.html("Please Ask a Question");
}

//check the status and open the mic
function checkMic() {
    if (micStatus == false) {
        mic.removeClass('fa-microphone-slash');
        mic.removeClass('mic-off');
        mic.addClass('fa-microphone');
        mic.addClass('mic-on');
        micStatus = true;
        //start recognition
        startRecording();
        mic.html("Click again to send your question");
    } else {
        stopRecording();
        stopPropagation();
    }
}

//set the text to textbox
function setText(text) {
    document.getElementById("txtSearch").value += text;
    showAll = false;
    search();
}

//search the text
function search() {
    $('#results').html('');
    var str = $('#txtSearch').val();
    var resArr = jQuery.grep(data, function (n, i) {
        return (n.question.toUpperCase() == str.toUpperCase().trim());
    });
    var textToSpeech = "";

    if (resArr.length > 0) {
        var res = resArr[0];

        //set one line answer
        $('#divAnswer').html(res.answer);

        //set detailed answer
        if (res.data.columns && res.data.rows) {
            $('.answerDetailed').html(generateDetailedAnswer(res.data.columns, res.data.rows));
        }

        $('#aMore').click(function () {
            showAll = true;
            search();
        });


        textToSpeech = res.answer;
    } else {
        var answer = randomAnswers[Math.floor(Math.random() * randomAnswers.length)];
        textToSpeech = answer;
        $('#divAnswer').html(answer);
    }

    answerStatus = true;
    toggleAnswerBlock();

    //speck now
    speak(textToSpeech);
}

//match the text against keywords
function checkKeywords(str) {
    str = replaceLast(str);

    for (var i = 0; i < data.length; i++) {
        var d = data[i];
        //var strArr = str.toUpperCase().split(' ');
        var match = true;
        for (var j = 0; j < d.keywords.length; j++) {
            //if (strArr.indexOf(d.keywords[j]) == -1) {
            if (str.toUpperCase().includes(d.keywords[j]) == false) {
                match = false;
                break;
            }
        }

        if (match == true) {
            return d.question;
        }
    }

    //log for debugging
    log("You spoke " + str);

    return '';
}

//replace the last chars like dot/?/! etc
function replaceLast(str) {
    str = str.replace('?', '');
    str = str.replace('.', '');
    str = str.replace('!', '');
    return str;
}

//generate detailed answer
function generateDetailedAnswer(columns, rows) {
    var html = ' <table cellpadding="0" cellspacing="0" border="0" class="tabular">';

    //add header
    var c = columns.length;
    if (c > 0) {
        html += '<tr class="thead">';
        for (var i = 0; i < c; i++) {
            html += '<td>' + columns[i] + '</td>';
        }
        html += '</tr>';
    }

    //add body
    if (rows.length > 0) {
        var rowLen = (showAll == true || rows.length <= 6) ? rows.length : 6;
        
        for (var i = 0; i < rowLen; i++) {
            html += '<tr>';
            for (var j = 0; j < c; j++) {
                html += '<td>';
                var dt = rows[i][j];

                if (dt.tag == '') {
                    html += dt.d;
                } else {
                    html += '<' + dt.tag + ' ';
                    html += dt.attr + '>';
                    html += dt.d;
                    html += '</' + dt.tag + '>';
                }

                html += '</td>';
            }
            html += '</tr>';
        }
    }

    html += '</table>';

    if (showAll == false && rows.length > 6) {
        html += '<a href="#" class="more" id="aMore">More</a>';
    }
    return html;
}


//get the token
function setToken() {
    $.ajax({
        type: "POST",
        url: "https://api.cognitive.microsoft.com/sts/v1.0/issueToken",
        headers: { 'Ocp-Apim-Subscription-Key': '769d9e0d46014780b86b0a3a17694cab' },
        success: function (msg) {
            if (undefined === msg || null === msg) {
                log('response received without token.');
            }
            else {
                log('Token received');
            }

            token = msg;
        },
        error: function (msg) {
            log("Error getting token", msg);
        }
    });
}

//export blob data
function exportBlobData() {
    recorder && recorder.exportWAV(function (blob) {
        blobData = blob;
    });
}

//get the text from speech
function getTextFromSpeech() {
    
    var fd = new FormData();

    $.ajax({
        type: "POST",
        url: "https://speech.platform.bing.com/recognize?scenarios=websearch&appid=f84e364c-ec34-4773-a783-73707bd9a585&locale=en-US&device.os=Android&version=3.0&format=json&requestid=1d4b6030-9099-11e0-91e4-0800200c9a66&instanceid=1d4b6030-9099-11e0-91e4-0800200c9a66",
        headers: { 'Authorization': 'Bearer ' + token },
        data: blobData,
        contentType: false,
        processData: false,
        success: function (msg) {
            log('Audio is converted to text');
            var d = msg;
            if (d.results && d.results.length > 0) {
                setText(checkKeywords(d.results[0].name));
            }
            else {
                setText("");
            }
        },
        error: function (msg) {
            console.log(msg);
            log("Error converting sppech to text", msg);
        }
    });
}


//speak the answer
function speak(textToSpeech) {
    var synUtterance = new SpeechSynthesisUtterance(textToSpeech);

    synUtterance.voice = speechSynthesis.getVoices().filter(function (voice) { return voice.name == "Google US English"; })[0];

    synUtterance.lang = "en-us";
    synUtterance.volume = parseFloat(1);
    synUtterance.rate = parseFloat(1);
    synUtterance.pitch = parseFloat(1);

    const eventList = ["start", "end", "mark", "pause", "resume", "error", "boundary"];
    eventList.forEach((event) => {
        synUtterance.addEventListener(event, (speechSynthesisEvent) => {
            log(`Fired '${speechSynthesisEvent.type}' event at time '${speechSynthesisEvent.elapsedTime}' and character '${speechSynthesisEvent.charIndex}'.`);
        });
    });
    window.speechSynthesis.speak(synUtterance);
}

//show hide answer block
function toggleAnswerBlock() {
    var da = $('.answer');
    if (answerStatus == true) {
        $(da).show();
    } else {
        $(da).hide();
    }
}
