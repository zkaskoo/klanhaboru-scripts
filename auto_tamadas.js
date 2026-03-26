// Klanhaboru - Auto Farm Complete (Popup ablak)
// Console-ban vagy bookmarkletkent futtasd a jatek oldalan (am_farm screen)
// Automatikusan vegigmegy az osszes oldalon, megnyomja az A gombokat, es loopol amig van egyseg

(function(){
    if(typeof game_data === 'undefined'){
        alert('Nyisd meg a Klanhaboru oldalat!');
        return;
    }

    var villageId = game_data.village.id;
    var baseUrl = window.location.origin;

    var popup = window.open('', 'auto_farm', 'width=650,height=520,top=80,left=80,scrollbars=yes,resizable=yes');
    if(!popup){ alert('Popup blokkolva! Engedelyezd a popupokat!'); return; }

    var D = JSON.stringify({ vid: villageId, base: baseUrl });

    var ph = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Auto Farm Complete</title></head>';
    ph += '<body style="margin:0;padding:0;font-family:Verdana,Arial,sans-serif;font-size:12px;color:#3e2b0e;">';
    ph += '<div style="background:#f4e4bc;min-height:100vh;">';

    // Header
    ph += '<div style="background:#7d510f;color:#f4e4bc;padding:8px 15px;font-size:14px;font-weight:bold;">Auto Farm Complete</div>';
    ph += '<div style="padding:12px 15px;">';

    // Beallitasok
    ph += '<div style="margin-bottom:10px;display:flex;gap:15px;align-items:center;flex-wrap:wrap;">';
    ph += '<label>Kesleltetes (ms): <input id="af_delay" type="number" value="300" min="100" max="5000" step="50" style="width:70px;text-align:center;padding:3px;border:1px solid #b89b6a;background:#fff8ec;"></label>';
    ph += '<label>Max oldal: <input id="af_maxpage" type="number" value="0" min="0" max="100" style="width:50px;text-align:center;padding:3px;border:1px solid #b89b6a;background:#fff8ec;" title="0 = osszes oldal"></label>';
    ph += '<span id="af_pageinfo" style="color:#666;">Oldalak: betoltes...</span>';
    ph += '</div>';

    // Gombok
    ph += '<div style="margin-bottom:10px;display:flex;gap:10px;">';
    ph += '<button id="af_start" style="background:#7d510f;color:#f4e4bc;border:none;padding:8px 30px;font-size:13px;font-weight:bold;cursor:pointer;border-radius:4px;">Inditas</button>';
    ph += '<button id="af_stop" style="background:#c0392b;color:#fff;border:none;padding:8px 20px;font-size:13px;font-weight:bold;cursor:pointer;border-radius:4px;display:none;">Leallitas</button>';
    ph += '</div>';

    // Statisztika
    ph += '<div id="af_stats" style="background:#e8d5a3;border:1px solid #c8a86e;padding:8px 12px;border-radius:4px;margin-bottom:10px;display:flex;gap:20px;flex-wrap:wrap;">';
    ph += '<div>Kor: <b id="af_round">0</b></div>';
    ph += '<div>Oldal: <b id="af_page">-</b></div>';
    ph += '<div>Kuldott: <b id="af_total">0</b></div>';
    ph += '</div>';

    // Log
    ph += '<div id="af_log" style="background:#1a1a1a;color:#0f0;font-family:Consolas,monospace;font-size:11px;padding:10px;height:300px;overflow-y:auto;border-radius:4px;"></div>';

    ph += '</div></div>';

    // === JavaScript ===
    ph += '<scr' + 'ipt>';
    ph += 'var D=' + D + ';';
    ph += 'var running=false,totalSent=0;';
    ph += 'var pageUrls=[];';

    // Log fuggveny
    ph += 'function log(msg,color){';
    ph += '  var t=new Date();';
    ph += '  var ts=String(t.getHours()).padStart(2,"0")+":"+String(t.getMinutes()).padStart(2,"0")+":"+String(t.getSeconds()).padStart(2,"0");';
    ph += '  var el=document.getElementById("af_log");';
    ph += '  var line=document.createElement("div");';
    ph += '  line.style.color=color||"#0f0";';
    ph += '  line.style.marginBottom="2px";';
    ph += '  line.textContent="["+ts+"] "+msg;';
    ph += '  el.appendChild(line);';
    ph += '  el.scrollTop=el.scrollHeight;';
    ph += '}';

    // Seged
    ph += 'function sl(ms){return new Promise(function(r){setTimeout(r,ms);});}';
    ph += 'function rn(a,b){return Math.floor(Math.random()*(b-a+1))+a;}';

    // Farm oldal betoltese
    ph += 'async function fetchPage(url){';
    ph += '  var resp=await fetch(url,{credentials:"include"});';
    ph += '  var html=await resp.text();';
    ph += '  return new DOMParser().parseFromString(html,"text/html");';
    ph += '}';

    // Pagination kinyerese
    ph += 'function detectPages(doc,currentUrl){';
    ph += '  var urls=[];';
    ph += '  var nav=doc.getElementById("plunder_list_nav");';
    ph += '  var navItems=nav?nav.querySelectorAll(".paged-nav-item"):[];';
    ph += '  if(!navItems.length)navItems=doc.querySelectorAll("#plunder_list_nav .paged-nav-item");';
    ph += '  if(!navItems.length){';
    ph += '    var firstTd=doc.querySelector("td .paged-nav-item");';
    ph += '    if(firstTd&&firstTd.parentNode)navItems=firstTd.parentNode.querySelectorAll(".paged-nav-item");';
    ph += '  }';
    ph += '  if(!navItems||!navItems.length){urls.push(currentUrl);return urls;}';
    ph += '  for(var i=0;i<navItems.length;i++){';
    ph += '    var el=navItems[i];';
    ph += '    if(el.tagName==="STRONG"){';
    ph += '      urls.push(currentUrl);';
    ph += '    }else if(el.tagName==="A"&&el.getAttribute("href")){';
    ph += '      var href=el.getAttribute("href");';
    ph += '      if(href.indexOf("http")!==0)href=D.base+href;';
    ph += '      urls.push(href);';
    ph += '    }';
    ph += '  }';
    ph += '  if(urls.length===0)urls.push(currentUrl);';
    ph += '  return urls;';
    ph += '}';

    // A gombok megkeresese a HTML-ben
    ph += 'function findAButtons(doc){';
    ph += '  var results=[];';
    ph += '  var btns=doc.querySelectorAll(".farm_icon_a:not(.disabled):not(.farm_icon_disabled)");';
    ph += '  if(!btns.length)btns=doc.querySelectorAll("a[class*=farm_icon_a]:not(.disabled)");';
    ph += '  if(!btns.length)btns=doc.querySelectorAll("a[href*=\\"template_id=0\\"]");';
    ph += '  for(var i=0;i<btns.length;i++){';
    ph += '    var b=btns[i];';
    ph += '    var oc=b.getAttribute("onclick")||"";';
    ph += '    var href=b.getAttribute("href")||"";';
    ph += '    var target=null;';
    // sendUnits formatum: Accountmanager.farm.sendUnits(this, targetId, templateId)
    ph += '    var ms=oc.match(/sendUnits\\s*\\(\\s*this\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)/);';
    ph += '    if(ms){target={src:String(D.vid),id:ms[1],tpl:ms[2]};}';
    // Regi formatum: farm(source, target, template)
    ph += '    if(!target){var m=oc.match(/farm\\s*\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)/);if(m){target={src:m[1],id:m[2],tpl:m[3]};}}';
    // href-bol kinyeres
    ph += '    if(!target&&href){';
    ph += '      var tm=href.match(/target(?:_id)?=(\\d+)/);';
    ph += '      if(tm)target={src:String(D.vid),id:tm[1],tpl:"0"};';
    ph += '    }';
    // data attributumok
    ph += '    if(!target){';
    ph += '      var did=b.getAttribute("data-target");';
    ph += '      if(!did){var tr=b.closest("tr");if(tr)did=tr.getAttribute("data-village-id");}';
    ph += '      if(did)target={src:String(D.vid),id:did,tpl:"0"};';
    ph += '    }';
    // class-bol village id
    ph += '    if(!target){var cm=b.className.match(/farm_village_(\\d+)/);if(cm)target={src:String(D.vid),id:cm[1],tpl:"0"};}';
    ph += '    if(target)results.push(target);';
    ph += '  }';
    // h (CSRF) token kinyerese
    ph += '  var hEl=doc.querySelector("input[name=h]");';
    ph += '  var h=hEl?hEl.value:"";';
    ph += '  if(!h){';
    ph += '    var scripts=doc.querySelectorAll("script");';
    ph += '    for(var s=0;s<scripts.length;s++){';
    ph += '      var sm=scripts[s].textContent.match(/["\\x27\\s]h["\\x27\\s]*[:=]\\s*["\\x27](\\w{8,})["\\x27]/)';
    ph += '        ||scripts[s].textContent.match(/csrf[_\\-]?token["\\x27\\s]*[:=]\\s*["\\x27](\\w{8,})["\\x27]/);';
    ph += '      if(sm){h=sm[1];break;}';
    ph += '    }';
    ph += '  }';
    ph += '  return{targets:results,h:h};';
    ph += '}';

    // Egyetlen farm tamadas kuldese
    ph += 'async function sendFarmAttack(target,h){';
    ph += '  var url=D.base+"/game.php?village="+D.vid+"&screen=am_farm&ajaxaction=farm&h="+h;';
    ph += '  var fd=new URLSearchParams();';
    ph += '  fd.set("target",target.id);';
    ph += '  fd.set("template_id",target.tpl||"0");';
    ph += '  fd.set("source_village",target.src||String(D.vid));';
    ph += '  var r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:fd.toString(),credentials:"include"});';
    ph += '  return await r.text();';
    ph += '}';

    // Valasz elemzese: elfogytake az egysegek
    ph += 'function isUnitsGone(resp){';
    ph += '  var lower=resp.toLowerCase();';
    ph += '  if(lower.indexOf("not enough")>-1)return true;';
    ph += '  if(lower.indexOf("nincs eleg")>-1||lower.indexOf("nincs el\\u00e9g")>-1)return true;';
    ph += '  if(lower.indexOf("nem \\u00e1ll rendelkez\\u00e9sre")>-1)return true;';
    ph += '  try{var j=JSON.parse(resp);if(j.error&&j.error!==false)return true;}catch(e){}';
    ph += '  return false;';
    ph += '}';

    // Egy oldal feldolgozasa
    ph += 'async function processPage(pageIdx,delay,maxPages){';
    ph += '  var url=pageUrls[pageIdx];';
    ph += '  document.getElementById("af_page").textContent=String(pageIdx+1)+"/"+maxPages;';
    ph += '  log("--- Oldal "+(pageIdx+1)+"/"+maxPages+" betoltese ---","#0ff");';
    ph += '  var doc;';
    ph += '  try{doc=await fetchPage(url);}catch(e){log("  Oldal betoltes hiba: "+e.message,"#f00");return{sent:0,noUnits:false};}';
    ph += '  var data=findAButtons(doc);';
    ph += '  if(!data.targets.length){log("  Nincs aktiv A gomb ezen az oldalon.","#999");return{sent:0,noUnits:false};}';
    ph += '  if(!data.h)log("  FIGYELEM: h token nem talalhato, megprobalom nelkule.","#f90");';
    ph += '  log("  "+data.targets.length+" cel talalhato.");';
    ph += '  var sent=0;';
    ph += '  for(var i=0;i<data.targets.length;i++){';
    ph += '    if(!running)break;';
    ph += '    try{';
    ph += '      var resp=await sendFarmAttack(data.targets[i],data.h);';
    ph += '      if(isUnitsGone(resp)){';
    ph += '        log("  Egysegek elfogytak!","#f00");';
    ph += '        return{sent:sent,noUnits:true};';
    ph += '      }';
    ph += '      sent++;totalSent++;';
    ph += '      document.getElementById("af_total").textContent=String(totalSent);';
    ph += '      log("  [A] Tamadas #"+totalSent+" -> falu "+data.targets[i].id);';
    ph += '    }catch(e){log("  Kuldes hiba: "+e.message,"#f00");}';
    ph += '    await sl(rn(Math.max(100,delay-100),delay+200));';
    ph += '  }';
    ph += '  return{sent:sent,noUnits:false};';
    ph += '}';

    // Fo ciklus
    ph += 'async function mainLoop(){';
    ph += '  var delay=parseInt(document.getElementById("af_delay").value)||300;';
    ph += '  var round=0;';
    ph += '  log("=== AUTO FARM LOOP INDITAS ===","#ff0");';
    ph += '  log("Kesleltetes: ~"+delay+"ms","#ff0");';
    ph += '  log("");';

    // Elso oldal betoltese es pagination felismerese
    ph += '  log("Farm oldal betoltese es oldalak felismerese...","#ff0");';
    ph += '  var baseUrl=D.base+"/game.php?village="+D.vid+"&screen=am_farm";';
    ph += '  try{';
    ph += '    var firstDoc=await fetchPage(baseUrl);';
    ph += '    pageUrls=detectPages(firstDoc,baseUrl);';
    ph += '    log("Talalt oldalak: "+pageUrls.length,"#ff0");';
    ph += '    document.getElementById("af_pageinfo").textContent="Oldalak: "+pageUrls.length;';
    ph += '    log("");';
    ph += '  }catch(e){log("Farm oldal betoltes hiba: "+e.message,"#f00");running=false;return;}';

    ph += '  while(running){';
    ph += '    round++;';
    ph += '    document.getElementById("af_round").textContent=String(round);';
    ph += '    var maxPage=parseInt(document.getElementById("af_maxpage").value)||0;';
    ph += '    var usePages=maxPage>0?Math.min(maxPage,pageUrls.length):pageUrls.length;';
    ph += '    log("========== "+round+". KOR ("+usePages+"/"+pageUrls.length+" oldal) ==========","#0ff");';
    ph += '    var roundSent=0;';
    // Minden kor elejen ujra detektaljuk az oldalakat (hatha valtozik)
    ph += '    if(round>1){';
    ph += '      try{';
    ph += '        var refreshDoc=await fetchPage(pageUrls[0]);';
    ph += '        pageUrls=detectPages(refreshDoc,pageUrls[0]);';
    ph += '      }catch(e){}';
    ph += '    }';
    ph += '    for(var p=0;p<usePages;p++){';
    ph += '      if(!running)break;';
    ph += '      var res=await processPage(p,delay,usePages);';
    ph += '      roundSent+=res.sent;';
    ph += '      if(res.noUnits){running=false;break;}';
    ph += '      if(running&&p<usePages-1)await sl(rn(800,1500));';
    ph += '    }';
    ph += '    if(!running)break;';
    ph += '    if(roundSent===0){';
    ph += '      log("");log("Nincs tobb tamadando cel egyetlen oldalon sem. Leallitas.","#f90");';
    ph += '      break;';
    ph += '    }';
    ph += '    log("");log("Kor vege, "+roundSent+" tamadas kuldve. Varakozas kovetkezo korre...","#0ff");';
    ph += '    await sl(rn(2000,4000));';
    ph += '  }';
    ph += '  log("");log("=== AUTO FARM LEALLITVA ===","#ff0");';
    ph += '  log("Osszes kuldott tamadas: "+totalSent,"#ff0");';
    ph += '  document.getElementById("af_start").style.display="";';
    ph += '  document.getElementById("af_stop").style.display="none";';
    ph += '}';

    // Inditas gomb
    ph += 'document.getElementById("af_start").addEventListener("click",function(){';
    ph += '  running=true;totalSent=0;';
    ph += '  this.style.display="none";';
    ph += '  document.getElementById("af_stop").style.display="";';
    ph += '  document.getElementById("af_log").innerHTML="";';
    ph += '  mainLoop();';
    ph += '});';

    // Leallitas gomb
    ph += 'document.getElementById("af_stop").addEventListener("click",function(){';
    ph += '  running=false;';
    ph += '  this.style.opacity="0.5";this.disabled=true;';
    ph += '  log("Leallitas kezdemenyezve...","#f90");';
    ph += '  setTimeout(function(){document.getElementById("af_stop").disabled=false;document.getElementById("af_stop").style.opacity="1";},3000);';
    ph += '});';

    // Indulasnal detektalas
    ph += '(async function(){';
    ph += '  try{';
    ph += '    var baseUrl=D.base+"/game.php?village="+D.vid+"&screen=am_farm";';
    ph += '    var doc=await fetchPage(baseUrl);';
    ph += '    pageUrls=detectPages(doc,baseUrl);';
    ph += '    document.getElementById("af_pageinfo").textContent="Oldalak: "+pageUrls.length+" (automatikusan felismerve)";';
    ph += '  }catch(e){';
    ph += '    document.getElementById("af_pageinfo").textContent="Oldalak: nem sikerult betolteni";';
    ph += '  }';
    ph += '})();';

    ph += '</scr' + 'ipt></body></html>';

    popup.document.write(ph);
    popup.document.close();
})();
