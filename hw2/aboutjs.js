
var updateTextOnClock = function () {
    const today = new Date();
    var myarr = [
        today.getDate(),
        today.getMonth(),
        today.getFullYear()
    ];
    var myinput = document.getElementById("mydate");

    //we can now implement functionality behind date
    //console.log(myarr[0], myarr[1], myarr[2]);
    //
    // Test if valid input using new Date();

    inputdate = new Date(myinput.value);
    //console.log(inputdate.toString());
    inputdate.setHours(0);
    console.log(inputdate);
    const sprompt = document.getElementById("myspace");
    if (inputdate.toString().localeCompare("Invalid Date")==0) {
        sprompt.textContent = "Not a good day!";
        sprompt.style.color = "Red";
        sprompt.style.fontstyle = "italic";
        return;
    }
    //1.15740741E-8
    var timediff = (inputdate.getTime() - today.getTime()) * Number("1.15740741E-8") + 1;
    var timedisp = Math.ceil(timediff);
    //var inarr = [myinput.getDate(), myinput.getMonth(), myinput.getFullYear()];
    //myinput.getDate() DOES NOT WORK
    //console.log(inputdate.getMilliseconds());

    // Number of day is fine
    // Number of month is offset by -1
    // Number of Year is correct
    if (timedisp < 1) {
        sprompt.style.color = "Red";
        sprompt.style.fontstyle = "italic";
        sprompt.innerHTML = "Already happened!";
    } else{
        sprompt.style.color = "Black";
        sprompt.style.fontstyle = "";
        var mystring = timediff == 1 ?  "Day Remaining! So close!" : "Days Remaining!";
        sprompt.innerHTML = timedisp.toFixed(0) +" "+mystring;
    }
    
}

function startDate() {  //Done due to race conditions
    document.getElementById("mydate").addEventListener("keydown", updateTextOnClock);
    document.getElementById("mydate").addEventListener("input", updateTextOnClock);
}

window.onload = startDate;
