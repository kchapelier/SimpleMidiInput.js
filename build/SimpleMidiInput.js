(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.SimpleMidiInput = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

module.exports = require('./src/simple-midi-input');

},{"./src/simple-midi-input":4}],2:[function(require,module,exports){
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

},{"./midi-learning":3}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
"use strict";

// TOUPDATE get rid of gulp altogether
// TOUPDATE const, let
// TOUPDATE use more modern js
// TOUPDATE do away with the var XX = function ...

var MidiLearn = require('./midi-learn');

/**
 * Returns whether a value is numeric
 * @param {*} value
 * @returns {boolean}
 */
var isNumeric = function (value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
};

/**
 * Returns whether a value is an array
 * @param {*} value
 * @returns {boolean}
 */
var isArray = function (value) {
    // TOUPDATE use Array.isArray
    return Object.prototype.toString.call(value) === '[object Array]';
};

/**
 * Returns whether a value is a MIDIInputMap
 * @param {*} value
 * @returns {boolean}
 */
var isMIDIInputMap = function (value) {
    return Object.prototype.toString.call(value) === '[object MIDIInputMap]';
};

/**
 * Returns whether a value is a MIDIInput
 * @param {*} value
 * @returns {boolean}
 */
var isMIDIInput = function (value) {
    return Object.prototype.toString.call(value) === '[object MIDIInput]';
};

/**
 * Returns whether a value is a MIDIAccess
 * @param {*} value
 * @returns {boolean}
 */
var isMIDIAccess = function (value) {
    return Object.prototype.toString.call(value) === '[object MIDIAccess]';
};

/**
 * Returns whether a value is a function
 * @param {*} value
 * @returns {boolean}
 */
var isFunction = function (value) {
    return typeof value === 'function';
};

/**
 * Returns whether a value is an iterator
 * @param {*} value
 * @returns {boolean}
 */
var isIterator = function (value) {
    // TOUPDATE use better way to check for iterator, without regex
    var objectString = Object.prototype.toString.call(value);
    return objectString === '[object Iterator]' || !!objectString.match(/^\[object( | [^ ]+ )Iterator\]$/);
};

/**
 * Force whatever it receive to an array of MIDIInput when possible
 * @param {Function|Iterator|MIDIAccess|MIDIInputMap|MIDIInput|MIDIInput[]} source
 * @returns {MIDIInput[]} Array of MIDIInput
 */
var normalizeInputs = function (source) {
    var inputs = [],
        input;

    if (isMIDIInput(source)) {
        inputs.push(source);
    } else {
        if (isMIDIAccess(source)) {
            source = source.inputs;
        }

        if (isFunction(source)) {
            source = source();
        } else if (isMIDIInputMap(source)) {
            source = source.values();
        }

        if (isArray(source)) {
            inputs = source;
        } else if (isIterator(source)) {
            // TOUPDATE use Array.from()
            while (input = source.next().value) {
                inputs.push(input);
            }
        }
    }

    return inputs;
};

/**
 * Convert Variable Length Quantity to integer
 * @param {int} first LSB
 * @param {int} second MSB
 * @returns {int} Standard integer
 */
var readVLQ = function (first, second) {
    return (second << 7) + (first & 0x7F);
};

/**
 * Instanciate a SimpleMidiInput object
 * @param {MIDIInput|MIDIInput[]} [midiInput]
 * @constructor
 */
var SimpleMidiInput = function (midiInput) {
    this.events = {};
    this.innerEventListeners = {};

    if (midiInput) {
        this.attach(midiInput);
    }
};

SimpleMidiInput.prototype.filter = null;
SimpleMidiInput.prototype.events = null;
SimpleMidiInput.prototype.innerEventListeners = null;

/**
 * Attach this instance to one or several MIDIInput
 * @param {MIDIAccess|MIDIInputMap|MIDIInput|MIDIInput[]} midiInput
 * @returns {SimpleMidiInput} Instance for method chaining
 */
SimpleMidiInput.prototype.attach = function (midiInput) {
    var inputs = normalizeInputs(midiInput);

    for (var i = 0; i < inputs.length; i++) {
        this.attachIndividual(inputs[i]);
    }

    return this;
};

/**
 * Attach this instance to a given MIDIInput
 * @private
 * @param {MIDIInput} midiInput
 */
SimpleMidiInput.prototype.attachIndividual = function (midiInput) {
    if (!this.innerEventListeners[midiInput.id]) {
        var originalListener = midiInput.onmidimessage,
            listener,
            self = this;

        if (typeof originalListener === 'function') {
            listener = function (event) {
                originalListener(event);
                self.processMidiMessage(event.data);
            };
        } else {
            listener = function (event) {
                self.processMidiMessage(event.data);
            };
        }

        midiInput.onmidimessage = listener;

        this.innerEventListeners[midiInput.id] = {
            input: midiInput,
            listener: listener
        };
    }
};

/**
 * Detach this instance from one or several MIDIInput
 * @param {MIDIAccess|MIDIInputMap|MIDIInput|MIDIInput[]} midiInput
 * @returns {SimpleMidiInput} Instance for method chaining
 */
SimpleMidiInput.prototype.detach = function (midiInput) {
    var inputs = normalizeInputs(midiInput);

    for (var i = 0; i < inputs.length; i++) {
        this.detachIndividual(inputs[i]);
    }

    return this;
};

/**
 * Detach this instance from a given MIDIInput
 * @private
 * @param {MIDIInput} midiInput
 */
SimpleMidiInput.prototype.detachIndividual = function (midiInput) {
    if (!!this.innerEventListeners[midiInput.id]) {
        var listener = this.innerEventListeners[midiInput.id].listener;
        midiInput = this.innerEventListeners[midiInput.id].input;

        midiInput.removeEventListener("midimessage", listener);
        delete this.innerEventListeners[midiInput.id];
    }
};

/**
 * Detach this instance from everything
 * @returns {SimpleMidiInput} Instance for method chaining
 */
SimpleMidiInput.prototype.detachAll = function () {
    for (var id in this.innerEventListeners) {
        if (this.innerEventListeners.hasOwnProperty(id)) {
            var midiInput = this.innerEventListeners[midiInput.id].input;
            var listener = this.innerEventListeners[midiInput.id].listener;

            midiInput.removeEventListener("midimessage", listener);
        }
    }

    this.innerEventListeners = {};

    return this;
};

/**
 * Parse an incoming midi message
 * @private
 * @param {UInt8Array} data - Midi mesage data
 * @returns {Object} Midi event, as a readable object
 */
SimpleMidiInput.prototype.parseMidiMessage = function (data) {
    var event;

    switch (data[0]) {
        case 0x00:
            //some iOS app are sending a massive amount of seemingly empty messages, ignore them
            return null;
        case 0xF2:
            event = {
                event: 'songPosition',
                position: readVLQ(data[1], data[2]),
                data: data
            };
            break;
        case 0xF3:
            event = {
                event: 'songSelect',
                song: data[1],
                data: data
            };
            break;
        case 0xF6:
            event = {
                event: 'tuneRequest',
                data: data
            };
            break;
        case 0xF8:
            event = {
                event: 'clock',
                command: 'clock',
                data: data
            };
            break;
        case 0xFA:
            event = {
                event: 'clock',
                command: 'start',
                data: data
            };
            break;
        case 0xFB:
            event = {
                event: 'clock',
                command: 'continue',
                data: data
            };
            break;
        case 0xFC:
            event = {
                event: 'clock',
                command: 'stop',
                data: data
            };
            break;
        case 0xFE:
            event = {
                event: 'activeSensing',
                data: data
            };
            break;
        case 0xFF:
            event = {
                event: 'reset',
                data: data
            };
            break;
    }

    if (data[0] >= 0xE0 && data[0] < 0xF0) {
        event = {
            event: 'pitchWheel',
            channel: 1 + data[0] - 0xE0,
            value: readVLQ(data[1], data[2]) - 0x2000,
            data: data
        };
    } else if (data[0] >= 0xD0 && data[0] < 0xE0) {
        event = {
            event: 'channelAftertouch',
            channel: 1 + data[0] - 0xD0,
            pressure: data[1],
            data: data
        };
    } else if (data[0] >= 0xC0 && data[0] < 0xD0) {
        event = {
            event: 'programChange',
            channel: 1 + data[0] - 0xC0,
            program: data[1],
            data: data
        };
    } else if (data[0] >= 0xB0 && data[0] < 0xC0) {
        event = {
            event: 'cc',
            channel: 1 + data[0] - 0xB0,
            cc: data[1],
            value: data[2],
            data: data
        };
    } else if (data[0] >= 0xA0 && data[0] < 0xB0) {
        event = {
            event: 'polyphonicAftertouch',
            channel: 1 + data[0] - 0xA0,
            key: data[1],
            pressure: data[2],
            data: data
        };
    } else if (data[0] >= 0x90 && data[0] < 0xA0) {
        event = {
            event: 'noteOn',
            channel: 1 + data[0] - 0x90,
            key: data[1],
            velocity: data[2],
            data: data
        };

        //abstracting the fact that a noteOn with a velocity of 0 is supposed to be equal to a noteOff message
        if (event.velocity === 0) {
            event.velocity = 127;
            event.event = 'noteOff';
        }
    } else if (data[0] >= 0x80 && data[0] < 0x90) {
        event = {
            event: 'noteOff',
            channel: 1 + data[0] - 0x80,
            key: data[1],
            velocity: data[2],
            data: data
        };
    }

    if (!event) {
        event = {
            event: 'unknown',
            data: data
        };
    }

    return event;
};

/**
 * Process an incoming midi message and trigger the matching event
 * @private
 * @param {UInt8Array} data - Midi mesage data
 * @returns {SimpleMidiInput} Instance for method chaining
 */
SimpleMidiInput.prototype.processMidiMessage = function (data) {
    var event = this.parseMidiMessage(data);

    if (event) {
        if (this.filter) {
            if (this.filter(event) === false) {
                return this;
            }
        }

        if (!!event.cc) {
            this.trigger(event.event + event.cc, event);
            this.trigger(event.channel + '.' + event.event + event.cc, event);
        } else {
            this.trigger(event.event, event);
            if (!!event.channel) {
                this.trigger(event.channel + '.' + event.event, event);
            }
        }

        this.trigger('global', event);
    }

    return this;
};

/**
 * Set the filter function
 * @param {Function} [filter] - Filter function
 * @returns {SimpleMidiInput} Instance for method chaining
 */
SimpleMidiInput.prototype.setFilter = function (filter) {
    if (isFunction(filter)) {
        this.filter = filter;
    } else {
        delete this.filter;
    }

    return this;
};

/**
 * Subscribe to an event
 * @param {String} event - Name of the event
 * @param {Number} [channel] - Channel of the event
 * @param {Function} func - Callback for the event
 * @returns {SimpleMidiInput} Instance for method chaining
 */
SimpleMidiInput.prototype.on = function (event, channel, func) {
    if (isFunction(channel)) {
        func = channel;
    } else if (isNumeric(channel)) {
        event = channel + '.' + event;
    }

    if (!this.events[event]) {
        this.events[event] = [];
    }

    this.events[event].push(func);

    return this;
};

/**
 * Unsubscribe to an event
 * @param {String} event - Name of the event
 * @param {Number} [channel] - Channel of the event
 * @param {Function} [func] - Callback to remove (if none, all are removed)
 * @returns {SimpleMidiInput} Instance for method chaining
 */
SimpleMidiInput.prototype.off = function (event, channel, func) {
    if (isFunction(channel)) {
        func = channel;
    } else if (isNumeric(channel)) {
        event = channel + '.' + event;
    }

    if (!func) {
        delete this.events[event];
    } else {
        var pos = this.events[event].indexOf(func);
        if (pos >= 0) {
            this.events[event].splice(pos, 1);
        }
    }

    return this;
};

/**
 * Trigger an event
 * @param {String} event - Name of the event
 * @param {Array} args - Arguments to pass to the callbacks
 * @returns {SimpleMidiInput} Instance for method chaining
 */
SimpleMidiInput.prototype.trigger = function (event, args) {
    if (!!this.events[event] && this.events[event].length) {
        for (var l = this.events[event].length; l--;) {
            this.events[event][l].call(this, args);
        }
    }

    return this;
};

/**
 * Return an instance of the MidiLearn handling class
 * @private
 * @returns {MidiLearn} Instance of MidiLearn
 */
SimpleMidiInput.prototype.getMidiLearnInstance = function () {
    if (!this.midiLearn) {
        this.midiLearn = new MidiLearn(this);
    }

    return this.midiLearn;
};

/**
 * Return an instance of MidiLearning for a given parameter
 * @param {Object} options - Options of the parameter (id, min, max, value, events)
 * @returns {MidiLearning}
 */
SimpleMidiInput.prototype.getMidiLearning = function (options) {
    return this.getMidiLearnInstance().getMidiLearning(options);
};

module.exports = SimpleMidiInput;

},{"./midi-learn":2}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsInNyYy9taWRpLWxlYXJuLmpzIiwic3JjL21pZGktbGVhcm5pbmcuanMiLCJzcmMvc2ltcGxlLW1pZGktaW5wdXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL3NyYy9zaW1wbGUtbWlkaS1pbnB1dCcpO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBNaWRpTGVhcm5pbmcgPSByZXF1aXJlKCcuL21pZGktbGVhcm5pbmcnKTtcblxudmFyIE1pZGlMZWFybiA9IGZ1bmN0aW9uIChzbWkpIHtcbiAgICB0aGlzLnNtaSA9IHNtaTtcbiAgICB0aGlzLmJpbmRpbmdzID0ge307XG59O1xuXG5NaWRpTGVhcm4ucHJvdG90eXBlLnNtaSA9IG51bGw7XG5NaWRpTGVhcm4ucHJvdG90eXBlLmN1cnJlbnRNaWRpTGVhcm5pbmcgPSBudWxsO1xuTWlkaUxlYXJuLnByb3RvdHlwZS5iaW5kaW5ncyA9IG51bGw7XG5cbk1pZGlMZWFybi5wcm90b3R5cGUuZ2V0TWlkaUxlYXJuaW5nID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IE1pZGlMZWFybmluZyh0aGlzLCBvcHRpb25zKTtcbn07XG5cbk1pZGlMZWFybi5wcm90b3R5cGUubGlzdGVuZXJGb3JCaW5kaW5nID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgaWYgKHRoaXMuY3VycmVudE1pZGlMZWFybmluZyAmJiBldmVudCkge1xuICAgICAgICB2YXIgbWlkaUxlYXJuaW5nID0gdGhpcy5jdXJyZW50TWlkaUxlYXJuaW5nO1xuXG4gICAgICAgIG1pZGlMZWFybmluZy5ldmVudHMuYmluZChldmVudCk7XG5cbiAgICAgICAgdGhpcy5zdG9wTGlzdGVuaW5nRm9yQmluZGluZygpO1xuXG4gICAgICAgIHRoaXMuYWRkQmluZGluZyhtaWRpTGVhcm5pbmcsIGV2ZW50KTtcbiAgICB9XG59O1xuXG5NaWRpTGVhcm4ucHJvdG90eXBlLnN0YXJ0TGlzdGVuaW5nRm9yQmluZGluZyA9IGZ1bmN0aW9uIChtaWRpTGVhcm5pbmcpIHtcbiAgICB0aGlzLnN0b3BMaXN0ZW5pbmdGb3JCaW5kaW5nKCk7XG4gICAgdGhpcy5jdXJyZW50TWlkaUxlYXJuaW5nID0gbWlkaUxlYXJuaW5nO1xuXG4gICAgbWlkaUxlYXJuaW5nLmxpc3RlbmVyID0gdGhpcy5saXN0ZW5lckZvckJpbmRpbmcuYmluZCh0aGlzKTtcblxuICAgIG1pZGlMZWFybmluZy5ldmVudHMubGlzdGVuKG1pZGlMZWFybmluZyk7XG5cbiAgICB0aGlzLnNtaS5vbignZ2xvYmFsJywgbWlkaUxlYXJuaW5nLmxpc3RlbmVyKTtcbn07XG5cbk1pZGlMZWFybi5wcm90b3R5cGUuc3RvcExpc3RlbmluZ0ZvckJpbmRpbmcgPSBmdW5jdGlvbiAobWlkaUxlYXJuaW5nKSB7XG4gICAgaWYgKHRoaXMuY3VycmVudE1pZGlMZWFybmluZyAhPT0gbnVsbCAmJiAoIW1pZGlMZWFybmluZyB8fCB0aGlzLmN1cnJlbnRNaWRpTGVhcm5pbmcgPT09IG1pZGlMZWFybmluZykpIHtcbiAgICAgICAgdGhpcy5zbWkub2ZmKCdnbG9iYWwnLCB0aGlzLmN1cnJlbnRNaWRpTGVhcm5pbmcubGlzdGVuZXIpO1xuICAgICAgICB0aGlzLmN1cnJlbnRNaWRpTGVhcm5pbmcuZXZlbnRzLmNhbmNlbCgpO1xuICAgICAgICB0aGlzLmN1cnJlbnRNaWRpTGVhcm5pbmcgPSBudWxsO1xuICAgIH1cbn07XG5cbk1pZGlMZWFybi5wcm90b3R5cGUuc2V0Q2FsbGJhY2sgPSBmdW5jdGlvbiAobWlkaUxlYXJuaW5nLCBldmVudE5hbWUsIGZ1bmMpIHtcbiAgICBtaWRpTGVhcm5pbmcuYWN0aXZlQ2FsbGJhY2tzW2V2ZW50TmFtZV0gPSBmdW5jO1xuICAgIHRoaXMuc21pLm9uKGV2ZW50TmFtZSwgbWlkaUxlYXJuaW5nLmNoYW5uZWwsIGZ1bmMpO1xufTtcblxuTWlkaUxlYXJuLnByb3RvdHlwZS5yZW1vdmVCaW5kaW5nID0gZnVuY3Rpb24gKG1pZGlMZWFybmluZykge1xuICAgIGlmIChtaWRpTGVhcm5pbmcgJiYgbWlkaUxlYXJuaW5nLmFjdGl2ZUNhbGxiYWNrcykge1xuICAgICAgICB2YXIgY2FsbGJhY2tzID0gbWlkaUxlYXJuaW5nLmFjdGl2ZUNhbGxiYWNrcztcblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gY2FsbGJhY2tzKSB7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2tzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNtaS5vZmYoa2V5LCBtaWRpTGVhcm5pbmcuY2hhbm5lbCwgY2FsbGJhY2tzW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbWlkaUxlYXJuaW5nLmFjdGl2ZUNhbGxiYWNrcyA9IHt9O1xuICAgIH1cblxuICAgIGRlbGV0ZSB0aGlzLmJpbmRpbmdzW21pZGlMZWFybmluZy5pZF07XG59O1xuXG5NaWRpTGVhcm4ucHJvdG90eXBlLmFkZEJpbmRpbmcgPSBmdW5jdGlvbiAobWlkaUxlYXJuaW5nLCBldmVudCkge1xuICAgIHRoaXMucmVtb3ZlQmluZGluZyhtaWRpTGVhcm5pbmcpO1xuXG4gICAgdGhpcy5iaW5kaW5nc1ttaWRpTGVhcm5pbmcuaWRdID0gbWlkaUxlYXJuaW5nO1xuXG4gICAgaWYgKGV2ZW50LmV2ZW50ID09PSAnY2MnKSB7XG4gICAgICAgIHRoaXMuYWRkQ0NCaW5kaW5nKG1pZGlMZWFybmluZywgZXZlbnQpO1xuICAgIH0gZWxzZSBpZiAoZXZlbnQuZXZlbnQgPT09ICdub3RlT24nKSB7XG4gICAgICAgIHRoaXMuYWRkTm90ZUJpbmRpbmcobWlkaUxlYXJuaW5nLCBldmVudCk7XG4gICAgfVxufTtcblxuTWlkaUxlYXJuLnByb3RvdHlwZS5hZGROb3RlQmluZGluZyA9IGZ1bmN0aW9uIChtaWRpTGVhcm5pbmcsIGV2ZW50KSB7XG4gICAgbWlkaUxlYXJuaW5nLmNoYW5uZWwgPSBldmVudC5jaGFubmVsO1xuXG4gICAgdGhpcy5zZXRDYWxsYmFjayhtaWRpTGVhcm5pbmcsICdub3RlT24nLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBpZiAoZS5rZXkgPT09IGV2ZW50LmtleSkge1xuICAgICAgICAgICAgbWlkaUxlYXJuaW5nLnNldFZhbHVlKGUsICd2ZWxvY2l0eScpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLnNldENhbGxiYWNrKG1pZGlMZWFybmluZywgJ25vdGVPZmYnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBpZiAoZS5rZXkgPT09IGV2ZW50LmtleSkge1xuICAgICAgICAgICAgbWlkaUxlYXJuaW5nLnNldFZhbHVlKCk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuc2V0Q2FsbGJhY2sobWlkaUxlYXJuaW5nLCAncG9seXBob25pY0FmdGVydG91Y2gnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBpZiAoZS5rZXkgPT09IGV2ZW50LmtleSkge1xuICAgICAgICAgICAgbWlkaUxlYXJuaW5nLnNldFZhbHVlKGUsICdwcmVzc3VyZScpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5NaWRpTGVhcm4ucHJvdG90eXBlLmFkZENDQmluZGluZyA9IGZ1bmN0aW9uIChtaWRpTGVhcm5pbmcsIGV2ZW50KSB7XG4gICAgbWlkaUxlYXJuaW5nLmNoYW5uZWwgPSBldmVudC5jaGFubmVsO1xuXG4gICAgdGhpcy5zZXRDYWxsYmFjayhtaWRpTGVhcm5pbmcsICdjYycgKyBldmVudC5jYywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgbWlkaUxlYXJuaW5nLnNldFZhbHVlKGUsICd2YWx1ZScpO1xuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaWRpTGVhcm47XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBHZW5lcmF0ZSBhIHJhbmRvbSBpZFxuICogQHJldHVybnMge051bWJlcn1cbiAqL1xudmFyIGdlbmVyYXRlUmFuZG9tSWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwKTtcbn07XG5cbnZhciBzY2FsZSA9IGZ1bmN0aW9uIHNjYWxlICh2YWx1ZSwgbWluLCBtYXgsIGRzdE1pbiwgZHN0TWF4KSB7XG4gICAgdmFsdWUgPSAobWF4ID09PSBtaW4gPyAwIDogKE1hdGgubWF4KG1pbiwgTWF0aC5taW4obWF4LCB2YWx1ZSkpIC8gKG1heCAtIG1pbikpKTtcblxuICAgIHJldHVybiB2YWx1ZSAqIChkc3RNYXggLSBkc3RNaW4pICsgZHN0TWluO1xufTtcblxudmFyIGxpbWl0ID0gZnVuY3Rpb24gbGltaXQgKHZhbHVlLCBtaW4sIG1heCkge1xuICAgIHJldHVybiBNYXRoLm1heChtaW4sIE1hdGgubWluKG1heCwgdmFsdWUpKTtcbn07XG5cbnZhciBNaWRpTGVhcm5pbmcgPSBmdW5jdGlvbiAobWlkaUxlYXJuLCBvcHRpb25zKSB7XG4gICAgdmFyIG5vb3AgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAgIHRoaXMubWlkaUxlYXJuID0gbWlkaUxlYXJuO1xuXG4gICAgdGhpcy5pZCA9IG9wdGlvbnMuaWQgfHwgZ2VuZXJhdGVSYW5kb21JZCgpO1xuICAgIHRoaXMubWluID0gcGFyc2VGbG9hdChvcHRpb25zLm1pbiB8fCAwKTtcbiAgICB0aGlzLm1heCA9IHBhcnNlRmxvYXQob3B0aW9ucy5tYXgpO1xuICAgIHRoaXMuY2hhbm5lbCA9IG51bGw7XG4gICAgdGhpcy5hY3RpdmVDYWxsYmFja3MgPSB7fTtcblxuICAgIHRoaXMuZXZlbnRzID0ge1xuICAgICAgICBjaGFuZ2U6IG9wdGlvbnMuZXZlbnRzLmNoYW5nZSB8fCBub29wLFxuICAgICAgICBiaW5kOiBvcHRpb25zLmV2ZW50cy5iaW5kIHx8IG5vb3AsXG4gICAgICAgIHVuYmluZDogb3B0aW9ucy5ldmVudHMudW5iaW5kIHx8IG5vb3AsXG4gICAgICAgIGNhbmNlbDogb3B0aW9ucy5ldmVudHMuY2FuY2VsIHx8IG5vb3AsXG4gICAgICAgIGxpc3Rlbjogb3B0aW9ucy5ldmVudHMubGlzdGVuIHx8IG5vb3BcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRWYWx1ZShsaW1pdChwYXJzZUZsb2F0KG9wdGlvbnMudmFsdWUgfHwgMCksIHRoaXMubWluLCB0aGlzLm1heCkpO1xufTtcblxuTWlkaUxlYXJuaW5nLnByb3RvdHlwZS5pZCA9IG51bGw7XG5NaWRpTGVhcm5pbmcucHJvdG90eXBlLm1pbiA9IG51bGw7XG5NaWRpTGVhcm5pbmcucHJvdG90eXBlLm1heCA9IG51bGw7XG5NaWRpTGVhcm5pbmcucHJvdG90eXBlLnZhbHVlID0gbnVsbDtcbk1pZGlMZWFybmluZy5wcm90b3R5cGUuY2hhbm5lbCA9IG51bGw7XG5NaWRpTGVhcm5pbmcucHJvdG90eXBlLmFjdGl2ZUNhbGxiYWNrcyA9IG51bGw7XG5NaWRpTGVhcm5pbmcucHJvdG90eXBlLmV2ZW50cyA9IG51bGw7XG5cbk1pZGlMZWFybmluZy5wcm90b3R5cGUudW5iaW5kID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMubWlkaUxlYXJuLnJlbW92ZUJpbmRpbmcodGhpcyk7XG59O1xuXG5NaWRpTGVhcm5pbmcucHJvdG90eXBlLnN0YXJ0TGlzdGVuaW5nID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMubWlkaUxlYXJuLnN0YXJ0TGlzdGVuaW5nRm9yQmluZGluZyh0aGlzKTtcbn07XG5cbk1pZGlMZWFybmluZy5wcm90b3R5cGUuc3RvcExpc3RlbmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLm1pZGlMZWFybi5zdGFydExpc3RlbmluZ0ZvckJpbmRpbmcodGhpcyk7XG59O1xuXG5NaWRpTGVhcm5pbmcucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24gKGV2ZW50LCBwcm9wZXJ0eSkge1xuICAgIHZhciB2YWx1ZTtcblxuICAgIGlmIChldmVudCAmJiBwcm9wZXJ0eSkge1xuICAgICAgICB2YWx1ZSA9IHNjYWxlKGV2ZW50W3Byb3BlcnR5XSwgMCwgMTI3LCB0aGlzLm1pbiwgdGhpcy5tYXgpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV2ZW50ID09PSAnbnVtYmVyJykge1xuICAgICAgICB2YWx1ZSA9IGV2ZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbHVlID0gdGhpcy5taW47XG4gICAgfVxuXG4gICAgaWYgKHZhbHVlICE9PSB0aGlzLnZhbHVlKSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdGhpcy5ldmVudHMuY2hhbmdlKHRoaXMuaWQsIHZhbHVlKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1pZGlMZWFybmluZztcbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vLyBUT1VQREFURSBnZXQgcmlkIG9mIGd1bHAgYWx0b2dldGhlclxuLy8gVE9VUERBVEUgY29uc3QsIGxldFxuLy8gVE9VUERBVEUgdXNlIG1vcmUgbW9kZXJuIGpzXG4vLyBUT1VQREFURSBkbyBhd2F5IHdpdGggdGhlIHZhciBYWCA9IGZ1bmN0aW9uIC4uLlxuXG52YXIgTWlkaUxlYXJuID0gcmVxdWlyZSgnLi9taWRpLWxlYXJuJyk7XG5cbi8qKlxuICogUmV0dXJucyB3aGV0aGVyIGEgdmFsdWUgaXMgbnVtZXJpY1xuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbnZhciBpc051bWVyaWMgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gIWlzTmFOKHBhcnNlRmxvYXQodmFsdWUpKSAmJiBpc0Zpbml0ZSh2YWx1ZSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgd2hldGhlciBhIHZhbHVlIGlzIGFuIGFycmF5XG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xudmFyIGlzQXJyYXkgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAvLyBUT1VQREFURSB1c2UgQXJyYXkuaXNBcnJheVxuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHdoZXRoZXIgYSB2YWx1ZSBpcyBhIE1JRElJbnB1dE1hcFxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbnZhciBpc01JRElJbnB1dE1hcCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBNSURJSW5wdXRNYXBdJztcbn07XG5cbi8qKlxuICogUmV0dXJucyB3aGV0aGVyIGEgdmFsdWUgaXMgYSBNSURJSW5wdXRcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG52YXIgaXNNSURJSW5wdXQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgTUlESUlucHV0XSc7XG59O1xuXG4vKipcbiAqIFJldHVybnMgd2hldGhlciBhIHZhbHVlIGlzIGEgTUlESUFjY2Vzc1xuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbnZhciBpc01JRElBY2Nlc3MgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgTUlESUFjY2Vzc10nO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHdoZXRoZXIgYSB2YWx1ZSBpcyBhIGZ1bmN0aW9uXG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xudmFyIGlzRnVuY3Rpb24gPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHdoZXRoZXIgYSB2YWx1ZSBpcyBhbiBpdGVyYXRvclxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbnZhciBpc0l0ZXJhdG9yID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgLy8gVE9VUERBVEUgdXNlIGJldHRlciB3YXkgdG8gY2hlY2sgZm9yIGl0ZXJhdG9yLCB3aXRob3V0IHJlZ2V4XG4gICAgdmFyIG9iamVjdFN0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gICAgcmV0dXJuIG9iamVjdFN0cmluZyA9PT0gJ1tvYmplY3QgSXRlcmF0b3JdJyB8fCAhIW9iamVjdFN0cmluZy5tYXRjaCgvXlxcW29iamVjdCggfCBbXiBdKyApSXRlcmF0b3JcXF0kLyk7XG59O1xuXG4vKipcbiAqIEZvcmNlIHdoYXRldmVyIGl0IHJlY2VpdmUgdG8gYW4gYXJyYXkgb2YgTUlESUlucHV0IHdoZW4gcG9zc2libGVcbiAqIEBwYXJhbSB7RnVuY3Rpb258SXRlcmF0b3J8TUlESUFjY2Vzc3xNSURJSW5wdXRNYXB8TUlESUlucHV0fE1JRElJbnB1dFtdfSBzb3VyY2VcbiAqIEByZXR1cm5zIHtNSURJSW5wdXRbXX0gQXJyYXkgb2YgTUlESUlucHV0XG4gKi9cbnZhciBub3JtYWxpemVJbnB1dHMgPSBmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgdmFyIGlucHV0cyA9IFtdLFxuICAgICAgICBpbnB1dDtcblxuICAgIGlmIChpc01JRElJbnB1dChzb3VyY2UpKSB7XG4gICAgICAgIGlucHV0cy5wdXNoKHNvdXJjZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGlzTUlESUFjY2Vzcyhzb3VyY2UpKSB7XG4gICAgICAgICAgICBzb3VyY2UgPSBzb3VyY2UuaW5wdXRzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oc291cmNlKSkge1xuICAgICAgICAgICAgc291cmNlID0gc291cmNlKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNNSURJSW5wdXRNYXAoc291cmNlKSkge1xuICAgICAgICAgICAgc291cmNlID0gc291cmNlLnZhbHVlcygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzQXJyYXkoc291cmNlKSkge1xuICAgICAgICAgICAgaW5wdXRzID0gc291cmNlO1xuICAgICAgICB9IGVsc2UgaWYgKGlzSXRlcmF0b3Ioc291cmNlKSkge1xuICAgICAgICAgICAgLy8gVE9VUERBVEUgdXNlIEFycmF5LmZyb20oKVxuICAgICAgICAgICAgd2hpbGUgKGlucHV0ID0gc291cmNlLm5leHQoKS52YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlucHV0cy5wdXNoKGlucHV0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpbnB1dHM7XG59O1xuXG4vKipcbiAqIENvbnZlcnQgVmFyaWFibGUgTGVuZ3RoIFF1YW50aXR5IHRvIGludGVnZXJcbiAqIEBwYXJhbSB7aW50fSBmaXJzdCBMU0JcbiAqIEBwYXJhbSB7aW50fSBzZWNvbmQgTVNCXG4gKiBAcmV0dXJucyB7aW50fSBTdGFuZGFyZCBpbnRlZ2VyXG4gKi9cbnZhciByZWFkVkxRID0gZnVuY3Rpb24gKGZpcnN0LCBzZWNvbmQpIHtcbiAgICByZXR1cm4gKHNlY29uZCA8PCA3KSArIChmaXJzdCAmIDB4N0YpO1xufTtcblxuLyoqXG4gKiBJbnN0YW5jaWF0ZSBhIFNpbXBsZU1pZGlJbnB1dCBvYmplY3RcbiAqIEBwYXJhbSB7TUlESUlucHV0fE1JRElJbnB1dFtdfSBbbWlkaUlucHV0XVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBTaW1wbGVNaWRpSW5wdXQgPSBmdW5jdGlvbiAobWlkaUlucHV0KSB7XG4gICAgdGhpcy5ldmVudHMgPSB7fTtcbiAgICB0aGlzLmlubmVyRXZlbnRMaXN0ZW5lcnMgPSB7fTtcblxuICAgIGlmIChtaWRpSW5wdXQpIHtcbiAgICAgICAgdGhpcy5hdHRhY2gobWlkaUlucHV0KTtcbiAgICB9XG59O1xuXG5TaW1wbGVNaWRpSW5wdXQucHJvdG90eXBlLmZpbHRlciA9IG51bGw7XG5TaW1wbGVNaWRpSW5wdXQucHJvdG90eXBlLmV2ZW50cyA9IG51bGw7XG5TaW1wbGVNaWRpSW5wdXQucHJvdG90eXBlLmlubmVyRXZlbnRMaXN0ZW5lcnMgPSBudWxsO1xuXG4vKipcbiAqIEF0dGFjaCB0aGlzIGluc3RhbmNlIHRvIG9uZSBvciBzZXZlcmFsIE1JRElJbnB1dFxuICogQHBhcmFtIHtNSURJQWNjZXNzfE1JRElJbnB1dE1hcHxNSURJSW5wdXR8TUlESUlucHV0W119IG1pZGlJbnB1dFxuICogQHJldHVybnMge1NpbXBsZU1pZGlJbnB1dH0gSW5zdGFuY2UgZm9yIG1ldGhvZCBjaGFpbmluZ1xuICovXG5TaW1wbGVNaWRpSW5wdXQucHJvdG90eXBlLmF0dGFjaCA9IGZ1bmN0aW9uIChtaWRpSW5wdXQpIHtcbiAgICB2YXIgaW5wdXRzID0gbm9ybWFsaXplSW5wdXRzKG1pZGlJbnB1dCk7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGlucHV0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLmF0dGFjaEluZGl2aWR1YWwoaW5wdXRzW2ldKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQXR0YWNoIHRoaXMgaW5zdGFuY2UgdG8gYSBnaXZlbiBNSURJSW5wdXRcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge01JRElJbnB1dH0gbWlkaUlucHV0XG4gKi9cblNpbXBsZU1pZGlJbnB1dC5wcm90b3R5cGUuYXR0YWNoSW5kaXZpZHVhbCA9IGZ1bmN0aW9uIChtaWRpSW5wdXQpIHtcbiAgICBpZiAoIXRoaXMuaW5uZXJFdmVudExpc3RlbmVyc1ttaWRpSW5wdXQuaWRdKSB7XG4gICAgICAgIHZhciBvcmlnaW5hbExpc3RlbmVyID0gbWlkaUlucHV0Lm9ubWlkaW1lc3NhZ2UsXG4gICAgICAgICAgICBsaXN0ZW5lcixcbiAgICAgICAgICAgIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIGlmICh0eXBlb2Ygb3JpZ2luYWxMaXN0ZW5lciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgbGlzdGVuZXIgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBvcmlnaW5hbExpc3RlbmVyKGV2ZW50KTtcbiAgICAgICAgICAgICAgICBzZWxmLnByb2Nlc3NNaWRpTWVzc2FnZShldmVudC5kYXRhKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsaXN0ZW5lciA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIHNlbGYucHJvY2Vzc01pZGlNZXNzYWdlKGV2ZW50LmRhdGEpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIG1pZGlJbnB1dC5vbm1pZGltZXNzYWdlID0gbGlzdGVuZXI7XG5cbiAgICAgICAgdGhpcy5pbm5lckV2ZW50TGlzdGVuZXJzW21pZGlJbnB1dC5pZF0gPSB7XG4gICAgICAgICAgICBpbnB1dDogbWlkaUlucHV0LFxuICAgICAgICAgICAgbGlzdGVuZXI6IGxpc3RlbmVyXG4gICAgICAgIH07XG4gICAgfVxufTtcblxuLyoqXG4gKiBEZXRhY2ggdGhpcyBpbnN0YW5jZSBmcm9tIG9uZSBvciBzZXZlcmFsIE1JRElJbnB1dFxuICogQHBhcmFtIHtNSURJQWNjZXNzfE1JRElJbnB1dE1hcHxNSURJSW5wdXR8TUlESUlucHV0W119IG1pZGlJbnB1dFxuICogQHJldHVybnMge1NpbXBsZU1pZGlJbnB1dH0gSW5zdGFuY2UgZm9yIG1ldGhvZCBjaGFpbmluZ1xuICovXG5TaW1wbGVNaWRpSW5wdXQucHJvdG90eXBlLmRldGFjaCA9IGZ1bmN0aW9uIChtaWRpSW5wdXQpIHtcbiAgICB2YXIgaW5wdXRzID0gbm9ybWFsaXplSW5wdXRzKG1pZGlJbnB1dCk7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGlucHV0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLmRldGFjaEluZGl2aWR1YWwoaW5wdXRzW2ldKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRGV0YWNoIHRoaXMgaW5zdGFuY2UgZnJvbSBhIGdpdmVuIE1JRElJbnB1dFxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7TUlESUlucHV0fSBtaWRpSW5wdXRcbiAqL1xuU2ltcGxlTWlkaUlucHV0LnByb3RvdHlwZS5kZXRhY2hJbmRpdmlkdWFsID0gZnVuY3Rpb24gKG1pZGlJbnB1dCkge1xuICAgIGlmICghIXRoaXMuaW5uZXJFdmVudExpc3RlbmVyc1ttaWRpSW5wdXQuaWRdKSB7XG4gICAgICAgIHZhciBsaXN0ZW5lciA9IHRoaXMuaW5uZXJFdmVudExpc3RlbmVyc1ttaWRpSW5wdXQuaWRdLmxpc3RlbmVyO1xuICAgICAgICBtaWRpSW5wdXQgPSB0aGlzLmlubmVyRXZlbnRMaXN0ZW5lcnNbbWlkaUlucHV0LmlkXS5pbnB1dDtcblxuICAgICAgICBtaWRpSW5wdXQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1pZGltZXNzYWdlXCIsIGxpc3RlbmVyKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuaW5uZXJFdmVudExpc3RlbmVyc1ttaWRpSW5wdXQuaWRdO1xuICAgIH1cbn07XG5cbi8qKlxuICogRGV0YWNoIHRoaXMgaW5zdGFuY2UgZnJvbSBldmVyeXRoaW5nXG4gKiBAcmV0dXJucyB7U2ltcGxlTWlkaUlucHV0fSBJbnN0YW5jZSBmb3IgbWV0aG9kIGNoYWluaW5nXG4gKi9cblNpbXBsZU1pZGlJbnB1dC5wcm90b3R5cGUuZGV0YWNoQWxsID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGlkIGluIHRoaXMuaW5uZXJFdmVudExpc3RlbmVycykge1xuICAgICAgICBpZiAodGhpcy5pbm5lckV2ZW50TGlzdGVuZXJzLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgdmFyIG1pZGlJbnB1dCA9IHRoaXMuaW5uZXJFdmVudExpc3RlbmVyc1ttaWRpSW5wdXQuaWRdLmlucHV0O1xuICAgICAgICAgICAgdmFyIGxpc3RlbmVyID0gdGhpcy5pbm5lckV2ZW50TGlzdGVuZXJzW21pZGlJbnB1dC5pZF0ubGlzdGVuZXI7XG5cbiAgICAgICAgICAgIG1pZGlJbnB1dC5yZW1vdmVFdmVudExpc3RlbmVyKFwibWlkaW1lc3NhZ2VcIiwgbGlzdGVuZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5pbm5lckV2ZW50TGlzdGVuZXJzID0ge307XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUGFyc2UgYW4gaW5jb21pbmcgbWlkaSBtZXNzYWdlXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtVSW50OEFycmF5fSBkYXRhIC0gTWlkaSBtZXNhZ2UgZGF0YVxuICogQHJldHVybnMge09iamVjdH0gTWlkaSBldmVudCwgYXMgYSByZWFkYWJsZSBvYmplY3RcbiAqL1xuU2ltcGxlTWlkaUlucHV0LnByb3RvdHlwZS5wYXJzZU1pZGlNZXNzYWdlID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB2YXIgZXZlbnQ7XG5cbiAgICBzd2l0Y2ggKGRhdGFbMF0pIHtcbiAgICAgICAgY2FzZSAweDAwOlxuICAgICAgICAgICAgLy9zb21lIGlPUyBhcHAgYXJlIHNlbmRpbmcgYSBtYXNzaXZlIGFtb3VudCBvZiBzZWVtaW5nbHkgZW1wdHkgbWVzc2FnZXMsIGlnbm9yZSB0aGVtXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgY2FzZSAweEYyOlxuICAgICAgICAgICAgZXZlbnQgPSB7XG4gICAgICAgICAgICAgICAgZXZlbnQ6ICdzb25nUG9zaXRpb24nLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiByZWFkVkxRKGRhdGFbMV0sIGRhdGFbMl0pLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAweEYzOlxuICAgICAgICAgICAgZXZlbnQgPSB7XG4gICAgICAgICAgICAgICAgZXZlbnQ6ICdzb25nU2VsZWN0JyxcbiAgICAgICAgICAgICAgICBzb25nOiBkYXRhWzFdLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAweEY2OlxuICAgICAgICAgICAgZXZlbnQgPSB7XG4gICAgICAgICAgICAgICAgZXZlbnQ6ICd0dW5lUmVxdWVzdCcsXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDB4Rjg6XG4gICAgICAgICAgICBldmVudCA9IHtcbiAgICAgICAgICAgICAgICBldmVudDogJ2Nsb2NrJyxcbiAgICAgICAgICAgICAgICBjb21tYW5kOiAnY2xvY2snLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAweEZBOlxuICAgICAgICAgICAgZXZlbnQgPSB7XG4gICAgICAgICAgICAgICAgZXZlbnQ6ICdjbG9jaycsXG4gICAgICAgICAgICAgICAgY29tbWFuZDogJ3N0YXJ0JyxcbiAgICAgICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMHhGQjpcbiAgICAgICAgICAgIGV2ZW50ID0ge1xuICAgICAgICAgICAgICAgIGV2ZW50OiAnY2xvY2snLFxuICAgICAgICAgICAgICAgIGNvbW1hbmQ6ICdjb250aW51ZScsXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDB4RkM6XG4gICAgICAgICAgICBldmVudCA9IHtcbiAgICAgICAgICAgICAgICBldmVudDogJ2Nsb2NrJyxcbiAgICAgICAgICAgICAgICBjb21tYW5kOiAnc3RvcCcsXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDB4RkU6XG4gICAgICAgICAgICBldmVudCA9IHtcbiAgICAgICAgICAgICAgICBldmVudDogJ2FjdGl2ZVNlbnNpbmcnLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAweEZGOlxuICAgICAgICAgICAgZXZlbnQgPSB7XG4gICAgICAgICAgICAgICAgZXZlbnQ6ICdyZXNldCcsXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChkYXRhWzBdID49IDB4RTAgJiYgZGF0YVswXSA8IDB4RjApIHtcbiAgICAgICAgZXZlbnQgPSB7XG4gICAgICAgICAgICBldmVudDogJ3BpdGNoV2hlZWwnLFxuICAgICAgICAgICAgY2hhbm5lbDogMSArIGRhdGFbMF0gLSAweEUwLFxuICAgICAgICAgICAgdmFsdWU6IHJlYWRWTFEoZGF0YVsxXSwgZGF0YVsyXSkgLSAweDIwMDAsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgIH07XG4gICAgfSBlbHNlIGlmIChkYXRhWzBdID49IDB4RDAgJiYgZGF0YVswXSA8IDB4RTApIHtcbiAgICAgICAgZXZlbnQgPSB7XG4gICAgICAgICAgICBldmVudDogJ2NoYW5uZWxBZnRlcnRvdWNoJyxcbiAgICAgICAgICAgIGNoYW5uZWw6IDEgKyBkYXRhWzBdIC0gMHhEMCxcbiAgICAgICAgICAgIHByZXNzdXJlOiBkYXRhWzFdLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICB9O1xuICAgIH0gZWxzZSBpZiAoZGF0YVswXSA+PSAweEMwICYmIGRhdGFbMF0gPCAweEQwKSB7XG4gICAgICAgIGV2ZW50ID0ge1xuICAgICAgICAgICAgZXZlbnQ6ICdwcm9ncmFtQ2hhbmdlJyxcbiAgICAgICAgICAgIGNoYW5uZWw6IDEgKyBkYXRhWzBdIC0gMHhDMCxcbiAgICAgICAgICAgIHByb2dyYW06IGRhdGFbMV0sXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgIH07XG4gICAgfSBlbHNlIGlmIChkYXRhWzBdID49IDB4QjAgJiYgZGF0YVswXSA8IDB4QzApIHtcbiAgICAgICAgZXZlbnQgPSB7XG4gICAgICAgICAgICBldmVudDogJ2NjJyxcbiAgICAgICAgICAgIGNoYW5uZWw6IDEgKyBkYXRhWzBdIC0gMHhCMCxcbiAgICAgICAgICAgIGNjOiBkYXRhWzFdLFxuICAgICAgICAgICAgdmFsdWU6IGRhdGFbMl0sXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgIH07XG4gICAgfSBlbHNlIGlmIChkYXRhWzBdID49IDB4QTAgJiYgZGF0YVswXSA8IDB4QjApIHtcbiAgICAgICAgZXZlbnQgPSB7XG4gICAgICAgICAgICBldmVudDogJ3BvbHlwaG9uaWNBZnRlcnRvdWNoJyxcbiAgICAgICAgICAgIGNoYW5uZWw6IDEgKyBkYXRhWzBdIC0gMHhBMCxcbiAgICAgICAgICAgIGtleTogZGF0YVsxXSxcbiAgICAgICAgICAgIHByZXNzdXJlOiBkYXRhWzJdLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICB9O1xuICAgIH0gZWxzZSBpZiAoZGF0YVswXSA+PSAweDkwICYmIGRhdGFbMF0gPCAweEEwKSB7XG4gICAgICAgIGV2ZW50ID0ge1xuICAgICAgICAgICAgZXZlbnQ6ICdub3RlT24nLFxuICAgICAgICAgICAgY2hhbm5lbDogMSArIGRhdGFbMF0gLSAweDkwLFxuICAgICAgICAgICAga2V5OiBkYXRhWzFdLFxuICAgICAgICAgICAgdmVsb2NpdHk6IGRhdGFbMl0sXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgIH07XG5cbiAgICAgICAgLy9hYnN0cmFjdGluZyB0aGUgZmFjdCB0aGF0IGEgbm90ZU9uIHdpdGggYSB2ZWxvY2l0eSBvZiAwIGlzIHN1cHBvc2VkIHRvIGJlIGVxdWFsIHRvIGEgbm90ZU9mZiBtZXNzYWdlXG4gICAgICAgIGlmIChldmVudC52ZWxvY2l0eSA9PT0gMCkge1xuICAgICAgICAgICAgZXZlbnQudmVsb2NpdHkgPSAxMjc7XG4gICAgICAgICAgICBldmVudC5ldmVudCA9ICdub3RlT2ZmJztcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZGF0YVswXSA+PSAweDgwICYmIGRhdGFbMF0gPCAweDkwKSB7XG4gICAgICAgIGV2ZW50ID0ge1xuICAgICAgICAgICAgZXZlbnQ6ICdub3RlT2ZmJyxcbiAgICAgICAgICAgIGNoYW5uZWw6IDEgKyBkYXRhWzBdIC0gMHg4MCxcbiAgICAgICAgICAgIGtleTogZGF0YVsxXSxcbiAgICAgICAgICAgIHZlbG9jaXR5OiBkYXRhWzJdLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGlmICghZXZlbnQpIHtcbiAgICAgICAgZXZlbnQgPSB7XG4gICAgICAgICAgICBldmVudDogJ3Vua25vd24nLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBldmVudDtcbn07XG5cbi8qKlxuICogUHJvY2VzcyBhbiBpbmNvbWluZyBtaWRpIG1lc3NhZ2UgYW5kIHRyaWdnZXIgdGhlIG1hdGNoaW5nIGV2ZW50XG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtVSW50OEFycmF5fSBkYXRhIC0gTWlkaSBtZXNhZ2UgZGF0YVxuICogQHJldHVybnMge1NpbXBsZU1pZGlJbnB1dH0gSW5zdGFuY2UgZm9yIG1ldGhvZCBjaGFpbmluZ1xuICovXG5TaW1wbGVNaWRpSW5wdXQucHJvdG90eXBlLnByb2Nlc3NNaWRpTWVzc2FnZSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGV2ZW50ID0gdGhpcy5wYXJzZU1pZGlNZXNzYWdlKGRhdGEpO1xuXG4gICAgaWYgKGV2ZW50KSB7XG4gICAgICAgIGlmICh0aGlzLmZpbHRlcikge1xuICAgICAgICAgICAgaWYgKHRoaXMuZmlsdGVyKGV2ZW50KSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghIWV2ZW50LmNjKSB7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoZXZlbnQuZXZlbnQgKyBldmVudC5jYywgZXZlbnQpO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKGV2ZW50LmNoYW5uZWwgKyAnLicgKyBldmVudC5ldmVudCArIGV2ZW50LmNjLCBldmVudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoZXZlbnQuZXZlbnQsIGV2ZW50KTtcbiAgICAgICAgICAgIGlmICghIWV2ZW50LmNoYW5uZWwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoZXZlbnQuY2hhbm5lbCArICcuJyArIGV2ZW50LmV2ZW50LCBldmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnRyaWdnZXIoJ2dsb2JhbCcsIGV2ZW50KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IHRoZSBmaWx0ZXIgZnVuY3Rpb25cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmaWx0ZXJdIC0gRmlsdGVyIGZ1bmN0aW9uXG4gKiBAcmV0dXJucyB7U2ltcGxlTWlkaUlucHV0fSBJbnN0YW5jZSBmb3IgbWV0aG9kIGNoYWluaW5nXG4gKi9cblNpbXBsZU1pZGlJbnB1dC5wcm90b3R5cGUuc2V0RmlsdGVyID0gZnVuY3Rpb24gKGZpbHRlcikge1xuICAgIGlmIChpc0Z1bmN0aW9uKGZpbHRlcikpIHtcbiAgICAgICAgdGhpcy5maWx0ZXIgPSBmaWx0ZXI7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuZmlsdGVyO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTdWJzY3JpYmUgdG8gYW4gZXZlbnRcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCAtIE5hbWUgb2YgdGhlIGV2ZW50XG4gKiBAcGFyYW0ge051bWJlcn0gW2NoYW5uZWxdIC0gQ2hhbm5lbCBvZiB0aGUgZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgLSBDYWxsYmFjayBmb3IgdGhlIGV2ZW50XG4gKiBAcmV0dXJucyB7U2ltcGxlTWlkaUlucHV0fSBJbnN0YW5jZSBmb3IgbWV0aG9kIGNoYWluaW5nXG4gKi9cblNpbXBsZU1pZGlJbnB1dC5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAoZXZlbnQsIGNoYW5uZWwsIGZ1bmMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjaGFubmVsKSkge1xuICAgICAgICBmdW5jID0gY2hhbm5lbDtcbiAgICB9IGVsc2UgaWYgKGlzTnVtZXJpYyhjaGFubmVsKSkge1xuICAgICAgICBldmVudCA9IGNoYW5uZWwgKyAnLicgKyBldmVudDtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZXZlbnRzW2V2ZW50XSkge1xuICAgICAgICB0aGlzLmV2ZW50c1tldmVudF0gPSBbXTtcbiAgICB9XG5cbiAgICB0aGlzLmV2ZW50c1tldmVudF0ucHVzaChmdW5jKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBVbnN1YnNjcmliZSB0byBhbiBldmVudFxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IC0gTmFtZSBvZiB0aGUgZXZlbnRcbiAqIEBwYXJhbSB7TnVtYmVyfSBbY2hhbm5lbF0gLSBDaGFubmVsIG9mIHRoZSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2Z1bmNdIC0gQ2FsbGJhY2sgdG8gcmVtb3ZlIChpZiBub25lLCBhbGwgYXJlIHJlbW92ZWQpXG4gKiBAcmV0dXJucyB7U2ltcGxlTWlkaUlucHV0fSBJbnN0YW5jZSBmb3IgbWV0aG9kIGNoYWluaW5nXG4gKi9cblNpbXBsZU1pZGlJbnB1dC5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24gKGV2ZW50LCBjaGFubmVsLCBmdW5jKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY2hhbm5lbCkpIHtcbiAgICAgICAgZnVuYyA9IGNoYW5uZWw7XG4gICAgfSBlbHNlIGlmIChpc051bWVyaWMoY2hhbm5lbCkpIHtcbiAgICAgICAgZXZlbnQgPSBjaGFubmVsICsgJy4nICsgZXZlbnQ7XG4gICAgfVxuXG4gICAgaWYgKCFmdW5jKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmV2ZW50c1tldmVudF07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHBvcyA9IHRoaXMuZXZlbnRzW2V2ZW50XS5pbmRleE9mKGZ1bmMpO1xuICAgICAgICBpZiAocG9zID49IDApIHtcbiAgICAgICAgICAgIHRoaXMuZXZlbnRzW2V2ZW50XS5zcGxpY2UocG9zLCAxKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBUcmlnZ2VyIGFuIGV2ZW50XG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgLSBOYW1lIG9mIHRoZSBldmVudFxuICogQHBhcmFtIHtBcnJheX0gYXJncyAtIEFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSBjYWxsYmFja3NcbiAqIEByZXR1cm5zIHtTaW1wbGVNaWRpSW5wdXR9IEluc3RhbmNlIGZvciBtZXRob2QgY2hhaW5pbmdcbiAqL1xuU2ltcGxlTWlkaUlucHV0LnByb3RvdHlwZS50cmlnZ2VyID0gZnVuY3Rpb24gKGV2ZW50LCBhcmdzKSB7XG4gICAgaWYgKCEhdGhpcy5ldmVudHNbZXZlbnRdICYmIHRoaXMuZXZlbnRzW2V2ZW50XS5sZW5ndGgpIHtcbiAgICAgICAgZm9yICh2YXIgbCA9IHRoaXMuZXZlbnRzW2V2ZW50XS5sZW5ndGg7IGwtLTspIHtcbiAgICAgICAgICAgIHRoaXMuZXZlbnRzW2V2ZW50XVtsXS5jYWxsKHRoaXMsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybiBhbiBpbnN0YW5jZSBvZiB0aGUgTWlkaUxlYXJuIGhhbmRsaW5nIGNsYXNzXG4gKiBAcHJpdmF0ZVxuICogQHJldHVybnMge01pZGlMZWFybn0gSW5zdGFuY2Ugb2YgTWlkaUxlYXJuXG4gKi9cblNpbXBsZU1pZGlJbnB1dC5wcm90b3R5cGUuZ2V0TWlkaUxlYXJuSW5zdGFuY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLm1pZGlMZWFybikge1xuICAgICAgICB0aGlzLm1pZGlMZWFybiA9IG5ldyBNaWRpTGVhcm4odGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubWlkaUxlYXJuO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gYW4gaW5zdGFuY2Ugb2YgTWlkaUxlYXJuaW5nIGZvciBhIGdpdmVuIHBhcmFtZXRlclxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPcHRpb25zIG9mIHRoZSBwYXJhbWV0ZXIgKGlkLCBtaW4sIG1heCwgdmFsdWUsIGV2ZW50cylcbiAqIEByZXR1cm5zIHtNaWRpTGVhcm5pbmd9XG4gKi9cblNpbXBsZU1pZGlJbnB1dC5wcm90b3R5cGUuZ2V0TWlkaUxlYXJuaW5nID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRNaWRpTGVhcm5JbnN0YW5jZSgpLmdldE1pZGlMZWFybmluZyhvcHRpb25zKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2ltcGxlTWlkaUlucHV0O1xuIl19
