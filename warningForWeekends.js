var date = new Date();
var forcedWeekends = [15];
var isWeekends = false;
var day = date.getDay();
var isDiff = false;

for (var i = 0; i < forcedWeekends.length; i++) {
    if (date.getDate() == forcedWeekends[i]) {
        isWeekends = true;
    }
}

if (day == 0 || day == 6) {
    isWeekends = true;
}

if (!isWeekends) {
    var warningSign = '<div class="container">';
    warningSign += '<div class="alert alert-danger" style="margin-top:12px;">';
    warningSign += '<strong>주중/휴일 재확인</strong><br>';
    warningSign += '<span style = "margin-bottom:2px; font-size: 0.78rem;" >현재 보시고 계시는 시간표는 휴일 전용입니다.</span><br>';
    warningSign += '<span style = "margin-bottom:2px; font-size: 0.78rem;" >탑승하고자 하는 날짜가 주말이거나 공휴일이 맞는지 다시 한 번 확인해주세요.</span>';
    warningSign += '</div></div>';

    $(document).ready(function() {
        $('#warningForDaysInversion').append(warningSign);
    });

    isDiff = true;
}