import type { Request, Response } from "express";

type Move = "up" | "down" | "left" | "right";
interface Location {
  x: number;
  y: number;
}
interface Square extends Location {
  cost: number;
  food: boolean;
  target: boolean;
  price: number;
  previous?: Square;
  direction?: Move;
}
type Board = Map<string, Square>;

function createBoardMap(width: number, height: number): Board {
  const board = new Map<string, Square>();
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      board.set(`${x},${y}`, {
        x,
        y,
        cost: 1,
        food: false,
        price: 99999999,
        target: false,
      });
    }
  }
  return board;
}

function removeSnakeBodies(board: Board, snakes: Snake[]): Board {
  for (const snake of snakes) {
    for (const segment of snake.body) {
      board.delete(`${segment.x},${segment.y}`);
    }
  }
  return board;
}

function addHazards(board: Board, hazards: Location[]): Board {
  for (const hazard of hazards) {
    const location = board.get(`${hazard.x},${hazard.y}`);
    if (location) {
      location.cost = 15;
      board.set(`${hazard.x},${hazard.y}`, location);
    }
  }
  return board;
}

function addFood(board: Board, foods: Location[]): Board {
  for (const food of foods) {
    const location = board.get(`${food.x},${food.y}`);
    if (location) {
      location.food = true;
      board.set(`${food.x},${food.y}`, location);
    }
  }
  return board;
}

interface Snake {
  id: string;
  name: string;
  latency: string;
  health: number;
  body: Location[];
  head: Location;
  length: number;
  shout: string;
}
interface GameData {
  game: {
    id: string;
    ruleset: { name: string; version: string };
    timeout: number;
  };
  turn: number;
  board: {
    height: number;
    width: number;
    snakes: Snake[];
    food: Location[];
    hazards: Location[];
  };
  you: Snake;
}

function planPaths(
  board: Board,
  head: Location
): { food: Square | null; target: Square | null } {
  const queue: Square[] = [
    { x: head.x, y: head.y, cost: 0, price: 0, food: false, target: false }, // Set our head as the starting location
  ];

  let nearestFood = null;
  let nearestTarget = null;

  while (queue.length) {
    // Make sure we're sorted, to get the shortest path to check
    queue.sort((a, b) => (a.price < b.price ? -1 : a.price > b.price ? 1 : 0));

    const current = queue.shift();
    if (current.food && !nearestFood) nearestFood = current; // If we are food, then return us
    if (current.target && !nearestTarget) nearestTarget = current; // If we are food, then return us
    if (nearestFood && nearestTarget) {
      return { food: nearestFood, target: nearestTarget };
    }

    // Check above
    let next: Square | null;
    if ((next = board.get(`${current.x},${current.y + 1}`))) {
      // Get the square, and make sure it exists
      if (next.cost + current.price < next.price) {
        // Check we're not creating a more expensive path
        next.previous = current;
        next.price = next.cost + current.price;
        next.direction = "up";
        board.set(`${current.x},${current.y + 1}`, next);
        queue.push(next);
      }
    }

    // Check below
    if ((next = board.get(`${current.x},${current.y - 1}`))) {
      if (next.cost + current.price < next.price) {
        // Check we're not creating a more expensive path
        next.previous = current;
        next.price = next.cost + current.price;
        next.direction = "down";
        board.set(`${current.x},${current.y - 1}`, next);
        queue.push(next);
      }
    }

    // Check left
    if ((next = board.get(`${current.x - 1},${current.y}`))) {
      if (next.cost + current.price < next.price) {
        // Check we're not creating a more expensive path
        next.previous = current;
        next.price = next.cost + current.price;
        next.direction = "left";
        board.set(`${current.x - 1},${current.y}`, next);
        queue.push(next);
      }
    }

    // Check right
    if ((next = board.get(`${current.x + 1},${current.y}`))) {
      if (next.cost + current.price < next.price) {
        // Check we're not creating a more expensive path
        next.previous = current;
        next.price = next.cost + current.price;
        next.direction = "right";
        board.set(`${current.x + 1},${current.y}`, next);
        queue.push(next);
      }
    }
  }

  return { food: nearestFood, target: nearestTarget };
}

function getNextStepOfPath(target: Square) {
  let current = target;
  while (current.previous.previous) {
    current = current.previous;
  }
  return current;
}

function getRandomMove(): Move {
  const moves: Move[] = ["up", "down", "left", "right"];
  return moves[Math.floor(Math.random() * moves.length)];
}

function planFurthestPath(board: Board) {
  let squares = Array.from(board).map((v) => v[1]);
  squares = squares.filter((v) => v.price < 10000);
  squares.sort((a, b) => (a.price < b.price ? 1 : a.price > b.price ? -1 : 0));
  return squares.shift();
}

function addTunnels(board: Board) {
  let squares = Array.from(board).map((v) => v[1]);
  for (const square of squares) {
    if (
      !square.food &&
      (board.has(`${square.x - 1},${square.y}`) ? 1 : 0) +
        (board.has(`${square.x + 1},${square.y}`) ? 1 : 0) +
        (board.has(`${square.x},${square.y - 1}`) ? 1 : 0) +
        (board.has(`${square.x},${square.y + 1}`) ? 1 : 0) <
        3
    ) {
      // This is a tunnel, and so we need to be more wary of these
      square.cost = 40;
      board.set(`${square.x},${square.y}`, square);
    }
  }
}

function addHeadHazards(board: Board, snakes: Snake[], me: Snake): Board {
  for (const snake of snakes) {
    if (snake.id !== me.id && snake.length >= me.length) {
      const snakeHead = snake.body[0];
      // Check above
      let next: Square | null;
      if ((next = board.get(`${snakeHead.x},${snakeHead.y + 1}`))) {
        next.cost = 99999;
        board.set(`${snakeHead.x},${snakeHead.y + 1}`, next);
      }

      // Check below
      if ((next = board.get(`${snakeHead.x},${snakeHead.y - 1}`))) {
        next.cost = 99999;
        board.set(`${snakeHead.x},${snakeHead.y - 1}`, next);
      }

      // Check left
      if ((next = board.get(`${snakeHead.x - 1},${snakeHead.y}`))) {
        next.cost = 99999;
        board.set(`${snakeHead.x - 1},${snakeHead.y}`, next);
      }

      // Check right
      if ((next = board.get(`${snakeHead.x + 1},${snakeHead.y}`))) {
        next.cost = 99999;
        board.set(`${snakeHead.x + 1},${snakeHead.y}`, next);
      }
    }
  }

  return board;
}

function addSmallerSnakeHeads(board: Board, snakes: Snake[], me: Snake) {
  for (const snake of snakes) {
    if (snake.id !== me.id && snake.length < me.length) {
      board.set(`${snake.head.x},${snake.head.y}`, {
        x: snake.head.x,
        y: snake.head.y,
        cost: 1,
        food: false,
        target: true,
        price: 99999,
      });
    }
  }
}

export default (req: Request, res: Response) => {
  const gameData: GameData = req.body;
  console.log(`Calculating move ${gameData.turn}`);
  const board = createBoardMap(gameData.board.width, gameData.board.height);
  removeSnakeBodies(board, gameData.board.snakes);
  addHazards(board, gameData.board.hazards);
  addFood(board, gameData.board.food);
  addTunnels(board);
  addHeadHazards(board, gameData.board.snakes, gameData.you);
  addSmallerSnakeHeads(board, gameData.board.snakes, gameData.you);

  let move = getRandomMove();
  let pathsToTargets = planPaths(board, gameData.you.head);
  let pathToTarget;
  if (gameData.you.health > 50 && pathsToTargets.target) {
    pathToTarget = pathsToTargets.target;
    console.log(`Heading to attack: `, pathToTarget?.direction);
  } else if (pathsToTargets.food) {
    pathToTarget = pathsToTargets.food;
    console.log(`Heading to food: `, pathToTarget?.direction);
  } else {
    // Can't find a path to food. Figure out how to stay alive longest
    pathToTarget = planFurthestPath(board);
    if (pathToTarget) {
      console.log(`Heading to furthest point: `, pathToTarget?.direction);
    }
  }
  if (pathToTarget) {
    const nextStep = getNextStepOfPath(pathToTarget);
    move = nextStep.direction;
  }

  res.json({
    move,
  });
};
