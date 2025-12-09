
// Simple (minimal) controller for FMOD Studio integration via Console scripting
// Usage: [js maxfmod.minim.js] in max msp and receive function call with value(s)
// the max js functions compile a javascript command to be send to FMOD, therefore the actual js being generated is in between double quotes ""
// more complex approaches are also possible, contact author for questions and suggestions
// created by Than van Nispen using https://www.fmod.com/docs/2.02/studio/scripting-api-reference-project.html 
// and with help from Anthropic Claude Sonnet (LLM AI use CO2 compensated via Treesforall...)


/* *** thoughts and comments : ***
we now use mainly findEvent() 
but studio.project.lookup(path); might be a nicer option? 
var path = "event:/Ambience/Forest/Trees";
var event = studio.project.lookup(path);
or
var event = studio.project.lookup("event:/");
event.items[0].name
etc.
*/


autowatch = 1;

// Outlets: 0=formatted commands out to sadam.tcpClient, 1=parsed responses, 2=errors, 3= TODO parameter names and min-maxes? 
outlets = 3;

// Global state
var currentBank = "";
var currentEvent = "";
var eventCache = {};
var parameterCache = {};
var busCache = {};

// ============================================
// EVENT MANAGEMENT
// ============================================

function selectEvent(eventPath) {
    var cmd = "function findEvent(folder, name) { " +
              "if (folder.items) { " +
              "for (var i = 0; i < folder.items.length; i++) { " +
              "var item = folder.items[i]; " +
              "if (item.entity === 'Event' && (item.name === name || item.name.indexOf(name) !== -1)) { " +
              "return item; " +
              "} else if (item.entity === 'EventFolder') { " +
              "var found = findEvent(item, name); " +
              "if (found) return found; " +
              "} " +
              "} " +
              "} " +
              "return null; " +
              "} " +
              "var evt = findEvent(studio.project.workspace.masterEventFolder, '" + eventPath + "'); " +
              "if (evt) { " +
              "studio.window.navigateTo(evt); " +
              "output = 'EVENT_SELECTED:' + evt.name; " +
              "} else { output = 'ERROR:Event not found'; }";
    sendCommand(cmd);
    currentEvent = eventPath;
}

// works and tested NB windows need to be open for event to play !
function triggerEvent(eventPath) {
    var cmd = "function findEvent(folder, name) { " +
               "if (folder.items) { " +
                "for (var i = 0; i < folder.items.length; i++) { " +
                 "var item = folder.items[i]; " +
                 "if (item.entity === 'Event' && (item.name === name || item.name.indexOf(name) !== -1)) { " +
                  "return item; " +
                 "} else if (item.entity === 'EventFolder') { " +
                 "var found = findEvent(item, name); " +
                 "if (found) return found; " +
                 "} " +
                "} " +
               "} " +
               "return null; " +
              "} " +
              "var evt = findEvent(studio.project.workspace.masterEventFolder, '" + eventPath + "'); " +
              "if (evt) { " +
               //"studio.window.navigateTo(evt); " +
               "studio.window.browserSelection = [evt]; " +
               "evt.play(); " +
               "output = 'EVENT_TRIGGERED:' + evt.name; " +
               "} else { output = 'ERROR:Event not found'; }";
    sendCommand(cmd);
}


// tested and works ; 
// Stop a specific event
function stopEvent(eventPath) {
    var cmd = "function findEvent(folder, name) { " +
              "if (folder.items) { " +
              "for (var i = 0; i < folder.items.length; i++) { " +
              "var item = folder.items[i]; " +
              "if (item.entity === 'Event' && (item.name === name || item.name.indexOf(name) !== -1)) { " +
              "return item; " +
              "} else if (item.entity === 'EventFolder') { " +
              "var found = findEvent(item, name); " +
              "if (found) return found; " +
              "} " +
              "} " +
              "} " +
              "return null; " +
              "} " +
              "var evt = findEvent(studio.project.workspace.masterEventFolder, '" + eventPath + "'); " +
              "if (evt) { " +
              "evt.stopNonImmediate(); " +
              "output = 'EVENT_STOPPED:' + evt.name; " +
              "} else { output = 'ERROR:Event not found'; }";
    sendCommand(cmd);
}


// tested and works ; 
// Two options work with event type project.lookup("event:/") and project.workspace.masterEventFolder

function listEvents() {
    var cmd = "function findEvents(folder, results) { " +
               "if (folder.items) { " +
                "folder.items.forEach(function(item) { " +
                  "if (item.entity === 'Event') { " +
                  "results.push(item.name); " +

                  "} else if (item.entity === 'EventFolder') { " + // it's a folder, check for events in folder
                  "findEvents(item, results); " +
                  // "results.push(item.name); " + // actually work out Event Folder names ?
                 "} " +
                "}); " +
               "} " +
              "} " +
              "var events = []; " +

              "findEvents(studio.project.lookup('event:/'), events); " + // actually makes entity check not important 
//              "findEvents(studio.project.workspace.masterEventFolder, events); " + // alternative lookup

              "output = 'EVENTS:' + events.join(' | '); ";
    sendCommand(cmd);
}
 

// ============================================
// PARAMETER INFO and CONTROL
// ============================================


// checked and works 
// TODO get cursorposition p.preset.presetOwner.parameter.getCursorPosition()
function listParams() {
    var cmd = "var e = studio.window.browserCurrent(); " +
              "if (e && e.parameters) { " +
              "var params = []; " +
              "for (var i = 0; i < e.parameters.length; i++) { " +
                "var p = e.parameters[i]; " +
                "params.push('index ' + i + ':' + p.preset.presetOwner.name + ':' + p.getCursorPosition() + ' min-max : ' + p.preset.minimum + '-' + p.preset.maximum);} " +
              "output = 'PARAMS:' + params.join(' | '); " + 
              "} else { output = 'ERROR:No current event'; }"
    sendCommand(cmd);
}


// checked and works 
// Set parameter on a specific event by event name and parameter name
function setParamForEventByName(eventPath, paramName, value) {
    var cmd = "function findEvent(folder, name) { " +
              	"if (folder.items) { " +
              		"for (var i = 0; i < folder.items.length; i++) { " +
              			"var item = folder.items[i]; " +
              			"if (item.entity === 'Event' && (item.name === name || item.name.indexOf(name) !== -1)) { " +
              				"return item; " +
              			"} else if (item.entity === 'EventFolder') { " +
              				"var found = findEvent(item, name); " +
              				"if (found) return found; " +
              "} } } return null; } " +
              "var evt = findEvent(studio.project.workspace.masterEventFolder, '" + eventPath + "'); " +
              "if (evt && evt.parameters) { " +
              	"var found = false; " +
              	"for (var i = 0; i < evt.parameters.length; i++) { " +
              		"if (evt.parameters[i].preset.presetOwner.name === '" + paramName + "') { " +
              			"evt.parameters[i].setCursorPosition(" + value + "); " +
              			"output = 'PARAM_SET:' + i + ':' + " + value + " + ':' + evt.parameters[i].preset.presetOwner.name + ':' + evt.name; " +
              			"found = true; break; " +
              	"} } " +
              "if (!found) { output = 'ERROR:Parameter not found'; } " +
              "} else { output = 'ERROR:Event not found'; }";
    sendCommand(cmd);
}


// checked and works 
// List parameters for a specific event
function listParamsForEvent(eventPath) {
    var cmd = "function findEvent(folder, name) { " +
              "if (folder.items) { " +
              "for (var i = 0; i < folder.items.length; i++) { " +
              "var item = folder.items[i]; " +
              "if (item.entity === 'Event' && (item.name === name || item.name.indexOf(name) !== -1)) { " +
              "return item; " +
              "} else if (item.entity === 'EventFolder') { " +
              "var found = findEvent(item, name); " +
              "if (found) return found; " +
              "} } } return null; } " +
              "var evt = findEvent(studio.project.workspace.masterEventFolder, '" + eventPath + "'); " +
              "if (evt && evt.parameters) { " +
              "var params = []; " +
              "for (var i = 0; i < evt.parameters.length; i++) { " +
              "var p = evt.parameters[i]; " +
              "params.push(i + ':' + p.preset.presetOwner.name + ':' + p.preset.value + ':' + p.preset.minimum + ':' + p.preset.maximum); " +
              "} " +
              "output = 'PARAMS for event ' + evt.name + ' : |' + params.join('|'); " +
              "} else { output = 'ERROR:Event not found'; }";
    sendCommand(cmd);
}

// Get specific parameter value from an event
// checked and works : TODO format better 
function getParamForEvent(eventPath, paramIndex) {
    var cmd = "function findEvent(folder, name) { " +
              "if (folder.items) { " +
              "for (var i = 0; i < folder.items.length; i++) { " +
              "var item = folder.items[i]; " +
              "if (item.entity === 'Event' && (item.name === name || item.name.indexOf(name) !== -1)) { " +
              "return item; " +
              "} else if (item.entity === 'EventFolder') { " +
              "var found = findEvent(item, name); " +
              "if (found) return found; " +
              "} } } return null; } " +
              "var evt = findEvent(studio.project.workspace.masterEventFolder, '" + eventPath + "'); " +
              "if (evt && evt.parameters && evt.parameters[" + paramIndex + "]) { " +
              "var p = evt.parameters[" + paramIndex + "]; " +
              "output = 'PARAM_VALUE:" + paramIndex + ":' + p.preset.presetOwner.name + ':' +  p.getCursorPosition() + ':' + evt.name; " +
              "} else { output = 'ERROR:Event or parameter not found'; }";
    sendCommand(cmd);
}

// Get param info by param index
// checked and works 
function getParam(paramIndex) {
    var cmd = "var e = studio.window.browserCurrent(); " +
              "if (e && e.parameters && e.parameters[" + paramIndex + "]) { " +
              "var p = e.parameters[" + paramIndex + "]; " +
              "output = 'PARAM_VALUE:" + paramIndex + ":' + p.preset.presetOwner.name + ':' + p.getCursorPosition() ; " +
              "} else { output = 'ERROR:Parameter not found'; }";
    sendCommand(cmd);
}



// only on front FMOD window
// checked and works 

function setParam(paramIndex, value) {
    var cmd = "var e = studio.window.browserCurrent(); " +
              "if (e && e.parameters && e.parameters[" + paramIndex + "]) { " +
              "e.parameters[" + paramIndex + "].setCursorPosition(" + value + "); " +
              "output = 'PARAM_SET:" + paramIndex + ":" + value + ":' + e.parameters[" + paramIndex + "].name; " +
              "} else { output = 'ERROR:Parameter index out of range'; }";
    sendCommand(cmd);
}


// checked and works 
function setParamByName(paramName, value) {
    var cmd = "var e = studio.window.browserCurrent(); " +
              "if (e && e.parameters) { " +
               "var found = false; " +
               "for (var i = 0; i < e.parameters.length; i++) { " +
                "if (e.parameters[i].preset.presetOwner.name === '" + paramName + "') { " +
                 "e.parameters[i].setCursorPosition(" + value + "); " +
                 "found = true;" +
                 "output = 'PARAM_SET : ' + e.parameters[i].preset.presetOwner.name + ' index : ' + i + ' to value : ' + '" + value + " : '; " +
               "} } " +
               "if (!found) { output = 'ERROR:Parameter not found'; } " +
              "} else { output = 'ERROR:No current event'; }";
    sendCommand(cmd);
}


// ============================================
// TIMELINE CONTROL
// ============================================


// TODO 
function setTimeline(position) {
    var cmd = "var e = studio.window.browserCurrent(); " +
              "if (e && e.timeline) { " +
              "e.timeline.setCursorPosition(" + position + "); " +
              "output = 'TIMELINE_SET:" + position + "'; " +
              "} else { output = 'ERROR:No timeline available'; }";
    sendCommand(cmd);
}


// checked and works 
function playTimeline() {
    var cmd = "var e = studio.window.browserCurrent(); " +
              "if (e && e.timeline) { " +
              "e.play(); " +
              "output = 'TIMELINE_PLAYING'; " +
              "} else { output = 'ERROR:No timeline available'; }";
    sendCommand(cmd);
}

// checked and works 
function stopTimeline() {
    var cmd = "studio.window.browserCurrent().stopNonImmediate(); " +
              "output = 'TIMELINE_STOPPED'; ";
    sendCommand(cmd);
}

// ============================================
// MIXER CONTROL
// ============================================

// checked and works 
function setMasterVolume(volume) {
    var cmd = "var masterBus = studio.project.workspace.mixer.masterBus;" +
              "if (masterBus ) { " +
              "masterBus.volume = " + volume + "; " +
              "output = 'MASTER_VOLUME: " + volume + "'; " +
              "} else { output = 'ERROR:Bus not found'; }";
    sendCommand(cmd);
}


// ============================================
// UTILITY FUNCTIONS
// ============================================


// checked and works 
function getCurrentEvent() {
    var cmd = "var e = studio.window.browserCurrent(); " +
              "if (e) { " +
              "output = 'CURRENT_EVENT: ' + e.name + ' has these parameters :' + e.parameters.length ; " +
              "} else { output = 'ERROR:No event selected'; }";
    sendCommand(cmd);
}

function executeCustom(jsCode) {
    // Allow custom JavaScript execution for advanced users
    var cmd = jsCode + "; output = 'CUSTOM_EXECUTED';";
    sendCommand(cmd);
}

// ============================================
// CORE COMMUNICATION
// ============================================

// checked and works 
function sendCommand(cmd) {
    // Format command for FMOD Studio console (replace newline characters with space; replace One or more consecutive whitespace with single one 
	// The FMOD Studio console (via TCP) can be sensitive to formatting, especially: Multi-line commands might not execute properly; Extra whitespace can cause parsing issues; Keeps the TCP packet cleaner and smaller
    var formatted = cmd.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    outlet(0, formatted);
}


// ============================================
// MAX INTEGRATION
// ============================================

function bang() {
    getCurrentEvent();
}

function anything() {
    var args = arrayfromargs(arguments);
    var method = messagename;
    
    // Dynamic method routing
    if (this[method]) {
        this[method].apply(this, args);
    } else {
        post("Unknown command: " + method + "\n"); // invalid commands 
        outlet(2, "Unknown command: " + method); // invalid commands 
    }
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
    post("maxfmod.control initialized\n");
    post("Connect outlet 0 to sadam.tcpClient\n");
    post("Connect sadam.tcpClient output to inlet for responses\n");
}

init();