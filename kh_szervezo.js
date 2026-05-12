// Wrapper az attack_planner.js-hez:
//  - mobilbarat sebesseg form a prompt() helyett
//  - "Mobil nezet" gomb: kozelegit-eloszor rendezes + tooltip megjelenitese csapatok adataira
(function(){
  // 1) "vilag/egyseg sebesseg" confirm()-ot automatikusan false-ra valtoztatjuk,
  //    mert mobil appban suppressolva van; helyette a mi formunk jon fel.
  var origConfirm = window.confirm;
  window.confirm = function(msg){
    if(typeof msg === 'string' && /vil.g.*seb/i.test(msg)){
      return false;
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

  // ---- Mobil nezet ----
  var mobileView = localStorage.getItem('kh_mobile_view') === '1';

  function updateToggleVisual(){
    var $btn = $('#kh-mobile-toggle');
    if(!$btn.length) return;
    $btn.text('Mobil nezet: ' + (mobileView ? 'BE' : 'KI'));
    $btn.css({
      padding:'6px 12px', borderRadius:'4px', border:'1px solid black',
      color:'white', fontWeight:'bold', cursor:'pointer', fontSize:'13px',
      margin:'0 8px', background: mobileView ? '#1a8a2e' : '#603000'
    });
  }

  function setupMobileToggle(){
    if($('#kh-mobile-toggle').length) return;
    var $bar = $('.top_bar').first();
    if(!$bar.length) return;
    $bar.append('<button id="kh-mobile-toggle" type="button"></button>');
    updateToggleVisual();
  }

  function resortExistingDropdowns(){
    // A meg nem rogzitett under_choose selectek option-jeit ujrasorrolljuk
    // a kozelseg alapjan a celpontkordhoz.
    $('.under_choose').each(function(){
      var $sel = $(this);
      var $cmd = $sel.closest('.command_container');
      var $target = $cmd.parent();
      var tm = ($target.find('p').first().text().match(/\d+\|\d+/g) || []);
      if(!tm.length) return;
      var tc = tm[0].split('|').map(Number);

      var $opts = $sel.find('option').not('[value=empty]').get();
      $opts.sort(function(a, b){
        var ac = ($(a).val() || '').split('|').map(Number);
        var bc = ($(b).val() || '').split('|').map(Number);
        if(isNaN(ac[0]) || isNaN(bc[0])) return 0;
        var da = Math.sqrt(Math.pow(ac[0]-tc[0],2) + Math.pow(ac[1]-tc[1],2));
        var db = Math.sqrt(Math.pow(bc[0]-tc[0],2) + Math.pow(bc[1]-tc[1],2));
        return da - db;
      });
      $sel.find('option').not('[value=empty]').remove();
      $sel.append($opts);
    });
  }

  function applyMobileView(){
    if(mobileView){
      $(".vill_sorting_radio[identif='0']").prop('checked', true).trigger('change');
      resortExistingDropdowns();
    } else {
      $("#script_tooltip").css('display','none');
    }
  }

  function showMobileTooltip($select){
    if(!mobileView) return;
    if(typeof window.refresh_tooltip_units_in_village !== 'function') return;
    if(typeof window.set_tooltip_travel_time !== 'function') return;
    if(typeof window.set_tooltip_launch_time !== 'function') return;
    if(!$('#script_tooltip').length) return;

    var $cmd = $select.closest('.command_container');
    var $target = $cmd.parent();
    var pText = $target.find('p').first().text();
    var tm = pText.match(/\d+\|\d+/g);
    var atime = pText.match(/\d+:\d+:\d+:\d+/g);
    var adate = pText.match(/\d+-\d+-\d+/g);
    if(!tm || !atime || !adate) return;

    var target_coord = tm[0];
    var coord = $select.val();
    if(!coord || coord === 'empty') return;

    var accelerator = '0.' + ($cmd.find('.accelerator').val() || '0');
    var arriving = adate[0].split('-').join(':') + ':' + atime[0];

    try{
      refresh_tooltip_units_in_village(coord);
      set_tooltip_travel_time(coord, target_coord, accelerator);
      set_tooltip_launch_time(coord, target_coord, arriving, accelerator);
    }catch(e){ return; }

    $('#script_tooltip').css({
      display:'inline-block', position:'fixed',
      top:'50%', left:'50%', right:'auto',
      transform:'translate(-50%,-50%)',
      maxWidth:'95vw', maxHeight:'85vh',
      overflowX:'auto', overflowY:'auto',
      zIndex:99999, boxShadow:'0 4px 20px rgba(0,0,0,0.8)'
    });

    if(!$('#script_tooltip .kh-close').length){
      $('#script_tooltip').prepend(
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-weight:bold">' +
          '<span class="kh-coord" style="color:#603000">'+coord+' &rarr; '+target_coord+'</span>' +
          '<button class="kh-close" style="background:red;color:white;border:0;padding:6px 12px;border-radius:3px;cursor:pointer;font-weight:bold">Bezar X</button>' +
        '</div>'
      );
    } else {
      $('#script_tooltip .kh-coord').html(coord+' &rarr; '+target_coord);
    }
  }

  // Toggle gomb klikk + dropdown change kezelo (delegalt)
  $(document).on('click.khMobToggle', '#kh-mobile-toggle', function(e){
    e.preventDefault();
    mobileView = !mobileView;
    localStorage.setItem('kh_mobile_view', mobileView ? '1' : '0');
    updateToggleVisual();
    applyMobileView();
  });

  $(document).on('change.khMobChg', 'select.under_choose, select.villages_drop_down', function(){
    if(!mobileView) return;
    var $this = $(this);
    setTimeout(function(){ showMobileTooltip($this); }, 50);
  });

  $(document).on('click.khMobClose', '#script_tooltip .kh-close', function(){
    $('#script_tooltip').css('display','none');
  });

  // 2) Eredeti script betoltese
  $.getScript('https://media.innogamescdn.com/com_DS_HU/scripts/attack_planner.js', function(){
    window.confirm = origConfirm;
    window.speedToScrn = mobileSpeedForm;
    $('#speeds_input_form').remove();
    $('.shadedBG').css('filter', 'blur(0px)');

    $(document).off('click.mobileSpeed').on('click.mobileSpeed', 'input.speed_form', function(e){
      e.preventDefault(); e.stopImmediatePropagation();
      mobileSpeedForm();
    });

    var w = parseFloat(window.word_speed), u = parseFloat(window.word_unit_speed);
    if(!w || !u || isNaN(w) || isNaN(u) || w <= 0 || u <= 0){
      mobileSpeedForm();
    }

    setTimeout(function(){
      setupMobileToggle();
      if(mobileView){ applyMobileView(); }
    }, 300);
  });
})();
void(0);
