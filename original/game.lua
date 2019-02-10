local tickno
local refl_x
local refl_y
local refl_w
local refl_h
local refl_radius
local refl_radius_sq
local refl_speed_x
local refl_speed_y
local refl_grav
local refl_tap_boost
local dist_travelled

local hit_parts
local hit_parts_delay
local menuchange_delay
local app_over

local border_standoff
local points_xdist
local points_mindist_y

local ground_tbl_top
local ground_tbl_bot
local ground_tbl_x

local app_menu_id
local last_time

function init_reflector_screen(menu_id)
    --------------
    local canvas = gre.get_canvas("reflector_canvas")
    local size = canvas:get_dimensions()
    canvas:fill_rect(0, 0, size.width, size.height, 0xF6F6F6)
    --------------
    
    tickno = 0
    refl_x = 20
    refl_y = 300
    refl_w = 40
    refl_h = 40
    refl_radius = 15
    refl_radius_sq = refl_radius*refl_radius
    refl_speed_x = 4
    refl_speed_y = 0
    refl_grav = 0.2
    refl_tap_boost = 4
    dist_travelled = 0
    
    hit_parts = {}
    hit_parts_delay = 20
    menuchange_delay = hit_parts_delay + 50
    app_over = -1
    
    border_standoff = 10
    points_xdist = 40
    points_mindist_y = 100
    
    ground_tbl_top = {}
    ground_tbl_bot = {}
    ground_tbl_x = 0
    
    if menu_id == nil then app_menu_id = 0 else app_menu_id = menu_id end
    last_time = gre.mstime()
end


function draw_debug_rect_at(x, y)
    local canvas = gre.get_canvas("reflector_canvas")
    local pts = {{x=x-2,y=y-2},{x=x-2,y=y+2},{x=x+2,y=y+2},{x=x+2,y=y-2}}
    canvas:fill_poly(pts, 0x00ff00)
end

function draw_rect_at(x, y, w, h, color, alpha)
    local canvas = gre.get_canvas("reflector_canvas")
    local pts = {{x=x,y=y},{x=x+w,y=y},{x=x+w,y=y+h},{x=x,y=y+h}}
    canvas:set_alpha(alpha)
    canvas:fill_poly(pts, color)
    canvas:set_alpha(255)
end

--Copy pasted from:
--https://stackoverflow.com/questions/2752725/finding-whether-a-point-lies-inside-a-rectangle-or-not
function hittest_point_rect(x, y, ax, ay, bx, by, dx, dy)
    local bax = bx - ax
    local bay = by - ay
    local dax = dx - ax
    local day = dy - ay
    
    if ((x - ax) * bax + (y - ay) * bay < 0.0) then return false end
    if ((x - bx) * bax + (y - by) * bay > 0.0) then return false end
    if ((x - ax) * dax + (y - ay) * day < 0.0) then return false end
    if ((x - dx) * dax + (y - dy) * day > 0.0) then return false end
    
    return true
end

--Hit test of circle vs line segment
function hittest_circle_line_seg(x, y, radius_sq, ax, ay, bx, by)
    local perpslope = (ax-bx)/(by-ay)--prependicular to slope of line
    local ox = math.sqrt(radius_sq/(1+perpslope*perpslope))    
    if hittest_point_rect(x, y, ax+ox, ay+perpslope*ox, ax-ox, ay-perpslope*ox, bx+ox, by+perpslope*ox) then
        return true
    end
    return false
end

function hittest_circle_point(x, y, radius_sq, ax, ay)
    local dist_x = (ax-x)
    local dist_y = (ay-y)
    if dist_x*dist_x + dist_y*dist_y <= radius_sq then
        return true
    end
    return false
end

function draw_str_at(str, x, y, color, size)
    local canvas = gre.get_canvas("reflector_canvas")
    local attrs = {}
    attrs.font = "fonts/OpenSans-Regular.ttf"
    attrs.size = size
    attrs.x = x
    attrs.y = y
    attrs.color = color
    canvas:draw_text(str, attrs)
end

function reflector_update()
    local canvas = gre.get_canvas("reflector_canvas")
    local size = canvas:get_dimensions()
    tickno = tickno + 1
    
    if app_menu_id == 0 then
        canvas:fill_rect(0, 0, size.width, size.height, 0xF6F6F6)
        str_x = 60
        str_y = 70
        str_kern = 60
        str_phase = 0.7
        draw_str_at("\70", str_x, str_y + math.sin(tickno/5)*30, 0x94012C, 90)
        draw_str_at("\76", str_x+str_kern, str_y + math.sin(tickno/5 + str_phase)*30, 0x2D288B, 90)
        draw_str_at("\65", str_x+str_kern*2, str_y + math.sin(tickno/5 + str_phase*2)*30, 0x639D01, 90)
        draw_str_at("\80", str_x+str_kern*3, str_y + math.sin(tickno/5 + str_phase*3)*30, 0xC8A601, 90)
        draw_str_at("\80", str_x+str_kern*4, str_y + math.sin(tickno/5 + str_phase*4)*30, 0xC8A601, 90)
        draw_str_at("\89", str_x+str_kern*5, str_y + math.sin(tickno/5 + str_phase*5)*30, 0x00766A, 90)
        
        draw_str_at("Reflector", str_x - 15, str_y+120, 0x94012C, 90)
        
        draw_str_at("(tap screen to \112\108\97\121)", 42, 450, 0x000000, 44)
    elseif app_menu_id == 1 then
    
        for k, v in pairs(hit_parts) do
            v.vy = v.vy + refl_grav
            v.x = v.x + v.vx
            v.y = v.y + v.vy
        end
        
        if app_over == -1 then
            refl_y = refl_y + refl_speed_y
            if refl_y < 0 then
                refl_speed_y = 0
                refl_y = 0
            elseif refl_y > size.height - refl_h then
                refl_speed_y = -refl_speed_y * 0.7
                refl_y = size.height - refl_h
            end
            refl_speed_y = refl_speed_y + refl_grav
            --if refl_speed_y > 7 then refl_speed_y = 7 end
            
            dist_travelled = dist_travelled + refl_speed_x
            ground_tbl_x = ground_tbl_x - refl_speed_x
            while ground_tbl_x < -points_xdist do
                ground_tbl_x = ground_tbl_x + points_xdist
                table.remove(ground_tbl_bot, 1)
                table.remove(ground_tbl_top, 1)
            end
            
            --In the following line, + 2 for additional left/right vertex
            for i=1, size.width / points_xdist - #ground_tbl_bot + 2 do
                local mntn_size = 300
                if dist_travelled < 30 then mntn_size = 150 end
                local new_top = border_standoff + mntn_size*math.random()
                local new_bot = size.height - border_standoff - mntn_size*math.random()
                if new_bot - new_top < points_mindist_y then
                    local correction = points_mindist_y - (new_bot - new_top)
                    new_top = new_top - math.ceil(correction/2)
                    new_bot = new_bot + math.ceil(correction/2)
                    if new_top < border_standoff then new_top = border_standoff end
                    if new_bot > size.height - border_standoff then new_bot = size.height - border_standoff end
                end
                table.insert(ground_tbl_top, new_top)
                table.insert(ground_tbl_bot, new_bot)
            end
            
            --In the following lines, + 1 because Lua starts at 1
            local idx_before = math.floor((refl_x - ground_tbl_x) / points_xdist) + 1
            local idx_after = math.ceil((refl_x + refl_w - ground_tbl_x) / points_xdist) + 1
            --print("Before: " .. idx_before .. " / After: " .. idx_after)
            
            local has_hit = false
            for i = math.max(1, idx_before), math.min(idx_after, (#ground_tbl_bot) - 1) do
                --This is duplicated code for 2 variables, should put in a function:
                if true then
                    --draw_debug_rect_at((i-1)*points_xdist+ground_tbl_x, ground_tbl_bot[i])
                    local x = (i-1)*points_xdist+ground_tbl_x
                    local y = ground_tbl_bot[i]
                    local x_next = (i)*points_xdist+ground_tbl_x
                    local y_next = ground_tbl_bot[i+1]
                    if hittest_circle_line_seg(refl_x + refl_w/2, refl_y + refl_h/2, refl_radius_sq, x, y, x_next, y_next) then
                        has_hit = true
                    end
                    if hittest_circle_point(refl_x + refl_w/2, refl_y + refl_h/2, refl_radius_sq, x, y) then
                        has_hit = true
                    end
                end
                if true then
                    --draw_debug_rect_at((i-1)*points_xdist+ground_tbl_x, ground_tbl_bot[i])
                    local x = (i-1)*points_xdist+ground_tbl_x
                    local y = ground_tbl_top[i]
                    local x_next = (i)*points_xdist+ground_tbl_x
                    local y_next = ground_tbl_top[i+1]
                    if hittest_circle_line_seg(refl_x + refl_w/2, refl_y + refl_h/2, refl_radius_sq, x, y, x_next, y_next) then
                        has_hit = true
                    end
                    if hittest_circle_point(refl_x + refl_w/2, refl_y + refl_h/2, refl_radius_sq, x, y) then
                        has_hit = true
                    end
                end
            end
            
            if has_hit then
                --draw_debug_rect_at(10, 10)
                --init_reflector_screen(1)
                app_over = tickno
            end
        end
        
        if app_over ~= -1 then
            if tickno - app_over == hit_parts_delay then
                for i = 1,20 do
                    local rand_vx = math.random()*5
                    if math.random() < 0.5 then rand_vx = -rand_vx end
                    local rand_vy = math.random()*5
                    if math.random() < 0.5 then rand_vy = -rand_vy end
                    table.insert(hit_parts, {x=refl_x+refl_w*math.random(),y=refl_y+refl_h*math.random(),vx=rand_vx,vy=rand_vy})
                end
            end
            if tickno - app_over == menuchange_delay then
                app_menu_id = 2
            end
        end
        
        --------------------------------------------------------------
        --Draw screen:
        
        canvas:fill_rect(0, 0, size.width, size.height, 0xF6F6F6)
        
        local pts_top = {{x=0,y=0},{x=0,y=border_standoff}}
        local pts_bot = {{x=0,y=size.height},{x=0,y=size.height-border_standoff}}
        local ctr = 0
        for k,v in pairs(ground_tbl_bot) do
            table.insert(pts_bot, {x=ctr*points_xdist+ground_tbl_x,y=v})
            --canvas:fill_poly({10,20,15,10}, {10,20,15,10}, 0xFF0000)
            --canvas:fill_poly({{x=10,y=10},{x=10,y=20},{x=20,y=20},{x=10,y=10}}, 0xFF0000)
            --canvas:fill_poly({10,10,20,10}, {10,20,20,10}, 0xFF0000)
            --print(k .. "/" .. v)
            ctr = ctr + 1
        end
        ctr = 0
        for k,v in pairs(ground_tbl_top) do
            table.insert(pts_top, {x=ctr*points_xdist+ground_tbl_x,y=v})
            ctr = ctr + 1
        end
        table.insert(pts_top, {x=size.width,y=border_standoff})
        table.insert(pts_top, {x=size.width,y=0})
        table.insert(pts_bot, {x=size.width,y=size.height-border_standoff})
        table.insert(pts_bot, {x=size.width,y=size.height})
        canvas:fill_poly(pts_top, 0x0097BA)
        canvas:fill_poly(pts_bot, 0x0097BA)
        
        if(app_over == -1 or tickno - app_over < hit_parts_delay) then
            local attrs = {}
            attrs.x = refl_x
            attrs.y = refl_y
            attrs.w = refl_w
            attrs.h = refl_h
            canvas:draw_image("images/Targets/RFI_0.5@4x.png", attrs)
        end
        
        for k, v in pairs(hit_parts) do
            --print(k, v.x, v.y, v.vx, v.vy)
            draw_rect_at(v.x-3, v.y-3, 6, 6, 0x000000, 255)
        end
        
        local dist_str = tostring(dist_travelled)
        local attrs = {}
        attrs.font = "fonts/OpenSans-Regular.ttf"
        attrs.size = 24
        local strSize = gre.get_string_size(attrs.font, attrs.size, dist_str, 0)
        attrs.x = size.width - strSize.width - 10
        attrs.y = 10
        canvas:draw_text(dist_str, attrs)
    elseif app_menu_id == 2 then
        draw_str_at("You \98\114\111\107\101 a reflector!", 35, 50, 0x000000, 40)
        
        draw_rect_at(100, 250, 280, 150, 0xCCCCCC, 100)
        draw_str_at("Main menu", 100 + 45, 300, 0x000000, 36)
        
        draw_rect_at(100, 450, 280, 150, 0xCCCCCC, 100)
        draw_str_at("Re\112\108\97\121", 100 + 85, 500, 0x000000, 36)
    end
    
    local new_time = gre.mstime() 
    --print(new_time - last_time)
    last_time = new_time
end

function hndl_reflector_press(mapargs)
    local evt = mapargs["context_event_data"]
    local press_x = evt["x"]
    local press_y = evt["y"]
    
    if app_over == -1 then
        refl_y = refl_y - 1 
        refl_speed_y = refl_speed_y - refl_tap_boost
    end
    if app_menu_id == 0 then
        app_menu_id = 1
    elseif app_menu_id == 2 then
        if press_x >= 100 and press_x <= 100+280 and
           press_y >= 250 and press_y <= 250+150 then
            change_screen_internal("home_screen")
        elseif press_x >= 100 and press_x <= 100+280 and
               press_y >= 450 and press_y <= 450+150 then
            init_reflector_screen(1)
        end
    end
end

local reflector_timer = nil
function hndl_show_reflector_screen()
    init_reflector_screen()
    reflector_timer = gre.timer_set_interval(
      reflector_update,
      16
    )
end

function hndl_hide_reflector_screen()
    if reflector_timer ~= nil then
        gre.timer_clear_interval(reflector_timer)
        reflector_timer = nil
    end
end
