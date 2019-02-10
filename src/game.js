"use strict";

var CANVAS = document.createElement("canvas");
var CTX = CANVAS.getContext("2d");
CANVAS.width = 480;
CANVAS.height = 640;
CANVAS.className = "canv";
document.body.appendChild(CANVAS);

function renderUpdate(){
	CTX.fillStyle = "gray";
	CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
	
	requestAnimationFrame(renderUpdate);
}

String.prototype.lpad = function(padString, length) {
    var str = this;
    while (str.length < length)
        str = padString + str;
    return str;
}

var tickno;
var refl_x;
var refl_y;
var refl_w;
var refl_h;
var refl_radius;
var refl_radius_sq;
var refl_speed_x;
var refl_speed_y;
var refl_grav;
var refl_tap_boost;
var dist_travelled;

var hit_parts;
var hit_parts_delay;
var menuchange_delay;
var app_over;

var border_standoff;
var points_xdist;
var points_mindist_y;

var ground_tbl_top;
var ground_tbl_bot;
var ground_tbl_x;

var app_menu_id;
var last_time;

function init_reflector_screen(menu_id){
	//Fill entire canvas with plain grey to initialize game
    CTX.fillStyle="#F6F6F6";
	CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
    
    tickno = 0;
    refl_x = 30;
    refl_y = 310;
    refl_w = 30;
    refl_h = 30;
    refl_radius = 15;
    refl_radius_sq = refl_radius*refl_radius;
    refl_speed_x = 4;
    refl_speed_y = 0;
    refl_grav = 0.2;
    refl_tap_boost = 4;
    dist_travelled = 0;
    
    hit_parts = [];
    hit_parts_delay = 20;
    menuchange_delay = hit_parts_delay + 50;
    app_over = -1;
    
    border_standoff = 10;
    points_xdist = 40;
    points_mindist_y = 100;
    
    ground_tbl_top = [];
    ground_tbl_bot = [];
    ground_tbl_x = 0;
    
    if(menu_id === undefined){
		app_menu_id = 0;
	}else{
		app_menu_id = menu_id;
	}
    last_time = Date.now();
}


function draw_debug_rect_at(x, y){
	CTX.fillStyle = "#00FF00";
	CTX.fillRect(x-2, y-2, 4, 4);
}

function draw_rect_at(x, y, w, h, color, alpha){
	CTX.fillStyle = "#"+color.toString(16).lpad("0", 6);
	CTX.globalAlpha = alpha/255;
	CTX.fillRect(x, y, w, h);
	CTX.globalAlpha = 1.0;
}

function draw_circle_at(x, y, radius, color){
	CTX.beginPath();
	CTX.arc(x, y, radius, 0, 2 * Math.PI, false);
	CTX.fillStyle = "#"+color.toString(16).lpad("0", 6);
	CTX.fill();
}

function draw_str_at(str, x, y, color, size){
	CTX.fillStyle = "#"+color.toString(16).lpad("0", 6);
	CTX.font = size+"px Arial";//Use OpenSans-Regular.ttf if possible
	CTX.fillText(str, x, y+size);
}

function draw_poly(points, color){
	if(points.length < 3) return;//At least a triangle
	CTX.fillStyle = "#"+color.toString(16).lpad("0", 6);
	CTX.beginPath();
	CTX.moveTo(points[0].x, points[0].y);
	var first = true;
	for (var k in points) {
		if(first) first = false;
		else CTX.lineTo(points[k].x, points[k].y);
	}
	CTX.closePath();
	CTX.fill();
}

//Copy pasted from:
//https://stackoverflow.com/questions/2752725/finding-whether-a-point-lies-inside-a-rectangle-or-not
function hittest_point_rect(x, y, ax, ay, bx, by, dx, dy){
    var bax = bx - ax;
    var bay = by - ay;
    var dax = dx - ax;
    var day = dy - ay;
    
    if ((x - ax) * bax + (y - ay) * bay < 0.0) return false;
    if ((x - bx) * bax + (y - by) * bay > 0.0) return false;
    if ((x - ax) * dax + (y - ay) * day < 0.0) return false;
    if ((x - dx) * dax + (y - dy) * day > 0.0) return false;
    
    return true;
}

//Hit test of circle vs line segment (just rectangular, not obround)
function hittest_circle_line_seg(x, y, radius, ax, ay, bx, by){
    //The perpendicular (normal) vector can be found by
    //swapping the x and y values and negating one of the two
    var perpvec_x = by-ay
    var perpvec_y = -(bx-ax)
    var perplen = Math.sqrt(perpvec_x*perpvec_x + perpvec_y*perpvec_y)
    var proport = radius / perplen
    var scaled_x = perpvec_x*proport
    var scaled_y = perpvec_y*proport
    //{bx-scaled_x, by-scaled_y} would be bottom right point, for y pointing downwards
    return hittest_point_rect(x, y, ax+scaled_x, ay+scaled_y, ax-scaled_x, ay-scaled_y, bx+scaled_x, by+scaled_y)
}

function hittest_circle_point(x, y, radius_sq, ax, ay){
    var dist_x = (ax-x);
    var dist_y = (ay-y);
    if(dist_x*dist_x + dist_y*dist_y <= radius_sq){
        return true;
	}
    return false;
}

function reflector_update(){
    tickno = tickno + 1;
    
    if(app_menu_id == 0){
        CTX.fillStyle="#F6F6F6";
		CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
        var str_x = 60;
        var str_y = 70;
        var str_kern = 60;
        var str_phase = 0.7;
        draw_str_at("F", str_x, str_y + Math.sin(tickno/5)*30, 0x94012C, 90);
        draw_str_at("L", str_x+str_kern, str_y + Math.sin(tickno/5 + str_phase)*30, 0x2D288B, 90);
        draw_str_at("A", str_x+str_kern*2, str_y + Math.sin(tickno/5 + str_phase*2)*30, 0x639D01, 90);
        draw_str_at("P", str_x+str_kern*3, str_y + Math.sin(tickno/5 + str_phase*3)*30, 0xC8A601, 90);
        draw_str_at("P", str_x+str_kern*4, str_y + Math.sin(tickno/5 + str_phase*4)*30, 0xC8A601, 90);
        draw_str_at("Y", str_x+str_kern*5, str_y + Math.sin(tickno/5 + str_phase*5)*30, 0x00766A, 90);
        
        draw_str_at("Reflector", str_x - 15, str_y+120, 0x94012C, 90);
        
        draw_str_at("(tap screen to play)", 42, 450, 0x000000, 44);
    }else if(app_menu_id == 1){
    
		for (var k in hit_parts) {
			var v = hit_parts[k];
			hit_parts[k].vy = v.vy + refl_grav;
            hit_parts[k].x = v.x + v.vx;
            hit_parts[k].y = v.y + v.vy;
		}
        
        if(app_over == -1){
            refl_y = refl_y + refl_speed_y
            if(refl_y < 0){
                refl_speed_y = 0
                refl_y = 0
            }else if(refl_y > CANVAS.height - refl_h){
                refl_speed_y = -refl_speed_y * 0.7
                refl_y = CANVAS.height - refl_h
            }
            refl_speed_y = refl_speed_y + refl_grav
            //if refl_speed_y > 7 then refl_speed_y = 7 end
            
            dist_travelled = dist_travelled + refl_speed_x
            ground_tbl_x = ground_tbl_x - refl_speed_x
            while(ground_tbl_x < -points_xdist){
                ground_tbl_x = ground_tbl_x + points_xdist
                ground_tbl_bot.shift();
                ground_tbl_top.shift();
            }
            
            //In the following line, + 2 for additional left/right vertex
			var max_it = CANVAS.width / points_xdist - ground_tbl_bot.length + 2
            for(var i=0; i < max_it; ++i){
                var mntn_size = 300
                if(dist_travelled < 30) mntn_size = 150;
                var new_top = border_standoff + mntn_size*Math.random()
                var new_bot = CANVAS.height - border_standoff - mntn_size*Math.random()
                if(new_bot - new_top < points_mindist_y){
                    var correction = points_mindist_y - (new_bot - new_top)
                    new_top = new_top - Math.ceil(correction/2)
                    new_bot = new_bot + Math.ceil(correction/2)
                    if(new_top < border_standoff) new_top = border_standoff;
                    if(new_bot > CANVAS.height - border_standoff) new_bot = CANVAS.height - border_standoff;
                }
				ground_tbl_top.push(new_top);
				ground_tbl_bot.push(new_bot);
            }
            
            //In the following lines, + 1 because Lua starts at 1
            var idx_before = Math.floor((refl_x - ground_tbl_x) / points_xdist) + 1
            var idx_after = Math.ceil((refl_x + refl_w - ground_tbl_x) / points_xdist) + 1
            //print("Before: " .. idx_before .. " / After: " .. idx_after)
            
            var has_hit = false
			var it_from = Math.max(1, idx_before);
			var it_to = Math.min(idx_after, (ground_tbl_bot.length) - 1);
            for(var i = it_from; i <= it_to; ++i){
                //This is duplicated code for 2 variables, should put in a function:
                if(true){
                    //draw_debug_rect_at((i-1)*points_xdist+ground_tbl_x, ground_tbl_bot[i])
                    var x = (i-1)*points_xdist+ground_tbl_x
                    var y = ground_tbl_bot[i-1]
                    var x_next = (i)*points_xdist+ground_tbl_x
                    var y_next = ground_tbl_bot[i]
                    if(hittest_circle_line_seg(refl_x + refl_w/2, refl_y + refl_h/2, refl_radius, x, y, x_next, y_next)){
                        has_hit = true
					}
                    if(hittest_circle_point(refl_x + refl_w/2, refl_y + refl_h/2, refl_radius_sq, x, y)){
                        has_hit = true
                    }
                }
                if(true){
                    //draw_debug_rect_at((i-1)*points_xdist+ground_tbl_x, ground_tbl_bot[i])
                    var x = (i-1)*points_xdist+ground_tbl_x
                    var y = ground_tbl_top[i-1]
                    var x_next = (i)*points_xdist+ground_tbl_x
                    var y_next = ground_tbl_top[i]
                    if(hittest_circle_line_seg(refl_x + refl_w/2, refl_y + refl_h/2, refl_radius, x, y, x_next, y_next)){
                        has_hit = true
                    }
                    if(hittest_circle_point(refl_x + refl_w/2, refl_y + refl_h/2, refl_radius_sq, x, y)){
                        has_hit = true
					}
                }
            }
            
            if(has_hit){
                //draw_debug_rect_at(10, 10);
                //init_reflector_screen(1);
                app_over = tickno;
            }
        }
        
        if(app_over != -1){
            if(tickno - app_over == hit_parts_delay){
                for(var i = 0; i < 20; ++i){
                    var rand_vx = Math.random()*5
                    if(Math.random() < 0.5) rand_vx = -rand_vx;
                    var rand_vy = Math.random()*5
                    if(Math.random() < 0.5) rand_vy = -rand_vy;
					hit_parts.push(
						{
							x:refl_x+refl_w*Math.random(),
							y:refl_y+refl_h*Math.random(),
							vx:rand_vx,
							vy:rand_vy
						});
                }
            }
            if(tickno - app_over == menuchange_delay){
                app_menu_id = 2;
            }
        }
        
        //////////////////////////////////////////////////////////////
        //Draw screen:
        
        CTX.fillStyle="#F6F6F6";
		CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
        
        var pts_top = [{x:0,y:0},{x:0,y:border_standoff}]
        var pts_bot = [{x:0,y:CANVAS.height},{x:0,y:CANVAS.height-border_standoff}]
        var ctr = 0
		for (var k in ground_tbl_bot) {
			var v = ground_tbl_bot[k];
            pts_bot.push({x:ctr*points_xdist+ground_tbl_x,y:v})
            ctr = ctr + 1
        }
        ctr = 0
		for (var k in ground_tbl_top) {
			var v = ground_tbl_top[k];
            pts_top.push({x:ctr*points_xdist+ground_tbl_x,y:v})
            ctr = ctr + 1
        }
        pts_top.push({x:CANVAS.width,y:border_standoff})
        pts_top.push({x:CANVAS.width,y:0})
        pts_bot.push({x:CANVAS.width,y:CANVAS.height-border_standoff})
        pts_bot.push({x:CANVAS.width,y:CANVAS.height})
		draw_poly(pts_top, 0x0097BA);
		draw_poly(pts_bot, 0x0097BA);
        
        if(app_over == -1 || tickno - app_over < hit_parts_delay){
			//draw_rect_at(refl_x, refl_y, refl_w, refl_h, 0xFF0000, 255);
			draw_circle_at(refl_x+refl_w/2, refl_y+refl_h/2, refl_w/2, 0x8A42FF);
			//TODO: SHOULD BE REFLECTOR IMAGE INSTEAD OF RECTANGLE! "images/Targets/RFI_0.5@4x.png"
        }
        
		for (var k in hit_parts) {
			var v = hit_parts[k];
			//print(k, v.x, v.y, v.vx, v.vy)
			draw_rect_at(v.x-3, v.y-3, 6, 6, 0x8A42FF, 255) //TODO: Colour is actually 0x000000
		}
        
		draw_str_at(String(dist_travelled), 430, 10, 0x000000, 24);//TODO: STRING SHOULD BE RIGHT-ALIGNED!
    }else if(app_menu_id == 2){
        draw_str_at("You broke a reflector!", 35, 50, 0x000000, 40)
        
        draw_rect_at(100, 250, 280, 150, 0xCCCCCC, 100)
        draw_str_at("Main menu", 100 + 45, 300, 0x000000, 36)
        
        draw_rect_at(100, 450, 280, 150, 0xCCCCCC, 100)
        draw_str_at("Replay", 100 + 85, 500, 0x000000, 36)
    }
    
    var new_time = Date.now();
    //print(new_time - last_time);
    last_time = new_time;
	requestAnimationFrame(reflector_update);
}

function hndl_reflector_press(mapargs){
    var press_x = mapargs["x"];
    var press_y = mapargs["y"];
    
    if(app_over == -1){
        refl_y = refl_y - 1;
        refl_speed_y = refl_speed_y - refl_tap_boost;
    }
    if(app_menu_id == 0){
        app_menu_id = 1;
    }else if(app_menu_id == 2){
        if(press_x >= 100 && press_x <= 100+280 &&
           press_y >= 250 && press_y <= 250+150){
            //change_screen_internal("home_screen")//Would go back to menu
		}else if(press_x >= 100 && press_x <= 100+280 &&
               press_y >= 450 && press_y <= 450+150){
            init_reflector_screen(1);
		}
    }
}

function handleMousedownGlobal(evt){
	var rect = CANVAS.getBoundingClientRect();
	var style = window.getComputedStyle(CANVAS);
	var mouse_x = Math.round(evt.clientX - rect.left - parseInt(style.getPropertyValue('border-left-width')));
	var mouse_y = Math.round(evt.clientY - rect.top - parseInt(style.getPropertyValue('border-top-width')));
	hndl_reflector_press({x: mouse_x, y: mouse_y});
}

document.addEventListener('mousedown', function (evt) {handleMousedownGlobal(evt);}, false);


init_reflector_screen()
requestAnimationFrame(reflector_update);//init with 16ms per frame / ~60Hz
//*/