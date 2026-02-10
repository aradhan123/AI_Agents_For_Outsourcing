import * as service from "./availability.service.js";

export async function getUserAvailability(req, res) {
  const { userId } = req.params;
  const { start, end } = req.query;

  const data = await service.getUserAvailability(userId, start, end);

  res.json(data);
}

export async function checkSlot(req, res) {
  const { userId, start, end } = req.body;

  const available = await service.checkSlot(userId, start, end);

  res.json({ available });
}

