function ok(res, data, message = 'Opération réussie.', status = 200) {
  return res.status(status).json({ success: true, data, message });
}
function fail(res, status, message, errors) {
  const body = { success: false, data: null, message };
  if (errors) body.errors = errors;
  return res.status(status).json(body);
}
module.exports = { ok, fail };
