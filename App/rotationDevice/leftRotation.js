const { Observable,merge, interval } = require('rxjs');
const {  map,share, filter,mapTo,debounceTime,distinctUntilChanged, flatMap, startWith , takeUntil, scan} = require('rxjs/operators');
var mqtt = require('../mqttCluster.js');






  module.exports.getLeftRotationStream = function(topic) {    
    
    const rotationSensor = new Observable(async subscriber => {  
        var mqttCluster=await mqtt.getClusterAsync()   
        mqttCluster.subscribeData(topic, function(content){    
                subscriber.next({content})
        });
    });
    
    
    
    const sharedRotationSensor = rotationSensor.pipe(
        filter( m => m.content.action==='rotate_right' ||  m.content.action==='rotate_left' || m.content.action==='rotate_stop'),
        map( m => ({action: m.content.action})),
        share()
    )
    
    
    const signalStartDecreaseSensorStream  = sharedRotationSensor.pipe(
        filter ( m => m.action === 'rotate_left'),
        share()
    )
    
    const signalStopDecreaseSensorStream = sharedRotationSensor.pipe(
        filter ( m => m.action==='rotate_right' || m.action==='rotate_stop'),
        mapTo({action:'rotate_stop'})
    )
    
    
    const timeoutStream = signalStartDecreaseSensorStream.pipe(
        debounceTime(5 * 1000),
        mapTo({action:'rotate_stop'}),
        )
    
    const turnOffStream = merge(timeoutStream,signalStopDecreaseSensorStream).pipe(   
        share()
    )
    
    
    
    const startStopStream = merge(signalStartDecreaseSensorStream,turnOffStream).pipe(
        distinctUntilChanged((prev, curr) => prev.action === curr.action)
    )
    const startStrean = startStopStream.pipe(
        filter(m=>m.action==='rotate_left'),        
    )
    const stopStream = startStopStream.pipe(
        filter(m=>m.action==='rotate_stop')
    )

    const decreaseStream = startStrean.pipe(
        flatMap( m => interval(30).pipe(
    
            startWith(1),
            takeUntil(stopStream),
            mapTo(m)
        )));




    return decreaseStream;

}