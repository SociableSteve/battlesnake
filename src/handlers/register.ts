import type { Request, Response } from "express";

export default (_: Request, res: Response) => {
  res.json({
    apiversion: "1",
    author: "SociableSteve",
    color: "#00711c",
    head: "viper",
    tail: "rattle",
    version: "0.0.1-beta",
  });
};
