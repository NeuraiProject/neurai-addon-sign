/**
 * Quién tiene un asset restringido y quién está congelado.
 *
 * Freeze/Unfreeze pedían las direcciones escritas a mano, que es donde se
 * cometen erratas y donde no se ve lo único que importa para decidir: quién
 * tiene tokens y quién ya está congelado. El nodo sabe ambas cosas.
 *
 * Sin imports y sin DOM a propósito: `node --test` lo carga tal cual, y así
 * la parte que decide qué se puede marcar se puede probar sin navegador.
 */

/** Una dirección que tiene el asset, con su estado de congelación. */
export interface Holder {
  address: string;
  /** Cantidad del asset, tal como la reporta el nodo. */
  quantity: number;
  /**
   * `true` congelada, `false` libre, `null` cuando el nodo no contestó.
   * `null` no se traduce a `false`: «no lo sé» y «no está congelada» llevan
   * a decisiones distintas, y el segundo sería una invención.
   */
  frozen: boolean | null;
}

export interface HolderListing {
  holders: Holder[];
  /** Cuántas direcciones tiene el asset en total, antes de recortar. */
  total: number;
  /** True si se recortó la lista por el límite. */
  truncated: boolean;
  /** True si el asset está congelado globalmente. */
  globallyFrozen: boolean | null;
}

export type FreezeMode = 'FREEZE' | 'UNFREEZE';

type RpcFn = (method: string, params: unknown[]) => Promise<unknown>;

/** Cuántas direcciones se traen como mucho: cada una cuesta una consulta. */
export const DEFAULT_HOLDER_LIMIT = 200;
/** Consultas de estado en vuelo a la vez. */
export const DEFAULT_CONCURRENCY = 6;

/**
 * ¿Tiene sentido marcar esta dirección para esta operación?
 *
 * Congelar la que ya está congelada, o descongelar la que no lo está, son
 * transacciones que el nodo rechaza: mejor no dejar marcarlas. Cuando el
 * estado es desconocido sí se deja marcar —el nodo sigue siendo la autoridad
 * y rechazará lo que no proceda—, porque bloquear por no haber podido leer
 * dejaría la lista inservible ante un fallo pasajero.
 *
 * @param holder - La dirección y su estado
 * @param mode - La operación que se va a hacer
 * @returns True si se puede marcar
 */
export function isSelectable(holder: Holder, mode: FreezeMode): boolean {
  if (holder.frozen === null) return true;
  return mode === 'FREEZE' ? !holder.frozen : holder.frozen;
}

/** Por qué no se puede marcar, para enseñarlo al lado. */
export function blockedReason(holder: Holder, mode: FreezeMode): string | null {
  if (isSelectable(holder, mode)) return null;
  return mode === 'FREEZE' ? 'Already frozen' : 'Not frozen';
}

/** Etiqueta del estado, incluida la incertidumbre. */
export function frozenLabel(holder: Holder): string {
  if (holder.frozen === null) return 'Status unknown';
  return holder.frozen ? 'Frozen' : 'Free';
}

/** Ejecuta `task` sobre cada elemento con como mucho `limit` a la vez. */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = new Array(Math.min(Math.max(1, limit), items.length || 1))
    .fill(null)
    .map(async () => {
      for (;;) {
        const index = next++;
        if (index >= items.length) return;
        results[index] = await task(items[index]!, index);
      }
    });
  await Promise.all(workers);
  return results;
}

/**
 * Normaliza lo que devuelve `listaddressesbyasset`, que es un objeto
 * `{direccion: cantidad}`.
 */
export function parseAddressBalances(raw: unknown): Array<{ address: string; quantity: number }> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, unknown>)
    .map(([address, quantity]) => ({ address, quantity: Number(quantity) }))
    .filter(entry => entry.address && Number.isFinite(entry.quantity))
    .sort((a, b) => b.quantity - a.quantity || a.address.localeCompare(b.address));
}

/**
 * Pide al nodo quién tiene el asset y en qué estado está cada dirección.
 *
 * El estado se pregunta una vez por dirección —el nodo no ofrece una consulta
 * en bloque— con un tope de consultas simultáneas, porque contra un proxy
 * remoto cada una cuesta cientos de milisegundos y lanzarlas todas de golpe
 * es tan malo como hacerlas en fila.
 *
 * @param rpc - Función RPC contra el nodo de la operación
 * @param assetName - El asset restringido ($NOMBRE)
 * @param options - `limit` de direcciones y `concurrency` de consultas
 * @returns La lista, cuántas hay en total y si se recortó
 */
export async function loadHolders(
  rpc: RpcFn,
  assetName: string,
  options: { limit?: number; concurrency?: number } = {}
): Promise<HolderListing> {
  const limit = options.limit ?? DEFAULT_HOLDER_LIMIT;
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;

  const [balancesRaw, globalRaw] = await Promise.all([
    rpc('listaddressesbyasset', [assetName]),
    rpc('checkglobalrestriction', [assetName]).catch(() => null)
  ]);

  const all = parseAddressBalances(balancesRaw);
  const truncated = all.length > limit;
  const selected = truncated ? all.slice(0, limit) : all;

  const holders = await mapWithConcurrency(selected, concurrency, async entry => {
    let frozen: boolean | null = null;
    try {
      frozen = Boolean(await rpc('checkaddressrestriction', [entry.address, assetName]));
    } catch {
      frozen = null;
    }
    return { address: entry.address, quantity: entry.quantity, frozen };
  });

  return {
    holders,
    total: all.length,
    truncated,
    globallyFrozen: typeof globalRaw === 'boolean' ? globalRaw : null
  };
}

/** Lo que una fila necesita pintar, ya decidido. */
export interface HolderRow {
  address: string;
  quantity: number;
  /** Cantidad ya formateada para leer. */
  quantityText: string;
  /** `frozen` | `free` | `unknown`, para el color del distintivo. */
  stateKind: 'frozen' | 'free' | 'unknown';
  /** Lo que se lee en el distintivo: el motivo si está bloqueada. */
  stateText: string;
  /** El estado real, para el tooltip. */
  stateTitle: string;
  selectable: boolean;
}

/**
 * Convierte los titulares en filas para la operación indicada.
 *
 * Vive aquí y no en el pintado porque lo que decide —qué se puede marcar y
 * qué se lee en cada fila— es justo lo que hay que poder probar sin navegador.
 *
 * @param holders - Titulares tal como los devolvió el nodo
 * @param mode - La operación en curso
 * @param formatQuantity - Cómo formatear la cantidad (inyectable para probar)
 * @returns Una fila por titular
 */
export function toHolderRows(
  holders: readonly Holder[],
  mode: FreezeMode,
  formatQuantity: (quantity: number) => string = String
): HolderRow[] {
  return holders.map(holder => {
    const selectable = isSelectable(holder, mode);
    const reason = blockedReason(holder, mode);
    return {
      address: holder.address,
      quantity: holder.quantity,
      quantityText: Number.isFinite(holder.quantity) ? formatQuantity(holder.quantity) : '—',
      stateKind: holder.frozen === null ? 'unknown' : holder.frozen ? 'frozen' : 'free',
      stateText: reason || frozenLabel(holder),
      stateTitle: frozenLabel(holder),
      selectable
    };
  });
}

/**
 * Quita de la selección lo que ya no procede.
 *
 * Al pasar de Freeze a Unfreeze las direcciones marcadas dejan de ser las
 * candidatas: mantenerlas marcadas mandaría al nodo una operación imposible.
 *
 * @param selection - Direcciones marcadas
 * @param holders - Titulares actuales
 * @param mode - La operación en curso
 * @returns Las direcciones que siguen siendo válidas
 */
export function pruneSelection(
  selection: Iterable<string>,
  holders: readonly Holder[],
  mode: FreezeMode
): string[] {
  const byAddress = new Map(holders.map(holder => [holder.address, holder]));
  return [...selection].filter(address => {
    const holder = byAddress.get(address);
    return Boolean(holder && isSelectable(holder, mode));
  });
}

/** Las direcciones que `Select all` debería marcar. */
export function selectableAddresses(
  holders: readonly Holder[],
  mode: FreezeMode
): string[] {
  return holders.filter(holder => isSelectable(holder, mode)).map(holder => holder.address);
}
