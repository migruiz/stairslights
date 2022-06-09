const { share } = require('rxjs/operators');

const { currentBrigthnessStream, lastEmissionBrightnessStream } = require('./currentBrigthnessStream');
const { getDownstairsStream, getUpstairsStream }  = require('./stairsSensor')
const { getDeviceStream } = require ('./rotationDevice/rotationDevice')
const { getLightsStream } = require('./lighStream')

global.mtqqLocalPath = 'mqtt://192.168.0.11'



console.log(`starting stairs lights current time ${new Date()}`)




const downstairsStream = getDownstairsStream({lastEmissionBrightnessStream})
const upstairsStream = getUpstairsStream({lastEmissionBrightnessStream})
const deviceStream = getDeviceStream({currentBrigthnessStream})
const sharedDeviceStream = deviceStream.pipe(share())


getLightsStream({stairsStream:downstairsStream, deviceStream:sharedDeviceStream}).subscribe(async m => {
    console.log('down', m);
    //(await mqtt.getClusterAsync()).publishMessage('stairs/down/light',`${m.value}`)
})
getLightsStream({stairsStream:upstairsStream, deviceStream:sharedDeviceStream}).subscribe(async m => {
    console.log('up', m);
    //(await mqtt.getClusterAsync()).publishMessage('stairs/down/light',`${m.value}`)
})