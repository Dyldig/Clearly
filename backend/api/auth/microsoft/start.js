// GET /api/auth/microsoft/start -> redirects the browser to Microsoft's
// consent screen. This is a plain navigation (the user clicks a link/button
// that goes here directly), not a fetch call, so it deliberately doesn't use
// the CLIENT_API_TOKEN guard — Microsoft's redirect back can't carry it.
const { buildAuthorizeUrl } = require('../../_microsoft');

module.exports = async (req, res) => {
  res.writeHead(302, { Location: buildAuthorizeUrl() });
  res.end();
};
