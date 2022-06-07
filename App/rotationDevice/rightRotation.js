const { Observable,merge, interval } = require('rxjs');
const {  map,share, filter,mapTo,debounceTime,distinctUntilChanged, flatMap, startWith , takeUntil, scan} = require('rxjs/operators');
var mqtt = require('../mqttCluster.js');






  module.exports.getRightRotationStream = function(sharedRotationSensor) {    
    

    
    
    const signalStartIncreaseSensorStream  = sharedRotationSensor.pipe(
        filter ( m => m.action === 'rotate_right'),
        share()
    )
    
    const signalStopIncreaseSensorStream = sharedRotationSensor.pipe(
        filter ( m => m.action==='rotate_left' || m.action==='rotate_stop'),
        mapTo({action:'rotate_stop'})
    )
    
    
    const timeoutStream = signalStartIncreaseSensorStream.pipe(
        debounceTime(5 * 1000),
        mapTo({action:'rotate_stop'}),
        )
    
    const turnOffStream = merge(timeoutStream,signalStopIncreaseSensorStream).pipe(   
        share()
    )
    
    
    
    const startStopStream = merge(signalStartIncreaseSensorStream,turnOffStream).pipe(
        distinctUntilChanged((prev, curr) => prev.action === curr.action)
    )
    const startStrean = startStopStream.pipe(
        filter(m=>m.action==='rotate_right'),        
    )
    const stopStream = startStopStream.pipe(
        filter(m=>m.action==='rotate_stop')
    )

    const increaseStream = startStrean.pipe(
        flatMap( m => interval(30).pipe(
    
            startWith(1),
            takeUntil(stopStream),
            mapTo(m)
        )));




    return increaseStream;

}