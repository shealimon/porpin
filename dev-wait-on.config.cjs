'use strict';
/**
 * Local health probe for `npm run dev`. Axios (inside wait-on) otherwise may honor
 * HTTP_PROXY and send 127.0.0.1 through a corporate proxy, which never succeeds.
 */
module.exports = {
  resources: ['http-get://127.0.0.1:8000/health'],
  timeout: 120000,
  proxy: false,
};
