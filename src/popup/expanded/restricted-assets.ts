/**
 * Qué assets restringidos puede gestionar realmente este monedero.
 *
 * Freeze/Unfreeze operan sobre assets restringidos (`$NOMBRE`), y para ello
 * hace falta el token owner del asset raíz (`NOMBRE!`). El panel derivaba el
 * nombre restringido de CUALQUIER token owner del monedero, así que un DePIN
 * `&TOKIO!` producía `$&TOKIO` —que el nodo rechaza con «_Not a valid asset
 * name»— y un sub `FOO/BAR!` producía `$FOO/BAR`, que no existe. El
 * desplegable ofrecía cosas imposibles y la búsqueda de titulares no
 * encontraba nada, que es exactamente lo que se reportó.
 *
 * Sin imports ni DOM: `node --test` lo carga tal cual.
 */

type RpcFn = (method: string, params: unknown[]) => Promise<unknown>;

/** Consultas de existencia en vuelo a la vez. */
export const DEFAULT_CONCURRENCY = 6;

/**
 * ¿Puede este nombre ser la raíz de un asset restringido?
 *
 * Sólo los assets RAÍZ tienen contrapartida restringida. Un sub (`FOO/BAR`),
 * un único (`FOO#BAR`), un mensaje (`FOO~BAR`), un qualifier (`#FOO`) y un
 * DePIN (`&FOO`) no la tienen, y anteponerles `$` da un nombre que el nodo ni
 * siquiera acepta como válido.
 *
 * @param name - Nombre del asset, sin el `!` del token owner
 * @returns True si `$name` es un nombre posible
 */
export function canBeRestrictedRoot(name: string): boolean {
  if (typeof name !== 'string') return false;
  // El nodo admite A-Z 0-9 _ . en la raíz, entre 3 y 30 caracteres, sin
  // puntuación al principio o al final ni dos seguidas.
  if (!/^[A-Z0-9._]{3,30}$/.test(name)) return false;
  if (/^[._]|[._]$/.test(name)) return false;
  if (/[._]{2}/.test(name)) return false;
  return true;
}

/**
 * Los `$NOMBRE` que este monedero podría gestionar, a partir de sus saldos.
 *
 * Es un filtro local y por tanto sólo descarta lo imposible; que el asset
 * restringido EXISTA lo dice el nodo (ver `keepExistingAssets`).
 *
 * @param balances - Respuesta de `listassetbalancesbyaddress`
 * @returns Nombres restringidos candidatos, ordenados y sin repetir
 */
export function restrictedCandidates(balances: Record<string, unknown> | null): string[] {
  if (!balances || typeof balances !== 'object') return [];
  const names = Object.keys(balances)
    .filter(name => name.endsWith('!') && Number(balances[name]) > 0)
    .map(name => name.slice(0, -1))
    .filter(canBeRestrictedRoot)
    .map(name => `$${name}`);
  return [...new Set(names)].sort();
}

/** Ejecuta `task` sobre cada elemento con como mucho `limit` a la vez. */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = new Array(Math.min(Math.max(1, limit), items.length || 1))
    .fill(null)
    .map(async () => {
      for (;;) {
        const index = next++;
        if (index >= items.length) return;
        results[index] = await task(items[index]!);
      }
    });
  await Promise.all(workers);
  return results;
}

/**
 * Se queda con los que existen en la cadena.
 *
 * Tener `NOMBRE!` no implica haber emitido `$NOMBRE`: lo normal es tener el
 * token owner de un asset raíz y ningún restringido. Ofrecerlos sin comprobar
 * llenaba el desplegable de assets que no existen.
 *
 * Un fallo de consulta NO descarta el candidato: si el nodo no contesta, se
 * conserva y ya dirá que no al operar. Descartar por no haber podido leer
 * escondería un asset que sí existe.
 *
 * @param rpc - Función RPC contra el nodo
 * @param names - Candidatos `$NOMBRE`
 * @param options - `concurrency` de consultas simultáneas
 * @returns Los que existen (o cuyo estado no se pudo determinar)
 */
export async function keepExistingAssets(
  rpc: RpcFn,
  names: readonly string[],
  options: { concurrency?: number } = {}
): Promise<string[]> {
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const checks = await mapWithConcurrency(names, concurrency, async name => {
    try {
      const data = await rpc('getassetdata', [name]);
      return { name, exists: data !== null && data !== undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // «no encontrado» es una respuesta; cualquier otro fallo es ruido de red.
      if (/not found|doesn't exist|does not exist/i.test(message)) {
        return { name, exists: false };
      }
      return { name, exists: true };
    }
  });
  return checks.filter(check => check.exists).map(check => check.name);
}
