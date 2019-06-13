
var button_text_stop = '⏹ Stop';
var button_text_play = '▶️ Play';
var speaker = null;
const delay_on_start_s = 1;

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

function random_phrase() {
    var possibles = phrases();
    var index = Math.floor(Math.random() * possibles.length);
    return possibles[index];
}

function update_ui() {
    var play_or_stop = document.getElementById("play_or_stop");
    if (speaker !== null && speaker.isRunning()) {
        console.log("is running");
        play_or_stop.value = button_text_stop;
    } else {
        console.log("is stopped");
        play_or_stop.value = button_text_play;
    }
}

function make_duration_ms() {
    var a = parseFloat(document.getElementById("delay_range_a").value);
    var b = parseFloat(document.getElementById("delay_range_b").value);
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
                    delay_on_start_s * 1000
                );
                break;
            }
            case SpeakerState.INITIAL_DELAY:
            case SpeakerState.REGULAR_DELAY: {
                this.state = SpeakerState.SPEAKING;
                var phrase = random_phrase();
                var utterance = this.makeContinuingUtterance(phrase);
                window.speechSynthesis.speak(utterance);
                break;
            }
            case SpeakerState.SPEAKING: {
                this.state = SpeakerState.REGULAR_DELAY;
                var duration_ms = make_duration_ms();
                if (isNaN(duration_ms)) {
                    duration_ms = 1000;
                }
                setTimeout(
                    this.makeContinuation("timeout,REGULAR_DELAY"),
                    duration_ms
                );
                break;
            }
        } // end of switch
    } // end of function
}

function toggle_play() {
    if (speaker) {
        speaker.stop()
        speaker = null
        update_ui()
    } else {
        speaker = new Speaker();
        speaker.start();
        update_ui();
    }
}

function value_changed(e) {
    save();
}

function init() {
    console.log("init");
    load();
    update_ui();

    // For input-entry fields...

    // ... capture 'enter' key-presses, and whatever other text-entry-completion actions are available
    document.getElementById("delay_range_a").addEventListener("change", value_changed);
    document.getElementById("delay_range_b").addEventListener("change", value_changed);
    document.getElementById("phrases").addEventListener("change", value_changed);

    // ... capture key-down events (in order to save without needing to press 'enter')
    document.getElementById("delay_range_a").addEventListener("keydown", value_changed);
    document.getElementById("delay_range_b").addEventListener("keydown", value_changed);
    document.getElementById("phrases").addEventListener("keydown", value_changed);
}

function save() {
    var s = window.localStorage;
    s.setItem("delay_range_a", document.getElementById("delay_range_a").value);
    s.setItem("delay_range_b", document.getElementById("delay_range_b").value);
    s.setItem("phrases", document.getElementById("phrases").value);
    s.setItem("choices", document.getElementById("phrases").value); // deprecated; for forward compatibility
}

function load() {
    var s = window.localStorage;
    var tmp;

    tmp = s.getItem("delay_range_a");
    if (tmp !== null) {
        document.getElementById("delay_range_a").value = tmp;
    }

    tmp = s.getItem("delay_range_b");
    if (tmp !== null) {
        document.getElementById("delay_range_b").value = tmp;
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
                toggle_play();
            }
            break;
    }
});
