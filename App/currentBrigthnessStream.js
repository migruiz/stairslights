const { Observable,merge,timer, interval, of, Subject } = require('rxjs');
const { mergeMap, first, withLatestFrom, map,share,shareReplay, filter,mapTo,take,debounceTime,throttle,throttleTime, startWith, takeWhile, delay, scan, distinct,distinctUntilChanged, tap, flatMap, takeUntil, toArray, groupBy, concatMap} = require('rxjs/operators');


const { getRawRotationDeviceStream } = require('./rotationDevice/rotationDevice');
const { getRawTuyaRotationDeviceStream } = require('./rotationDevice/tuyaRotationDevice');
const { dayTimeStream, getDefaultBrightness }= require('./dayTimeStream')

const downstairsRotationDeviceStream = getRawRotationDeviceStream('zigbee2mqtt/0x0c4314fffeb064fb')
const upstairsRotationDeviceStream = getRawRotationDeviceStream('zigbee2mqtt/0x0c4314fffef7f65a')
const downstairsTuyaRotationDeviceStream = getRawTuyaRotationDeviceStream('zigbee2mqtt/0xa4c138712f6a2d0b')
// The kitchen iPad's stairs slider (app.js): a brightness from 0 (off) to 1000, which does
// what a turn of either knob does.
const screenBrightness = new Subject()
const screenStream = screenBrightness.pipe(map(value => ({action:'screen', value})))

// The most the strips are ever sent: 216, where the lights screen's slider shows 60%. Miguel
// found anything brighter too bright (25/10/2026). The knobs stop here, and anything higher
// from a screen is taken as this.
const MAX_BRIGHTNESS = 216


const increaseTuya = (acc)=>{
    if (acc < 10){
        return  acc + 4;
    }
    else {
        return acc + 200 > MAX_BRIGHTNESS ? MAX_BRIGHTNESS : acc + 200;
    }
}
const decreaseTuya = (acc)=>{
    if (acc < 10){
        return acc - 4 < 1 ? 1 : acc - 4;
    }
    else {
        return acc - 200 < 10 ? 1 : acc - 200;
    }
}



const increaseIkea = (acc)=>{
    if (acc < 20){
        return  acc + 1;
    }
    else {
        return acc + 40 > MAX_BRIGHTNESS ? MAX_BRIGHTNESS : acc + 40;
    }
}
const decreaseIkea = (acc)=>{
    if (acc < 20){
        return acc - 1 < 1 ? 1 : acc - 1 ;
    }
    else {
        return acc - 40 < 20 ? 20 - 1 : acc - 40;
    }
}






const nextBrightness = (acc, curr) => {
        if (curr.action==='screen') return {triggeredBy:'screen', value: curr.value}
        if (curr.action==='date_time') return {triggeredBy:'timeOfDay', value:curr.value}
        if (curr.action==='toggle') return {triggeredBy:'rotationDevice', value:(acc.value==0 ? getDefaultBrightness() : 0)}
        if (curr.action==='single') return {triggeredBy:'rotationDevice', value:(acc.value==0 ? getDefaultBrightness() : 0)}
        if (curr.action==='brightness_move_up' && curr.type==='ikea') return {triggeredBy:'rotationDevice', value: increaseIkea(acc.value) }
        if (curr.action==='brightness_move_down' && curr.type==='ikea') return {triggeredBy:'rotationDevice', value: decreaseIkea(acc.value) }
        if (curr.action==='rotate_right' && curr.type==='tuya') return {triggeredBy:'rotationDevice', value: increaseTuya(acc.value) }
        if (curr.action==='rotate_left' && curr.type==='tuya') return {triggeredBy:'rotationDevice', value: decreaseTuya(acc.value) }
        if (curr.action==='init') return {triggeredBy:'init', value: 100 }
}

const currentBrigthnessStream = merge(downstairsRotationDeviceStream,upstairsRotationDeviceStream,dayTimeStream,downstairsTuyaRotationDeviceStream,screenStream, of({action:'init'}).pipe(delay(2000))).pipe(
    scan((acc, curr) => {
        const next = nextBrightness(acc, curr)
        if (!next) return acc
        // Whatever set it, never above MAX_BRIGHTNESS.
        return Object.assign({}, next, { value: Math.min(next.value, MAX_BRIGHTNESS) })
    }, {triggeredBy:'init', value:50}),
    share()
)
const lastEmissionBrightnessStream = currentBrigthnessStream.pipe(shareReplay(1))

module.exports.currentBrigthnessStream =  currentBrigthnessStream
module.exports.lastEmissionBrightnessStream =  lastEmissionBrightnessStream
module.exports.screenBrightness =  screenBrightness
module.exports.MAX_BRIGHTNESS =  MAX_BRIGHTNESS