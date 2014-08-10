"use strict";

var scale = function scale(value, min, max, dstMin, dstMax) {
    value = (max === min ? 0 : (Math.max(min, Math.min(max, value)) / (max - min)));

    return value * (dstMax - dstMin) + dstMin;
};

var limit = function limit(value, min, max) {
    return Math.max(min, Math.min(max, value));
};

/**
 * Generate a random id
 * @returns {Number}
 */
var generateRandomId = function() {
    return (new Date()).getTime() + Math.floor(Math.random() * 1000000);
};

var MidiLearning = function(midiLearn, options) {
    this.midiLearn = midiLearn;

    this.id = options.id || generateRandomId();
    this.min = parseFloat(options.min || 0);
    this.max = parseFloat(options.max);
    this.channel = null;
    this.activeCallbacks = {};

    this.events = {
        change : options.events.change || function() {},
        bind : options.events.bind || function() {},
        unbind : options.events.unbind || function() {},
        cancel : options.events.cancel || function() {},
        listen : options.events.listen || function() {}
    };

    this.setValue(limit(parseFloat(options.value || 0), this.min, this.max));
};

MidiLearning.prototype.id = null;
MidiLearning.prototype.min = null;
MidiLearning.prototype.max = null;
MidiLearning.prototype.value = null;
MidiLearning.prototype.channel = null;
MidiLearning.prototype.activeCallbacks = null;
MidiLearning.prototype.events = null;

MidiLearning.prototype.unbind = function() {
    this.midiLearn.removeBinding(this);
};

MidiLearning.prototype.startListening = function() {
    this.midiLearn.startListeningForBinding(this);
};

MidiLearning.prototype.stopListening = function() {
    this.midiLearn.startListeningForBinding(this);
};

MidiLearning.prototype.setValue = function(event, property) {
    var value;

    if(event && property) {
        value = scale(event[property], 0, 127, this.min, this.max);
    } else if(typeof event === 'number') {
        value = event;
    } else {
        value = this.min;
    }

    if(value !== this.value) {
        this.value = value;
        this.events.change(this.id, value);
    }
};

var MidiLearn = function(smi) {
    this.smi = smi;
    this.bindings = {};
};

MidiLearn.prototype.smi = null;
MidiLearn.prototype.currentMidiLearning = null;
MidiLearn.prototype.bindings = null;

MidiLearn.prototype.getMidiLearning = function(options) {
    return new MidiLearning(this, options);
};

MidiLearn.prototype.listenerForBinding = function(event) {
    if(this.currentMidiLearning && event) {
        var midiLearning = this.currentMidiLearning;

        midiLearning.events.bind(event);

        this.stopListeningForBinding();

        this.addBinding(midiLearning, event);
    }
};

MidiLearn.prototype.startListeningForBinding = function(midiLearning) {
    this.stopListeningForBinding();
    this.currentMidiLearning = midiLearning;

    midiLearning.listener = this.listenerForBinding.bind(this);

    midiLearning.events.listen(midiLearning);

    this.smi.on('global', midiLearning.listener);
};

MidiLearn.prototype.stopListeningForBinding = function(midiLearning) {
    if(this.currentMidiLearning !== null && (!midiLearning || this.currentMidiLearning === midiLearning)) {
        this.smi.off('global', this.currentMidiLearning.listener);
        this.currentMidiLearning.events.cancel();
        this.currentMidiLearning = null;
    }
};

MidiLearn.prototype.setCallback = function(midiLearning, eventName, func) {
    midiLearning.activeCallbacks[eventName] = func;
    this.smi.on(eventName, midiLearning.channel, func);
};

MidiLearn.prototype.removeBinding = function(midiLearning) {
    if(midiLearning && midiLearning.activeCallbacks) {
        var callbacks = midiLearning.activeCallbacks;

        for(var key in callbacks) {
            if(callbacks.hasOwnProperty(key)) {
                this.smi.off(key, midiLearning.channel, callbacks[key]);
            }
        }

        midiLearning.activeCallbacks = {};
    }

    delete this.bindings[midiLearning.id];
};

MidiLearn.prototype.addBinding = function(midiLearning, event) {
    this.removeBinding(midiLearning);

    this.bindings[midiLearning.id] = midiLearning;

    if(event.event === 'cc') {
        this.addCCBinding(midiLearning, event);
    } else if(event.event === 'noteOn') {
        this.addNoteBinding(midiLearning, event);
    }
};

MidiLearn.prototype.addNoteBinding = function(midiLearning, event) {
    midiLearning.channel = event.channel;

    this.setCallback(midiLearning, 'noteOn', function(e) {
        if(e.key === event.key) {
            midiLearning.setValue(e, 'velocity');
        }
    });

    this.setCallback(midiLearning, 'noteOff', function(e) {
        if(e.key === event.key) {
            midiLearning.setValue();
        }
    });

    this.setCallback(midiLearning, 'polyphonicAftertouch', function(e) {
        if(e.key === event.key) {
            midiLearning.setValue(e, 'pressure');
        }
    });
};

MidiLearn.prototype.addCCBinding = function(midiLearning, event) {
    midiLearning.channel = event.channel;

    this.setCallback(midiLearning, 'cc' + event.cc, function(e) {
        midiLearning.setValue(e, 'value');
    });
};