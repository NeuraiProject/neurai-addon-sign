/**
 * En qué redes existe DePIN.
 *
 * El nodo lo dice sin rodeos: «DEPIN assets (soulbound, enabled on testnet and
 * regtest)» (`src/assets/assets.cpp:66`). En mainnet no hay fork todavía, así
 * que ofrecer la operación allí sólo produce transacciones que la cadena
 * rechaza.
 *
 * Deliberadamente una lista y no una sonda al nodo: hoy la respuesta es fija y
 * conocida, y una lista no tiene modos de fallo. **El día que DePIN active en
 * mainnet, esto es lo único que hay que tocar** — añadir `'xna'` (y `'xna-pq'`
 * si la variante PQ llega a la vez).
 *
 * Sin imports ni DOM: `node --test` lo carga tal cual.
 */

/** Redes donde el nodo soporta assets DePIN. */
export const DEPIN_NETWORKS: readonly string[] = [
  'xna-test',
  'xna-legacy-test',
  'xna-pq-test'
];

/**
 * ¿Soporta esta red los assets DePIN?
 *
 * Una red desconocida devuelve `false`: es preferible esconder la operación
 * que ofrecer una que la cadena va a rechazar.
 *
 * @param network - Etiqueta de red del monedero (`xna`, `xna-test`, …)
 * @returns True si DePIN existe en esa red
 */
export function supportsDepin(network: string | undefined | null): boolean {
  if (typeof network !== 'string') return false;
  return DEPIN_NETWORKS.includes(network);
}
