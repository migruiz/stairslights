const { Observable,merge, interval, of } = require('rxjs');
const {  map,share, filter,mapTo,debounceTime,distinctUntilChanged, flatMap, startWith , takeUntil, scan, delay, first} = require('rxjs/operators');
var mqtt = require('../mqttCluster.js');






  module.exports.getRightRotationStream = function(sharedRotationSensor) {    
    

    
    
    const signalStartIncreaseSensorStream  = sharedRotationSensor.pipe(
        filter ( m => m.action === 'brightness_move_up'),
        share()
    )
    
    const signalStopIncreaseSensorStream = sharedRotationSensor.pipe(
        filter ( m => m.action!=='brightness_move_up'),
        mapTo({action:'brightness_stop'})
    )
    
    
    const timeoutStream = signalStartIncreaseSensorStream.pipe(
        debounceTime(1 * 1000),
        mapTo({action:'brightness_stop'}),
        )
    
    const turnOffStream = merge(timeoutStream,signalStopIncreaseSensorStream).pipe(   
        share()
    )
    
    
    
    const startStopStream = merge(signalStartIncreaseSensorStream,turnOffStream).pipe(
        distinctUntilChanged((prev, curr) => prev.action === curr.action)
    )
    const startStrean = startStopStream.pipe(
        filter(m=>m.action==='brightness_move_up'),        
    )
    const stopStream = startStopStream.pipe(
        filter(m=>m.action==='brightness_stop')
    )

    const increaseStream = startStrean.pipe(
        flatMap( m => interval(30).pipe(
    
            startWith(1),
            takeUntil(merge(stopStream, of(1).pipe(delay(3000))).pipe(first())),
            mapTo(m)
        )));




    return increaseStream;

}