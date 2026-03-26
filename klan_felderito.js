// Klanhaboru - Klan Felderito Script
// Console-ban futtasd a jatek oldalan (F12 -> Console)

(function(){
    if(typeof game_data === 'undefined'){
        alert('Nyisd meg a Klanhaboru oldalat!');
        return;
    }

    var sx = game_data.village.x;
    var sy = game_data.village.y;

    var kozpont = prompt('Kozponti koordinata (alapbol a falud: ' + sx + '|' + sy + ')\nHagyd uresen a sajatodhoz, vagy irj mast (pl. 500|499):');
    var kx, ky;
    if(!kozpont || kozpont.trim() === ''){
        kx = sx;
        ky = sy;
    } else {
        var kp = kozpont.split('|').map(Number);
        kx = kp[0];
        ky = kp[1];
    }

    var klanNev = prompt('Klan neve vagy tag-je:');
    if(!klanNev) return;
    klanNev = klanNev.trim();

    var sugar = prompt('Sugar (mezoben, pl. 20):');
    if(!sugar) return;
    sugar = parseFloat(sugar);

    console.log('Adatok betoltese...');

    // Mind a 3 fajl lekerese
    $.get('/map/ally.txt', function(allyData){
        $.get('/map/player.txt', function(playerData){
            $.get('/map/village.txt', function(villageData){

                // Klan keresese nev vagy tag alapjan
                var allyLines = allyData.split('\n');
                var klanId = null;
                var klanInfo = null;
                var klanNevLower = klanNev.toLowerCase();

                for(var i = 0; i < allyLines.length; i++){
                    var line = allyLines[i].trim();
                    if(!line) continue;
                    var parts = line.split(',');
                    var aId = parts[0];
                    var aName = decodeURIComponent(parts[1].replace(/\+/g, ' '));
                    var aTag = decodeURIComponent(parts[2].replace(/\+/g, ' '));

                    if(aName.toLowerCase() === klanNevLower || aTag.toLowerCase() === klanNevLower){
                        klanId = aId;
                        klanInfo = {
                            nev: aName,
                            tag: aTag,
                            tagok: parts[3],
                            falvak: parts[4],
                            pontok: parts[5]
                        };
                        break;
                    }
                }

                if(!klanId){
                    alert('Nem talaltam klant ezzel a nevvel/taggel: ' + klanNev);
                    return;
                }

                console.log('Klan megtalalva: ' + klanInfo.nev + ' [' + klanInfo.tag + ']');

                // Jatekosok keresese a klanban
                var playerLines = playerData.split('\n');
                var klanJatekosok = {};
                for(var j = 0; j < playerLines.length; j++){
                    var pLine = playerLines[j].trim();
                    if(!pLine) continue;
                    var pParts = pLine.split(',');
                    if(pParts[2] === klanId){
                        klanJatekosok[pParts[0]] = {
                            nev: decodeURIComponent(pParts[1].replace(/\+/g, ' ')),
                            pontok: parseInt(pParts[4])
                        };
                    }
                }

                var jatekosCount = Object.keys(klanJatekosok).length;
                console.log('Jatekosok a klanban: ' + jatekosCount);

                // Falvak keresese es szurese
                var villageLines = villageData.split('\n');
                var talalatok = [];

                for(var v = 0; v < villageLines.length; v++){
                    var vLine = villageLines[v].trim();
                    if(!vLine) continue;
                    var vParts = vLine.split(',');
                    var playerId = vParts[4];

                    if(klanJatekosok[playerId]){
                        var vx = parseInt(vParts[2]);
                        var vy = parseInt(vParts[3]);
                        var tav = Math.sqrt(Math.pow(vx - kx, 2) + Math.pow(vy - ky, 2));

                        if(tav <= sugar){
                            talalatok.push({
                                faluNev: decodeURIComponent(vParts[1].replace(/\+/g, ' ')),
                                x: vx,
                                y: vy,
                                faluPont: parseInt(vParts[5]),
                                jatekos: klanJatekosok[playerId].nev,
                                jatekosPont: klanJatekosok[playerId].pontok,
                                tavolsag: tav
                            });
                        }
                    }
                }

                // Rendezes tavolsag szerint
                talalatok.sort(function(a, b){ return a.tavolsag - b.tavolsag; });

                console.log('Talalatok: ' + talalatok.length + ' falu');

                // Eredmeny megjelenitese tablazatkent
                if(talalatok.length === 0){
                    alert('Nincs ' + klanInfo.tag + ' falu ' + sugar + ' mezon belul (' + kx + '|' + ky + ' kornyeken).');
                    return;
                }

                var html = '<div style="max-height:500px;overflow:auto;font-family:monospace;font-size:12px;">';
                html += '<h3>' + klanInfo.nev + ' [' + klanInfo.tag + '] - ' + talalatok.length + ' falu ' + sugar + ' mezon belul</h3>';
                html += '<p>Kozpont: ' + kx + '|' + ky + '</p>';
                html += '<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;">';
                html += '<tr style="background:#ddd;font-weight:bold;">';
                html += '<td>#</td><td>Jatekos</td><td>Falu</td><td>Koord</td><td>Falu pont</td><td>Jatekos pont</td><td>Tavolsag</td>';
                html += '</tr>';

                for(var t = 0; t < talalatok.length; t++){
                    var r = talalatok[t];
                    var bg = t % 2 === 0 ? '#fff' : '#f5f5f5';
                    html += '<tr style="background:' + bg + ';">';
                    html += '<td>' + (t + 1) + '</td>';
                    html += '<td>' + r.jatekos + '</td>';
                    html += '<td>' + r.faluNev + '</td>';
                    html += '<td>' + r.x + '|' + r.y + '</td>';
                    html += '<td>' + r.faluPont + '</td>';
                    html += '<td>' + r.jatekosPont + '</td>';
                    html += '<td>' + r.tavolsag.toFixed(1) + '</td>';
                    html += '</tr>';
                }

                html += '</table></div>';

                // Popup ablak megjelenitese
                var popup = document.createElement('div');
                popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border:2px solid #000;padding:15px;z-index:99999;box-shadow:0 0 20px rgba(0,0,0,0.5);max-width:800px;width:90%;';

                var closeBtn = '<div style="text-align:right;"><button onclick="this.parentElement.parentElement.remove();" style="padding:5px 15px;cursor:pointer;font-size:14px;">Bezaras [X]</button></div>';

                popup.innerHTML = closeBtn + html;
                document.body.appendChild(popup);

            });
        });
    });
})();
