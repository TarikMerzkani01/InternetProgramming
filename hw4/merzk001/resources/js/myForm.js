
var map;
var mymarker;

function autocompMarking(map) {
    if (mymarker) mymarker.setMap(null);
    const options = {
        fields: ["formatted_address", "geometry", "name"],
        strictBounds: false,
        types: ["establishment"],
    };


    const locinput = document.getElementById("location");
    const autocomplete = new google.maps.places.Autocomplete(locinput, options);
    autocomplete.bindTo("bounds", map);


    const infowindow = new google.maps.InfoWindow();
    const infowindowContent = document.getElementById("infowindow-content");


    const marker = new google.maps.Marker({
        map,
        anchorPoint: new google.maps.Point(0, -29),
    });

    autocomplete.addListener("place_changed", () => {
        infowindow.close();
        marker.setVisible(false);
    
        const place = autocomplete.getPlace();
    
        if (!place.geometry || !place.geometry.location) {
          // User entered the name of a Place that was not suggested and
          // pressed the Enter key, or the Place Details request failed.
          window.alert("No details available for input: '" + place.name + "'");
          return;
        }
    
        // If the place has a geometry, then present it on a map.
        if (place.geometry.viewport) {
          map.fitBounds(place.geometry.viewport);
        } else {
          map.setCenter(place.geometry.location);
          map.setZoom(10);
        }
    
        marker.setPosition(place.geometry.location);
        marker.setVisible(true);
        infowindow.setContent("<span>"+place.name+"</span>"+"<br>"+"<span>"+place.formatted_address+"</span>");
        infowindowContent.children["place-name"].textContent = place.name;
        infowindowContent.children["place-address"].textContent =
          place.formatted_address;
        infowindow.open(map, marker);
    });
}

function initMap() {
    var myLatLng = {
        lat: 44.9727,
        lng: -93.23540000000003
    };
    map = new google.maps.Map(document.getElementById("map"), {
        center: myLatLng,
        zoom: 14
    });
    autocompMarking(map);

    new ClickEventHandler(map, origin);
}    

function isIconMouseEvent(e) {
    return "placeId" in e;
}

class ClickEventHandler {
    origin;
    map;
    directionsService;
    directionsRenderer;
    placesService;
    infowindow;
    infowindowContent;
    constructor(map, origin) {
        this.origin = origin;
        this.map = map;
        this.placesService = new google.maps.places.PlacesService(map);
        // Listen for clicks on the map.
        this.map.addListener("click", this.handleClick.bind(this));
    }
    handleClick(event) {
        const locinput = document.getElementById("location");
        var mygeocoder = new google.maps.Geocoder();
        mygeocoder.geocode({ location: event.latLng }).then((response) => {
            if (response.results[0]) {
                locinput.value = response.results[0].formatted_address;
                if (mymarker) mymarker.setMap(null);
                mymarker = new google.maps.Marker({
                    position: event.latLng,
                    map: map,
                });
                const infowindow = new google.maps.InfoWindow();
                infowindow.setContent(response.results[0].formatted_address);
                infowindow.open(map, mymarker);
            } else {
                window.alert("No results found");
            }
            })
            .catch((e) => window.alert("Geocoder failed due to: " + e));
        event.stop();
    }    
}

//ADD POI

function mystart() {




}

//window.onload = mystart;
window.addEventListener("load", mystart);