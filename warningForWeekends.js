var date = new Date();
var forcedWeekends = [];
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
    warningSign += '<div class="bd-callout bd-callout-danger">';
    warningSign += '<h4>주중/휴일 재확인</h4>';
    warningSign += '<p>현재 보시고 계시는 시간표는 휴일 전용입니다. 탑승하고자 하는 날짜가 휴일인 지 다시 한 번 확인해주세요. 2020년 설날 관계로 24일부터 28일까지 캠퍼스 순환 노선은 휴일 노선표를 따르고, OLEV, 월평순환, 통근버스는 운행되지 않습니다.</p>';
    warningSign += '</div></div>';

    $(document).ready(function() {
        $('#warningForDaysInversion').append(warningSign);
    });

    isDiff = true;
}