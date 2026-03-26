// Klanhaboru - Tamadas Idozito v2
// Popup ablak + visszaszamlalo + automatikus tamadas kuldes
// MessageChannel alapu timer - hatterben is pontos marad

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

    var imgBase = '';
    try { var testImg = document.querySelector('img[src*="unit_"]'); if(testImg) imgBase = testImg.src.replace(/unit_\w+\.png.*$/, ''); } catch(e){}

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
        var popup = window.open('', 'tamadas_idozito', 'width=780,height=480,top=80,left=80,scrollbars=yes,resizable=yes');
        if(!popup){ alert('Popup blokkolva! Engedelyezd a popupokat!'); return; }

        var D = JSON.stringify({sx:sx,sy:sy,vid:villageId,base:baseUrl,ws:configData.ws,us:configData.us,eg:egysegek,mn:mn,as:as,av:availTroops,img:imgBase});

        var ph = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Tamadas Idozito</title></head>';
        ph += '<body style="margin:0;padding:0;font-family:Verdana,Arial,sans-serif;font-size:12px;color:#3e2b0e;">';
        ph += '<div id="ti_ui" style="background:#f4e4bc;min-height:100vh;">';

        // Header
        ph += '<div style="background:#7d510f;color:#f4e4bc;padding:8px 15px;font-size:14px;font-weight:bold;">Tamadas Idozito</div>';
        ph += '<div style="padding:12px 15px;">';

        // Honnan / Hova
        ph += '<div style="margin-bottom:10px;display:flex;align-items:center;gap:15px;flex-wrap:wrap;">';
        ph += '<span>Honnan: <b>' + sx + '|' + sy + '</b></span>';
        ph += '<span>Cel: <input id="ti_x" type="number" style="width:55px;text-align:center;padding:2px;border:1px solid #b89b6a;background:#fff8ec;" placeholder="x"> | ';
        ph += '<input id="ti_y" type="number" style="width:55px;text-align:center;padding:2px;border:1px solid #b89b6a;background:#fff8ec;" placeholder="y"></span>';
        ph += '</div>';

        // Egyseg tabla
        ph += '<div style="overflow-x:auto;margin-bottom:10px;border:1px solid #c8a86e;border-radius:4px;background:#e8d5a3;">';
        ph += '<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;">';

        // Ikonok sor
        ph += '<tr style="background:#d4bc8a;">';
        for(var i = 0; i < egysegek.length; i++){
            var u = egysegek[i];
            var img = imgBase ? '<img src="' + imgBase + 'unit_' + u + '.png" title="' + (mn[u]||u) + '" style="width:18px;height:18px;">' : '<span style="font-size:9px;" title="' + (mn[u]||u) + '">' + u.substring(0,3) + '</span>';
            ph += '<td style="text-align:center;padding:4px 2px;border-right:1px solid #c8a86e;">' + img + '</td>';
        }
        ph += '</tr>';

        // Input sor
        ph += '<tr>';
        for(var i = 0; i < egysegek.length; i++){
            ph += '<td style="text-align:center;padding:3px 1px;border-right:1px solid #c8a86e;">';
            ph += '<input id="ti_u_' + egysegek[i] + '" type="number" min="0" value="" style="width:38px;text-align:center;font-size:11px;padding:2px;border:1px solid #b89b6a;background:#fff8ec;" placeholder="0">';
            ph += '</td>';
        }
        ph += '</tr>';

        // Elerheto sor
        ph += '<tr style="background:#d4bc8a;">';
        for(var i = 0; i < egysegek.length; i++){
            var u = egysegek[i];
            var av = availTroops[u] || 0;
            ph += '<td style="text-align:center;padding:2px;border-right:1px solid #c8a86e;font-size:10px;">';
            ph += '<a href="#" class="ti_fill" data-unit="' + u + '" data-max="' + av + '" style="color:#555;text-decoration:underline;cursor:pointer;" title="Kattints az osszeshez">(' + av + ')</a>';
            ph += '</td>';
        }
        ph += '</tr></table></div>';

        // Info sav
        ph += '<div style="background:#e8d5a3;border:1px solid #c8a86e;padding:8px 10px;border-radius:4px;margin-bottom:10px;display:flex;gap:20px;flex-wrap:wrap;">';
        ph += '<div>Leglassabb: <b id="ti_slow">-</b></div>';
        ph += '<div>Menetido: <b id="ti_travel">--:--:--</b></div>';
        ph += '<div>Legkorabbi: <b id="ti_earliest">--:--:--</b></div>';
        ph += '</div>';

        // Erkezes + inditas
        ph += '<div style="margin-bottom:12px;display:flex;align-items:center;gap:15px;flex-wrap:wrap;">';
        ph += '<div>Erkezes: <input id="ti_arr_date" type="date" style="width:130px;font-size:12px;padding:3px;border:1px solid #b89b6a;background:#fff8ec;"> ';
        ph += '<input id="ti_arr" type="text" placeholder="oo:pp:mm:ezred" style="width:120px;text-align:center;font-size:12px;padding:3px;border:1px solid #b89b6a;background:#fff8ec;"></div>';
        ph += '<div id="ti_launch" style="color:#666;">Inditas: --:--:--</div>';
        ph += '</div>';

        // Gombok
        ph += '<div style="text-align:center;padding-top:8px;border-top:1px solid #c8a86e;">';
        ph += '<button id="ti_go" style="background:#7d510f;color:#f4e4bc;border:none;padding:8px 30px;font-size:13px;font-weight:bold;cursor:pointer;border-radius:4px;margin-right:10px;">Idozites + Auto Kuldes</button>';
        ph += '<button id="ti_no" style="background:#888;color:#fff;border:none;padding:8px 20px;font-size:13px;cursor:pointer;border-radius:4px;">Megse</button>';
        ph += '</div>';

        ph += '</div></div>';

        // Visszaszamlalo nezet
        ph += '<div id="ti_cd" style="display:none;padding:20px;background:#1a1a1a;color:#0f0;font-family:Consolas,monospace;font-size:14px;min-height:100vh;">';
        ph += '<div id="ti_st">Betoltes...</div>';
        ph += '<div id="ti_log" style="margin-top:15px;font-size:11px;max-height:200px;overflow-y:auto;"></div>';
        ph += '</div>';

        // === SCRIPT ===
        ph += '<scr' + 'ipt>';
        ph += 'var D=' + D + ';';

        // MessageChannel alapu sleep
        ph += 'function sl(ms){return new Promise(function(r){var s=performance.now();var ch=new MessageChannel();ch.port1.onmessage=function(){if(performance.now()-s>=ms){r();}else{ch.port2.postMessage("");}};ch.port2.postMessage("");});}';
        ph += 'function rn(a,b){return Math.floor(Math.random()*(b-a+1))+a;}';

        // Seged
        ph += 'function fmt(s){var d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60),sc=s%60;var r=String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(sc).padStart(2,"0");if(d>0)r=d+"nap "+r;return r;}';
        ph += 'function fmtDate(dt){return dt.getFullYear()+"."+String(dt.getMonth()+1).padStart(2,"0")+"."+String(dt.getDate()).padStart(2,"0")+". "+String(dt.getHours()).padStart(2,"0")+":"+String(dt.getMinutes()).padStart(2,"0")+":"+String(dt.getSeconds()).padStart(2,"0")+":"+String(dt.getMilliseconds()).padStart(3,"0");}';

        // Log a visszaszamlalo nezetben
        ph += 'function log(msg,color){var el=document.getElementById("ti_log");var t=new Date();var ts=String(t.getHours()).padStart(2,"0")+":"+String(t.getMinutes()).padStart(2,"0")+":"+String(t.getSeconds()).padStart(2,"0")+":"+String(t.getMilliseconds()).padStart(3,"0");var line=document.createElement("div");line.style.color=color||"#0f0";line.textContent="["+ts+"] "+msg;el.appendChild(line);el.scrollTop=el.scrollHeight;}';

        // Koordinata / egyseg inputok
        ph += 'var aX=document.getElementById("ti_x"),aY=document.getElementById("ti_y"),aA=document.getElementById("ti_arr"),aD=document.getElementById("ti_arr_date");';
        // Mai datum kitoltese
        ph += '(function(){var n=new Date();aD.value=n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-"+String(n.getDate()).padStart(2,"0");})();';

        // Szamitas
        ph += 'function gc(){var cx=parseInt(aX.value),cy=parseInt(aY.value);if(isNaN(cx)||isNaN(cy))return null;var ms=0,lg=null;for(var i=0;i<D.eg.length;i++){var u=D.eg[i],c=parseInt(document.getElementById("ti_u_"+u).value)||0;if(c>0&&D.as[u]>ms){ms=D.as[u];lg=u;}}if(!lg)return null;var d=Math.sqrt(Math.pow(cx-D.sx,2)+Math.pow(cy-D.sy,2));return{ut:Math.round((d*ms)/(D.ws*D.us)*60),lg:lg};}';

        // UI frissites
        ph += 'function rc(){var r=gc();if(!r){document.getElementById("ti_slow").textContent="-";document.getElementById("ti_travel").textContent="--:--:--";document.getElementById("ti_earliest").textContent="--:--:--";document.getElementById("ti_launch").textContent="Inditas: --:--:--";return;}document.getElementById("ti_slow").textContent=D.mn[r.lg]||r.lg;document.getElementById("ti_travel").textContent=fmt(r.ut);var e=new Date(Date.now()+r.ut*1000);document.getElementById("ti_earliest").textContent=fmtDate(e);cl(r.ut);}';

        // Inditas ido szamitas - datummal
        ph += 'function cl(ut){if(ut===undefined){var r=gc();if(!r)return;ut=r.ut;}var erk=aA.value.trim();if(!erk){document.getElementById("ti_launch").textContent="Inditas: --:--:--:---";return;}if(erk.toLowerCase()==="most"){document.getElementById("ti_launch").textContent="Inditas: AZONNAL (3mp)";return;}var ep=erk.split(":").map(Number);if(ep.length<2||isNaN(ep[0])||isNaN(ep[1])){document.getElementById("ti_launch").textContent="Inditas: --:--:--:---";return;}';
        // Datum parse - ms tamogatassal
        ph += 'var ds=aD.value;var erkDate;var erkMs=ep[3]||0;if(ds){var dp=ds.split("-").map(Number);erkDate=new Date(dp[0],dp[1]-1,dp[2],ep[0],ep[1],ep[2]||0,erkMs);}else{erkDate=new Date();erkDate.setHours(ep[0],ep[1],ep[2]||0,erkMs);if(erkDate.getTime()<=Date.now())erkDate.setDate(erkDate.getDate()+1);}';
        ph += 'var iDate=new Date(erkDate.getTime()-ut*1000);document.getElementById("ti_launch").textContent="Inditas: "+fmtDate(iDate);}';

        // Legkorabbi ido frissites masodpercenkent (MessageChannel alapu)
        ph += '(function tick(){sl(1000).then(function(){var r=gc();if(r){var e=new Date(Date.now()+r.ut*1000);document.getElementById("ti_earliest").textContent=fmtDate(e);}tick();});})();';

        // Event listenerek
        ph += 'aX.addEventListener("input",rc);aY.addEventListener("input",rc);aA.addEventListener("input",function(){cl();});aD.addEventListener("input",function(){cl();});';
        ph += 'for(var i=0;i<D.eg.length;i++){document.getElementById("ti_u_"+D.eg[i]).addEventListener("input",rc);}';

        // Fill linkek
        ph += 'var fl=document.querySelectorAll(".ti_fill");for(var i=0;i<fl.length;i++){fl[i].addEventListener("click",function(e){e.preventDefault();document.getElementById("ti_u_"+this.getAttribute("data-unit")).value=this.getAttribute("data-max");rc();});}';

        // Megse gomb
        ph += 'document.getElementById("ti_no").addEventListener("click",function(){window.close();});';

        // === FO GOMB: Idozites + Auto Kuldes ===
        ph += 'document.getElementById("ti_go").addEventListener("click",function(){';
        ph += 'var cx=parseInt(aX.value),cy=parseInt(aY.value);if(isNaN(cx)||isNaN(cy)){alert("Add meg a cel koordinatakat!");return;}';
        ph += 'var cs={},lg=null,ms=0;for(var i=0;i<D.eg.length;i++){var u=D.eg[i],c=parseInt(document.getElementById("ti_u_"+u).value)||0;if(c>0){cs[u]=c;if(D.as[u]>ms){ms=D.as[u];lg=u;}}}';
        ph += 'if(!lg){alert("Adj meg legalabb egy egyseget!");return;}';
        ph += 'var erk=aA.value.trim();if(!erk){alert("Add meg az erkezesi idot!");return;}';

        // Tavolsag es menetido szamitas
        ph += 'var dist=Math.sqrt(Math.pow(cx-D.sx,2)+Math.pow(cy-D.sy,2));var ut=Math.round((dist*ms)/(D.ws*D.us)*60);';

        ph += 'var iDate;if(erk.toLowerCase()==="most"){iDate=new Date(Date.now()+3000);}else{var ep=erk.split(":").map(Number);var erkMs=ep[3]||0;var ds=document.getElementById("ti_arr_date").value;var erkDate;if(ds){var dp=ds.split("-").map(Number);erkDate=new Date(dp[0],dp[1]-1,dp[2],ep[0],ep[1],ep[2]||0,erkMs);}else{erkDate=new Date();erkDate.setHours(ep[0],ep[1],ep[2]||0,erkMs);if(erkDate.getTime()<=Date.now())erkDate.setDate(erkDate.getDate()+1);}iDate=new Date(erkDate.getTime()-ut*1000);}';

        ph += 'var iStr=iDate.getFullYear()+"."+String(iDate.getMonth()+1).padStart(2,"0")+"."+String(iDate.getDate()).padStart(2,"0")+". "+String(iDate.getHours()).padStart(2,"0")+":"+String(iDate.getMinutes()).padStart(2,"0")+":"+String(iDate.getSeconds()).padStart(2,"0");';
        ph += 'var wMs=iDate.getTime()-Date.now();var wD=Math.floor(wMs/86400000);var wH=Math.floor((wMs%86400000)/3600000);var wM=Math.floor((wMs%3600000)/60000);var wP=(wD>0?wD+"nap ":"")+wH+"ora "+wM+"perc";';

        // Confirmation
        ph += 'var cL="";for(var eg in cs)cL+="  "+(D.mn[eg]||eg)+": "+cs[eg]+"\\n";';
        ph += 'if(!confirm("=== TAMADAS IDOZITO ===\\n\\nCel: "+cx+"|"+cy+"\\nCsapatok:\\n"+cL+"Menetido: "+fmt(ut)+"\\nInditas: "+iStr+"\\nVarakozas: ~"+wP+"\\n\\nOK = Idozites indul | Cancel = Megse"))return;';

        // Atvaltas visszaszamlalo nezetre
        ph += 'document.getElementById("ti_ui").style.display="none";document.getElementById("ti_cd").style.display="block";';
        ph += 'var st=document.getElementById("ti_st"),iT=iDate.getTime();';

        // Valtozok
        ph += 'var cancelled=false;';
        ph += 'var preparedData=null,prepErr=null;';

        // Elore felkeszites fuggveny
        ph += 'async function prepareAttack(cx,cy,cs){';
        ph += '  var pUrl=D.base+"/game.php?village="+D.vid+"&screen=place";';
        ph += '  log("Elokeszites: Rally point betoltese...");';
        ph += '  var pR=await fetch(pUrl,{credentials:"include"});var pH=await pR.text();';
        ph += '  var doc=new DOMParser().parseFromString(pH,"text/html");';
        ph += '  var frm=doc.querySelector("#command-data-form");if(!frm)throw new Error("Rally point form nem talalhato!");';
        ph += '  var hid=frm.querySelectorAll("input[type=hidden]");var cn="",cv="";';
        ph += '  for(var i=0;i<hid.length;i++){var n=hid[i].name;if(n!=="template_id"&&n!=="source_village"){cn=n;cv=hid[i].value;break;}}';
        ph += '  if(!cn)throw new Error("CSRF token nem talalhato!");';
        ph += '  log("CSRF token: "+cn.substring(0,4)+"...");';

        ph += '  var pd=new URLSearchParams();pd.set(cn,cv);pd.set("template_id","");pd.set("source_village",String(D.vid));';
        ph += '  for(var u in cs)pd.set(u,String(cs[u]));';
        ph += '  pd.set("x",String(cx));pd.set("y",String(cy));pd.set("input",cx+"|"+cy);pd.set("target_type","coord");pd.set("attack","Tamadas");';
        ph += '  log("Elokeszites: Confirm kuldes...");';
        ph += '  var cR=await fetch(pUrl+"&try=confirm",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:pd.toString(),credentials:"include"});';
        ph += '  var cH=await cR.text();';
        ph += '  var d2=new DOMParser().parseFromString(cH,"text/html");';
        ph += '  var ch=d2.querySelector("input[name=ch]");if(!ch){var eD=d2.querySelector(".error_box");throw new Error(eD?eD.textContent.trim():"Confirm hiba");}';
        ph += '  var f2=d2.querySelector("#command-data-form")||d2.querySelector("form");if(!f2)throw new Error("Confirm form nem talalhato!");';

        ph += '  var aI=f2.querySelectorAll("input");';
        ph += '  var cd=new URLSearchParams();for(var j=0;j<aI.length;j++){var inp=aI[j];if(!inp.name)continue;if(inp.type==="submit"&&inp.name!=="submit_confirm")continue;cd.set(inp.name,inp.value);}';
        ph += '  var fA=f2.getAttribute("action")||"";var cU=(fA&&fA.indexOf("game.php")>-1)?D.base+fA:pUrl+"&action=command";';

        ph += '  log("KESZ - rally point + confirm elokeszitve!","#0f0");';
        ph += '  return{url:cU,body:cd.toString(),ref:pUrl+"&try=confirm"};';
        ph += '}';

        // AZONNAL elinditjuk az elokesztest (nem varunk T-5mp-re)
        ph += 'prepareAttack(cx,cy,cs).then(function(d){preparedData=d;}).catch(function(e){prepErr=e.message;log("Elokeszites HIBA: "+e.message,"#f00");});';

        // Visszaszamlalo loop - csak UI + varakozas T=0-ra
        ph += 'async function countdown(cx,cy,cs,iStr,iT){';
        ph += '  var st=document.getElementById("ti_st");';

        ph += '  while(!cancelled){';
        ph += '    var mr=iT-Date.now();';

        // T=0: azonnali kuldes
        ph += '    if(mr<=0){';
        ph += '      if(prepErr){st.innerHTML="<div style=\\"text-align:center\\"><div style=\\"font-size:18px;font-weight:bold;color:#f00\\">HIBA</div><div style=\\"margin-top:10px\\">"+prepErr+"</div><div style=\\"margin-top:15px;color:#999\\">Probald kezzel!</div></div>";return;}';
        ph += '      if(!preparedData){log("Elokeszites meg folyamatban...","#f90");await sl(50);continue;}';
        ph += '      log(">>> TAMADAS KULDES MOST <<<","#ff0");';
        ph += '      st.innerHTML="<div style=\\"text-align:center\\"><div style=\\"font-size:18px;font-weight:bold;color:#ff0\\">TAMADAS KULDESE...</div></div>";';
        ph += '      try{';
        ph += '        var cmR=await fetch(preparedData.url,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:preparedData.body,credentials:"include",referrer:preparedData.ref});';
        ph += '        var cmH=await cmR.text();var d3=new DOMParser().parseFromString(cmH,"text/html");';
        ph += '        var eB=d3.querySelector(".error_box");if(eB)throw new Error(eB.textContent.trim());';
        ph += '        log("TAMADAS SIKERESEN ELINDULT!","#0f0");';
        ph += '        st.innerHTML="<div style=\\"text-align:center\\"><div style=\\"font-size:22px;font-weight:bold;color:#0f0;margin-bottom:15px\\">TAMADAS ELINDULT!</div><div style=\\"margin-bottom:10px\\">Cel: "+cx+"|"+cy+"</div><div style=\\"color:#999\\">Ez az ablak 60mp mulva bezarul.</div></div>";';
        ph += '        await sl(60000);window.close();';
        ph += '      }catch(err){';
        ph += '        log("HIBA: "+err.message,"#f00");';
        ph += '        st.innerHTML="<div style=\\"text-align:center\\"><div style=\\"font-size:18px;font-weight:bold;color:#f00\\">HIBA</div><div style=\\"margin-top:10px\\">"+err.message+"</div><div style=\\"margin-top:15px;color:#999\\">Probald kezzel!</div></div>";';
        ph += '      }';
        ph += '      return;';
        ph += '    }';

        // UI frissites
        ph += '    var dd=Math.floor(mr/86400000),h=Math.floor((mr%86400000)/3600000),m=Math.floor((mr%3600000)/60000),s=Math.floor((mr%60000)/1000);';
        ph += '    var cdStr=(dd>0?dd+"nap ":"")+String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");';
        ph += '    var prepStatus=preparedData?"<span style=\\"color:#0f0\\">Elokeszitve - kesz!</span>":prepErr?"<span style=\\"color:#f00\\">Hiba: "+prepErr+"</span>":"<span style=\\"color:#ff0\\">Elokeszites folyamatban...</span>";';
        ph += '    st.innerHTML="<div style=\\"text-align:center\\"><div style=\\"font-size:16px;font-weight:bold;color:#ff0;margin-bottom:15px\\">TAMADAS IDOZITO</div><div style=\\"margin-bottom:10px\\">Cel: "+cx+"|"+cy+"</div><div style=\\"margin-bottom:10px\\">Inditas: "+iStr+"</div><div style=\\"font-size:42px;font-weight:bold;color:#0ff;margin:20px 0\\">"+cdStr+"</div><div style=\\"margin-bottom:8px\\">"+prepStatus+"</div><div style=\\"margin-bottom:15px;color:#999\\">A tamadas automatikusan elindul.<br>Az ablak hatterben is mukodik.</div><button id=\\"ti_cancel\\" style=\\"background:#c0392b;color:#fff;border:none;padding:8px 25px;font-size:13px;cursor:pointer;border-radius:4px;\\">Megse</button></div>";';
        ph += '    var cb=document.getElementById("ti_cancel");if(cb)cb.onclick=function(){cancelled=true;st.innerHTML="<div style=\\"text-align:center;color:#f90;font-size:16px;margin-top:30px\\">Visszavonva.</div>";};';
        ph += '    await sl(200);';
        ph += '  }';
        ph += '}';

        ph += 'countdown(cx,cy,cs,iStr,iT);';
        ph += '});';

        ph += '</scr' + 'ipt></body></html>';

        popup.document.write(ph);
        popup.document.close();
    }
})();
