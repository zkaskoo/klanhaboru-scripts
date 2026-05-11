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

  ask(function(ido1){
    if(!ido1) return;
    var hour1     = ido1.substring(0,2);
    var minute1   = ido1.substring(3,5);
    var second1   = ido1.substring(6,8);
    var millisec1 = parseInt(ido1.substring(9,12),10) || 0;

    var hely = document.getElementById("content_value").getElementsByTagName("table")[0];
    hely.width = "400";
    hely.style.width = "400px";
    var row = hely.insertRow(-1);
    row.style.width = "200px";
    row.insertCell(0).innerHTML = ido1;

    var btn = document.querySelector(".troop_confirm_go")
           || document.getElementById("troop_confirm_submit");

    var relLen = document.querySelector(".relative_time").innerHTML.length;
    var offset = relLen === 18 ? 10 : relLen === 22 ? 14 : relLen === 42 ? 34 : null;
    if(offset === null){ alert("Ismeretlen relative_time formatum: "+relLen); return; }

    var fired = false;
    var iv = setInterval(function(){
      var t = document.querySelector(".relative_time").innerHTML.slice(offset);
      if(t.substring(0,2)===hour1 && t.substring(3,5)===minute1 && t.substring(6,8)===second1 && !fired){
        fired = true;
        clearInterval(iv);
        setTimeout(function(){ btn.click(); }, millisec1);
      }
    }, 1);
  });
})();
