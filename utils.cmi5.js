// https://aicc.github.io/CMI-5_Spec_Current/client/
// https://github.com/adlnet/cmi5-Client-Library/tree/master/Examples

cmi5Controller.setEndPoint(parse('endpoint'));
cmi5Controller.setFetchUrl(parse('fetch'));
cmi5Controller.setRegistration(parse('registration'));
cmi5Controller.setActivityId(parse('activityid'));
let actor = JSON.parse(parse('actor'));
actor.objectType = 'Agent';
cmi5Controller.setActor(JSON.stringify(actor));

function sentStatement(resp, obj) {
    // Default callback for SendStatement
    console.log(resp, obj);
}

cmi5Controller.startUp(function () {
    console.log('cmi5Ready');
    cmi5Controller.setObjectProperties('en-US', 'http://adlnet.gov/expapi/activities/assessment', 'ADL AU Example 1', 'This is a sample of an AU.');
    SendStatement('Initialized');
    SendStatement('Completed');
    FinishAU();
}, function () {
    console.log('startUpError');
    FinishAU();
});
