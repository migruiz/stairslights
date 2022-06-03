const { Observable,merge, interval } = require('rxjs');
const {  map,share, filter,mapTo,debounceTime,distinctUntilChanged, flatMap, startWith , takeUntil, scan} = require('rxjs/operators');
var mqtt = require('../mqttCluster.js');
const { getRightRotationStream } =  require('./rightRotation')






  module.exports.getRotationDeviceStream = function(topic) {    
    
   
    const increaseStream = getRightRotationStream(topic)


const increase = (acc)=>{
    if (acc.value < 30){
        return { value: acc.value + 1 } 
    }
    else {
        return { value: acc.value + 20 > 1000 ? 1000 : acc.value + 20 } 
    }
}

const brightnessActionStream = increaseStream.pipe(
    scan((acc, curr) => {
        if (curr.action==='rotate_right') return increase(acc)
        if (curr.action==='rotate_left') return {value: acc.value - 1 < 1 ? 1 : acc.value - 1 }
        
    }, {value:0})
)

    return brightnessActionStream;

}