function getPagination(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 8, 1), 50);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildPagination(total, page, limit) {
  return {
    total,
    page,
    limit,
    pages: Math.max(Math.ceil(total / limit), 1)
  };
}

module.exports = { getPagination, buildPagination };
