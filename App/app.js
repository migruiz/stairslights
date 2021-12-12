const { Observable,merge,timer } = require('rxjs');
const { mergeMap, map,share,filter,mapTo,take,debounceTime,throttle,throttleTime, scan} = require('rxjs/operators');
var mqtt = require('./mqttCluster.js');

//global.mtqqLocalPath = process.env.MQTTLOCAL;
global.mtqqLocalPath = 'mqtt://piscos.tk';


const GROUND_FLOOR_SENSOR_TOPIC = 'rflink/EV1527-03e899'
const FIRST_FLOOR_SENSOR_TOPIC = 'rflink/EV1527-03e899'
const SECOND_FLOOR_SENSOR_TOPIC = 'rflink/EV1527-03e899'

const KEEPLIGHTONFORSECS =15 * 1000
const STARTFULLBRIGHTNESSATHOURS = process.env.STARTFULLBRIGHTNESSATHOURS
const ENDFULLBRIGHTNESSATHOURS = process.env.ENDFULLBRIGHTNESSATHOURS

const NIGHTBRIGHTNESS = process.env.NIGHTBRIGHTNESS
const DAYBRIGHTNESS = process.env.DAYBRIGHTNESS



console.log(`starting stairs lights current time ${new Date()}`)

const groundfloorSensorStream = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData(GROUND_FLOOR_SENSOR_TOPIC, function(content){        
            subscriber.next({content})
    });
});
const firstFloorSensorStream = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData(FIRST_FLOOR_SENSOR_TOPIC, function(content){        
            subscriber.next({content})
    });
});
const secondfloorSensorStream = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData(SECOND_FLOOR_SENSOR_TOPIC, function(content){        
            subscriber.next({content})
    });
});

const secondfloorbuttonStream = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData('rflink/Eurodomest-2beaa5', function(content){        
            subscriber.next({content})
    });
    mqttCluster.subscribeData('rflink/EV1527-04155a', function(content){        
        subscriber.next({content})
});
}); 

const firstfloorbuttonStream = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData('rflink/Eurodomest-2b', function(content){        
            subscriber.next({content})
    });
    mqttCluster.subscribeData('rflink/EV1527a', function(content){        
        subscriber.next({content})
});
}); 

const groundfloorbuttonStream = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData('r444flink/Eurodomest-2b', function(content){        
            subscriber.next({content})
    });
    mqttCluster.subscribeData('rfli444nk/EV1527a', function(content){        
        subscriber.next({content})
});
}); 


const downstairsLightsStream = merge(groundfloorSensorStream,firstFloorSensorStream).pipe(share())

const downstairsLightsOffStream = downstairsLightsStream.pipe(
    debounceTime(KEEPLIGHTONFORSECS),
    mapTo("0"),
    share()
    )
const downstairsLightsOnStream = downstairsLightsStream.pipe(
    throttle(_ => downstairsLightsOffStream),
    map(_ => (new Date().getHours() > STARTFULLBRIGHTNESSATHOURS && new Date().getHours() < ENDFULLBRIGHTNESSATHOURS)? DAYBRIGHTNESS : NIGHTBRIGHTNESS )
)

merge(downstairsLightsOnStream,downstairsLightsOffStream)
.subscribe(async m => {
   // console.log('Downstairs', m);
   // (await mqtt.getClusterAsync()).publishMessage('stairs/down/light',m)
})


const upstairsIntensityStream =  merge(firstfloorbuttonStream, secondfloorbuttonStream).pipe(
    mapTo("INTENSITY_MYZONE"),
    share()
)

const notUpstairsIntensityStream =  groundfloorbuttonStream.pipe(
    mapTo("INTENSITY_NOT_MYZONE"),
    share()
)


const upstairsSensorsStream = merge(secondfloorSensorStream,firstFloorSensorStream).pipe(
    mapTo("MOVEMENT"),
    share()
    )

const upstairsLightsOffStream = merge(upstairsSensorsStream,upstairsIntensityStream).pipe(
    debounceTime(KEEPLIGHTONFORSECS),
    mapTo("NO_MOVEMENT"),
    share()
    )



merge(upstairsSensorsStream,upstairsIntensityStream, notUpstairsIntensityStream,  upstairsLightsOffStream)
.pipe(
    scan( (acc, curr)=> {
        if (acc.type=='OFF'){
            if (curr=='INTENSITY_MYZONE'){
                return { type:'ON', intensity: acc.lastIntensity + 33 }
            }
            if (curr=='INTENSITY_NOT_MYZONE'){
                return { type:'OFF', intenslastIntensityity: acc.lastIntensity + 33 }
            }
            if (curr=='MOVEMENT'){
                return { type:'ON', intensity: acc.lastIntensity  }
            }
        }
        if (acc.type=='ON'){
            if (curr=='INTENSITY_MYZONE'){
                return { type:'ON', intensity: acc.intensity + 33 }
            }
            if (curr=='INTENSITY_NOT_MYZONE'){
                return { type:'ON', intensity: acc.intensity + 33 }
            }
            if (curr=='NO_MOVEMENT'){
                return { type:'OFF', lastIntensity: acc.intensity  }
            } 
            if (curr=='MOVEMENT'){
                return { type:'ON', intensity: acc.intensity  }
            } 
        }
    }, { type:'OFF', lastIntensity:33 })
)
.subscribe(async m => {
    console.log('Upstairs', m);
    //(await mqtt.getClusterAsync()).publishMessage('stairs/up/light',m)
})

