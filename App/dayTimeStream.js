const { Observable,merge,timer, interval, of } = require('rxjs');
const { map } = require('rxjs/operators');

const nightNotificationStream =  new Observable(subscriber => {      
    new CronJob(
        `0 ${ENDFULLBRIGHTNESSATHOURS} * * *`,
       function() {
        subscriber.next({action:'night_time'});
       },
       null,
       true,
       'Europe/London'
   );
});
const dayNotificationStream =  new Observable(subscriber => {      
    new CronJob(
        `0 ${STARTFULLBRIGHTNESSATHOURS} * * *`,
       function() {
           subscriber.next({action:'day_time'});
       },
       null,
       true,
       'Europe/London'
   );
});

const dayTimeStream = merge(nightNotificationStream,dayNotificationStream).pipe(
    map( (m) => {
        if (m.action==='night_time') return { action:'date_time', value: 1}
        if (m.action==='day_time') return { action:'date_time', value: 6}
        }
    )
)

module.exports.dayTimeStream =  dayTimeStream