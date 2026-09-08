// Vinext exits immediately after its native Vite/Rolldown workers complete.
// Let their queued Windows handle-close callbacks settle before process.exit.
if (process.platform === 'win32') {
  const nativeExit = process.exit.bind(process);
  process.exit = (code = 0) => {
    if (Number(code) === 0) setTimeout(() => nativeExit(code), 750);
    else nativeExit(code);
  };
}
