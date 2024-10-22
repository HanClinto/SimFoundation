extends Node2D

# Called when the node enters the scene tree for the first time.
func _ready():
    pass

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
    pass

# Called 60 times per second. 'delta' is the elapsed time since the previous frame.
func _physics_process(delta):
    ._physics_process(delta)

func _input(event):
    if event is InputEventMouseButton and event.is_pressed():
        print("Viewport Resolution is: ", get_viewport_rect().size)
        print(" Mouse Click/Unclick at: ", event.position)
        var global_mouse_position = get_global_mouse_position()
        print("  Global Mouse Position: %s" % str(global_mouse_position))
        var this_worker = get_node_at_position(global_mouse_position, "workers") as Worker
        if this_worker != null:
            if Worker.selected_worker != null:
                Worker.selected_worker.set_action(-1)
            this_worker.set_selected(not this_worker.is_selected())
            this_worker.set_action(0)
        else:
            var clicked_cell = (global_mouse_position - Vector2i(8, 8)) / 16
            if Worker.selected_worker == null:
                var tilemap = get_node("TileMap") as TileMap
                tilemap.set_cell(1, clicked_cell, 2, Vector2i(2, 2), 0)
            else:
                var tilemap = get_node("TileMap") as PathFindingAStarTilemap
                var path_start = Worker.selected_worker.transform.origin
                var path_end = global_mouse_position
                print("  Path Start: %s" % str(path_start))
                print("  Path End: %s" % str(path_end))
                var path = tilemap.get_path(path_start, path_end)
                Worker.selected_worker.set_path(path)
                print("  Path: %s" % str(path))
                for i in range(path.size()):
                    var path_node = path[i]
                    print("    Path Node %d: %s" % [i, str(path_node)])

func get_node_at_position(global_position: Vector2, group_name: String) -> Node:
    var objects = get_tree().get_nodes_in_group(group_name)
    for obj in objects:
        var sprite = obj.get_node("CharacterSprite") as Sprite2D
        var sprite_global_transform = sprite.get_global_transform()
        var sprite_mouse_position = global_position - sprite_global_transform.origin
        print("    Object %s Rect: %s" % [obj.name, str(sprite.get_rect())])
        if sprite.get_rect().has_point(sprite_mouse_position):
            print("     Clicked on %s!" % obj.name)
            return obj
    return null

func _enter_tree():
    pass

func _exit_tree():
    pass
