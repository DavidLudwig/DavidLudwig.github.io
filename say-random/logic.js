
var button_text_pause = '⏸️ Pause';
var button_text_play = '▶️ Play';
var status_text_paused = 'Timer is paused';
var status_text_running = 'Timer is running';
var timer = null;

function get_choices() {
    var input = document.getElementById("choices");
    var output = [];
    input.value.split(/[\n]/).forEach(c => {
        if (c && !c.match(/^ *$/)) {
            output.push(c);
        }
    });
    return output;
}

function speak(message) {
    let synth = window.speechSynthesis;
    let utterance = new SpeechSynthesisUtterance(message);
    console.log("speak: \"" + message + "\"");
    synth.speak(utterance);
}

function speak_random_choice() {
    var choices = get_choices();
    var index = Math.floor(Math.random() * choices.length);
    var choice = choices[index];
    if (isNaN(make_duration_ms())) {
        console.log("...");
    } else {
        speak(choice);
    }
    schedule_next();
}

function update_ui() {
    var play_or_pause = document.getElementById("play_or_pause");
    var status_text = document.getElementById("status_text");
    if (timer) {
        console.log("is running");
        play_or_pause.value = button_text_pause;
    } else {
        console.log("is paused");
        play_or_pause.value = button_text_play;
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

function schedule_next() {
    if (timer) {
        if (timer !== true) {
            clearTimeout(timer);
        }
        var duration = make_duration_ms();
        if (isNaN(duration)) {
            duration = 1000;
        }
        console.log("next in " + duration);
        timer = setTimeout(speak_random_choice, duration);
    }
}

function toggle_pause() {
    if (timer) {
        speak("stop");
        if (timer !== true) {
            clearTimeout(timer);
        }
        timer = null;
        update_ui();
    } else {
        speak("start");
        timer = true;       // a proper timer will be filled in via schedule_next()
        update_ui();
        schedule_next();
    }
}


document.addEventListener("keypress", function (e) {
    switch (e.charCode) {
        case 32:    // spacebar
            toggle_pause()
            break;
    }
});
