extends CharacterBody2D

const SPEED = 40.0
const SCIENTIST = 0
const ENGINEER = 1
const DCLASS = 2
const JANITOR = 3
const MTF = 4
const DOWN = 0
const UP = 1
const RIGHT = 2
const LEFT = 3
const NUM_ACTIONS = 14
const NUM_ACTION_FRAMES = 3
const ACTION_ANIM_SPEED = 500
const NEXT_POSITION_INDEX = 0
const ARRIVE_DISTANCE = 1.0

var last_velocity = Vector2.ZERO
var last_direction = DOWN
var path = []
var worker_type = SCIENTIST
var action_type = 13
var worker_name = "John Doe"

static var selected_worker: Worker = null

func _ready():
    worker_type = int(get_meta("workerType"))
    print("Worker Type: %d" % worker_type)
    worker_name = NameGenerator.generate_name()

func _process(delta):
    const NUM_WALK_FRAMES = 4
    const ANIM_SPEED = 4

    var direction = last_direction
    var walk_frame = 0

    if last_velocity.y > SPEED * 0.25:
        direction = DOWN
        walk_frame = int(position.y / ANIM_SPEED) % NUM_WALK_FRAMES
    elif last_velocity.x > SPEED * 0.25:
        direction = RIGHT
        walk_frame = int(position.x / ANIM_SPEED) % NUM_WALK_FRAMES
    elif last_velocity.x < -SPEED * 0.25:
        direction = LEFT
        walk_frame = int(position.x / ANIM_SPEED) % NUM_WALK_FRAMES
    elif last_velocity.y < -SPEED * 0.25:
        direction = UP
        walk_frame = int(position.y / ANIM_SPEED) % NUM_WALK_FRAMES
    else:
        walk_frame = 0

    if walk_frame < 0:
        walk_frame += NUM_WALK_FRAMES

    var sprite = get_node("CharacterSprite") as Sprite2D
    sprite.frame = direction * NUM_WALK_FRAMES + walk_frame + worker_type * 4 * NUM_WALK_FRAMES
    last_direction = direction

    var selection_sprite = get_node("SelectionSprite") as AnimatedSprite2D
    if selection_sprite.visible != is_selected():
        var name_label = get_node("NameLabel") as Label
        if is_selected():
            selection_sprite.play()
            name_label.text = worker_name
        selection_sprite.visible = is_selected()
        name_label.visible = is_selected()

    var ticks = Time.get_ticks_msec()
    var action_frame = int(ticks / ACTION_ANIM_SPEED) % NUM_ACTION_FRAMES
    var action_sprite = get_node("ActionSprite") as Sprite2D
    action_sprite.frame = action_type * NUM_ACTION_FRAMES + action_frame

func _physics_process(delta):
    var velocity = self.velocity
    var direction = Vector2.ZERO

    if path.size() > 0:
        var target_point_world = path[NEXT_POSITION_INDEX]
        if arrived_to(target_point_world):
            path.remove_at(NEXT_POSITION_INDEX)
            if path.size() > 0:
                target_point_world = path[NEXT_POSITION_INDEX]
        if path.size() == 0:
            direction = Vector2.ZERO
        else:
            direction = (target_point_world - position).normalized()
    else:
        if is_selected():
            direction = Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")

    velocity = direction * SPEED
    self.velocity = velocity
    move_and_slide()
    last_velocity = self.velocity

    if is_selected():
        if Input.is_action_just_pressed("button_1"):
            worker_type = 0
        if Input.is_action_just_pressed("button_2"):
            worker_type = 1
        if Input.is_action_just_pressed("button_3"):
            worker_type = 2
        if Input.is_action_just_pressed("button_4"):
            worker_type = 3
        if Input.is_action_just_pressed("button_5"):
            worker_type = 4
        if Input.is_action_just_pressed("button_6"):
            worker_type = 5
        if Input.is_action_just_pressed("button_7"):
            worker_type = 6
        if Input.is_action_just_pressed("button_next_action"):
            action_type += 1
            if action_type >= NUM_ACTIONS:
                action_type = 0
        if Input.is_action_just_pressed("button_prev_action"):
            action_type -= 1
            if action_type < 0:
                action_type = NUM_ACTIONS - 1

func set_action(new_action):
    action_type = (new_action + NUM_ACTIONS) % NUM_ACTIONS

func set_path(new_path):
    path = new_path

func arrived_to(destination):
    return position.distance_to(destination) < ARRIVE_DISTANCE

func is_selected() -> bool:
    return selected_worker == self

func set_selected(value: bool):
    if value:
        selected_worker = self
    elif is_selected():
        selected_worker = null
