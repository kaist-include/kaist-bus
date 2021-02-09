var arrayWeekdaysMidnight = [];
var arrayWeekendsMidnight = [];
var expressWeekdaysMidnight = [];
var expressWeekendsMidnight = [];


// chuseok hotfix
/*
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
    var forcedWeekends = [10, 11];
    var isWeekends = false;
    var isWeekendsYesterday = false;
    var day = date.getDay();

    for (var i = 0; i < forcedWeekends.length; i++) {
        if (date.getDate() == forcedWeekends[i]) {
            isWeekends = true;
        }
        if ((date.getDate() - 1) == forcedWeekends[i]) {
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