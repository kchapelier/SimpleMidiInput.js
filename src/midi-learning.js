"use strict";

/**
 * Generate a random id
 * @returns {Number}
 */
var generateRandomId = function () {
    return (new Date()).getTime() + Math.floor(Math.random() * 1000000);
};

var scale = function scale (value, min, max, dstMin, dstMax) {
    value = (max === min ? 0 : (Math.max(min, Math.min(max, value)) / (max - min)));

    return value * (dstMax - dstMin) + dstMin;
};

var limit = function limit (value, min, max) {
    return Math.max(min, Math.min(max, value));
};

var MidiLearning = function (midiLearn, options) {
    var noop = function () {};

    this.midiLearn = midiLearn;

    this.id = options.id || generateRandomId();
    this.min = parseFloat(options.min || 0);
    this.max = parseFloat(options.max);
    this.channel = null;
    this.activeCallbacks = {};

    this.events = {
        change: options.events.change || noop,
        bind: options.events.bind || noop,
        unbind: options.events.unbind || noop,
        cancel: options.events.cancel || noop,
        listen: options.events.listen || noop
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

MidiLearning.prototype.unbind = function () {
    this.midiLearn.removeBinding(this);
};

MidiLearning.prototype.startListening = function () {
    this.midiLearn.startListeningForBinding(this);
};

MidiLearning.prototype.stopListening = function () {
    this.midiLearn.startListeningForBinding(this);
};

MidiLearning.prototype.setValue = function (event, property) {
    var value;

    if (event && property) {
        value = scale(event[property], 0, 127, this.min, this.max);
    } else if (typeof event === 'number') {
        value = event;
    } else {
        value = this.min;
    }

    if (value !== this.value) {
        this.value = value;
        this.events.change(this.id, value);
    }
};

module.exports = MidiLearning;
