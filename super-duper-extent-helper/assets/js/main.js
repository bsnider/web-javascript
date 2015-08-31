var map, layerExtent;
var json;
var basemapString = "dark-gray";

require([
  "esri/map", "esri/dijit/Scalebar", "application/bootstrapmap", "esri/dijit/BasemapGallery", "esri/arcgis/utils", "dojo/parser",
  "esri/graphic", "esri/geometry/webMercatorUtils", "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleFillSymbol", "esri/geometry/Point",
  "esri/dijit/Search", "dojo/_base/Color", "dojo/_base/json",
  "dojo/dom", "dojo/on", "dojo/number", "esri/layers/ArcGISDynamicMapServiceLayer",
  "esri/layers/FeatureLayer", "esri/layers/GraphicsLayer", "esri/toolbars/draw", "esri/geometry/Extent",
  "dijit/layout/BorderContainer", "dijit/layout/ContentPane", "dijit/TitlePane",
  "dojo/domReady!"
], function(
  Map, Scalebar, BootstrapMap, BasemapGallery, arcgisUtils, parser,
  Graphic, webMercatorUtils, SimpleMarkerSymbol,
  SimpleLineSymbol, SimpleFillSymbol, Point,
  Search, Color, Json,
  dom, on, number, ArcGISDynamicMapServiceLayer, FeatureLayer, GraphicsLayer, DrawToolbar, Extent
) {
  $(document).ready(function() {

    // ADD BASICS - map, layers, scalebar, draw, and search widgets //////////////////

    parser.parse();

    map = BootstrapMap.create("mapDiv", {
      basemap: "dark-gray",
      center: [-88.163, 41.739],
      zoom: 12,
      scrollWheelZoom: true
    });
    // add the scalebar
    // var scalebar = new Scalebar({
    //   map: map,
    //   scalebarUnit: "dual"
    // });

    // add and start the geocoding widget
    var s = new Search({
      enableButtonMode: true, //this enables the search widget to display as a single button
      enableLabel: false,
      enableInfoWindow: true,
      showInfoWindowOnSelect: false,
      map: map
    }, "search");
    s.startup();

    // add an example map service to automatically zoom to
    var layer = new ArcGISDynamicMapServiceLayer("http://sampleserver6.arcgisonline.com/arcgis/rest/services/WindTurbines/MapServer");
    map.addLayer(layer);
    layer.on("load", function() {
      map.setExtent(layer.fullExtent);
    });

    // other sample services:
    // http://sampleserver6.arcgisonline.com/arcgis/rest/services/WindTurbines/MapServer
    // http://sampleserver6.arcgisonline.com/arcgis/rest/services/ServiceRequest/MapServer
    // http://sampleserver6.arcgisonline.com/arcgis/rest/services/NapervilleShelters/MapServer

    // add a graphics layer for the extent box
    var GLayer = new GraphicsLayer();

    // BASICS \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
    // EVENTS ////////////////////////////////////////////////////////////////////////

    map.on("load", initDrawToolbar);
    map.on("load", showAttributes);
    map.on("click", drawCenter);
    map.on("mouse-move", showMouseCoords);
    map.on("extent-change", showAttributes);

    $("#mapParamsBtn").click(selectText);
    $("#ExtentWMBtn").click(selectText);
    $("#CenterWMBtn").click(selectText);
    $("#ExtentGeogBtn").click(selectText);
    $("#CenterGeogBtn").click(selectText);

    $("#JSONZoomBtn").click(zoomToExtent);
    $("#pointZoomBtn").click(zoomToPoint);

    // EVENTS \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
    // DRAW EXTENT ///////////////////////////////////////////////////////////////////

    function initDrawToolbar() {
      map.infoWindow.resize(600, 700);
      tb = new DrawToolbar(map);
      $("#extentBtn").click(function() {
        tb.on("draw-end", addGraphic);
        tb.activate("extent");
        map.setMapCursor("crosshair");
      });
    }

    // add the graphic, determine its extent and display the popup
    function addGraphic(evt) {
      //deactivate the toolbar and clear existing graphics
      tb.deactivate();
      map.enableMapNavigation();

      var GLayer = new GraphicsLayer();
      map.addLayer(GLayer);
      GLayer.add(new Graphic(evt.geometry, fillSymbol));

      var extentWebMerc = evt.geometry;
      var JSONWebMerc = JSON.stringify(extentWebMerc, null, 4);

      var extentGeog = webMercatorUtils.webMercatorToGeographic(evt.geometry);
      var JSONGeog = JSON.stringify(extentGeog, null, 4);

      var infoWinTable = "<div class=\"row\"><div class=\"col-xs-6\">Web Mercator<span data-toggle=\"tooltip\" data-placement=\"top\" title=\"Copy to clipboard\"><button id=\"drawMercBtn\" class=\"btn btn-default\" data-toggle=\"modal\" data-target=\"#copyModal\"><i class=\"fa fa-clipboard\"></i></button></span></div>" + "<div class=\"col-xs-6\">Geographic Coordinates <span data-toggle=\"tooltip\" data-placement=\"top\" title=\"Copy to clipboard\"><button id=\"drawGeogBtn\" class=\"btn btn-default\" data-toggle=\"modal\" data-target=\"#copyModal\"><i class=\"fa fa-clipboard\"></i></button></span></div></div>" + "<div class=\"row\"><div class=\"col-xs-6 drawPreWrap\"><pre id=\"drawMercText\">" + JSONWebMerc + "</pre></div>" + "<div class=\"col-xs-6\"><pre id=\"drawGeogText\">" + JSONGeog + "</pre></div></div>";
      map.infoWindow.setTitle("JSON Extent");
      map.infoWindow.setContent(infoWinTable);
      var point = new Point();
      var xMid = (evt.geometry.xmin + (evt.geometry.xmax * 4)) / 5;
      var yMid = (evt.geometry.ymin + (evt.geometry.ymax * 3)) / 4;
      point.spatialReference.wkid = 3857;
      point.x = xMid;
      point.y = yMid;

      map.infoWindow.show(point);
      $("#drawMercBtn").click(selectText);
      $("#drawGeogBtn").click(selectText);

      map.infoWindow.on("hide", function() {
        GLayer.clear();
      });
      map.on("click", function() {
        GLayer.clear();
        map.infoWindow.hide();
      });
      map.setMapCursor("default");
    }

    // fill symbol used for extent
    var fillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
      new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color('#000'),
        1
      ), new Color([111, 0, 255, 0.15])
    );

    // DRAW EXTENT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
    // CENTER POINT ///////////////////////////////////////////////////////////////////////

    // create center symbol
    symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 20,
      new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
        new Color([226, 230, 62]), 1.5),
      new Color([215, 25, 25, 0.5]));

    // add center graphic
    function drawCenter(evt) {
      map.graphics.clear();
      map.graphics.add(new Graphic(evt.mapPoint, symbol));
      map.centerAt(evt.mapPoint);
    }

    // CENTER POINT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
    // COPY TEXT //////////////////////////////////////////////////////////////////////////

    // reference: https://developers.google.com/web/updates/2015/04/cut-and-copy-commands?hl=en
    function selectText(evt) {
      window.getSelection().removeAllRanges()
      var btnId = evt.toElement.id;
      var id = btnId.substring(0, btnId.length - 3);
      var textId = "#" + id + "Text";
      console.log(textId);
      console.log("drawMercText");
      //var copyTextarea = $(textId);
      var copyTextarea = document.querySelector(textId);
      var range = document.createRange();
      range.selectNode(copyTextarea);
      window.getSelection().addRange(range);
      try {
        // Now that we've selected the anchor text, execute the copy command
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
        console.log('Copy email command was ' + msg);
      } catch (err) {
        console.log('Oops, unable to copy');
      }
      // Remove the selections - NOTE: Should use
      // removeRange(range) when it is supported
      window.getSelection().removeAllRanges();
    }

    // COPY TEXT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
    // SHOW MOUSE COORDS //////////////////////////////////////////////////////////////////

    function showMouseCoords(evt) {
      //the map is in web mercator but display coordinates in geographic (lat, long)
      var mp = webMercatorUtils.webMercatorToGeographic(evt.mapPoint);
      //display mouse coordinates
      var mouseCoordsMerc = "Web Mercator: (" + evt.mapPoint.x.toFixed(3) + ", " + evt.mapPoint.y.toFixed(3) + ")";
      var mouseCoords = "Lat/long: (" + mp.x.toFixed(3) + ", " + mp.y.toFixed(3) + ")";
      $("#MouseText").html("<b>Mouse Location</b>\n" + mouseCoordsMerc + "\n" + mouseCoords);
    }

    // SHOW MOUSE COORDS \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
    // UPDATE SIDEBAR /////////////////////////////////////////////////////////////////////

    function showAttributes() {
      map.graphics.clear();
      var centerMercator = map.extent.getCenter();
      var centerMercatorX = dojo.number.parse((dojo.number.format(centerMercator.x, {
        places: 3
      })));
      var centerMercatorY = dojo.number.parse((dojo.number.format(centerMercator.y, {
        places: 3
      })));

      var extentWebMerc;
      if (typeof map.extent.cache != "undefined") {
        extentWebMerc = map.extent.cache._parts[0].extent;
      } else if (typeof map.extent._parts != "undefined") {
        extentWebMerc = map.extent._parts[0].extent;
      } else {
        extentWebMerc = map.extent //._parts[0].extent;
      }
      var JSONWebMerc = JSON.stringify(extentWebMerc, null, 4);

      var centerGeographic = webMercatorUtils.webMercatorToGeographic(centerMercator);
      var centerGeographicX = dojo.number.parse((dojo.number.format(centerGeographic.x, {
        places: 3
      })));
      var centerGeographicY = dojo.number.parse((dojo.number.format(centerGeographic.y, {
        places: 3
      })));

      var extentGeog = webMercatorUtils.webMercatorToGeographic(map.extent);
      var JSONGeog = JSON.stringify(extentGeog, null, 4);

      var graphic = new Graphic(centerMercator, symbol);
      map.graphics.add(graphic);

      var mapParams = "map = new Map(" + "'map'" + ", {" + "<br>" + "&nbsp;&nbsp;&nbsp;basemap: " + '"' + basemapString + '"' + "," + "<br>"
        //+ "basemap: " + '"' + basemapString + '"' + "," + "<br>"
        + "&nbsp;&nbsp;&nbsp;center:  " + "[" + centerGeographicX + ", " + centerGeographicY + "]," + "<br>" + "&nbsp;&nbsp;&nbsp;zoom: " + map.getZoom() + "<br>" + "});";
      $("#mapParamsText").html(mapParams);

      var centerWebMerc = "(" + centerMercatorX + ", " + centerMercatorY + ")";
      var centerGeog = "(" + centerGeographicX + ", " + centerGeographicY + ")";

      $("#ExtentWMText").html(JSONWebMerc);
      $("#CenterWMText").html(centerWebMerc);

      $("#ExtentGeogText").html(JSONGeog);
      $("#CenterGeogText").html(centerGeog);
    }

    // UPDATE SIDEBAR \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
    // NEW SERVICE/JSON EXTENT/POINT/BASEMAP ////////////////////////////////////////////////////

    // Zoom to new extent
    function zoomToExtent() {
      var currentExtent = map.extent;
      var newJSON = $("#inputJSON");
        try {
      var extent = new Extent(JSON.parse(newJSON.val()));
      console.log(extent);

        map.setExtent(extent);
        console.log("null");

      } catch (err) {
        map.setExtent(currentExtent);
      }
    }

    // Zoom to point
    function zoomToPoint() {
      var currentExtent = map.extent;
      var checkedValue = parseFloat($("input:checked").val());
      var newPointX = parseFloat($("#inputXPoint").val());
      var newPointY = parseFloat($("#inputYPoint").val());
      var newZoomLevel = parseFloat($("#inputZoomPoint").val());
      var newPoint = new Point({
        "x": newPointX,
        "y": newPointY,
        "spatialReference": {
          "wkid": checkedValue
        }
      });
      if (checkedValue == 4326) {
        newPoint = webMercatorUtils.geographicToWebMercator(newPoint);
      }
      map.centerAndZoom(newPoint, newZoomLevel);
      if (map.extent.xmin == null) {
        map.setExtent(currentExtent);
      }

    }

    // Update map service
    $("#serviceBtn").click(function() {
      map.removeLayer(layer);
      var newLayerUrl = $("#serviceInput").val();
      console.log($("#serviceInput").html());

      //newLayerButton.on("click", function() {
      layer = new ArcGISDynamicMapServiceLayer(newLayerUrl);
      map.addLayer(layer);
      layer.on("load", function() {
        layerExtent = layer.fullExtent;
        console.log(newLayerUrl);
        map.setExtent(layer.initialExtent);
      });
    });

    $("#serviceModalBtn").click(function() {
      // show Modal
      $('#serviceModal').modal();
    });

    $("#basemapList li").click(function(e) {
      switch (e.target.text) {
        case "Streets":
          map.setBasemap("streets");
          basemapString = "streets";
          break;
        case "Imagery":
          map.setBasemap("satellite");
          basemapString = "satellite";
          break;
        case "Imagery with Labels":
          map.setBasemap("hybrid");
          basemapString = "hybrid";
          break;
        case "National Geographic":
          map.setBasemap("national-geographic");
          basemapString = "national-geographic";
          break;
        case "Topographic":
          map.setBasemap("topo");
          basemapString = "topo";
          break;
        case "Gray":
          map.setBasemap("gray");
          basemapString = "gray";
          break;
        case "Open Street Map":
          map.setBasemap("osm");
          basemapString = "osm";
          break;
        case "Oceans":
          map.setBasemap("oceans");
          basemapString = "oceans";
          break;
        case "Dark Gray":
          map.setBasemap("dark-gray");
          basemapString = "dark-gray";
          break;
      }
      showAttributes();
    });

    // UPDATE SIDEBAR \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
    // NEW SERVICE/JSON EXTENT/POINT/BASEMAP ////////////////////////////////////////////////////

  });

  // READY \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

});
