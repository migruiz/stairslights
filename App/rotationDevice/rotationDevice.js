const { Observable,merge, interval } = require('rxjs');
const {  map,share, filter,mapTo,debounceTime,distinctUntilChanged, flatMap, startWith , takeUntil, scan} = require('rxjs/operators');
var mqtt = require('../mqttCluster.js');
const { getRightRotationStream } =  require('./rightRotation')
const { getLeftRotationStream } =  require('./leftRotation')






  module.exports.getRawRotationDeviceStream = function(topic) {    
    
   
    const rotationSensor = new Observable(async subscriber => {  
      var mqttCluster=await mqtt.getClusterAsync()   
      mqttCluster.subscribeData(topic, function(content){    
              subscriber.next({content})
      });
    });
  
  
  
    const sharedRotationSensor = rotationSensor.pipe(
        filter( m => m.content.action==='brightness_move_up' ||  m.content.action==='brightness_move_down' || m.content.action==='brightness_stop'  || m.content.action==='toggle'),
        map( m => ({action: m.content.action, type:'ikea'})),
        share()
    )

    const increaseStream = getRightRotationStream(sharedRotationSensor)
    const decreaseStream = getLeftRotationStream(sharedRotationSensor)
    const toggleStream =  sharedRotationSensor.pipe(
      filter(m => m.action==='toggle')
    )



    return merge(increaseStream,decreaseStream,toggleStream);

}

module.exports.getDeviceStream = function({currentBrigthnessStream}) {    
    
  const sharedDeviceStream = currentBrigthnessStream.pipe(
    filter(m => m.triggeredBy==='rotationDevice'),    
    map(m =>  ({type:'manual_on', value:m.value})),
    share()
    )



const turnOffDeviceStream = sharedDeviceStream.pipe(
    debounceTime(90*1000),
    mapTo({type:'manual_off', value:0}),
    )


const deviceStream = merge(sharedDeviceStream,turnOffDeviceStream)

return deviceStream;

}