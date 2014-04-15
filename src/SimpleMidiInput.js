/*
 * SimpleMidiInput.js
 * v1.0.1
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
     * @param {MIDIInput} midiInput
     * @constructor
     */
    var SimpleMidiInput = function (midiInput) {
        this.events = {};

        midiInput.addEventListener("midimessage", function (event) {
            this.treatEvent(event.data);
        }.bind(this));
    };

    /**
     * Treat an incoming midi message and trigger the matching event
     * @private
     * @param {UInt8Array} data - Midi mesage data
     * @returns {SimpleMidiInput} Instance for method chaining
     */
    SimpleMidiInput.prototype.treatEvent = function (data) {
        var event;

        switch(data[0]) {
            case 0x00:
                //some iOS app are sending a massive amount of seemingly empty messages, ignore them
                return this;
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

        if(this.filter) {
            if(!this.filter(event)) {
                return this;
            }
        }

        if (!!event['cc']) {
            this.trigger(event.event + event.cc, event);
            this.trigger(event.channel + '.' + event.event + event.cc, event);
        } else {
            this.trigger(event.event, event);
            if(!!event['channel']) {
                this.trigger(event.channel + '.' + event.event, event);
            }
        }

        this.trigger('global', event);

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

    if (typeof define === 'function' && define.amd) {
        define(function() {
            return SimpleMidiInput;
        });
    } else {
        if (typeof window === "object" && typeof window.document === "object") {
            window.SimpleMidiInput = SimpleMidiInput;
        }
    }
})();