(function (xhr) {
  const XHR = XMLHttpRequest.prototype;
  const open = XHR.open;
  const send = XHR.send;

  XHR.open = function (method, url) {
    this._method = method;
    this._url = url;
    return open.apply(this, arguments);
  };

  XHR.send = function (postData) {
    this.addEventListener("load", function () {
      const apiPattern = /^https:\/\/api2\.maang\.in\/problems\/user\/.*$/;

      if (apiPattern.test(this._url)) {
        // Post message to the content script
        window.postMessage(
          {
            type: "apiIntercepted",
            url: this._url,
            method: this._method,
            response: this.responseText,
          },
          "*"
        );
      }
    });

    return send.apply(this, arguments);
  };
})(XMLHttpRequest);
