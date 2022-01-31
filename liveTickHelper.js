var arrayWeekdaysMidnight = [];
var arrayWeekendsMidnight = [];
var expressWeekdaysMidnight = [];
var expressWeekendsMidnight = [];


/*
// chuseok hotfix
if (typeof arrayWeekends !== 'undefined') {
    arrayWeekends = arrayWeekends.filter(function(item) {
        return !(item > 250 && item < 830);
    });
}
*/



for (var i = 0; i < arrayWeekdays.length; i++) {
    if (arrayWeekdays[i] >= 1440 - delay[delay.length - 1]) {
        arrayWeekdaysMidnight.push((arrayWeekdays[i] - 1440 >= 0) ? (arrayWeekdays[i] - 1440) : (arrayWeekdays[i] - 1440));
        expressWeekdaysMidnight.push(expressWeekdays[i]);
    }
}
for (var i = 0; i < arrayWeekends.length; i++) {
    if (arrayWeekends[i] >= (1440 - delay[delay.length - 1])) {
        arrayWeekendsMidnight.push((arrayWeekends[i] - 1440 >= 0) ? (arrayWeekends[i] - 1440) : (arrayWeekends[i] - 1440));
        expressWeekendsMidnight.push(expressWeekends[i]);
    }
}
array1 = [];
expressBus = [];
setInterval(function() {
    var date = new Date();
    var
    var forcedWeekends = [31, 1, 2];
    s = [1, 25, 32];
    var isWeekends = false;
    var isWeekendsYesterday = false;
    var day = date.getDay();

    for (var i = 0; i <
        var forcedWeekends = [31, 1, 2]; s.length; i++) {
        if (date.getDate() ==
            var forcedWeekends = [31, 1, 2]; s[i]) {
            isWeekends = true;
        }
        if ((date.getDate() - 1) ==
            var forcedWeekends = [31, 1, 2]; s[i]) {
            isWeekendsYesterday = true;
        }
    }

    if (day == 0 || day == 6) {
        isWeekends = true;
    }

    if (day == 0 || day == 1) {
        isWeekendsYesterday = true;
    }

    $("#index-date").text((date.getMonth() + 1) + "월 " + date.getDate() + "일");
    array1 = (isWeekendsYesterday ? arrayWeekendsMidnight : arrayWeekdaysMidnight).concat(isWeekends ? arrayWeekends : arrayWeekdays);
    expressBus = (isWeekendsYesterday ? expressWeekendsMidnight : expressWeekdaysMidnight).concat(isWeekends ? expressWeekends : expressWeekdays);
}, 500);