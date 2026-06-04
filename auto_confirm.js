// Klanhaboru - Auto Farm Complete (Lebego KH-panel a top ablakban + farm gombok barmely keretben)
// A panel MINDIG a legfelso ablakba kerul fix retegkent (igy az iframe-es farmkezelo folott is latszik,
// soha nem valik lathatatlanna). A farm gombokat ott kattintja, ahol vannak (fo oldal vagy alkeret).
// FarmGod-barat: minden celpont egy oldalon -> nincs lapozas, nincs worker-iframe.

(function(){
    try{
        var FARM_SEL = 'a.farmGod_icon, a.farm_icon_a, a.farm_icon_b, #am_widget_farm, #units_home, #plunder_list, .farmGod_table';

        // === A farmot tartalmazo dokumentum megkeresese (fo oldal vagy same-origin alkeret) ===
        function findFarmDoc(){
            try{ if(document.querySelector(FARM_SEL)) return document; }catch(e){}
            var frames = document.querySelectorAll('iframe, frame');
            for(var i=0;i<frames.length;i++){
                try{
                    var d = frames[i].contentDocument || (frames[i].contentWindow && frames[i].contentWindow.document);
                    if(d && d.querySelector(FARM_SEL)) return d;
                }catch(e){}
            }
            return document; // fallback
        }

        // A panel MINDIG a top ablakba kerul, hogy biztosan latszodjon
        var UIDOC = window.top.document;
        var farmDoc = findFarmDoc();          // ide vannak a gombok
        var farmWin = farmDoc.defaultView || window;

        // === Ujrafuttatas eseten takaritsuk el a regit ===
        var oldPanel = UIDOC.getElementById('af_panel');
        if(oldPanel) oldPanel.remove();

        // === Lebego KH-stilusu panel ===
        var panel = UIDOC.createElement('div');
        panel.id = 'af_panel';
        panel.style.cssText = 'position:fixed;top:60px;right:12px;width:360px;max-width:94vw;z-index:2147483647;'
            + 'font-family:Verdana,Arial,sans-serif;font-size:12px;color:#5d4a1f;background:#f4e4bc;'
            + 'border:2px solid #7d510f;border-radius:6px;box-shadow:0 6px 24px rgba(0,0,0,0.55);overflow:hidden;';

        var h = '';
        // Fejlec (huzhato)
        h += '<div id="af_head" style="background:#7d510f;color:#f4e4bc;padding:7px 10px;font-size:13px;font-weight:bold;cursor:move;display:flex;justify-content:space-between;align-items:center;">';
        h += '<span>&#9876; Auto Farm Complete</span>';
        h += '<button id="af_close" title="Bezaras" style="background:transparent;color:#f4e4bc;border:none;cursor:pointer;font-size:18px;font-weight:bold;line-height:1;">&times;</button>';
        h += '</div>';

        h += '<div style="padding:10px 12px;">';

        // Stats
        h += '<div style="background:#fff8e8;border:1px solid #c1a264;padding:6px 10px;border-radius:3px;margin-bottom:8px;">';
        h += 'Kor: <b id="af_round">-</b> &nbsp;|&nbsp; <b id="af_page">-</b> &nbsp;|&nbsp; Kuldve: <b id="af_total">0</b>';
        h += '</div>';

        // Progress
        h += '<div style="background:#d8c9a3;border-radius:3px;height:16px;overflow:hidden;margin-bottom:8px;border:1px solid #7d510f;">';
        h += '<div id="af_bar" style="background:#7d510f;height:100%;width:0%;transition:width 0.2s;"></div>';
        h += '</div>';

        // Status
        h += '<div id="af_status" style="margin-bottom:8px;color:#2d7d0f;font-weight:bold;">Varakozas inditasra...</div>';

        // Vezerlok
        h += '<div style="margin-bottom:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">';
        h += '<button id="af_start" style="background:#7d510f;color:#f4e4bc;border:none;padding:6px 20px;font-weight:bold;cursor:pointer;border-radius:3px;">Inditas</button>';
        h += '<button id="af_stop" style="background:#c0392b;color:#fff;border:none;padding:6px 16px;font-weight:bold;cursor:pointer;border-radius:3px;display:none;">Leallitas</button>';
        h += '<label>Sablon: <select id="af_tpl" style="padding:2px;"><option value="a">A</option><option value="b">B</option><option value="ab">A + B</option></select></label>';
        h += '<label>ms: <input id="af_delay" type="number" value="200" min="0" max="5000" step="50" style="width:52px;text-align:center;"></label>';
        h += '<label title="Ujra es ujra amig van aktiv gomb"><input id="af_repeat" type="checkbox" checked> Ismetles</label>';
        h += '</div>';

        // Log
        h += '<div id="af_log" style="background:#111;color:#0f0;font-family:Consolas,monospace;font-size:11px;padding:8px;height:170px;overflow-y:auto;border-radius:3px;border:1px solid #333;"></div>';

        h += '</div>';
        panel.innerHTML = h;
        (UIDOC.body || document.body).appendChild(panel);

        function $(id){ return UIDOC.getElementById(id); }

        // === Allapot ===
        var running=false, stopped=false, totalSent=0, currentRound=0;

        // === Log ===
        function log(msg,color){
            var el=$('af_log');
            var t=new Date();
            var ts=String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0')+':'+String(t.getSeconds()).padStart(2,'0');
            var line=UIDOC.createElement('div');
            line.style.color=color||'#0f0';
            line.textContent='['+ts+'] '+msg;
            el.appendChild(line);
            el.scrollTop=el.scrollHeight;
        }

        // === Sleep ===
        function sl(ms){
            return new Promise(function(r){
                var s=performance.now();
                var ch=new MessageChannel();
                ch.port1.onmessage=function(){ if(performance.now()-s>=ms){r();}else{ch.port2.postMessage('');} };
                ch.port2.postMessage('');
            });
        }

        // === A farm dokumentum ujra-meghatarozasa (hatha kozben valtott a keret) ===
        function refreshFarmDoc(){
            var d=findFarmDoc();
            if(d){ farmDoc=d; farmWin=d.defaultView||window; }
        }

        // === Farm gombok keresese (A, B, vagy mindketto). farmGod-ot preferalja. ===
        function findFarmButtons(){
            var tpl=$('af_tpl').value;
            var out=[];
            try{
                refreshFarmDoc();
                var hasFarmGod=farmDoc.querySelector('a.farmGod_icon')!==null;
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
                var btns=farmDoc.querySelectorAll(selector);
                for(var i=0;i<btns.length;i++){
                    var btn=btns[i];
                    var st=(farmWin.getComputedStyle?farmWin.getComputedStyle(btn):null);
                    if(st&&(st.display==='none'||st.visibility==='hidden'))continue;
                    if(btn.classList.contains('disabled')||btn.classList.contains('clicked'))continue;
                    out.push(btn);
                }
            }catch(e){}
            return out;
        }

        // === Egy vegigpaszta ===
        async function clickPass(){
            var buttons=findFarmButtons();
            var totalNow=buttons.length;
            if(totalNow===0){
                log('Nincs aktiv '+$('af_tpl').value.toUpperCase()+' gomb az oldalon.','#999');
                return 0;
            }
            log('Talaltam '+totalNow+' '+$('af_tpl').value.toUpperCase()+' gombot. Kattintas...');
            var delay=parseInt($('af_delay').value); if(isNaN(delay)||delay<0)delay=200;
            var sent=0;
            for(var i=0;i<buttons.length;i++){
                if(stopped)break;
                $('af_status').textContent='Kattintas: '+(i+1)+'/'+totalNow;
                $('af_page').textContent='Gomb '+(i+1)+'/'+totalNow;
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
                await sl(1500);
            }

            log('');
            log('=== KESZ === Ossz: '+totalSent+' tamadas','#ff0');
            $('af_status').textContent='Kesz! '+totalSent+' tamadas.';
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

        // === Huzhatosag ===
        (function(){
            var head=$('af_head'), drag=false, ox=0, oy=0;
            head.addEventListener('mousedown',function(e){
                if(e.target.id==='af_close')return;
                drag=true; ox=e.clientX-panel.offsetLeft; oy=e.clientY-panel.offsetTop; e.preventDefault();
            });
            UIDOC.addEventListener('mousemove',function(e){
                if(!drag)return;
                panel.style.left=(e.clientX-ox)+'px'; panel.style.top=(e.clientY-oy)+'px'; panel.style.right='auto';
            });
            UIDOC.addEventListener('mouseup',function(){ drag=false; });
            // Erintos huzas (mobil)
            head.addEventListener('touchstart',function(e){
                if(e.target.id==='af_close')return;
                var t=e.touches[0]; drag=true; ox=t.clientX-panel.offsetLeft; oy=t.clientY-panel.offsetTop;
            },{passive:true});
            UIDOC.addEventListener('touchmove',function(e){
                if(!drag)return; var t=e.touches[0];
                panel.style.left=(t.clientX-ox)+'px'; panel.style.top=(t.clientY-oy)+'px'; panel.style.right='auto';
            },{passive:true});
            UIDOC.addEventListener('touchend',function(){ drag=false; });
        })();

    }catch(err){
        alert('Auto Farm Complete hiba: '+(err&&err.message?err.message:err));
    }
})();
