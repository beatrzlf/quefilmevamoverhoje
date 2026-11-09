/** Índice aleatório e uniforme em [0, n) usando crypto (sem viés de módulo). */
export function randomIndex(n: number, rng: (buf: Uint32Array) => Uint32Array = (b) => crypto.getRandomValues(b)): number {
  if (!Number.isInteger(n) || n <= 0) throw new RangeError("A lista está vazia");
  const max = 0x1_0000_0000;
  const limit = max - (max % n);
  const buf = new Uint32Array(1);
  let x: number;
  do {
    x = rng(buf)[0];
  } while (x >= limit);
  return x % n;
}

/**
 * Ângulo final (em graus) para a roda parar com a fatia `index` sob o ponteiro no topo.
 * A fatia i ocupa [i*slice, (i+1)*slice) a partir do topo, no sentido horário.
 */
export function targetRotation(index: number, count: number, currentRotation: number, extraTurns = 5): number {
  const slice = 360 / count;
  const center = index * slice + slice / 2;
  const desired = (360 - center) % 360;
  const current = ((currentRotation % 360) + 360) % 360;
  let delta = desired - current;
  if (delta < 0) delta += 360;
  return currentRotation + extraTurns * 360 + delta;
}
