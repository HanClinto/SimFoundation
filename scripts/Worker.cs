using Godot;
using System;

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
	}

	private Vector2 lastVelocity = Vector2.Zero;
	private int lastDirection = DOWN;

	public int workerType = SCIENTIST;

	public int actionType = 0;
	public const int NUM_ACTIONS = 14;
	public const int NUM_ACTION_FRAMES = 3;
	public const int ACTION_ANIM_SPEED = 500; // Msecs per animation frame

	// Called every frame. 'delta' is the elapsed time since the previous frame.
	public override void _Process(double delta)
	{


		const int NUM_WALK_FRAMES = 4;
		const int ANIM_SPEED = 4; // Pixels per animation frame

		int direction = lastDirection; // Load the last direction we were facing as our default for this frame
		int walkFrame = 0;

		// If the player is moving, play the walk animation.

		if (this.lastVelocity.Y > 0)
		{
			direction = DOWN;
			walkFrame = ((int)(Position.Y / ANIM_SPEED)) % NUM_WALK_FRAMES;
		}
		else if (this.lastVelocity.X > 0)
		{
			direction = RIGHT;
			walkFrame = ((int)(Position.X / ANIM_SPEED)) % NUM_WALK_FRAMES;
		}
		else if (this.lastVelocity.X < 0)
		{
			direction = LEFT;
			walkFrame = ((int)(Position.X / ANIM_SPEED)) % NUM_WALK_FRAMES;
		}
		else if (this.lastVelocity.Y < 0)
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
		Vector2 direction = Input.GetVector("ui_left", "ui_right", "ui_up", "ui_down");
		
		velocity = direction * Speed;

		Velocity = velocity;
		MoveAndSlide();

		this.lastVelocity = Velocity;

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