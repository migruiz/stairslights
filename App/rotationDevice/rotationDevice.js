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

// IKEA BILRESA two-button remote (E2489), on the stairs since 26/10/2026. Holding a
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

// IKEA BILRESA scroll wheel (E2490), on the stairs since 27/10/2026. Turning it sends
// brightness_move_to_level with action_level: the wheel's own position, 1 to 255, which knows
// nothing of the stairs' level. So only which way it moved counts, and by how many clicks: a
// click is 14, a fast turn sends a few clicks at once, and at either end it keeps sending 255
// (or 1) while you carry on turning. Each turn comes out as wheel_up or wheel_down with its
// clicks. A press sends on and off in turn, whatever the stairs are doing, so either one is
// taken as a knob press (toggle).
module.exports.getRawIkeaWheelStream = function(topic) {
  const remote = new Observable(async subscriber => {
    var mqttCluster = await mqtt.getClusterAsync()
    mqttCluster.subscribeData(topic, function(content){
      subscriber.next({content})
    });
  });
  const sharedRemote = remote.pipe(share())

  const CLICK = 14
  const turnStream = sharedRemote.pipe(
    filter(m => m.content.action === 'brightness_move_to_level' && Number.isInteger(m.content.action_level)),
    scan((acc, m) => {
      const position = m.content.action_level
      const was = acc.position
      let direction = null
      if (was !== null && position > was) direction = 'up'
      else if (was !== null && position < was) direction = 'down'
      else if (position >= 254) direction = 'up'    // still turning past the top end
      else if (position <= 1) direction = 'down'    // still turning past the bottom end
      // (After a restart the first turn in the middle only tells where the wheel is.)
      const clicks = (was === null || position === was) ? 1 : Math.min(4, Math.max(1, Math.round(Math.abs(position - was) / CLICK)))
      return { position, direction, clicks }
    }, { position: null }),
    filter(m => m.direction !== null),
    map(m => ({ action: m.direction === 'up' ? 'wheel_up' : 'wheel_down', clicks: m.clicks }))
  )
  const pressStream = sharedRemote.pipe(
    filter(m => m.content.action === 'on' || m.content.action === 'off'),
    mapTo({ action: 'toggle' })
  )

  return merge(turnStream, pressStream);
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