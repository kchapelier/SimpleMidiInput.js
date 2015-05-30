"use strict";

var MidiLearning = require('./midi-learning');

var MidiLearn = function (smi) {
    this.smi = smi;
    this.bindings = {};
};

MidiLearn.prototype.smi = null;
MidiLearn.prototype.currentMidiLearning = null;
MidiLearn.prototype.bindings = null;

MidiLearn.prototype.getMidiLearning = function (options) {
    return new MidiLearning(this, options);
};

MidiLearn.prototype.listenerForBinding = function (event) {
    if (this.currentMidiLearning && event) {
        var midiLearning = this.currentMidiLearning;

        midiLearning.events.bind(event);

        this.stopListeningForBinding();

        this.addBinding(midiLearning, event);
    }
};

MidiLearn.prototype.startListeningForBinding = function (midiLearning) {
    this.stopListeningForBinding();
    this.currentMidiLearning = midiLearning;

    midiLearning.listener = this.listenerForBinding.bind(this);

    midiLearning.events.listen(midiLearning);

    this.smi.on('global', midiLearning.listener);
};

MidiLearn.prototype.stopListeningForBinding = function (midiLearning) {
    if (this.currentMidiLearning !== null && (!midiLearning || this.currentMidiLearning === midiLearning)) {
        this.smi.off('global', this.currentMidiLearning.listener);
        this.currentMidiLearning.events.cancel();
        this.currentMidiLearning = null;
    }
};

MidiLearn.prototype.setCallback = function (midiLearning, eventName, func) {
    midiLearning.activeCallbacks[eventName] = func;
    this.smi.on(eventName, midiLearning.channel, func);
};

MidiLearn.prototype.removeBinding = function (midiLearning) {
    if (midiLearning && midiLearning.activeCallbacks) {
        var callbacks = midiLearning.activeCallbacks;

        for (var key in callbacks) {
            if (callbacks.hasOwnProperty(key)) {
                this.smi.off(key, midiLearning.channel, callbacks[key]);
            }
        }

        midiLearning.activeCallbacks = {};
    }

    delete this.bindings[midiLearning.id];
};

MidiLearn.prototype.addBinding = function (midiLearning, event) {
    this.removeBinding(midiLearning);

    this.bindings[midiLearning.id] = midiLearning;

    if (event.event === 'cc') {
        this.addCCBinding(midiLearning, event);
    } else if (event.event === 'noteOn') {
        this.addNoteBinding(midiLearning, event);
    }
};

MidiLearn.prototype.addNoteBinding = function (midiLearning, event) {
    midiLearning.channel = event.channel;

    this.setCallback(midiLearning, 'noteOn', function (e) {
        if (e.key === event.key) {
            midiLearning.setValue(e, 'velocity');
        }
    });

    this.setCallback(midiLearning, 'noteOff', function (e) {
        if (e.key === event.key) {
            midiLearning.setValue();
        }
    });

    this.setCallback(midiLearning, 'polyphonicAftertouch', function (e) {
        if (e.key === event.key) {
            midiLearning.setValue(e, 'pressure');
        }
    });
};

MidiLearn.prototype.addCCBinding = function (midiLearning, event) {
    midiLearning.channel = event.channel;

    this.setCallback(midiLearning, 'cc' + event.cc, function (e) {
        midiLearning.setValue(e, 'value');
    });
};

module.exports = MidiLearn;
