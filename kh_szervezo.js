// Wrapper az attack_planner.js-hez:
//  - mobilbarat sebesseg form a prompt() helyett
//  - "Mobil nezet" lebego gomb (fix bottom-right): kozelegit-eloszor + sajat falu-lista
(function(){
  // ---------- 1) confirm felulirasa a sebesseges resszel ----------
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

  // ---------- 2) Mobil nezet ----------
  var mobileView = localStorage.getItem('kh_mobile_view') === '1';

  function formatMs(ms){
    if(!isFinite(ms) || ms < 0) ms = 0;
    var totalSec = Math.floor(ms/1000);
    var h = Math.floor(totalSec/3600);
    var m = Math.floor((totalSec%3600)/60);
    var s = totalSec%60;
    return h + ':' + ('0'+m).slice(-2) + ':' + ('0'+s).slice(-2);
  }

  function computeLaunchTime(adate, atime, travelMs){
    // adate: "YYYY-M-D", atime: "H:MM:SS:mmm"
    var dParts = adate.split('-').map(Number);
    var tParts = atime.split(':').map(Number);
    var d = new Date();
    d.setFullYear(dParts[0]); d.setMonth(dParts[1]-1); d.setDate(dParts[2]);
    d.setHours(tParts[0]||0); d.setMinutes(tParts[1]||0); d.setSeconds(tParts[2]||0); d.setMilliseconds(tParts[3]||0);
    d.setTime(d.getTime() - travelMs);
    return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate() + ' ' + d.getHours() + ':' + ('0'+d.getMinutes()).slice(-2) + ':' + ('0'+d.getSeconds()).slice(-2);
  }

  function createFAB(){
    if($('#kh-mobile-fab').length) return;
    $('body').append(
      '<button id="kh-mobile-fab" type="button" style="position:fixed;bottom:20px;right:20px;z-index:99990;padding:14px 18px;border-radius:30px;border:2px solid black;color:white;font-weight:bold;font-size:14px;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,0.5)"></button>'
    );
    updateFAB();
  }

  function updateFAB(){
    var $btn = $('#kh-mobile-fab');
    $btn.text(mobileView ? '✓ Mobil nezet BE' : '○ Mobil nezet KI');
    $btn.css('background', mobileView ? '#1a8a2e' : '#603000');
  }

  function refreshAllPickers(){
    if(mobileView){
      $('select.under_choose').each(function(){ buildPickerFor($(this)); });
    } else {
      $('.kh-village-picker').remove();
      $('select.under_choose, select.villages_drop_down').css('display','');
      $('#script_tooltip').css('display','none');
    }
  }

  function buildPickerFor($select){
    $select.next('.kh-village-picker').remove();
    if(!mobileView) return;

    var $cmd = $select.closest('.command_container');
    var $target = $cmd.parent();
    var pText = $target.find('p').first().text();
    var tm = pText.match(/\d+\|\d+/g);
    var atime = pText.match(/\d+:\d+:\d+:\d+/g);
    var adate = pText.match(/\d+-\d+-\d+/g);
    if(!tm || !atime || !adate) return;

    var target_coord = tm[0];
    var target_xy = target_coord.split('|').map(Number);
    var accelerator = parseFloat('0.' + ($cmd.find('.accelerator').val() || '0'));
    var slowest = $cmd.find('.slowest_unit').val();
    var unitsSpeeds = window.units_speeds || {};
    var slowest_speed = unitsSpeeds[slowest] || 35;
    var ws = window.word_speed, wu = window.word_unit_speed;
    if(!ws || !wu) return;

    var villages = [];
    $select.find('option').each(function(){
      var coord = $(this).val();
      if(!coord || coord === 'empty') return;
      var cxy = coord.split('|').map(Number);
      if(isNaN(cxy[0]) || isNaN(cxy[1])) return;
      var distance = Math.sqrt(Math.pow(cxy[0]-target_xy[0],2) + Math.pow(cxy[1]-target_xy[1],2));
      var travel_ms = (slowest_speed / ws / (wu + wu * accelerator)) * distance * 60 * 1000;
      villages.push({ coord:coord, label:$(this).text() || coord, travel_ms:travel_ms });
    });
    villages.sort(function(a,b){ return a.travel_ms - b.travel_ms; });

    var html = '<div class="kh-village-picker" style="background:wheat;border:2px solid saddlebrown;border-radius:4px;margin:8px 0;max-height:60vh;overflow-y:auto;font-family:Verdana,sans-serif">';
    html += '<div style="padding:8px 10px;background:burlywood;color:saddlebrown;font-weight:bold;font-size:13px;border-bottom:1px solid saddlebrown">Falu (' + villages.length + ' db) — kozelegit elol</div>';

    if(!villages.length){
      html += '<div style="padding:12px;color:#603000;text-align:center">Nincs elerheto falu</div>';
    } else {
      villages.forEach(function(v){
        var tt = formatMs(v.travel_ms);
        var launchAt = computeLaunchTime(adate[0], atime[0], v.travel_ms);
        html += '<div class="kh-vp-row" data-coord="' + v.coord + '" style="padding:10px;border-top:1px solid #d4b88a;display:flex;justify-content:space-between;align-items:center;gap:8px">';
        html +=   '<div style="flex:1;min-width:0">';
        html +=     '<div style="font-weight:bold;font-size:13px;color:#3a2200">' + v.label + '</div>';
        html +=     '<div style="font-size:11px;color:#603000;margin-top:2px">Menetido: <b>' + tt + '</b></div>';
        html +=     '<div style="font-size:11px;color:#603000">Indit: <b>' + launchAt + '</b></div>';
        html +=   '</div>';
        html +=   '<button class="kh-vp-pick" data-coord="' + v.coord + '" style="background:saddlebrown;color:white;border:0;padding:10px 14px;border-radius:4px;font-size:12px;font-weight:bold;cursor:pointer;white-space:nowrap">Valaszt</button>';
        html += '</div>';
      });
    }
    html += '</div>';

    $select.css('display','none').after(html);
  }

  function showFullTooltip($select){
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
          '<span class="kh-coord" style="color:#603000">' + coord + ' &rarr; ' + target_coord + '</span>' +
          '<button class="kh-close" style="background:red;color:white;border:0;padding:6px 12px;border-radius:3px;cursor:pointer;font-weight:bold">Bezar X</button>' +
        '</div>'
      );
    } else {
      $('#script_tooltip .kh-coord').html(coord + ' &rarr; ' + target_coord);
    }
  }

  // ---------- Esemenykezelok (delegalt) ----------
  $(document).on('click.khFab', '#kh-mobile-fab', function(e){
    e.preventDefault();
    mobileView = !mobileView;
    localStorage.setItem('kh_mobile_view', mobileView ? '1' : '0');
    updateFAB();
    if(mobileView){
      $(".vill_sorting_radio[identif='0']").prop('checked', true).trigger('change');
    } else {
      $('#script_tooltip').css('display','none');
    }
    refreshAllPickers();
  });

  // Falu valasztasa a sajat listabol -> select.val + change trigger
  $(document).on('click.khPick', '.kh-vp-pick', function(e){
    e.preventDefault();
    e.stopImmediatePropagation();
    var coord = $(this).attr('data-coord');
    var $picker = $(this).closest('.kh-village-picker');
    var $select = $picker.prev('select');
    if(!$select.length) return;
    if($select.prop('disabled')){
      $picker.remove();
      return;
    }
    $select.val(coord);
    $select.trigger('change');
    setTimeout(function(){
      $picker.remove();
      showFullTooltip($select);
    }, 50);
  });

  // Bezar gomb a tooltipben
  $(document).on('click.khClose', '#script_tooltip .kh-close', function(){
    $('#script_tooltip').css('display','none');
  });

  // Ha inactive_type valtozik -> uj under_choose, ujraepiteni a pickert
  $(document).on('change.khType', 'select.inactive_type', function(){
    if(!mobileView) return;
    var $cmd = $(this).closest('.command_container');
    setTimeout(function(){
      var $sel = $cmd.find('select.under_choose');
      if($sel.length) buildPickerFor($sel);
    }, 100);
  });

  // Slowest unit / accelerator valtozasakor frissitsuk a menetidoket a pickerben
  $(document).on('change.khRecalc', 'select.slowest_unit, select.accelerator', function(){
    if(!mobileView) return;
    var $cmd = $(this).closest('.command_container');
    var $sel = $cmd.find('select.under_choose');
    if($sel.length) buildPickerFor($sel);
  });

  // ---------- 3) Eredeti script betoltese ----------
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
      createFAB();
      if(mobileView){
        $(".vill_sorting_radio[identif='0']").prop('checked', true).trigger('change');
        refreshAllPickers();
      }
    }, 400);
  });
})();
void(0);
