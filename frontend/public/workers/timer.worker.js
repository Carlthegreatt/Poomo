let intervalId = null;

self.onmessage = (e) => {
  const { cmd, ms = 250 } = e.data || {};
  if (cmd === "start") {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
      self.postMessage({ type: "tick", now: Date.now() });
    }, ms);
  } else if (cmd === "stop") {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
};
