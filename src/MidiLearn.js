var scale = function(value, min, max, dstMin, dstMax) {
    "use strict";

    value = (max === min ? 0 : (Math.max(min, Math.min(max, value)) / (max - min)));

    return value * (dstMax - dstMin) + dstMin;
};

var MidiLearning = function(midiLearn, options) {
    this.midiLearn = midiLearn;

    this.id = options.id || (new Date()).getTime() + Math.floor(Math.random() * 10000);
    this.min = parseFloat(options.min || 0);
    this.max = parseFloat(options.max);
    this.events = {
        change : options.events.change || function() {},
        bind : options.events.bind || function() {},
        unbind : options.events.unbind || function() {},
        cancel : options.events.cancel || function() {},
        listen : options.events.listen || function() {}
    };

    this.channel = null;
    this.activeCallbacks = {};
};

MidiLearning.prototype.unbind = function() {
    this.midilearn.removeBinding(this);
};

MidiLearning.prototype.startListening = function() {
    this.midilearn.startListeningForBinding(this);
};

MidiLearning.prototype.stopListening = function() {
    this.midilearn.startListeningForBinding(this);
};

var MidiLearn = function(smi) {
    this.smi = smi;
    this.bindings = {};
};

MidiLearn.prototype.smi = null;
MidiLearn.prototype.currentMidiLearning = null;
MidiLearn.prototype.bindings = null;

MidiLearn.prototype.listenerForBinding = function(event) {
    console.log('listenerForBinding');
    console.log(arguments);

    if(this.currentMidiLearning && event) {
        var midiLearning = this.currentMidiLearning;

        console.log(midiLearning);
        midiLearning.events.bind(event);

        this.stopListeningForBinding();

        this.addBinding(midiLearning, event);
    }
};

MidiLearn.prototype.startListeningForBinding = function(midiLearning) {
    console.log('startListeningForBinding');
    console.log(arguments);

    this.stopListeningForBinding();
    this.currentMidiLearning = midiLearning;

    midiLearning.listener = this.listenerForBinding.bind(this);

    console.log(midiLearning);
    midiLearning.events.listen(midiLearning);

    this.smi.on('global', midiLearning.listener);
};

MidiLearn.prototype.stopListeningForBinding = function(midiLearning) {
    console.log('stopListeningForBinding');
    console.log(arguments);

    if(this.currentMidiLearning !== null && (!midiLearning || this.currentMidiLearning === midiLearning)) {
        this.smi.off('global', this.currentMidiLearning.listener);

        this.currentMidiLearning.events.cancel();

        this.currentMidiLearning = null;
    }
};

MidiLearn.prototype.removeBinding = function(id) {
    console.log('removeBinding');
    console.log(arguments);

    //TODO remove the events

    if(this.bindings[id] && this.bindings[id].activeCallbacks) {
        var callbacks = this.bindings[id].activeCallbacks;

        for(var key in callbacks) {
            this.smi.off(key, this.bindings[id].channel, callbacks[key]);
        }
    }

    delete this.bindings[id];
};

MidiLearn.prototype.addBinding = function(midiLearning, event) {
    console.log('addBinding');
    console.log(arguments);

    this.removeBinding(midiLearning.id);
    midiLearning.activeCallbacks = {};

    this.bindings[midiLearning.id] = midiLearning;


    if(event.event === 'cc') {
        this.addCCBinding(midiLearning, event);
    } else if(event.event === 'noteOn') {
        this.addNoteBinding(midiLearning, event);
    }
};

MidiLearn.prototype.addNoteBinding = function(midiLearning, event) {
    console.log('addNoteBinding');
    console.log(arguments);

    midiLearning.channel = event.channel;
    var callbacks = midiLearning.activeCallbacks;

    callbacks['noteOn'] = function(e) {
        if(e.key === event.key) {
            midiLearning.events.change(midiLearning.id, scale(e.velocity, 0, 127, midiLearning.min, midiLearning.max));
        }
    };

    callbacks['noteOff'] = function(e) {
        if(e.key === event.key) {
            midiLearning.events.change(midiLearning.id, midiLearning.min);
        }
    };

    callbacks['polyphonicAftertouch'] = function(e) {
        if(e.key === event.key) {
            midiLearning.events.change(midiLearning.id, scale(e.pressure, 0, 127, midiLearning.min, midiLearning.max));
        }
    };

    this.smi.on('noteOn', event.channel, callbacks.noteOn);
    this.smi.on('noteOff', event.channel, callbacks.noteOff);
    this.smi.on('polyphonicAftertouch', event.channel, callbacks.polyphonicAftertouch);
};

MidiLearn.prototype.addCCBinding = function(midiLearning, event) {
    console.log('addCCBinding');
    console.log(arguments);

    midiLearning.channel = event.channel;
    var callbacks = midiLearning.activeCallbacks;

    callbacks['cc' + event.cc] = function(e) {
        midiLearning.events.change(midiLearning.id, scale(e.value, 0, 127, midiLearning.min, midiLearning.max));
    };

    this.smi.on('cc' + event.cc, event.channel, callbacks['cc' + event.cc]);
};