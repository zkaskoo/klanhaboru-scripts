// Wrapper: betolti az eredeti attack_planner.js-t, de leszedi a confirm()-os hibridet
// es helyette mobilbarat modalt mutat a vilag/egyseg sebessegekhez.
// + minimal lebego "Mobil rendezes" gomb (kozelegit-eloszor).
(function(){
  // 1) Atmenetileg felulirjuk a confirm()-ot, hogy az eredeti scriptben levo
  //    "vilag/egyseg sebesseg" confirm ne jelenjen meg (mobil app suppressolja).
  var origConfirm = window.confirm;
  window.confirm = function(msg){
    try{
      if(typeof msg === 'string' && /vil.g.*seb/i.test(msg)){
        return false;
      }
    }catch(e){}
    return origConfirm.apply(window, arguments);
  };

  function mobileSpeedForm(){
    try{
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
    }catch(e){
      alert('Hiba a sebesseg formnal: ' + e.message);
    }
  }

  // 2) Eredeti script betoltese
  $.getScript('https://media.innogamescdn.com/com_DS_HU/scripts/attack_planner.js', function(){
    try{
      window.confirm = origConfirm;
      window.speedToScrn = mobileSpeedForm;
      $('#speeds_input_form').remove();
      $('.shadedBG').css('filter', 'blur(0px)');

      $(document).off('click.mobileSpeed').on('click.mobileSpeed', 'input.speed_form', function(e){
        e.preventDefault();
        e.stopImmediatePropagation();
        mobileSpeedForm();
      });

      var w = parseFloat(window.word_speed);
      var u = parseFloat(window.word_unit_speed);
      if(!w || !u || isNaN(w) || isNaN(u) || w <= 0 || u <= 0){
        mobileSpeedForm();
      }

      // ---- Minimal mobil rendezo gomb (lebego, jobb also sarok) ----
      setTimeout(function(){
        try{
          if($('#kh-sort-fab').length) return;
          $('body').append(
            '<button id="kh-sort-fab" type="button" style="position:fixed;bottom:20px;right:20px;z-index:99990;padding:12px 16px;border-radius:24px;border:2px solid black;background:#603000;color:white;font-weight:bold;font-size:13px;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,0.5)">Kozelegit elol</button>'
          );
          $(document).off('click.khSort').on('click.khSort', '#kh-sort-fab', function(e){
            e.preventDefault();
            try{
              var $radio = $(".vill_sorting_radio[identif='0']");
              if($radio.length){
                $radio.prop('checked', true).trigger('change');
                $('#kh-sort-fab').css('background', '#1a8a2e').text('Kozelegit elol ✓');
                setTimeout(function(){
                  $('#kh-sort-fab').css('background', '#603000').text('Kozelegit elol');
                }, 1500);
              } else {
                alert('Nem talalom a rendezesi opciot. Eloszor allitsd be a tipust.');
              }
            }catch(err){ alert('Hiba: ' + err.message); }
          });
        }catch(e){}
      }, 400);
    }catch(e){
      alert('Hiba az inicializaciokor: ' + e.message);
    }
  });
})();
void(0);
