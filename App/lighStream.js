const { Observable,merge,timer, interval, of } = require('rxjs');
const { mergeMap, first, withLatestFrom, map,share,shareReplay, filter,mapTo,take,debounceTime,throttle,throttleTime, startWith, takeWhile, delay, scan, distinct,distinctUntilChanged, tap, flatMap, takeUntil, toArray, groupBy, concatMap} = require('rxjs/operators');


const getLightsStream = ({deviceStream, stairsStream}) =>{
    const combinedStream = merge(deviceStream,stairsStream)
    .pipe(
        scan((acc, curr) => {
            if (curr.type==='manual_on') return curr        
            if (curr.type==='movement_on') return curr;
            
            if (curr.type==='manual_off') {
                if (acc.type==='manual_on') return {type: curr.type, value:0}
                else return acc;
            }
            if (curr.type==='movement_off') {
                if (acc.type==='movement_on') return {type: curr.type, value:0}
                else return acc;
            }
        }, {type: 'init', value:0}),
        distinctUntilChanged((prev, curr) => prev.type === curr.type && prev.value === curr.value),
    )
    return combinedStream;
}

module.exports.getLightsStream = getLightsStream