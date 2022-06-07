const { Observable,merge,timer, interval, of } = require('rxjs');
const { mergeMap, first, withLatestFrom, map,share,shareReplay, filter,mapTo,take,debounceTime,throttle,throttleTime, startWith, takeWhile, delay, scan, distinct,distinctUntilChanged, tap, flatMap, takeUntil, toArray, groupBy, concatMap} = require('rxjs/operators');
var mqtt = require('./mqttCluster.js');
const CronJob = require('cron').CronJob;
const { getRotationDeviceStream } = require('./rotationDevice/rotationDevice');
const {} = require('./rotationDevice/rotationDevice')

global.mtqqLocalPath = 'mqtt://192.168.0.11'
const GROUND_FLOOR_SENSOR_TOPIC = 'zigbee2mqtt/0x00158d000566c0cc'
const FIRST_FLOOR_SENSOR_TOPIC = 'zigbee2mqtt/0x00158d0005827a38'
const SECOND_FLOOR_SENSOR_TOPIC = 'zigbee2mqtt/0x00158d0007c48250'

const KEEPLIGHTONFORSECS = parseInt(62 * 1000)
const STARTFULLBRIGHTNESSATHOURS = parseInt(7)
const ENDFULLBRIGHTNESSATHOURS = parseInt(20)

const NIGHTBRIGHTNESS = parseInt(1)
const DAYBRIGHTNESS = parseInt(6)


/*
global.mtqqLocalPath = process.env.MQTTLOCAL;
const GROUND_FLOOR_SENSOR_TOPIC = process.env.GROUND_FLOOR_SENSOR_TOPIC
const FIRST_FLOOR_SENSOR_TOPIC = process.env.FIRST_FLOOR_SENSOR_TOPIC
const SECOND_FLOOR_SENSOR_TOPIC = process.env.SECOND_FLOOR_SENSOR_TOPIC

const KEEPLIGHTONFORSECS = parseInt(process.env.KEEPLIGHTONFORSECS * 1000)
const STARTFULLBRIGHTNESSATHOURS = parseInt(process.env.STARTFULLBRIGHTNESSATHOURS)
const ENDFULLBRIGHTNESSATHOURS = parseInt(process.env.ENDFULLBRIGHTNESSATHOURS)

const NIGHTBRIGHTNESS = parseInt(process.env.NIGHTBRIGHTNESS)
const DAYBRIGHTNESS = parseInt(process.env.DAYBRIGHTNESS)
*/

const nightNotificationStream =  new Observable(subscriber => {      
    new CronJob(
        `0 ${ENDFULLBRIGHTNESSATHOURS} * * *`,
       function() {
        subscriber.next({action:'night_time'});
       },
       null,
       true,
       'Europe/London'
   );
});
const dayNotificationStream =  new Observable(subscriber => {      
    new CronJob(
        `0 ${STARTFULLBRIGHTNESSATHOURS} * * *`,
       function() {
           subscriber.next({action:'day_time'});
       },
       null,
       true,
       'Europe/London'
   );
});




console.log(`starting stairs lights current time ${new Date()}`)



const groundfloorSensorStream = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData(GROUND_FLOOR_SENSOR_TOPIC, function(content){  
        if (content.occupancy){      
            subscriber.next({content})
        }
    });
});
const firstFloorSensorStream = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData(FIRST_FLOOR_SENSOR_TOPIC, function(content){        
        if (content.occupancy){      
            subscriber.next({content})
        }
    });
});
const secondfloorSensorStream = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData(SECOND_FLOOR_SENSOR_TOPIC, function(content){        
        if (content.occupancy){      
            subscriber.next({content})
        }
    });
});




const downstairsRotationDeviceStream = getRotationDeviceStream('zigbee2mqtt/0x0c4314fffeb064fb')
const upstairsRotationDeviceStream = getRotationDeviceStream('zigbee2mqtt/0x0c4314fffef7f65a')


const increase = (acc)=>{
    if (acc.value < 20){
        return { value: acc.value + 1 } 
    }
    else {
        return { value: acc.value + 40 > 1000 ? 1000 : acc.value + 40 } 
    }
}
const decrease = (acc)=>{
    if (acc.value < 20){
        return {value: acc.value - 1 < 1 ? 1 : acc.value - 1 }
    }
    else {
        return {value: acc.value - 40 < 20 ? 20 - 1 : acc.value - 40 }
    }
}


const getDefaultBrihtness = () => (new Date().getHours() > STARTFULLBRIGHTNESSATHOURS && new Date().getHours() < ENDFULLBRIGHTNESSATHOURS)? DAYBRIGHTNESS : NIGHTBRIGHTNESS

const currenttBrigthnessStream = merge(downstairsRotationDeviceStream,upstairsRotationDeviceStream,dayNotificationStream, nightNotificationStream).pipe(
    scan((acc, curr) => {
        if (curr.action==='day_time') return {value:DAYBRIGHTNESS}
        if (curr.action==='night_time') return {value:NIGHTBRIGHTNESS}
        if (curr.action==='switch_onOff') return {value:(acc.value==0 ? getDefaultBrihtness() : 0)}
        if (curr.action==='rotate_right') return increase(acc)
        if (curr.action==='rotate_left') return decrease(acc)
        
    }, {value:0})
)


currenttBrigthnessStream
.subscribe(async m => {
    console.log('Downstairs', m);
    //(await mqtt.getClusterAsync()).publishMessage('stairs/down/light',`${m.value}`)
})


/*
const getStairsObservable = (sensorStreams) => {
    const sharedStreams = merge(sensorStreams).pipe(share())

    const lightsOffStream = sharedStreams.pipe(
        debounceTime(KEEPLIGHTONFORSECS),
        mapTo({type:'movement_off'}),
        )
    const lightsOnStream = sharedStreams.pipe(
        withLatestFrom(currenttBrigthnessStream),
        map(([_, brightness]) =>  ({type:'movement_on', value: brightness.value})),
    )
    return merge(lightsOnStream, lightsOffStream)
}

const getMergedObservable = (o) => merge(o,brightnessChangeObservable)
.pipe(
    scan((acc, curr) => {
        if (curr.type==='brightness_action_on') return curr        
        if (curr.type==='movement_on') return curr;
        
        if (curr.type==='brightness_action_off') {
            if (acc.type==='brightness_action_on') return {type: curr.type, value:0}
            else return acc;
        }
        if (curr.type==='movement_off') {
            if (acc.type==='movement_on') return {type: curr.type, value:0}
            else return acc;
        }
    }, {type: null, value:0}),
    distinctUntilChanged((prev, curr) => prev.type === curr.type && prev.value === curr.value),
)


getMergedObservable(getStairsObservable(merge(groundfloorSensorStream,firstFloorSensorStream)))
.subscribe(async m => {
    //console.log('Downstairs', m);
    (await mqtt.getClusterAsync()).publishMessage('stairs/down/light',`${m.value}`)
})


getMergedObservable(getStairsObservable(merge(secondfloorSensorStream,firstFloorSensorStream)))
.subscribe(async m => {
    //console.log('Upstairs', m);
    (await mqtt.getClusterAsync()).publishMessage('stairs/up/light',`${m.value}`)
})


*/