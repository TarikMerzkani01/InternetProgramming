
var updateTextOnClock = function (event) {
    const today = new Date();
    var myarr = [
        today.getDate(),
        today.getMonth(),
        today.getFullYear()
    ];
    var myinput = document.getElementById("mydate");
    document.getElementById("myspace").innerHTML = myinput.value;
}
