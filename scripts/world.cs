using Godot;
using System;

public partial class world : Node2D
{
	// Called when the node enters the scene tree for the first time.
	public override void _Ready()
	{
	}

	// Called every frame. 'delta' is the elapsed time since the previous frame.
	public override void _Process(double delta)
	{
	}

	// Called 60 times per second. 'delta' is the elapsed time since the previous frame.
	public override void _PhysicsProcess(double delta)
	{
		base._PhysicsProcess(delta);
	}


	Worker selectedWorker = null;

	public override void _Input(InputEvent @event)
	{
		// If the mouse button is pressed:
		if (@event is InputEventMouseButton eventMouseButton && 
			eventMouseButton.IsPressed())
		{
			// Print the size of the viewport.
			GD.Print("Viewport Resolution is: ", GetViewportRect().Size);

			GD.Print(" Mouse Click/Unclick at: ", eventMouseButton.Position);
			Vector2 globalMousePosition = GetGlobalMousePosition();

			// Log the mouse global and local coordinates
			GD.Print($"  Global Mouse Position: {globalMousePosition}");

			var thisWorker = GetNodeAtPosition(globalMousePosition, "workers") as Worker;

			if (thisWorker != null)
			{
				if (Worker.SelectedWorker != null) {
					Worker.SelectedWorker.SetAction(-1);
				}
				thisWorker.IsSelected = !thisWorker.IsSelected;

				// Change the object's state to follow the mouse
				thisWorker.SetAction(0);
				
				selectedWorker = thisWorker;
			} else {
				var clickedCell = (Vector2I)((globalMousePosition - new Vector2I(8,8)) / 16);
				if (selectedWorker == null)
				{
					// Get our TileMap node
					var tilemap = GetNode<TileMap>("TileMap");
					tilemap.SetCell(1, clickedCell, 2, new Vector2I(2, 2), 0);
				}
				else // if (selectedWorker != null)
				{
					// Set the tilemap tile at this position
					// Get the PathFindingAStarTilemap instance on our TileMap node
					var tilemap = GetNode<PathFindingAStarTilemap>("TileMap");

					var pathStart = selectedWorker.Transform.Origin;
					var pathEnd = globalMousePosition;

					GD.Print($"  Path Start: {pathStart}");
					GD.Print($"  Path End: {pathEnd}");

					var path = tilemap.GetPath(pathStart, pathEnd);

					selectedWorker.SetPath(path);

					GD.Print($"  Path: {path}");

					for (int i = 0; i < path.Count; i++)
					{
						var pathNode = path[i];
						GD.Print($"    Path Node {i}: {pathNode}");
					}
				}
			}
		}
		/*
		else if (@event is InputEventMouseMotion eventMouseMotion)
		{
			GD.Print("Mouse Motion at: ", eventMouseMotion.Position);
		}
		*/

	}

	public Node GetNodeAtPosition(Vector2 globalPosition, string groupName)
	{
		// Find worker objects at the mouse position
		var objects = GetTree().GetNodesInGroup(groupName);
		foreach (Node2D obj in objects)
		{
			// Get the sprite node from the worker object
			var sprite = obj.GetNode<Sprite2D>("CharacterSprite");
			// Get the global position of the sprite
			var spriteGlobalTransform = sprite.GetGlobalTransform();
			
			var spriteMousePosition = globalPosition - spriteGlobalTransform.Origin;

			GD.Print($"    Object {obj.Name} Rect: {sprite.GetRect()}");

			if (sprite.GetRect().HasPoint(spriteMousePosition))
			{
				GD.Print($"     Clicked on {obj.Name}!");

				return obj;
			}
		}
		return null;
	}

	// Called when the node enters the scene tree.
	public override void _EnterTree()
	{
	}

	// Called when the node exits the scene tree, i.e. when it is removed from all
	// parents.
	public override void _ExitTree()
	{
	}



}
