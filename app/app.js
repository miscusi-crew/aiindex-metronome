"use strict";
const $ = (id) => document.getElementById(id);
let ac = null, running = false, nextTime = 0, beat = 0, timer = 0, taps = [];
const queue = [];

function click(time, accent) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.frequency.value = accent ? 1500 : 1000;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(accent ? 0.6 : 0.35, time + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
  o.connect(g).connect(ac.destination);
  o.start(time);
  o.stop(time + 0.06);
}

/** Schedules clicks slightly ahead on the audio clock, so timing stays steady even if the page is busy. */
function scheduler() {
  const per = 60 / Number($("tempo").value);
  while (nextTime < ac.currentTime + 0.12) {
    const n = beat % Number($("beats").value);
    click(nextTime, n === 0);
    queue.push({ n, t: nextTime });
    nextTime += per;
    beat++;
  }
}

function drawDots() {
  if (!running) return;
  while (queue.length && queue[0].t <= ac.currentTime) {
    const { n } = queue.shift();
    [...$("dots").children].forEach((d, i) => d.classList.toggle("on", i === n));
  }
  requestAnimationFrame(drawDots);
}

function renderDots() {
  $("dots").innerHTML = Array.from({ length: Number($("beats").value) }, (_, i) => `<span class="dot ${i === 0 ? "accent" : ""}"></span>`).join("");
}
function setTempo(v) {
  $("tempo").value = Math.max(30, Math.min(260, Math.round(v)));
  $("bpm").innerHTML = `${$("tempo").value} <small>BPM</small>`;
}

$("go").addEventListener("click", () => {
  if (running) {
    running = false;
    clearInterval(timer);
    $("go").textContent = "Start";
    [...$("dots").children].forEach((d) => d.classList.remove("on"));
    return;
  }
  try { ac ??= new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  ac.resume();
  running = true;
  beat = 0;
  queue.length = 0;
  nextTime = ac.currentTime + 0.05;
  timer = setInterval(scheduler, 25);
  scheduler();
  requestAnimationFrame(drawDots);
  $("go").textContent = "Stop";
});
$("tempo").addEventListener("input", () => setTempo($("tempo").value));
$("minus").addEventListener("click", () => setTempo(Number($("tempo").value) - 1));
$("plus").addEventListener("click", () => setTempo(Number($("tempo").value) + 1));
$("beats").addEventListener("change", () => { beat = 0; renderDots(); });
$("tap").addEventListener("click", () => {
  const now = performance.now();
  taps = taps.filter((t) => now - t < 2500);
  taps.push(now);
  if (taps.length >= 2) {
    const gaps = taps.slice(1).map((t, i) => t - taps[i]);
    setTempo(60000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length));
  }
});
document.addEventListener("keydown", (e) => { if (e.key === " " && e.target === document.body) { e.preventDefault(); $("go").click(); } });
renderDots();
