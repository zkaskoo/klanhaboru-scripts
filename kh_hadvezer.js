// Klanhaboru - Hadvezer v2
// Idozitett Tamadas - ms pontos, tobb tamadas (nemes vonat)
// Console-ban vagy bookmarkletkent futtasd a jatek oldalan

(function(){
    if(typeof game_data === 'undefined'){
        alert('Nyisd meg a Klanhaboru oldalat!');
        return;
    }

    var sx = game_data.village.x;
    var sy = game_data.village.y;
    var villageId = game_data.village.id;
    var baseUrl = window.location.origin;

    var mn = {spear:'Landzsas',sword:'Kardos',axe:'Baltas',archer:'Ijasz',spy:'Felderito',light:'Konnyulovas',marcher:'Lovasijasz',heavy:'Nehezlovas',ram:'Faltoro',catapult:'Katapult',knight:'Lovag',snob:'Nemes'};
    var as = {spear:18,sword:22,axe:18,archer:18,spy:9,light:10,marcher:10,heavy:11,ram:30,catapult:30,knight:10,snob:35};

    var egysegek = game_data.units.filter(function(u){ return u !== 'militia' && as[u]; });

    // Ikon URL detektalas (tobb fallback)
    var imgBase = '';
    try { var testImg = document.querySelector('img[src*="unit_"]'); if(testImg) imgBase = testImg.src.replace(/unit_\w+\.\w+.*$/, ''); } catch(e){}
    if(!imgBase){ try { var anyImg = document.querySelector('img[src*="innogamescdn"]'); if(anyImg){ var m = anyImg.src.match(/(https:\/\/[^\/]+\/asset\/[^\/]+\/)/); if(m) imgBase = m[1] + 'graphic/unit/'; } } catch(e){} }
    if(!imgBase){ try { var scripts = document.querySelectorAll('script'); for(var i=0;i<scripts.length;i++){ var m2 = scripts[i].textContent.match(/(https:\/\/[a-z0-9]+\.innogamescdn\.com\/asset\/[a-f0-9]+\/)/); if(m2){ imgBase = m2[1] + 'graphic/unit/'; break; } } } catch(e){} }

    // Latency mezo default: 0 (a user allitja be a tapasztalata alapjan)
    var defaultLatency = 0;

    var configData = null;
    var availTroops = {};
    var loaded = 0;

    function onLoaded(){
        loaded++;
        if(loaded >= 2) openUI();
    }

    $.get('/interface.php?func=get_config', function(xml){
        configData = {
            ws: parseFloat((xml.getElementsByTagName('speed')[0] || {textContent:'1'}).textContent),
            us: parseFloat((xml.getElementsByTagName('unit_speed')[0] || {textContent:'1'}).textContent)
        };
        onLoaded();
    });

    $.get('/game.php?village=' + villageId + '&screen=place', function(html){
        var doc = new DOMParser().parseFromString(html, 'text/html');
        for(var i = 0; i < egysegek.length; i++){
            var u = egysegek[i];
            var el = doc.querySelector('#units_entry_all_' + u);
            if(el) availTroops[u] = parseInt(el.textContent.replace(/[()]/g, '').trim()) || 0;
        }
        onLoaded();
    });

    function openUI(){
        var popup = window.open('', 'kh_hadvezer', 'width=820,height=620,top=60,left=60,scrollbars=yes,resizable=yes');
        if(!popup){ alert('Popup blokkolva! Engedelyezd a popupokat!'); return; }

        var D = JSON.stringify({sx:sx,sy:sy,vid:villageId,base:baseUrl,ws:configData.ws,us:configData.us,eg:egysegek,mn:mn,as:as,av:availTroops,img:imgBase,lat:defaultLatency});

        var css = '*{box-sizing:border-box;margin:0;padding:0;}'
            + 'body{font-family:Verdana,Arial,sans-serif;font-size:12px;color:#3e2b0e;background:#f4e4bc;}'
            + '.hdr{background:#7d510f;color:#f4e4bc;padding:8px 15px;font-size:14px;font-weight:bold;display:flex;justify-content:space-between;align-items:center;}'
            + '.hdr .village{font-size:11px;font-weight:normal;opacity:.8;}'
            + '.content{padding:12px 15px;}'
            // Inputs
            + '.inp{padding:2px 5px;border:1px solid #b89b6a;background:#fff8ec;font-size:12px;font-family:inherit;}'
            + '.inp:focus{outline:none;border-color:#7d510f;box-shadow:0 0 3px rgba(125,81,15,.3);}'
            // Buttons
            + '.btn{border:none;padding:7px 20px;font-size:12px;font-weight:bold;cursor:pointer;border-radius:3px;}'
            + '.btn:hover{opacity:.85;}'
            + '.btn-go{background:#7d510f;color:#f4e4bc;}'
            + '.btn-stop{background:#c0392b;color:#fff;}'
            + '.btn-add{background:#587e31;color:#fff;padding:5px 12px;}'
            // Attack row
            + '.atk-row{border:1px solid #c8a86e;border-radius:4px;margin-bottom:10px;overflow:hidden;}'
            + '.atk-title{background:#d4bc8a;padding:5px 10px;display:flex;justify-content:space-between;align-items:center;font-weight:bold;font-size:11px;color:#5a3a0a;}'
            + '.btn-rm{background:#a03020;color:#fff;border:none;padding:1px 7px;font-size:13px;cursor:pointer;border-radius:2px;}'
            + '.btn-rm:hover{background:#c0392b;}'
            // Unit table
            + '.unit-wrap{overflow-x:auto;background:#e8d5a3;}'
            + '.unit-tbl{border-collapse:collapse;width:100%;}'
            + '.unit-tbl td{text-align:center;padding:3px 2px;border-right:1px solid #c8a86e;}'
            + '.unit-tbl tr.icon-row{background:#d4bc8a;}'
            + '.unit-tbl tr.avail-row{background:#d4bc8a;}'
            + '.unit-tbl .u-inp{width:36px;text-align:center;font-size:11px;padding:2px;border:1px solid #b89b6a;background:#fff8ec;}'
            + '.fill-lnk{font-size:10px;color:#555;text-decoration:underline;cursor:pointer;}'
            // Arrival row
            + '.arr-row{background:#f4e4bc;padding:6px 10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid #c8a86e;font-size:11px;}'
            + '.atk-info{color:#555;font-size:11px;font-style:italic;}'
            // Info bar
            + '.info-bar{background:#e8d5a3;border:1px solid #c8a86e;padding:7px 10px;border-radius:4px;margin-bottom:10px;font-size:11px;}'
            // Countdown
            + '#cd_view{display:none;background:#1a1a1a;color:#0f0;font-family:Consolas,monospace;min-height:100vh;padding:15px;}'
            + '.log{background:#1a1a1a;color:#0f0;font-family:Consolas,monospace;font-size:11px;padding:10px;overflow-y:auto;border-radius:4px;}'
            + '.cd-tbl{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px;}'
            + '.cd-tbl td{padding:3px 6px;border-bottom:1px solid #333;}'
            + '.cd-tbl tr:first-child td{color:#888;font-weight:bold;border-bottom:1px solid #555;}';

        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>KH Hadvezer</title>'
            + '<style>' + css + '</style></head><body><div id="app"></div>'
            + '<scr' + 'ipt>var D=' + D + ';(' + popupMain.toString() + ')(D);</scr' + 'ipt>'
            + '</body></html>';

        popup.document.write(html);
        popup.document.close();
    }

    // ============================================================
    // POPUP MAIN - ez a fuggveny kerul a popup ablakba toString()-gel
    // ============================================================
    function popupMain(D) {

        // ====== UTILITIES ======

        // Ido fuggvenyek
        function sNow() { return Date.now(); }

        function sl(ms) {
            return new Promise(function(r) {
                var s = performance.now();
                var ch = new MessageChannel();
                ch.port1.onmessage = function() {
                    if (performance.now() - s >= ms) r();
                    else ch.port2.postMessage("");
                };
                ch.port2.postMessage("");
            });
        }

        function fmtDate(dt) {
            return dt.getFullYear() + "." + String(dt.getMonth()+1).padStart(2,"0") + "." + String(dt.getDate()).padStart(2,"0") + ". " + String(dt.getHours()).padStart(2,"0") + ":" + String(dt.getMinutes()).padStart(2,"0") + ":" + String(dt.getSeconds()).padStart(2,"0") + ":" + String(dt.getMilliseconds()).padStart(3,"0");
        }

        function fmtSec(s) {
            var d = Math.floor(s / 86400);
            var h = Math.floor((s % 86400) / 3600);
            var m = Math.floor((s % 3600) / 60);
            var sc = s % 60;
            var r = String(h).padStart(2,"0") + ":" + String(m).padStart(2,"0") + ":" + String(sc).padStart(2,"0");
            if (d > 0) r = d + "nap " + r;
            return r;
        }

        function fmtMs(ms) {
            if (ms < 0) ms = 0;
            var d = Math.floor(ms / 86400000);
            var h = Math.floor((ms % 86400000) / 3600000);
            var m = Math.floor((ms % 3600000) / 60000);
            var s = Math.floor((ms % 60000) / 1000);
            var msR = ms % 1000;
            var r = String(h).padStart(2,"0") + ":" + String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0") + ":" + String(msR).padStart(3,"0");
            if (d > 0) r = d + "nap " + r;
            return r;
        }

        function log(msg, color) {
            var el = document.getElementById("cd_log");
            if (!el) return;
            var t = new Date();
            var ts = String(t.getHours()).padStart(2,"0") + ":" + String(t.getMinutes()).padStart(2,"0") + ":" + String(t.getSeconds()).padStart(2,"0") + ":" + String(t.getMilliseconds()).padStart(3,"0");
            var line = document.createElement("div");
            line.style.color = color || "#0f0";
            line.textContent = "[" + ts + "] " + msg;
            el.appendChild(line);
            el.scrollTop = el.scrollHeight;
        }

        function getTodayStr() {
            var n = new Date();
            return n.getFullYear() + "-" + String(n.getMonth()+1).padStart(2,"0") + "-" + String(n.getDate()).padStart(2,"0");
        }

        function addMsToTime(timeStr, offsetMs) {
            var p = timeStr.split(":").map(Number);
            var totalMs = (p[0]||0)*3600000 + (p[1]||0)*60000 + (p[2]||0)*1000 + (p[3]||0) + offsetMs;
            if (totalMs >= 86400000) totalMs = totalMs % 86400000;
            var h = Math.floor(totalMs / 3600000);
            var m = Math.floor((totalMs % 3600000) / 60000);
            var s = Math.floor((totalMs % 60000) / 1000);
            var ms = totalMs % 1000;
            return String(h).padStart(2,"0") + ":" + String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0") + ":" + String(ms).padStart(3,"0");
        }

        function parseArrival(dateStr, timeStr) {
            var tp = timeStr.split(":").map(Number);
            if (tp.length < 2 || isNaN(tp[0]) || isNaN(tp[1])) return null;
            var msVal = tp[3] || 0;
            if (dateStr) {
                var dp = dateStr.split("-").map(Number);
                return new Date(dp[0], dp[1]-1, dp[2], tp[0], tp[1], tp[2]||0, msVal);
            } else {
                var d = new Date();
                d.setHours(tp[0], tp[1], tp[2]||0, msVal);
                if (d.getTime() <= sNow()) d.setDate(d.getDate()+1);
                return d;
            }
        }

        function calcTravel(cx, cy, units) {
            var maxSpeed = 0, slowest = null;
            for (var u in units) {
                if (units[u] > 0 && D.as[u] > maxSpeed) {
                    maxSpeed = D.as[u];
                    slowest = u;
                }
            }
            if (!slowest) return null;
            var dist = Math.sqrt(Math.pow(cx - D.sx, 2) + Math.pow(cy - D.sy, 2));
            var travelSec = Math.round((dist * maxSpeed) / (D.ws * D.us) * 60);
            return { travelSec: travelSec, slowest: slowest };
        }

        function unitSummary(units) {
            var parts = [];
            for (var u in units) {
                if (units[u] > 0) parts.push((D.mn[u]||u).substring(0,4) + ":" + units[u]);
            }
            return parts.join(" ");
        }

        // Egyseg ikon HTML generalas
        function unitIcon(u) {
            if (D.img) {
                return '<img src="' + D.img + 'unit_' + u + '.png" title="' + (D.mn[u]||u) + '" style="width:18px;height:18px;">';
            }
            return '<span style="font-size:9px;" title="' + (D.mn[u]||u) + '">' + u.substring(0,3) + '</span>';
        }

        // ====== STATE ======
        var nextId = 0;
        var cancelled = false;

        // ====== BUILD MAIN VIEW ======

        function buildMainView() {
            var h = "";

            // Header
            h += '<div class="hdr">';
            h += '<span>KH Hadvezer - Tamadas Idozito</span>';
            h += '<span class="village">Falu: ' + D.sx + "|" + D.sy + "</span>";
            h += "</div>";

            h += '<div class="content">';

            // Cel + offset
            h += '<div style="margin-bottom:10px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">';
            h += '<span>Cel: <input id="ti_x" type="number" class="inp" style="width:55px;text-align:center;" placeholder="x">';
            h += ' | <input id="ti_y" type="number" class="inp" style="width:55px;text-align:center;" placeholder="y"></span>';
            h += '<span style="color:#c8a86e;">|</span>';
            h += '<span style="font-size:11px;">Mod: <select id="time_mode" class="inp" style="font-size:11px;padding:1px 3px;"><option value="erkezes">Erkezes</option><option value="inditas">Inditas</option></select></span>';
            h += '<span style="color:#c8a86e;">|</span>';
            h += '<span style="font-size:11px;">Auto eltolas: <input id="ms_offset" type="number" value="200" min="0" max="5000" step="50" class="inp" style="width:55px;text-align:center;font-size:11px;"> ms</span>';
            h += '<span style="color:#c8a86e;">|</span>';
            h += '<span style="font-size:11px;">Latency korr.: <input id="lat_comp" type="number" value="' + D.lat + '" min="-500" max="1000" step="1" class="inp" style="width:55px;text-align:center;font-size:11px;"> ms</span>';
            h += "</div>";

            // Tamadas lista
            h += '<div id="atk_list"></div>';

            // Hozzaad gomb
            h += '<div style="margin-bottom:10px;">';
            h += '<button id="btn_add" class="btn btn-add">+ Uj tamadas hozzaadasa</button>';
            h += "</div>";

            // Legkorabbi erkezes
            h += '<div id="earliest" class="info-bar" style="display:none;"></div>';

            // Osszesites
            h += '<div id="summary" class="info-bar" style="display:none;"></div>';

            // Fo gombok
            h += '<div style="display:flex;gap:10px;padding-top:8px;border-top:1px solid #c8a86e;">';
            h += '<button id="btn_start" class="btn btn-go" style="padding:8px 30px;font-size:13px;">Osszes inditas</button>';
            h += '<button id="btn_close" class="btn" style="background:#888;color:#fff;">Megse</button>';
            h += "</div>";

            h += "</div>"; // content

            // Visszaszamlalo nezet
            h += '<div id="cd_view">';
            h += '<div id="cd_info" style="margin-bottom:10px;font-size:12px;"></div>';
            h += '<div id="cd_countdown" style="text-align:center;font-size:42px;font-weight:bold;color:#0ff;margin:15px 0;"></div>';
            h += '<div style="text-align:center;margin-bottom:10px;"><button id="cd_cancel" class="btn btn-stop">Megse</button></div>';
            h += '<div id="cd_log" class="log" style="height:220px;"></div>';
            h += "</div>";

            return h;
        }

        document.getElementById("app").innerHTML = buildMainView();

        // ====== ATTACK ROW MANAGEMENT ======

        function addAttack(copyPrev) {
            nextId++;
            var id = nextId;
            var copyId = null;

            if (copyPrev) {
                var rows = document.querySelectorAll(".atk-row");
                if (rows.length > 0) copyId = parseInt(rows[rows.length-1].getAttribute("data-id"));
            }

            var div = document.createElement("div");
            div.className = "atk-row";
            div.setAttribute("data-id", String(id));
            div.innerHTML = buildRowHtml(id, copyId);
            document.getElementById("atk_list").appendChild(div);
            recalcAll();
        }

        function removeAttack(id) {
            var row = document.querySelector(".atk-row[data-id='" + id + "']");
            if (row) row.remove();
            // Ha nincs tobb sor, ne engedjen torolni
            recalcAll();
        }

        function buildRowHtml(id, copyId) {
            var h = "";

            // Fejlec sor
            h += '<div class="atk-title">';
            h += '<span>Tamadas #' + id + "</span>";
            h += '<button data-action="remove" data-id="' + id + '" class="btn-rm" title="Torol">&times;</button>';
            h += "</div>";

            // Egyseg tabla - 3 soros mint az eredeti (ikon / input / elerheto)
            h += '<div class="unit-wrap">';
            h += '<table class="unit-tbl">';

            // Ikon sor
            h += '<tr class="icon-row">';
            for (var i = 0; i < D.eg.length; i++) {
                h += "<td>" + unitIcon(D.eg[i]) + "</td>";
            }
            h += "</tr>";

            // Input sor
            h += "<tr>";
            for (var i = 0; i < D.eg.length; i++) {
                var u = D.eg[i];
                var prevVal = copyId ? document.getElementById("atk_" + copyId + "_" + u) : null;
                var val = (prevVal && prevVal.value) ? prevVal.value : "";
                h += '<td><input id="atk_' + id + "_" + u + '" type="number" min="0" value="' + val + '" class="u-inp" placeholder="0"></td>';
            }
            h += "</tr>";

            // Elerheto sor (kattinthato kitoltes)
            h += '<tr class="avail-row">';
            for (var i = 0; i < D.eg.length; i++) {
                var u = D.eg[i];
                h += '<td><a href="#" data-action="fill" data-id="' + id + '" data-unit="' + u + '" class="fill-lnk">(' + (D.av[u]||0) + ")</a></td>";
            }
            h += "</tr>";

            h += "</table></div>";

            // Erkezesi ido sor
            var prevTime = copyId ? document.getElementById("atk_" + copyId + "_time") : null;
            var prevDate = copyId ? document.getElementById("atk_" + copyId + "_date") : null;
            var timeVal = "", dateVal = getTodayStr();

            if (prevTime && prevTime.value) {
                dateVal = (prevDate && prevDate.value) ? prevDate.value : getTodayStr();
                var offset = parseInt(document.getElementById("ms_offset").value) || 200;
                timeVal = addMsToTime(prevTime.value, offset);
            }

            h += '<div class="arr-row">';
            h += '<span class="time-label">Erkezes:</span>';
            h += '<input id="atk_' + id + '_date" type="date" value="' + dateVal + '" class="inp" style="width:125px;font-size:11px;">';
            h += '<input id="atk_' + id + '_time" type="text" value="' + timeVal + '" placeholder="oo:pp:mm:ezred" class="inp" style="width:115px;text-align:center;font-size:11px;">';
            h += '<span id="atk_' + id + '_info" class="atk-info"></span>';
            h += "</div>";

            return h;
        }

        // ====== EVENT HANDLING ======

        var atkListEl = document.getElementById("atk_list");

        atkListEl.addEventListener("click", function(e) {
            var btn = e.target.closest("[data-action]");
            if (!btn) return;
            e.preventDefault();
            var action = btn.getAttribute("data-action");
            var id = parseInt(btn.getAttribute("data-id"));
            if (action === "remove") removeAttack(id);
            if (action === "fill") {
                var unit = btn.getAttribute("data-unit");
                var inp = document.getElementById("atk_" + id + "_" + unit);
                if (inp) { inp.value = D.av[unit] || 0; recalcAll(); }
            }
        });

        atkListEl.addEventListener("input", function() { recalcAll(); });

        document.getElementById("ti_x").addEventListener("input", function() { recalcAll(); });
        document.getElementById("ti_y").addEventListener("input", function() { recalcAll(); });
        document.getElementById("btn_add").addEventListener("click", function() { addAttack(true); });
        document.getElementById("btn_start").addEventListener("click", function() { startAll(); });
        document.getElementById("btn_close").addEventListener("click", function() { window.close(); });

        // Mod valtas: labelek frissitese
        document.getElementById("time_mode").addEventListener("change", function() {
            var mode = this.value;
            var labels = document.querySelectorAll(".time-label");
            for (var i = 0; i < labels.length; i++) {
                labels[i].textContent = mode === "inditas" ? "Inditas:" : "Erkezes:";
            }
            recalcAll();
        });

        // Legkorabbi erkezes elo frissites (masodpercenkent)
        setInterval(function() { recalcAll(); }, 1000);

        // ====== CALCULATIONS ======

        function recalcAll() {
            var cx = parseInt(document.getElementById("ti_x").value);
            var cy = parseInt(document.getElementById("ti_y").value);
            var rows = document.querySelectorAll(".atk-row");
            var hasCoords = !isNaN(cx) && !isNaN(cy);
            var totals = {};

            rows.forEach(function(row) {
                var id = row.getAttribute("data-id");
                var infoEl = document.getElementById("atk_" + id + "_info");
                var units = {};
                var hasUnits = false;

                for (var i = 0; i < D.eg.length; i++) {
                    var u = D.eg[i];
                    var v = parseInt(document.getElementById("atk_" + id + "_" + u).value) || 0;
                    if (v > 0) { units[u] = v; hasUnits = true; }
                    totals[u] = (totals[u]||0) + v;
                }

                if (!hasCoords || !hasUnits) {
                    if (infoEl) infoEl.textContent = "";
                    return;
                }

                var tc = calcTravel(cx, cy, units);
                if (!tc) { if (infoEl) infoEl.textContent = ""; return; }

                var dateStr = document.getElementById("atk_" + id + "_date").value;
                var timeStr = document.getElementById("atk_" + id + "_time").value.trim();

                var mode = document.getElementById("time_mode").value;
                var info = (D.mn[tc.slowest]||tc.slowest) + " | Ut: " + fmtSec(tc.travelSec);

                if (timeStr) {
                    var parsedTime = parseArrival(dateStr, timeStr);
                    if (parsedTime) {
                        if (mode === "inditas") {
                            var arrivalDate = new Date(parsedTime.getTime() + tc.travelSec * 1000);
                            info += " | Erkezes: " + fmtDate(arrivalDate);
                        } else {
                            var launchDate = new Date(parsedTime.getTime() - tc.travelSec * 1000);
                            info += " | Inditas: " + fmtDate(launchDate);
                        }
                    }
                }

                if (infoEl) infoEl.textContent = info;
            });

            // Osszesites
            var sumEl = document.getElementById("summary");
            var parts = [];
            for (var u in totals) {
                if (totals[u] > 0) {
                    var avail = D.av[u] || 0;
                    var style = totals[u] > avail ? "color:#c0392b;font-weight:bold" : "";
                    parts.push('<span style="' + style + '">' + (D.mn[u]||u) + ": " + totals[u] + "/" + avail + "</span>");
                }
            }
            if (parts.length > 0) {
                sumEl.style.display = "block";
                sumEl.innerHTML = "<b>Osszes egyseg:</b> " + parts.join(" &middot; ");
            } else {
                sumEl.style.display = "none";
            }

            // Legkorabbi erkezes szamitas (csak erkezes modban)
            var earEl = document.getElementById("earliest");
            var curMode = document.getElementById("time_mode").value;
            if (hasCoords && curMode === "erkezes") {
                // Leglassabb egyseg az osszes tamadason at
                var maxSpeed = 0, slowestAll = null;
                for (var u in totals) {
                    if (totals[u] > 0 && D.as[u] > maxSpeed) { maxSpeed = D.as[u]; slowestAll = u; }
                }
                if (slowestAll) {
                    var dist = Math.sqrt(Math.pow(cx - D.sx, 2) + Math.pow(cy - D.sy, 2));
                    var travelSec = Math.round((dist * maxSpeed) / (D.ws * D.us) * 60);
                    var earliest = new Date(Date.now() + travelSec * 1000);
                    earEl.style.display = "block";
                    earEl.innerHTML = "<b>Legkorabbi erkezes:</b> " + fmtDate(earliest) + " (" + fmtSec(travelSec) + " ut, " + (D.mn[slowestAll]||slowestAll) + ")";
                } else {
                    earEl.style.display = "none";
                }
            } else {
                earEl.style.display = "none";
            }
        }

        // ====== START ALL ======

        function startAll() {
            var cx = parseInt(document.getElementById("ti_x").value);
            var cy = parseInt(document.getElementById("ti_y").value);
            if (isNaN(cx) || isNaN(cy)) { alert("Add meg a cel koordinatakat!"); return; }

            var rows = document.querySelectorAll(".atk-row");
            if (rows.length === 0) { alert("Adj hozza legalabb egy tamadast!"); return; }

            var atkData = [];
            var errors = [];

            rows.forEach(function(row) {
                var id = parseInt(row.getAttribute("data-id"));
                var units = {};
                var hasUnits = false;
                for (var i = 0; i < D.eg.length; i++) {
                    var u = D.eg[i];
                    var v = parseInt(document.getElementById("atk_" + id + "_" + u).value) || 0;
                    if (v > 0) { units[u] = v; hasUnits = true; }
                }
                if (!hasUnits) { errors.push("#" + id + ": nincs egyseg"); return; }

                var dateStr = document.getElementById("atk_" + id + "_date").value;
                var timeStr = document.getElementById("atk_" + id + "_time").value.trim();
                var mode = document.getElementById("time_mode").value;
                var timeLabel = mode === "inditas" ? "inditas" : "erkezesi";
                if (!timeStr) { errors.push("#" + id + ": nincs " + timeLabel + " ido"); return; }

                var parsedTime = parseArrival(dateStr, timeStr);
                if (!parsedTime) { errors.push("#" + id + ": ervenytelen ido"); return; }

                var tc = calcTravel(cx, cy, units);
                if (!tc) { errors.push("#" + id + ": nem szamolhato menetido"); return; }

                // Latency kompenzacio: korabban kuldjuk el, hogy a szerverre pontosan erkezzen
                var latComp = parseInt(document.getElementById("lat_comp").value) || 0;
                var launchTime;
                if (mode === "inditas") {
                    launchTime = parsedTime.getTime() - latComp;
                } else {
                    launchTime = parsedTime.getTime() - tc.travelSec * 1000 - latComp;
                }

                var arrival = mode === "inditas" ? new Date(parsedTime.getTime() + tc.travelSec * 1000) : parsedTime;
                atkData.push({
                    id: id, cx: cx, cy: cy, units: units,
                    arrival: arrival, travelSec: tc.travelSec,
                    slowest: tc.slowest, launchTime: launchTime,
                    prep: null, prepErr: null, sent: false
                });
            });

            if (errors.length > 0) { alert("Hibak:\n" + errors.join("\n")); return; }

            // Inditas ido szerint rendezve
            atkData.sort(function(a, b) { return a.launchTime - b.launchTime; });

            // Elmult-e mar valamelyik
            var now = sNow();
            var pastCount = atkData.filter(function(a) { return a.launchTime < now; }).length;
            if (pastCount > 0) {
                if (!confirm(pastCount + " tamadas inditasi ideje mar elmult! Folytatod?")) return;
            }

            // Megerosites
            var msg = "=== TAMADAS IDOZITO ===\n\nCel: " + cx + "|" + cy + "\n" + atkData.length + " tamadas:\n\n";
            atkData.forEach(function(a) {
                msg += "#" + a.id + "  " + unitSummary(a.units) + "\n";
                msg += "  Erk: " + fmtDate(a.arrival) + "\n";
                msg += "  Ind: " + fmtDate(new Date(a.launchTime)) + "\n\n";
            });
            msg += "OK = Inditas | Cancel = Megse";
            if (!confirm(msg)) return;

            // Atvaltas
            document.querySelector(".hdr").style.display = "none";
            document.querySelector(".content").style.display = "none";
            document.getElementById("cd_view").style.display = "block";

            cancelled = false;
            runAll(atkData);
        }

        // ====== PREPARE ONE ATTACK ======

        async function prepareOne(cx, cy, units) {
            var pUrl = D.base + "/game.php?village=" + D.vid + "&screen=place";
            var t0 = Date.now();
            var pR = await fetch(pUrl, { credentials: "include" });
            var pH = await pR.text();
            var rtt1 = Date.now() - t0;
            var doc = new DOMParser().parseFromString(pH, "text/html");
            var frm = doc.querySelector("#command-data-form");
            if (!frm) throw new Error("Rally point form nem talalhato!");

            var hid = frm.querySelectorAll("input[type=hidden]");
            var cn = "", cv = "";
            for (var i = 0; i < hid.length; i++) {
                var n = hid[i].name;
                if (n !== "template_id" && n !== "source_village") { cn = n; cv = hid[i].value; break; }
            }
            if (!cn) throw new Error("CSRF token nem talalhato!");

            var pd = new URLSearchParams();
            pd.set(cn, cv);
            pd.set("template_id", "");
            pd.set("source_village", String(D.vid));
            for (var u in units) pd.set(u, String(units[u]));
            pd.set("x", String(cx));
            pd.set("y", String(cy));
            pd.set("input", cx + "|" + cy);
            pd.set("target_type", "coord");
            pd.set("attack", "Tamadas");

            var t1 = Date.now();
            var cR = await fetch(pUrl + "&try=confirm", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: pd.toString(),
                credentials: "include"
            });
            var cH = await cR.text();
            var rtt2 = Date.now() - t1;
            var d2 = new DOMParser().parseFromString(cH, "text/html");
            var ch = d2.querySelector("input[name=ch]");
            if (!ch) {
                var eD = d2.querySelector(".error_box");
                throw new Error(eD ? eD.textContent.trim() : "Confirm hiba");
            }

            var f2 = d2.querySelector("#command-data-form") || d2.querySelector("form");
            if (!f2) throw new Error("Confirm form nem talalhato!");
            var aI = f2.querySelectorAll("input");
            var cd = new URLSearchParams();
            for (var j = 0; j < aI.length; j++) {
                var inp = aI[j];
                if (!inp.name) continue;
                if (inp.type === "submit" && inp.name !== "submit_confirm") continue;
                cd.set(inp.name, inp.value);
            }
            var fA = f2.getAttribute("action") || "";
            var cU = (fA && fA.indexOf("game.php") > -1) ? D.base + fA : pUrl + "&action=command";

            return { url: cU, body: cd.toString(), ref: pUrl + "&try=confirm", rtt: Math.round((rtt1 + rtt2) / 2) };
        }

        // ====== RUN ALL (COUNTDOWN + FIRE) ======

        async function runAll(atkData) {
            var cdInfo = document.getElementById("cd_info");
            var cdCountdown = document.getElementById("cd_countdown");

            function updateInfo() {
                var h = '<div style="text-align:center;font-size:14px;color:#ff0;font-weight:bold;margin-bottom:8px;">TAMADAS IDOZITO</div>';
                h += '<div style="text-align:center;margin-bottom:10px;color:#aaa;">Cel: ' + atkData[0].cx + "|" + atkData[0].cy + " &mdash; " + atkData.length + " tamadas" + (latMedian > 0 ? " &mdash; latency: " + latMedian + "ms" : "") + "</div>";
                h += '<table class="cd-tbl">';
                h += "<tr><td>#</td><td>Egysegek</td><td>Erkezes</td><td>Inditas</td><td>Allapot</td></tr>";
                atkData.forEach(function(a) {
                    var status = a.sent ? '<span style="color:#0f0">ELKULDVE</span>'
                        : a.prepErr ? '<span style="color:#f00">HIBA</span>'
                        : a.prep ? '<span style="color:#0f0">KESZ</span>'
                        : '<span style="color:#ff0">VARAKOZAS</span>';
                    h += "<tr>";
                    h += '<td style="color:#0ff;">' + a.id + "</td>";
                    h += "<td>" + unitSummary(a.units) + "</td>";
                    h += "<td>" + fmtDate(a.arrival) + "</td>";
                    h += "<td>" + fmtDate(new Date(a.launchTime)) + "</td>";
                    h += "<td>" + status + "</td>";
                    h += "</tr>";
                });
                h += "</table>";
                cdInfo.innerHTML = h;
            }

            document.getElementById("cd_cancel").addEventListener("click", function() {
                cancelled = true;
                cdCountdown.innerHTML = '<span style="color:#f90;font-size:20px;">VISSZAVONVA</span>';
                log("Visszavonva.", "#f90");
            });

            // === ELOKESZITES ===
            log("=== ELOKESZITES INDUL (" + atkData.length + " tamadas) ===", "#ff0");
            updateInfo();

            // Elso probalkozes
            for (var i = 0; i < atkData.length; i++) {
                if (cancelled) return;
                var a = atkData[i];
                log("#" + a.id + " elokeszites... (" + unitSummary(a.units) + ")");
                try {
                    a.prep = await prepareOne(a.cx, a.cy, a.units);
                    log("#" + a.id + " elokeszitve! (RTT: " + a.prep.rtt + "ms)", "#0f0");
                } catch(e) {
                    a.prepErr = e.message;
                    log("#" + a.id + " HIBA: " + e.message + " (ujraprobalas T-10mp-ig)", "#f90");
                }
                updateInfo();
                if (i < atkData.length - 1) await sl(500);
            }

            // Ujraprobalas a hibas tamadasokhoz (pl. csapatok meg uton vannak)
            var hasErrors = atkData.some(function(a) { return a.prepErr && !a.prep; });
            if (hasErrors) {
                log("");
                log("Hibas elokeszitesek ujraprobalasa (csapatok meg uton?)...", "#f90");
                log("Tavol: 10mp-enkent | T-30mp-tol: 3mp-enkent | T-10mp-tol: 1mp-enkent", "#f90");
                var firstLaunchEst = atkData[0].launchTime;
                while (!cancelled) {
                    var timeLeft = firstLaunchEst - sNow();
                    // T-3mp-nel leallunk - nincs tobb ido
                    if (timeLeft < 3000) {
                        log("T-3mp - ujraprobalas vege, nincs tobb ido", "#f00");
                        break;
                    }
                    // Varakozas az ido fuggvenyeben
                    var waitMs = timeLeft > 30000 ? 10000 : timeLeft > 10000 ? 3000 : 1000;
                    await sl(waitMs);
                    if (cancelled) break;
                    var allDone = true;
                    for (var ri = 0; ri < atkData.length; ri++) {
                        if (cancelled) break;
                        var ra = atkData[ri];
                        if (ra.prep || !ra.prepErr) continue;
                        allDone = false;
                        log("#" + ra.id + " ujraprobalas... (T-" + Math.round((firstLaunchEst - sNow()) / 1000) + "mp)");
                        try {
                            ra.prep = await prepareOne(ra.cx, ra.cy, ra.units);
                            ra.prepErr = null;
                            log("#" + ra.id + " SIKERULT! (RTT: " + ra.prep.rtt + "ms)", "#0f0");
                        } catch(e) {
                            log("#" + ra.id + " meg mindig hiba: " + e.message, "#f90");
                        }
                        updateInfo();
                    }
                    if (allDone) { log("Minden elokeszites sikerult!", "#0f0"); break; }
                }
            }

            log("=== ELOKESZITES KESZ ===", "#ff0");
            log("");

            // === FOLYAMATOS LATENCY MERES + CONNECTION WARMUP ===
            var latSamples = [];
            var latMedian = 0;
            var latComp = parseInt(document.getElementById("lat_comp").value) || 0;
            var firstLaunch = atkData[0].launchTime - latComp; // becsult elso kuldes idopont

            // Elokeszites RTT-k mint kiindulas
            for (var pi = 0; pi < atkData.length; pi++) {
                if (atkData[pi].prep && atkData[pi].prep.rtt) latSamples.push(atkData[pi].prep.rtt);
            }
            log("Kezdo RTT-k (elokeszitesbol): [" + latSamples.join(", ") + "] ms", "#0ff");

            // Hatterben futó meres - melegen tartja a connectiont + frissiti a latency-t
            var keepMeasuring = true;
            async function continuousMeasure() {
                while (keepMeasuring && !cancelled) {
                    // T-3mp-nel leallunk
                    if (sNow() > firstLaunch - 3000) break;
                    try {
                        var t1 = Date.now();
                        var r = await fetch(D.base + '/game.php?village=' + D.vid + '&screen=overview&ajax=1&_=' + t1, {
                            credentials: 'include'
                        });
                        await r.text();
                        var rtt = Date.now() - t1;
                        latSamples.push(rtt);
                        if (latSamples.length > 10) latSamples.shift(); // utolso 10 minta
                        // Median frissites
                        var sorted = latSamples.slice().sort(function(a,b){ return a-b; });
                        latMedian = sorted[Math.floor(sorted.length / 2)];
                    } catch(e) {}
                    await sl(3000);
                }
                keepMeasuring = false;
            }

            // Inditjuk a merest hatterben (nem await-eljuk, a countdown mellett fut)
            var measurePromise = continuousMeasure();
            log("Folyamatos latency meres + connection warmup indul (T-3mp-ig)...", "#0ff");

            // === XHR ELORE MEGNYITAS ===
            var xhrList = [];
            for (var i = 0; i < atkData.length; i++) {
                var a = atkData[i];
                if (a.prep && !a.prepErr) {
                    var xhr = new XMLHttpRequest();
                    xhr.open("POST", a.prep.url, true);
                    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                    xhr.withCredentials = true;
                    var xhrPromise = (function(x) {
                        return new Promise(function(resolve) {
                            x.onload = function() { resolve({ ok: true, text: x.responseText }); };
                            x.onerror = function() { resolve({ ok: false, text: "Network error" }); };
                        });
                    })(xhr);
                    xhrList.push({ id: a.id, idx: i, xhr: xhr, body: a.prep.body, promise: xhrPromise });
                }
            }
            log("XHR kapcsolatok megnyitva: " + xhrList.length + " db", "#0ff");

            // === VARAKOZAS A MERES BEFEJEZESERE + KOMPENZACIO ALKALMAZAS ===
            // A countdown elott megvarjuk hogy a meres lealljon (T-3mp)
            while (!cancelled && keepMeasuring) {
                var remaining = firstLaunch - sNow();
                var bigNum = fmtMs(Math.max(0, remaining));
                var numParts = bigNum.split(":");
                var msPart = numParts.pop();
                cdCountdown.innerHTML = numParts.join(":") + ':<span style="font-size:28px;opacity:.7;">' + msPart + "</span>";
                await sl(50);
            }

            // Vegso kompenzacio alkalmazasa
            if (latSamples.length > 0) {
                var sorted = latSamples.slice().sort(function(a,b){ return a-b; });
                latMedian = sorted[Math.floor(sorted.length / 2)];
                var totalComp = latMedian + latComp;
                for (var li = 0; li < atkData.length; li++) {
                    atkData[li].launchTime -= totalComp;
                }
                log("Vegso RTT mintak: [" + latSamples.map(function(r){return Math.round(r)}).join(", ") + "] ms", "#0ff");
                log("Vegso kompenzacio: -" + totalComp + "ms (median RTT: " + latMedian + "ms" + (latComp ? " + " + latComp + "ms manualis" : "") + ")", "#ff0");
                updateInfo();
            }
            log("");

            // === TAMADAS KULDES ===
            var xhrIdx = 0;

            for (var i = 0; i < atkData.length; i++) {
                if (cancelled) break;
                var a = atkData[i];

                // Varakozas az inditas idopontig
                while (!cancelled) {
                    var remaining = a.launchTime - sNow();
                    if (remaining <= 100) break;

                    var bigNum = fmtMs(Math.max(0, remaining));
                    var numParts = bigNum.split(":");
                    var msPart = numParts.pop();
                    cdCountdown.innerHTML = numParts.join(":") + ':<span style="font-size:28px;opacity:.7;">' + msPart + "</span>";

                    if (remaining > 1000) await sl(50);
                    else await sl(10);
                }

                if (cancelled) break;

                // Busy-wait az utolso 50ms (performance.now sub-ms pontossag)
                while (sNow() < a.launchTime) {}

                // KULDES - csak .send() hivas, semmi mas
                var xhrEntry = xhrList.find(function(x) { return x.idx === i; });
                if (xhrEntry) {
                    xhrEntry.xhr.send(xhrEntry.body);
                    var sendTime = Date.now();
                    var drift = Math.round(sendTime - a.launchTime);
                    a.sent = true;
                    log("#" + a.id + " >>> KULDES [" + fmtDate(new Date(sendTime)) + "] drift: " + (drift >= 0 ? "+" : "") + drift + "ms", "#ff0");
                    cdCountdown.innerHTML = '<span style="color:#ff0;font-size:22px;">KULDES #' + a.id + "...</span>";
                    updateInfo();
                } else {
                    log("#" + a.id + " KIHAGYVA - " + (a.prepErr || "nincs elokeszitve"), "#f00");
                }
            }

            // === VALASZOK ===
            log("");
            log("--- Valaszok ellenorzese ---", "#0ff");
            for (var i = 0; i < xhrList.length; i++) {
                try {
                    var result = await xhrList[i].promise;
                    if (!result.ok) {
                        log("#" + xhrList[i].id + " HIBA: " + result.text, "#f00");
                    } else {
                        var d3 = new DOMParser().parseFromString(result.text, "text/html");
                        var eB = d3.querySelector(".error_box");
                        if (eB) {
                            log("#" + xhrList[i].id + " HIBA: " + eB.textContent.trim(), "#f00");
                        } else {
                            log("#" + xhrList[i].id + " SIKERES!", "#0f0");
                        }
                    }
                } catch(e) {
                    log("#" + xhrList[i].id + " HIBA: " + e.message, "#f00");
                }
            }

            log("");
            log("=== KESZ ===", "#ff0");
            var sentCount = xhrList.length;
            cdCountdown.innerHTML = '<span style="color:#0f0;font-size:22px;">' + sentCount + "/" + atkData.length + " TAMADAS ELKULDVE</span>";

            await sl(120000);
            window.close();
        }

        // ====== INIT ======
        addAttack(false);
    }

})();
