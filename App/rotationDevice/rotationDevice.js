const { Observable,merge, interval } = require('rxjs');
const {  map,share, filter,mapTo,debounceTime,distinctUntilChanged, flatMap, startWith , takeUntil, scan} = require('rxjs/operators');
var mqtt = require('../mqttCluster.js');
const { getRightRotationStream } =  require('./rightRotation')
const { getLeftRotationStream } =  require('./leftRotation')






  module.exports.getRotationDeviceStream = function(topic) {    
    
   
    const increaseStream = getRightRotationStream(topic)
    const decreaseStream = getLeftRotationStream(topic)




    return merge(increaseStream,decreaseStream);

}