const { Observable,merge, interval, of } = require('rxjs');
const {  map,share, filter,mapTo,debounceTime,distinctUntilChanged, flatMap, startWith , takeUntil, scan, delay, first} = require('rxjs/operators');
var mqtt = require('../mqttCluster.js');






  module.exports.getLeftRotationStream = function(sharedRotationSensor) {    
    

    const signalStartDecreaseSensorStream  = sharedRotationSensor.pipe(
        filter ( m => m.action === 'brightness_move_down'),
        share()
    )
    
    const signalStopDecreaseSensorStream = sharedRotationSensor.pipe(
        filter ( m => m.action!=='brightness_move_down'),
        mapTo({action:'brightness_stop'})
    )
    
    
    const timeoutStream = signalStartDecreaseSensorStream.pipe(
        debounceTime(1 * 1000),
        mapTo({action:'brightness_stop'}),
        )
    
    const turnOffStream = merge(timeoutStream,signalStopDecreaseSensorStream).pipe(   
        share()
    )
    
    
    
    const startStopStream = merge(signalStartDecreaseSensorStream,turnOffStream).pipe(
        distinctUntilChanged((prev, curr) => prev.action === curr.action)
    )
    const startStrean = startStopStream.pipe(
        filter(m=>m.action==='brightness_move_down'),        
    )
    const stopStream = startStopStream.pipe(
        filter(m=>m.action==='brightness_stop')
    )

    const decreaseStream = startStrean.pipe(
        flatMap( m => interval(30).pipe(
    
            startWith(1),
            takeUntil(merge(stopStream, of(1).pipe(delay(3000))).pipe(first())),
            mapTo(m)
        )));




    return decreaseStream;

}