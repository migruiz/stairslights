const { Observable,merge,timer, interval } = require('rxjs');
const { mergeMap, withLatestFrom, map,share,shareReplay, filter,mapTo,take,debounceTime,throttle,throttleTime, startWith, takeWhile, delay, scan, distinct,distinctUntilChanged, tap, flatMap, takeUntil, toArray} = require('rxjs/operators');
var mqtt = require('./mqttCluster.js');

//global.mtqqLocalPath = process.env.MQTTLOCAL;
global.mtqqLocalPath = 'mqtt://192.168.0.11';


const GROUND_FLOOR_SENSOR_TOPIC = 'rflink/EV1527-03e899'
const FIRST_FLOOR_SENSOR_TOPIC = 'rflink/EV1527-0a080d'
const SECOND_FLOOR_SENSOR_TOPIC = 'rflink/EV1527-0c2ed4'

const KEEPLIGHTONFORSECS = 18 * 1000
const STARTFULLBRIGHTNESSATHOURS = 7
const ENDFULLBRIGHTNESSATHOURS = 20

const NIGHTBRIGHTNESS = 3
const DAYBRIGHTNESS = 10



console.log(`starting stairs lights current time ${new Date()}`)

const rawGroundFloorRotationSensor = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData('zigbee2mqtt/0x0c4314fffef7f65a', function(content){    
            subscriber.next({content})
    });
});

const rawSecondFloorRotationSensor = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData('zigbee2mqtt/0x0c4314fffeb064fb', function(content){    
            subscriber.next({content})
    });
});

const rotationCoreSensor = merge(rawGroundFloorRotationSensor,rawSecondFloorRotationSensor).pipe(
    filter( m => m.content.action)
)

const sharedRotatiobStream = rotationCoreSensor.pipe(share())

const onOffStream = sharedRotatiobStream.pipe(
    filter( m => m.content.action==='play_pause'),
    scan((acc,curr)=> !acc,true),
    map(m =>  m ? {action:'switch_on'} : {action:'switch_off'})
)

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
const leftRightStream = onRotationStream.pipe(
    flatMap( m => interval(30).pipe(

        startWith(1),
        takeUntil(onStopStream),
        mapTo(m)
    )));

const getDefaultBrihtness = () => (new Date().getHours() > STARTFULLBRIGHTNESSATHOURS && new Date().getHours() < ENDFULLBRIGHTNESSATHOURS)? DAYBRIGHTNESS : NIGHTBRIGHTNESS

const brigthnessStream = merge(onOffStream,leftRightStream).pipe(
    scan((acc, curr) => {
        if (curr.action==='switch_off') return {value:0}
        if (curr.action==='switch_on') return {value: getDefaultBrihtness()}
        if (curr.action==='rotate_right') return { value: acc.value + 1 > 1000 ? 1000 : acc.value + 1 } 
        if (curr.action==='rotate_left') return {value: acc.value - 1 < 1 ? 1 : acc.value - 1 }
        
    }, {value:0}),
    startWith({value:getDefaultBrihtness()}),
    shareReplay(1)
)

brigthnessStream.subscribe(async val => {
   (await mqtt.getClusterAsync()).publishMessage('stairs/down/light',`${val.value}`);
   (await mqtt.getClusterAsync()).publishMessage('stairs/up/light',`${val.value}`);
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
    withLatestFrom(brigthnessStream),
    map(([_, brightness]) =>  brightness.value),
    map(m => `${m}`)
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
    withLatestFrom(brigthnessStream),
    map(([_, brightness]) =>  brightness.value),
    map(m => `${m}`)
)

merge(upstairsLightsOnStream,upstairsLightsOffStream)
.subscribe(async m => {
    console.log('Upstairs', m);
    (await mqtt.getClusterAsync()).publishMessage('stairs/up/light',m)
})


