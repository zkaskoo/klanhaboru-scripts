// Klanhaboru - Auto Farm Complete (Popup ablak + automatikus lapozas + loop)
// A popup megmarad oldalvaltas kozott es vezerli a fo ablakot
// Vegigkattintja az A gombokat, lapoz, loopol amig van egyseg

(function(){
    if(typeof game_data === 'undefined'){
        alert('Nyisd meg a Klanhaboru oldalat!');
        return;
    }

    var gameWin = window;
    var popup = window.open('', 'auto_farm_complete', 'width=360,height=420,top=80,left=80,scrollbars=yes,resizable=yes');
    if(!popup){ alert('Popup blokkolva! Engedelyezd a popupokat!'); return; }

    var ph = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Auto Farm Complete</title></head>';
    ph += '<body style="margin:0;padding:0;font-family:Verdana,Arial,sans-serif;font-size:12px;color:#f4e4bc;background:#1a1a1a;">';

    // Header
    ph += '<div style="background:#7d510f;padding:8px 15px;font-size:14px;font-weight:bold;">Auto Farm Complete</div>';
    ph += '<div style="padding:12px 15px;">';

    // Stats
    ph += '<div style="background:#2a1a0a;border:1px solid #7d510f;padding:8px 12px;border-radius:4px;margin-bottom:10px;">';
    ph += '<div>Kor: <b id="af_round">-</b> | Oldal: <b id="af_page">-</b> | Kuldve: <b id="af_total">0</b></div>';
    ph += '</div>';

    // Progress bar
    ph += '<div style="background:#2a1a0a;border-radius:4px;height:18px;overflow:hidden;margin-bottom:10px;border:1px solid #7d510f;">';
    ph += '<div id="af_bar" style="background:#7d510f;height:100%;width:0%;transition:width 0.2s;"></div>';
    ph += '</div>';

    // Status
    ph += '<div id="af_status" style="margin-bottom:10px;color:#0f0;">Varakozas inditasra...</div>';

    // Buttons
    ph += '<div style="margin-bottom:10px;display:flex;gap:10px;">';
    ph += '<button id="af_start" style="background:#7d510f;color:#f4e4bc;border:none;padding:8px 25px;font-size:13px;font-weight:bold;cursor:pointer;border-radius:4px;">Inditas</button>';
    ph += '<button id="af_stop" style="background:#c0392b;color:#fff;border:none;padding:8px 20px;font-size:13px;font-weight:bold;cursor:pointer;border-radius:4px;display:none;">Leallitas</button>';
    ph += ' <label style="font-size:11px;">Max oldal: <input id="af_maxpage" type="number" value="0" min="0" max="100" style="width:45px;text-align:center;padding:2px;border:1px solid #7d510f;background:#2a1a0a;color:#f4e4bc;font-size:11px;" title="0 = osszes"></label>';
    ph += ' <label style="font-size:11px;">Sablon: <select id="af_tpl" style="padding:2px;border:1px solid #7d510f;background:#2a1a0a;color:#f4e4bc;font-size:11px;"><option value="a">A</option><option value="b">B</option><option value="ab">A + B</option></select></label>';
    ph += '</div>';

    // Log
    ph += '<div id="af_log" style="background:#111;color:#0f0;font-family:Consolas,monospace;font-size:11px;padding:8px;height:200px;overflow-y:auto;border-radius:4px;border:1px solid #333;"></div>';

    ph += '</div></body>';

    // === SCRIPT ===
    ph += '<scr' + 'ipt>';

    // Valtozok
    ph += 'var gw=window.opener;'; // game window referencia
    ph += 'var running=false,stopped=false,totalSent=0,currentRound=0;';

    // Log
    ph += 'function log(msg,color){';
    ph += '  var el=document.getElementById("af_log");';
    ph += '  var t=new Date();';
    ph += '  var ts=String(t.getHours()).padStart(2,"0")+":"+String(t.getMinutes()).padStart(2,"0")+":"+String(t.getSeconds()).padStart(2,"0");';
    ph += '  var line=document.createElement("div");';
    ph += '  line.style.color=color||"#0f0";';
    ph += '  line.textContent="["+ts+"] "+msg;';
    ph += '  el.appendChild(line);';
    ph += '  el.scrollTop=el.scrollHeight;';
    ph += '}';

    // Seged - MessageChannel alapu sleep (nem throttle-olja a Chrome hatterben)
    ph += 'function sl(ms){return new Promise(function(r){var s=performance.now();var ch=new MessageChannel();ch.port1.onmessage=function(){if(performance.now()-s>=ms){r();}else{ch.port2.postMessage("");}};ch.port2.postMessage("");});}';

    // Varakozas amig a fo ablak betoltodik (async + sl, nem setInterval)
    ph += 'async function waitForPage(){';
    ph += '  var tries=0;';
    ph += '  while(tries<60){';
    ph += '    tries++;';
    ph += '    try{';
    ph += '      var doc=gw.document;';
    ph += '      if(doc.readyState==="complete"&&doc.querySelector("#plunder_list, #am_widget_farm, table")){';
    ph += '        await sl(500);';
    ph += '        return;';
    ph += '      }';
    ph += '    }catch(e){}';
    ph += '    await sl(500);';
    ph += '  }';
    ph += '}';

    // Oldalak kinyerese a fo ablak DOM-jabol
    ph += 'function getPageUrls(){';
    ph += '  var urls=[];';
    ph += '  try{';
    ph += '    var doc=gw.document;';
    ph += '    var nav=doc.getElementById("plunder_list_nav");';
    ph += '    if(!nav)return urls;';
    ph += '    var items=nav.querySelectorAll(".paged-nav-item");';
    ph += '    for(var i=0;i<items.length;i++){';
    ph += '      var el=items[i];';
    ph += '      if(el.tagName==="STRONG"){urls.push(gw.location.href);}';
    ph += '      else if(el.tagName==="A"&&el.href){urls.push(el.href);}';
    ph += '    }';
    ph += '  }catch(e){}';
    ph += '  return urls;';
    ph += '}';

    // Aktualis oldal index
    ph += 'function getCurrentPageIndex(){';
    ph += '  try{';
    ph += '    var nav=gw.document.getElementById("plunder_list_nav");';
    ph += '    if(!nav)return 0;';
    ph += '    var items=nav.querySelectorAll(".paged-nav-item");';
    ph += '    for(var i=0;i<items.length;i++){if(items[i].tagName==="STRONG")return i;}';
    ph += '  }catch(e){}';
    ph += '  return 0;';
    ph += '}';

    // Farm gombok keresese a fo ablakban (A, B, vagy mindketto)
    // farmGod gombokat preferalja a sima farm gombok felett
    ph += 'function findFarmButtons(){';
    ph += '  var tpl=document.getElementById("af_tpl").value;';
    ph += '  var aB=[];';
    ph += '  try{';
    ph += '    var doc=gw.document;';
    // Eloszor nezzuk van-e farmGod gomb az oldalon
    ph += '    var hasFarmGod=doc.querySelector("a.farmGod_icon")!==null;';
    ph += '    var selector="";';
    ph += '    if(hasFarmGod){';
    // farmGod gombok - CSAK azokat kattintjuk, sima farmot NEM
    ph += '      if(tpl==="a")selector="a.farmGod_icon.farm_icon_a";';
    ph += '      else if(tpl==="b")selector="a.farmGod_icon.farm_icon_b";';
    ph += '      else selector="a.farmGod_icon.farm_icon_a,a.farmGod_icon.farm_icon_b";';
    ph += '    }else{';
    // Nincs farmGod, sima farm gombok
    ph += '      if(tpl==="a")selector="a.farm_icon_a";';
    ph += '      else if(tpl==="b")selector="a.farm_icon_b";';
    ph += '      else selector="a.farm_icon_a,a.farm_icon_b";';
    ph += '    }';
    ph += '    var btns=doc.querySelectorAll(selector);';
    ph += '    for(var i=0;i<btns.length;i++)aB.push(btns[i]);';
    // Filter disabled/hidden
    ph += '    var active=[];';
    ph += '    for(var i=0;i<aB.length;i++){';
    ph += '      var btn=aB[i];';
    ph += '      var st=gw.getComputedStyle(btn);';
    ph += '      if(st.display==="none"||st.visibility==="hidden")continue;';
    ph += '      if(btn.classList.contains("disabled")||btn.classList.contains("clicked"))continue;';
    ph += '      active.push(btn);';
    ph += '    }';
    ph += '    return active;';
    ph += '  }catch(e){return [];}';
    ph += '}';

    // Navigalas a fo ablakban
    ph += 'function goToPage(url){';
    ph += '  gw.location.href=url;';
    ph += '}';

    // UI frissites
    ph += 'function updateUI(round,page,totalPages){';
    ph += '  document.getElementById("af_round").textContent=String(round);';
    ph += '  document.getElementById("af_page").textContent=String(page+1)+"/"+totalPages;';
    ph += '  document.getElementById("af_total").textContent=String(totalSent);';
    ph += '}';

    // Egy oldal feldolgozasa (A gombok kattintasa)
    ph += 'async function processPage(){';
    ph += '  var buttons=findFarmButtons();';
    ph += '  var pageUrls=getPageUrls();';
    ph += '  var totalPages=pageUrls.length||1;';
    ph += '  var currentPage=getCurrentPageIndex();';
    ph += '  updateUI(currentRound,currentPage,totalPages);';
    ph += '  if(buttons.length===0){';
    ph += '    var tplName=document.getElementById("af_tpl").value.toUpperCase();';
    ph += '    log("Nincs aktiv "+tplName+" gomb ezen az oldalon.","#999");';
    ph += '    return 0;';
    ph += '  }';
    ph += '  var tplName2=document.getElementById("af_tpl").value.toUpperCase();';
    ph += '  log("Talaltam "+buttons.length+" "+tplName2+" gombot. Kattintas...");';
    ph += '  var sent=0;';
    ph += '  for(var i=0;i<buttons.length;i++){';
    ph += '    if(stopped)break;';
    ph += '    document.getElementById("af_status").textContent="Kattintas: "+(i+1)+"/"+buttons.length+" (Oldal "+(currentPage+1)+"/"+totalPages+")";';
    ph += '    var pct=Math.round(((i+1)/buttons.length)*100);';
    ph += '    document.getElementById("af_bar").style.width=pct+"%";';
    ph += '    try{buttons[i].click();}catch(e){}';
    ph += '    sent++;totalSent++;';
    ph += '    document.getElementById("af_total").textContent=String(totalSent);';
    ph += '    await sl(200);';
    ph += '  }';
    ph += '  log("["+document.getElementById("af_tpl").value.toUpperCase()+"] "+sent+" tamadas elkuldve errol az oldalrol.","#0f0");';
    ph += '  return sent;';
    ph += '}';

    // Fo loop
    ph += 'async function mainLoop(){';
    ph += '  running=true;stopped=false;totalSent=0;currentRound=0;';
    ph += '  document.getElementById("af_start").style.display="none";';
    ph += '  document.getElementById("af_stop").style.display="";';
    ph += '  document.getElementById("af_log").innerHTML="";';
    ph += '  log("=== AUTO FARM COMPLETE INDITAS ===","#ff0");';

    // Elso oldal varakozas
    ph += '  log("Fo ablak betoltese...");';
    ph += '  await waitForPage();';

    ph += '  var pageUrls=getPageUrls();';
    ph += '  var totalPages=pageUrls.length||1;';
    ph += '  log("Talalt oldalak: "+totalPages,"#ff0");';
    ph += '  log("");';

    ph += '  while(!stopped){';
    ph += '    currentRound++;';
    ph += '    var maxPage=parseInt(document.getElementById("af_maxpage").value)||0;';
    ph += '    var usePages=maxPage>0?Math.min(maxPage,totalPages):totalPages;';
    ph += '    log("========== "+currentRound+". KOR ("+usePages+"/"+totalPages+" oldal) ==========","#0ff");';
    ph += '    var roundSent=0;';

    ph += '    for(var p=0;p<usePages;p++){';
    ph += '      if(stopped)break;';

    // Ha nem az elso oldal vagy nem az elso kor, navigaljunk
    ph += '      var currentPage=getCurrentPageIndex();';
    ph += '      if(currentPage!==p){';
    ph += '        pageUrls=getPageUrls();'; // frissites
    ph += '        if(pageUrls[p]){';
    ph += '          log("Navigalas oldal "+(p+1)+"-re...");';
    ph += '          goToPage(pageUrls[p]);';
    ph += '          await sl(1000);'; // varakozas navigaciora
    ph += '          await waitForPage();';
    ph += '        }';
    ph += '      }';

    ph += '      updateUI(currentRound,p,usePages);';
    ph += '      log("--- Oldal "+(p+1)+"/"+usePages+" ---","#0ff");';
    ph += '      document.getElementById("af_bar").style.width="0%";';

    ph += '      var sent=await processPage();';
    ph += '      roundSent+=sent;';

    ph += '      if(p<usePages-1&&!stopped)await sl(800);';
    ph += '    }';

    ph += '    if(stopped)break;';

    ph += '    if(roundSent===0){';
    ph += '      log("");';
    ph += '      log("Nincs tobb cel / egysegek elfogytak. Leallitas.","#f90");';
    ph += '      break;';
    ph += '    }';

    // Kor vege, vissza az elso oldalra
    ph += '    log("");';
    ph += '    log("Kor vege, "+roundSent+" tamadas. Varakozas...","#0ff");';
    ph += '    await sl(2000);';

    // Vissza az 1. oldalra a kovetkezo korhoz
    ph += '    pageUrls=getPageUrls();';
    ph += '    totalPages=pageUrls.length||1;';
    ph += '    if(pageUrls[0]&&getCurrentPageIndex()!==0){';
    ph += '      log("Vissza az 1. oldalra...");';
    ph += '      goToPage(pageUrls[0]);';
    ph += '      await sl(1000);';
    ph += '      await waitForPage();';
    // Oldalak ujra detektalasa
    ph += '      pageUrls=getPageUrls();';
    ph += '      totalPages=pageUrls.length||1;';
    ph += '    }';

    ph += '  }';

    ph += '  log("");';
    ph += '  log("=== LEALLITVA === Ossz: "+totalSent+" tamadas","#ff0");';
    ph += '  document.getElementById("af_status").textContent="Kesz! "+totalSent+" tamadas elkuldve.";';
    ph += '  document.getElementById("af_bar").style.width="100%";';
    ph += '  document.getElementById("af_bar").style.background="#2d7d0f";';
    ph += '  document.getElementById("af_start").style.display="";';
    ph += '  document.getElementById("af_stop").style.display="none";';
    ph += '  running=false;';
    ph += '}';

    // Gombok
    ph += 'document.getElementById("af_start").addEventListener("click",function(){mainLoop();});';
    ph += 'document.getElementById("af_stop").addEventListener("click",function(){';
    ph += '  stopped=true;';
    ph += '  this.style.opacity="0.5";this.disabled=true;';
    ph += '  document.getElementById("af_status").textContent="Leallitas...";';
    ph += '  log("Leallitas...","#f90");';
    ph += '  setTimeout(function(){document.getElementById("af_stop").disabled=false;document.getElementById("af_stop").style.opacity="1";},2000);';
    ph += '});';

    ph += '</scr' + 'ipt></html>';

    popup.document.write(ph);
    popup.document.close();
})();
