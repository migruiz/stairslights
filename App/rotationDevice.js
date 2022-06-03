const { Observable,merge, } = require('rxjs');
const {  map,share, filter,mapTo,debounceTime,distinctUntilChanged} = require('rxjs/operators');
var mqtt = require('./mqttCluster.js');






  module.exports.getRotationDeviceStream = function(topic) {    
    
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
    
    
    const signalStartIncreaseSensorStream  = sharedRotationSensor.pipe(
        filter ( m => m.action === 'rotate_right'),
        share()
    )
    
    const signalStopIncreaseSensorStream = sharedRotationSensor.pipe(
        filter ( m => m.action==='rotate_left' || m.action==='rotate_stop'),
        mapTo({action:'rotate_stop'})
    )
    
    
    const timeoutStream = signalStartIncreaseSensorStream.pipe(
        debounceTime(8 * 1000),
        mapTo({action:'rotate_stop'}),
        )
    
    const turnOffStream = merge(timeoutStream,signalStopIncreaseSensorStream).pipe(   
        share()
    )
    
    
    
    const startStopStream = merge(signalStartIncreaseSensorStream,turnOffStream).pipe(
        distinctUntilChanged((prev, curr) => prev.action === curr.action)
    )

    return startStopStream;

}