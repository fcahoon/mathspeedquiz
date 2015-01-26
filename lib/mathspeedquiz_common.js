MSQ = {};
MSQ.KEEP_TIMES = 5;        // Number of answer times to keep for running average
MSQ.WRONG_PENALTY = 20000; // Time penalty in milliseconds for wrong answer
MSQ.INITIAL_TIME = 20000;  // Probability weight for never-seen questions, in milliseconds

Questions = new Mongo.Collection("questions");
AnswerTimes = new Mongo.Collection("answer_times");
QuizStats = new Mongo.Collection("quiz_stats"); // Note: "stats" is an internal Mongo name; don't name a collection that.

Meteor.methods({
    insertAnswerTime: function (questionId, wrongCount, time) {
	var rec = AnswerTimes.findOne({ "questionId" : questionId, "userId" : Meteor.userId() });
	var statsRec = QuizStats.findOne({ "userId" : Meteor.userId() });
	var oldAvg;
	var avg;
	if (rec) {
	    var times = rec.times;
	    oldAvg = rec.avg;
	    while (times.length >= MSQ.KEEP_TIMES) times.shift();
	    times.push({"wrong" : wrongCount, "time" : time});
	    var sum = 0;
	    for (var i = 0; i < times.length ; i++) sum += MSQ.WRONG_PENALTY*times[i].wrong + times[i].time;
	    avg = sum/times.length;
	    AnswerTimes.update({ "questionId" : questionId, "userId" : Meteor.userId() },
			       { $set : { "times" : times, "avg" : avg } });
	} else {
	    // no rec for this question
	    AnswerTimes.insert({ "questionId" : questionId, "userId" : Meteor.userId(),
				 "times" : [ { "wrong" : wrongCount, "time" : time } ],
				 "avg" : MSQ.WRONG_PENALTY*wrongCount + time });
	}

	// update all yer stats here
	if (statsRec === undefined) {
	    var stats = { "userId" : Meteor.userId(),
			  "wrongCount" : wrongCount,
			  "correctCount" : 1,
			  "correctRun" : 1,
			  "maxCorrectRun" : correctRun };
	    if (wrongCount == 0) stats.minTime = time/1000.0;
	    QuizStats.insert(stats);
	} else {
	    var changedStats = {};
	    // totalAvgTime
	    if (oldAvg === undefined) oldAvg = MSQ.INITIAL_TIME;
	    if (avg === undefined) avg = MSQ.WRONG_PENALTY*wrongCount + time
	    if (statsRec.totalAvgTime !== undefined) {
		changedStats.totalAvgTime = statsRec.totalAvgTime - oldAvg + avg;
	    }
	    // correctCount
	    if (statsRec.correctCount === undefined) {
		changedStats.correctCount = 1;
	    } else {
		changedStats.correctCount = statsRec.correctCount + 1;
	    }
	    // correctRun
	    if (statsRec.correctRun === undefined) {
		changedStats.correctRun = 1;
	    } else {
		changedStats.correctRun = statsRec.correctRun + 1;
	    }
	    // minTime
	    if (wrongCount === 0 && (statsRec.minTime === undefined || statsRec.minTime > time)) {
		changedStats.minTime = time/1000;
	    }
	    // maxCorrectRun
	    if (statsRec.maxCorrectRun === undefined || statsRec.maxCorrectRun < changedStats.correctRun) {
		changedStats.maxCorrectRun = changedStats.correctRun;
	    }
	    QuizStats.update({ "userId" : Meteor.userId() }, { $set : changedStats });
	}    
    },
    insertTotal: function (total) {
	if (QuizStats.findOne({ "userId" : Meteor.userId() }) === undefined) {
	    QuizStats.insert({ "userId" : Meteor.userId(), "totalAvgTime" : total });
	} else {
	    QuizStats.update({ "userId" : Meteor.userId() },
			     { $set : { "totalAvgTime" : total }});
	}
    },
    recordWrongAnswer: function () {
	var statsRec = QuizStats.findOne({ "userId" : Meteor.userId() });
	if (statsRec === undefined) {
	    QuizStats.insert({ "userId" : Meteor.userId(),
			       "wrongCount" : 1,
			       "correctRun" : 0 });
	} else {
	    var changedStats = {};
	    changedStats.wrongCount = (statsRec.wrongCount === undefined) ? 1 : statsRec.wrongCount + 1;
	    changedStats.correctRun = 0;
	    QuizStats.update({ "userId" : Meteor.userId() }, { $set : changedStats });
	}
    }
});
