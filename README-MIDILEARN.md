# SimpleMidiInput.js - MIDI Learn documentation

MIDI Learn is a simple system used by many DAW and plugins to simplify the use of MIDI controllers.
For web apps, the main advantage is that the MIDI binding doesn't have to be hardcoded.
The users can effectively bind the parameters to the events of their choice.

Exemple in Pro Tools : https://www.youtube.com/watch?v=fExGqNi4j5o

SimpleMidiInput supports classic CC bindings as well as per-note velocity bindings
(with support for aftertouch if the controller supports this feature).

# Api reference

### smi.getMidiLearning(options)

Returns an instance of MidiLearning.

Must be called once per parameter so we have different instances for each of them.

Options :

 * id : A unique id for the parameter, can be any arbitrary string or number
 * min : The minimum value of the parameter (will default to 0)
 * max : The maximum value of the parameter (mandatory)
 * value : The current value of the parameter
 * events : An object containing the different events bound to the parameter

Events :

 * listen : Occurs when the parameter starts listening for a MIDI event to be bound to.
 * cancel : Occurs when the parameter stops listening for a MIDI event to be bound to.
 * bind : Occurs when the parameter is bound to a MIDI event.
 * unbind : Occurs when the parameter is unbound.
 * change : Occurs when the parameter is modified through the bound midi events. Receive the id and the value as arguments.

### midiLearning.startListening()

Start listening for MIDI events to bind the parameter to.

### midiLearning.stopListening()

Stop listening for MIDI events to bind the parameter to.

### midiLearning.unbind();

Remove all the bindings of the parameter.

# Exemple :

```html
<input type="range" min="0" max="100" value="20" id="my-parameter" />
<a id="my-parameter-learn">learn</a>
<a id="my-parameter-clear">clear</a>
```

```js
// standard instanciation of SimpleMidiInput
var smi = new SimpleMidiInput();

// get the DOM elements
var input = document.getElementById('my-parameter');
var learnButton = document.getElementById('my-parameter-learn');
var clearButton = document.getElementById('my-parameter-clear');

// custom function to handle the changes of value
var change = function(value) {
    console.log('parameter change:', value);
};

/** HERE STARTS THE ACTUAL CODE RELATED TO MIDI LEARN **/

// we can set up the midi learning before smi is actually attached to a MIDIInput
var midiLearning = smi.getMidiLearning({
    id : input.id,
    min : input.min,
    max : input.max,
    value : input.value,
    events : {
        bind : function() {
            console.log('bind', arguments);
        },
        unbind : function() {
            console.log('unbind', arguments);
        },
        listen : function() {
            console.log('listen', arguments);
        },
        cancel : function() {
            console.log('cancel', arguments);
        },
        change : function(id, value) {
            console.log('change', arguments);
            input.value = value;
            change(value); // apply the change to our custom function
        }
    }
});

// start listening to midi events to bind the parameter to when clicking on 'learn'
learnButton.addEventListener('click', function() {
    midiLearning.startListening();
});

// clear the midi bindings (and cancel the listener) when clicking on 'clear'
clearButton.addEventListener('click', function() {
    midiLearning.unbind();
});

/** HERE ENDS THE ACTUAL CODE RELATED TO MIDI LEARN **/

// make so direct changes to the input also affects the parameters
input.addEventListener('change', function() {
    change(input.value); // apply the change to our custom function
});

// attaching SMI to the MIDI inputs
var onMIDIStarted = function(midi) {
    console.log('onMIDIStarted', midi.inputs());
    smi.attach(midi.inputs());
};

var onMIDISystemError = function() {
    console.log('onMIDISystemError', arguments);
};

navigator.requestMIDIAccess().then( onMIDIStarted, onMIDISystemError );
```