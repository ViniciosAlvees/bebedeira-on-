(function(){
  "use strict";

  var COLORS = ['#ff2d0a','#ff7a00','#ffc400','#ff2d78','#00e5ff','#ff5400','#ffde59','#ff5ea8'];
  var WIN_SCORE = 20;
  var POINT_STEP = 3;

  var state = {
    players: [], // {name, score}
    spinning: false,
    tieCandidates: [],
    tieResults: {} // name -> seconds
  };

  // ---------- embers ----------
  function spawnEmbers(){
    var box = document.getElementById('embers');
    for(var i=0;i<22;i++){
      var e = document.createElement('div');
      e.className = 'ember';
      var size = 3 + Math.random()*5;
      e.style.width = size+'px';
      e.style.height = size+'px';
      e.style.left = (Math.random()*100)+'%';
      e.style.setProperty('--drift', (Math.random()*60-30)+'px');
      e.style.animationDuration = (5+Math.random()*6)+'s';
      e.style.animationDelay = (Math.random()*10)+'s';
      box.appendChild(e);
    }
  }
  spawnEmbers();

  // ---------- setup screen ----------
  var playerCountInput = document.getElementById('player-count');
  var btnConfirmCount = document.getElementById('btn-confirm-count');
  var nameList = document.getElementById('name-list');
  var btnStartGame = document.getElementById('btn-start-game');

  btnConfirmCount.addEventListener('click', function(){
    var n = parseInt(playerCountInput.value, 10);
    if(isNaN(n) || n < 2) n = 2;
    if(n > 12) n = 12;
    playerCountInput.value = n;

    nameList.innerHTML = '';
    for(var i=0;i<n;i++){
      var row = document.createElement('div');
      row.className = 'name-row';
      var dot = document.createElement('div');
      dot.className = 'dot';
      dot.style.background = COLORS[i % COLORS.length];
      dot.textContent = (i+1);
      var input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Jogador ' + (i+1);
      input.maxLength = 16;
      input.className = 'player-name-input';
      row.appendChild(dot);
      row.appendChild(input);
      nameList.appendChild(row);
    }
    nameList.classList.remove('hidden');
    btnStartGame.classList.remove('hidden');
  });

  btnStartGame.addEventListener('click', function(){
    var inputs = document.querySelectorAll('.player-name-input');
    var players = [];
    inputs.forEach(function(inp, idx){
      var val = inp.value.trim();
      players.push({ name: val || ('Jogador ' + (idx+1)), score: 0 });
    });
    if(players.length < 2){ return; }
    state.players = players;
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    buildWheel();
    renderScoreboard();
  });

  // ---------- scoreboard ----------
  function renderScoreboard(){
    var box = document.getElementById('scoreboard');
    box.innerHTML = '';
    state.players.forEach(function(p){
      var chip = document.createElement('div');
      chip.className = 'score-chip';
      var totalPips = Math.ceil(WIN_SCORE / POINT_STEP) + 1;
      var onPips = Math.max(0, Math.round(p.score / POINT_STEP));
      var pipsHtml = '';
      for(var i=0;i<totalPips;i++){
        pipsHtml += '<div class="pip ' + (i < onPips ? 'on' : '') + '"></div>';
      }
      chip.innerHTML =
        '<div class="nm">' + escapeHtml(p.name) + '</div>' +
        '<div class="pts">' + p.score + '</div>' +
        '<div class="pips">' + pipsHtml + '</div>';
      box.appendChild(chip);
    });
  }

  function escapeHtml(str){
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ---------- wheel build ----------
  var wheelEl = document.getElementById('wheel');
  var currentRotation = 0;

  function buildWheel(){
    var n = state.players.length;
    var seg = 360 / n;
    var gradientParts = [];
    for(var i=0;i<n;i++){
      var c = COLORS[i % COLORS.length];
      gradientParts.push(c + ' ' + (i*seg) + 'deg ' + ((i+1)*seg) + 'deg');
    }
    wheelEl.style.background = 'conic-gradient(from 0deg, ' + gradientParts.join(', ') + ')';

    // remove old labels
    Array.prototype.slice.call(wheelEl.querySelectorAll('.segment-label')).forEach(function(el){ el.remove(); });

    state.players.forEach(function(p, i){
      var midAngle = i*seg + seg/2;
      var label = document.createElement('div');
      label.className = 'segment-label';
      label.style.transform = 'rotate(' + midAngle + 'deg)';
      var span = document.createElement('span');
      span.textContent = p.name;
      label.appendChild(span);
      wheelEl.appendChild(label);
    });

    var flame = document.createElement('div');
    flame.className = 'flame-center';
    flame.style.display = 'none'; // decorative center handled by button; keep wheel clean
    wheelEl.appendChild(flame);
  }

  // ---------- spinning ----------
  var btnSpin = document.getElementById('btn-spin');
  var spinHint = document.getElementById('spin-hint');

  btnSpin.addEventListener('click', function(){
    if(state.spinning) return;
    spin();
  });

  function spin(){
    state.spinning = true;
    btnSpin.classList.add('spinning');
    spinHint.textContent = 'girando...';

    var n = state.players.length;
    var seg = 360 / n;
    var winnerIndex = Math.floor(Math.random() * n);
    var center = winnerIndex * seg + seg/2;
    var jitter = (Math.random() - 0.5) * seg * 0.6;
    var targetOffset = ((360 - (center + jitter)) % 360 + 360) % 360;
    var extraSpins = 5 + Math.floor(Math.random()*3); // 5-7 full turns
    var finalRotation = getNextRotation(targetOffset, extraSpins);
    wheelEl.style.transform = 'rotate(' + finalRotation + 'deg)';
    currentRotation = finalRotation;

    setTimeout(function(){
      state.spinning = false;
      btnSpin.classList.remove('spinning');
      spinHint.textContent = 'toque no fogo para girar';
      openChallenge(winnerIndex);
    }, 4600);
  }

  var lastBase = 0;
  function getNextRotation(targetOffset, extraSpins){
    lastBase += extraSpins*360;
    return lastBase + targetOffset;
  }

  // ---------- challenge modal ----------
  var challengeModal = document.getElementById('challenge-modal');
  var chalName = document.getElementById('chal-name');
  var chalShots = document.getElementById('chal-shots');
  var chalInstr = document.getElementById('chal-instr');
  var btnNoCareta = document.getElementById('btn-no-careta');
  var btnYesCareta = document.getElementById('btn-yes-careta');
  var currentChallengePlayerIdx = null;

  function openChallenge(idx){
    currentChallengePlayerIdx = idx;
    var p = state.players[idx];
    var shots = 1 + Math.floor(Math.random()*6); // 1 a 6
    chalName.textContent = '🔥 ' + p.name + ', sua vez!';
    chalShots.textContent = shots + (shots === 1 ? ' shot' : ' shots');
    chalInstr.textContent = 'Beba ' + shots + (shots === 1 ? ' shot' : ' shots') + ' sem fazer careta. Se conseguir, ganha ' + POINT_STEP + ' pontos. Se fizer careta, perde ' + POINT_STEP + ' pontos.';
    challengeModal.classList.remove('hidden');
  }

  function closeChallenge(){
    challengeModal.classList.add('hidden');
    currentChallengePlayerIdx = null;
  }

  btnNoCareta.addEventListener('click', function(){ resolveChallenge(true); });
  btnYesCareta.addEventListener('click', function(){ resolveChallenge(false); });

  function resolveChallenge(succeeded){
    if(currentChallengePlayerIdx === null) return;
    var p = state.players[currentChallengePlayerIdx];
    p.score += succeeded ? POINT_STEP : -POINT_STEP;
    if(p.score < 0) p.score = 0;
    closeChallenge();
    renderScoreboard();
    checkWinCondition();
  }

  // ---------- win condition & tiebreak ----------
  function checkWinCondition(){
    var maxScore = 0;
    state.players.forEach(function(p){ if(p.score > maxScore) maxScore = p.score; });
    if(maxScore < WIN_SCORE) return;

    var leaders = state.players.filter(function(p){ return p.score === maxScore; });
    if(leaders.length === 1){
      declareWinner(leaders[0].name);
    } else {
      startTiebreak(leaders);
    }
  }

  function declareWinner(name){
    document.getElementById('winner-name').textContent = name;
    document.getElementById('winner-modal').classList.remove('hidden');
  }

  var tieModal = document.getElementById('tie-modal');
  var tieList = document.getElementById('tie-list');
  var tieTimers = {}; // name -> {start, interval}

  function startTiebreak(leaders){
    state.tieCandidates = leaders;
    state.tieResults = {};
    tieList.innerHTML = '';
    leaders.forEach(function(p){
      var row = document.createElement('div');
      row.className = 'tie-row';
      row.id = 'tie-row-' + safeId(p.name);
      row.innerHTML =
        '<span class="tname">' + escapeHtml(p.name) + '</span>' +
        '<span class="ttime" id="ttime-' + safeId(p.name) + '">--</span>' +
        '<button class="btn-ghost" id="tbtn-' + safeId(p.name) + '">Iniciar</button>';
      tieList.appendChild(row);
    });
    leaders.forEach(function(p){
      var btn = document.getElementById('tbtn-' + safeId(p.name));
      btn.addEventListener('click', function(){ toggleTieTimer(p); });
    });
    tieModal.classList.remove('hidden');
  }

  function safeId(name){ return name.replace(/[^a-z0-9]/gi, '_'); }

  function toggleTieTimer(p){
    var key = p.name;
    var btn = document.getElementById('tbtn-' + safeId(p.name));
    var timeEl = document.getElementById('ttime-' + safeId(p.name));
    if(!tieTimers[key] || !tieTimers[key].running){
      tieTimers[key] = { running:true, start: performance.now(), interval: null };
      btn.textContent = 'Parar';
      tieTimers[key].interval = setInterval(function(){
        var elapsed = ((performance.now() - tieTimers[key].start)/1000).toFixed(1);
        timeEl.textContent = elapsed + 's';
      }, 100);
    } else {
      var t = tieTimers[key];
      t.running = false;
      clearInterval(t.interval);
      var finalTime = ((performance.now() - t.start)/1000).toFixed(1);
      timeEl.textContent = finalTime + 's ✅';
      btn.disabled = true;
      btn.textContent = 'Feito';
      state.tieResults[key] = parseFloat(finalTime);
      maybeFinishTiebreak();
    }
  }

  function maybeFinishTiebreak(){
    var names = state.tieCandidates.map(function(p){ return p.name; });
    var doneAll = names.every(function(n){ return state.tieResults.hasOwnProperty(n); });
    if(!doneAll) return;
    var bestName = null, bestTime = Infinity;
    names.forEach(function(n){
      if(state.tieResults[n] < bestTime){ bestTime = state.tieResults[n]; bestName = n; }
    });
    setTimeout(function(){
      tieModal.classList.add('hidden');
      declareWinner(bestName);
    }, 700);
  }

  document.getElementById('btn-tie-close').addEventListener('click', function(){
    tieModal.classList.add('hidden');
  });

  // ---------- reset / play again ----------
  function resetToSetup(){
    state.players = [];
    state.tieCandidates = [];
    state.tieResults = {};
    tieTimers = {};
    lastBase = 0;
    currentRotation = 0;
    document.getElementById('winner-modal').classList.add('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');
    nameList.classList.add('hidden');
    btnStartGame.classList.add('hidden');
  }

  document.getElementById('btn-play-again').addEventListener('click', resetToSetup);
  document.getElementById('btn-reset').addEventListener('click', function(){
    if(confirm('Reiniciar o jogo e apagar a pontuação atual?')){
      resetToSetup();
    }
  });

})();