const { Observable,merge,timer, interval, of } = require('rxjs');
const { mergeMap, first, withLatestFrom, map,share,shareReplay, filter,mapTo,take,debounceTime,throttle,throttleTime, startWith, takeWhile, delay, scan, distinct,distinctUntilChanged, tap, flatMap, takeUntil, toArray, groupBy, concatMap} = require('rxjs/operators');

const GROUND_FLOOR_SENSOR_TOPIC = 'zigbee2mqtt/0x00158d000566c0cc'
const FIRST_FLOOR_SENSOR_TOPIC = 'zigbee2mqtt/0x00158d0005827a38'
const SECOND_FLOOR_SENSOR_TOPIC = 'zigbee2mqtt/0x00158d0007c48250'

const KEEPLIGHTONFORSECS = parseInt(62 * 1000)

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



const getStairsObservable = (sensorStreams) => {
    const sharedStreams = merge(sensorStreams).pipe(share())

    const lightsOffStream = sharedStreams.pipe(
        debounceTime(KEEPLIGHTONFORSECS),
        mapTo({type:'movement_off'}),
        )
    const lightsOnStream = sharedStreams.pipe(
        mapTo({type:'movement_on'}),
    )
    return merge(lightsOnStream, lightsOffStream)
}
const getStreamWithValue = ({lastEmissionBrightnessStream, stairsStream}) =>{
    stairsStream.pipe(
        withLatestFrom(lastEmissionBrightnessStream),
        map(([movement, brightness]) =>  ({type:movement.type, value: movement.type==='movement_on' ? brightness.value : 0})),
    )
}

const downstairsStream = getStairsObservable(merge(groundfloorSensorStream, firstFloorSensorStream))
const upstairsStream = getStairsObservable(merge(secondfloorSensorStream, firstFloorSensorStream))


module.exports.getDownstairsStream = function({lastEmissionBrightnessStream}){
    return getStreamWithValue({lastEmissionBrightnessStream,stairsStream:downstairsStream})
}
module.exports.getUpstairsStream = function({lastEmissionBrightnessStream}){
    return getStreamWithValue({lastEmissionBrightnessStream,stairsStream:upstairsStream})
}

