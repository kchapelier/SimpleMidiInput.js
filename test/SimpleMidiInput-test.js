"use strict";

var should = require('chai').should();
var SimpleMidiInput = require('../src/SimpleMidiInput.js');

describe('SimpleMidiInput', function() {
    //fake midi input
    var midiInput = {
        addEventListener : function() {}
    };

    describe('#treatEvent()', function() {
        it('supports noteOff events', function() {
            var event,
                smi = new SimpleMidiInput(midiInput);

            event = smi.parseMidiMessage([0x80, 0x40, 0x7F]);
            event.event.should.equal('noteOff');
            event.channel.should.equal(1);
            event.key.should.equal(64);
            event.velocity.should.equal(127);

            event = smi.parseMidiMessage([0x81, 0x00, 0x40]);
            event.event.should.equal('noteOff');
            event.channel.should.equal(2);
            event.key.should.equal(0);
            event.velocity.should.equal(64);

            event = smi.parseMidiMessage([0x8F, 0x7F, 0x01]);
            event.event.should.equal('noteOff');
            event.channel.should.equal(16);
            event.key.should.equal(127);
            event.velocity.should.equal(1);
        });

        it('supports noteOn events', function() {
            var event,
                smi = new SimpleMidiInput(midiInput);

            event = smi.parseMidiMessage([0x90, 0x40, 0x7F]);
            event.event.should.equal('noteOn');
            event.channel.should.equal(1);
            event.key.should.equal(64);
            event.velocity.should.equal(127);

            event = smi.parseMidiMessage([0x91, 0x00, 0x40]);
            event.event.should.equal('noteOn');
            event.channel.should.equal(2);
            event.key.should.equal(0);
            event.velocity.should.equal(64);

            event = smi.parseMidiMessage([0x9F, 0x7F, 0x01]);
            event.event.should.equal('noteOn');
            event.channel.should.equal(16);
            event.key.should.equal(127);
            event.velocity.should.equal(1);
        });

        it('supports noteOn with velocity 0 as noteOff', function() {
            var event,
                smi = new SimpleMidiInput(midiInput);

            event = smi.parseMidiMessage([0x90, 0x40, 0x00]);
            event.event.should.equal('noteOff');
            event.channel.should.equal(1);
            event.key.should.equal(64);
            event.velocity.should.equal(127);

            event = smi.parseMidiMessage([0x91, 0x00, 0x00]);
            event.event.should.equal('noteOff');
            event.channel.should.equal(2);
            event.key.should.equal(0);
            event.velocity.should.equal(127);

            event = smi.parseMidiMessage([0x9F, 0x7F, 0x00]);
            event.event.should.equal('noteOff');
            event.channel.should.equal(16);
            event.key.should.equal(127);
            event.velocity.should.equal(127);
        });
        
        it('supports polyphonicAftertouch events', function() {
            var event,
                smi = new SimpleMidiInput(midiInput);
            
            event = smi.parseMidiMessage([0xA0, 0x40, 0x7F]);
            event.event.should.equal('polyphonicAftertouch');
            event.channel.should.equal(1);
            event.key.should.equal(64);
            event.pressure.should.equal(127);

            event = smi.parseMidiMessage([0xA1, 0x00, 0x40]);
            event.event.should.equal('polyphonicAftertouch');
            event.channel.should.equal(2);
            event.key.should.equal(0);
            event.pressure.should.equal(64);

            event = smi.parseMidiMessage([0xAF, 0x7F, 0x00]);
            event.event.should.equal('polyphonicAftertouch');
            event.channel.should.equal(16);
            event.key.should.equal(127);
            event.pressure.should.equal(0);
        });

        it('supports cc events', function() {
            var event,
                smi = new SimpleMidiInput(midiInput);

            event = smi.parseMidiMessage([0xB0, 0x40, 0x7F]);
            event.event.should.equal('cc');
            event.channel.should.equal(1);
            event.cc.should.equal(64);
            event.value.should.equal(127);

            event = smi.parseMidiMessage([0xB1, 0x00, 0x40]);
            event.event.should.equal('cc');
            event.channel.should.equal(2);
            event.cc.should.equal(0);
            event.value.should.equal(64);

            event = smi.parseMidiMessage([0xBF, 0x7F, 0x00]);
            event.event.should.equal('cc');
            event.channel.should.equal(16);
            event.cc.should.equal(127);
            event.value.should.equal(0);
        });

        it('supports programChange events', function() {
            var event,
                smi = new SimpleMidiInput(midiInput);

            event = smi.parseMidiMessage([0xC0, 0x40]);
            event.event.should.equal('programChange');
            event.channel.should.equal(1);
            event.program.should.equal(64);

            event = smi.parseMidiMessage([0xC1, 0x00]);
            event.event.should.equal('programChange');
            event.channel.should.equal(2);
            event.program.should.equal(0);

            event = smi.parseMidiMessage([0xCF, 0x7F]);
            event.event.should.equal('programChange');
            event.channel.should.equal(16);
            event.program.should.equal(127);
        });
        
        it('supports channelAftertouch events', function() {
            var event,
                smi = new SimpleMidiInput(midiInput);

            event = smi.parseMidiMessage([0xD0, 0x40]);
            event.event.should.equal('channelAftertouch');
            event.channel.should.equal(1);
            event.pressure.should.equal(64);

            event = smi.parseMidiMessage([0xD1, 0x00]);
            event.event.should.equal('channelAftertouch');
            event.channel.should.equal(2);
            event.pressure.should.equal(0);

            event = smi.parseMidiMessage([0xDF, 0x7F]);
            event.event.should.equal('channelAftertouch');
            event.channel.should.equal(16);
            event.pressure.should.equal(127);
        });

        it('supports pitchWheel events', function() {
            var event,
                smi = new SimpleMidiInput(midiInput);

            event = smi.parseMidiMessage([0xE0, 0x00, 0x00]);
            event.event.should.equal('pitchWheel');
            event.channel.should.equal(1);
            event.value.should.equal(-8192);

            event = smi.parseMidiMessage([0xE1, 0x7F, 0x7F]);
            event.event.should.equal('pitchWheel');
            event.channel.should.equal(2);
            event.value.should.equal(8191);

            event = smi.parseMidiMessage([0xEF, 0x00, 0x40]); // 0x2000
            event.event.should.equal('pitchWheel');
            event.channel.should.equal(16);
            event.value.should.equal(0);
        });

        it('supports clocks events', function() {
            var event,
                smi = new SimpleMidiInput(midiInput);

            event = smi.parseMidiMessage([0xF8]);
            event.event.should.equal('clock');
            event.command.should.equal('clock');
            
            event = smi.parseMidiMessage([0xFA]);
            event.event.should.equal('clock');
            event.command.should.equal('start');

            event = smi.parseMidiMessage([0xFB]);
            event.event.should.equal('clock');
            event.command.should.equal('continue');
            
            event = smi.parseMidiMessage([0xFC]);
            event.event.should.equal('clock');
            event.command.should.equal('stop');
        });

        it('supports other 0xF* events', function() {
            var event,
                smi = new SimpleMidiInput(midiInput);

            event = smi.parseMidiMessage([0xF2, 0x7F, 0x7F]);
            event.event.should.equal('songPosition');
            event.position.should.equal(16383);

            event = smi.parseMidiMessage([0xF3, 0x40]);
            event.event.should.equal('songSelect');
            event.song.should.equal(64);

            event = smi.parseMidiMessage([0xF6]);
            event.event.should.equal('tuneRequest');

            event = smi.parseMidiMessage([0xFE]);
            event.event.should.equal('activeSensing');

            event = smi.parseMidiMessage([0xFF]);
            event.event.should.equal('reset');
        });
    });
});