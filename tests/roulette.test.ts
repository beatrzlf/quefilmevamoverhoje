import { describe, expect, it } from "vitest";
import { randomIndex, targetRotation } from "@/lib/roulette";

describe("randomIndex", () => {
  it("fica dentro do intervalo", () => {
    for (let i = 0; i < 1000; i++) {
      const x = randomIndex(7);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(7);
    }
  });
  it("rejeita lista vazia", () => {
    expect(() => randomIndex(0)).toThrow();
  });
  it("descarta valores enviesados", () => {
    const seq = [0xffffffff, 5];
    const rng = (b: Uint32Array) => { b[0] = seq.shift()!; return b; };
    expect(randomIndex(3, rng)).toBe(2);
  });
});

describe("targetRotation", () => {
  it("para com a fatia escolhida sob o ponteiro", () => {
    for (const count of [1, 2, 5, 12]) {
      for (let idx = 0; idx < count; idx++) {
        const r = targetRotation(idx, count, 123);
        const slice = 360 / count;
        // ângulo (a partir do topo, sentido horário) que está sob o ponteiro
        const underPointer = (360 - (r % 360)) % 360;
        expect(Math.floor(underPointer / slice)).toBe(idx);
        expect(r).toBeGreaterThan(123);
      }
    }
  });
});

import { wrapTitle } from "@/components/Wheel";
describe("wrapTitle", () => {
  it("quebra por palavra e corta com reticências", () => {
    expect(wrapTitle("Shrek", 17, 2)).toEqual(["Shrek"]);
    expect(wrapTitle("Só um Beijo por Favor", 17, 2)).toEqual(["Só um Beijo por", "Favor"]);
    expect(wrapTitle("O Senhor dos Anéis: A Sociedade do Anel", 17, 2)).toEqual(["O Senhor dos", "Anéis: A Socieda…"]);
    expect(wrapTitle("O Senhor dos Anéis", 10, 1)).toEqual(["O Senhor…"]);
  });
});
