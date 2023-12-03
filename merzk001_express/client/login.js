
function welcomeAlert() {
    var myalertdiv = document.getElementById("welcomeAlert");
    myalertdiv.classList.remove("collapse");
}

function createAlert() {
    var myalertdiv = document.getElementById("yesAlert");
    myalertdiv.classList.remove("collapse");
}

function removeAlert() {
    var myalertdiv = document.getElementById("yesAlert");
    myalertdiv.classList.add("collapse");
}

function successLogin() {
    let myurl = "http://localhost:9007/login"
    fetch(myurl)
    .then(response => {
        return response.text();
        })
    .then(loginJSON=>{

    })
    .catch(error=> console.log("Request failed",error));
}

function loginClick() {
    var username = document.getElementById("userInput").value;
    var pass = document.getElementById("passInput").value;
    if (!username || !pass) {
        // Doesn't happen since required attribute in html, but still
        // have nevertheless
        alert("Please enter all fields");
        return;
    }
    //remember to CHANGEEEEEEEE
    let myurl = "http://localhost:9007/sendLoginDetails?username="+username+"&password="+pass;
    let successflag = 0;
    fetch(myurl, {method: "POST"})
    .then(response => {
        //alert(response.text);
        return response.text();
        })
    .then(loginJSON=>{
        var reslogin = JSON.parse(loginJSON);
        if (reslogin.status == "success") {
            //alert("WE DID IT!");
            if (!document.getElementById("yesAlert").classList.contains("collapse")) {
                removeAlert();
            }
            welcomeAlert();
            setTimeout(() => {
                location.href = "http://localhost:9007/schedule";
            }
            , 1000);
        } else {
            if (document.getElementById("yesAlert").classList.contains("collapse")) {
                createAlert();
            }
        }

        })
    .catch(error=> console.log("Request failed",error));

    
}

function mystart() {

}

window.addEventListener("load", mystart);