// ============================================================
//  SHARED HELPERS
// ============================================================
function rnd(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
function $(id){return document.getElementById(id);}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$(id).classList.add('active');}

// ---- audio (simple tones, matches the Math Kingdom app's approach) ----
let audioCtx=null;
function getACtx(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();return audioCtx;}
document.addEventListener('click',()=>{try{if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();}catch(e){}});
function playTone(freq,type,dur,vol){try{const ctx=getACtx();const o=ctx.createOscillator();const g=ctx.createGain();o.type=type||'sine';o.frequency.setValueAtTime(freq,ctx.currentTime);g.gain.setValueAtTime(vol||0.1,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+dur);}catch(e){}}
function playCorrectSound(){playTone(523,'sine',.15,.1);setTimeout(()=>playTone(659,'sine',.15,.1),120);setTimeout(()=>playTone(784,'sine',.25,.1),240);}
function playWrongSound(){playTone(300,'sawtooth',.15,.08);setTimeout(()=>playTone(250,'sawtooth',.2,.08),150);}
function playChompSound(){playTone(150,'square',.08,.12);setTimeout(()=>playTone(100,'square',.15,.12),80);}
function playCelebrationSound(){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,'sine',.2,.1),i*120));}

// ---- confetti ----
const confCanvas=$('confettiCanvas');const confCtx=confCanvas.getContext('2d');let confParticles=[];
function resizeConf(){confCanvas.width=window.innerWidth;confCanvas.height=window.innerHeight;}
resizeConf();window.addEventListener('resize',resizeConf);
function launchConfetti(count){
  const cols=['#17C7C7','#FF5C3D','#FFB020','#2FE6A7','#7EEAEA','#FFC94D'];
  for(let i=0;i<(count||40);i++){confParticles.push({x:Math.random()*confCanvas.width,y:confCanvas.height*.25,vx:(Math.random()-.5)*14,vy:(Math.random()*-12)-4,color:cols[Math.floor(Math.random()*cols.length)],size:Math.random()*8+5,gravity:.5,alpha:1,rot:Math.random()*360,rotv:(Math.random()-.5)*10});}
  if(!confRunning)runConf();
}
let confRunning=false;
function runConf(){
  confRunning=true;confCtx.clearRect(0,0,confCanvas.width,confCanvas.height);
  confParticles=confParticles.filter(p=>p.alpha>.04);
  confParticles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=p.gravity;p.vx*=.99;p.alpha-=.013;p.rot+=p.rotv;confCtx.save();confCtx.globalAlpha=p.alpha;confCtx.fillStyle=p.color;confCtx.translate(p.x,p.y);confCtx.rotate(p.rot*Math.PI/180);confCtx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);confCtx.restore();});
  if(confParticles.length>0)requestAnimationFrame(runConf);else{confRunning=false;confCtx.clearRect(0,0,confCanvas.width,confCanvas.height);}
}

// ============================================================
//  PROBLEM GENERATOR — addition sums <=20, subtraction minuend <=25,
//  always freshly generated (nothing cached/hardcoded).
// ============================================================
function generateMentalMathProblem(allowSub){
  const op=(!allowSub || rnd(0,1)===0)?'add':'sub';
  if(op==='add'){
    let a,b,g=0;
    do{a=rnd(2,18);b=rnd(2,18);g++;}while((a+b>20||a+b<3)&&g<300);
    return{op:'+',a,b,answer:a+b};
  } else {
    let a,b,g=0;
    do{a=rnd(6,25);b=rnd(2,a-1);g++;}while((a-b<1)&&g<300);
    return{op:'−',a,b,answer:a-b};
  }
}

// ============================================================
//  BEST-SCORE PERSISTENCE
// ============================================================
let bestScores={classicBest:0,survivalBest:0};
try{const s=localStorage.getItem('mmg-best');if(s)bestScores=Object.assign(bestScores,JSON.parse(s));}catch(e){}
function saveBestScores(){localStorage.setItem('mmg-best',JSON.stringify(bestScores));}
function refreshBestLabels(){
  $('bestClassicLbl').textContent=bestScores.classicBest||0;
  $('bestSurvivalLbl').textContent=bestScores.survivalBest||0;
}
refreshBestLabels();

window.exitToMenu=function(){
  if(classic){classic.active=false;clearInterval(classic.countdownId);}
  if(survival){survival.active=false;clearInterval(survival.countdownId);}
  cleanupRace();
  refreshBestLabels();
  showScreen('pickerScreen');
};

// ============================================================
//  CLASSIC MODE — 10 questions, each with its OWN 10-second timer
//  (matches the reference mechanic: a per-question countdown, not one
//  long clock for the whole round). Running out of time on a question
//  counts as wrong and immediately advances -- no round-ending penalty
//  beyond that, so the pressure is per-answer, not cumulative.
// ============================================================
const CLASSIC_QUESTIONS=10;
const CLASSIC_TIME=10; // seconds per question
let classic=null;
window.startClassic=function(){
  classic={qIndex:0,score:0,streak:0,problem:null,active:true,timeLeft:CLASSIC_TIME,countdownId:null,focus:false};
  classic.problem=generateMentalMathProblem(true);
  renderClassic();
  startClassicCountdown();
  showScreen('gameScreen');
};
function startClassicCountdown(){
  clearInterval(classic.countdownId);
  classic.timeLeft=CLASSIC_TIME;
  classic.countdownId=setInterval(()=>{
    if(!classic||!classic.active)return;
    classic.timeLeft-=0.1;
    if(classic.timeLeft<=0){classic.timeLeft=0;updateClassicCountdown();classicTimeout();}
    else updateClassicCountdown();
  },100);
}
function updateClassicCountdown(){
  const bar=$('classicCountdownBar'),num=$('classicCountdownNum');
  if(!bar||!classic)return;
  const pct=Math.max(0,(classic.timeLeft/CLASSIC_TIME)*100);
  bar.style.width=pct+'%';
  bar.classList.toggle('warning',classic.timeLeft<=3);
  if(num)num.textContent=classic.timeLeft.toFixed(1)+'s';
}
function classicTimeout(){
  if(!classic||!classic.active)return;
  clearInterval(classic.countdownId);
  classic.streak=0;
  playWrongSound();
  const eqEl=$('classicEquation');
  if(eqEl){eqEl.classList.remove('flash-ok','flash-bad');void eqEl.offsetWidth;eqEl.classList.add('flash-bad');}
  advanceClassic();
}
function renderClassic(){
  const c=$('gameContent');
  c.innerHTML=`
    <div class="scorecard">
      <div class="score-box"><div class="score-lbl">Score</div><div class="score-val" id="classicScoreVal">${classic.score}</div></div>
      <div class="score-box"><div class="score-lbl">Streak</div><div class="score-val streak" id="classicStreakVal">${classic.streak}</div></div>
      <div class="score-box"><div class="score-lbl">Question</div><div class="score-val">${classic.qIndex+1}/${CLASSIC_QUESTIONS}</div></div>
    </div>
    <div class="playfield">
      <div class="focus-row">Focus <label class="focus-switch"><input type="checkbox" id="classicFocusToggle" ${classic.focus?'checked':''}><span class="focus-slider"></span></label></div>
      <div class="equation" id="classicEquation">
        <span>${classic.problem.a} ${classic.problem.op} ${classic.problem.b} =</span>
        <input type="number" class="eq-input" id="classicInput" autocomplete="off">
      </div>
      <div class="countdown-wrap"><div class="countdown-bar" id="classicCountdownBar" style="width:100%;"></div></div>
      <div class="countdown-num" id="classicCountdownNum">${CLASSIC_TIME.toFixed(1)}s</div>
    </div>
    <div class="btn-row">
      <button class="btn btn-ghost" onclick="exitToMenu()">LEAVE</button>
      <button class="btn btn-ghost" onclick="startClassic()">RESTART</button>
    </div>
  `;
  $('classicFocusToggle').addEventListener('change',e=>{classic.focus=e.target.checked;document.querySelector('.scorecard').style.display=classic.focus?'none':'flex';});
  const input=$('classicInput');input.focus();
  input.addEventListener('keydown',e=>{if(e.key==='Enter')submitClassicAnswer();});
}
function submitClassicAnswer(){
  if(!classic||!classic.active)return;
  const raw=$('classicInput')?.value;
  if(raw===undefined||raw==='')return;
  clearInterval(classic.countdownId);
  const eqEl=$('classicEquation');
  if(parseInt(raw,10)===classic.problem.answer){
    classic.score++;classic.streak++;
    playCorrectSound();
    if(eqEl){eqEl.classList.remove('flash-bad','flash-ok');void eqEl.offsetWidth;eqEl.classList.add('flash-ok');}
    if(classic.score>0&&classic.score%5===0)launchConfetti(15);
  } else {
    classic.streak=0;
    playWrongSound();
    if(eqEl){eqEl.classList.remove('flash-ok','flash-bad');void eqEl.offsetWidth;eqEl.classList.add('flash-bad');}
  }
  advanceClassic();
}
function advanceClassic(){
  classic.qIndex++;
  if(classic.qIndex>=CLASSIC_QUESTIONS){ endClassic(); return; }
  classic.problem=generateMentalMathProblem(true);
  setTimeout(()=>{ if(classic&&classic.active){ renderClassic(); startClassicCountdown(); } }, 200);
}
function endClassic(){
  if(!classic)return;
  classic.active=false;clearInterval(classic.countdownId);
  const isNewBest=classic.score>(bestScores.classicBest||0);
  if(isNewBest)bestScores.classicBest=classic.score;
  saveBestScores();playCelebrationSound();
  if(isNewBest)launchConfetti(120);
  renderResult('gameContent','Classic',classic.score,bestScores.classicBest,isNewBest,startClassic);
  refreshBestLabels();
}

// ============================================================
//  SURVIVAL MODE — a monkey climbs a tree. 10 questions, each with
//  its own 10-second timer. Correct answers climb the monkey up a
//  step; wrong or timed-out answers slip it down a step (never below
//  the ground). There's no early game-over: the round always runs to
//  its last question. Answering every question correctly climbs the
//  monkey all the way to the banana and shows a "You WIN!" banner.
// ============================================================
const SURVIVAL_QUESTIONS=10;
const SURVIVAL_TIME=10; // seconds per problem
const TREE_HEIGHT_STEPS=SURVIVAL_QUESTIONS;
const CLIMB_ANIM_MS=450; // must match the monkeyHop/monkeySlip keyframe duration
let survival=null;
window.startSurvival=function(){
  survival={qIndex:0,score:0,streak:0,climb:0,problem:null,active:true,timeLeft:SURVIVAL_TIME,countdownId:null,animating:false};
  survival.problem=generateMentalMathProblem(true);
  renderSurvival();
  startSurvivalCountdown();
  showScreen('gameScreen');
};
function startSurvivalCountdown(){
  clearInterval(survival.countdownId);
  survival.timeLeft=SURVIVAL_TIME;
  survival.countdownId=setInterval(()=>{
    if(!survival||!survival.active)return;
    survival.timeLeft-=0.1;
    if(survival.timeLeft<=0){survival.timeLeft=0;updateSurvivalCountdown();survivalTimeout();}
    else updateSurvivalCountdown();
  },100);
}
function updateSurvivalCountdown(){
  const bar=$('survivalCountdownBar'),num=$('survivalCountdownNum'),scene=$('treeScene');
  if(!bar||!survival)return;
  const pct=Math.max(0,(survival.timeLeft/SURVIVAL_TIME)*100);
  bar.style.width=pct+'%';
  bar.classList.toggle('warning',survival.timeLeft<=3);
  if(num)num.textContent=survival.timeLeft.toFixed(1)+'s';
  // Build tension: the monkey trembles once the clock is nearly out.
  if(scene)scene.classList.toggle('time-danger',survival.timeLeft<=3);
}
function monkeyBottomPx(climb){ return 14+(climb/TREE_HEIGHT_STEPS)*130; }
function animateMonkey(dir){
  survival.climb = dir==='up' ? Math.min(TREE_HEIGHT_STEPS,survival.climb+1) : Math.max(0,survival.climb-1);
  const monkey=$('treeMonkey'),goal=$('treeGoal'),scene=$('treeScene');
  if(monkey){
    monkey.style.bottom=monkeyBottomPx(survival.climb)+'px';
    monkey.classList.remove('climb-up','climb-down');
    void monkey.offsetWidth;
    monkey.classList.add(dir==='up'?'climb-up':'climb-down');
  }
  if(goal)goal.classList.toggle('claimed',survival.climb>=TREE_HEIGHT_STEPS);
  if(dir==='down'&&scene){ scene.classList.remove('survival-shake'); void scene.offsetWidth; scene.classList.add('survival-shake'); }
}
// Big, unmistakable center-screen callout on a wrong/timed-out answer.
function showBigPop(text){
  let pop=document.getElementById('bigPopEl');
  if(!pop){
    pop=document.createElement('div');
    pop.id='bigPopEl';
    pop.className='big-pop';
    document.body.appendChild(pop);
  }
  pop.textContent=text;
  pop.classList.remove('show');
  void pop.offsetWidth;
  pop.classList.add('show');
  setTimeout(()=>{ pop.classList.remove('show'); }, 800);
}
function survivalTimeout(){
  if(!survival||!survival.active||survival.animating)return;
  clearInterval(survival.countdownId);
  survival.streak=0;
  playWrongSound();
  const eqEl=$('survivalEquation');
  if(eqEl){eqEl.classList.remove('flash-ok','flash-bad');void eqEl.offsetWidth;eqEl.classList.add('flash-bad');}
  showBigPop('⏰ TOO SLOW!');
  animateMonkey('down');
  advanceSurvival();
}
function renderSurvival(){
  const c=$('gameContent');
  c.innerHTML=`
    <div class="tree-scene" id="treeScene">
      <div class="tree-goal" id="treeGoal">🍌</div>
      <div class="tree-canopy">
        <span class="leaf leaf1"></span>
        <span class="leaf leaf2"></span>
        <span class="leaf leaf3"></span>
      </div>
      <div class="tree-trunk"></div>
      <div class="tree-ground"></div>
      <div class="tree-monkey" id="treeMonkey" style="bottom:${monkeyBottomPx(survival.climb)}px;">🐒</div>
    </div>
    <div class="scorecard">
      <div class="score-box"><div class="score-lbl">Score</div><div class="score-val" id="survivalScoreVal">${survival.score}</div></div>
      <div class="score-box"><div class="score-lbl">Streak</div><div class="score-val streak">${survival.streak}</div></div>
      <div class="score-box"><div class="score-lbl">Question</div><div class="score-val">${survival.qIndex+1}/${SURVIVAL_QUESTIONS}</div></div>
    </div>
    <div class="playfield" id="survivalPlayfield">
      <div class="equation" id="survivalEquation">
        <span>${survival.problem.a} ${survival.problem.op} ${survival.problem.b} =</span>
        <input type="number" class="eq-input" id="survivalInput" autocomplete="off">
      </div>
      <div class="countdown-wrap"><div class="countdown-bar" id="survivalCountdownBar" style="width:100%;"></div></div>
      <div class="countdown-num" id="survivalCountdownNum">${SURVIVAL_TIME.toFixed(1)}s</div>
    </div>
    <div class="btn-row">
      <button class="btn btn-ghost" onclick="exitToMenu()" style="flex:1;">LEAVE</button>
    </div>
  `;
  if(survival.climb>=TREE_HEIGHT_STEPS){ const g=$('treeGoal'); if(g)g.classList.add('claimed'); }
  const input=$('survivalInput');
  if(input){ input.focus(); input.addEventListener('keydown',e=>{if(e.key==='Enter')submitSurvivalAnswer();}); }
}
function submitSurvivalAnswer(){
  if(!survival||!survival.active||survival.animating)return;
  const raw=$('survivalInput')?.value;
  if(raw===undefined||raw==='')return;
  clearInterval(survival.countdownId);
  const eqEl=$('survivalEquation');
  if(parseInt(raw,10)===survival.problem.answer){
    survival.score++;survival.streak++;
    playCorrectSound();
    if(eqEl){eqEl.classList.remove('flash-bad','flash-ok');void eqEl.offsetWidth;eqEl.classList.add('flash-ok');}
    if(survival.score>0&&survival.score%5===0)launchConfetti(15);
    animateMonkey('up');
  } else {
    survival.streak=0;
    playWrongSound();
    if(eqEl){eqEl.classList.remove('flash-ok','flash-bad');void eqEl.offsetWidth;eqEl.classList.add('flash-bad');}
    showBigPop('❌ WRONG!');
    animateMonkey('down');
  }
  advanceSurvival();
}
function advanceSurvival(){
  survival.animating=true;
  survival.qIndex++;
  setTimeout(()=>{
    if(!survival)return;
    survival.animating=false;
    if(survival.qIndex>=SURVIVAL_QUESTIONS){ endSurvival(); return; }
    survival.problem=generateMentalMathProblem(true);
    renderSurvival();
    startSurvivalCountdown();
  }, CLIMB_ANIM_MS+150);
}
function endSurvival(){
  if(!survival)return;
  survival.active=false;
  clearInterval(survival.countdownId);
  const isNewBest=survival.score>(bestScores.survivalBest||0);
  if(isNewBest)bestScores.survivalBest=survival.score;
  saveBestScores();
  const isPerfect=survival.score===SURVIVAL_QUESTIONS;
  playCelebrationSound();
  if(isPerfect){
    launchConfetti(150);
    setTimeout(()=>launchConfetti(100),300);
    renderResult('gameContent','Survival',survival.score,bestScores.survivalBest,isNewBest,startSurvival,{title:'🐒 You WIN! 🍌',emoji:'🏆',titleClass:'win'});
  } else {
    if(isNewBest)launchConfetti(120);
    renderResult('gameContent','Survival',survival.score,bestScores.survivalBest,isNewBest,startSurvival);
  }
  refreshBestLabels();
}

// ============================================================
//  TWO-PLAYER RACE MODE — two players anywhere in the world race the
//  same 60-second clock, each answering from an identical shared set
//  of problems at their own pace. Whoever has the most correct
//  answers when the timer ends wins. Synced live via Firebase
//  Realtime Database (see firebase-config.js for setup).
// ============================================================
const RACE_DURATION_MS=60000;
const RACE_PROBLEM_COUNT=200; // far more than anyone can reach in 60s
const RACE_MAX_STEPS=30; // correct answers needed to visually reach the finish line
const ROOM_CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I, easier to read aloud/type
let race=null;
let fbDb=null;
let fbAuthReady=null;

function fbInit(){
  if(!fbDb) fbDb=firebase.database();
  return fbDb;
}
function ensureFbAuth(){
  if(!fbAuthReady){
    fbAuthReady=new Promise((resolve,reject)=>{
      firebase.auth().onAuthStateChanged(user=>{ if(user)resolve(user); });
      firebase.auth().signInAnonymously().catch(reject);
    });
  }
  return fbAuthReady;
}
function randomRoomCode(){
  let s='';
  for(let i=0;i<4;i++) s+=ROOM_CODE_CHARS[rnd(0,ROOM_CODE_CHARS.length-1)];
  return s;
}
function generateRaceProblems(){
  const list=[];
  for(let i=0;i<RACE_PROBLEM_COUNT;i++) list.push(generateMentalMathProblem(true));
  return list;
}
// Catches the two most common "it just says Could not create a race" causes
// before we even touch the network, so the message actually says what's wrong.
function raceSetupProblem(){
  if(typeof firebase==='undefined') return "Couldn't load the Firebase scripts — check your internet connection and reload the page.";
  if(typeof firebaseConfig!=='undefined' && firebaseConfig.apiKey==='REPLACE_ME') return "Two-player racing isn't set up yet — open firebase-config.js and follow the setup steps at the top (create a free Firebase project and paste its config in).";
  if(typeof firebaseConfig!=='undefined' && firebaseConfig.databaseURL==='REPLACE_ME') return "Almost there — firebase-config.js is missing the Realtime Database web address. Create the database in your Firebase project (Build → Realtime Database → Create Database) and paste its URL into databaseURL.";
  if(location.protocol==='file:') return "Open this over http(s) to race online — run a local server (e.g. \"python3 -m http.server\") or use your GitHub Pages link instead of double-clicking the file.";
  return null;
}

window.showTwoPlayerSetup=function(){
  cleanupRace();
  showScreen('setupScreen');
  $('raceSetupMsg').textContent='';
  $('raceCodeInput').value='';
  $('raceNameInput').focus();
};

window.hostRace=async function(){
  const name=($('raceNameInput').value||'').trim();
  if(!name){ $('raceSetupMsg').textContent='Please enter your name.'; return; }
  const setupProblem=raceSetupProblem();
  if(setupProblem){ $('raceSetupMsg').textContent=setupProblem; return; }
  $('raceSetupMsg').textContent='';
  try{
    fbInit();
    await ensureFbAuth();
    let code,roomRef,exists=true,attempts=0;
    do{
      code=randomRoomCode();
      roomRef=fbDb.ref('rooms/'+code);
      exists=(await roomRef.once('value')).exists();
      attempts++;
    }while(exists&&attempts<8);
    await roomRef.set({
      status:'waiting',
      createdAt:firebase.database.ServerValue.TIMESTAMP,
      players:{ p1:{ name, score:0, finished:false } }
    });
    race={roomCode:code,mySlot:'p1',myName:name,oppName:'',roomRef,problems:null,myIndex:0,problem:null,
      score:0,streak:0,active:false,raceStartAt:0,raceEndAt:0,tickId:null,finished:false,resultShown:false,
      oppScore:0,oppFinished:false,raceStarted:false,_p2SeenHandled:false};
    showScreen('tpWaitScreen');
    $('waitRoomCode').textContent=code;
    $('waitStatusMsg').textContent='Share this code with your opponent…';
    attachRoomListener();
  }catch(err){
    $('raceSetupMsg').textContent='Could not create a race. Check your connection and try again.';
    console.error(err);
  }
};

window.joinRace=async function(){
  const name=($('raceNameInput').value||'').trim();
  const code=($('raceCodeInput').value||'').trim().toUpperCase();
  if(!name){ $('raceSetupMsg').textContent='Please enter your name.'; return; }
  if(!code){ $('raceSetupMsg').textContent='Please enter a room code.'; return; }
  const setupProblem=raceSetupProblem();
  if(setupProblem){ $('raceSetupMsg').textContent=setupProblem; return; }
  $('raceSetupMsg').textContent='';
  try{
    fbInit();
    await ensureFbAuth();
    const roomRef=fbDb.ref('rooms/'+code);
    const room=(await roomRef.once('value')).val();
    if(!room){ $('raceSetupMsg').textContent='No race found with that code.'; return; }
    if(room.status!=='waiting'||(room.players&&room.players.p2)){ $('raceSetupMsg').textContent="That race already started or is full."; return; }
    await roomRef.child('players/p2').set({ name, score:0, finished:false });
    race={roomCode:code,mySlot:'p2',myName:name,oppName:room.players.p1.name,roomRef,problems:null,myIndex:0,problem:null,
      score:0,streak:0,active:false,raceStartAt:0,raceEndAt:0,tickId:null,finished:false,resultShown:false,
      oppScore:0,oppFinished:false,raceStarted:false,_p2SeenHandled:true};
    showScreen('tpWaitScreen');
    $('waitRoomCode').textContent=code;
    $('waitStatusMsg').textContent='Waiting for the race to start…';
    attachRoomListener();
  }catch(err){
    $('raceSetupMsg').textContent='Could not join that race. Check the code and try again.';
    console.error(err);
  }
};

function attachRoomListener(){
  const ref=race.roomRef;
  const cb=ref.on('value',snap=>{
    const room=snap.val();
    if(!room||!race)return;
    if(race.mySlot==='p1'&&room.status==='waiting'&&room.players&&room.players.p2&&!race._p2SeenHandled){
      race._p2SeenHandled=true;
      race.oppName=room.players.p2.name;
      $('waitStatusMsg').textContent=`${room.players.p2.name} joined! Get ready…`;
      race.roomRef.update({ status:'racing', problems:generateRaceProblems(), raceStartAt:Date.now()+3500 });
    }
    if(room.status==='racing'&&room.problems&&room.raceStartAt&&!race.raceStarted){
      race.raceStarted=true;
      race.problems=Array.isArray(room.problems)?room.problems:Object.values(room.problems);
      race.raceStartAt=room.raceStartAt;
      race.raceEndAt=room.raceStartAt+RACE_DURATION_MS;
      if(race.mySlot==='p2'&&room.players&&room.players.p1) race.oppName=room.players.p1.name;
      beginRaceCountdown();
    }
    if(room.players){
      const opp=room.players[race.mySlot==='p1'?'p2':'p1'];
      if(opp){
        race.oppScore=opp.score||0;
        race.oppFinished=!!opp.finished;
        if(race.active)updateOpponentCar();
        if(race.finished&&race.oppFinished)maybeFinishRace();
      }
    }
  });
  race._roomListenerRef=ref;
  race._roomListenerCb=cb;
}

function beginRaceCountdown(){
  showScreen('tpGameScreen');
  renderRaceShell();
  const overlay=document.createElement('div');
  overlay.id='raceCountdownOverlay';
  overlay.className='race-countdown-overlay';
  document.body.appendChild(overlay);
  let goShown=false;
  const iv=setInterval(()=>{
    if(!race){ clearInterval(iv); overlay.remove(); return; }
    const msLeft=race.raceStartAt-Date.now();
    if(msLeft<=0){
      if(!goShown){
        goShown=true;
        overlay.textContent='GO!';
        clearInterval(iv);
        setTimeout(()=>{ overlay.remove(); startRaceClock(); },500);
      }
      return;
    }
    overlay.textContent=String(Math.ceil(msLeft/1000));
  },100);
}

function renderRaceShell(){
  const c=$('tpContent');
  c.innerHTML=`
    <div class="race-timer-badge" id="raceTimerBadge">${(RACE_DURATION_MS/1000).toFixed(1)}s</div>
    <div class="race-lane-label"><span>🚗 ${race.myName} (you)</span><strong id="raceMyScore">0</strong></div>
    <div class="race-lane"><div class="car you" id="raceMyCar">🚗</div><div class="flag">🏁</div></div>
    <div class="race-lane-label"><span>🚙 ${race.oppName||'Opponent'}</span><strong id="raceOppScore">0</strong></div>
    <div class="race-lane"><div class="car opp" id="raceOppCar">🚙</div><div class="flag">🏁</div></div>
    <div class="playfield" style="margin-top:6px;">
      <div class="equation" id="raceEquation">
        <span id="raceEqText"></span>
        <input type="number" class="eq-input" id="raceInput" autocomplete="off">
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-ghost" onclick="exitToMenu()" style="flex:1;">LEAVE</button>
    </div>
  `;
}

function startRaceClock(){
  race.active=true;
  race.myIndex=0;
  race.score=0;
  race.streak=0;
  nextRaceProblem();
  updateMyCar();
  race.tickId=setInterval(()=>{
    if(!race)return;
    const msLeft=race.raceEndAt-Date.now();
    const badge=$('raceTimerBadge');
    if(badge)badge.textContent=Math.max(0,msLeft/1000).toFixed(1)+'s';
    if(msLeft<=0)finishMyRace();
  },100);
  const input=$('raceInput');
  if(input){ input.focus(); input.addEventListener('keydown',e=>{if(e.key==='Enter')submitRaceAnswer();}); }
}
function nextRaceProblem(){
  if(race.myIndex>=race.problems.length)race.myIndex=0; // practically unreachable in 60s, but wrap just in case
  race.problem=race.problems[race.myIndex];
  const eq=$('raceEqText');
  if(eq)eq.textContent=`${race.problem.a} ${race.problem.op} ${race.problem.b} =`;
  const inp=$('raceInput');
  if(inp){ inp.value=''; inp.focus(); }
}
window.submitRaceAnswer=function(){
  if(!race||!race.active)return;
  const raw=$('raceInput')?.value;
  if(raw===undefined||raw==='')return;
  const eqEl=$('raceEquation');
  if(parseInt(raw,10)===race.problem.answer){
    race.score++;race.streak++;
    playCorrectSound();
    if(eqEl){eqEl.classList.remove('flash-bad','flash-ok');void eqEl.offsetWidth;eqEl.classList.add('flash-ok');}
    updateMyCar();
    race.roomRef.child('players/'+race.mySlot+'/score').set(race.score);
  } else {
    race.streak=0;
    playWrongSound();
    if(eqEl){eqEl.classList.remove('flash-ok','flash-bad');void eqEl.offsetWidth;eqEl.classList.add('flash-bad');}
  }
  race.myIndex++;
  nextRaceProblem();
};
function updateMyCar(){
  const car=$('raceMyCar'),scoreEl=$('raceMyScore');
  const pct=2+Math.min(1,race.score/RACE_MAX_STEPS)*84;
  if(car)car.style.left=pct+'%';
  if(scoreEl)scoreEl.textContent=race.score;
}
function updateOpponentCar(){
  const car=$('raceOppCar'),scoreEl=$('raceOppScore');
  const pct=2+Math.min(1,race.oppScore/RACE_MAX_STEPS)*84;
  if(car)car.style.left=pct+'%';
  if(scoreEl)scoreEl.textContent=race.oppScore;
}
function finishMyRace(){
  if(!race||race.finished)return;
  race.finished=true;
  race.active=false;
  clearInterval(race.tickId);
  const badge=$('raceTimerBadge');
  if(badge)badge.textContent='0.0s';
  race.roomRef.child('players/'+race.mySlot).update({ score:race.score, finished:true });
  // Don't hang forever if the opponent's tab closed/disconnected mid-race.
  race._finishFallback=setTimeout(()=>{ if(race&&!race.resultShown)showRaceResult(true); },15000);
  maybeFinishRace();
}
function maybeFinishRace(){
  if(!race||!race.finished||race.resultShown)return;
  if(race.oppFinished){
    clearTimeout(race._finishFallback);
    showRaceResult(false);
  } else {
    const content=$('tpContent');
    if(content&&!document.getElementById('raceWaitNote')){
      const note=document.createElement('div');
      note.id='raceWaitNote';
      note.style.cssText='text-align:center;color:var(--ink-300);font-size:var(--text-sm);margin-top:10px;';
      note.textContent='Waiting for '+(race.oppName||'opponent')+' to finish…';
      content.appendChild(note);
    }
  }
}
function showRaceResult(oppMissing){
  if(!race||race.resultShown)return;
  race.resultShown=true;
  const myScore=race.score,oppScore=race.oppScore||0,oppName=race.oppName||'Opponent';
  let winnerLine,iWon;
  if(oppMissing){
    winnerLine=`🏆 ${race.myName} Wins the race! <span style="font-size:.7rem;color:var(--ink-300);">(opponent didn't finish)</span>`;
    iWon=true;
  } else if(myScore>oppScore){
    winnerLine=`🏆 ${race.myName} Wins the race!`; iWon=true;
  } else if(oppScore>myScore){
    winnerLine=`🏆 ${oppName} Wins the race!`; iWon=false;
  } else {
    winnerLine=`🤝 It's a tie!`; iWon=false;
  }
  playCelebrationSound();
  if(iWon||myScore===oppScore)launchConfetti(100);
  const c=$('tpContent');
  c.innerHTML=`
    <div class="result-panel">
      <div class="result-emoji">🏁</div>
      <div class="winner-line">${winnerLine}</div>
      <div style="display:flex;gap:20px;justify-content:center;color:var(--ink-300);font-size:var(--text-base);margin-top:8px;">
        <span>${race.myName}: <strong style="color:var(--ink-000);">${myScore}</strong></span>
        <span>${oppName}: <strong style="color:var(--ink-000);">${oppScore}</strong></span>
      </div>
      <div class="btn-row" style="margin-top:16px;">
        <button class="btn btn-accent" onclick="showTwoPlayerSetup()">🔁 New Race</button>
        <button class="btn btn-ghost" onclick="exitToMenu()">Menu</button>
      </div>
    </div>`;
}
function cleanupRace(){
  if(race){
    if(race.tickId)clearInterval(race.tickId);
    if(race._finishFallback)clearTimeout(race._finishFallback);
    if(race._roomListenerRef&&race._roomListenerCb)race._roomListenerRef.off('value',race._roomListenerCb);
  }
  const overlay=document.getElementById('raceCountdownOverlay');
  if(overlay)overlay.remove();
  const note=document.getElementById('raceWaitNote');
  if(note)note.remove();
  race=null;
}

// ============================================================
//  SHARED RESULT SCREEN (Classic / Survival)
// ============================================================
window.__retryFn=null;
function renderResult(targetId,modeName,score,best,isNewBest,retryFn,opts){
  window.__retryFn=retryFn;
  opts=opts||{};
  const c=$(targetId);
  const emoji=opts.emoji||(isNewBest?'🏆':score>=10?'🎉':'💪');
  const title=opts.title||(isNewBest?'New Best Score!':modeName+' Complete!');
  c.innerHTML=`
    <div class="result-panel">
      <div class="result-emoji">${emoji}</div>
      <div class="result-title${opts.titleClass?' '+opts.titleClass:''}">${title}</div>
      <div class="result-bignum">${score}</div>
      <div class="result-sub">correct in ${modeName}</div>
      <div class="result-best${isNewBest?' new':''}">Best score: ${best}</div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="window.__retryFn()">🔁 Again</button>
        <button class="btn btn-ghost" onclick="exitToMenu()">Menu</button>
      </div>
    </div>`;
}
