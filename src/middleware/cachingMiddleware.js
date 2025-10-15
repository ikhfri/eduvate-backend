
const mcache = require("memory-cache");

/**
 * @param {number} duration 
 */
const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    const key = "__express__" + req.originalUrl || req.url;

    const cachedBody = mcache.get(key);

    if (cachedBody) {
      console.log(`Mengambil dari Cache: ${key}`);
      res.send(cachedBody);
      return;
    } else {
      console.log(`Cache tidak ditemukan, memproses: ${key}`);

      const originalSend = res.send;

      res.send = (body) => {
        mcache.put(key, body, duration * 60 * 1000);
        originalSend.call(res, body);
      };

      next();
    }
  };
};

module.exports = cacheMiddleware;
