
var getByClass = function(cl) { return document.getElementsByClassName(cl);}

var map;
var allthemarkers = [];
var directionsService;
var directionsRenderer;

function hidebtntoggle() {
    // Toggles between hide and show. Changes button appropriately
    // TO CHANGEE
    const myimg = document.getElementById("displayimg");
    const mybtn = document.getElementById("togglehide");
    myimg.classList.toggle("hidden");
    if (mybtn.textContent === "Hide Image") {
        mybtn.textContent = "Show Image";
        mybtn.style.backgroundColor = "rgb(214, 255, 199)";
    } else if (mybtn.textContent === "Show Image") {
        mybtn.textContent = "Hide Image";
        mybtn.style.backgroundColor = "rgb(255, 199, 252)";
    }
}

function showBigPic(imgsrc, txt, id) {
    // displays the big picture on mouseover of the 1st 
    // paragraph element "A paragraph with a picture" in the body below
    var bigpic = document.getElementById(id);
    bigpic.src = imgsrc;
    bigpic.alt = txt;
}

/* ================== MAP STUFF ================== */

//Function for adding a marker given an object containing coords, iconImage, and content
//Source: https://www.youtube.com/watch?v=Zxf1mnP5zcw
function addMyMarker(descloc, map) {
    var mymarker = new google.maps.Marker({
        position: descloc.coords,
        map:map,
        title: descloc.address
    });
    if (descloc.iconImage) {
        mymarker.setIcon({url: descloc.iconImage,
            scaledSize: new google.maps.Size(20,20)
        });
    }
    //create function that makes content
    allthemarkers.push(mymarker);
    return mymarker;
    //Adds listener so displays window once marker is clicked
    // mykeyloc = descloc.coords.lat +", "+descloc.coords.lng;
    // loclist[mykeyloc] = mymarker;
}

function clearMarkers() {
    if (allthemarkers.length != 0) {
        for(let i = 0; i < allthemarkers.length; i++) {
            allthemarkers[i].setMap(null);
        }
    }
}

function addMarkerContent(mymarker, mycontent, map) {
    var infoWindow = new google.maps.InfoWindow({
        content: mycontent
    });
    mymarker.addListener('click', function() {
        infoWindow.open(map,mymarker);
    });
}

function geocodeMarkers(locNames, myloccontent, map) {
    var geocoder = new google.maps.Geocoder(); // Create a geocoder object
    for(let i = 0; i < locNames.length; i++) {
        geocoder.geocode({'address': locNames[i]}, function(results, status) {
			if (status === google.maps.GeocoderStatus.OK) {
                foundloc = {
                    coords: results[0].geometry.location, 
                    iconImage: "Goldy.png", 
                    address: locNames[i]
                };
                var placedmark = addMyMarker(foundloc, map);
                addMarkerContent(placedmark, myloccontent[locNames[i]],map);
			}
        });
    }
}

function setAllMarkersFromSched(map) {
    //dictionary of addresses with their content to be shown on infoWindow
    myloccontent = {};
    
    //fetch all names, times, and locations for my events. Three arrays for each.
    //We obtain first all DOM nodes
    var eventNames = Array.from(document.getElementsByClassName('EvName'));
    var eventTimes = Array.from(document.getElementsByClassName('EvTime'));
    var eventLocs = Array.from(document.getElementsByClassName('EvLoca'));
    //each should be exactly the same length
    //extract Names, Times, and locations to put into content

    var locNames = [];  // unique location names (no duplicates)

    for(let i = 0; i < eventLocs.length; i++) {
        //build contententry as we add to locNames
        var contententry = "";
        var completeaddress = eventLocs[i].textContent.trim();
        var theName = eventNames[i].textContent.trim();
        var theTime = eventTimes[i].textContent.trim();
        if (locNames.includes(completeaddress)) {
            //if location already repeated, then just add to contententry
            if(!(myloccontent[completeaddress].includes(theName))) {
                //for events with same name that happen in different days
                contententry += "<p>"+theName+"</p>"   //line break over here
                + "<p>"+theTime+"</p>"
                + "<p>---------</p>";
                myloccontent[completeaddress] += contententry;
            }
        } else {
            //new location, then push to locNames, build new contententry to put in
            //dictionary
            locNames.push(completeaddress);
            contententry += "<h3>"+completeaddress+"</h3>"
                + "<p>"+theName+"</p>"   //line break over here
                + "<p>"+theTime+"</p>"
                + "<p>---------</p>";
            
            myloccontent[completeaddress] = contententry;
            //start a new content entry for the address
        }
    } 

    //USE GEO LOCATION HERE:
    //NOW WE DO GEOCODER just to get the LatLng of each address
    geocodeMarkers(locNames, myloccontent, map);
    
    //After above function, all markers should be placed at each unique location.
    //Each marker has an infoWindow when clicked that provides all unique events
    //  that happen at that location
    
    return 0;
}

function yieldTable(response) {
    //response.routes[0].legs[0].steps //array of steps
    var mytable = document.getElementById("tableofdirs");
    //we can now inject html into this
    const mysteps = response.routes[0].legs[0].steps;
    myhtml = "";
    if (mysteps.length != 0) {
        for (let i= 0; i < mysteps.length; i++){
            mysteps[i];
            myhtml += "<tr>";
            myhtml += "<td>"+(i+1)+".</td>";
            myhtml += "<td>"+mysteps[i].instructions+"</td>";
            myhtml += "</tr>";
        }
    }
    mytable.innerHTML = myhtml;
}

function findDirection(myposition) {
    //obtain source
    var mysource = new google.maps.LatLng(myposition.latitude, myposition.longitude);
    mysource = "609 Oak St SE, Minneapolis, Minnesota";
    var mydest = document.getElementById("addresstext").value;
    var radiobuts = document.getElementsByName('transportation');
    var mode;
    for(i = 0; i < radiobuts.length; i++) {
        if(radiobuts[i].checked) {
            mode = radiobuts[i].value;
        }
    }
    if (mydest) {
        directionsService.route(
            {
                origin: mysource,
                destination: mydest,
                travelMode: mode
            }, (response, status) => {
                if (status ==="OK"){
                    directionsRenderer.setDirections(response);
                    //add code here:
                    
                    yieldTable(response);
                    
                    directionsRenderer.setMap(map);
                    clearMarkers();
                } else {
                    setAllMarkersFromSched(map);
                    directionsRenderer.setMap(null);
                }
            }
        )
    } else {
        setAllMarkersFromSched(map);
        directionsRenderer.setMap(null);
    }
}

function getOwn() {
    if (navigator.geolocation) {
        myposition = navigator.geolocation.getCurrentPosition(findDirection);
    }
}

// INIT MAP
function initMap() {
    var myLatLng = {
        lat: 44.9727,
        lng: -93.23540000000003
    };
    map = new google.maps.Map(document.getElementById("map"), {
        center: myLatLng,
        zoom: 14
    });
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    setAllMarkersFromSched(map);
}

function mystart() {
    const mybtn = document.getElementById("togglehide");
    mybtn.addEventListener("click", hidebtntoggle);
    const gobtn = document.getElementById("directionGo");
    gobtn.addEventListener("click", getOwn);
}

//window.onload = mystart;
window.addEventListener("load", mystart);



















//   #/////////////////////////////////// TRASH CODE ///////////////////////////////////#
/* JQUERY VERSION DO NOT USE
function hidebtnjq() {
    $myimg = $(document.getElementById("displayimg"));
    $("#togglehide").click(function() {
        $myimg.fadeToggle("normal");
        if ($("#togglehide").html() == "Show Image"){
            $("#togglehide").html("Hide Image");
        } else {
            $("#togglehide").html("Show Image");
        }
    });
}
*/