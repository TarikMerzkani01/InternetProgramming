
var $ = function(id) { return document.getElementById(id);}
var getByClass = function(cl) { return document.getElementsByClassName(cl);}
// displays the big picture on mouseover of the 1st 
// paragraph element "A paragraph with a picture" in the body below
function showBigPic(imgsrc, txt, id) {
    //window.alert("got to showBigPic number is " + num);
    var bigpic = document.getElementById(id);
    bigpic.src = imgsrc;
    bigpic.alt = txt;
}