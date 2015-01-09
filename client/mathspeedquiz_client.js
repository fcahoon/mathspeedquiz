MSQ.deps = {};
MSQ.deps.question = new Tracker.Dependency;
MSQ.deps.inProgress = new Tracker.Dependency;
MSQ.questionCallback = function (error, result) {
    if (error) console.log("Error received by MSQ.questionCallback: " + error);
    MSQ.currentQuestion = result;
    MSQ.deps.question.changed();
};
//Meteor.call("nextQuestion", MSQ.questionCallback); // initialize first question


/*
MSQ.nextQuestion = function() {
    var questions = Questions.find().fetch();
    var randIdx = Math.floor(Math.random() * questions.length);
    return questions[randIdx];
}
*/
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
	if (MSQ.currentQuestion === undefined) Meteor.call("nextQuestion", MSQ.questionCallback);
	MSQ.questionStart = new Date().getTime();
	return MSQ.currentQuestion;
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
	    Meteor.call("insertAnswerTime", MSQ.currentQuestion._id, answerTime);
	    Meteor.call("nextQuestion", MSQ.questionCallback);
	    $("#right").css("display", "block")
	    window.setTimeout(function() { $("#right").css("display", "none") }, 500);
	} else {
	    $("#wrong").css("display", "block")
	    window.setTimeout(function() { $("#wrong").css("display", "none") }, 500);
	    MSQ.questionStart -= MSQ.WRONG_PENALTY; // Push back start time to effect wrong penalty
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
