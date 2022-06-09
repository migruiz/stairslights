const { Observable,merge,timer, interval, of } = require('rxjs');
const { mergeMap, first, withLatestFrom, map,share,shareReplay, filter,mapTo,take,debounceTime,throttle,throttleTime, startWith, takeWhile, delay, scan, distinct,distinctUntilChanged, tap, flatMap, takeUntil, toArray, groupBy, concatMap} = require('rxjs/operators');

const { currenttBrigthnessStream } = require('./currentBrigthnessStream');

global.mtqqLocalPath = 'mqtt://192.168.0.11'
const GROUND_FLOOR_SENSOR_TOPIC = 'zigbee2mqtt/0x00158d000566c0cc'
const FIRST_FLOOR_SENSOR_TOPIC = 'zigbee2mqtt/0x00158d0005827a38'
const SECOND_FLOOR_SENSOR_TOPIC = 'zigbee2mqtt/0x00158d0007c48250'

const KEEPLIGHTONFORSECS = parseInt(62 * 1000)





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





console.log(`starting stairs lights current time ${new Date()}`)









currenttBrigthnessStream
.subscribe(async m => {
    console.log('current', m);
    //(await mqtt.getClusterAsync()).publishMessage('stairs/down/light',`${m.value}`)
})


/*


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