extends Camera2D

# Called when the node enters the scene tree for the first time.
func _ready():
    pass

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
    var direction = Input.get_vector("button_cam_left", "button_cam_right", "button_cam_up", "button_cam_down")
    position += direction * 128 * delta
