const { Observable,merge } = require('rxjs');
const { map } = require('rxjs/operators');
const CronJob = require('cron').CronJob;

const STARTFULLBRIGHTNESSATHOURS = parseInt(7)
const ENDFULLBRIGHTNESSATHOURS = parseInt(20)
const NIGHTBRIGHTNESS = parseInt(1)
const DAYBRIGHTNESS = parseInt(6)

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
        if (m.action==='night_time') return { action:'date_time', value: NIGHTBRIGHTNESS}
        if (m.action==='day_time') return { action:'date_time', value: DAYBRIGHTNESS}
        }
    )
)
const getDefaultBrightness = () => (new Date().getHours() > STARTFULLBRIGHTNESSATHOURS && new Date().getHours() < ENDFULLBRIGHTNESSATHOURS)? DAYBRIGHTNESS : NIGHTBRIGHTNESS

module.exports.dayTimeStream =  dayTimeStream
module.exports.getDefaultBrightness =  getDefaultBrightness