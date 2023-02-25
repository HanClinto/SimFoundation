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
