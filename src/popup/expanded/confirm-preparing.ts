/**
 * Estado de la ventana de confirmación mientras se prepara una transacción.
 *
 * Vive fuera de expanded.ts —igual que asset-marker— para que `node --test`
 * pueda ejercitarlo. No es una separación cosmética: la primera versión de
 * esta lógica vivía dentro del IIFE, no se podía probar, y se publicó con un
 * fallo que dejaba Cancel sin cerrar la ventana y, de rebote, Broadcast
 * muerto (Cancel ya había puesto la transacción pendiente a null).
 *
 * Deliberadamente sin imports y sin tocar el DOM: recibe un `host` con las
 * operaciones concretas. Lo que se prueba aquí es qué se llama y en qué orden.
 */

/** Las operaciones sobre la ventana que este estado necesita. */
export interface ConfirmPreparingHost {
  /** Pinta `rows` filas fantasma en lugar de las salidas. */
  showGhosts(rows: number): void;
  setTitle(text: string): void;
  setSubtitle(text: string): void;
  setStatus(text: string): void;
  /** Muestra u oculta la barra de la onda y la línea de estado. */
  toggleProgress(visible: boolean): void;
  /** Marca el panel como «en preparación» (lo usa el CSS). */
  togglePreparing(on: boolean): void;
  setBroadcastEnabled(on: boolean): void;
  setModalVisible(visible: boolean): void;
}

/** Texto por defecto de cada estado, para no repetirlo en los llamantes. */
export const PREPARING_SUBTITLE =
  'Preparing the transaction. Nothing is sent until you confirm.';
export const READY_SUBTITLE =
  'Check the outputs below. Once broadcast, this cannot be reversed.';

export interface ConfirmPreparing {
  /** Abre la ventana en preparación. Devuelve el testigo de esta preparación. */
  open(title: string, ghostRows?: number): number;
  /** Cambia la línea de estado, si el testigo sigue siendo el vigente. */
  setProgress(token: number, text: string): void;
  /** ¿Sigue siendo esta la preparación que el usuario espera? */
  isCurrent(token: number): boolean;
  /** ¿Hay una preparación en curso? */
  isPreparing(): boolean;
  /**
   * El contenido real ya está pintado: se sale del estado de preparación pero
   * la ventana SIGUE abierta, que es lo que el usuario tiene delante.
   */
  settle(): void;
  /** Cierra la ventana. Siempre, esté preparando o no. */
  close(): void;
  /** Cierra sólo si había una preparación en curso; si no, no toca nada. */
  closeIfPreparing(): void;
  /** Olvida la preparación en curso sin tocar la ventana. */
  abandon(): void;
}

/**
 * @param host - Las operaciones concretas sobre la ventana
 * @returns El controlador de la preparación
 */
export function createConfirmPreparing(host: ConfirmPreparingHost): ConfirmPreparing {
  let seq = 0;
  let active = 0;

  function leavePreparingState(): void {
    active = 0;
    host.togglePreparing(false);
    host.toggleProgress(false);
    host.setSubtitle(READY_SUBTITLE);
  }

  return {
    open(title: string, ghostRows = 4): number {
      const token = ++seq;
      active = token;
      host.setTitle(title);
      host.setSubtitle(PREPARING_SUBTITLE);
      host.togglePreparing(true);
      host.toggleProgress(true);
      host.setStatus('Starting…');
      host.showGhosts(ghostRows);
      host.setBroadcastEnabled(false);
      host.setModalVisible(true);
      return token;
    },

    setProgress(token: number, text: string): void {
      if (active !== token) return;
      host.setStatus(text);
    },

    isCurrent(token: number): boolean {
      return active !== 0 && active === token;
    },

    isPreparing(): boolean {
      return active !== 0;
    },

    settle(): void {
      leavePreparingState();
    },

    close(): void {
      leavePreparingState();
      host.setModalVisible(false);
    },

    closeIfPreparing(): void {
      if (active === 0) return;
      this.close();
    },

    abandon(): void {
      active = 0;
    }
  };
}
