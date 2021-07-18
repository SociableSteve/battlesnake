import type { Request, Response } from "express";

export default (_: Request, res: Response) => {
  res.sendStatus(200);
};
