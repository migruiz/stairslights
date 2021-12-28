const { Observable,merge,timer, interval } = require('rxjs');
const { mergeMap, map,share,filter,mapTo,take,debounceTime,throttle,throttleTime, startWith, takeWhile, delay, scan, distinct,distinctUntilChanged, tap, flatMap, takeUntil} = require('rxjs/operators');
var mqtt = require('./mqttCluster.js');

//global.mtqqLocalPath = process.env.MQTTLOCAL;
global.mtqqLocalPath = 'mqtt://192.168.0.11';


const GROUND_FLOOR_SENSOR_TOPIC = process.env.GROUND_FLOOR_SENSOR_TOPIC
const FIRST_FLOOR_SENSOR_TOPIC = process.env.FIRST_FLOOR_SENSOR_TOPIC
const SECOND_FLOOR_SENSOR_TOPIC = process.env.SECOND_FLOOR_SENSOR_TOPIC

const KEEPLIGHTONFORSECS = process.env.KEEPLIGHTONFORSECS * 1000
const STARTFULLBRIGHTNESSATHOURS = process.env.STARTFULLBRIGHTNESSATHOURS
const ENDFULLBRIGHTNESSATHOURS = process.env.ENDFULLBRIGHTNESSATHOURS

const NIGHTBRIGHTNESS = process.env.NIGHTBRIGHTNESS
const DAYBRIGHTNESS = process.env.DAYBRIGHTNESS



console.log(`starting stairs lights current time ${new Date()}`)


 const rotationCoreSensor = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData('zigbee2mqtt/0x0c4314fffeb064fb', function(content){    
            subscriber.next({content})
    });
});

const sharedRotatiobStream = rotationCoreSensor.pipe(share())
const rotationSensorStream = sharedRotatiobStream.pipe(
    filter( m => m.content.action==='rotate_right' ||  m.content.action==='rotate_left' || m.content.action==='rotate_stop'),
    map( m => ({action: m.content.action})),
    distinctUntilChanged((prev, curr) => prev.action === curr.action),
    share()
)

const onRotationStream = rotationSensorStream.pipe(
    filter( m => m.action==='rotate_right' ||  m.action==='rotate_left')
)
const onStopStream = rotationSensorStream.pipe(
    filter( m => m.action==='rotate_stop')
)

const intervalStream = onRotationStream.pipe(
    flatMap( m => interval(30).pipe(

        startWith(1),
        takeUntil(onStopStream),
        mapTo(m)
        )),
        scan((acc, curr) => {
            if (curr.action==='rotate_right') return { value: acc.value + 10 } 
            else if (curr.action==='rotate_left') return {value: acc.value - 10 }
            
        }, {value:0}),
        map(m=> {
            if (m.value<1) return {value:1}
            if (m.value>1000) return {value:1000}
            return m
        }),
        distinctUntilChanged((prev, curr) => prev.value === curr.value)
)

intervalStream.subscribe(async val => {
    //console.log(val);
    (await mqtt.getClusterAsync()).publishMessage('stairs/down/light',`${val.value}`);
 });



const groundfloorSensorStream = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData(GROUND_FLOOR_SENSOR_TOPIC, function(content){        
            subscriber.next({content})
    });
});
const firstFloorSensorStream = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData(FIRST_FLOOR_SENSOR_TOPIC, function(content){        
            subscriber.next({content})
    });
});
const secondfloorSensorStream = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData(SECOND_FLOOR_SENSOR_TOPIC, function(content){        
            subscriber.next({content})
    });
});


const downstairsLightsStream = merge(groundfloorSensorStream,firstFloorSensorStream).pipe(share())

const downstairsLightsOffStream = downstairsLightsStream.pipe(
    debounceTime(KEEPLIGHTONFORSECS),
    mapTo("0"),
    share()
    )
const downstairsLightsOnStream = downstairsLightsStream.pipe(
    throttle(_ => downstairsLightsOffStream),
    map(_ => (new Date().getHours() > STARTFULLBRIGHTNESSATHOURS && new Date().getHours() < ENDFULLBRIGHTNESSATHOURS)? DAYBRIGHTNESS : NIGHTBRIGHTNESS )
)

merge(downstairsLightsOnStream,downstairsLightsOffStream)
.subscribe(async m => {
    console.log('Downstairs', m);
    (await mqtt.getClusterAsync()).publishMessage('stairs/down/light',m)
})



const upstairsLightsStream = merge(secondfloorSensorStream,firstFloorSensorStream).pipe(share())

const upstairsLightsOffStream = upstairsLightsStream.pipe(
    debounceTime(KEEPLIGHTONFORSECS),
    mapTo("0"),
    share()
    )
const upstairsLightsOnStream = upstairsLightsStream.pipe(
    throttle(_ => upstairsLightsOffStream),
    map(_ => (new Date().getHours() > STARTFULLBRIGHTNESSATHOURS && new Date().getHours() < ENDFULLBRIGHTNESSATHOURS)? DAYBRIGHTNESS : NIGHTBRIGHTNESS )
)

merge(upstairsLightsOnStream,upstairsLightsOffStream)
.subscribe(async m => {
    console.log('Upstairs', m);
    (await mqtt.getClusterAsync()).publishMessage('stairs/up/light',m)
})


