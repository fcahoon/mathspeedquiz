Meteor.startup(function () {
    if (Questions.find().count() === 0) {
	for (a = 2 ; a < 4 ; a++) {
	    for (b = 2 ; b < 4 ; b++) {
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

Meteor.publish("questions",
	       function () {
		   return Questions.find({});
	       });
Meteor.publish("question_times",
	       function () {
		   return QuestionTimes.find({ "userId" : this.userId })
	       });
Meteor.publish("quiz_stats",
	       function () {
		   return QuizStats.find({ "userId" : this.userId });
	       });
