Meteor.startup(function () {
    if (Questions.find().count() === 0) {
	for (a = 2 ; a < 10 ; a++) {
	    for (b = 2 ; b < 10 ; b++) {
		Questions.insert({
		    q: a + "&nbsp;&times;&nbsp;" + b,
		    a: a * b
		});
		Questions.insert({
		    q: (a * b) + "&nbsp;&divide;&nbsp;" + a,
		    a: b
		});
	    }
	}
    }
});
