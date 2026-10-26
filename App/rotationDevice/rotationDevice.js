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

// IKEA BILRESA two-button remote (E2489), on the stairs as a test since 26/10/2026. Holding a
// button sends brightness_move_up or brightness_move_down, then brightness_stop on release,
// which is what the IKEA knobs send when turned. A short press sends on or off.
module.exports.getRawIkeaButtonsStream = function(topic) {
  const remote = new Observable(async subscriber => {
    var mqttCluster = await mqtt.getClusterAsync()
    mqttCluster.subscribeData(topic, function(content){
      subscriber.next({content})
    });
  });

  const sharedRemote = remote.pipe(
    filter(m => ['brightness_move_up', 'brightness_move_down', 'brightness_stop', 'on', 'off'].includes(m.content.action)),
    map(m => ({action: m.content.action, type:'ikea'})),
    share()
  )
  const pressStream = sharedRemote.pipe(
    filter(m => m.action==='on' || m.action==='off')
  )

  return merge(getRightRotationStream(sharedRemote), getLeftRotationStream(sharedRemote), pressStream);
}

module.exports.getDeviceStream = function({currentBrigthnessStream}) {
    
  const sharedDeviceStream = currentBrigthnessStream.pipe(
    // A knob, or the iPad's slider doing what a knob does.
    filter(m => m.triggeredBy==='rotationDevice' || m.triggeredBy==='screen'),
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