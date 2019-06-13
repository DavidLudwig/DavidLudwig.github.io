
const ButtonText_Stop = '⏹ Stop';
const ButtonText_Play = '▶️ Play';
var speaker = null;
const DelayOnStartS = 1;

function phrases() {
    var input = document.getElementById("phrases");
    var output = [];
    input.value.split(/[\n]/).forEach(c => {
        if (c && !c.match(/^ *$/)) {
            output.push(c);
        }
    });
    return output;
}

function randomPhrase() {
    var possibles = phrases();
    var index = Math.floor(Math.random() * possibles.length);
    return possibles[index];
}

function updateUI() {
    var playOrStop = document.getElementById("playOrStop");
    if (speaker !== null && speaker.isRunning()) {
        // console.log("is running");
        playOrStop.value = ButtonText_Stop;
    } else {
        // console.log("is stopped");
        playOrStop.value = ButtonText_Play;
    }
}

function makeDurationMS() {
    var a = parseFloat(document.getElementById("delayRangeAS").value);
    var b = parseFloat(document.getElementById("delayRangeBS").value);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) {
        return NaN;
    }
    a *= 1000;  // seconds --> milliseconds
    b *= 1000;
    var min = Math.min(a, b);
    var max = Math.max(a, b);
    var value = Math.random() * (max - min) + min;
    return value;
}


const SpeakerState = {
    STOPPED: "STOPPED",
    SPEAKING_START: "SPEAKING_START",
    INITIAL_DELAY: "INITIAL_DELAY",
    SPEAKING: "SPEAKING",
    REGULAR_DELAY: "REGULAR_DELAY"
};

class Speaker {
    constructor() {
        this.currentStepCount = 0;
        this.state = SpeakerState.STOPPED;
        this.logStd("Speaker constructed");
    }

    logStd(callerName, ...logMe) {
        // console.log(callerName, this.state, this.currentStepCount, logMe);
    } 

    makeContinuation(debugName) {
        const ourStepCount = this.currentStepCount;
        var this_ = this; // needed as continuation body will have a different 'this'
        return function () {
            this_.logStd(debugName, ourStepCount);
            if (ourStepCount == this_.currentStepCount) {
                this_.next();
            }
        }
    }

    makeSingleShotUtterance(text) {
        this.logStd("makeSingleShotUtterance");
        var utterance = new SpeechSynthesisUtterance(text);
        return utterance;
    }

    makeContinuingUtterance(text) {
        this.logStd("makeContinuingUtterance", text);
        var utterance = this.makeSingleShotUtterance(text);
        utterance.onend = this.makeContinuation("onend");
        return utterance;
    }

    start() {
        this.logStd("start");
        ++this.currentStepCount;
        if (this.isRunning()) {
            this.state = SpeakerState.STOPPED;
            window.speechSynthesis.cancel();
        }
        this.delayOnNext = false;
        this.state = SpeakerState.SPEAKING_START;
        var utterance = this.makeContinuingUtterance("Start");
        window.speechSynthesis.speak(utterance);
    }

    stop() {
        this.logStd("stop");
        ++this.currentStepCount;
        this.state = SpeakerState.STOPPED;
        window.speechSynthesis.cancel();
        var utterance = this.makeSingleShotUtterance("Stop");
        window.speechSynthesis.speak(utterance);
    }

    isRunning() {
        return this.state !== SpeakerState.STOPPED;
    }

    next() {
        this.logStd("next");
        if (!this.isRunning()) {
            return;
        }
        ++this.currentStepCount;
        switch (this.state) {
            case SpeakerState.STOPPED: {
                break;
            }
            case SpeakerState.SPEAKING_START: {
                this.state = SpeakerState.INITIAL_DELAY;
                setTimeout(
                    this.makeContinuation("timeout,INITIAL_DELAY"),
                    DelayOnStartS * 1000
                );
                break;
            }
            case SpeakerState.INITIAL_DELAY:
            case SpeakerState.REGULAR_DELAY: {
                this.state = SpeakerState.SPEAKING;
                var phrase = randomPhrase();
                var utterance = this.makeContinuingUtterance(phrase);
                window.speechSynthesis.speak(utterance);
                break;
            }
            case SpeakerState.SPEAKING: {
                this.state = SpeakerState.REGULAR_DELAY;
                var durationMS = makeDurationMS();
                if (isNaN(durationMS)) {
                    durationMS = 1000;
                }
                setTimeout(
                    this.makeContinuation("timeout,REGULAR_DELAY"),
                    durationMS
                );
                break;
            }
        } // end of switch
    } // end of function
}

function togglePlay() {
    if (speaker && speaker.isRunning()) {
        speaker.stop()
        speaker = null
        updateUI()
    } else {
        if (!speaker) {
            speaker = new Speaker();
        }
        speaker.start();
        updateUI();
    }
}

function onValueChange(e) {
    save();
}

function init() {
    // console.log("init");
    load();
    updateUI();

    // For input-entry fields...

    // ... capture 'enter' key-presses, and whatever other text-entry-completion actions are available
    document.getElementById("delayRangeAS").addEventListener("change", onValueChange);
    document.getElementById("delayRangeBS").addEventListener("change", onValueChange);
    document.getElementById("phrases").addEventListener("change", onValueChange);

    // ... capture key-down events (in order to save without needing to press 'enter')
    document.getElementById("delayRangeAS").addEventListener("keydown", onValueChange);
    document.getElementById("delayRangeBS").addEventListener("keydown", onValueChange);
    document.getElementById("phrases").addEventListener("keydown", onValueChange);
}

function save() {
    var s = window.localStorage;
    s.setItem("delayRangeAS", document.getElementById("delayRangeAS").value);
    s.setItem("delayRangeBS", document.getElementById("delayRangeBS").value);
    s.setItem("phrases", document.getElementById("phrases").value);

    // deprecated; for forward compatibility
    s.setItem("delay_range_a", document.getElementById("delayRangeAS").value);
    s.setItem("delay_range_b", document.getElementById("delayRangeBS").value);
    s.setItem("choices", document.getElementById("phrases").value);
}

function load() {
    var s = window.localStorage;
    var tmp;

    tmp = s.getItem("delayRangeAS");
    if (tmp === null) {
        tmp = s.getItem("delay_range_a"); // deprecated; for backwards compatibility
    }
    if (tmp !== null) {
        document.getElementById("delayRangeAS").value = tmp;
    }

    tmp = s.getItem("delayRangeBS");
    if (tmp === null) {
        tmp = s.getItem("delay_range_b"); // deprecated; for backwards compatibility
    }
    if (tmp !== null) {
        document.getElementById("delayRangeBS").value = tmp;
    }

    tmp = s.getItem("phrases");
    if (tmp === null) {
        tmp = s.getItem("choices"); // deprecated; for backwards compatibility
    }
    if (tmp !== null) {
        document.getElementById("phrases").value = tmp;
    }
}

document.addEventListener("keypress", function (e) {
    switch (e.charCode) {
        case 32:    // spacebar
            if (document.activeElement != document.getElementById("phrases")) {
                togglePlay();
            }
            break;
    }
});
