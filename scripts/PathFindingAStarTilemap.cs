using Godot;
using System;
using System.Collections.Generic;

public partial class PathFindingAStarTilemap : TileMap
{
	private const int NAVIGATION_LAYER = 1;
	private const float BASE_LINE_WIDTH = 1.0f;
	private readonly Color DRAW_COLOR = new Color(0, 0, 0);

	[Export]
	private Rect2I mapSize;

	private Vector2I halfCellSize;
	private Vector2I pathStartPosition;
	private Vector2I pathEndPosition;
	private AStar2D aStarNode;
	private List<Vector2I> cellPath;
	private List<Vector2I> walkableCells;

	public override void _Ready()
	{
		this.halfCellSize = this.TileSet.TileSize / 2;
		this.mapSize = this.GetUsedRect();
		this.aStarNode = new AStar2D();
		this.cellPath = new List<Vector2I>();

		GetWalkableCells();
		AddAStarWalkableCells();
		ConnectAStarWalkableCells();
	}


	public override void _Draw()
	{
		GD.Print($"Tilemap Draw Path length: {this.cellPath.Count}");

		base._Draw();

		if (this.cellPath != null && this.cellPath.Count != 0)
		{

			Vector2I startCell = (Vector2I)this.cellPath[0];
			Vector2I endCell = (Vector2I)this.cellPath[this.cellPath.Count - 1];
			
			SetCell(NAVIGATION_LAYER, startCell, 2, new Vector2I(0, 2), 0);
			SetCell(NAVIGATION_LAYER, endCell,   2, new Vector2I(1, 2), 0);

			Vector2 lastCell = MapToLocal(new Vector2I(startCell.X, startCell.Y)); //  + this.halfCellSize;

			for (int i = 1; i < this.cellPath.Count; i++)
			{
				Vector2 currentCell = MapToLocal(new Vector2I(this.cellPath[i].X, this.cellPath[i].Y)); // + this.halfCellSize;
				DrawLine(lastCell, currentCell, DRAW_COLOR, BASE_LINE_WIDTH, true);
				DrawCircle(currentCell, BASE_LINE_WIDTH * 2.0f, DRAW_COLOR);

				lastCell = currentCell;
			}
		}
	}

	public List<Vector2I> GetPath(Vector2 startCoord, Vector2 endCoord)
	{
		// Debug print the start and end cells
		GD.Print($"Start coord: {startCoord}");
		GD.Print($"End coord: {endCoord}");

		ChangePathStartPosition(LocalToMap(startCoord));
		ChangePathEndPosition(LocalToMap(endCoord));
		RecalculatePath();

		GD.Print($"Path length: {this.cellPath.Count}");

		List<Vector2I> pathWorld = new List<Vector2I>();
		foreach (Vector2I cell in this.cellPath)
		{
			Vector2 cellWorld = MapToLocal(new Vector2I(cell.X, cell.Y)) + this.halfCellSize;
			pathWorld.Add((Vector2I)cellWorld);
		}

		return pathWorld;
	}

	private void GetWalkableCells()
	{
		walkableCells = new List<Vector2I>();

		int layersCount = this.GetLayersCount();

		for (int y = this.mapSize.Position.Y; y < this.mapSize.Position.Y + this.mapSize.Size.Y; y++)
		{
			for (int x = this.mapSize.Position.X; x < this.mapSize.Position.X + this.mapSize.Size.X; x++)
			{
				bool cellIsWalkable = true;
				Vector2I cell = new Vector2I(x, y);

				// Check every layer for physics polygons
				for (int layer = 0; layer < layersCount; layer++)
				{
					var cellTileData = this.GetCellTileData(layer, cell);
					if (cellTileData != null && cellTileData.GetCollisionPolygonsCount(0) > 0)
					{
						cellIsWalkable = false;
					}
				}
				if (cellIsWalkable)
				{
					walkableCells.Add(cell);
				}
			}
		}
	}

	private List<Vector2I> AddAStarWalkableCells()
	{
		foreach (var cell in walkableCells)
		{
			int cellIndex = CalculateCellIndex(cell);
			aStarNode.AddPoint(cellIndex, new Vector2I(cell.X, cell.Y));
		}

		return walkableCells;
	}

	private void ConnectAStarWalkableCells()
	{
		foreach (Vector2I cell in walkableCells)
		{
			int cellIndex = CalculateCellIndex(cell);

			List<Vector2I> neighborCells = new List<Vector2I>();
			neighborCells.Add(new Vector2I(cell.X + 1, cell.Y));
			neighborCells.Add(new Vector2I(cell.X - 1, cell.Y));
			neighborCells.Add(new Vector2I(cell.X, cell.Y + 1));
			neighborCells.Add(new Vector2I(cell.X, cell.Y - 1));

			foreach (Vector2I neighborCell in neighborCells)
			{
				if (walkableCells.Contains(neighborCell))
				{
					int neighborCellIndex = CalculateCellIndex(neighborCell);
					this.aStarNode.ConnectPoints(cellIndex, neighborCellIndex, false);
				}
			}
		}
	}

	private void ClearPreviousPathDrawing()
	{
		this.ClearLayer(NAVIGATION_LAYER);
	}

	private void RecalculatePath()
	{
		ClearPreviousPathDrawing();
		int startCellIndex = CalculateCellIndex(this.pathStartPosition);
		int endCellIndex = CalculateCellIndex(this.pathEndPosition);

		this.cellPath.Clear();
		Vector2[] cellPathArray = this.aStarNode.GetPointPath(startCellIndex, endCellIndex);
		for (int i = 0; i < cellPathArray.Length; i++)
		{
			this.cellPath.Add((Vector2I)cellPathArray[i]);
		}

		QueueRedraw();
	}

	private void ChangePathStartPosition(Vector2I newPathStartPosition)
	{
		if (this.walkableCells.Contains(newPathStartPosition))
		{
			SetCell(NAVIGATION_LAYER, pathStartPosition, -1);
			SetCell(NAVIGATION_LAYER, newPathStartPosition, 2, new Vector2I(0, 2), 0);

			this.pathStartPosition = newPathStartPosition;

			if (this.pathEndPosition == null && !this.pathEndPosition.Equals(this.pathStartPosition))
			{
				RecalculatePath();
			}
		}
	}

	private void ChangePathEndPosition(Vector2I newPathEndPosition)
	{
		if (this.walkableCells.Contains(newPathEndPosition))
		{
			SetCell(NAVIGATION_LAYER, pathEndPosition, -1);
			SetCell(NAVIGATION_LAYER, newPathEndPosition, 2, new Vector2I(1, 2), 0);

			this.pathEndPosition = newPathEndPosition;

			if (!this.pathStartPosition.Equals(newPathEndPosition))
			{
				RecalculatePath();
			}
		}
	}

	private int CalculateCellIndex(Vector2I cell)
	{
		return (int)((cell.X - this.mapSize.Position.X) + this.mapSize.Size.X * (cell.Y - this.mapSize.Position.Y));
	}

}
