export function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

export function dateRange(req) {
  return {
    startDate: req.query.startDate || "2024-01-01",
    endDate: req.query.endDate || null,
  };
}
