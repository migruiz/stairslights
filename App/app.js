const { Observable,merge,timer } = require('rxjs');
const { mergeMap, map,share,filter,mapTo,take,debounceTime,throttle,throttleTime} = require('rxjs/operators');
var mqtt = require('./mqttCluster.js');

global.mtqqLocalPath = process.env.MQTTLOCAL;
//global.mtqqLocalPath = 'mqtt://piscos.tk';


const KEEPLIGHTONFORSECS = 30 * 1000
//const STARTINGFROMHOURS = 8
//const ENDINGATHOURS = 17
const STARTINGFROMHOURS = process.env.STARTINGFROMHOURS
const ENDINGATHOURS = process.env.ENDINGATHOURS




console.log(`starting entrance lights current time ${new Date()}`)
const movementSensorsReadingStream = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData('EV1527', function(content){
        if ((content.ID==='001c4e' && content.SWITCH==='03') || content.ID==='0ce052'){
            console.log(content.ID);
            subscriber.next({data:'16340250'})
        }
    });
});

const sharedSensorStream = movementSensorsReadingStream.pipe(
    filter(_ => new Date().getHours() < STARTINGFROMHOURS || new Date().getHours() >= ENDINGATHOURS),
    share()
    )
const turnOffStream = sharedSensorStream.pipe(
    debounceTime(KEEPLIGHTONFORSECS),
    mapTo("off"),
    share()
    )

const turnOnStream = sharedSensorStream.pipe(
    throttle(_ => turnOffStream),
    mapTo("on")
)

merge(turnOnStream,turnOffStream)
.subscribe(async m => {
    (await mqtt.getClusterAsync()).publishMessage('esp/front/door/light',m)
})


