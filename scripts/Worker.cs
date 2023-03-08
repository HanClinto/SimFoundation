using Godot;
using System;
using System.Collections.Generic;

public partial class Worker : CharacterBody2D
{
	public const float Speed = 40.0f;


	public const int SCIENTIST = 0;
	public const int ENGINEER = 1;
	public const int DCLASS = 2;
	public const int JANITOR = 3;
	public const int MTF = 4;


	public const int DOWN = 0;
	public const int UP = 1;
	public const int RIGHT = 2;
	public const int LEFT = 3;

	// Get the gravity from the project settings to be synced with RigidBody nodes.
	//public float gravity = ProjectSettings.GetSetting("physics/2d/default_gravity").AsSingle();

	// Called when the node enters the scene tree for the first time.
	public override void _Ready()
	{
		// Read from the "workerType" metadata variable and set this.workerType to it
		this.workerType = (int)GetMeta("workerType");

		// Print the value that we are setting the workerType to
		GD.Print("Worker Type: " + this.workerType);
	}

	public override void _EnterTree()
	{
		base._EnterTree();
		
		// Read from the "workerType" metadata variable and set this.workerType to it
		this.workerType = (int)GetMeta("workerType");

		// Print the value that we are setting the workerType to
		GD.Print("Worker Type: " + this.workerType);
	}

	private Vector2 lastVelocity = Vector2.Zero;
	private int lastDirection = DOWN;

	// "static" means that exactly one of these variables exists and is shared between all workers.
	// So this means we can only have one selected worker in the game at a time.
	static public Worker SelectedWorker = null;

	public bool IsSelected
	{
		get {
			// Return "true" if this worker is currently selected.
			return (Worker.SelectedWorker == this);
		}
		set {
			if (value) {
				// If setting "IsSelected" to true, then will set the global selection to this sprite.
				Worker.SelectedWorker = this;
			} else {
				// If setting "IsSelected" to false, and we are currently selected, then nothing will be selected.
				if (this.IsSelected) {
					Worker.SelectedWorker = null;
				}
			}
		}
	}

	public int workerType = SCIENTIST;

	public int actionType = 13;
	public const int NUM_ACTIONS = 14;
	public const int NUM_ACTION_FRAMES = 3;
	public const int ACTION_ANIM_SPEED = 500; // Msecs per animation frame

	private const int NEXT_POSITION_INDEX = 0;
	private const float ARRIVE_DISTANCE = 1.0f;

	private List<Vector2I> path = new List<Vector2I>();

	public void SetAction(int newAction)
	{
		this.actionType = newAction;
	}

	public void SetPath(List<Vector2I> newPath)
	{
		this.path = newPath;

	}

	public void ToggleSelected()
	{
		// Get the sprite on this object
		AnimatedSprite2D sprite = GetNode<AnimatedSprite2D>("SelectionSprite");

		sprite.Visible = !sprite.Visible;
		// Start the animation playing
		sprite.Play();
	}

	// Called every frame. 'delta' is the elapsed time since the previous frame.
	public override void _Process(double delta)
	{
		const int NUM_WALK_FRAMES = 4;
		const int ANIM_SPEED = 4; // Pixels per animation frame

		int direction = lastDirection; // Load the last direction we were facing as our default for this frame
		int walkFrame = 0;

		// If the player is moving, play the walk animation.

		if (this.lastVelocity.Y > Speed*0.25)
		{
			direction = DOWN;
			walkFrame = ((int)((Position.Y) / ANIM_SPEED)) % NUM_WALK_FRAMES;
		}
		else if (this.lastVelocity.X > Speed*0.25)
		{
			direction = RIGHT;
			walkFrame = ((int)(Position.X / ANIM_SPEED)) % NUM_WALK_FRAMES;
		}
		else if (this.lastVelocity.X < -Speed*0.25)
		{
			direction = LEFT;
			walkFrame = ((int)(Position.X / ANIM_SPEED)) % NUM_WALK_FRAMES;
		}
		else if (this.lastVelocity.Y < -Speed*0.25)
		{
			direction = UP;
			walkFrame = ((int)(Position.Y / ANIM_SPEED)) % NUM_WALK_FRAMES;
		}
		else
		{
			// If we want the player to always face DOWN when idle, then we can do this:
			//direction = DOWN;

			// If idle, then always choose a neutral frame (animation frame 0)
			walkFrame = 0;
		}

		// HACK: Compensate for negative modulo
		if (walkFrame < 0)
		{
			walkFrame += NUM_WALK_FRAMES;
		}

		// Grab the sprite on this object
		Sprite2D sprite = GetNode<Sprite2D>("CharacterSprite");
		
		// Set the animation frame based on the direction and walk frame
		sprite.Frame = direction * NUM_WALK_FRAMES + walkFrame + this.workerType * 4 * NUM_WALK_FRAMES;

		// Save our last direction so that we can use it when we go idle
		this.lastDirection = direction;


		// Update our selection animation
		AnimatedSprite2D selectionSprite = GetNode<AnimatedSprite2D>("SelectionSprite");

		if (selectionSprite.Visible != this.IsSelected) {
			// If our selection changed since the last time we visited
			selectionSprite.Visible = this.IsSelected;
			if (this.IsSelected) {
				// Start the animation playing
				selectionSprite.Play();
			}
		}

		// Update our action animation

		// Get the current game ticks
		ulong ticks = Time.GetTicksMsec();

		int action_frame = (int)(ticks / ACTION_ANIM_SPEED) % NUM_ACTION_FRAMES;

		// Grab the sprite on this object
		Sprite2D actionSprite = GetNode<Sprite2D>("ActionSprite");
		
		// Set the animation frame based on the direction and walk frame
		actionSprite.Frame = this.actionType * NUM_ACTION_FRAMES + action_frame;
	}

	public override void _PhysicsProcess(double delta)
	{
		Vector2 velocity = Velocity;

		// Get the input direction and handle the movement/deceleration.
		// As good practice, you should replace UI actions with custom gameplay actions.
		Vector2 direction = Vector2.Zero;

		// If we have a path that we're currently following
		if (this.path.Count > 0)
		{
			// Get the next position in the path
			Vector2 targetPointWorld = path[NEXT_POSITION_INDEX];

			// If we're close enough to the next position, then remove it from the path
			if (ArrivedTo(targetPointWorld))
			{
				this.path.RemoveAt(NEXT_POSITION_INDEX);

				// Get the next position in the path
				if (this.path.Count > 0)
				{
					targetPointWorld = path[NEXT_POSITION_INDEX];
				}
			}

			if (this.path.Count == 0)
			{
				direction = Vector2.Zero;
			} else {
				// Get the direction to the next position
				direction = (targetPointWorld - Position).Normalized();
			}
		} else {
			// If we're currently selected, then let us be driven around with the arrow keys.
			if (this.IsSelected) {
				direction = Input.GetVector("ui_left", "ui_right", "ui_up", "ui_down");				
			}
		}
		
		velocity = direction * Speed;

		Velocity = velocity;
		MoveAndSlide();

		this.lastVelocity = Velocity;

		// If we're currently selected, then let us change the worker type or current action.
		if (this.IsSelected) {
			// If the player is pressing "1", then change our worker type to 0 (Scientist)
			if (Input.IsActionJustPressed("button_1"))
			{
				this.workerType = 0;
			}

			// If the player is pressing "2", then change our worker type to 1 (Engineer)
			if (Input.IsActionJustPressed("button_2"))
			{
				this.workerType = 1;
			}

			// If the player is pressing "3", then change our worker type to 2 (D-Class)
			if (Input.IsActionJustPressed("button_3"))
			{
				this.workerType = 2;
			}

			// If the player is pressing "4", then change our worker type to 3 (Janitor)
			if (Input.IsActionJustPressed("button_4"))
			{
				this.workerType = 3;
			}

			// If the player is pressing "5", then change our worker type to 4 (MTF)
			if (Input.IsActionJustPressed("button_5"))
			{
				this.workerType = 4;
			}

			// If the player is pressing "6", then change our worker type to 5 (SCP)
			if (Input.IsActionJustPressed("button_6"))
			{
				this.workerType = 5;
			}

			// If the player is pressing "7", then change our worker type to 6
			if (Input.IsActionJustPressed("button_7"))
			{
				this.workerType = 6;
			}

			if (Input.IsActionJustPressed("button_next_action"))
			{
				this.actionType++;
				if (this.actionType >= NUM_ACTIONS)
				{
					this.actionType = 0;
				}
			}

			if (Input.IsActionJustPressed("button_prev_action"))
			{
				this.actionType--;
				if (this.actionType < 0)
				{
					this.actionType = NUM_ACTIONS-1;
				}
			}
		}
	}

	private bool ArrivedTo(Vector2 destination)
	{
		return this.Position.DistanceTo(destination) < ARRIVE_DISTANCE;
	}

}
