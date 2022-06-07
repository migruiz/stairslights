const { Observable,merge, interval } = require('rxjs');
const {  map,share, filter,mapTo,debounceTime,distinctUntilChanged, flatMap, startWith , takeUntil, scan} = require('rxjs/operators');
var mqtt = require('../mqttCluster.js');
const { getRightRotationStream } =  require('./rightRotation')
const { getLeftRotationStream } =  require('./leftRotation')






  module.exports.getRotationDeviceStream = function(topic) {    
    
   
    const rotationSensor = new Observable(async subscriber => {  
      var mqttCluster=await mqtt.getClusterAsync()   
      mqttCluster.subscribeData(topic, function(content){    
              subscriber.next({content})
      });
    });
  
  
  
    const sharedRotationSensor = rotationSensor.pipe(
        filter( m => m.content.action==='rotate_right' ||  m.content.action==='rotate_left' || m.content.action==='rotate_stop'  || m.content.action==='play_pause'),
        map( m => ({action: m.content.action})),
        share()
    )

    const increaseStream = getRightRotationStream(sharedRotationSensor)
    const decreaseStream = getLeftRotationStream(sharedRotationSensor)
    const toggleStream =  sharedRotationSensor.pipe(
      filter(m => m.action==='play_pause')
    )



    return merge(increaseStream,decreaseStream,toggleStream);

}