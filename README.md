# Max-MSP-FMOD
 A simple Max-MSP-FMOD console communication tool for rapid prototyping using Cycling 74 Max MSP and FMOD
 
 Description in the max patch called : MAX-FMOD-TCP-minimal.maxpat

 Dependencies : a TCP connection in Max MSP, for instance the sadam external https://www.sadam.hu/hu/node/1 

Tested and developed with FMOD 2.02.x

Works best with a single front FMOD Event editor Window open and controlling one single event / timeline. However multiple events can be controlled too, especially when the events all have an event editor window open. 


---

Some functions :

## Reference Card

| Action | Command | Example |
|--------|---------|---------|
| Select event and brings it to the front | `selectEvent <path>` | `selectEvent Forest` |
| Trigger event when event is open in a Fmod window | `triggerEvent <path>` | `triggerEvent "Level 01"` |
| Set param by index on frontmost FMOD Event editor window | `setParam <idx> <val>` | `setParam 0 0.75` |
| Set param by name | `setParamByName <name> <val>` | `setParamByName Intensity 0.5` |
| Play timeline | `playTimeline` | `playTimeline` |
| Stop all | `stopTimeline` | `stopTimeline` |
| List all events | `listEvents` | `listEvents` |
| List parameters of front FMOD Event editor Window | `listParams` | `listParams` |
| Get current event | `bang` or `getCurrentEvent` | `bang` |


---

Event-Specific Approach
* Control multiple events simultaneously
* No dependency on which window is active
* Works across multiple FMOD windows (which need to be open) 

examples: 
setParamForEvent "Forest" 0 0.75
setParamForEventByName "Music Combat" "Intensity" 0.8
listParamsForEvent "Door Close"
getParamForEvent "SFX Wind" 2 
