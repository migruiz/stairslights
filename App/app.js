const { share } = require('rxjs/operators');
var mqtt = require('./mqttCluster.js');
var http = require('http');
const { currentBrigthnessStream, lastEmissionBrightnessStream, screenBrightness } = require('./currentBrigthnessStream');
const { getDownstairsStream, getUpstairsStream }  = require('./stairsSensor')
const { getDeviceStream } = require ('./rotationDevice/rotationDevice')
const { getLightsStream } = require('./lighStream')

global.mtqqLocalPath = process.env.MQTTLOCAL || 'mqtt://192.168.0.11'
// The kitchen iPad's lights screen: GET/POST /stairs, passed through by nginx on the Pi (the
// screens container in C:/repos/home-assistant).
const SCREEN_PORT = 8770



console.log(`starting stairs lights current time ${new Date()}`)





const downstairsStream = getDownstairsStream({lastEmissionBrightnessStream})
const upstairsStream = getUpstairsStream({lastEmissionBrightnessStream})
const deviceStream = getDeviceStream({currentBrigthnessStream})
const sharedDeviceStream = deviceStream.pipe(share())

let level = null  // the brightness the knobs (or the iPad) last set, 0 to 1000
let down = 0      // what each flight was last sent
let up = 0

lastEmissionBrightnessStream.subscribe(m => { level = m.value })

getLightsStream({stairsStream:downstairsStream, deviceStream:sharedDeviceStream}).subscribe(async m => {
    //console.log('down', m);
    down = m.value;
    (await mqtt.getClusterAsync()).publishMessage('stairs/down/light',`${m.value}`)
})
getLightsStream({stairsStream:upstairsStream, deviceStream:sharedDeviceStream}).subscribe(async m => {
    //console.log('up', m);
    up = m.value;
    (await mqtt.getClusterAsync()).publishMessage('stairs/up/light',`${m.value}`)
})


// What the screen shows: the level, and what each flight is showing right now (0 when off).
function screenState() {
  return { brightness: level, down, up }
}

http.createServer((req, res) => {
  const reply = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (req.url !== '/stairs') return reply(404, { error: 'only /stairs' });
  if (req.method === 'GET') return reply(200, screenState());
  if (req.method !== 'POST') return reply(405, { error: 'GET or POST /stairs' });
  let body = '';
  req.on('data', chunk => { body += chunk });
  req.on('end', () => {
    let brightness;
    try { brightness = JSON.parse(body).brightness } catch (e) {}
    if (!Number.isInteger(brightness) || brightness < 0 || brightness > 1000) return reply(400, { error: 'send {"brightness": 0 to 1000}' });
    // For the first two seconds it is still starting up.
    if (level === null) return reply(503, { error: 'starting, try again' });
    console.log(`${new Date().toISOString()} screen brightness ${brightness}`);
    // Like a turn of a knob: both flights at this level now, off 90 seconds later unless
    // someone is moving, and the level motion lights them at from then on. 0 is off, and
    // motion won't light them until the level goes up again (or 7am/8pm sets it).
    screenBrightness.next(brightness);
    reply(200, screenState());
  });
}).listen(SCREEN_PORT, () => console.log(`screen requests on port ${SCREEN_PORT}`));
