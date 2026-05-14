// Wrapper: betolti az eredeti attack_planner.js-t, de leszedi a confirm()-os hibridet
// es helyette mobilbarat modalt mutat a vilag/egyseg sebessegekhez.
(function(){
  // 1) Atmenetileg felulirjuk a confirm()-ot, hogy az eredeti scriptben levo
  //    "vilag/egyseg sebesseg" confirm ne jelenjen meg (mobil app suppressolja).
  //    Visszaadunk false-t, igy a script nem hivja a regi speedToScrn-t.
  var origConfirm = window.confirm;
  window.confirm = function(msg){
    if(typeof msg === 'string' && /vil.g.*seb/i.test(msg)){
      return false;
    }
    if(typeof msg === 'string' && /nuke|kos|leglassabb/i.test(msg)){
      return true;
    }
    return origConfirm.apply(window, arguments);
  };

  function mobileSpeedForm(){
    $('#speeds_input_form, .ws-backdrop').remove();
    $('.shadedBG').css('filter', 'blur(0px)');

    var keyMatch = document.location.host.match(/\w+\d+/);
    var key = keyMatch ? keyMatch[0] : '';
    var savedW = parseFloat(localStorage.getItem(key + 'word'));
    var savedU = parseFloat(localStorage.getItem(key + 'unit'));
    var currentW = isNaN(savedW) ? (window.word_speed || '') : savedW;
    var currentU = isNaN(savedU) ? (window.word_unit_speed || '') : savedU;

    var $backdrop = $('<div class="ws-backdrop"></div>').css({
      position:'fixed', top:0, left:0, right:0, bottom:0,
      background:'black', opacity:0.6, zIndex:99998
    });

    var $modal = $('<div id="speeds_input_form"></div>').css({
      position:'fixed', top:'50%', left:'50%',
      transform:'translate(-50%,-50%)', zIndex:99999,
      background:'wheat', border:'2px solid saddlebrown',
      padding:'20px', fontFamily:'Verdana,sans-serif',
      fontSize:'14px', color:'black',
      minWidth:'280px', maxWidth:'90vw', boxSizing:'border-box'
    });

    $modal.html(
      '<div style="font-weight:bold;color:saddlebrown;font-size:16px;margin-bottom:14px;text-align:center">Vilag / egyseg sebesseg</div>' +
      '<div style="margin-bottom:6px">Vilag sebesseg:</div>' +
      '<input id="ws-world" type="text" value="'+(currentW||'')+'" placeholder="pl. 1.6" style="width:100%;padding:10px;font-size:16px;text-align:center;border:1px solid saddlebrown;border-radius:3px;margin-bottom:12px;box-sizing:border-box">' +
      '<div style="margin-bottom:6px">Egyseg sebesseg:</div>' +
      '<input id="ws-unit" type="text" value="'+(currentU||'')+'" placeholder="pl. 0.625" style="width:100%;padding:10px;font-size:16px;text-align:center;border:1px solid saddlebrown;border-radius:3px;margin-bottom:8px;box-sizing:border-box">' +
      '<div style="font-size:11px;color:saddlebrown;margin-bottom:12px;line-height:1.4">A vilag beallitasai oldalon talalhato (sebesseg + egysegsebesseg).</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button id="ws-cancel" style="flex:1;padding:12px;border:1px solid saddlebrown;background:wheat;cursor:pointer;font-size:14px;border-radius:3px">Megse</button>' +
        '<button id="ws-save" style="flex:1;padding:12px;background:saddlebrown;color:white;border:1px solid saddlebrown;font-weight:bold;cursor:pointer;font-size:14px;border-radius:3px">Mentes</button>' +
      '</div>'
    );

    $('body').append($backdrop).append($modal);
    setTimeout(function(){ try{ $('#ws-world').focus(); }catch(e){} }, 50);

    $('#ws-save').on('click', function(){
      var w = String($('#ws-world').val() || '').trim().replace(',', '.');
      var u = String($('#ws-unit').val() || '').trim().replace(',', '.');
      var wf = parseFloat(w), uf = parseFloat(u);
      if(!w || !u || isNaN(wf) || isNaN(uf) || wf <= 0 || uf <= 0){
        alert('Valamelyik mezo ures vagy nem ervenyes szam.');
        return;
      }
      if(key){
        localStorage.setItem(key + 'word', wf);
        localStorage.setItem(key + 'unit', uf);
      }
      window.word_speed = wf;
      window.word_unit_speed = uf;
      if(window.UI && UI.SuccessMessage) UI.SuccessMessage('A beallitasok frissitve lettek!', 3000);
      $modal.remove();
      $backdrop.remove();
    });

    $('#ws-cancel').on('click', function(){
      $modal.remove();
      $backdrop.remove();
    });
  }

  // 2) Eredeti script betoltese
  $.getScript('https://media.innogamescdn.com/com_DS_HU/scripts/attack_planner.js', function(){
    // A confirm() override-ot szandekosan NEM allitjuk vissza:
    // - "vilag/egyseg sebesseg" confirm-ot tovabbra is suppress-elunk (mobil form helyettesiti)
    // - "Nuke/Kos leglassabb egyseg" figyelmeztetest auto-OK-val atugorjuk

    // Az eredeti speedToScrn-t lecsereljuk a mobil verziora (regi formot is takaritunk)
    window.speedToScrn = mobileSpeedForm;
    $('#speeds_input_form').remove();
    $('.shadedBG').css('filter', 'blur(0px)');

    // A "Vilag/egyseg sebesseg" gombnal a dblclick mobilon nem mukodik -> sima click
    $(document).off('click.mobileSpeed').on('click.mobileSpeed', 'input.speed_form', function(e){
      e.preventDefault();
      e.stopImmediatePropagation();
      mobileSpeedForm();
    });

    // Ha a sebesseg meg nincs beallitva (sem hardkodolt vilag, sem localStorage),
    // azonnal mutassuk a mobilbart formot
    var w = parseFloat(window.word_speed);
    var u = parseFloat(window.word_unit_speed);
    if(!w || !u || isNaN(w) || isNaN(u) || w <= 0 || u <= 0){
      mobileSpeedForm();
    }
  });
})();
void(0);
