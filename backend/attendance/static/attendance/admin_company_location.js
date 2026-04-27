/**
 * Company add/change: fill office lat/lng/radius from browser geolocation (user gesture).
 */
(function () {
  function onReady(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  onReady(function () {
    var latEl = document.getElementById("id_office_latitude");
    var lngEl = document.getElementById("id_office_longitude");
    var radEl = document.getElementById("id_location_radius_meters");
    if (!latEl || !lngEl || !radEl) return;

    var wrap = document.createElement("div");
    wrap.className = "company-location-gps-help";
    wrap.style.cssText =
      "margin:0 0 12px 0;padding:10px 12px;background:#f8f8f8;border:1px solid #ddd;border-radius:4px;max-width:52em;";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "button";
    btn.textContent = "Browser GPS se office lat / long / radius bharain";
    var status = document.createElement("p");
    status.style.cssText = "margin:8px 0 0 0;font-size:12px;color:#666;";
    status.textContent =
      "Office par hon / map se sahi jagah — phir dabayein. Radius GPS accuracy se set hota hai (min 20m, max 5000m).";
    wrap.appendChild(btn);
    wrap.appendChild(status);

    var anchor = latEl.closest(".form-row");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(wrap, anchor);
    else latEl.parentNode.insertBefore(wrap, latEl);

    function clampRadiusFromAccuracy(acc) {
      if (typeof acc !== "number" || !isFinite(acc) || acc <= 0) return 200;
      var r = Math.ceil(acc * 2);
      if (r < 20) r = 20;
      if (r > 5000) r = 5000;
      return r;
    }

    btn.addEventListener("click", function () {
      if (!navigator.geolocation) {
        status.textContent = "Is browser mein geolocation support nahi.";
        status.style.color = "#ba2121";
        return;
      }
      status.textContent = "Location maang rahe hain…";
      status.style.color = "#666";
      btn.disabled = true;
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          var la = pos.coords.latitude;
          var lo = pos.coords.longitude;
          latEl.value = String(la);
          lngEl.value = String(lo);
          radEl.value = String(clampRadiusFromAccuracy(pos.coords.accuracy));
          status.textContent =
            "Ho gaya — ab Save karein. (accuracy ~" +
            (pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) + "m" : "—") +
            ")";
          status.style.color = "#0a0";
          btn.disabled = false;
        },
        function (err) {
          status.textContent = err && err.message ? err.message : "Location nahi mili.";
          status.style.color = "#ba2121";
          btn.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    });
  });
})();
