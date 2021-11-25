// https://aicc.github.io/CMI-5_Spec_Current/client/
// https://github.com/adlnet/cmi5-Client-Library/tree/master/Examples

function sentStatement(resp, obj) {
    // Default callback for SendStatement
    //console.log(resp, obj);
}

let Cmi5Utils = {
    initCmi5Controller: function () {
        cmi5Controller.setEndPoint(parse('endpoint'));
        cmi5Controller.setFetchUrl(parse('fetch'));
        cmi5Controller.setRegistration(parse('registration'));
        cmi5Controller.setActivityId(parse('activityid'));
        let actor = JSON.parse(parse('actor'));
        actor.objectType = 'Agent';
        cmi5Controller.setActor(JSON.stringify(actor));
        return cmi5Controller;
    },
    GetDuration: function () {
        if ('undefined' === typeof moment) {
            console.log('dependency error: moment is missing');
        }

        var start = moment(cmi5Controller.getStartDateTime());
        var end = moment(Date.now());

        return moment.duration(end.diff(start), 'ms').toISOString();
    }
}
