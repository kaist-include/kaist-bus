var date = new Date();
var forcedWeekends = [12, 13];
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

if (isWeekends) {
    var warningSign = '<div class="container">';
    warningSign += '<div class="bd-callout bd-callout-danger">';
    warningSign += '<h4>주중/휴일 재확인</h4>';
    warningSign += '<p>현재 보시고 계시는 시간표는 평일 전용입니다. 탑승하고자 하는 날짜가 평일인 지 다시 한 번 확인해주세요.</p>';
    warningSign += '</div></div>';

    $(document).ready(function() {
        $('#warningForDaysInversion').append(warningSign);
    });

    isDiff = true;
}