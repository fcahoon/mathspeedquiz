MSQ.deps = {};
MSQ.deps.question = new Tracker.Dependency;
MSQ.deps.inProgress = new Tracker.Dependency;

MSQ.getNextQuestion = function (lastQuestion) {
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
    var quizStats = QuizStats.findOne();
    var total = 0;
    if (quizStats === undefined || quizStats.totalAvgTime === undefined) {
	for (var i = 0; i < questions.length; i++) {
	    total += questionTime(questions[i]);
	}
	Meteor.call("insertTotal", total);
    } else {
	total = quizStats.totalAvgTime;
    }
    var newQuestion;
    do {
	var randIdx = Math.random() * total;
	var sum = 0;
	var i;
	for (i = 0; i < questions.length && sum < randIdx; i++) {
	    sum += questionTime(questions[i]);
	}
	newQuestion = questions[i-1];
    } while (lastQuestion !== undefined && newQuestion._id === lastQuestion._id);

    return newQuestion;
};

MSQ.wrongCount = 0;

Meteor.subscribe("questions");
Meteor.subscribe("answer_times");
Meteor.subscribe("quiz_stats");

Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
});

Template.body.helpers({
    inProgress: function () {
	MSQ.deps.inProgress.depend();
	return MSQ.inProgress;
    }
});

Template.question.helpers({
    question: function () {
	MSQ.deps.question.depend();
	if (MSQ.currentQuestion === undefined) MSQ.currentQuestion = MSQ.getNextQuestion(undefined);
	MSQ.questionStart = new Date().getTime();
	return MSQ.currentQuestion;
    }
});

Template.userstats.helpers({
    quizStats: function() {
	var quizStats = QuizStats.findOne();
	if (quizStats !== undefined) {
	    if (quizStats.correctCount !== undefined) {
		if (quizStats.wrongCount === undefined) {
		    quizStats.percentCorrect = 100.0;
		} else {
		    quizStats.percentCorrect =
			((quizStats.correctCount
			  /
			  (quizStats.correctCount + quizStats.wrongCount)
			 )*100).toPrecision(3);
		}
	    } else {
		if (quizStats.wrongCount !== undefined) quizStats.percentCorrect = 0.0;
	    }
	}
	return quizStats;
    }
    
});

Template.question.rendered = function () {
    this.$("input").focus();
}

Template.question.events({

    "click .stop button": function(event) {
	MSQ.inProgress = false;
	MSQ.deps.inProgress.changed();
    },

    "keyup .question input": function (event) {
	var text = event.target.value;
	cleanText = text.replace(/\D/g,"");
	event.target.value = cleanText;
	if (event.keyCode !== 13) return;
	if (text == MSQ.currentQuestion.a) {
	    var answerTime = new Date().getTime() - MSQ.questionStart;
	    Meteor.call("insertAnswerTime", MSQ.currentQuestion._id, MSQ.wrongCount, answerTime);
	    MSQ.currentQuestion = MSQ.getNextQuestion(MSQ.currentQuestion);
	    MSQ.wrongCount = 0;
	    MSQ.deps.question.changed();
	    $("#right").css("display", "block")
	    window.setTimeout(function() { $("#right").css("display", "none") }, 500);
	} else {
	    MSQ.wrongCount++;
	    Meteor.call("recordWrongAnswer");
	    $("#wrong").css("display", "block")
	    window.setTimeout(function() { $("#wrong").css("display", "none") }, 500);
	}
	event.target.value = "";
    }
})

Template.idle.events({
    "click .idle button" : function(event) {
	MSQ.inProgress = true;
	MSQ.deps.inProgress.changed();
    }
})
