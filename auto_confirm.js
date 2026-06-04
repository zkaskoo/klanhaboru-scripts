// Klanhaboru - Auto Farm Complete (Natuv KH-panel + rejtett worker-iframe + loop)
// A panel a jatek sajat .vis tablazat-stilusaban, a "Rendelkezesre all" (#units_home) tabla ala agyazva.
// A lapozas/kattintas egy rejtett iframe-ben tortenik, ezert a panel tuleli az oldalvaltast.
// Vegigkattintja az A/B gombokat, lapoz, loopol amig van egyseg.

(function(){
    // Indito-ellenorzes (mobilon a game_data nem mindig elerheto, ezert tobb jelet is nezunk)
    var looksLikeGame = (typeof game_data !== 'undefined')
        || /game\.php|am_farm|screen=/i.test(location.href)
        || !!document.querySelector('#units_home, #am_widget_farm, #plunder_list, #content_value');
    if(!looksLikeGame){
        alert('Nyisd meg a Klanhaboru Farmkezelo oldalat!');
        return;
    }

    // === Ujrafuttatas eseten takaritsuk el a regit ===
    var oldPanel = document.getElementById('af_panel');
    if(oldPanel) oldPanel.remove();

    // === Worker iframe (itt tortenik a lapozas es a kattintas) ===
    var iframe = document.createElement('iframe');
    iframe.id = 'af_iframe';
    iframe.src = location.href;
    iframe.style.cssText = 'width:100%;height:420px;border:1px solid #7d510f;border-radius:3px;margin-top:8px;background:#fff;display:none;';

    // === Panel: natuv KH .vis tablazat ===
    var panel = document.createElement('table');
    panel.id = 'af_panel';
    panel.className = 'vis';
    panel.setAttribute('width','100%');
    panel.style.cssText = 'width:100%;max-width:100%;box-sizing:border-box;margin-bottom:10px;';

    var h = '';
    h += '<tbody>';
    // Fejlec (jatek .vis th + h4 stilus)
    h += '<tr><th class="vis" style="text-align:left;">';
    h += '<h4 style="display:inline-block;margin:0;">&#9876; Auto Farm Complete</h4>';
    h += '<span style="float:right;">';
    h += '<button id="af_view" title="Munkaablak (iframe) mutatasa/elrejtese" class="btn" style="padding:0 6px;margin-right:4px;">&#128065;</button>';
    h += '<button id="af_close" title="Bezaras" class="btn" style="padding:0 7px;">&times;</button>';
    h += '</span>';
    h += '</th></tr>';

    // Torzs (a jatek parchment hattere a .vis td-n keresztul)
    h += '<tr><td style="padding:10px;">';

    // Stats
    h += '<div style="margin-bottom:8px;font-size:12px;">';
    h += 'Kor: <b id="af_round">-</b> &nbsp;|&nbsp; Oldal: <b id="af_page">-</b> &nbsp;|&nbsp; Kuldve: <b id="af_total">0</b>';
    h += '</div>';

    // Progress bar (FarmGod-szeru)
    h += '<div style="background:#d8c9a3;border-radius:3px;height:16px;overflow:hidden;margin-bottom:8px;border:1px solid #7d510f;">';
    h += '<div id="af_bar" style="background:#7d510f;height:100%;width:0%;transition:width 0.2s;"></div>';
    h += '</div>';

    // Status
    h += '<div id="af_status" style="margin-bottom:8px;color:#2d7d0f;font-weight:bold;font-size:12px;">Varakozas inditasra...</div>';

    // Vezerlok
    h += '<div style="margin-bottom:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:12px;">';
    h += '<button id="af_start" class="btn" style="font-weight:bold;padding:3px 18px;">Inditas</button>';
    h += '<button id="af_stop" class="btn" style="font-weight:bold;padding:3px 16px;background:#c0392b;color:#fff;display:none;">Leallitas</button>';
    h += '<label>Max oldal: <input id="af_maxpage" type="number" value="0" min="0" max="100" style="width:45px;text-align:center;" title="0 = osszes"></label>';
    h += '<label>Sablon: <select id="af_tpl"><option value="a">A</option><option value="b">B</option><option value="ab">A + B</option></select></label>';
    h += '</div>';

    // Log (terminal-stilus, szandekosan elut)
    h += '<div id="af_log" style="background:#111;color:#0f0;font-family:Consolas,monospace;font-size:11px;padding:8px;height:180px;overflow-y:auto;border-radius:3px;border:1px solid #333;"></div>';

    h += '</td></tr>';
    h += '</tbody>';
    panel.innerHTML = h;

    // iframe a panel ala, kulon sorban
    var ifRow = document.createElement('tr');
    var ifCell = document.createElement('td');
    ifCell.style.padding = '0 10px 10px';
    ifCell.appendChild(iframe);
    ifRow.appendChild(ifCell);
    panel.querySelector('tbody').appendChild(ifRow);

    // === Beillesztes a "Rendelkezesre all" (#units_home) tabla ala ===
    // Hibaturoen: ha nincs meg a horgony (pl. mobil layout), lebego overlay-kent jelenik meg.
    function insertPanel(){
        try{
            var anchor = document.querySelector('#units_home')
                      || document.querySelector('#am_widget_farm')
                      || document.querySelector('#plunder_list')
                      || document.querySelector('#content_value');
            if(anchor && anchor.id === 'content_value'){
                anchor.insertBefore(panel, anchor.firstChild);
                return true;
            } else if(anchor && anchor.parentNode){
                anchor.parentNode.insertBefore(panel, anchor.nextSibling); // KOZVETLENUL a tabla ala
                return true;
            }
        }catch(e){}
        return false;
    }
    if(!insertPanel()){
        // Mobil / ismeretlen DOM: lebego, gorgetheto overlay a kepernyo tetejen
        panel.style.position = 'fixed';
        panel.style.top = '0';
        panel.style.left = '0';
        panel.style.right = '0';
        panel.style.width = 'auto';
        panel.style.maxHeight = '92vh';
        panel.style.overflowY = 'auto';
        panel.style.zIndex = '2147483647';
        panel.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5)';
        document.body.appendChild(panel);
    }

    function gwin(){ return iframe.contentWindow; }
    function gdoc(){ return iframe.contentDocument || iframe.contentWindow.document; }
    function $(id){ return document.getElementById(id); }

    // === Allapot ===
    var running=false, stopped=false, totalSent=0, currentRound=0;

    // === Log ===
    function log(msg,color){
        var el=$('af_log');
        var t=new Date();
        var ts=String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0')+':'+String(t.getSeconds()).padStart(2,'0');
        var line=document.createElement('div');
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

    // === Navigacio az iframe-ben + varakozas a load-ra ===
    function navigate(url){
        return new Promise(function(resolve){
            var done=false;
            function onload(){ if(done)return; done=true; iframe.removeEventListener('load',onload); resolve(); }
            iframe.addEventListener('load',onload);
            try{ gwin().location.href=url; }catch(e){ iframe.src=url; }
            setTimeout(function(){ if(!done){done=true; iframe.removeEventListener('load',onload); resolve();} },15000);
        });
    }

    // === Varakozas amig az iframe oldala betoltodik ===
    async function waitForPage(){
        var tries=0;
        while(tries<60){
            tries++;
            try{
                var doc=gdoc();
                if(doc.readyState==='complete'&&doc.querySelector('#plunder_list, #am_widget_farm, table')){
                    await sl(500);
                    return;
                }
            }catch(e){}
            await sl(500);
        }
    }

    // === Oldalak URL-jei az iframe DOM-jabol ===
    function getPageUrls(){
        var urls=[];
        try{
            var doc=gdoc();
            var nav=doc.getElementById('plunder_list_nav');
            if(!nav) return urls;
            var items=nav.querySelectorAll('.paged-nav-item');
            for(var i=0;i<items.length;i++){
                var el=items[i];
                if(el.tagName==='STRONG'){ urls.push(gwin().location.href); }
                else if(el.tagName==='A'&&el.href){ urls.push(el.href); }
            }
        }catch(e){}
        return urls;
    }

    // === Aktualis oldal index ===
    function getCurrentPageIndex(){
        try{
            var nav=gdoc().getElementById('plunder_list_nav');
            if(!nav) return 0;
            var items=nav.querySelectorAll('.paged-nav-item');
            for(var i=0;i<items.length;i++){ if(items[i].tagName==='STRONG') return i; }
        }catch(e){}
        return 0;
    }

    // === Farm gombok keresese (A, B, vagy mindketto). farmGod gombokat preferalja. ===
    function findFarmButtons(){
        var tpl=$('af_tpl').value;
        var aB=[];
        try{
            var doc=gdoc();
            var hasFarmGod=doc.querySelector('a.farmGod_icon')!==null;
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
            var btns=doc.querySelectorAll(selector);
            for(var i=0;i<btns.length;i++)aB.push(btns[i]);
            var active=[];
            for(var j=0;j<aB.length;j++){
                var btn=aB[j];
                var st=gwin().getComputedStyle(btn);
                if(st.display==='none'||st.visibility==='hidden')continue;
                if(btn.classList.contains('disabled')||btn.classList.contains('clicked'))continue;
                active.push(btn);
            }
            return active;
        }catch(e){ return []; }
    }

    // === UI frissites ===
    function updateUI(round,page,totalPages){
        $('af_round').textContent=String(round);
        $('af_page').textContent=String(page+1)+'/'+totalPages;
        $('af_total').textContent=String(totalSent);
    }

    // === Egy oldal feldolgozasa ===
    async function processPage(){
        var buttons=findFarmButtons();
        var pageUrls=getPageUrls();
        var totalPages=pageUrls.length||1;
        var currentPage=getCurrentPageIndex();
        updateUI(currentRound,currentPage,totalPages);
        if(buttons.length===0){
            var tplName=$('af_tpl').value.toUpperCase();
            log('Nincs aktiv '+tplName+' gomb ezen az oldalon.','#999');
            return 0;
        }
        var tplName2=$('af_tpl').value.toUpperCase();
        log('Talaltam '+buttons.length+' '+tplName2+' gombot. Kattintas...');
        var sent=0;
        for(var i=0;i<buttons.length;i++){
            if(stopped)break;
            $('af_status').textContent='Kattintas: '+(i+1)+'/'+buttons.length+' (Oldal '+(currentPage+1)+'/'+totalPages+')';
            var pct=Math.round(((i+1)/buttons.length)*100);
            $('af_bar').style.width=pct+'%';
            try{ buttons[i].click(); }catch(e){}
            sent++;totalSent++;
            $('af_total').textContent=String(totalSent);
            await sl(200);
        }
        log('['+$('af_tpl').value.toUpperCase()+'] '+sent+' tamadas elkuldve errol az oldalrol.','#0f0');
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

        log('Munkaablak betoltese...');
        await waitForPage();

        var pageUrls=getPageUrls();
        var totalPages=pageUrls.length||1;
        log('Talalt oldalak: '+totalPages,'#ff0');
        log('');

        while(!stopped){
            currentRound++;
            var maxPage=parseInt($('af_maxpage').value)||0;
            var usePages=maxPage>0?Math.min(maxPage,totalPages):totalPages;
            log('========== '+currentRound+'. KOR ('+usePages+'/'+totalPages+' oldal) ==========','#0ff');
            var roundSent=0;

            for(var p=0;p<usePages;p++){
                if(stopped)break;

                var currentPage=getCurrentPageIndex();
                if(currentPage!==p){
                    pageUrls=getPageUrls();
                    if(pageUrls[p]){
                        log('Navigalas oldal '+(p+1)+'-re...');
                        await navigate(pageUrls[p]);
                        await waitForPage();
                    }
                }

                updateUI(currentRound,p,usePages);
                log('--- Oldal '+(p+1)+'/'+usePages+' ---','#0ff');
                $('af_bar').style.width='0%';

                var sent=await processPage();
                roundSent+=sent;

                if(p<usePages-1&&!stopped)await sl(800);
            }

            if(stopped)break;

            if(roundSent===0){
                log('');
                log('Nincs tobb cel / egysegek elfogytak. Leallitas.','#f90');
                break;
            }

            log('');
            log('Kor vege, '+roundSent+' tamadas. Varakozas...','#0ff');
            await sl(2000);

            pageUrls=getPageUrls();
            totalPages=pageUrls.length||1;
            if(pageUrls[0]&&getCurrentPageIndex()!==0){
                log('Vissza az 1. oldalra...');
                await navigate(pageUrls[0]);
                await waitForPage();
                pageUrls=getPageUrls();
                totalPages=pageUrls.length||1;
            }
        }

        log('');
        log('=== LEALLITVA === Ossz: '+totalSent+' tamadas','#ff0');
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
        setTimeout(function(){ $('af_stop').disabled=false; $('af_stop').style.opacity='1'; },2000);
    });

    // Munkaablak (iframe) mutatasa/elrejtese
    $('af_view').addEventListener('click',function(){
        iframe.style.display = (iframe.style.display==='none') ? 'block' : 'none';
    });

    // Bezaras
    $('af_close').addEventListener('click',function(){
        stopped=true;
        panel.remove();
    });
})();
