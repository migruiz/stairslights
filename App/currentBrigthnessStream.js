const { Observable,merge,timer, interval, of } = require('rxjs');
const { mergeMap, first, withLatestFrom, map,share,shareReplay, filter,mapTo,take,debounceTime,throttle,throttleTime, startWith, takeWhile, delay, scan, distinct,distinctUntilChanged, tap, flatMap, takeUntil, toArray, groupBy, concatMap} = require('rxjs/operators');


const { getRawRotationDeviceStream } = require('./rotationDevice/rotationDevice');
const { getRawTuyaRotationDeviceStream } = require('./rotationDevice/tuyaRotationDevice');
const { dayTimeStream, getDefaultBrightness }= require('./dayTimeStream')

const downstairsRotationDeviceStream = getRawRotationDeviceStream('zigbee2mqtt/0x0c4314fffeb064fb')
const upstairsRotationDeviceStream = getRawRotationDeviceStream('zigbee2mqtt/0x0c4314fffef7f65a')
const downstairsTuyaRotationDeviceStream = getRawTuyaRotationDeviceStream('zigbee2mqtt/0xa4c138712f6a2d0b')


const increase = (acc)=>{
    if (acc < 10){
        return  acc + 4;
    }
    else {
        return acc + 200 > 1000 ? 1000 : acc + 200;
    }
}
const decrease = (acc)=>{
    if (acc < 10){
        return acc - 4 < 1 ? 1 : acc - 4;
    }
    else {
        return acc - 200 < 10 ? 1 : acc - 200;
    }
}




const currentBrigthnessStream = merge(downstairsRotationDeviceStream,upstairsRotationDeviceStream,dayTimeStream,downstairsTuyaRotationDeviceStream, of({action:'init'}).pipe(delay(2000))).pipe(
    scan((acc, curr) => {
        if (curr.action==='date_time') return {triggeredBy:'timeOfDay', value:curr.value}
        if (curr.action==='toggle') return {triggeredBy:'rotationDevice', value:(acc.value==0 ? getDefaultBrightness() : 0)}
        if (curr.action==='single') return {triggeredBy:'rotationDevice', value:(acc.value==0 ? getDefaultBrightness() : 0)}
        if (curr.action==='brightness_move_up' && curr.type==='ikea') return {triggeredBy:'rotationDevice', value: increase(acc.value) }
        if (curr.action==='brightness_move_down' && curr.type==='ikea') return {triggeredBy:'rotationDevice', value: decrease(acc.value) }
        if (curr.action==='rotate_right' && curr.type==='tuya') return {triggeredBy:'rotationDevice', value: increase(acc.value) }
        if (curr.action==='rotate_left' && curr.type==='tuya') return {triggeredBy:'rotationDevice', value: decrease(acc.value) }
        if (curr.action==='init') return {triggeredBy:'init', value: 100 }
        
    }, {triggeredBy:'init', value:50}),    
    share()
)
const lastEmissionBrightnessStream = currentBrigthnessStream.pipe(shareReplay(1))

module.exports.currentBrigthnessStream =  currentBrigthnessStream
module.exports.lastEmissionBrightnessStream =  lastEmissionBrightnessStream