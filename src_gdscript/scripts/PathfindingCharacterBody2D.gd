extends CharacterBody2D

const SPEED = 40.0
const DOWN = 0
const UP = 1
const RIGHT = 2
const LEFT = 3
const NEXT_POSITION_INDEX = 0
const ARRIVE_DISTANCE = 1.0

var last_velocity = Vector2.ZERO
var last_direction = DOWN
var path = []

static var selected_character: PathfindingCharacterBody2D = null

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
        # Uncomment the following lines if you want to allow manual control
        # if is_selected():
        #     direction = Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")

    velocity = direction * SPEED
    self.velocity = velocity
    move_and_slide()

    last_velocity = self.velocity

func set_path(new_path):
    path = new_path

func arrived_to(destination):
    return position.distance_to(destination) < ARRIVE_DISTANCE

func is_selected() -> bool:
    return selected_character == self

func set_selected(value: bool):
    if value:
        selected_character = self
    elif is_selected():
        selected_character = null
