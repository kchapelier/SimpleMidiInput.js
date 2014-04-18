# SimpleMidiInput.js

[![Build Status](https://travis-ci.org/kchapelier/SimpleMidiInput.js.svg?branch=master)](https://travis-ci.org/kchapelier/SimpleMidiInput.js)

Abstraction over the MIDI input. Does all the byte crunching and exposes a straightforward event API.

## Installing and testing

Download the SimpleMidiInput.js file and include it in your html page.

Or install it with bower using the following command: ```bower install SimpleMidiInput.js```

To run the test suite, run the following command: ```npm test```

After installing the dev dependencies with ```npm install```

## How to use

Include the [Jazz-plugin polyfill][1], instanciate it and get the desired midi input.

```js
navigator.requestMIDIAccess().then( onsuccesscallback, onerrorcallback );

var onsuccesscallback = function(midi) {
    var smi = new SimpleMidiInput(midi.inputs()[0]);
};

var onerrorcallback = function(err) {
    console.log('ERROR : ' + err.code);
};
```

Here we instanciate SimpleMidiInput as a wrapper for the first midi input.

```js
smi.on('noteOn', function(data) {
  console.log(data.event, data.key, data.velocity);
});

smi.on('noteOff', function(data) {
  console.log(data.event, data.key);
});
```

Here we log the noteOn and noteOff events with their relative parameters.

```js
smi.on('noteOn', 2, function(data) {
  console.log(data.event, data.key, data.velocity);
}).on('noteOff', 2, function(data) {
  console.log(data.event, data.key);
});
```

We do exactly the same thing, but only for the second channel while taking advantage of the method chaining.

```js
smi.on('cc7', 1, function(data) {
  console.log(data.event, 'usually this is the volume knob, here is its value : ', data.value);
});
```

Here we catch the control change #7 (which is [commonly][2] used to set the volume) on the first channel.

```js
smi.on('polyphonicAftertouch', 1, function(data) {
  console.log(data.event, data.key, data.pressure);
}).on('channelAftertouch', 1, function(data) {
  console.log(data.event, data.pressure);
}).on('programChange', 1, function(data) {
  console.log(data.event, data.program);
});
```

We can also catch the polyphonicAftertouch, channelAftertouch and programChange events.

```js
smi.on('global', function(data) {
  if(data.event !== 'clock') {
    console.log(data);
  }
});
```

You can always catch all the events and log them for debugging. Filtering the MIDI clock events is probably a good idea though.

## History

### 1.0.1 (2014/04/15) :

 * Add missing channel information to picthWheel event.
 * Make the script AMD and CommonJS compliant.
 * Add a few mocha tests on the parsing of midi message.

### 1.0.0 (2014/04/14) :

 * Add pitchWheel, songPosition, songSelect, tuneRequest and activeSensing support.
 * Publish on bower.
 * Declares the public API stable.

### 0.1.0 (~ 2014/02/23)

## Notes

 * Some controllers and MIDI apps send a [noteOn events with a velocity of 0][3] instead of noteOff events. But no worries, SMI automatically translates them to noteOff events.
 * Tested with MPK Mini, HotHand USB and half a dozen iOS apps with rtpMIDI / CoreMIDI.
 * Tested on both the Jazz-plugin polyfill and the MIDI API.
 * No Sysex support yet.

  [1]: http://cwilso.github.io/WebMIDIAPIShim/
  [2]: http://www.midi.org/techspecs/midimessages.php#3
  [3]: http://www.kvraudio.com/forum/viewtopic.php?p=4167096&sid=e8775321f4b8b6e174ec49b0d06667e8#p4167096
