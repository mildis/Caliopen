const proxy = require('express-http-proxy');
const url = require('url');
const { getConfig } = require('../config');

module.exports = (app) => {
  const { api: { hostname, port, protocol, checkCertificate } } = getConfig();
  const target = `${protocol}://${hostname}:${port}`;

  app.use('/api', proxy(target, {
    proxyReqPathResolver: req => url.parse(req.originalUrl).path,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      const decoratedReqOpts = {
        ...proxyReqOpts,
        rejectUnauthorized: checkCertificate,
      };

      if (!srcReq.security) {
        return decoratedReqOpts;
      }

      // TODO refactor in Auth library may be or ...
      const bearer = new Buffer(`${srcReq.user.user_id}:${srcReq.user.tokens.access_token}`)
        .toString('base64');

      return {
        ...decoratedReqOpts,
        headers: {
          ...proxyReqOpts.headers,
          Authorization: `Bearer ${bearer}`,
        },
      };
    },
  }));
};
