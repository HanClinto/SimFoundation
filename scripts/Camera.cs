using Godot;
using System;

public partial class Camera : Camera2D
{
	// Called when the node enters the scene tree for the first time.
	public override void _Ready()
	{
		
	}

	// Called every frame. 'delta' is the elapsed time since the previous frame.
	public override void _Process(double delta)
	{
		Vector2 direction = Input.GetVector("button_cam_left", "button_cam_right", "button_cam_up", "button_cam_down");

		// Output our direction Vector
		GD.Print($"Our input direction vector: {direction}");
		GD.Print($"Our time since last frame: {delta}");
		this.Position += direction * 128 * (float)delta;
	}
}
