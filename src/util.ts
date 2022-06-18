export function sleep(ms: number) {
  const p = new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
  return p;
}
