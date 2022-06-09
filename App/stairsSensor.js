

const groundfloorSensorStream = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData(GROUND_FLOOR_SENSOR_TOPIC, function(content){  
        if (content.occupancy){      
            subscriber.next({content})
        }
    });
});
const firstFloorSensorStream = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData(FIRST_FLOOR_SENSOR_TOPIC, function(content){        
        if (content.occupancy){      
            subscriber.next({content})
        }
    });
});

const secondfloorSensorStream = new Observable(async subscriber => {  
    var mqttCluster=await mqtt.getClusterAsync()   
    mqttCluster.subscribeData(SECOND_FLOOR_SENSOR_TOPIC, function(content){        
        if (content.occupancy){      
            subscriber.next({content})
        }
    });
});



const getStairsObservable = (sensorStreams) => {
    const sharedStreams = merge(sensorStreams).pipe(share())

    const lightsOffStream = sharedStreams.pipe(
        debounceTime(KEEPLIGHTONFORSECS),
        mapTo({type:'movement_off'}),
        )
    const lightsOnStream = sharedStreams.pipe(
        withLatestFrom(currenttBrigthnessStream),
        map(([_, brightness]) =>  ({type:'movement_on', value: brightness.value})),
    )
    return merge(lightsOnStream, lightsOffStream)
}


module.exports.getStairsSensor = function({currentBrigthnessStream}) {    

    

}