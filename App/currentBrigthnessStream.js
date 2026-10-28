const { Observable,merge,timer, interval, of, Subject } = require('rxjs');
const { mergeMap, first, withLatestFrom, map,share,shareReplay, filter,mapTo,take,debounceTime,throttle,throttleTime, startWith, takeWhile, delay, scan, distinct,distinctUntilChanged, tap, flatMap, takeUntil, toArray, groupBy, concatMap} = require('rxjs/operators');


const { getRawRotationDeviceStream, getRawIkeaButtonsStream, getRawIkeaWheelStream } = require('./rotationDevice/rotationDevice');
const { getRawTuyaRotationDeviceStream } = require('./rotationDevice/tuyaRotationDevice');
const { dayTimeStream, getDefaultBrightness }= require('./dayTimeStream')

const downstairsRotationDeviceStream = getRawRotationDeviceStream('zigbee2mqtt/0x0c4314fffeb064fb')
const upstairsRotationDeviceStream = getRawRotationDeviceStream('zigbee2mqtt/0x0c4314fffef7f65a')
const downstairsTuyaRotationDeviceStream = getRawTuyaRotationDeviceStream('zigbee2mqtt/0xa4c138712f6a2d0b')
// The IKEA BILRESA two-button remote (since 26/10/2026): hold a button to brighten or dim
// like turning a knob; press I to light the stairs, O to turn them off.
const buttonsRemoteStream = getRawIkeaButtonsStream('zigbee2mqtt/0x6cd8fb0000086c6e')
// The IKEA BILRESA scroll wheels (the first since 27/10/2026, the second since 28/10, which
// replaced 0x1035970000a7952a the same day): each click brightens or dims one step
// (WHEEL_STEPS); a press does what a knob press does. Each wheel keeps track of its own position.
const wheelRemoteStream = merge(
    getRawIkeaWheelStream('zigbee2mqtt/0x6cd8fb00000c1d6c'),
    getRawIkeaWheelStream('zigbee2mqtt/0x1035970000a8fdfe')
)
// The kitchen iPad's stairs slider (app.js): a brightness from 0 (off) to 1000, which does
// what a turn of either knob does.
const screenBrightness = new Subject()
const screenStream = screenBrightness.pipe(map(value => ({action:'screen', value})))

// The most the strips are ever sent: 125, where the lights screen's slider shows 50%. Miguel
// found anything brighter too bright (25/10/2026). The knobs stop here, and anything higher
// from a screen is taken as this.
const MAX_BRIGHTNESS = 125


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






// The scroll wheel's steps: levels 3% apart on the lights screen's slider (level = 1000 ×
// slider³), so each click looks like about the same change whether dim or bright. 1 and 6 are
// the night and day levels. Turning never goes below 1, as with the knobs; if the level is 0
// (pressed off) turning down leaves it there.
const WHEEL_STEPS = [1, 2, 3, 6, 9, 14, 20, 27, 36, 47, 59, 74, 91, 111, 125]
const wheelUp = (level, clicks) => {
    for (let i = 0; i < clicks; i++) {
        const next = WHEEL_STEPS.find(step => step > level)
        level = next === undefined ? MAX_BRIGHTNESS : next
    }
    return level
}
const wheelDown = (level, clicks) => {
    for (let i = 0; i < clicks; i++) {
        if (level <= 1) return level
        const lower = WHEEL_STEPS.filter(step => step < level)
        level = lower.length ? lower[lower.length - 1] : 1
    }
    return level
}



const nextBrightness = (acc, curr) => {
        if (curr.action==='screen') return {triggeredBy:'screen', value: curr.value}
        if (curr.action==='date_time') return {triggeredBy:'timeOfDay', value:curr.value}
        if (curr.action==='toggle') return {triggeredBy:'rotationDevice', value:(acc.value==0 ? getDefaultBrightness() : 0)}
        if (curr.action==='single') return {triggeredBy:'rotationDevice', value:(acc.value==0 ? getDefaultBrightness() : 0)}
        // The two-button remote. On lights both flights for 90 s at the level they're set to
        // (or the time of day's level if it was 0). Off is a knob press when the lights are on:
        // level 0, so motion won't light them until the level goes up again (or 7am/8pm).
        if (curr.action==='on') return {triggeredBy:'rotationDevice', value:(acc.value==0 ? getDefaultBrightness() : acc.value)}
        if (curr.action==='off') return {triggeredBy:'rotationDevice', value:0}
        if (curr.action==='wheel_up') return {triggeredBy:'rotationDevice', value: wheelUp(acc.value, curr.clicks) }
        if (curr.action==='wheel_down') return {triggeredBy:'rotationDevice', value: wheelDown(acc.value, curr.clicks) }
        if (curr.action==='brightness_move_up' && curr.type==='ikea') return {triggeredBy:'rotationDevice', value: increaseIkea(acc.value) }
        if (curr.action==='brightness_move_down' && curr.type==='ikea') return {triggeredBy:'rotationDevice', value: decreaseIkea(acc.value) }
        if (curr.action==='rotate_right' && curr.type==='tuya') return {triggeredBy:'rotationDevice', value: increaseTuya(acc.value) }
        if (curr.action==='rotate_left' && curr.type==='tuya') return {triggeredBy:'rotationDevice', value: decreaseTuya(acc.value) }
        if (curr.action==='init') return {triggeredBy:'init', value: 100 }
}

const currentBrigthnessStream = merge(downstairsRotationDeviceStream,upstairsRotationDeviceStream,dayTimeStream,downstairsTuyaRotationDeviceStream,buttonsRemoteStream,wheelRemoteStream,screenStream, of({action:'init'}).pipe(delay(2000))).pipe(
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