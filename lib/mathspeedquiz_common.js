MSQ = {};
MSQ.KEEP_TIMES = 5;        // Number of answer times to keep for running average
MSQ.WRONG_PENALTY = 20000; // Time penalty in milliseconds for wrong answer
MSQ.INITIAL_TIME = 20000;  // Probability weight for never-seen questions, in milliseconds

Questions = new Mongo.Collection("questions");
AnswerTimes = new Mongo.Collection("answer_times");
AnswerTimeTotals = new Mongo.Collection("answer_time_totals");

Meteor.methods({
    insertAnswerTime: function (questionId, time) {
	var rec = AnswerTimes.findOne({ "questionId" : questionId, "userId" : Meteor.userId() });
	var totalRec = AnswerTimeTotals.findOne({ "userId" : Meteor.userId() });
	var total;
	if (totalRec !== undefined) total = totalRec.value;
	if (rec) {
	    var times = rec.times;
	    var oldAvg = rec.avg;
	    while (times.length >= MSQ.KEEP_TIMES) times.shift();
	    times.push(time)
	    var sum = 0;
	    for (var i = 0; i < times.length ; i++) sum += times[i];
	    var avg = sum/times.length;
	    AnswerTimes.update({ "questionId" : questionId, "userId" : Meteor.userId() },
			       { $set : { "times" : times, "avg" : avg } });
	    if (total) {
		AnswerTimeTotals.update({ "userId" : Meteor.userId() },
					{ $set : { "value" : total - oldAvg + avg }});
	    }
	} else {
	    AnswerTimes.insert({ "questionId" : questionId, "userId" : Meteor.userId(),
				 "times" : [ time ], "avg" : time });
	    if (total) {
		AnswerTimeTotals.update({ "userId" : Meteor.userId() },
					{ $set : { "value" : total - MSQ.INITIAL_TIME + time }});
	    }
	}
    },
    nextQuestion: function() {
	var questionTime = function (question) {
	    var timesRec = AnswerTimes.findOne({ "questionId" : question._id,
						 "userId" : Meteor.userId() });
	    if (timesRec === undefined) {
		return MSQ.INITIAL_TIME;
	    } else {
		return timesRec.avg;
	    }
	}
	var questions = Questions.find().fetch();
	var totalRec = AnswerTimeTotals.findOne({ "userId" : Meteor.userId() });
	var total = 0;
	if (totalRec === undefined) {
	    for (var i = 0; i < questions.length; i++) {
		total += questionTime(questions[i]);
	    }
	    AnswerTimeTotals.insert({ "userId" : Meteor.userId(), "value" : total })
	} else {
	    total = totalRec.value;
	}
	var randIdx = Math.random() * total;
	var sum = 0;
	for (var i = 0; i < questions.length && sum < randIdx; i++) {
	    sum += questionTime(questions[i]);
	}
	return questions[i-1];
    },
});


