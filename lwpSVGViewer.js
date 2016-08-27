
function lwpSVGViewer(svg) // entry point. Call this function from window.onload, giving the target svg.
{
  console.log("lwp library initiated with \"" + svg.id + "\"");

  svg.addEventListener("mousemove", function (evt) { updatemousepos(evt, svg); }); // debug
  window.addEventListener("resize", recalc_size);

  function recalc_size()
  {
    // svg.viewBox.baseVal = svg.getBBox(); // does not work, baseVal object cannot be changed.
    svg.full_width = svg.getBBox().width;
    svg.full_height = svg.getBBox().height;
    svg.viewBox.baseVal.x = svg.getBBox().x; // 0
    svg.viewBox.baseVal.y = svg.getBBox().y; // 0
    svg.viewBox.baseVal.width = svg.full_width; // 1500
    svg.viewBox.baseVal.height = svg.full_height; // 1000

    svg.zoom = Math.min(svg.getBoundingClientRect().width/svg.full_width, svg.getBoundingClientRect().height/svg.full_height);
  }
  recalc_size();
  
  // add sliders and labels
  var slider1 = createSlider("s1", 500);
  var label1 = createLabel("l1", "s1");
  var slider2 = createSlider("s2", 400);
  var label2 = createLabel("l2", "s2");
  label1.innerHTML = "zoom level 1";
  label2.innerHTML = "zoom level 2";
  svg.parentNode.insertBefore(slider1, svg.nextSibling);
  svg.parentNode.insertBefore(label1, slider1.nextSibling);
  svg.parentNode.insertBefore(slider2, label1.nextSibling);
  svg.parentNode.insertBefore(label2, slider2.nextSibling);
  slider1.label = label1;
  slider2.label = label2;
  
  slider1.oninput = function() {slider1.label.innerHTML = "zoom level 1: " + slider1.value;};
  slider2.oninput = function() {slider2.label.innerHTML = "zoom level 2: " + slider2.value;};

  // demo
  slider2.style.opacity=0.5;
  //label2.style.display="none";
  
  
  // add svg event listeners
  svg.addEventListener("mousedown", m_down);
  svg.addEventListener("mouseup", m_up);
  
  svg.addEventListener("dblclick", function() {console.log("dblclick detected");});

// configs
  var click_threshold = 10; // x, y distance of movement to "unregister" a click "event".
  var anim_interpolation_fn = function(delta) { // delta = {x: delta_x, y: delta_y}
    var transition_frames = 15;

    var interpolate_x = [];
    var interpolate_y = [];
    for (var i=0; i<transition_frames; i++)
    {
      interpolate_x[i] = svg.viewBox.baseVal.x + (i+1)*(delta.x - svg.viewBox.baseVal.x)/transition_frames;
      interpolate_y[i] = svg.viewBox.baseVal.y + (i+1)*(delta.y - svg.viewBox.baseVal.y)/transition_frames;
    }
    return {x: interpolate_x, y: interpolate_y};
  };


  var client_pan_origin_x = null;
  var client_pan_origin_y = null;
  var svg_pan_origin_x = null;
  var svg_pan_origin_y = null;
  var svg_viewbox_origin_x = null;
  var svg_viewbox_origin_y = null;
  var pan_click = null; // true => pan, false => click

  function m_down(e)
  {
    console.log("mousedown");

    client_pan_origin_x = e.clientX;
    client_pan_origin_y = e.clientY;
    var to_svg_coords = toSVGCoords({x: e.clientX, y: e.clientY});
    svg_pan_origin_x = to_svg_coords.x;
    svg_pan_origin_y = to_svg_coords.y;
    svg_viewbox_origin_x = svg.viewBox.baseVal.x;
    svg_viewbox_origin_y = svg.viewBox.baseVal.y;
    pan_click = false;

    svg.addEventListener("mousemove", panning);
  }
  function panning(e)
  {
    if (
      (Math.abs(client_pan_origin_x-e.clientX)>click_threshold) ||
      (Math.abs(client_pan_origin_y-e.clientY)>click_threshold) )
    {
      pan_click = true;
    }
    do_pan(e);
  }
  function do_pan(e)
  {

    var client_pan_delta_x = e.clientX - client_pan_origin_x;
    var client_pan_delta_y = e.clientY - client_pan_origin_y;

    var svg_pan_delta_x = Math.round(client_pan_delta_x / svg.zoom);
    var svg_pan_delta_y = Math.round(client_pan_delta_y / svg.zoom);

    //console.log(pan_click + ": is panning\n" + svg_pan_delta_x + "," + svg_pan_delta_y);
    svg.viewBox.baseVal.x = Math.round(svg_viewbox_origin_x - svg_pan_delta_x);
    svg.viewBox.baseVal.y = Math.round(svg_viewbox_origin_y - svg_pan_delta_y);
  }
  function m_up(e)
  {
    console.log("mouse up");
    svg.removeEventListener("mousemove", panning);
    client_pan_origin_x = null;
    client_pan_origin_y = null;
    svg_pan_origin_x = null;
    svg_pan_origin_y = null;
    svg_viewbox_origin_x = null;
    svg_viewbox_origin_y = null;
    if (!pan_click)
    {
      console.log(pan_click + ": click detected");
      autopan(e.clientX, e.clientY)
    }
    pan_click = null;
  }
  function autopan(tx, ty)
  {
    var element_centre_client_x = svg.getBoundingClientRect().left + svg.getBoundingClientRect().width/2;
    var element_centre_client_y = svg.getBoundingClientRect().top + svg.getBoundingClientRect().height/2;
    var autopan_delta_client_x = tx - element_centre_client_x;
    var autopan_delta_client_y = ty - element_centre_client_y;

    var autopan_delta_svg_x = svg.viewBox.baseVal.x + autopan_delta_client_x / svg.zoom;
    var autopan_delta_svg_y = svg.viewBox.baseVal.y + autopan_delta_client_y / svg.zoom;

    //  console.log("delta, client coords: " + autopan_delta_client_x + "," + autopan_delta_client_y + "\n" +
    //              "delta, svg coords: " + autopan_delta_svg_x + "," + autopan_delta_svg_y);

    var counter = 0;
    function animate()
    {
      svg.removeEventListener("mousedown", m_down); // do not take further input till animation finishes
      svg.removeEventListener("mouseup", m_up);
      var interpolated = anim_interpolation_fn({x: autopan_delta_svg_x, y: autopan_delta_svg_y});
      if (counter < interpolated.x.length)
      {
        svg.viewBox.baseVal.x = Math.round(interpolated.x[counter]);
        svg.viewBox.baseVal.y = Math.round(interpolated.y[counter]);
        counter++;
        window.requestAnimationFrame(animate);
      } else {
        svg.addEventListener("mousedown", m_down);
        svg.addEventListener("mouseup", m_up);
      }
    }
    animate();
  }


  // additional functions

  function toSVGCoords(client_coords_obj)
  {
    var elem_x = client_coords_obj.x - svg.getBoundingClientRect().left;
    var elem_y = client_coords_obj.y - svg.getBoundingClientRect().top;

    var viewbox_l = svg.viewBox.baseVal.x;
    var viewbox_t = svg.viewBox.baseVal.y;

    var viewbox_x = Math.round( elem_x/svg.zoom + viewbox_l );
    var viewbox_y = Math.round( elem_y/svg.zoom + viewbox_t );

    return {x: viewbox_x, y: viewbox_y}; // viewbox_x and viewbox_y are the coordinates in scaled svg-space
  }

  function createSlider(an_id, width_in_px)
  {
    var a_slider = document.createElement("input");
    a_slider.type = "range";
    a_slider.style.width = width_in_px + "px";
    a_slider.id = an_id;
    return a_slider;
  }
  function createLabel(an_id, for_id)
  {
    var a_label = document.createElement("label");
    a_label.id = an_id;
    a_label.htmlFor = for_id;
    var a_txt = document.createTextNode("meow");
    a_label.appendChild(a_txt);
    return a_label;
  }
  // <input id="a_slider" type="range" style="width: 500px;"><label id="zoomlabel" for="a_slider">zoom level</label><br>
}

/*
function createSliderAfter(target_id, slider_id, width_in_px, text_label)
{
    var a_slider = document.createElement("input");
    a_slider.type = "range";
    a_slider.style.width = width_in_px + "px";
    a_slider.id = slider_id;
    
    var a_label = document.createElement("label");
    a_label.htmlFor = slider_id;
    var a_txt = document.createTextNode(text_label);
    a_label.appendChild(a_txt);
    
    a_slider.label = a_label;
    
    svg.parentNode.insertBefore(slider1, svg.nextSibling);
    
}
*/
















// debug
function updatemousepos(e, svg)
{
  var client_x = e.clientX;
  var client_y = e.clientY;

  var elem_l = svg.getBoundingClientRect().left;
  var elem_t = svg.getBoundingClientRect().top;
  var elem_x = client_x - elem_l;
  var elem_y = client_y - elem_t;

  var elem_w = svg.getBoundingClientRect().width;
  var elem_h = svg.getBoundingClientRect().height;

  var viewbox_l = svg.viewBox.baseVal.x;
  var viewbox_t = svg.viewBox.baseVal.y;
  var viewbox_w = svg.viewBox.baseVal.width;
  var viewbox_h = svg.viewBox.baseVal.height;

  var viewbox_x = Math.round( (elem_x/elem_w) * viewbox_w + viewbox_l );
  var viewbox_y = Math.round( (elem_y/elem_h) * viewbox_h + viewbox_t );

  // debug view
  document.getElementById("client_coords").innerHTML = client_x + "," + client_y;
  document.getElementById("elem_coords").innerHTML = elem_x + "," + elem_y;
  document.getElementById("svg_coords").innerHTML = viewbox_x + "," + viewbox_y;
  document.getElementById("elem_prop").innerHTML = elem_l + "," + elem_t + "," + elem_w + "," + elem_h;
  document.getElementById("svg_prop").innerHTML = svg.full_width + "," + svg.full_height;
  document.getElementById("viewbox_prop").innerHTML = viewbox_l + "," + viewbox_t + "," + viewbox_w + "," + viewbox_h;
  document.getElementById("zoom_value").innerHTML = svg.zoom;
}
