const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api/sendgrid',
    createProxyMiddleware({
      target: 'https://api.sendgrid.com',
      changeOrigin: true,
      pathRewrite: {
        '^/api/sendgrid': '',
      },
      onProxyReq: (proxyReq, req, res) => {
        // Add the SendGrid API Key to the outgoing request headers
        proxyReq.setHeader('Authorization', 'Bearer My API Key');
        proxyReq.setHeader('Content-Type', 'application/json');
      },
    })
  );
};
