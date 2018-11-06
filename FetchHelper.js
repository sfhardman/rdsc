const log = require('loglevel');
const fetch = require('node-fetch');

class FetchHelper {
  constructor(baseUrl, headers) {
    this.baseUrl = baseUrl;
    const defaultHeaders = {
      accept: 'application/json',
      'content-type': 'application/json',
    }
    this.headers = Object.assign({}, defaultHeaders, headers);
  }
  
  async fetchUrl(url, method, payload = undefined, wantJson = true, allow404 = false) {
    const options = {
      headers: this.headers,
      body: payload ? JSON.stringify(payload) : payload,
      method: method,
    }
    const fullUrl = `${this.baseUrl}${url}`
    log.trace(`Fetching ${method} ${fullUrl}`, options.headers, JSON.stringify(payload, null, 2));
    const response = await fetch(fullUrl, options);
    log.trace(`Response ${response.status} ${response.statusText}`, response.headers);
    if (response.ok) {
      if (wantJson) {
        const data = await response.json();
        log.trace(JSON.stringify(data, null, 2));
        return data;
      } else {
        return null;
      }
    } else if (allow404 && response.status === 404) {
      return null;
    } else {
      const data = await response.text();
      throw new Error(`Error calling API ${method} ${fullUrl} ${response.status} - ${response.statusText}: ${data}`);
    }
  }
}

module.exports = FetchHelper;
