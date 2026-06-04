// Klanhaboru - Auto Farm Complete (Natuv KH-panel, kozvetlenul az oldalon)
// FarmGod-barat: az osszes celpont egy oldalon van, ezert NINCS iframe es NINCS lapozas.
// A panel a host dokumentumba kerul (fo oldal vagy same-origin alkeret), majd vegigkattintja
// az aktiv A/B gombokat, ismetelve amig van. Telefonon (alternativ skin) is megnyilik.

(function(){
    try{
        var FARM_SEL = '#am_widget_farm, #units_home, #plunder_list, .farmGod_table';

        // === A farmot tartalmazo dokumentum megkeresese (fo oldal vagy alkeret) ===
        function findFarmDoc(){
            try{ if(document.querySelector(FARM_SEL)) return document; }catch(e){}
            var frames = document.querySelectorAll('iframe, frame');
            for(var i=0;i<frames.length;i++){
                try{
                    var d = frames[i].contentDocument || (frames[i].contentWindow && frames[i].contentWindow.document);
                    if(d && d.querySelector(FARM_SEL)) return d;
                }catch(e){}
            }
            return document; // fallback: fo oldal
        }

        var D  = findFarmDoc();              // host dokumentum
        var DW = D.defaultView || window;    // host ablak (getComputedStyle-hoz)

        var looksLikeGame = !!D.querySelector(FARM_SEL)
            || (typeof game_data !== 'undefined')
            || /game\.php|am_farm|screen=/i.test(location.href)
            || !!D.querySelector('#content_value');
        if(!looksLikeGame){
            alert('Nyisd meg a Klanhaboru Farmkezelo oldalat!');
            return;
        }

        // === Ujrafuttatas eseten takaritsuk el a regit ===
        var oldPanel = D.getElementById('af_panel');
        if(oldPanel) oldPanel.remove();

        // === Panel: natuv KH .vis tablazat ===
        var panel = D.createElement('table');
        panel.id = 'af_panel';
        panel.className = 'vis';
        panel.setAttribute('width','100%');
        panel.style.cssText = 'width:100%;max-width:100%;box-sizing:border-box;margin-bottom:10px;';

        var h = '';
        h += '<tbody>';
        h += '<tr><th class="vis" style="text-align:left;">';
        h += '<h4 style="display:inline-block;margin:0;">&#9876; Auto Farm Complete</h4>';
        h += '<span style="float:right;"><button id="af_close" title="Bezaras" class="btn" style="padding:0 7px;">&times;</button></span>';
        h += '</th></tr>';

        h += '<tr><td style="padding:10px;">';

        // Stats
        h += '<div style="margin-bottom:8px;font-size:12px;">';
        h += 'Kor: <b id="af_round">-</b> &nbsp;|&nbsp; Aktualis: <b id="af_page">-</b> &nbsp;|&nbsp; Kuldve: <b id="af_total">0</b>';
        h += '</div>';

        // Progress bar
        h += '<div style="background:#d8c9a3;border-radius:3px;height:16px;overflow:hidden;margin-bottom:8px;border:1px solid #7d510f;">';
        h += '<div id="af_bar" style="background:#7d510f;height:100%;width:0%;transition:width 0.2s;"></div>';
        h += '</div>';

        // Status
        h += '<div id="af_status" style="margin-bottom:8px;color:#2d7d0f;font-weight:bold;font-size:12px;">Varakozas inditasra...</div>';

        // Vezerlok
        h += '<div style="margin-bottom:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:12px;">';
        h += '<button id="af_start" class="btn" style="font-weight:bold;padding:3px 18px;">Inditas</button>';
        h += '<button id="af_stop" class="btn" style="font-weight:bold;padding:3px 16px;background:#c0392b;color:#fff;display:none;">Leallitas</button>';
        h += '<label>Sablon: <select id="af_tpl"><option value="a">A</option><option value="b">B</option><option value="ab">A + B</option></select></label>';
        h += '<label>Keslelt. (ms): <input id="af_delay" type="number" value="200" min="0" max="5000" step="50" style="width:55px;text-align:center;"></label>';
        h += '<label title="Ujra es ujra vegigmegy amig van aktiv gomb"><input id="af_repeat" type="checkbox" checked> Ismetles</label>';
        h += '</div>';

        // Log
        h += '<div id="af_log" style="background:#111;color:#0f0;font-family:Consolas,monospace;font-size:11px;padding:8px;height:180px;overflow-y:auto;border-radius:3px;border:1px solid #333;"></div>';

        h += '</td></tr>';
        h += '</tbody>';
        panel.innerHTML = h;

        // === Beillesztes (a #units_home ala, vagy a tartalom tetejere, vagy a farm tabla ele, vegul overlay) ===
        var placed = false;
        try{
            var aUnits = D.querySelector('#units_home');
            if(aUnits && aUnits.parentNode){ aUnits.parentNode.insertBefore(panel, aUnits.nextSibling); placed = true; }
            if(!placed){ var cv = D.querySelector('#content_value'); if(cv){ cv.insertBefore(panel, cv.firstChild); placed = true; } }
            if(!placed){ var ft = D.querySelector('#am_widget_farm, #plunder_list, .farmGod_table'); if(ft && ft.parentNode){ ft.parentNode.insertBefore(panel, ft); placed = true; } }
        }catch(e){}
        if(!placed){
            panel.style.position='fixed'; panel.style.top='0'; panel.style.left='0'; panel.style.right='0';
            panel.style.width='auto'; panel.style.maxHeight='92vh'; panel.style.overflowY='auto';
            panel.style.zIndex='2147483647'; panel.style.boxShadow='0 4px 16px rgba(0,0,0,0.5)';
            (D.body||document.body).appendChild(panel);
        }

        function $(id){ return D.getElementById(id); }

        // === Allapot ===
        var running=false, stopped=false, totalSent=0, currentRound=0;

        // === Log ===
        function log(msg,color){
            var el=$('af_log');
            var t=new Date();
            var ts=String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0')+':'+String(t.getSeconds()).padStart(2,'0');
            var line=D.createElement('div');
            line.style.color=color||'#0f0';
            line.textContent='['+ts+'] '+msg;
            el.appendChild(line);
            el.scrollTop=el.scrollHeight;
        }

        // === Sleep (MessageChannel - nem throttle-olja a Chrome hatterben) ===
        function sl(ms){
            return new Promise(function(r){
                var s=performance.now();
                var ch=new MessageChannel();
                ch.port1.onmessage=function(){ if(performance.now()-s>=ms){r();}else{ch.port2.postMessage('');} };
                ch.port2.postMessage('');
            });
        }

        // === Farm gombok keresese az AKTUALIS oldalon (A, B, vagy mindketto). farmGod-ot preferalja. ===
        function findFarmButtons(){
            var tpl=$('af_tpl').value;
            var out=[];
            try{
                var hasFarmGod=D.querySelector('a.farmGod_icon')!==null;
                var selector='';
                if(hasFarmGod){
                    if(tpl==='a')selector='a.farmGod_icon.farm_icon_a';
                    else if(tpl==='b')selector='a.farmGod_icon.farm_icon_b';
                    else selector='a.farmGod_icon.farm_icon_a,a.farmGod_icon.farm_icon_b';
                }else{
                    if(tpl==='a')selector='a.farm_icon_a';
                    else if(tpl==='b')selector='a.farm_icon_b';
                    else selector='a.farm_icon_a,a.farm_icon_b';
                }
                var btns=D.querySelectorAll(selector);
                for(var i=0;i<btns.length;i++){
                    var btn=btns[i];
                    var st=(DW.getComputedStyle?DW.getComputedStyle(btn):null);
                    if(st&&(st.display==='none'||st.visibility==='hidden'))continue;
                    if(btn.classList.contains('disabled')||btn.classList.contains('clicked'))continue;
                    out.push(btn);
                }
            }catch(e){}
            return out;
        }

        // === Egy vegigpaszta a gombokon ===
        async function clickPass(){
            var buttons=findFarmButtons();
            var totalNow=buttons.length;
            if(totalNow===0){
                log('Nincs tobb aktiv '+$('af_tpl').value.toUpperCase()+' gomb.','#999');
                return 0;
            }
            log('Talaltam '+totalNow+' '+$('af_tpl').value.toUpperCase()+' gombot. Kattintas...');
            var delay=parseInt($('af_delay').value); if(isNaN(delay)||delay<0)delay=200;
            var sent=0;
            for(var i=0;i<buttons.length;i++){
                if(stopped)break;
                $('af_status').textContent='Kattintas: '+(i+1)+'/'+totalNow;
                $('af_page').textContent=(i+1)+'/'+totalNow;
                $('af_bar').style.width=Math.round(((i+1)/totalNow)*100)+'%';
                try{ buttons[i].click(); }catch(e){}
                sent++; totalSent++;
                $('af_total').textContent=String(totalSent);
                if(delay>0) await sl(delay);
            }
            log('['+$('af_tpl').value.toUpperCase()+'] '+sent+' tamadas elkuldve.','#0f0');
            return sent;
        }

        // === Fo loop ===
        async function mainLoop(){
            running=true;stopped=false;totalSent=0;currentRound=0;
            $('af_start').style.display='none';
            $('af_stop').style.display='';
            $('af_stop').disabled=false; $('af_stop').style.opacity='1';
            $('af_log').innerHTML='';
            log('=== AUTO FARM COMPLETE INDITAS ===','#ff0');

            var repeat=$('af_repeat').checked;
            var maxPasses=repeat?100:1;

            while(!stopped && currentRound<maxPasses){
                currentRound++;
                $('af_round').textContent=String(currentRound);
                if(repeat) log('--- '+currentRound+'. kor ---','#0ff');
                $('af_bar').style.width='0%';

                var sent=await clickPass();
                if(stopped) break;
                if(sent===0){ log('Kesz - nincs tobb cel.','#f90'); break; }
                if(!repeat) break;

                log('Var a kovetkezo korre...','#0ff');
                await sl(1500); // FarmGod-nak ido a frissulesre
            }

            log('');
            log('=== KESZ === Ossz: '+totalSent+' tamadas','#ff0');
            $('af_status').textContent='Kesz! '+totalSent+' tamadas elkuldve.';
            $('af_bar').style.width='100%';
            $('af_bar').style.background='#2d7d0f';
            $('af_start').style.display='';
            $('af_stop').style.display='none';
            running=false;
        }

        // === Gombok ===
        $('af_start').addEventListener('click',function(){ if(!running) mainLoop(); });
        $('af_stop').addEventListener('click',function(){
            stopped=true;
            this.style.opacity='0.5';this.disabled=true;
            $('af_status').textContent='Leallitas...';
            log('Leallitas...','#f90');
            setTimeout(function(){ var s=$('af_stop'); if(s){ s.disabled=false; s.style.opacity='1'; } },2000);
        });
        $('af_close').addEventListener('click',function(){ stopped=true; panel.remove(); });

    }catch(err){
        alert('Auto Farm Complete hiba: '+(err&&err.message?err.message:err));
    }
})();
