extends TileMap

const NAVIGATION_LAYER = 1
const BASE_LINE_WIDTH = 1.0
const DRAW_COLOR = Color(1, 1, 0, 0.25)

@export var map_size: Rect2i

var half_cell_size: Vector2i
var path_start_position: Vector2i
var path_end_position: Vector2i
var a_star_node: AStar2D
var cell_path: Array
var walkable_cells: Array

func _ready():
    half_cell_size = tile_set.tile_size / 2
    map_size = get_used_rect()
    a_star_node = AStar2D.new()
    cell_path = []

    get_walkable_cells()
    add_astar_walkable_cells()
    connect_astar_walkable_cells()

func _draw():
    print("Tilemap Draw Path length: %d" % cell_path.size())

    if cell_path.size() > 0:
        var start_cell = cell_path[0]
        var end_cell = cell_path[cell_path.size() - 1]

        set_cell(NAVIGATION_LAYER, start_cell, 2, Vector2i(0, 2), 0)
        set_cell(NAVIGATION_LAYER, end_cell, 2, Vector2i(1, 2), 0)

        var last_cell = map_to_local(Vector2i(start_cell.x, start_cell.y))

        for i in range(1, cell_path.size()):
            var current_cell = map_to_local(Vector2i(cell_path[i].x, cell_path[i].y))
            draw_line(last_cell, current_cell, DRAW_COLOR, BASE_LINE_WIDTH, true)
            draw_circle(current_cell, BASE_LINE_WIDTH * 2.0, DRAW_COLOR)

            last_cell = current_cell

func get_path(start_coord: Vector2, end_coord: Vector2) -> Array:
    print("Start coord: %s" % str(start_coord))
    print("End coord: %s" % str(end_coord))

    var start_cell = local_to_map(start_coord)
    var end_cell = local_to_map(end_coord)

    print("Start cell: %s" % str(start_cell))
    if not walkable_cells.has(start_cell):
        print("Start cell is not walkable, finding nearest walkable cell")
        start_cell = get_nearest_walkable_cell(start_coord)
        print("Nearest walkable cell: %s" % str(start_cell))

    if not walkable_cells.has(end_cell):
        print("End cell is not walkable, finding nearest walkable cell")
        end_cell = get_nearest_walkable_cell(end_coord)
        print("Nearest walkable cell: %s" % str(end_cell))

    change_path_start_position(start_cell)
    change_path_end_position(end_cell)
    recalculate_path()

    print("Path length: %d" % cell_path.size())

    var path_world = []
    for cell in cell_path:
        var cell_world = map_to_local(Vector2i(cell.x, cell.y))
        path_world.append(cell_world)

    return path_world

func get_nearest_walkable_cell(coord: Vector2) -> Vector2i:
    var nearest_cell = Vector2i()
    var nearest_distance = INF

    for cell in walkable_cells:
        var cell_world = map_to_local(Vector2i(cell.x, cell.y))
        var distance = cell_world.distance_to(coord)
        if distance < nearest_distance:
            nearest_distance = distance
            nearest_cell = cell

    return nearest_cell

func get_walkable_cells():
    walkable_cells = []

    var layers_count = get_layers_count()

    for y in map_size.position.y : map_size.position.y + map_size.size.y:
        for x in map_size.position.x : map_size.position.x + map_size.size.x:
            var cell_is_walkable = true
            var cell = Vector2i(x, y)

            for layer in range(layers_count):
                var cell_tile_data = get_cell_tile_data(layer, cell)
                if cell_tile_data and cell_tile_data.get_collision_polygons_count(0) > 0:
                    cell_is_walkable = false

            if cell_is_walkable:
                walkable_cells.append(cell)

func add_astar_walkable_cells():
    for cell in walkable_cells:
        var cell_index = calculate_cell_index(cell)
        a_star_node.add_point(cell_index, Vector2i(cell.x, cell.y))

func connect_astar_walkable_cells():
    for cell in walkable_cells:
        var cell_index = calculate_cell_index(cell)

        for neighbor_x in range(cell.x - 1, cell.x + 2):
            for neighbor_y in range(cell.y - 1, cell.y + 2):
                if neighbor_x == cell.x and neighbor_y == cell.y:
                    continue

                if neighbor_x != cell.x and neighbor_y != cell.y:
                    var diagonal_cell = Vector2i(neighbor_x, cell.y)
                    var diagonal_cell2 = Vector2i(cell.x, neighbor_y)
                    if not walkable_cells.has(diagonal_cell) or not walkable_cells.has(diagonal_cell2):
                        continue

                var neighbor_cell = Vector2i(neighbor_x, neighbor_y)
                if walkable_cells.has(neighbor_cell):
                    var neighbor_cell_index = calculate_cell_index(neighbor_cell)
                    a_star_node.connect_points(cell_index, neighbor_cell_index, false)

func clear_previous_path_drawing():
    clear_layer(NAVIGATION_LAYER)

func recalculate_path():
    clear_previous_path_drawing()
    var start_cell_index = calculate_cell_index(path_start_position)
    var end_cell_index = calculate_cell_index(path_end_position)

    cell_path.clear()
    var cell_path_array = a_star_node.get_point_path(start_cell_index, end_cell_index)
    for i in range(cell_path_array.size()):
        cell_path.append(cell_path_array[i])

    queue_redraw()

func change_path_start_position(new_path_start_position: Vector2i):
    if walkable_cells.has(new_path_start_position):
        set_cell(NAVIGATION_LAYER, path_start_position, -1)
        set_cell(NAVIGATION_LAYER, new_path_start_position, 2, Vector2i(0, 2), 0)

        path_start_position = new_path_start_position

        if path_end_position and path_end_position != path_start_position:
            recalculate_path()

func change_path_end_position(new_path_end_position: Vector2i):
    if walkable_cells.has(new_path_end_position):
        set_cell(NAVIGATION_LAYER, path_end_position, -1)
        set_cell(NAVIGATION_LAYER, new_path_end_position, 2, Vector2i(1, 2), 0)

        path_end_position = new_path_end_position

        if path_start_position != new_path_end_position:
            recalculate_path()

func calculate_cell_index(cell: Vector2i) -> int:
    return int((cell.x - map_size.position.x) + map_size.size.x * (cell.y - map_size.position.y))
