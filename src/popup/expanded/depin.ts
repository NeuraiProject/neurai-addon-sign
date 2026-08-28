/**
 * Modelo de la pestaña DePIN: qué assets DePIN tiene este monedero, qué puede
 * hacer con cada uno y qué dispositivos los sostienen.
 *
 * Sin imports ni DOM a propósito: `node --test` lo carga tal cual, igual que
 * `holder-picker` y `confirm-preparing`. Lo que se decide aquí —qué se puede
 * marcar, qué acciones se ofrecen— es justo lo que hay que poder probar sin
 * navegador.
 */

/** Un asset DePIN presente en el monedero. */
export interface DepinAsset {
  /** Nombre completo, "&FLEET" o "&FLEET/SENSOR". */
  name: string;
  /** Unidades que tiene este monedero. */
  amount: number;
  /** True si el monedero tiene "&NOMBRE!", que es lo que habilita gestionarlo. */
  owned: boolean;
  /** Padre inmediato, o null para una raíz. */
  parent: string | null;
  /** Profundidad: 0 raíz, 1 sub, 2 sub-sub… */
  depth: number;
}

/** Un titular del asset, tal como lo reporta `listdepinholders`. */
export interface DepinHolder {
  address: string;
  amount: number;
  /** 1 activo, 0 bloqueado o revocado. */
  valid: number;
}

export type DeviceMode = 'FREEZE' | 'UNFREEZE';

/** Fila de dispositivo lista para pintar. */
export interface DeviceRow {
  address: string;
  amount: number;
  amountText: string;
  /** `active` o `blocked`. */
  stateKind: 'active' | 'blocked';
  /** Lo que se lee en el distintivo: el motivo si está bloqueada. */
  stateText: string;
  stateTitle: string;
  selectable: boolean;
  /** True si esta dirección es la del propio monedero. */
  isSelf: boolean;
}

/**
 * El padre INMEDIATO de un nombre DePIN.
 *
 * El nodo lo resuelve con find_last_of, así que el dueño de "&A/B/C" es
 * "&A/B!", no "&A!".
 *
 * @param name - Nombre DePIN
 * @returns El padre, o null si es una raíz
 */
export function depinParent(name: string): string | null {
  const slash = name.lastIndexOf('/');
  return slash === -1 ? null : name.slice(0, slash);
}

/**
 * Los assets DePIN de este monedero, a partir de sus saldos.
 *
 * @param balances - Respuesta de `listassetbalancesbyaddress`
 * @returns Assets DePIN, raíces primero y por nombre
 */
export function parseDepinAssets(balances: Record<string, unknown> | null): DepinAsset[] {
  if (!balances || typeof balances !== 'object') return [];

  const held = new Set(
    Object.keys(balances).filter(name => Number(balances[name]) > 0)
  );

  return Object.keys(balances)
    .filter(name => name.startsWith('&') && !name.endsWith('!'))
    .filter(name => Number(balances[name]) > 0)
    .map(name => ({
      name,
      amount: Number(balances[name]),
      owned: held.has(`${name}!`),
      parent: depinParent(name),
      depth: (name.match(/\//g) || []).length
    }))
    .sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name));
}

/**
 * Los assets cuyo token owner tiene este monedero, sirvan o no de padre.
 *
 * Se usa para el desplegable de crear un sub: sólo se puede crear bajo un
 * DePIN del que se tenga el token owner. Incluye assets de los que se tiene el
 * token owner aunque no se tengan unidades del asset en sí, que es lo normal
 * tras repartirlo entre dispositivos.
 *
 * @param balances - Respuesta de `listassetbalancesbyaddress`
 * @returns Nombres DePIN gestionables, ordenados
 */
export function manageableDepinParents(balances: Record<string, unknown> | null): string[] {
  if (!balances || typeof balances !== 'object') return [];
  return Object.keys(balances)
    .filter(name => name.startsWith('&') && name.endsWith('!') && Number(balances[name]) > 0)
    .map(name => name.slice(0, -1))
    .sort();
}

/**
 * ¿Tiene sentido marcar este dispositivo para esta operación?
 *
 * Congelar el que ya está bloqueado, o descongelar el que está activo, son
 * transacciones que el nodo rechaza.
 *
 * @param holder - El titular
 * @param mode - La operación
 * @returns True si se puede marcar
 */
export function isDeviceSelectable(holder: DepinHolder, mode: DeviceMode): boolean {
  return mode === 'FREEZE' ? holder.valid === 1 : holder.valid !== 1;
}

/**
 * Convierte los titulares en filas para la operación indicada.
 *
 * @param holders - Titulares tal como los devolvió el nodo
 * @param mode - La operación en curso
 * @param options - `ownerAddress` (la dirección del monedero) y `formatAmount`
 * @returns Una fila por titular, de mayor a menor cantidad
 */
export function toDeviceRows(
  holders: readonly DepinHolder[],
  mode: DeviceMode,
  options: { ownerAddress?: string; formatAmount?: (n: number) => string } = {}
): DeviceRow[] {
  const format = options.formatAmount || String;
  return [...holders]
    .sort((a, b) => b.amount - a.amount || a.address.localeCompare(b.address))
    .map(holder => {
      const selectable = isDeviceSelectable(holder, mode);
      const active = holder.valid === 1;
      return {
        address: holder.address,
        amount: holder.amount,
        amountText: Number.isFinite(holder.amount) ? format(holder.amount) : '—',
        stateKind: active ? 'active' : 'blocked',
        stateText: selectable
          ? (active ? 'Active' : 'Blocked')
          : (mode === 'FREEZE' ? 'Already blocked' : 'Not blocked'),
        stateTitle: active ? 'Active' : 'Blocked or revoked',
        selectable,
        isSelf: Boolean(options.ownerAddress) && holder.address === options.ownerAddress
      };
    });
}

/**
 * Quita de la selección lo que ya no procede al cambiar de operación.
 *
 * @param selection - Direcciones marcadas
 * @param holders - Titulares actuales
 * @param mode - La operación en curso
 * @returns Las que siguen siendo válidas
 */
export function pruneDeviceSelection(
  selection: Iterable<string>,
  holders: readonly DepinHolder[],
  mode: DeviceMode
): string[] {
  const byAddress = new Map(holders.map(h => [h.address, h]));
  return [...selection].filter(address => {
    const holder = byAddress.get(address);
    return Boolean(holder && isDeviceSelectable(holder, mode));
  });
}

/**
 * La dirección del token owner no puede congelarse ni revocarse: el nodo lo
 * rechaza y, de colarse, nadie podría deshacerlo.
 *
 * @param addresses - Direcciones marcadas
 * @param ownerAddress - Dirección de este monedero
 * @returns El motivo por el que no se puede seguir, o null
 */
export function blockingReasonForFreeze(
  addresses: readonly string[],
  ownerAddress: string | undefined
): string | null {
  if (addresses.length === 0) {
    return 'Select at least one device.';
  }
  if (ownerAddress && addresses.includes(ownerAddress)) {
    return `${ownerAddress} holds the owner token: freezing it would leave nobody able to undo it.`;
  }
  return null;
}
