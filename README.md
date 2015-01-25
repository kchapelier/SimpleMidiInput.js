# SimpleMidiInput.js

[![Build Status](https://travis-ci.org/kchapelier/SimpleMidiInput.js.svg?branch=master)](https://travis-ci.org/kchapelier/SimpleMidiInput.js)

Abstraction over the MIDI input. Does all the byte crunching and exposes a straightforward event API.

## Installing and testing

Download the SimpleMidiInput.js file and include it in your html page.

Or install it with bower using the following command: ```bower install SimpleMidiInput.js```

To run the test suite, first install the dev dependencies with ```npm install```

Then run the following command: ```npm test```

## Usage

Either include the [Jazz-plugin polyfill][1] and instanciate it or run chrome on mac with the Web MIDI API enabled in
chrome://flags, then get the desired midi input.

```js
var smi = new SimpleMidiInput();
navigator.requestMIDIAccess().then( onsuccesscallback, onerrorcallback );

var onsuccesscallback = function(midi) {
    smi.attach(midi);
};

var onerrorcallback = function(err) {
    console.log('ERROR : ' + err.code);
};
```

Here we instanciate SimpleMidiInput and attach it to all the MIDI inputs.

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

# MIDI learn

MIDI Learn is a simple system used by many DAW and plugins to simplify the use of MIDI controllers.
For web apps, the main advantage is that the MIDI binding doesn't have to be hardcoded.
The users can effectively bind the parameters to the CC of their choice.

Check this [specific documentation](https://github.com/kchapelier/SimpleMidiInput.js/blob/master/README-MIDILEARN.md).

## API reference

### new SimpleMidiInput([midiInput]);

Instaciation of the class.

Options :

 * midiInput : A single instance of MIDIInput, MIDIInputMap, MIDIInputAccess or an array of MIDIInput.

### smi.attach(midiInput);

Attach the instance to one or several MIDIInput.

Options :

 * midiInput : A single instance of MIDIInput, MIDIInputMap, MIDIInputAccess or an array of MIDIInput.

### smi.detach(midiInput);

Detach the instance from one or several MIDIInput.

Options :

* midiInput : A single instance of MIDIInput, MIDIInputMap, MIDIInputAccess or an array of MIDIInput.

### smi.detachAll();

Detach the instance from all MIDIInputs.

### smi.on(event, channel, handler);
### smi.on(event, handler);

Subscribe to an event.

Options :

 * event : Name of the event to listen to (ie: noteOn, noteOff, ...)
 * channel : Number of the midi channel to listen to (from 1 to 16)
 * handler : Handler function

Example:

```js
var func = function(event) {
    console.log(event);
};

smi.on('noteOn', func); // add an event on noteOn for the all channels
smi.on('noteOn', 1, func); // add an event on noteOn for the first channel
```

### smi.off(event, channel, [handler]);
### smi.off(event, [handler]);

Unsubscribe to an event.

Options :

 * event : Name of the event to listen to (ie: noteOn, noteOff, ...)
 * channel : Number of the midi channel to listen to (from 1 to 16)
 * handler : Handler function

Example :

```js
smi.off('noteOff'); // remove any events on noteOff from all channels
smi.off('noteOff', 1); // remove any events on noteOff from the first channel
smi.off('noteOff', func); // remove a specific event on noteOff from all channels
smi.off('noteOff', 1, func); // remove a specific event on noteOff from the first channel
```

### smi.trigger(event, args);

Artificially triggers one of the event.

Options :

 * event : Name of the event to listen to (ie: noteOn, noteOff, ...)
 * args : Arguments to pass to the handler function

### smi.setFilter(filter);

Set a function to filter the midi event, the function will get the event as argument and must return false to filter it out.
There can only be one filter function at a time, passing null removes the current function.

Options :

 * filter : Filtering function.

Example :

```js
smi.trigger(function(event) {
    // we don't want any of the noteOn / noteOff events for notes above E4
    if((event.event === 'noteOn' || event.event === 'noteOff') && event.key > 64) {
        return false;
    }
});
```

```js
smi.trigger(null); //remove the current function
```

### Event names with their relative values

 * noteOn (channel, key, velocity)
 * noteOff (channel, key, velocity)
 * cc(x) (channel, cc, value)
 * channelAftertouch (channel, pressure)
 * polyphonicAftertouch (channel, key, pressure)
 * pitchWheel (channel, value)
 * programChange (channel, program)
 * clock (command)
 * songPosition
 * songSelect
 * tuneRequest
 * activeSensing
 * reset
 * global (catches everything)

## History

### 1.1.1 (2015/01/25) :

 * attach() and detach() now receive a instance of MIDIInputMap or MIDIAccess.
 * Fix detach() not working correctly when used with an array.

### 1.1.0 (2014/08/10) :

 * Add experimental MIDI learn capability ([doc](https://github.com/kchapelier/SimpleMidiInput.js/blob/master/README-MIDILEARN.md)).

### 1.0.2 (2014/07/19) :

 * A single instance can now be bound to many MIDI Inputs.
 * Add attach(), detach() and detachAll() methods to change the MIDI inputs bound to the instance.
 * Add proper API reference to the readme.

### 1.0.1 (2014/04/15) :

 * Add missing channel information to pitchWheel event.
 * Make the script AMD and CommonJS compliant.
 * Add a few mocha tests on the parsing of midi message.

### 1.0.0 (2014/04/14) :

 * Add pitchWheel, songPosition, songSelect, tuneRequest and activeSensing support.
 * Publish on bower.
 * Declares the public API stable.

### 0.1.0 (~ 2014/02/23)

## Notes

 * Some controllers and MIDI apps send a [noteOn events with a velocity of 0][3] instead of noteOff events. SMI automatically translates them to noteOff events.
 * Tested with MPK Mini, HotHand USB and half a dozen iOS apps with rtpMIDI / CoreMIDI.
 * Tested on both the Jazz-plugin polyfill and the MIDI API.
 * No Sysex support yet.

  [1]: http://cwilso.github.io/WebMIDIAPIShim/
  [2]: http://www.midi.org/techspecs/midimessages.php#3
  [3]: http://www.kvraudio.com/forum/viewtopic.php?p=4167096&sid=e8775321f4b8b6e174ec49b0d06667e8#p4167096
