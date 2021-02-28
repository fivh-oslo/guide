var map;
var places = {};
var layers = {};
var tableContent = "";
var nav = false;

// from https://github.com/Leaflet/Leaflet.markercluster/issues/904
L.MarkerClusterGroup.include({
    zoomToShowLayer: function(layer, callback) {
	
	var map = this._map;

	if (typeof callback !== 'function') {
	    callback = function() {};
	}

	var showMarker = function() {
    	    //if ((layer._icon || layer.__parent._icon) && !this._inZoomAnimation) {
	    if ((map.hasLayer(layer) || map.hasLayer(layer.__parent)) && !this._inZoomAnimation) {
		map.off('moveend', showMarker, this);
		this.off('animationend', showMarker, this);

		//if (layer._icon) {
		if (map.hasLayer(layer)) {
		    callback();
		} else if (map.hasLayer(layer.__parent)) {
		    this.once('spiderfied', callback, this);
		    layer.__parent.spiderfy();
		}
	    }
	};

	if (map.hasLayer(layer) && map.getBounds().contains(layer.getLatLng())) {
	    //Layer is visible ond on screen, immediate return
	    callback();
	} else if (layer.__parent._zoom < Math.round(map._zoom)) {
	    //Layer should be visible at this zoom level. It must not be on screen so just pan over to it
	    map.on('moveend', showMarker, this);
	    map.panTo(layer.getLatLng());
	} else {
	    map.on('moveend', showMarker, this);
	    this.on('animationend', showMarker, this);
	    layer.__parent.zoomToBounds();
	}
    }
});

function init() {
    map = L.map('map').setView([59.92, 10.75], 13);
    L.tileLayer(
	'https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png',
	{
	    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, ' +
		'&copy; <a href="https://openmaptiles.org/">OpenMapTiles</a>, ' +
		'&copy; <a href="http://openstreetmap.org">OpenStreetMap</a>, ' +
		'made by <a href="mailto:pierrebeauguitte@pm.me">Pierre Beauguitte</a>',
	    maxZoom: 20,
	    minZoom: 11,
	}).addTo(map);
    map.setMaxBounds(L.latLngBounds(L.latLng(60.0716, 10.2434),
				    L.latLng(59.7114, 11.3000)));
    loadPlaces();
}

function makeClusterIcon(type) {
    return function (cluster) {
	return L.divIcon({
	    html: '<div><span>' + cluster.getChildCount() + '</span></div>',
	    className: 'marker-cluster marker-cluster-' + type,
	    iconSize: L.point(40, 40)
	});
    }
}

function draw() {
    for (k in places) {
	layers[k] = L.markerClusterGroup({
	    iconCreateFunction: makeClusterIcon(k),
	    polygonOptions: { color: 'var(--' + k + ')' }
	});
	layers[k].addLayer(L.layerGroup(places[k].map(x => x.marker)));
	layers[k].addTo(map);
    }
}

function show(cat) {
    if (map.hasLayer(layers[cat])) {
        map.removeLayer(layers[cat]);
	document.getElementById("vis_" + cat).innerHTML = "visibility_off";
    } else {
        map.addLayer(layers[cat]);
	document.getElementById("vis_" + cat).innerHTML = "visibility";
    }
}

function toggleView(cb) {
    var sub = document.getElementById(cb);
    if (sub.style.display == 'none')
	sub.style.display = '';
    else
	sub.style.display = 'none';
}

function pop(cat, index) {
    layers[cat].zoomToShowLayer(places[cat][index].marker, () => {
	places[cat][index].marker.openPopup();
    });
    if (nav)
	toggleNav();
}

function hideRows(cat) {
    var rows = document.getElementsByClassName(cat);
    if (places[cat].view === true) {
	for (row of rows)
	    row.style.display = 'none';
	document.getElementById("fold_" + cat).innerHTML = "expand_more";
    }
    else {
	for (row of rows)
	    row.style.display = '';
	document.getElementById("fold_" + cat).innerHTML = "expand_less";
    }
    places[cat].view = !places[cat].view; 
}

var translations = {
    'food': {
	'text': 'Mat',
	'icon': 'restaurant'
    },
    'bike': {
	'text': 'Sykkel',
	'icon': 'pedal_bike'
    },
    'clothes': {
	'text': 'Klær',
	'icon': 'checkroom'
    },
    'tools': {
	'text': 'Verktøyutleie- og utlån',
	'icon': 'handyman'
    },
    'sports': {
	'text': 'Utlån av sportsutstyr',
	'icon': 'downhill_skiing'
    }


}

function createTable() {
    for (cat in places) {
	tableContent += "<tr class='cat_row' " +
	    "style='background-color:var(--" + cat + ")'>\n" +
	    "<td class='placename' style='width: 100%;'><i class='material-icons' style='padding-right:15px;'>" + translations[cat]['icon'] + "</i>" + translations[cat]['text'] + "</td>" +
	    "<td><i class='material-icons'><a class='tbl_ctl' id='vis_" + cat + "' onClick=show('" + cat + "');>visibility</a> " +
	    "<a class='tbl_ctl' id='fold_" + cat +"' onClick=hideRows('" + cat + "');>expand_more</a></i></td>\n" + 
	    "\n</tr>\n"
	var cnt = 0;
	places[cat].view = false;
	for (place of places[cat]) {
	    tableContent += "<tr class='place " + cat +
		"' onClick=pop('" + cat + "'," +
		cnt + "); style='display: none'>\n<td class='placename'>" +
		place['prop']['name'] + "</td>\n" + 
		"<td align='right'><a href='" + place['prop']['website'] +
		"' target='_blank'>➜</a></td>\n</tr>\n";
	    cnt++;
	}
    }
    document.getElementById("tableview").innerHTML = tableContent;
}

function makeIcon(cat) {
    return L.divIcon({
	className: 'custom-div-icon',
	html: "<div style='background-color:var(--" + cat + ");' class='marker-pin'>" +
	    "</div><i class='material-icons'>" + translations[cat]['icon'] + "</i>",
	iconSize: [22, 38],
	iconAnchor: [11, 38],
	popupAnchor: [0, -19]
    });
}

function loadPlaces() {
    $.getJSON("data.json",function(data) {
	L.geoJson(data, {
	    pointToLayer: function(feature,latlng) {
		var marker = L.marker(latlng,
				      {icon: makeIcon(feature.properties.category)});
		marker.bindPopup('<b>' + feature.properties.name + '</b>' +
				 '<p style="padding:0;margin:0;">' + feature.properties.address + '<br/>' +
				 feature.properties.city + '</p>' +
				 '<a target="blank_" href=' + feature.properties.website + '>'
				 + feature.properties.website + "</a>");
		if (!(feature.properties.category in places))
		    places[feature.properties.category] = [];
		places[feature.properties.category].push(
		    {
			'prop': feature.properties,
			'marker': marker
		    }
		);
	    }
	})
	createTable();
	draw();
    });
}

function toggleNav() {
    if (nav) {
	document.getElementById("tablecont").style.width = "";
	document.getElementById("showMenu").style.right = "0px";
	document.getElementById("fold_menu").innerHTML = "navigate_before";
    } else {
	document.getElementById("tablecont").style.width = "var(--tabwidth)";
	document.getElementById("tablecont").style.left = "screen.width - var(--tabwidth)";
	document.getElementById("showMenu").style.right = "var(--tabwidth)";
	document.getElementById("fold_menu").innerHTML = "navigate_next";
    }
    nav = !nav;
}
