(function(){
  // ---- in-game modal a prompt() helyett ----
  function ask(cb){
    var ov = document.createElement("div");
    ov.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:black;opacity:0.6;z-index:99998";
    var box = document.createElement("div");
    box.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;background:wheat;border:2px solid saddlebrown;padding:0;font-family:Verdana,sans-serif;font-size:13px;color:black;min-width:280px";
    box.innerHTML =
      '<div style="background:burlywood;border-bottom:1px solid saddlebrown;padding:8px 12px;font-weight:bold;color:saddlebrown">Idozito</div>'+
      '<div style="padding:15px">'+
        '<div style="margin-bottom:10px">Mikor erkezzen be a parancs?</div>'+
        '<input id="st-in" type="text" placeholder="08:00:00:000" style="width:92%;padding:8px;font-size:15px;text-align:center;border:1px solid saddlebrown">'+
        '<div style="margin-top:15px;text-align:right">'+
          '<button id="st-cancel" style="padding:7px 14px;margin-right:6px;border:1px solid saddlebrown;background:wheat;cursor:pointer">Megse</button>'+
          '<button id="st-ok" style="padding:7px 16px;background:saddlebrown;color:white;border:1px solid saddlebrown;font-weight:bold;cursor:pointer">OK</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(ov);
    document.body.appendChild(box);
    var inp = document.getElementById("st-in");
    inp.focus();
    function done(v){ ov.remove(); box.remove(); cb(v); }
    document.getElementById("st-ok").onclick     = function(){ done(inp.value); };
    document.getElementById("st-cancel").onclick = function(){ done(null); };
    inp.addEventListener("keydown", function(e){ if(e.key==="Enter") done(inp.value); });
  }

  function parseRelative(html){
    // A .relative_time vegen mindig HH:MM:SS van. Az offset a hosztol fugg.
    var len = html.length;
    var off = len===18 ? 10 : len===22 ? 14 : len===42 ? 34 : -1;
    if(off < 0) return null;
    var t = html.slice(off);
    var h = parseInt(t.substring(0,2),10);
    var m = parseInt(t.substring(3,5),10);
    var s = parseInt(t.substring(6,8),10);
    if(isNaN(h)||isNaN(m)||isNaN(s)) return null;
    return { h:h, m:m, s:s };
  }

  function fireClick(){
    // Click pillanatban frissen lekerjuk a gombot (a referencia kozben elavulhat).
    var btn = document.querySelector(".troop_confirm_go")
           || document.getElementById("troop_confirm_submit");
    if(btn) btn.click();
  }

  function finalApproach(targetT){
    // Utolso szakasz: rAF amig > 20ms van hatra, utana busy-wait a maximalis pontossagert.
    function tick(){
      var r = targetT - performance.now();
      if(r <= 0){ fireClick(); return; }
      if(r > 20){ requestAnimationFrame(tick); return; }
      while(performance.now() < targetT){ /* busy-wait < 20ms */ }
      fireClick();
    }
    tick();
  }

  function makeWorker(){
    // Web Worker setTimeout-ja NEM kerul throttle ala hatter tabban,
    // ellentetben a main thread setTimeout-tal (~1000ms minimum hatterben).
    try {
      var src = "self.onmessage=function(e){setTimeout(function(){self.postMessage(1);},e.data);};";
      var blob = new Blob([src], { type: "application/javascript" });
      return new Worker(URL.createObjectURL(blob));
    } catch(e) { return null; }
  }

  function tryWakeLock(){
    // Megakadalyozza a kepernyo elalvasat (mobilon kritikus).
    try {
      if(navigator.wakeLock && navigator.wakeLock.request){
        navigator.wakeLock.request("screen").catch(function(){});
      }
    } catch(e) {}
  }

  ask(function(input){
    if(!input) return;

    var tH  = parseInt(input.substring(0,2),10);
    var tM  = parseInt(input.substring(3,5),10);
    var tS  = parseInt(input.substring(6,8),10);
    var tMs = parseInt(input.substring(9,12),10) || 0;

    if(isNaN(tH) || isNaN(tM) || isNaN(tS)){
      alert("Ervenytelen ido. Formatum: HH:MM:SS:mmm");
      return;
    }

    // Vizualis visszajelzes (mint az eredeti scriptben)
    try {
      var hely = document.getElementById("content_value").getElementsByTagName("table")[0];
      hely.width = "400";
      hely.style.width = "400px";
      var row = hely.insertRow(-1);
      row.style.width = "200px";
      row.insertCell(0).innerHTML = input;
    } catch(e) {}

    var rt0 = document.querySelector(".relative_time");
    if(!rt0){ alert("Nincs .relative_time elem az oldalon"); return; }
    var initialHtml = rt0.innerHTML;
    if(!parseRelative(initialHtml)){
      alert("Ismeretlen relative_time formatum: " + initialHtml.length);
      return;
    }

    tryWakeLock();

    // 1) Szinkronizalas a kovetkezo szerver-masodperc hatarara.
    //    Amikor a .relative_time szovege valtozik, az a szerver-ora masodperc-hatara.
    //    Ezt egyetlen pontkent hasznaljuk: innen mar abszolut idoben szamolunk.
    var syncIv = setInterval(function(){
      var rt = document.querySelector(".relative_time");
      if(!rt) return;
      var curr = rt.innerHTML;
      if(curr === initialHtml) return;

      var anchor = performance.now();   // client-clock pillanat a szerver-masodperc kezdetekor
      clearInterval(syncIv);

      var p = parseRelative(curr);
      if(!p){ alert("relative_time formatum hiba"); return; }

      var anchorSec = p.h*3600 + p.m*60 + p.s;
      var targetSec = tH*3600 + tM*60 + tS;
      var diffSec = targetSec - anchorSec;
      if(diffSec < 0) diffSec += 86400; // ha a cel mar elment ma, holnapra

      var targetT = anchor + diffSec*1000 + tMs;
      var remaining = targetT - performance.now();

      if(remaining <= 0){
        // Mar elment - azonnal kattintunk
        fireClick();
        return;
      }

      // 2) Hosszu varakozas: Web Workerrel, hogy hatter tabban se throttle-oljon.
      //    A worker ~500ms-mel a cel elott ebreszt fel.
      var worker = makeWorker();
      if(worker && remaining > 1000){
        worker.onmessage = function(){
          try { worker.terminate(); } catch(e) {}
          finalApproach(targetT);
        };
        worker.postMessage(remaining - 500);
      } else if(remaining > 200){
        // Fallback: sima setTimeout
        setTimeout(function(){ finalApproach(targetT); }, remaining - 100);
      } else {
        // Kozeli cel: egybol final szakasz
        finalApproach(targetT);
      }
    }, 2);
  });
})();
