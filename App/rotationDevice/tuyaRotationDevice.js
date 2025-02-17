const { Observable,merge, interval } = require('rxjs');
const {  map,share, filter,mapTo,debounceTime,distinctUntilChanged, flatMap, startWith , takeUntil, scan} = require('rxjs/operators');
var mqtt = require('../mqttCluster.js');







  module.exports.getRawTuyaRotationDeviceStream = function(topic) {    
    
   
    const rotationSensor = new Observable(async subscriber => {  
      var mqttCluster=await mqtt.getClusterAsync()   
      mqttCluster.subscribeData(topic, function(content){    
              subscriber.next({content})
      });
    });
  
  
  
    const sharedRotationSensor = rotationSensor.pipe(
        filter( m => m.content.action==='rotate_right' ||  m.content.action==='rotate_left' || m.content.action==='single'),
        map( m => ({action: m.content.action, type:'tuya'})),
        share()
    )

    


    return merge(sharedRotationSensor);

}

