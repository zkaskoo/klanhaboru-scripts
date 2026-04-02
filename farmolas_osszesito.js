// Klanhaboru - Farmolas Osszesito
// Megmutatja falvankent mennyi nyersanyag erkezett be farmalasbol
// Bookmarkletkent vagy console-ban futtasd a jatek oldalan

(function(){
    if(typeof game_data === 'undefined'){
        alert('Nyisd meg a Klanhaboru oldalat!');
        return;
    }

    var baseUrl = window.location.origin;
    var worldSpeed = 1;
    var playerId = game_data.player.id;

    var popup = window.open('', 'farm_osszesito', 'width=850,height=600,top=60,left=60,scrollbars=yes,resizable=yes');
    if(!popup){ alert('Popup blokkolva! Engedelyezd a popupokat!'); return; }

    var D = JSON.stringify({ base: baseUrl, pid: playerId });

    var ph = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Farmolas Osszesito</title></head>';
    ph += '<body style="margin:0;padding:0;font-family:Verdana,Arial,sans-serif;font-size:12px;color:#3e2b0e;">';
    ph += '<div style="background:#f4e4bc;min-height:100vh;">';

    // Header
    ph += '<div style="background:#7d510f;color:#f4e4bc;padding:10px 15px;font-size:15px;font-weight:bold;">';
    ph += 'Farmolas Osszesito';
    ph += '<span style="font-size:11px;font-weight:normal;margin-left:10px;opacity:0.8;">Melyik falvadba mennyi nyersanyag jott be?</span>';
    ph += '</div>';
    ph += '<div style="padding:12px 15px;">';

    // Status
    ph += '<div id="fo_status" style="background:#e8d5a3;border:1px solid #c8a86e;padding:10px 12px;border-radius:4px;margin-bottom:10px;">';
    ph += 'Nyomd meg az <b>Osszesites</b> gombot a farm jelentesek feldolgozasahoz.';
    ph += '</div>';

    // Settings row
    ph += '<div style="margin-bottom:10px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">';
    ph += '<button id="fo_start" style="background:#7d510f;color:#f4e4bc;border:none;padding:8px 25px;font-size:13px;font-weight:bold;cursor:pointer;border-radius:4px;">Osszesites</button>';
    ph += '<button id="fo_stop" style="background:#c0392b;color:#fff;border:none;padding:8px 18px;font-size:12px;font-weight:bold;cursor:pointer;border-radius:4px;display:none;">Stop</button>';
    ph += '<label style="font-size:11px;">Max oldal: <input id="fo_maxpage" type="number" value="50" min="1" max="999" style="width:50px;text-align:center;padding:2px;border:1px solid #b89b6a;background:#fff8ec;font-size:11px;"></label>';
    ph += '</div>';

    // Progress bar
    ph += '<div id="fo_progwrap" style="display:none;margin-bottom:10px;">';
    ph += '<div style="background:#d4bc8a;border-radius:4px;height:14px;overflow:hidden;border:1px solid #c8a86e;">';
    ph += '<div id="fo_bar" style="background:#7d510f;height:100%;width:0%;transition:width 0.3s;"></div>';
    ph += '</div>';
    ph += '<div id="fo_progtxt" style="font-size:10px;color:#888;margin-top:3px;">0%</div>';
    ph += '</div>';

    // Results area
    ph += '<div id="fo_results" style="display:none;"></div>';

    ph += '</div></div>';

    // === SCRIPT ===
    ph += '<scr' + 'ipt>';
    ph += 'var D=' + D + ';';
    ph += 'var running=false;';

    // Fetch page
    ph += 'async function fetchDoc(url){';
    ph += '  var r=await fetch(url,{credentials:"include"});';
    ph += '  var h=await r.text();';
    ph += '  return new DOMParser().parseFromString(h,"text/html");';
    ph += '}';

    // Number format with dot separator
    ph += 'function nf(n){return n.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g,".");}';

    // Sleep
    ph += 'function sl(ms){return new Promise(function(r){setTimeout(r,ms);});}';

    // =====================================================
    // CORE: Parse the report LIST page directly
    // TW farm report list shows: attacker village, defender village, loot
    // We scrape the loot from each individual report
    // =====================================================

    // Get all report links from a report list page
    ph += 'function getReportLinks(doc){';
    ph += '  var links=[];';
    ph += '  var anchors=doc.querySelectorAll("a[href*=\\"view=\\"]");';
    ph += '  for(var i=0;i<anchors.length;i++){';
    ph += '    var h=anchors[i].getAttribute("href");';
    ph += '    if(h&&h.indexOf("screen=report")>-1){';
    ph += '      if(h.indexOf("http")!==0)h=D.base+h;';
    ph += '      links.push(h);';
    ph += '    }';
    ph += '  }';
    // Deduplicate
    ph += '  return links.filter(function(v,i,a){return a.indexOf(v)===i;});';
    ph += '}';

    // Parse ONE report: get attacker village name+coord + loot
    ph += 'async function parseReport(url){';
    ph += '  var doc=await fetchDoc(url);';
    ph += '  var res={attacker:null,coord:null,wood:0,clay:0,iron:0};';

    // --- Find attacker village (our village) ---
    // TW report has table#attack_info_att with village link
    ph += '  var attTd=doc.querySelector("#attack_info_att a[href*=info_village]");';
    ph += '  if(!attTd){';
    // Fallback: first info_village link is usually attacker
    ph += '    var allVlinks=doc.querySelectorAll("a[href*=info_village]");';
    ph += '    if(allVlinks.length>0)attTd=allVlinks[0];';
    ph += '  }';
    ph += '  if(attTd){';
    ph += '    var txt=attTd.textContent.trim();';
    ph += '    res.attacker=txt;';
    ph += '    var cm=txt.match(/\\((\\d+)\\|(\\d+)\\)/);';
    ph += '    if(cm)res.coord=cm[1]+"|"+cm[2];';
    ph += '  }';

    // --- Find loot ---
    // Look for the haul/zsákmány row: has resource icons + numbers
    // The loot is typically in a table row with "Haul:" or "Zsákmány:" label
    // with 3 spans containing wood/clay/iron amounts
    ph += '  var found=false;';

    // Method 1: look for #attack_results or loot table
    ph += '  var lootTds=doc.querySelectorAll("table#attack_results td, .report-loot td");';
    ph += '  if(lootTds.length){';
    ph += '    for(var i=0;i<lootTds.length;i++){';
    ph += '      var spans=lootTds[i].querySelectorAll("span.res, span");';
    ph += '      var nums=[];';
    ph += '      for(var j=0;j<spans.length;j++){';
    ph += '        var v=parseInt(spans[j].textContent.replace(/[^\\d]/g,""));';
    ph += '        if(!isNaN(v))nums.push(v);';
    ph += '      }';
    ph += '      if(nums.length>=3){res.wood=nums[0];res.clay=nums[1];res.iron=nums[2];found=true;break;}';
    ph += '    }';
    ph += '  }';

    // Method 2: walk all TRs, find the one with "Haul" / "Zsákmány" / "Zskmny"
    ph += '  if(!found){';
    ph += '    var trs=doc.querySelectorAll("table.vis tr, table tr");';
    ph += '    for(var i=0;i<trs.length;i++){';
    ph += '      var txt=trs[i].textContent.toLowerCase();';
    ph += '      if(txt.indexOf("haul")>-1||txt.indexOf("zs\\u00e1km\\u00e1ny")>-1||txt.indexOf("zsakm")>-1||txt.indexOf("loot")>-1){';
    ph += '        var nums=trs[i].textContent.match(/[\\d][\\d\\.]*\\d|\\d/g);';
    ph += '        if(nums&&nums.length>=3){';
    ph += '          res.wood=parseInt(nums[0].replace(/\\./g,""))||0;';
    ph += '          res.clay=parseInt(nums[1].replace(/\\./g,""))||0;';
    ph += '          res.iron=parseInt(nums[2].replace(/\\./g,""))||0;';
    ph += '          found=true;';
    ph += '        }';
    ph += '        break;';
    ph += '      }';
    ph += '    }';
    ph += '  }';

    ph += '  return res;';
    ph += '}';

    // Next page link from pagination
    ph += 'function getNextPage(doc){';
    ph += '  var navs=doc.querySelectorAll(".paged-nav-item");';
    ph += '  for(var i=0;i<navs.length;i++){';
    ph += '    if(navs[i].tagName==="STRONG"&&i+1<navs.length&&navs[i+1].tagName==="A"){';
    ph += '      var h=navs[i+1].getAttribute("href");';
    ph += '      if(h&&h.indexOf("http")!==0)h=D.base+h;';
    ph += '      return h;';
    ph += '    }';
    ph += '  }';
    ph += '  return null;';
    ph += '}';

    // =====================================================
    // MAIN: process all report pages
    // =====================================================
    ph += 'async function run(){';
    ph += '  var maxPages=parseInt(document.getElementById("fo_maxpage").value)||50;';
    ph += '  var villages={};'; // key=coord, val={name,coord,wood,clay,iron,count}
    ph += '  var totalReports=0,processedPages=0;';

    // Start at farm reports
    ph += '  var url=D.base+"/game.php?screen=report&mode=farm";';
    ph += '  document.getElementById("fo_progwrap").style.display="block";';

    ph += '  while(running&&processedPages<maxPages){';
    ph += '    processedPages++;';
    ph += '    var pct=Math.round(processedPages/maxPages*100);';
    ph += '    document.getElementById("fo_bar").style.width=pct+"%";';
    ph += '    document.getElementById("fo_progtxt").textContent="Oldal "+processedPages+"/"+maxPages+" ("+totalReports+" jelentes feldolgozva)";';
    ph += '    document.getElementById("fo_status").innerHTML="Betoltes... oldal <b>"+processedPages+"</b> / "+maxPages;';

    ph += '    var doc;';
    ph += '    try{doc=await fetchDoc(url);}catch(e){break;}';

    ph += '    var links=getReportLinks(doc);';
    ph += '    if(!links.length)break;';

    // Process each report on this page
    ph += '    for(var i=0;i<links.length;i++){';
    ph += '      if(!running)break;';
    ph += '      try{';
    ph += '        var r=await parseReport(links[i]);';
    ph += '        if(r.coord&&(r.wood>0||r.clay>0||r.iron>0)){';
    ph += '          if(!villages[r.coord])villages[r.coord]={name:r.attacker||r.coord,coord:r.coord,wood:0,clay:0,iron:0,count:0};';
    ph += '          villages[r.coord].wood+=r.wood;';
    ph += '          villages[r.coord].clay+=r.clay;';
    ph += '          villages[r.coord].iron+=r.iron;';
    ph += '          villages[r.coord].count++;';
    ph += '          totalReports++;';
    ph += '        }';
    ph += '      }catch(e){}';
    ph += '      await sl(120);';
    ph += '    }';

    // Next page
    ph += '    var next=getNextPage(doc);';
    ph += '    if(!next)break;';
    ph += '    url=next;';
    ph += '    await sl(200);';
    ph += '  }';

    // Done - render results
    ph += '  document.getElementById("fo_progwrap").style.display="none";';
    ph += '  renderResults(villages,totalReports);';
    ph += '}';

    // =====================================================
    // RENDER results
    // =====================================================
    ph += 'function renderResults(villages,totalReports){';
    ph += '  var data=Object.values(villages);';
    ph += '  if(!data.length){';
    ph += '    document.getElementById("fo_status").innerHTML="<span style=\\"color:#c0392b;\\">Nem talaltam farm jelentest nyersanyaggal.</span>";';
    ph += '    document.getElementById("fo_results").style.display="none";';
    ph += '    return;';
    ph += '  }';

    // Sort by total descending
    ph += '  data.sort(function(a,b){return(b.wood+b.clay+b.iron)-(a.wood+a.clay+a.iron);});';

    // Totals
    ph += '  var tW=0,tC=0,tI=0,tN=0;';
    ph += '  for(var i=0;i<data.length;i++){tW+=data[i].wood;tC+=data[i].clay;tI+=data[i].iron;tN+=data[i].count;}';
    ph += '  var tAll=tW+tC+tI;';

    ph += '  document.getElementById("fo_status").innerHTML="Kesz! <b>"+totalReports+"</b> jelentes feldolgozva, <b>"+data.length+"</b> falvadbol erkezett nyersanyag.";';

    // Build HTML
    ph += '  var h="";';

    // Summary cards
    ph += '  h+="<div style=\\"display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;\\">";';
    ph += '  var cards=[{l:\\"Osszes\\",v:nf(tAll),c:\\"#7d510f\\"},{l:\\"Fa\\",v:nf(tW),c:\\"#5a8a2a\\"},{l:\\"Agyag\\",v:nf(tC),c:\\"#b85c1f\\"},{l:\\"Vas\\",v:nf(tI),c:\\"#666\\"},{l:\\"Jelentesek\\",v:nf(tN),c:\\"#2a6a8a\\"},{l:\\"Falvak\\",v:data.length,c:\\"#8a2a6a\\"}];';
    ph += '  for(var c=0;c<cards.length;c++){';
    ph += '    h+="<div style=\\"background:#e8d5a3;border:1px solid #c8a86e;border-top:3px solid "+cards[c].c+";padding:8px 14px;border-radius:0 0 4px 4px;min-width:90px;text-align:center;\\">";';
    ph += '    h+="<div style=\\"font-size:10px;color:#888;\\">"+cards[c].l+"</div>";';
    ph += '    h+="<div style=\\"font-size:16px;font-weight:bold;color:"+cards[c].c+"\\">"+cards[c].v+"</div></div>";';
    ph += '  }';
    ph += '  h+="</div>";';

    // Table
    ph += '  h+="<table border=1 cellpadding=5 cellspacing=0 style=\\"border-collapse:collapse;width:100%;font-size:12px;\\">";';
    ph += '  h+="<tr style=\\"background:#7d510f;color:#f4e4bc;font-weight:bold;\\">";';
    ph += '  h+="<td style=\\"padding:6px;\\">#</td>";';
    ph += '  h+="<td style=\\"padding:6px;\\">Falvad</td>";';
    ph += '  h+="<td style=\\"padding:6px;\\">Koord</td>";';
    ph += '  h+="<td style=\\"padding:6px;text-align:right;\\">Fa</td>";';
    ph += '  h+="<td style=\\"padding:6px;text-align:right;\\">Agyag</td>";';
    ph += '  h+="<td style=\\"padding:6px;text-align:right;\\">Vas</td>";';
    ph += '  h+="<td style=\\"padding:6px;text-align:right;\\">Osszes</td>";';
    ph += '  h+="<td style=\\"padding:6px;text-align:right;\\">Tam.</td>";';
    ph += '  h+="<td style=\\"padding:6px;text-align:right;\\">Atl/tam</td>";';
    ph += '  h+="</tr>";';

    ph += '  for(var i=0;i<data.length;i++){';
    ph += '    var r=data[i],tot=r.wood+r.clay+r.iron,avg=r.count?Math.round(tot/r.count):0;';
    ph += '    var bg=i%2===0?"#fff8ec":"#e8d5a3";';
    ph += '    h+="<tr style=\\"background:"+bg+"\\">";';
    ph += '    h+="<td style=\\"padding:4px 6px;\\">"+(i+1)+"</td>";';
    ph += '    h+="<td style=\\"padding:4px 6px;font-weight:bold;\\">"+r.name+"</td>";';
    ph += '    h+="<td style=\\"padding:4px 6px;\\">"+r.coord+"</td>";';
    ph += '    h+="<td style=\\"padding:4px 6px;text-align:right;color:#5a8a2a;\\">"+nf(r.wood)+"</td>";';
    ph += '    h+="<td style=\\"padding:4px 6px;text-align:right;color:#b85c1f;\\">"+nf(r.clay)+"</td>";';
    ph += '    h+="<td style=\\"padding:4px 6px;text-align:right;color:#666;\\">"+nf(r.iron)+"</td>";';
    ph += '    h+="<td style=\\"padding:4px 6px;text-align:right;font-weight:bold;\\">"+nf(tot)+"</td>";';
    ph += '    h+="<td style=\\"padding:4px 6px;text-align:right;\\">"+r.count+"</td>";';
    ph += '    h+="<td style=\\"padding:4px 6px;text-align:right;color:#888;\\">"+nf(avg)+"</td>";';
    ph += '    h+="</tr>";';
    ph += '  }';

    // Total row
    ph += '  h+="<tr style=\\"background:#7d510f;color:#f4e4bc;font-weight:bold;\\">";';
    ph += '  h+="<td colspan=3 style=\\"padding:6px;\\">OSSZESEN ("+data.length+" falu)</td>";';
    ph += '  h+="<td style=\\"padding:6px;text-align:right;\\">"+nf(tW)+"</td>";';
    ph += '  h+="<td style=\\"padding:6px;text-align:right;\\">"+nf(tC)+"</td>";';
    ph += '  h+="<td style=\\"padding:6px;text-align:right;\\">"+nf(tI)+"</td>";';
    ph += '  h+="<td style=\\"padding:6px;text-align:right;\\">"+nf(tAll)+"</td>";';
    ph += '  h+="<td style=\\"padding:6px;text-align:right;\\">"+tN+"</td>";';
    ph += '  h+="<td style=\\"padding:6px;text-align:right;\\">"+nf(tN?Math.round(tAll/tN):0)+"</td>";';
    ph += '  h+="</tr></table>";';

    // BB-code copy button
    ph += '  h+="<div style=\\"margin-top:10px;\\"><button id=\\"fo_copy\\" style=\\"background:#2d7d0f;color:#fff;border:none;padding:6px 18px;font-size:11px;cursor:pointer;border-radius:3px;\\">Masolas BB-code</button></div>";';

    ph += '  var el=document.getElementById("fo_results");';
    ph += '  el.innerHTML=h;';
    ph += '  el.style.display="block";';

    // BB-code copy handler
    ph += '  document.getElementById("fo_copy").addEventListener("click",function(){';
    ph += '    var bb="[b]Farmolas osszesito - Falvankenti nyersanyag bevetel[/b]\\n\\n[table]\\n";';
    ph += '    bb+="[**]#[||]Falu[||]Koord[||]Fa[||]Agyag[||]Vas[||]Osszes[||]Tam[/**]\\n";';
    ph += '    for(var i=0;i<data.length;i++){var r=data[i];bb+="[*]"+(i+1)+"[|]"+r.name+"[|][coord]"+r.coord+"[/coord][|]"+nf(r.wood)+"[|]"+nf(r.clay)+"[|]"+nf(r.iron)+"[|]"+nf(r.wood+r.clay+r.iron)+"[|]"+r.count+"[/*]\\n";}';
    ph += '    bb+="[**]OSSZ[||]"+data.length+" falu[||]-[||]"+nf(tW)+"[||]"+nf(tC)+"[||]"+nf(tI)+"[||]"+nf(tAll)+"[||]"+tN+"[/**]\\n[/table]";';
    ph += '    navigator.clipboard.writeText(bb).then(function(){';
    ph += '      var b=document.getElementById("fo_copy");b.textContent="Masolva!";b.style.background="#0a5";';
    ph += '      setTimeout(function(){b.textContent="Masolas BB-code";b.style.background="#2d7d0f";},2000);';
    ph += '    });';
    ph += '  });';
    ph += '}';

    // =====================================================
    // EVENT LISTENERS
    // =====================================================
    ph += 'document.getElementById("fo_start").addEventListener("click",function(){';
    ph += '  running=true;this.style.display="none";';
    ph += '  document.getElementById("fo_stop").style.display="";';
    ph += '  document.getElementById("fo_results").style.display="none";';
    ph += '  run().then(function(){';
    ph += '    running=false;';
    ph += '    document.getElementById("fo_start").style.display="";';
    ph += '    document.getElementById("fo_stop").style.display="none";';
    ph += '  });';
    ph += '});';
    ph += 'document.getElementById("fo_stop").addEventListener("click",function(){running=false;});';

    ph += '</scr' + 'ipt></body></html>';

    popup.document.write(ph);
    popup.document.close();
})();
