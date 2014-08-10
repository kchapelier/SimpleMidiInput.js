/*
 * SimpleMidiInput.js
 * v1.1.0
 * Author: Kevin Chapelier
 * License: MIT
 */

(function () {
    "use strict";

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
        return Object.prototype.toString.call(value) === '[object Array]';
    };

    /**
     * Convert Variable Length Quantity to integer
     * @param {int} first LSB
     * @param {int} second MSB
     * @returns {int} Standard integer
     */
    var readVLQ = function(first, second) {
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

        if(midiInput) {
            this.attach(midiInput);
        }
    };

    SimpleMidiInput.prototype.filter = null;
    SimpleMidiInput.prototype.events = null;
    SimpleMidiInput.prototype.innerEventListeners = null;

    /**
     * Attach this instance to one or several MIDIInput
     * @param {MIDIInput|MIDIInput[]} midiInput
     * @returns {SimpleMidiInput} Instance for method chaining
     */
    SimpleMidiInput.prototype.attach = function(midiInput) {
        if(isArray(midiInput)) {
            for(var i = 0; i < midiInput.length; i++) {
                this.attach(midiInput[i]);
            }
        } else {
            if(!this.innerEventListeners[midiInput.id]) {
                var listener = function (event) {
                    this.processMidiMessage(event.data);
                }.bind(this);

                midiInput.addEventListener("midimessage", listener);
                this.innerEventListeners[midiInput.id] = {
                    input: midiInput,
                    listener: listener
                };
            }
        }

        return this;
    };

    /**
     * Detach this instance from one or several MIDIInput
     * @param {MIDIInput|MIDIInput[]} midiInput
     * @returns {SimpleMidiInput} Instance for method chaining
     */
    SimpleMidiInput.prototype.detach = function(midiInput) {
        if(isArray(midiInput)) {
            for(var i = 0; i < midiInput.length; i++) {
                this.detach(midiInput);
            }
        } else {
            if(!!this.innerEventListeners[midiInput.id]) {
                var listener = this.innerEventListeners[midiInput.id].listener;
                midiInput = this.innerEventListeners[midiInput.id].input;

                midiInput.removeEventListener("midimessage", listener);
                delete this.innerEventListeners[midiInput.id];
            }
        }

        return this;
    };

    /**
     * Detach this instance from everything
     * @returns {SimpleMidiInput} Instance for method chaining
     */
    SimpleMidiInput.prototype.detachAll = function() {
        for(var id in this.innerEventListeners) {
            if(this.innerEventListeners.hasOwnProperty(id)) {
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
    SimpleMidiInput.prototype.parseMidiMessage = function(data) {
        var event;

        switch(data[0]) {
            case 0x00:
                //some iOS app are sending a massive amount of seemingly empty messages, ignore them
                return null;
            case 0xF2:
                event = {
                    'event': 'songPosition',
                    'position': readVLQ(data[1], data[2]),
                    'data': data
                };
                break;
            case 0xF3:
                event = {
                    'event': 'songSelect',
                    'song': data[1],
                    'data': data
                };
                break;
            case 0xF6:
                event = {
                    'event': 'tuneRequest',
                    'data': data
                };
                break;
            case 0xF8:
                event = {
                    'event': 'clock',
                    'command': 'clock',
                    'data': data
                };
                break;
            case 0xFA:
                event = {
                    'event': 'clock',
                    'command': 'start',
                    'data': data
                };
                break;
            case 0xFB:
                event = {
                    'event': 'clock',
                    'command': 'continue',
                    'data': data
                };
                break;
            case 0xFC:
                event = {
                    'event': 'clock',
                    'command': 'stop',
                    'data': data
                };
                break;
            case 0xFE:
                event = {
                    'event': 'activeSensing',
                    'data': data
                };
                break;
            case 0xFF:
                event = {
                    'event': 'reset',
                    'data': data
                };
                break;
        }

        if (data[0] >= 0xE0 && data[0] < 0xF0) {
            event = {
                'event': 'pitchWheel',
                'channel': 1 + data[0] - 0xE0,
                'value': readVLQ(data[1], data[2]) - 0x2000,
                'data': data
            };
        } else if (data[0] >= 0xD0 && data[0] < 0xE0) {
            event = {
                'event': 'channelAftertouch',
                'channel': 1 + data[0] - 0xD0,
                'pressure': data[1],
                'data': data
            };
        } else if (data[0] >= 0xC0 && data[0] < 0xD0) {
            event = {
                'event': 'programChange',
                'channel': 1 + data[0] - 0xC0,
                'program': data[1],
                'data': data
            };
        } else if (data[0] >= 0xB0 && data[0] < 0xC0) {
            event = {
                'event': 'cc',
                'channel': 1 + data[0] - 0xB0,
                'cc': data[1],
                'value': data[2],
                'data': data
            };
        } else if (data[0] >= 0xA0 && data[0] < 0xB0) {
            event = {
                'event': 'polyphonicAftertouch',
                'channel': 1 + data[0] - 0xA0,
                'key': data[1],
                'pressure': data[2],
                'data': data
            };
        } else if (data[0] >= 0x90 && data[0] < 0xA0) {
            event = {
                'event': 'noteOn',
                'channel': 1 + data[0] - 0x90,
                'key': data[1],
                'velocity': data[2],
                'data': data
            };

            //abstracting the fact that a noteOn with a velocity of 0 is supposed to be equal to a noteOff message
            if(event.velocity === 0) {
                event.velocity = 127;
                event.event = 'noteOff';
            }

        } else if (data[0] >= 0x80 && data[0] < 0x90) {
            event = {
                'event': 'noteOff',
                'channel': 1 + data[0] - 0x80,
                'key': data[1],
                'velocity': data[2],
                'data': data
            };
        }

        if(!event) {
            event = {
                'event': 'unknown',
                'data': data
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

        if(event) {
            if (this.filter) {
                if (this.filter(event) === false) {
                    return this;
                }
            }

            if (!!event['cc']) {
                this.trigger(event.event + event.cc, event);
                this.trigger(event.channel + '.' + event.event + event.cc, event);
            } else {
                this.trigger(event.event, event);
                if (!!event['channel']) {
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
        if(typeof filter === 'function') {
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
        if (typeof(channel) === 'function') {
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
        if (typeof(channel) === 'function') {
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
    SimpleMidiInput.prototype.getMidiLearnInstance = function() {
        if(!this.midiLearn) {
            this.midiLearn = new MidiLearn(this);
        }

        return this.midiLearn;
    };

    /**
     * Return an instance of MidiLearning for a given parameter
     * @param {Object} options - Options of the parameter (id, min, max, value, events)
     * @returns {MidiLearning}
     */
    SimpleMidiInput.prototype.getMidiLearning = function(options) {
        return this.getMidiLearnInstance().getMidiLearning(options);
    };

    if (typeof define === 'function' && define.amd) {
        define(function() {
            return SimpleMidiInput;
        });
    } else if(typeof module === 'object') {
        module.exports = SimpleMidiInput;
    } else if (typeof window === "object" && typeof window.document === "object") {
        window.SimpleMidiInput = SimpleMidiInput;
    }
})();