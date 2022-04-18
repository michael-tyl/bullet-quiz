// server connectivity
let global_continue_waiting_for_start_really_long_variable_name_hello_future_viewers = true;

let globalChannel;
let myClientId;
let myChannel;
let gameRoomChannel;

const myNickname = localStorage.getItem("nickname");
const roomCode = localStorage.getItem("roomCode");
const socket = io();

// can change uniqueId func later if necessary
// maybe should be done server side?
const uniqueId = function() {
    return "id-" + Math.random().toString(36).substr(2, 16);
}

//should probably change this
const myId = uniqueId();
myClientId = myId;

let global_rand_arr = []; 

/*
global_player_arr = {
  123123: {id:123, x:123, y:123, score:123, nickname:123, iframes:123},
  123123: {id:123, x:123, y:123, score:123, nickname:123, iframes:123},
  123123: {id:123, x:123, y:123, score:123, nickname:123, iframes:123}
};
*/
let global_player_arr;

let global_rand_arr_index = 0;

socket.emit("new-player", {
  gameCode: roomCode
});

socket.on("game-state:"+ roomCode, (data) => {
  global_player_arr = data.players;
});

socket.on("random-arr:" + roomCode, (data) => {
  global_rand_arr = data.randArr;
  global_continue_waiting_for_start_really_long_variable_name_hello_future_viewers = false;
  start_new_question();
});

const width = screen.availWidth-300;
const height = screen.availHeight;

function setup() {
  createCanvas(width+300, height);
}

const downPressedKeys = new Set();
const downPressedMouse = new Set();

/**all event keys with length 1 get converted to lowercase*/ 
window.addEventListener("keydown", function (event) 
{
  if (event.defaultPrevented) {
    return;}
  
  let temp_str = event.key;
  if (temp_str.length==1){
    temp_str = temp_str.toLowerCase();}
  
    downPressedKeys.add((temp_str));})
/**all event keys with length 1 get converted to lowercase*/ 
window.addEventListener("keyup", function (event) 
{
  if (event.defaultPrevented) {
    return;}

  let temp_str = event.key;
  if (temp_str.length==1){
    temp_str = temp_str.toLowerCase();
  }

  downPressedKeys.delete((temp_str));
});

window.addEventListener("mousedown", function (event) 
{
  if (event.defaultPrevented) 
  {
    return;
  }
    downPressedMouse.add(event.key);})
window.addEventListener("mouseup", function (event) 
{
  if (event.defaultPrevented) 
  {
    return;
  }
  downPressedMouse.delete(event.key);
});

class Projectile
{
  constructor(radius,color,pos_x,pos_y,vel_x,vel_y,acc_x = 0,acc_y = 0)
  {
    this.radius = radius;
    this.color = color;

    this.color_outline = [color[0]/1.1,color[1]/1.1,color[2]/1.1];

    this.pos_x = pos_x;
    this.pos_y = pos_y;

    this.vel_x = vel_x;
    this.vel_y = vel_y;

    this.acc_x = acc_x;
    this.acc_y = acc_y;

  }
  draw ()
  {
    draw_circle(this.pos_x,this.pos_y,this.radius,this.color,true,this.color_outline);
  }

  move()
  {
    this.pos_x += this.vel_x;
    this.pos_y += this.vel_y;

    this.vel_x += this.acc_x;
    this.vel_y += this.acc_y;
  }

  update(should_draw = true,should_move = true)
  {
    if (should_draw)
    {
      this.draw();
    }
    if (should_move)
    {
      this.move();
    }
  }

  /**returns true if should delete projectile, false if should keep projectile */
  should_destroy(forgiving_x = 0,forgiving_y = 0)
  {
    if (this.pos_x-this.radius>width+forgiving_x){
      return true;
    }
    if (this.pos_x+this.radius<-forgiving_x){
      return true;
    }
    if (this.pos_y-this.radius>height+forgiving_y){
      return true;
    }
    if (this.pos_y+this.radius<-forgiving_y){
      return true;
    }         
    return false;
  }
  
  /**make sure to set arr_proj = update_list(arr_proj) */
  static update_list(proj_list,should_collide = true,forgiving_x = 0, forgiving_y = 0)
  {
    for (let i = 0; i < proj_list.length; i++)
    {
      (proj_list[i]).update();
    }
    let proj_list2 = [];

    for (let i = 0; i < proj_list.length; i++)
    {
      if (!(proj_list[i]).should_destroy(forgiving_x,forgiving_y))
      {
        proj_list2.push(proj_list[i]);
      }
    }
    

    if (should_collide)
    {
      player.collision(proj_list2);
    } 

    return proj_list2
  }
}

class Player 
{
  /**player color is just for the trail*/
  constructor(pos_x,pos_y,radius,color,speed,speed_slowed,speed_fast,total_health,immunity_frames) {
    this.pos_x = pos_x;
    this.pos_y = pos_y;
    this.radius = radius;

    this.color = color;
    this.color_outline = [color[0]/2,color[1]/2,color[2]/2];
    this.color_trail_pos_x = [];
    this.color_trail_pos_y = [];
    this.color_trail_num = 9;

    for (let i = 0; i < this.color_trail_num; i++)
    {
      this.color_trail_pos_x.push(pos_x);
      this.color_trail_pos_y.push(pos_y);
    }
    
    this.speed = speed;
    this.speed_fast = speed_fast;
    this.speed_slowed = speed_slowed;

    this.current_health = total_health;
    this.total_health = total_health;

    // this will allow player to take damage only if greater than total imm frames
    //every time player takes damage the current is set back to 0
    this.current_immunity_frames = immunity_frames ;
    this.total_immunity_frames = immunity_frames;

    this.x_min = 0;
    this.x_max = width;
    this.y_min = 0;
    this.y_max = height;

  }
  draw() {
    if (this.immunity()){
      for (let i = 0; i < this.color_trail_num; i++)
      {
        fill(player.color);
        stroke(player.color);
        circle(this.color_trail_pos_x[i],this.color_trail_pos_y[i],25-i*3);

      }
      fill([255,255,255]);
      circle(this.pos_x,this.pos_y,this.radius*2);
    }
    else
    {
      for (let i = 0; i < this.color_trail_num; i++)
      {
        fill([255,0,0]);
        stroke([255,0,0]);
        circle(this.color_trail_pos_x[i],this.color_trail_pos_y[i],25-i*3);
      }
      fill([255,255*this.current_immunity_frames/this.total_immunity_frames,
          255*this.current_immunity_frames/this.total_immunity_frames]);
      circle(this.pos_x,this.pos_y,this.radius*2);
    }
  }
  
  move() {
    let temp_move_x = 0,temp_move_y = 0;
    //the capital thing should probs never occur
    if (downPressedKeys.has('w') || downPressedKeys.has('ArrowUp'))
    {
      temp_move_y-=1;
    }
    if (downPressedKeys.has('s') || downPressedKeys.has('ArrowDown'))
    {
      temp_move_y+=1;
    }
    if (downPressedKeys.has('a') || downPressedKeys.has('ArrowLeft'))
    {
      temp_move_x-=1;
    }
    if (downPressedKeys.has('d') || downPressedKeys.has('ArrowRight'))
    {
      temp_move_x+=1;
    }

    if (downPressedKeys.has('Shift'))
    {
      this.pos_x += temp_move_x * this.speed_slowed;
      this.pos_y += temp_move_y * this.speed_slowed;
    }
    else if(downPressedKeys.has('h'))
    {
      this.pos_x += temp_move_x * this.speed_fast;
      this.pos_y += temp_move_y * this.speed_fast;
    }
    else
    {
      this.pos_x += temp_move_x * this.speed;
      this.pos_y += temp_move_y * this.speed;
    }

    //out of bounds check
    if (this.pos_x>this.x_max)
    {
     this.pos_x = this.x_max; 
    }
    if (this.pos_x<this.x_min)
    {
     this.pos_x = this.x_min; 
    }
    if (this.pos_y>this.y_max)
    {
     this.pos_y = this.y_max; 
    }
    if (this.pos_y<this.y_min)
    {
     this.pos_y = this.y_min; 
    }

    //for the color trails
    this.color_trail_pos_x.splice(0, 0, this.pos_x);
    this.color_trail_pos_x.splice(this.color_trail_pos_x.length-1,1);

    this.color_trail_pos_y.splice(0, 0, this.pos_y);
    this.color_trail_pos_y.splice(this.color_trail_pos_y.length-1,1);

    return;
  }

  update()
  {
    this.current_immunity_frames+=1;
    this.move();
    this.draw();
  }

  immunity() 
  {
    if (this.current_immunity_frames>this.total_immunity_frames) 
    {
      return true;
    }
    return false;
  }

  lose_health()
  {
    if (this.immunity())
    {
      this.current_immunity_frames = 0;
      this.current_health -=1;
    }
  }

  collision(proj_list) 
  {
    for (let i = 0; i < proj_list.length; i++)
      if (  (this.pos_x-proj_list[i].pos_x)**2+(this.pos_y-proj_list[i].pos_y)**2  < (this.radius+proj_list[i].radius-3)**2)
      {
        this.lose_health();
        return;
      }
    return;
  }

  is_alive() 
  {
    return this.current_health > 0;
  }
}

function distance(x1,y1,x2,y2) 
{
  return sqrt((x2-x1)**2+(y2-y1)**2);
}

function draw_circle(pos_x,pos_y,radius,color,should_draw_border,color_outline)
{
  fill(color);
  if (should_draw_border)
  {
    stroke(color_outline);
  }
  else{
    noStroke();
  }
  circle(pos_x,pos_y,radius*2);
  return;
}

function draw_line(x1,y1,x2,y2,color)
{
  stroke(color);
  // strokeWidth(5);
  line(x1,y1,x2,y2);
}

//https://stackoverflow.com/questions/1527803/generating-random-whole-numbers-in-javascript-in-a-specific-range
/** the min must be lower than the max */

function random_int(min, max) 
{
  min = Math.ceil(min);
  max = Math.floor(max);
  global_rand_arr_index = (global_rand_arr_index+1)%global_rand_arr.length;
  return Math.floor(global_rand_arr[global_rand_arr_index] * (max - min + 1)) + min;
}

/**min doesn't have to be lower than the max */
function random_float(min,max)
{
  global_rand_arr_index = (global_rand_arr_index+1)%global_rand_arr.length;
  return (global_rand_arr[global_rand_arr_index]*(max-min)+min);
}

function random_choice(arr_choices)
{
  return (arr_choices[random_int(0,arr_choices.length-1)]);
}

//player declaration 
//player declaration
let player = new Player(width/4,height/2,13,[0,0,255],5,3,12,35,120);
//player declaration
//player declaration

class Main_update_class
{
  constructor ()
  {
    this.attack_started = false;
    this.timer = 0;
    this.projectiles = [];

    this.SPIRAL_1 = 1; // a more complex attack
    this.SPIRAL_2 = 2; // a more simple attack

    this.EXAMPLE_ATTACK = 3; // --------------- EXAMPLE ATTACK -------------

    this.SPIRAL_3 = 4; // a more complex attack
    this.SPIRAL_4 = 5;
    this.KHELO_ATTACK = 6;
    
    this.UNIQUE_1 = 7;
    

    this.ATTACK_INDEX_RETURN_TO = 0; // index in the array

    this.attack_arr = [this.SPIRAL_1,this.SPIRAL_4,this.SPIRAL_2,this.SPIRAL_1,this.SPIRAL_3,this.SPIRAL_4,this.EXAMPLE_ATTACK];
    this.attack_index = 0;
  }

  spiral_1_initializer()
  {
    this.attack_started = true;
    this.spiral_1_time_end = 60*20;

    this.spiral_4_color = [random_int(0,255),random_int(0,255),random_int(0,255)];
    this.spiral_4_color_incr = [random_float(0,1),random_float(0,1),random_float(0,1)];

    this.spiral_1_time_mod = 1;
    this.spiral_1_angle = random_float(0,2*Math.PI);
    this.spiral_1_angle_incr = random_float(0.2,2*Math.PI);
    this.spiral_1_speed = random_float(1,3);

    this.spiral_1_angle_acc = random_float(0,2*Math.PI);
    this.spiral_1_angle_incr_acc = random_float(0.2,2*Math.PI);
    this.spiral_1_acc = random_float(0.05,0.1);

    this.spiral_1_radius = random_int(7,13);
  }

  spiral_1(difficulty)
  {
    if (!this.attack_started)
    {
      this.spiral_1_initializer();
    }

    for (let i = 0; i < 3; i++)
    {
      this.spiral_4_color[i] += this.spiral_4_color_incr[i];
      if (this.spiral_4_color[i]<=0)
      {
        this.spiral_4_color[i] = 0;
        this.spiral_4_color_incr[i] = random_float(0,1);
      }
      else if (this.spiral_4_color[i]>=255)
      {
        this.spiral_4_color[i] = 255;
        this.spiral_4_color_incr[i] = -random_float(0,1);
      }
    }

    //only executes attack after a cretain amnt of time
    if (this.timer>0){
      this.spiral_1_angle+=this.spiral_1_angle_incr;
      this.spiral_1_angle_acc+=this.spiral_1_angle_incr_acc;

      if (this.timer%(difficulty*this.spiral_1_time_mod) == 0)
      {
        let temp_proj = new Projectile(this.spiral_1_radius,[this.spiral_4_color[0],this.spiral_4_color[1],this.spiral_4_color[2],170],width/2,height/2,
          Math.cos(this.spiral_1_angle)*this.spiral_1_speed,Math.sin(this.spiral_1_angle)*this.spiral_1_speed,
          Math.cos(this.spiral_1_angle_acc)*this.spiral_1_acc,Math.sin(this.spiral_1_angle_acc)*this.spiral_1_acc);
        this.projectiles.push(temp_proj);
      }
    }

    this.projectiles = Projectile.update_list(this.projectiles);

    if (this.timer>this.spiral_1_time_end)
    {
      return true;
    }
    return false;
  }

  spiral_2_initializer()
  {
    this.attack_started = true;
    this.spiral_2_time_end = 60*20;

    this.spiral_4_color = [random_int(0,255),random_int(0,255),random_int(0,255)];
    this.spiral_4_color_incr = [random_float(0,2),random_float(0,2),random_float(3,4)];

    this.spiral_2_angle = random_float(0,2*Math.PI);
    this.spiral_2_angle_incr = random_float(0.02,0.10)+2*Math.PI/random_int(3,10);
    this.spiral_2_mod = 1; // proejctiles generated every 2 frames (60 frames per second)
    this.spiral_2_color = [random_float(0,255),0,random_float(0,255),random_float(0,255)];
    this.spiral_2_speed = random_float(2,3);
  }

  spiral_2(difficulty)
  {
    if (!this.attack_started){
      this.spiral_2_initializer();
    }

    for (let i = 0; i < 3; i++)
    {
      this.spiral_4_color[i] += this.spiral_4_color_incr[i];
      if (this.spiral_4_color[i]<=0)
      {
        this.spiral_4_color[i] = 0;
        this.spiral_4_color_incr[i] = random_float(0,2);
      }
      else if (this.spiral_4_color[i]>=255)
      {
        this.spiral_4_color[i] = 255;
        this.spiral_4_color_incr[i] = -random_float(0,2);
      }
    }

    if (this.timer%(this.spiral_2_mod)==0)
    {
      this.spiral_2_angle+=this.spiral_2_angle_incr;
    }

    if (this.timer%(difficulty*this.spiral_2_mod)==0)
    {
      let temp_proj = new Projectile(10+10*(this.timer/this.spiral_2_time_end),[this.spiral_4_color[0],this.spiral_4_color[1],this.spiral_4_color[2],255],width/2,height/2,
        this.spiral_2_speed*Math.cos(this.spiral_2_angle),this.spiral_2_speed*Math.sin(this.spiral_2_angle));
      
      this.projectiles.push(temp_proj);
    }

    this.projectiles = Projectile.update_list(this.projectiles);

    if (this.timer>this.spiral_2_time_end)
    {
      return true;
    }
    return false;
  }
  spiral_3_initializer()
  {
    this.attack_started = true;
    this.spiral_3_time_end = 60*20;

    this.spiral_4_color = [random_int(0,255),random_int(0,255),random_int(0,255)];
    this.spiral_4_color_incr = [random_float(0.2,0.5),random_float(0.2,0.5),random_float(0.2,0.5)];

    this.spiral_3_angle = random_float(0,2*Math.PI);
    this.spiral_3_angle_incr = random_float(Math.PI/5,Math.PI/1.5);
    this.spiral_3_mod = 4; // proejctiles generated every 2 frames (60 frames per second)
    this.spiral_3_color = [random_float(0,255),0,random_float(0,255),random_float(0,255)];
    this.spiral_3_speed = random_float(4,6);
  }

  spiral_3(difficulty)
  {
    if (!this.attack_started){
      this.spiral_3_initializer();
    }

    for (let i = 0; i < 3; i++)
    {
      this.spiral_4_color[i] += this.spiral_4_color_incr[i];
      if (this.spiral_4_color[i]<=0)
      {
        this.spiral_4_color[i] = 0;
        this.spiral_4_color_incr[i] = random_float(0.2,0.5);
      }
      else if (this.spiral_4_color[i]>=150)
      {
        this.spiral_4_color[i] = 150;
        this.spiral_4_color_incr[i] = -random_float(0.2,0.5);
      }
    }

    if (this.timer%(this.spiral_3_mod)==0)
    {
      this.spiral_3_angle+=this.spiral_3_angle_incr;
    }

    if (this.timer%(difficulty*this.spiral_3_mod)==0)
    {
      let temp_proj = new Projectile(30,[this.spiral_4_color[0],this.spiral_4_color[1],this.spiral_4_color[2],255],width/2,height/2,
        this.spiral_3_speed*Math.cos(this.spiral_3_angle),this.spiral_3_speed*Math.sin(this.spiral_3_angle),0,0.03);
      this.projectiles.push(temp_proj);

      temp_proj = new Projectile(30,[255-this.spiral_4_color[0],255-this.spiral_4_color[1],255-this.spiral_4_color[2],170],width/2,height/2,
        this.spiral_3_speed*Math.cos(this.spiral_3_angle),this.spiral_3_speed*Math.sin(this.spiral_3_angle),0,-0.03);
      
      this.projectiles.push(temp_proj);
    }

    this.projectiles = Projectile.update_list(this.projectiles);

    if (this.timer>this.spiral_3_time_end)
    {
      return true;
    }
    return false;
  }

  spiral_4_initializer()
  {
    this.attack_started = true;
    this.spiral_4_time_end = 60*20;
    
    this.spiral_4_angle_vel = 0;
    this.spiral_4_angle_acc = 0;

    this.spiral_4_angle_vel_add = random_choice([random_float(-0.2,0.2),random_float(-3,3)]);
    this.spiral_4_angle_acc_add = random_choice([random_float(-0.34,0.34),random_float(-0.2,0.2)]);

    this.spiral_4_color = [0,0,0];
    this.spiral_4_color_incr = [random_float(0.5,5),random_float(0.5,5),random_float(0.5,5)];

    this.spiral_4_vel = random_float(-3.5,3.5);
    this.spiral_4_acc = random_float(-0.2,0.2);

    if (this.spiral_4_vel < 1.5 && this.spiral_4_acc < 0.01)
    {
      this.spiral_4_acc = random_choice([-0.015,0.015]);
    }

    this.spiral_4_radius = random_int(5,6);
  }

  spiral_4(difficulty)
  {
    if (!this.attack_started)
    {
      this.spiral_4_initializer();
    }

    for (let i = 0; i < 3; i++)
    {
      this.spiral_4_color[i] += this.spiral_4_color_incr[i];
      if (this.spiral_4_color[i]<=0)
      {
        this.spiral_4_color[i] = 0;
        this.spiral_4_color_incr[i] = random_float(0.5,5);
      }
      else if (this.spiral_4_color[i]>=255)
      {
        this.spiral_4_color[i] = 255;
        this.spiral_4_color_incr[i] = -random_float(0.5,5);
      }
    }
    this.spiral_4_angle_acc += this.spiral_4_angle_acc_add;
    this.spiral_4_angle_vel += this.spiral_4_angle_vel_add;
    if (this.timer%difficulty == 0)
    {
      let temp_proj = new Projectile(this.spiral_4_radius+7*this.timer/this.spiral_4_time_end,[this.spiral_4_color[0],this.spiral_4_color[1],this.spiral_4_color[2],70],width/2,height/2,
        this.spiral_4_vel*Math.cos(this.spiral_4_angle_vel),this.spiral_4_vel*Math.sin(this.spiral_4_angle_vel),
        this.spiral_4_acc*Math.cos(this.spiral_4_angle_acc)*Math.cos(this.spiral_4_angle_vel)
        ,this.spiral_4_acc*Math.sin(this.spiral_4_angle_acc)*Math.sin(this.spiral_4_angle_vel))
      this.projectiles.push(temp_proj);
    }
    


    this.projectiles = Projectile.update_list(this.projectiles);

    if (this.timer>this.spiral_4_time_end)
    {
      return true;
    }
    return false;
  }

  example_attack_initializer()
  {
    this.attack_started = true;

    this.example_attack_time_end = 60*20;

    this.example_attack_angle = random_float(0,2*Math.PI);
    this.example_attack_angle_increment = random_float(0.02,0.03);

    this.example_attack_num1 = random_float(2,6);
    this.example_attack_num2 = random_float(2,6);
    this.example_attack_num3 = random_float(2,6);
    this.example_attack_num4 = random_float(2,6);

    this.example_attack_radius = random_int(20,30);
  }

  example_attack(difficulty)
  {
    if (!this.attack_started)
    {
      this.example_attack_initializer();
    }

    this.example_attack_angle += Math.PI/2+this.example_attack_angle_increment; 

    if (this.timer%(difficulty*3) == 0)
    {
      let temp_proj = new Projectile(this.radius,[255,0,0,255-254*this.timer/this.example_attack_time_end],width/2,height/2
      ,this.example_attack_num1 * Math.cos(this.example_attack_angle),
      this.example_attack_num2 * Math.sin(this.example_attack_angle)
      ,0,0.2);
      
      this.projectiles.push(temp_proj);

      temp_proj = new Projectile((30-this.example_attack_radius)+20,[255,0,0,255-254*this.timer/this.example_attack_time_end],width/2,height/2
      ,this.example_attack_num3 * Math.cos(-this.example_attack_angle+0.4),
      this.example_attack_num4 * Math.sin(-this.example_attack_angle+0.4)
      ,0,0);
        
      this.projectiles.push(temp_proj);
    }

    
    this.projectiles = Projectile.update_list(this.projectiles);

    if (this.timer>this.example_attack_time_end)
    {
      return true; // attack has ended
    }
    return false; // attack still going on
  }

  khelo_attack_initializer()
  {
    this.attack_started=true;
   
    this.khelo_attack_time_end = 10*60;
 
    this.khelo_attack_angle = 0;
  }

  khelo_attack(difficulty)
  {
    if (!this.attack_started)
    {
      this.khelo_attack_initializer();
    }
 
    this.khelo_attack_angle += Math.PI/2+0.01;
 
    if (this.timer%3 == 0)
    {
      let temp_proj = new Projectile(25,[255,0,0],width/2,height/2
      ,1,1
      ,0,0);
     
      this.projectiles.push(temp_proj);
 
      temp_proj = new Projectile(25,[255,0,0],width/2,height/2
      ,4 * Math.cos(-this.khelo_attack_angle+0.4),6 * Math.sin(-this.khelo_attack_angle+0.4)
      ,0,0);
       
      this.projectiles.push(temp_proj);
    }
    this.projetiles = Projectile.update_list(this.projectiles);
    if (this.timer > this.khelo_attack_time_end)
    {
      return true;
    }

    return false;
  }

  unique_1_initializer()
  {
    this.attack_started=true;
   
    this.unique_1_time_end = 20*60;
  }

  unique_1(difficulty)
  {
    if (!this.attack_started)
    {
      this.unique_1_initializer();
    }

    if (this.timer%difficulty == 0)
    {

    }

    if (this.timer>this.unique_1_time_end)
    {
      return true;
    }
    return false
  }


  
  /** higher difficulty number = less projectiles */
  update_main(difficulty)
  {
      let current_attack_number = this.attack_arr[this.attack_index];
      let finished_attack = false;

      this.timer +=1;

      switch(current_attack_number)
      {
        case this.SPIRAL_1:
          finished_attack = this.spiral_1(difficulty);
          break;

        case this.SPIRAL_2:
          finished_attack = this.spiral_2(difficulty);
          break;

        case this.SPIRAL_3:
          finished_attack = this.spiral_3(difficulty);
          break;

        case this.SPIRAL_4:
          finished_attack = this.spiral_4(difficulty);
          break
        
        case this.EXAMPLE_ATTACK:
          finished_attack = this.example_attack(difficulty);
          break

        case this.KHELO_ATTACK:
          finished_attack = this.khelo_attack(difficulty);
          break;
        
        case UNIQUE_1:
          finished_attack = this.unique_1(difficulty);
          break;
        default:
          console.log('out of attack arr bounds');
      }

      if (finished_attack)
      {
        console.log(this.attack_index);
        this.attack_index +=1;
        this.attack_started = false;

        if (this.attack_index == this.attack_arr.length)
        {
          this.attack_index = this.ATTACK_INDEX_RETURN_TO;
        }
        this.timer = 0;
        this.projectiles = []; // remove this lien of code if you want projectiles to linger after attack end
        return true;
      }
      return false;
  }
}

let main_update_object = new Main_update_class(); // USED FOR ALL ATTACKS

let global_questions = [
  'What is the integral of 2x?'
  ,'Who is the first president of the United States'
  ,'What is the capital of Canada?'
  ,'What does SHOELACE FORMULA give you?'
  ,'If x^2+2x+1 = 4, what is the positive integer solution for x?'
  ,'What is the exact value of Tau?'
  ,'The sum of the first 100 positive integers'
  ,'When was the guillotine invented?'
  ,'What is the RGB value of Blue?'
  ,'How many dozen eggs are in 1 dozen eggs?'
  ]
  
  //make correct answer the first answer
  let global_answers = [
  ['x^2+C','2x^2+C','2x+C','2+C'],
  ['George Washington','Sahan','Michael and Alvin','Darmal'],
  ['Ottawa','Toronto','Montreal','Vancouver'],
  ['Area','Perimeter','The length of your Shoelace','Surface Area'],
  ['1','-3','1, -3','5'],
  ['The ratio of the circumference to the radius','6.28','6','3*Pi'],
  ['5050','100','1000','505'],
  ['1792','1802','1812','1782'],
  ['(0,0,255)','Blue','(255,0,0)','(0,255,0)'],
  ['1','12','144','24']
  ]

//make sure its in 60 fps -- > value of 120 would be 2 seconds
let global_time_wait = 320;

let question_box = document.createElement('div');
question_box.style.position = "absolute";
question_box.style.height = height/5+"px";
question_box.style.width = "300px";
question_box.style.left = width+"px";
question_box.style.backgroundColor = "aqua";

document.body.appendChild(question_box); 

// let text = "hello world";
// question_box.innerHTML = text;
// question_box.style.fontSize = 100 / Math.sqrt(text.length) + "px";

let answer_boxes = [null,null,null,null];
for (let i = 0; i < 4; i++)
{
  answer_boxes[i] = document.createElement('div');
  answer_boxes[i].style.position = "absolute";
  answer_boxes[i].style.height = height/5+"px";
  answer_boxes[i].style.width = "300px";
  answer_boxes[i].style.left = width+"px";
  answer_boxes[i].style.top = (height/5*(i+1))+"px";

  document.body.appendChild(answer_boxes[i]); 
}

//just displays 1,2,3,4
let number_displays = [null,null,null,null];
for (let i = 0; i < 4; i++)
{
  number_displays[i] = document.createElement('div');
  number_displays[i].style.position = "absolute";
  number_displays[i].style.height = "300px";
  number_displays[i].style.width = "300px";

  number_displays[i].style.backgroundColor = "rgba(0,0,0,0)";
  switch (i)
  {
    case 0:
      number_displays[0].style.top = height/4+"px";
      number_displays[0].style.left = width/4+"px";
      break;
    case 1:
      number_displays[1].style.top = height/4+"px";
      number_displays[1].style.left = 3*width/4+"px";
      break;
    case 2:
      number_displays[2].style.top = 3*height/4+"px";
      number_displays[2].style.left = width/4+"px";
      break;
    case 3:
      number_displays[3].style.top = 3*height/4+"px";
      number_displays[3].style.left = 3*width/4+"px";
      break;
  }


  document.body.appendChild(number_displays[i]); 

  temp_text = (i+1)+'';
  number_displays[i].innerHTML = temp_text;
  number_displays[i].style.fontSize = 150 / Math.sqrt(temp_text.length) + "px";
}

let global_timer = 0;
let global_amount_qa = global_answers.length;
let global_current_qa_num;
let global_current_answers; // element with value of 0 will be correct answer
let global_location_correct_ans;

let global_timer_text_box = document.createElement('div');
global_timer_text_box.style.position = "absolute";
global_timer_text_box.style.height = "100px";
global_timer_text_box.style.width = "300px";
global_timer_text_box.style.backgroundColor = "rgba(255,255,255,0)";
document.body.appendChild(global_timer_text_box); 

temp_text = '0'
global_timer_text_box.innerHTML = temp_text;
global_timer_text_box.style.fontSize = "50px";


function start_new_question()
{
  player.x_max = width;
  player.x_min = 0;
  player.y_max = height;
  player.y_min = 0;

  global_timer = 0;
  global_current_qa_num = random_int(1,global_amount_qa)-1;

  let temp_text = global_questions[global_current_qa_num];
  question_box.innerHTML = temp_text;
  question_box.style.fontSize = 150 / Math.sqrt(temp_text.length) + "px";

  //generating answer arr
  global_current_answers = [-1,-1,-1,-1];

  for (let  question_num = 0; question_num < 4; question_num++)
  {
    let temp_num = random_int(0,3);
    while (global_current_answers[temp_num]!=-1)
    {
      temp_num = random_int(0,3);
    }
    if (question_num == 0)
    {
      global_location_correct_ans = temp_num;
    }
    global_current_answers[temp_num] = question_num;
  }

  for (let i = 0; i < 4; i++)
  {
    temp_text = ((i+1)+". ")+global_answers[global_current_qa_num][global_current_answers[i]];
    answer_boxes[i].innerHTML = temp_text;
    answer_boxes[i].style.fontSize = 150 / Math.sqrt(temp_text.length) + "px";
    answer_boxes[i].style.backgroundColor = "rgba(255,220,220)";
  }
}

//higher the number easier the difficulty
let global_attack_difficulty = 3;
//higher value is better
let global_point_multiplier = 1;

let global_player_ans;
let global_score = 0; 

function question_ended()
{
  for (let i = 0; i<4; i++)
  {
    if (global_current_answers[i] !=0)
    {
      answer_boxes[i].style.backgroundColor = "red";
    }
    else
    {
      answer_boxes[i].style.backgroundColor = "green";
    }
  }

  global_player_ans = 0;

  if (player.pos_x>width/2)
  {
    player.x_min = width/2;
    player.x_max = width;
    global_player_ans+=1
  }
  else
  {
    player.x_min = 0;
    player.x_max = width/2;
  }

  if (player.pos_y>height/2)
  {
    player.y_min = height/2;
    player.y_max = height;
    global_player_ans+=2
  }
  else
  {
    player.y_min = 0;
    player.y_max = height/2;
  }
  
  if (global_player_ans == global_location_correct_ans)
  {
    global_attack_difficulty = 3;
    global_point_multiplier = 5;
  }
  else
  {
    global_attack_difficulty = 3; 
    global_point_multiplier = 1;
  }

}


//this code is no bueno
let global_angle = 0;
let global_angle_increment = 0.03;
let global_speed = 5;
let global_radius = 40;

//background(255,255,255);

let global_global_timer_never_reset = 0;
function update_main_loop()
{
  global_global_timer_never_reset+=1;
  if (!global_continue_waiting_for_start_really_long_variable_name_hello_future_viewers)
  {
    background(255,255,255);

    global_timer+=1;

    if (global_timer == global_time_wait)
    {
      question_ended();
    }

    if (global_timer> global_time_wait)
    {
      if (global_timer%85==0)
      {
        global_angle += global_angle_increment
        for (let i = 0; i < 12; i++)
        {
          let temp_angle = global_angle+i*Math.PI/6;
          
          let temp_proj = new Projectile(global_radius,[30,30,30,70],width/2,height/2,
          global_speed * Math.cos(temp_angle),global_speed * Math.sin(temp_angle))

          temp_proj.move();

          let temp_num = 0;

          if (temp_proj.pos_x>width/2)
          {
            temp_num+=1
          }
          if (temp_proj.pos_y>height/2)
          {
            temp_num+=2
          }

          if (temp_num != global_location_correct_ans)
          {
            main_update_object.projectiles.push(temp_proj);
          }

        }
      }


      let should_end_attack = main_update_object.update_main(global_attack_difficulty);
      if (should_end_attack)
      {
        start_new_question();
      }
      else
      {
        if (player.immunity())
        {
          if (global_player_ans == global_location_correct_ans)
          {
            global_score+=Math.sqrt(player.current_immunity_frames)*global_point_multiplier/20;
          }
          else
          {
            global_score+=(player.current_immunity_frames**0.25)*global_point_multiplier/20;
          }
          global_timer_text_box.style.color = "black";
        }
        else
        {
          global_score -= (10/global_point_multiplier);
          if (global_score<0)
          {
            global_score = 0;
          }
          global_timer_text_box.style.color = "red";
        }
    
        global_timer_text_box.innerHTML = Math.floor(global_score)+"";


      }
    }


  } 
  // publish position
  if (global_global_timer_never_reset > 60 && global_global_timer_never_reset % 2 == 1) 
  {
    publish_position();
  }
  for (const p_id in global_player_arr) {
    if (p_id == myClientId) continue;
    let curPlayer = global_player_arr[p_id];

    let temp_pos_x = curPlayer.x; 
    let temp_pos_y = curPlayer.y;
    let temp_current_immunity_frames = curPlayer.iframes; 
    let temp_color;
    if (temp_current_immunity_frames > this.total_immunity_frames)
    {
      temp_color = [255,0,0];
    }
    else
    {
      temp_color = [0,255,0];
    }
    draw_circle(temp_pos_x+width/2,temp_pos_y+height/2,player.radius,temp_color,true,temp_color)
  }
  player.update();
  draw_line(0,height/2,width,height/2,[0,0,0]);
  draw_line(width/2,0,width/2,height,[0,0,0]);
}

// XY
// .x
// .y

// pos = [x,y]

function publish_position()
{
  socket.emit("player-state", {
    clientId: myId,
    gameCode: roomCode,
    player: {
      x: Math.floor(player.pos_x-width/2),
      y: Math.floor(player.pos_y-height/2),
      score: Math.floor(global_score),
      iframes: player.current_immunity_frames,
      nickname: myNickname
    }
  })
}  

setInterval(update_main_loop,1000/60);