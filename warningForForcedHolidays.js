var date = new Date();
var Holidays = [23,24,25,26,27,28];
var isHolidays = false;
var day = date.getDay();
var isDiff = false;

for (var i = 0; i < Holidays.length; i++) {
    if (date.getDate() == Holidays[i]) {
        isHolidays = true;
    }
}

if (isHolidays) {
    var warningSign = '<div class="container">';
    warningSign += '<div class="bd-callout bd-callout-danger">';
    warningSign += '<h4>설날 미운행 안내</h4>';
    warningSign += '<p>현재 보시고 계시는 버스는 1월 24일부터 28일까지 설날 연휴 관계로 운행하지 않습니다.</p>';
    warningSign += '</div></div>';

    $(document).ready(function() {
        $('#warningForDaysInversion').append(warningSign);
    });

    isDiff = true;
}
