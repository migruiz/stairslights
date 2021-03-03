const { Observable,merge,timer } = require('rxjs');
const { mergeMap, map,share,filter,mapTo,take,debounceTime,throttle,throttleTime} = require('rxjs/operators');
var mqtt = require('./mqttCluster.js');

global.mtqqLocalPath = process.env.MQTTLOCAL;
//global.mtqqLocalPath = 'mqtt://piscos.tk';


const KEEPLIGHTONFORSECS = 13 * 1000
const STARTFULLBRIGHTNESSATHOURS = process.env.STARTFULLBRIGHTNESSATHOURS
const ENDFULLBRIGHTNESSATHOURS = process.env.ENDFULLBRIGHTNESSATHOURS




console.log(`starting groundfloor lights current time ${new Date()}`)
const movementSensorsReadingStream = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData('EV1527', function(content){
        if (
                (content.ID==='0a3789' && content.SWITCH==='06') ||
                (content.ID==='03e899' && content.SWITCH==='06') ||
                (content.ID==='0b5589' && content.SWITCH==='06')
            ){
            console.log(content.ID);
            subscriber.next({sensorId:'sensor'})
        }
    });
});

const sharedSensorStream = movementSensorsReadingStream.pipe(share())
const turnOffStream = sharedSensorStream.pipe(
    debounceTime(KEEPLIGHTONFORSECS),
    mapTo("0"),
    share()
    )

const turnOnStream = sharedSensorStream.pipe(
    throttle(_ => turnOffStream),
    mapTo( (new Date().getHours() > STARTFULLBRIGHTNESSATHOURS && new Date().getHours() < ENDFULLBRIGHTNESSATHOURS)? "800" : "10" )
)

merge(turnOnStream,turnOffStream)
.subscribe(async m => {
    (await mqtt.getClusterAsync()).publishMessage('stairs/down/light',m)
})


