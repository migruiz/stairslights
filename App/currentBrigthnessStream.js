const { Observable,merge,timer, interval, of } = require('rxjs');
const { mergeMap, first, withLatestFrom, map,share,shareReplay, filter,mapTo,take,debounceTime,throttle,throttleTime, startWith, takeWhile, delay, scan, distinct,distinctUntilChanged, tap, flatMap, takeUntil, toArray, groupBy, concatMap} = require('rxjs/operators');


const { getRotationDeviceStream } = require('./rotationDevice/rotationDevice');
const { dayTimeStream, getDefaultBrightness }= require('./dayTimeStream')

const downstairsRotationDeviceStream = getRotationDeviceStream('zigbee2mqtt/0x0c4314fffeb064fb')
const upstairsRotationDeviceStream = getRotationDeviceStream('zigbee2mqtt/0x0c4314fffef7f65a')


const increase = (acc)=>{
    if (acc < 20){
        return  acc + 1;
    }
    else {
        return acc + 40 > 1000 ? 1000 : acc + 40;
    }
}
const decrease = (acc)=>{
    if (acc < 20){
        return acc - 1 < 1 ? 1 : acc - 1 ;
    }
    else {
        return acc - 40 < 20 ? 20 - 1 : acc - 40;
    }
}




const currenttBrigthnessStream = merge(downstairsRotationDeviceStream,upstairsRotationDeviceStream,dayTimeStream).pipe(
    scan((acc, curr) => {
        if (curr.action==='date_time') return {triggeredBy:'timeOfDay', value:curr.value}
        if (curr.action==='play_pause') return {triggeredBy:'rotationDevice', value:(acc.value==0 ? getDefaultBrightness() : 0)}
        if (curr.action==='rotate_right') return {triggeredBy:'rotationDevice', value: increase(acc.value) }
        if (curr.action==='rotate_left') return {triggeredBy:'rotationDevice', value: decrease(acc.value) }
        
    }, {triggeredBy:'init', value:0}),
    share()
)
const lastEmissionBrightnessStream = currenttBrigthnessStream.pipe(shareReplay(1))

module.exports.currenttBrigthnessStream =  currenttBrigthnessStream
module.exports.lastEmissionBrightnessStream =  lastEmissionBrightnessStream